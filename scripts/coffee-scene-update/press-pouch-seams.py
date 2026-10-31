"""Form narrow two-ply corner flanges while retaining the pouch's deep gussets.

Usage: python press-pouch-seams.py before.glb candidate.glb report.json
Use the restored, unpressed pouch as input, never a previous candidate.
"""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import struct
import sys

import numpy as np

spec = importlib.util.spec_from_file_location('geometry_io', Path(__file__).with_name('refine-geometry.py'))
io = importlib.util.module_from_spec(spec)
spec.loader.exec_module(io)


def press_seams(before):
    # The existing cage has 65 horizontal rings, each with 84 perimeter stations.
    ring_count, columns = 65, 84
    rings = before[:ring_count * columns].reshape(ring_count, columns, 3)
    result = rings.copy()
    height = rings[:, 0, 1]
    weight = io.ramp(.04, .16, height) * (1 - io.ramp(3.05, 3.28, height))
    # Each tuple describes a face corner, its inboard face stations and two
    # adjacent side stations. The rest of the W-shaped gusset is never moved.
    corners = [
        (0, [1, 2, 3, 4], 5, 83, 82, 1),
        (30, [29, 28, 27, 26], 25, 31, 32, 1),
        (42, [43, 44, 45, 46], 47, 41, 40, -1),
        (72, [71, 70, 69, 68], 67, 73, 74, -1),
    ]
    for corner, face, transition, tip, root, outward in corners:
        face_depth = rings[:, corner, 0]
        thickness = np.minimum(.009, np.abs(face_depth - .0212) * .20)
        side_depth = face_depth - outward * thickness
        # A short flat face ends at the existing silhouette, then folds back
        # under itself. It stays at the face edge, not at the bag's mid-plane.
        for column in face:
            result[:, column, 0] += weight * (face_depth - rings[:, column, 0])
            result[:, column, 2] += weight * .30 * (rings[:, column, 2] - rings[:, corner, 2])
        result[:, transition, 0] += weight * .15 * (face_depth - rings[:, transition, 0])
        side_sign = np.sign(rings[:, corner, 2])
        for column, across in ((tip, rings[:, corner, 2] - side_sign * .001),
                               (root, result[:, face[-1], 2])):
            result[:, column, 0] += weight * (side_depth - rings[:, column, 0])
            result[:, column, 2] += weight * (across - rings[:, column, 2])
        full = weight == 1
        assert np.allclose(result[full, face[-1], 0], face_depth[full])
        assert np.allclose((face_depth[full] - result[full, root, 0]) * outward, thickness[full])
    after = before.copy()
    after[:ring_count * columns] = result.reshape(-1, 3)
    # Protect the central face, seven interior side stations and both end caps.
    for selection in (slice(6, 25), slice(48, 67), slice(33, 40), slice(75, 82)):
        assert np.array_equal(result[:, selection], rings[:, selection])
    assert np.array_equal(after[:, 1], before[:, 1])
    assert np.array_equal(after[ring_count * columns:], before[ring_count * columns:])
    assert np.array_equal(after.min(0), before.min(0))
    assert np.array_equal(after.max(0), before.max(0))
    return after


def main():
    source, destination, report_path = map(Path, sys.argv[1:4])
    assert source.resolve() != destination.resolve()
    gltf, binary, original_data = io.load(source)
    original, original_binary = copy.deepcopy(gltf), bytes(binary)
    bags = [mesh for mesh in gltf['meshes'] if mesh.get('name', '').startswith('Bag_')]
    assert len(bags) == 3
    attributes = bags[0]['primitives'][0]['attributes']
    assert all(p['attributes'] == attributes for bag in bags for p in bag['primitives'])
    before = io.read(gltf, binary, attributes['POSITION']).astype(float)
    assert len(before) == 6098
    after = press_seams(before).astype('<f4')
    faces = np.concatenate([io.read(gltf, binary, p['indices']).reshape(-1, 3) for p in bags[0]['primitives']]).astype(int)
    face_normals = io.triangle_normals(after.astype(float), faces)
    assert np.linalg.norm(face_normals, axis=1).min() > 1e-12
    normals = np.zeros(after.shape, dtype=float)
    for corner in range(3):
        np.add.at(normals, faces[:, corner], face_normals)
    normals /= np.linalg.norm(normals, axis=1, keepdims=True)
    assert np.isfinite(normals).all()
    io.write(gltf, binary, attributes['POSITION'], after)
    io.write(gltf, binary, attributes['NORMAL'], normals)
    changed_views = {gltf['accessors'][attributes[key]]['bufferView'] for key in ('POSITION', 'NORMAL')}
    assert len(changed_views) == 2
    for index, view in enumerate(gltf['bufferViews']):
        if index not in changed_views:
            start = view.get('byteOffset', 0)
            assert binary[start:start + view['byteLength']] == original_binary[start:start + view['byteLength']], index
    for key in ('nodes', 'meshes', 'materials', 'textures', 'images', 'samplers', 'scenes', 'extensionsUsed', 'extensionsRequired'):
        assert gltf.get(key) == original.get(key), key
    stats = io.stats(after.astype(float), faces)
    assert stats['boundaryEdges'] == stats['nonManifoldEdges'] == stats['degenerateTriangles'] == 0
    encoded = json.dumps(gltf, separators=(',', ':')).encode()
    encoded += b' ' * (-len(encoded) % 4)
    data = (struct.pack('<4sII', b'glTF', 2, 28 + len(encoded) + len(binary))
            + struct.pack('<I4s', len(encoded), b'JSON') + encoded
            + struct.pack('<I4s', len(binary), b'BIN\0') + binary)
    destination.write_bytes(data)
    report = {
        'sourceSHA256': hashlib.sha256(original_data).hexdigest(),
        'outputSHA256': hashlib.sha256(data).hexdigest(),
        'inputBytes': len(original_data), 'outputBytes': len(data),
        'movedVertices': int((np.linalg.norm(after - before, axis=1) > 1e-7).sum()),
        'flangeThicknessLocal': .009, 'flangeWidthScale': 1.30, 'geometry': stats,
        'centralFacesInteriorGussetsAndEndCapsUnchanged': True,
        'overallBoundsUnchanged': True, 'allMaterialsAndTexturesUnchanged': True,
        'allUVsIndicesOtherGeometryAndTransformsUnchanged': True,
    }
    report_path.write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
