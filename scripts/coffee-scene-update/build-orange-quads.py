"""Recover a structured quad pouch from the high-resolution guide and export its triangulated GLB.

Usage: python build-orange-quads.py current.glb high_resolution_guide.glb output_directory
Only the orange pouch is replaced. The OBJ/JSON retain real four-vertex faces.
"""
import collections
import copy
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import struct
import sys

import numpy as np

spec = importlib.util.spec_from_file_location('geometry_io', Path(__file__).with_name('refine-geometry.py'))
io = importlib.util.module_from_spec(spec)
spec.loader.exec_module(io)


def interpolate_curve(points, uv, parameters):
    order = np.argsort(uv[:, 0])
    u = uv[order, 0]
    return np.column_stack([np.interp(parameters, u, points[order, k]) for k in range(3)])


def grid_sample(grid, x, y):
    x, y = np.clip(x, 0, grid.shape[1]-1), np.clip(y, 0, grid.shape[0]-1)
    a, b = int(x), int(y)
    c, d = min(a+1, grid.shape[1]-1), min(b+1, grid.shape[0]-1)
    sx, sy = x-a, y-b
    return (1-sy)*((1-sx)*grid[b, a]+sx*grid[b, c])+sy*((1-sx)*grid[d, a]+sx*grid[d, c])


def minimum_angle(p):
    lengths = np.linalg.norm(p-np.roll(p, -1, axis=0), axis=1)
    cos = (np.roll(lengths, 1)**2+np.roll(lengths, 2)**2-lengths**2)/np.maximum(2*np.roll(lengths, 1)*np.roll(lengths, 2), 1e-30)
    return np.arccos(np.clip(cos, -1, 1)).min()


def triangulate(points, quad):
    a, b, c, d = quad
    choices = [np.array([[a, b, c], [a, c, d]]), np.array([[a, b, d], [b, c, d]])]
    scores = []
    for faces in choices:
        n = io.triangle_normals(points, faces)
        area = np.linalg.norm(n, axis=1)
        alignment = float(n[0] @ n[1] / max(float(area.prod()), 1e-30))
        scores.append(alignment + .12*min(minimum_angle(points[f]) for f in faces))
    return choices[int(np.argmax(scores))]


