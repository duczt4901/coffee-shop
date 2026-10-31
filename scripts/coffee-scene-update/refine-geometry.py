"""Refine local pouch curvature and triangulation without changing UVs/materials.

Usage: python refine-geometry.py before.glb candidate.glb report.json
The immutable input is required; never refine a previous candidate in place.
"""
import collections
import copy
import hashlib
import json
import math
from pathlib import Path
import struct
import sys

import numpy as np


def load(filename):
    data = Path(filename).read_bytes()
    assert struct.unpack_from('<III', data) == (0x46546C67, 2, len(data))
    length = struct.unpack_from('<I', data, 12)[0]
    return json.loads(data[20:20 + length]), bytearray(data[28 + length:]), data


def read(gltf, binary, index):
    a = gltf['accessors'][index]
    v = gltf['bufferViews'][a['bufferView']]
    dtype = np.dtype({5126: '<f4', 5125: '<u4', 5123: '<u2'}[a['componentType']])
    components = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3}[a['type']]
    assert not a.get('sparse')
    return np.ndarray((a['count'], components), dtype, binary,
                      v.get('byteOffset', 0) + a.get('byteOffset', 0),
                      strides=(v.get('byteStride', components * dtype.itemsize), dtype.itemsize)).copy()


def write(gltf, binary, index, values):
    a = gltf['accessors'][index]
    v = gltf['bufferViews'][a['bufferView']]
    original = read(gltf, binary, index)
    values = np.asarray(values, dtype=original.dtype).reshape(original.shape)
    stride = v.get('byteStride', values.shape[1] * values.dtype.itemsize)
    start = v.get('byteOffset', 0) + a.get('byteOffset', 0)
    for i, row in enumerate(values):
        offset = start + i * stride
        binary[offset:offset + row.nbytes] = row.tobytes()
    if 'min' in a:
        a['min'] = values.min(axis=0).tolist()
        a['max'] = values.max(axis=0).tolist()


