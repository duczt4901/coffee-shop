"""Split front triangles at the printed UV boundary without changing label pixels.

Usage: python fix-label-boundary.py input.glb output.glb
"""
import copy
import hashlib
import json
import pathlib
import struct
import sys

import numpy as np

source, destination = map(pathlib.Path, sys.argv[1:3])
data = source.read_bytes()
assert struct.unpack_from('<III', data) == (0x46546C67, 2, len(data))
json_length = struct.unpack_from('<I', data, 12)[0]
gltf = json.loads(data[20:20 + json_length])
original = copy.deepcopy(gltf)
binary = data[28 + json_length:]
payloads = [binary[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']]
            for v in gltf['bufferViews']]
body_id = next(i for i, m in enumerate(gltf['materials']) if m['name'] == 'White_flexible_laminate')


def read(index):
    a = gltf['accessors'][index]
    dtype = {5123: '<u2', 5125: '<u4', 5126: '<f4'}[a['componentType']]
    components = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3}[a['type']]
    return np.ndarray((a['count'], components), dtype=dtype, buffer=payloads[a['bufferView']],
                      offset=a.get('byteOffset', 0),
                      strides=(gltf['bufferViews'][a['bufferView']].get('byteStride',
                               np.dtype(dtype).itemsize * components), np.dtype(dtype).itemsize)).copy()


def append(array, kind, target):
    array = np.asarray(array)
    view = len(payloads)
    payloads.append(array.tobytes())
    gltf['bufferViews'].append({'buffer': 0, 'target': target})
    index = len(gltf['accessors'])
    gltf['accessors'].append({'bufferView': view, 'componentType': 5126 if array.dtype.kind == 'f' else 5125,
                             'count': len(array), 'type': kind,
                             'min': np.min(array, axis=0).reshape(-1).tolist(),
                             'max': np.max(array, axis=0).reshape(-1).tolist()})
    return index


def area(vertices, faces):
    triangles = vertices[faces, :3]
    return np.linalg.norm(np.cross(triangles[:, 1] - triangles[:, 0],
                                   triangles[:, 2] - triangles[:, 0]), axis=1).sum() / 2


report = []
for mesh in gltf['meshes']:
    label = next((p for p in mesh['primitives']
                  if gltf['materials'][p['material']]['name'].endswith('_Approved_Label')), None)
    if label is None:
        continue
    body = next(p for p in mesh['primitives'] if p['material'] == body_id)
    assert all(p['attributes'] == label['attributes'] for p in mesh['primitives'])
    vertices = np.concatenate([read(label['attributes'][name])
                               for name in ('POSITION', 'NORMAL', 'TEXCOORD_0')], axis=1).astype(float).tolist()
    initial = np.asarray(vertices)
    label_before = read(label['indices']).reshape(-1, 3)
    body_before = read(body['indices']).reshape(-1, 3)
    label_faces, body_faces = [], body_before.tolist()
    intersections = {}

    def cut(polygon, axis, boundary, sign):
        inside, outside = [], []
        for a, b in zip(polygon, polygon[1:] + polygon[:1]):
            va, vb = np.asarray(vertices[a]), np.asarray(vertices[b])
            da, db = (va[axis] - boundary) * sign, (vb[axis] - boundary) * sign
            (inside if da >= 0 else outside).append(a)
            if (da < 0 < db) or (db < 0 < da):
                key = (min(a, b), max(a, b), axis, boundary)
                if key not in intersections:
                    value = va + (vb - va) * (da / (da - db))
                    value[axis] = boundary
                    intersections[key] = len(vertices)
                    vertices.append(value.tolist())
                inside.append(intersections[key])
                outside.append(intersections[key])
            elif da == 0:
                outside.append(a)
        return inside, outside

    def triangulate(polygon, output):
        for i in range(1, len(polygon) - 1):
            face = [polygon[0], polygon[i], polygon[i + 1]]
            positions = np.asarray([vertices[v][:3] for v in face])
            if np.linalg.norm(np.cross(positions[1] - positions[0], positions[2] - positions[0])) > 1e-15:
                output.append(face)

    # UV U is doubled by the label's existing KHR_texture_transform.
    for face in label_before.tolist():
        polygon = face
        for axis, boundary, sign in ((6, .138 / 2, 1), (6, .862 / 2, -1), (7, .846, -1)):
            if len(polygon) < 3:
                break
            polygon, outside = cut(polygon, axis, boundary, sign)
            triangulate(outside, body_faces)
        triangulate(polygon, label_faces)

    vertices = np.asarray(vertices, dtype='<f4')
    vertices[:, 3:6] /= np.linalg.norm(vertices[:, 3:6], axis=1, keepdims=True)
    label_faces, body_faces = np.asarray(label_faces, dtype='<u4'), np.asarray(body_faces, dtype='<u4')
    # Cutting must preserve the surface area and leave every label vertex inside the print.
    before_area = area(initial, label_before) + area(initial, body_before)
    after_area = area(vertices, label_faces) + area(vertices, body_faces)
    assert abs(before_area - after_area) < before_area * 1e-6, f'Surface area changed: {before_area} -> {after_area}'
    uv = vertices[label_faces, 6:8]
    assert uv[:, :, 0].min() >= .069 - 1e-7 and uv[:, :, 0].max() <= .431 + 1e-7
    assert uv[:, :, 1].max() <= .846 + 1e-7
    attributes = {name: append(vertices[:, start:end].copy(), kind, 34962)
                  for name, start, end, kind in (('POSITION', 0, 3, 'VEC3'),
                                                ('NORMAL', 3, 6, 'VEC3'), ('TEXCOORD_0', 6, 8, 'VEC2'))}
    for primitive in mesh['primitives']:
        primitive['attributes'] = attributes.copy()
    label['indices'] = append(label_faces.reshape(-1, 1), 'SCALAR', 34963)
    body['indices'] = append(body_faces.reshape(-1, 1), 'SCALAR', 34963)
    report.append({'mesh': mesh['name'], 'newVertices': len(vertices) - len(initial),
                   'labelTriangles': len(label_faces), 'bodyTriangles': len(body_faces),
                   'surfaceAreaPreserved': True})

