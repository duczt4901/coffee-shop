"""Soften short, angular fold peaks while retaining the existing quad/UV layout.

Usage: python soften-orange-quads.py before.glb quad-source.json source.obj output-dir
"""
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


def soften(before, topology):
    rows = np.asarray(topology['rows'])
    columns = (len(topology['frontColumnsUV']) + len(topology['gussetDepthStations']) - 2)*2
    assert len(rows) == 65 and columns == 84
    ring_count = len(rows)*columns
    guide = before[:ring_count].reshape(len(rows), columns, 3).astype(float)
    result = guide.copy()
    # Integrate over height so tightly packed seal rows do not dominate the fit.
    spacing = np.gradient(rows)
    for i, y in enumerate(rows):
        bottom = io.ramp(.035, .12, y)*(1-io.ramp(.65, .95, y))
        shoulder = io.ramp(2.08, 2.35, y)*(1-io.ramp(3.02, 3.20, y))
        amount = max(bottom, shoulder)*.92
        if amount == 0:
            continue
        sigma = .105 if bottom > shoulder else .085
        ids = np.flatnonzero(abs(rows-y) < sigma*2.7)
        x = (rows[ids]-y)/sigma
        basis = np.column_stack([np.ones(len(ids)), x, x*x])
        weights = np.sqrt(np.exp(-.5*x*x)*spacing[ids])
        target = guide[ids][:, :, [0, 2]].reshape(len(ids), -1)
        fit = np.linalg.lstsq(basis*weights[:, None], target*weights[:, None], rcond=None)[0][0].reshape(columns, 2)
        delta = (fit-guide[i][:, [0, 2]])*amount
        delta *= np.minimum(1, .075/np.maximum(np.linalg.norm(delta, axis=1), 1e-12))[:, None]
        result[i, :, 0] += delta[:, 0]
        result[i, :, 2] += delta[:, 1]
    after = before.copy()
    after[:ring_count] = result.reshape(-1, 3)
    return after


def export_deformation(asset, source, obj_file, output, deform):
    output.mkdir(parents=True, exist_ok=True)
    gltf, binary, original = io.load(asset)
    topology = json.loads(source.read_text(encoding='utf-8'))
    mesh = next(m for m in gltf['meshes'] if m.get('name') == 'Bag_1kg_Orange')
    attrs = mesh['primitives'][0]['attributes']
    before = io.read(gltf, binary, attrs['POSITION'])
    assert np.array_equal(before, np.asarray(topology['positions'], dtype='<f4').reshape(-1, 3))
    after = deform(before, topology)
    assert after.shape == before.shape and np.isfinite(after).all()
    rows = topology['rows']
    columns = (len(topology['frontColumnsUV']) + len(topology['gussetDepthStations']) - 2)*2
    assert np.array_equal(before[:, 1], after[:, 1])
    assert np.array_equal(before[:columns], after[:columns])
    assert np.array_equal(before[(len(rows)-1)*columns:], after[(len(rows)-1)*columns:])
    faces = np.concatenate([io.read(gltf, binary, p['indices']).reshape(-1, 3) for p in mesh['primitives']]).astype(int)
    face_normals = io.triangle_normals(after.astype(float), faces)
    assert np.linalg.norm(face_normals, axis=1).min() > 1e-12
    normals = np.zeros(after.shape, dtype=float)
    for corner in range(3):
        np.add.at(normals, faces[:, corner], face_normals)
    normals /= np.linalg.norm(normals, axis=1, keepdims=True)
    assert np.isfinite(normals).all()
    io.write(gltf, binary, attrs['POSITION'], after)
    io.write(gltf, binary, attrs['NORMAL'], normals)
    encoded = json.dumps(gltf, separators=(',', ':')).encode()
    encoded += b' '*(-len(encoded)%4)
    data = struct.pack('<4sII', b'glTF', 2, 28+len(encoded)+len(binary))+struct.pack('<I4s', len(encoded), b'JSON')+encoded+struct.pack('<I4s', len(binary), b'BIN\0')+binary
    (output/'candidate.glb').write_bytes(data)
    topology['positions'] = after.reshape(-1).tolist()
    topology['normals'] = normals.astype('<f4').reshape(-1).tolist()
    (output/'quad-source.json').write_text(json.dumps(topology, separators=(',', ':')), encoding='utf-8')
    lines = obj_file.read_text(encoding='utf-8').splitlines()
    position_index = normal_index = 0
    for i, line in enumerate(lines):
        if line.startswith('v '):
            lines[i] = 'v '+' '.join(f'{float(v):.8f}' for v in after[position_index]); position_index += 1
        elif line.startswith('vn '):
            lines[i] = 'vn '+' '.join(f'{float(v):.8f}' for v in normals[normal_index]); normal_index += 1
    assert position_index == normal_index == len(after)
    (output/'orange-quad-source.obj').write_text('\n'.join(lines)+'\n', encoding='utf-8')
    movement = np.linalg.norm(after-before, axis=1)
    report = {'sourceSHA256': hashlib.sha256(original).hexdigest(), 'outputSHA256': hashlib.sha256(data).hexdigest(),
              'movedVertices': int((movement > 1e-7).sum()), 'maximumDisplacement': float(movement.max()),
              'meanDisplacement': float(movement.mean()), 'quadFaces': len(topology['quads']),
              'vertices': len(after), 'triangles': len(faces), 'uvAndIndicesUnchanged': True,
              'before': io.stats(before.astype(float), faces), 'after': io.stats(after.astype(float), faces)}
    assert report['after']['boundaryEdges'] == report['after']['nonManifoldEdges'] == report['after']['degenerateTriangles'] == 0
    (output/'report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    export_deformation(*map(Path, sys.argv[1:5]), soften)