def ramp(a, b, value):
    t = np.clip((value - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def focus(points):
    y, side = points[:, 1], np.abs(points[:, 2])
    bottom = ramp(.035, .12, y) * (1 - ramp(.42, .82, y))
    shoulder = ramp(2.12, 2.48, y) * (1 - ramp(3.02, 3.20, y))
    corners = .25 + .75 * ramp(.35, .88, side)
    gusset = .35 * ramp(.73, .95, side) * ramp(.12, .4, y) * (1 - ramp(2.85, 3.16, y))
    return np.maximum(np.maximum(bottom, shoulder) * corners, gusset)


def fit_local_surfaces(points, normals, weights, pinned, label_vertices):
    """Fit local quadratic guide patches; retain most of the existing fold relief."""
    delta = np.zeros_like(points)
    for axis, across in ((0, 2), (2, 0)):
        # Separate front/back and left/right so a thin pouch cannot fair through itself.
        for sign in (-1, 1):
            samples = np.flatnonzero(normals[:, axis] * sign > .35)
            targets = samples[(weights[samples] > .01) & ~pinned[samples]]
            uv = points[:, [1, across]]
            scale = np.array([.21, .28])
            cells = np.floor(uv / scale).astype(int)
            bins = collections.defaultdict(list)
            for i in samples:
                bins[tuple(cells[i])].append(i)
            for i in targets:
                neighbors = []
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        neighbors.extend(bins.get(tuple(cells[i] + [dy, dx]), []))
                ids = np.asarray(neighbors, dtype=int)
                local = (uv[ids] - uv[i]) / scale
                distance = (local * local).sum(axis=1)
                keep = (distance < 1) & ((normals[ids] @ normals[i]) > .25)
                ids, local, distance = ids[keep], local[keep], distance[keep]
                if len(ids) < 9:
                    continue
                a, b = local.T
                basis = np.column_stack([np.ones(len(ids)), a, b, a*a, a*b, b*b])
                w = np.exp(-3 * distance)
                matrix = basis.T @ (basis * w[:, None])
                matrix += np.diag([1e-10, 1e-7, 1e-7, 2e-5, 2e-5, 2e-5])
                fitted = np.linalg.solve(matrix, basis.T @ (points[ids, axis] * w))[0]
                strength = .85 * weights[i] * min(1, (abs(normals[i, axis]) / .75) ** 2)
                delta[i, axis] = np.clip((fitted - points[i, axis]) * strength, -.060, .060)
    # Labels retain their exact height/width coordinates and UVs; only shallow pouch relief follows.
    delta[label_vertices, 2] = 0
    delta[label_vertices, 0] *= .65
    delta[pinned] = 0
    return delta


def triangle_normals(points, faces):
    p = points[faces]
    return np.cross(p[:, 1] - p[:, 0], p[:, 2] - p[:, 0])


def constrain_displacements(points, delta, faces, label_faces, groups):
    original_n = triangle_normals(points, faces)
    original_area = np.linalg.norm(original_n, axis=1)
    valid = original_area > 1e-12
    label_area = np.linalg.norm(triangle_normals(points, label_faces), axis=1)
    for _ in range(24):
        candidate = (points + delta).astype('<f4').astype(float)
        n = triangle_normals(candidate, faces)
        area = np.linalg.norm(n, axis=1)
        cosine = (original_n * n).sum(axis=1) / np.maximum(original_area * area, 1e-30)
        ratio = area / np.maximum(original_area, 1e-30)
        bad = valid & ((cosine < .985) | (ratio < .80) | (ratio > 1.20))
        new_label_area = np.linalg.norm(triangle_normals(candidate, label_faces), axis=1)
        label_bad = (label_area > 1e-12) & (np.abs(new_label_area/np.maximum(label_area, 1e-30)-1) > .035)
        if not bad.any() and not label_bad.any():
            return candidate
        affected = np.unique(np.concatenate([faces[bad].ravel(), label_faces[label_bad].ravel()]))
        affected_groups = np.zeros(groups.max()+1, bool)
        affected_groups[groups[affected]] = True
        delta[affected_groups[groups]] *= .5
    raise AssertionError('Unable to preserve face orientations and label surface stretch')


def minimum_angle(points):
    lengths = np.linalg.norm(points - np.roll(points, -1, axis=0), axis=1)
    if lengths.min() < 1e-12:
        return 0.
    cosine = (np.roll(lengths, 1)**2 + np.roll(lengths, 2)**2 - lengths**2) / (2*np.roll(lengths, 1)*np.roll(lengths, 2))
    return float(np.degrees(np.arccos(np.clip(cosine, -1, 1))).min())


def improve_diagonals(points, uv, faces, weights):
    """Rotate poor diagonals only within a nearly planar body patch, retaining its UV surface."""
    faces = faces.copy()
    edges = collections.defaultdict(list)
    for f, tri in enumerate(faces):
        for j in range(3):
            a, b, c = map(int, np.roll(tri, -j))
            edges[tuple(sorted((a, b)))].append((f, a, b, c))
    used_faces, flips = set(), 0
    for edge, adjacent in edges.items():
        if len(adjacent) != 2:
            continue
        (f, a, b, c), (h, aa, bb, d) = adjacent
        if f in used_faces or h in used_faces or aa != b or bb != a or c == d:
            continue
        ids = [a, b, c, d]
        if min(weights[ids]) < .08 or tuple(sorted((c, d))) in edges:
            continue
        old = [faces[f], faces[h]]
        old_min = min(minimum_angle(points[t]) for t in old)
        if old_min > 18:
            continue
        new = np.asarray([[c, d, b], [d, c, a]])
        new_min = min(minimum_angle(points[t]) for t in new)
        if new_min < old_min + 4:
            continue
        old_n = triangle_normals(points, np.asarray(old))
        new_n = triangle_normals(points, new)
        old_lengths = np.linalg.norm(old_n, axis=1, keepdims=True)
        if old_lengths.min() < 1e-10:
            continue
        unit = old_n / old_lengths
        if unit[0] @ unit[1] < math.cos(math.radians(4)):
            continue
        if np.any(new_n @ unit.mean(axis=0) <= 0):
            continue
        # This bounds the surface displacement of the new diagonal, not only its shape score.
        plane_error = abs((points[d] - points[a]) @ unit[0])
        if plane_error > .001:
            continue
        def uv_cross(t):
            u = uv[t]
            return np.linalg.det(np.stack([u[1]-u[0], u[2]-u[0]]))
        before_uv, after_uv = np.array([uv_cross(t) for t in old]), np.array([uv_cross(t) for t in new])
        if np.any(before_uv * before_uv[0] <= 0) or np.any(after_uv * before_uv[0] <= 0):
            continue
        if abs(abs(after_uv).sum() - abs(before_uv).sum()) > abs(before_uv).sum()*1e-5:
            continue
        # Body UVs remain affine to the same patch to avoid moving the paper grain.
        xyz = points[ids]
        basis = np.column_stack([uv[ids], np.ones(4)])
        fit = np.linalg.lstsq(basis, xyz, rcond=None)[0]
        if np.linalg.norm(basis @ fit - xyz, axis=1).max() > .0015:
            continue
        faces[f], faces[h] = new
        used_faces.update((f, h))
        flips += 1
    return faces, flips


def update_normals(before, after, original_normals, old_faces, new_faces):
    old_n, new_n = triangle_normals(before, old_faces), triangle_normals(after, new_faces)
    old_acc, new_acc = np.zeros_like(before), np.zeros_like(after)
    for corner in range(3):
        np.add.at(old_acc, old_faces[:, corner], old_n)
        np.add.at(new_acc, new_faces[:, corner], new_n)
    # Rotate existing smooth normals with the local surface, preserving imported smoothing seams.
    a = old_acc / np.maximum(np.linalg.norm(old_acc, axis=1, keepdims=True), 1e-20)
    b = new_acc / np.maximum(np.linalg.norm(new_acc, axis=1, keepdims=True), 1e-20)
    axis = np.cross(a, b)
    cosine = np.clip((a*b).sum(axis=1), -1, 1)
    rotated = original_normals + np.cross(axis, original_normals)
    rotated += np.cross(axis, np.cross(axis, original_normals)) / np.maximum(1 + cosine[:, None], 1e-12)
    changed = np.linalg.norm(axis, axis=1) > 1e-8
    rotated[~changed] = original_normals[~changed]
    rotated[changed] /= np.linalg.norm(rotated[changed], axis=1, keepdims=True)
    return rotated


def closure(points, faces):
    _, welded = np.unique(np.round(points, 5), axis=0, return_inverse=True)
    triangles = welded[faces]
    keep = (triangles[:, 0] != triangles[:, 1]) & (triangles[:, 1] != triangles[:, 2]) & (triangles[:, 2] != triangles[:, 0])
    triangles = triangles[keep]
    edges = np.sort(np.concatenate([triangles[:, [0, 1]], triangles[:, [1, 2]], triangles[:, [2, 0]]]), axis=1)
    _, counts = np.unique(edges, axis=0, return_counts=True)
    return {'boundaryEdges': int((counts == 1).sum()), 'nonManifoldEdges': int((counts > 2).sum())}


def stitch_print_junctions(points, uv, primitive_faces):
    """Split only coarse edges opposite existing collinear print-boundary vertices."""
    faces = np.concatenate(primitive_faces)
    coords, first, welded = np.unique(np.round(points, 5), axis=0, return_index=True, return_inverse=True)
    triangles = welded[faces]
    keep = (triangles[:, 0] != triangles[:, 1]) & (triangles[:, 1] != triangles[:, 2]) & (triangles[:, 2] != triangles[:, 0])
    triangles = triangles[keep]
    edges = np.sort(np.concatenate([triangles[:, [0, 1]], triangles[:, [1, 2]], triangles[:, [2, 0]]]), axis=1)
    edges, counts = np.unique(edges, axis=0, return_counts=True)
    boundary = edges[counts == 1]
    boundary_groups = np.unique(boundary)
    boundary_vertices = np.flatnonzero(np.isin(welded, boundary_groups))
    actual = points[first]
    cuts = {}
    for a, b in boundary:
        edge = actual[b]-actual[a]
        length2 = edge @ edge
        if length2 < 1e-16:
            continue
        candidates = boundary_groups[(boundary_groups != a) & (boundary_groups != b)]
        t = ((actual[candidates]-actual[a]) @ edge)/length2
        distance = np.linalg.norm(actual[candidates]-actual[a]-t[:, None]*edge, axis=1)
        selected = candidates[(t > 1e-5) & (t < 1-1e-5) & (distance < 2e-6)]
        if len(selected):
            cuts[(int(a), int(b))] = selected
    output, split_count = [], 0
    for primitive in primitive_faces:
        new_faces = []
        for tri in primitive:
            polygons = [tri.tolist()]
            for j in range(3):
                a, b, c = map(int, np.roll(tri, -j))
                ga, gb = int(welded[a]), int(welded[b])
                candidates = cuts.get(tuple(sorted((ga, gb))))
                if candidates is None:
                    continue
                assert len(polygons) == 1, 'Unexpected multi-edge T-junction'
                edge = points[b]-points[a]
                sequence = []
                for group in candidates:
                    t = float((actual[group]-points[a]) @ edge / (edge @ edge))
                    expected_uv = uv[a] + t*(uv[b]-uv[a])
                    ids = np.flatnonzero(welded == group)
                    vertex = int(ids[np.argmin(np.linalg.norm(uv[ids]-expected_uv, axis=1))])
                    assert np.linalg.norm(uv[vertex]-expected_uv) < 2e-6, 'Print seam must retain affine UV mapping'
                    sequence.append((t, vertex))
                chain = [a] + [vertex for _, vertex in sorted(sequence)] + [b]
                polygons = [[x, y, c] for x, y in zip(chain, chain[1:])]
                split_count += len(polygons)-1
                break
            new_faces.extend(polygons)
        output.append(np.asarray(new_faces, dtype=int))
    return output, split_count, boundary_vertices


def stats(points, faces):
    p = points[faces]
    lengths = np.linalg.norm(p - np.roll(p, -1, axis=1), axis=2)
    cosine = (np.roll(lengths, 1, axis=1)**2 + np.roll(lengths, 2, axis=1)**2 - lengths**2) / np.maximum(2*np.roll(lengths, 1, axis=1)*np.roll(lengths, 2, axis=1), 1e-30)
    angles = np.degrees(np.arccos(np.clip(cosine, -1, 1))).min(axis=1)
    valid = np.linalg.norm(triangle_normals(points, faces), axis=1) >= 1e-12
    return {'vertices': len(points), 'triangles': len(faces),
            'minimumAngleBelow5DegreesPercent': round(float((angles[valid] < 5).mean()*100), 3),
            'minimumAngleBelow1DegreePercent': round(float((angles[valid] < 1).mean()*100), 3),
            'degenerateTriangles': int((np.linalg.norm(triangle_normals(points, faces), axis=1) < 1e-12).sum()),
            **closure(points, faces)}


def main():
    source, destination, report_file = map(Path, sys.argv[1:4])
    assert source.resolve() != destination.resolve()
    gltf, binary, data = load(source)
    original = copy.deepcopy(gltf)
    replacement_views = {}
    report = {'source': str(source), 'sourceSHA256': hashlib.sha256(data).hexdigest(), 'meshes': []}
    for mesh in gltf['meshes']:
        if not mesh.get('name', '').startswith('Bag_'):
            continue
        attrs = mesh['primitives'][0]['attributes']
        assert all(p['attributes'] == attrs for p in mesh['primitives'])
        positions = read(gltf, binary, attrs['POSITION']).astype(float)
        normals = read(gltf, binary, attrs['NORMAL']).astype(float)
        uv = read(gltf, binary, attrs['TEXCOORD_0']).astype(float)
        source_faces = [read(gltf, binary, p['indices']).reshape(-1, 3).astype(int) for p in mesh['primitives']]
        source_combined = np.concatenate(source_faces)
        faces, junction_splits, junction_vertices = stitch_print_junctions(positions, uv, source_faces)
        all_faces = np.concatenate(faces)
        label = next(i for i, p in enumerate(mesh['primitives']) if gltf['materials'][p['material']]['name'].endswith('_Approved_Label'))
        seal = next(i for i, p in enumerate(mesh['primitives']) if gltf['materials'][p['material']]['name'] == 'Compressed_heat_seal')
        body = next(i for i, p in enumerate(mesh['primitives']) if gltf['materials'][p['material']]['name'] == 'White_flexible_laminate')
        labels = np.unique(faces[label])
        pinned = np.zeros(len(positions), bool)
        pinned[np.unique(faces[seal])] = True
        pinned[junction_vertices] = True
        # Preserve the stacked side-pleat layers and the exact print cut/T-junctions.
        pinned |= np.abs(positions[:, 2]) > .94
        pinned |= np.isclose(uv[:, 0], .069, atol=1e-7) | np.isclose(uv[:, 0], .431, atol=1e-7)
        pinned |= np.isclose(uv[:, 1], .846, atol=1e-7)
        degenerate = np.linalg.norm(triangle_normals(positions, all_faces), axis=1) < 1e-12
        pinned[np.unique(all_faces[degenerate])] = True
        pinned |= (positions[:, 1] < .035) | (positions[:, 1] > 3.20)
        for axis in range(3):
            pinned |= (positions[:, axis] == positions[:, axis].min()) | (positions[:, axis] == positions[:, axis].max())
        # Keep duplicated UV/normal seam vertices coincident after fairing.
        _, groups = np.unique(np.round(positions, 6), axis=0, return_inverse=True)
        pinned_groups = np.bincount(groups, weights=pinned.astype(float)) > 0
        pinned |= pinned_groups[groups]
        weights = focus(positions)
        delta = fit_local_surfaces(positions, normals, weights, pinned, labels)
        sums = np.zeros((groups.max()+1, 3))
        np.add.at(sums, groups, delta)
        delta = sums[groups] / np.bincount(groups)[groups, None]
        delta[pinned] = 0
        after = constrain_displacements(positions, delta, all_faces, faces[label], groups)
        after_faces = [f.copy() for f in faces]
        topology_weights = weights.copy()
        topology_weights[pinned] = 0
        after_faces[body], flips = improve_diagonals(after, uv, faces[body], topology_weights)
        body_faces = after_faces[body]
        body_uv = uv[body_faces]
        d, e = body_uv[:, 1]-body_uv[:, 0], body_uv[:, 2]-body_uv[:, 0]
        uv_area = np.abs(d[:, 0]*e[:, 1]-d[:, 1]*e[:, 0])
        collapsed = (np.linalg.norm(triangle_normals(after, body_faces), axis=1) < 1e-12) & (uv_area < 1e-14)
        after_faces[body] = body_faces[~collapsed]
        combined = np.concatenate(after_faces)
        old_face_n, new_face_n = triangle_normals(positions, combined), triangle_normals(after, combined)
        cosines = (old_face_n * new_face_n).sum(axis=1) / np.maximum(np.linalg.norm(old_face_n, axis=1)*np.linalg.norm(new_face_n, axis=1), 1e-30)
        valid = np.linalg.norm(old_face_n, axis=1) > 1e-12
        assert cosines[valid].min() > .5, (mesh['name'], 'face turned >60 degrees')
        before_stats, after_stats = stats(positions, source_combined), stats(after, combined)
        assert after_stats['degenerateTriangles'] <= before_stats['degenerateTriangles']
        assert after_stats['boundaryEdges'] <= before_stats['boundaryEdges']
        assert after_stats['nonManifoldEdges'] <= before_stats['nonManifoldEdges']
        assert np.array_equal(after.min(0), positions.min(0)) and np.array_equal(after.max(0), positions.max(0))
        assert np.array_equal(after[:, 1], positions[:, 1])
        assert np.array_equal(after[labels, 2], positions[labels, 2])
        old_label_areas = np.linalg.norm(triangle_normals(positions, faces[label]), axis=1)
        new_label_areas = np.linalg.norm(triangle_normals(after, faces[label]), axis=1)
        relative = (new_label_areas / np.maximum(old_label_areas, 1e-20) - 1)[old_label_areas > 1e-12]
        assert np.max(np.abs(relative)) < .08, ('label stretch', float(np.max(np.abs(relative))))
        updated_normals = update_normals(positions, after, normals, combined, combined)
        write(gltf, binary, attrs['POSITION'], after)
        write(gltf, binary, attrs['NORMAL'], updated_normals)
        for primitive, triangles in zip(mesh['primitives'], after_faces):
            index = primitive['indices']
            accessor = gltf['accessors'][index]
            dtype = {5123: '<u2', 5125: '<u4'}[accessor['componentType']]
            replacement_views[accessor['bufferView']] = triangles.astype(dtype).tobytes()
            accessor['count'] = triangles.size
            accessor['min'], accessor['max'] = [int(triangles.min())], [int(triangles.max())]
        displacement = np.linalg.norm(after-positions, axis=1)
        entry = {'name': mesh['name'], 'before': before_stats, 'after': after_stats,
                 'verticesMoved': int((displacement > 1e-7).sum()), 'maxDisplacementLocalUnits': float(displacement.max()),
                 'diagonalsRotatedOnBody': flips,
                 'trianglesAddedForPrintJunctions': junction_splits,
                 'collapsedBodyTrianglesRemoved': int(collapsed.sum()),
                 'labelSurfaceAreaRelativeChangeMax': float(np.max(np.abs(relative))),
                 'labelSurfaceAreaRelativeChangeP99': float(np.percentile(np.abs(relative), 99)),
                 'uvBytesUnchanged': True, 'materialAssignmentsPreserved': True,
                 'labelHeightAndWidthCoordinatesUnchanged': True, 'boundsUnchanged': True}
        report['meshes'].append(entry)
        print(json.dumps(entry), flush=True)
    assert len(report['meshes']) == 3
    assert gltf['materials'] == original['materials'] and gltf['nodes'] == original['nodes']
    assert gltf['images'] == original['images'] and gltf['textures'] == original['textures']
    parts, offset = [], 0
    for index, view in enumerate(gltf['bufferViews']):
        padding = -offset % 4
        parts.append(b'\0' * padding)
        offset += padding
        old_start = view.get('byteOffset', 0)
        payload = replacement_views.get(index, binary[old_start:old_start+view['byteLength']])
        view['byteOffset'], view['byteLength'] = offset, len(payload)
        parts.append(payload)
        offset += len(payload)
    binary = b''.join(parts)
    binary += b'\0' * (-len(binary) % 4)
    gltf['buffers'][0]['byteLength'] = len(binary)
    encoded = json.dumps(gltf, separators=(',', ':')).encode()
    encoded += b' ' * (-len(encoded) % 4)
    size = 28 + len(encoded) + len(binary)
    destination.write_bytes(struct.pack('<4sII', b'glTF', 2, size)
                           + struct.pack('<I4s', len(encoded), b'JSON') + encoded
                           + struct.pack('<I4s', len(binary), b'BIN\0') + binary)
    report.update({'outputBytes': size, 'inputBytes': len(data), 'materialsUnchanged': True,
                   'embeddedImagesUnchanged': True, 'nodeTransformsUnchanged': True,
                   'additionalMeshes': 0, 'additionalDrawCalls': 0,
                   'trianglesAdded': sum(m['trianglesAddedForPrintJunctions'] for m in report['meshes']),
                   'trianglesRemoved': sum(m['collapsedBodyTrianglesRemoved'] for m in report['meshes'])})
    Path(report_file).write_text(json.dumps(report, indent=2), encoding='utf-8')


if __name__ == '__main__':
    main()