assert len(report) == 3
# Match the reference's semi-matte response; the Paper002 grain and label materials stay intact.
gltf['materials'][body_id]['pbrMetallicRoughness']['roughnessFactor'] = .75
for i, material in enumerate(original['materials']):
    if i != body_id:
        assert material == gltf['materials'][i], 'Label and prop materials must stay intact'
assert gltf['images'] == original['images'] and gltf['nodes'] == original['nodes']
label_hashes = {m['name']: hashlib.sha256(payloads[gltf['images'][gltf['textures'][
    m['pbrMetallicRoughness']['baseColorTexture']['index']]['source']]['bufferView']]).hexdigest()
    for m in gltf['materials'] if m['name'].endswith('_Approved_Label')}

# Drop geometry buffers superseded by the cut, retaining image bytes and instancing accessors.
used_accessors = set()
for mesh in gltf['meshes']:
    for p in mesh['primitives']:
        used_accessors.update(p['attributes'].values())
        used_accessors.add(p['indices'])
for node in gltf['nodes']:
    used_accessors.update(node.get('extensions', {}).get('EXT_mesh_gpu_instancing', {}).get('attributes', {}).values())
assert not gltf.get('animations') and not gltf.get('skins')
accessor_map = {old: new for new, old in enumerate(sorted(used_accessors))}
gltf['accessors'] = [gltf['accessors'][i] for i in sorted(used_accessors)]
for mesh in gltf['meshes']:
    for p in mesh['primitives']:
        p['attributes'] = {k: accessor_map[v] for k, v in p['attributes'].items()}
        p['indices'] = accessor_map[p['indices']]
for node in gltf['nodes']:
    attributes = node.get('extensions', {}).get('EXT_mesh_gpu_instancing', {}).get('attributes')
    if attributes:
        node['extensions']['EXT_mesh_gpu_instancing']['attributes'] = {k: accessor_map[v] for k, v in attributes.items()}
used_views = sorted({a['bufferView'] for a in gltf['accessors']} | {i['bufferView'] for i in gltf['images']})
view_map = {old: new for new, old in enumerate(used_views)}
views, parts, offset = [], [], 0
for i in used_views:
    padding = -offset % 4
    parts.append(b'\0' * padding)
    offset += padding
    views.append({**gltf['bufferViews'][i], 'byteOffset': offset, 'byteLength': len(payloads[i])})
    parts.append(payloads[i])
    offset += len(payloads[i])
for item in gltf['accessors'] + gltf['images']:
    item['bufferView'] = view_map[item['bufferView']]
gltf['bufferViews'] = views
packed = b''.join(parts)
packed += b'\0' * (-len(packed) % 4)
gltf['buffers'][0]['byteLength'] = len(packed)
encoded = json.dumps(gltf, separators=(',', ':')).encode()
encoded += b' ' * (-len(encoded) % 4)
size = 28 + len(encoded) + len(packed)
destination.write_bytes(struct.pack('<4sII', b'glTF', 2, size)
                       + struct.pack('<I4s', len(encoded), b'JSON') + encoded
                       + struct.pack('<I4s', len(packed), b'BIN\0') + packed)
result = {'sourceBytes': len(data), 'outputBytes': size, 'meshes': report,
          'labelTextureSHA256': label_hashes, 'labelMaterialsUnchanged': True}
pathlib.Path(__file__).with_name('label-boundary-report.json').write_text(json.dumps(result, indent=2))
print(json.dumps(result, indent=2))