def main():
    current_file, guide_file, output = map(Path, sys.argv[1:4])
    output.mkdir(parents=True, exist_ok=True)
    gltf, binary, current_data = io.load(current_file)
    original = copy.deepcopy(gltf)
    guide, guide_binary, _ = io.load(guide_file)
    gm = next(m for m in guide['meshes'] if m.get('name') == 'Bag_1kg_Orange')
    ga = gm['primitives'][0]['attributes']
    source_p, source_uv = io.read(guide, guide_binary, ga['POSITION']).astype(float), io.read(guide, guide_binary, ga['TEXCOORD_0']).astype(float)
    assert len(source_p) >= 17922, 'Use the pre-decimation structured guide'
    rings = source_p[:16512].reshape(129, 128, 3)
    ring_uv = source_uv[:16512].reshape(129, 128, 2)
    heights = rings[:, 0, 1]
    assert np.max(np.ptp(rings[:, :, 1], axis=1)) < 1e-7
    assert np.all(np.diff(heights) >= 0)
    height = float(heights[-1])
    # Remove a coincident-height guide row rather than retaining collapsed support faces.
    unique_heights, reverse_indices = np.unique(heights[::-1], return_index=True)
    row_indices = len(heights)-1-reverse_indices
    rings, ring_uv = rings[row_indices], ring_uv[row_indices]
    heights = unique_heights

    u = np.array([0, .0015, .004, .008, .014, .022, .033, .047, .058, .069,
                  .086, .112, .145, .18, .215, .25])
    u = np.r_[u, .5-u[-2::-1]]
    # Keep the original front/back inflation extrema in the new structured columns.
    extremum_u = float(source_uv[np.argmax(source_p[:, 0]), 0])
    u[np.argmin(abs(u-extremum_u))] = extremum_u
    u.sort()
    t = np.array([0, .05, .125, .22, .3125, .4375, .5, .5625, .6875, .78, .875, .95, 1.])
    nf, ns = len(u)-1, len(t)-1
    circumference = 2*(nf+ns)

    def source_row(y):
        hi = int(np.clip(np.searchsorted(heights, y, side='right'), 1, len(heights)-1))
        lo = hi-1
        amount = np.clip((y-heights[lo])/(heights[hi]-heights[lo]), 0, 1)
        return rings[lo]*(1-amount)+rings[hi]*amount, ring_uv[lo]*(1-amount)+ring_uv[hi]*amount

    def profile(y):
        p, v = source_row(y)
        def fit_outer_strips(parameters, low, high):
            result = parameters.copy()
            left, right = result < .069, result > .431
            result[left] = low + result[left]/.069*(.069-low)
            result[right] = .431 + (result[right]-.431)/.069*(high-.431)
            return result
        front_u = fit_outer_strips(u, v[0, 0], v[48, 0])
        front = interpolate_curve(p[:49], v[:49], front_u)
        # The guide's positive-side strip starts with a duplicated front endpoint.
        # Restore the missing back endpoint and order the gusset back-to-front.
        ratio = -v[111, 0]/(v[111, 0]-v[110, 0])
        back_corner = p[111]+ratio*(p[111]-p[110])
        back_points = np.vstack([p[64:112], back_corner])
        back_uv = np.vstack([v[64:112], [0, 1-y/height]])
        back_u = fit_outer_strips(u, 0, v[64, 0])[::-1]
        back = interpolate_curve(back_points, back_uv, back_u)
        negative = np.column_stack([np.interp(t, np.linspace(0, 1, 17), p[48:65, k]) for k in range(3)])
        positive_points = np.vstack([back_corner, p[127:112:-1], p[0]])
        positive = np.column_stack([np.interp(t, np.linspace(0, 1, 17), positive_points[:, k]) for k in range(3)])
        negative_uv = np.column_stack([np.interp(t, np.linspace(0, 1, 17), v[48:65, k]) for k in range(2)])
        positive_uv_source = np.vstack([[0, 1-y/height], v[127:112:-1], v[0]])
        positive_uv = np.column_stack([np.interp(t, np.linspace(0, 1, 17), positive_uv_source[:, k]) for k in range(2)])
        points = np.vstack([front, negative[1:], back[1:], positive[1:-1]])
        uv = np.vstack([np.column_stack([front_u, np.full(len(u), 1-y/height)]), negative_uv[1:],
                        np.column_stack([back_u[1:], np.full(len(u)-1, 1-y/height)]), positive_uv[1:-1]])
        points[:, 1] = y
        return points, uv

    label_y = height*(1-.846)
    extrema_y = source_p[np.argmax(source_p[:, 0]), 1]
    def select_rows(low, high, count, mandatory):
        candidates = np.unique(np.r_[heights[(heights >= low) & (heights <= high)], low, high, mandatory])
        selected = set(float(y) for y in [low, high, *mandatory])
        curves = {float(y): profile(float(y))[0] for y in candidates}
        while len(selected) < count:
            ordered = sorted(selected)
            best = None
            for y in candidates:
                if float(y) in selected:
                    continue
                i = np.searchsorted(ordered, y)
                a, b = ordered[i-1], ordered[i]
                q = (y-a)/(b-a)
                error = np.linalg.norm(curves[float(y)]-(curves[a]*(1-q)+curves[b]*q), axis=1).max()
                # A small spacing term prevents a long unsupported flat span.
                score = error + .0008*(b-a)
                if best is None or score > best[0]:
                    best = (score, float(y))
            assert best is not None
            selected.add(best[1])
        return selected

    rows = sorted(select_rows(0, .82, 17, [label_y, .025, .045])
                  | select_rows(.82, 2.12, 7, [float(extrema_y)])
                  | select_rows(2.12, 3.2, 23, [])
                  | select_rows(3.2, height, 21, []))
    assert len(rows) == 65
    positions, texcoords = [], []
    for y in rows:
        p, v = profile(y)
        positions.extend(p); texcoords.extend(v)
    quads, materials = [], []
    orange = next(m for m in gltf['meshes'] if m.get('name') == 'Bag_1kg_Orange')
    label_mat = next(p['material'] for p in orange['primitives'] if gltf['materials'][p['material']]['name'].endswith('_Approved_Label'))
    body_mat = next(i for i, m in enumerate(gltf['materials']) if m['name'] == 'White_flexible_laminate')
    seal_mat = next(i for i, m in enumerate(gltf['materials']) if m['name'] == 'Compressed_heat_seal')
    for row in range(len(rows)-1):
        for column in range(circumference):
            a = row*circumference+column
            b = row*circumference+(column+1)%circumference
            quads.append([a, b, b+circumference, a+circumference])
            printed = column < nf and u[column] >= .069-1e-8 and u[column+1] <= .431+1e-8 and rows[row] >= label_y-1e-7
            materials.append(label_mat if printed else body_mat)

    def cap(top):
        ring_index = len(rows)-1 if top else 0
        offset = ring_index*circumference
        target_ring = np.asarray(positions[offset:offset+circumference])
        old_p, old_uv = source_row(height if top else 0)
        ratio = -old_uv[111, 0]/(old_uv[111, 0]-old_uv[110, 0])
        corner = old_p[111]+ratio*(old_p[111]-old_p[110])
        grid = np.zeros((17, 49, 3)); grid_uv = np.zeros((17, 49, 2))
        grid[0], grid_uv[0] = old_p[:49], old_uv[:49]
        grid[-1] = np.vstack([corner, old_p[111:63:-1]])
        grid_uv[-1] = np.vstack([[0, 0 if top else 1], old_uv[111:63:-1]])
        grid[:, -1], grid_uv[:, -1] = old_p[48:65], old_uv[48:65]
        grid[:, 0] = np.vstack([old_p[0], old_p[113:128], corner])
        grid_uv[:, 0] = np.vstack([old_uv[0], old_uv[113:128], [0, 0 if top else 1]])
        start = 17217 if top else 16512
        grid[1:-1, 1:-1] = source_p[start:start+705].reshape(15, 47, 3)
        grid_uv[1:-1, 1:-1] = source_uv[start:start+705].reshape(15, 47, 2)
        indices = np.zeros((ns+1, nf+1), dtype=int)
        indices[0] = offset+np.arange(nf+1)
        indices[-1] = offset+2*nf+ns-np.arange(nf+1)
        indices[:, -1] = offset+nf+np.arange(ns+1)
        indices[:, 0] = offset+(circumference-np.arange(ns+1))%circumference
        for k in range(1, ns):
            for j in range(1, nf):
                x = math.acos(np.clip(1-4*u[j], -1, 1))/math.pi*48
                y = t[k]*16
                p = grid_sample(grid, x, y)
                p += (1-t[k])*(target_ring[j]-grid_sample(grid, x, 0))
                p += t[k]*(target_ring[2*nf+ns-j]-grid_sample(grid, x, 16))
                indices[k, j] = len(positions)
                positions.append(p); texcoords.append(grid_sample(grid_uv, x, y))
        for k in range(ns):
            for j in range(nf):
                a, b, c, d = indices[k, j], indices[k, j+1], indices[k+1, j+1], indices[k+1, j]
                quads.append([int(a), int(b), int(c), int(d)] if top else [int(a), int(d), int(c), int(b)])
                materials.append(seal_mat)

    cap(False); cap(True)
    positions, texcoords = np.asarray(positions, dtype='<f4'), np.asarray(texcoords, dtype='<f4')
    quads = np.asarray(quads, dtype=int); materials = np.asarray(materials, dtype=int)
    edges = collections.Counter()
    neighbors = [set() for _ in positions]
    for q in quads:
        assert len(set(q)) == 4
        for a, b in zip(q, np.roll(q, -1)):
            edges[tuple(sorted((int(a), int(b))))] += 1
            neighbors[a].add(int(b)); neighbors[b].add(int(a))
    assert all(count == 2 for count in edges.values())
    valence = collections.Counter(map(len, neighbors))
    assert set(valence) == {3, 4} and valence[3] == 8
    faces_per_quad = np.asarray([triangulate(positions.astype(float), q) for q in quads])
    faces = faces_per_quad.reshape(-1, 3)
    area_check = np.linalg.norm(io.triangle_normals(positions.astype(float), faces), axis=1)
    bad = np.flatnonzero(area_check < 1e-12)
    if len(bad):
        print('Collapsed diagnostic faces:', [(int(i), int(i//2), positions[faces[i]].tolist()) for i in bad[:8]], flush=True)
    assert not len(bad)
    normals = np.zeros_like(positions, dtype=float)
    face_normals = io.triangle_normals(positions.astype(float), faces)
    for k in range(3):
        np.add.at(normals, faces[:, k], face_normals)
    normals /= np.linalg.norm(normals, axis=1, keepdims=True)
    normals = normals.astype('<f4')
    topology = {'positions': positions.reshape(-1).tolist(), 'uv': texcoords.reshape(-1).tolist(),
                'normals': normals.reshape(-1).tolist(), 'quads': quads.tolist(),
                'materials': materials.tolist(), 'rows': rows, 'frontColumnsUV': u.tolist(),
                'gussetDepthStations': t.tolist(), 'vertexValence': dict(valence)}
    (output/'quad-source.json').write_text(json.dumps(topology, separators=(',', ':')), encoding='utf-8')
    obj = ['# Orange pouch; real quad faces in original mesh-local coordinates', '# GLB retains the full original PBR material definitions']
    obj += ['v '+' '.join(f'{float(x):.8f}' for x in p) for p in positions]
    obj += [f'vt {float(v[0]):.8f} {1-float(v[1]):.8f}' for v in texcoords]
    obj += ['vn '+' '.join(f'{float(x):.8f}' for x in n) for n in normals]
    for mat in (label_mat, body_mat, seal_mat):
        obj.append('g '+gltf['materials'][mat]['name'])
        for q in quads[materials == mat]:
            obj.append('f '+' '.join(f'{i+1}/{i+1}/{i+1}' for i in q))
    (output/'orange-quad-source.obj').write_text('\n'.join(obj)+'\n', encoding='utf-8')

    replacements = {}
    def replace(index, values, component_type):
        a = gltf['accessors'][index]
        assert sum(v['bufferView'] == a['bufferView'] for v in gltf['accessors']) == 1
        replacements[a['bufferView']] = values.tobytes()
        a.update(componentType=component_type, count=len(values), byteOffset=0,
                 min=values.min(axis=0).reshape(-1).tolist(), max=values.max(axis=0).reshape(-1).tolist())
        gltf['bufferViews'][a['bufferView']].pop('byteStride', None)
    attrs = orange['primitives'][0]['attributes']
    replace(attrs['POSITION'], positions, 5126); replace(attrs['NORMAL'], normals, 5126); replace(attrs['TEXCOORD_0'], texcoords, 5126)
    for primitive in orange['primitives']:
        indices = faces_per_quad[materials == primitive['material']].reshape(-1, 1).astype('<u2')
        replace(primitive['indices'], indices, 5123)
    parts, offset = [], 0
    for index, view in enumerate(gltf['bufferViews']):
        pad = -offset % 4; parts.append(b'\0'*pad); offset += pad
        start = view.get('byteOffset', 0)
        payload = replacements.get(index, binary[start:start+view['byteLength']])
        view.update(byteOffset=offset, byteLength=len(payload)); parts.append(payload); offset += len(payload)
    packed = b''.join(parts); packed += b'\0'*(-len(packed)%4)
    gltf['buffers'][0]['byteLength'] = len(packed)
    encoded = json.dumps(gltf, separators=(',', ':')).encode(); encoded += b' '*(-len(encoded)%4)
    data = struct.pack('<4sII', b'glTF', 2, 28+len(encoded)+len(packed))+struct.pack('<I4s', len(encoded), b'JSON')+encoded+struct.pack('<I4s', len(packed), b'BIN\0')+packed
    (output/'candidate.glb').write_bytes(data)
    for key in ('materials', 'nodes', 'scenes', 'images', 'textures', 'samplers'):
        assert gltf[key] == original[key]
    old_orange = next(m for m in original['meshes'] if m.get('name') == 'Bag_1kg_Orange')
    before_points = io.read(original, binary, old_orange['primitives'][0]['attributes']['POSITION']).astype(float)
    before_faces = np.concatenate([io.read(original, binary, p['indices']).reshape(-1, 3) for p in old_orange['primitives']]).astype(int)
    report = {'sourceSHA256': hashlib.sha256(current_data).hexdigest(), 'outputSHA256': hashlib.sha256(data).hexdigest(),
              'before': io.stats(before_points, before_faces), 'after': io.stats(positions.astype(float), faces),
              'quadFaces': len(quads), 'quadVertices': len(positions), 'vertexValence': dict(valence),
              'verticesWithMoreThan4QuadEdges': sum(n for degree, n in valence.items() if degree > 4),
              'ringCount': len(rows), 'circumferenceColumns': circumference, 'frontColumns': nf, 'gussetColumns': ns,
              'bandRows': {'bottom': 17, 'middle': 7, 'shoulder': 23, 'seal': 21},
              'boundsBefore': [before_points.min(0).tolist(), before_points.max(0).tolist()],
              'boundsAfter': [positions.min(0).tolist(), positions.max(0).tolist()],
              'materialsPreserved': True, 'transformsPreserved': True, 'inputBytes': len(current_data), 'outputBytes': len(data),
              'notes': ['True quad source retained separately; GLB is generated by triangulating those same faces.',
                        'Orange reconstructed from pre-decimation structured guide; other objects are untouched.',
                        'Positive gusset perimeter ordered coherently rather than crossing its duplicated front endpoint.',
                        'Front grid columns and rows align with the existing printed UV rectangle; artwork is reused.']}
    assert report['after']['boundaryEdges'] == report['after']['nonManifoldEdges'] == report['after']['degenerateTriangles'] == 0
    (output/'report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
