"""Apply the supplied ambientCG Paper 002 maps to pouch body faces only.

Usage: python apply-paper002.py current.glb Paper002_1K-JPG/ output.glb
"""
import copy
import hashlib
import io
import json
import pathlib
import struct
import sys

import numpy as np
from PIL import Image

source, texture_dir, destination = map(pathlib.Path, sys.argv[1:4])
data = source.read_bytes()
assert struct.unpack_from('<III', data) == (0x46546C67, 2, len(data)), 'Expected an intact GLB'
json_size = struct.unpack_from('<I', data, 12)[0]
gltf = json.loads(data[20:20 + json_size])
original = copy.deepcopy(gltf)
binary = data[28 + json_size:]
payloads = [binary[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']]
            for v in gltf['bufferViews']]
original_payloads = payloads.copy()


def append_view(payload, target=None):
    index = len(payloads)
    payloads.append(payload)
    gltf['bufferViews'].append({'buffer': 0, **({'target': target} if target else {})})
    return index


def add_texture(image, name, jpeg=False):
    encoded = io.BytesIO()
    if jpeg:
        image.save(encoded, format='JPEG', quality=95, subsampling=0, optimize=True)
    else:
        image.save(encoded, format='PNG', optimize=True)
    image_id = len(gltf['images'])
    gltf['images'].append({'name': name, 'bufferView': append_view(encoded.getvalue()),
                           'mimeType': 'image/jpeg' if jpeg else 'image/png'})
    texture_id = len(gltf['textures'])
    gltf['textures'].append({'source': image_id, 'sampler': gltf['textures'][0].get('sampler', 0)})
    return {'index': texture_id, 'texCoord': 0,
            'extensions': {'KHR_texture_transform': {'scale': [2, 1]}}}


map_files = {name: texture_dir / f'Paper002_1K-JPG_{name}.jpg'
             for name in ('Color', 'NormalGL', 'Roughness')}
color_source = Image.open(map_files['Color']).convert('RGB')
color = np.asarray(color_source, dtype=float)
luminance = color @ np.array([.2126, .7152, .0722])
# An 18/255 lift and 25% chroma reduction retain the original luminance grain.
off_white = np.clip(luminance[:, :, None] + (color - luminance[:, :, None]) * .75 + 18, 0, 249)
color_image = Image.fromarray(np.rint(off_white).astype(np.uint8))
color_info = add_texture(color_image, 'Paper002_moderately_lightened_body', jpeg=True)

normal = Image.open(map_files['NormalGL']).convert('RGB')
normal.thumbnail((512, 512), Image.Resampling.LANCZOS)
normal_info = add_texture(normal, 'Paper002_body_NormalGL')
normal_info['scale'] = .18

roughness = Image.open(map_files['Roughness']).convert('L').resize(normal.size, Image.Resampling.LANCZOS)
orm = np.zeros((normal.height, normal.width, 3), dtype=np.uint8)
orm[:, :, 0] = 255
# Keep the paper variation, softened for laminated packaging instead of raw board.
orm[:, :, 1] = np.rint((.62 + .20 * np.asarray(roughness, dtype=float) / 255) * 255).astype(np.uint8)
orm_info = add_texture(Image.fromarray(orm), 'Paper002_body_roughness')

body_id = next(i for i, material in enumerate(gltf['materials']) if material.get('name') == 'White_flexible_laminate')
body = gltf['materials'][body_id]
body['pbrMetallicRoughness'].update({'baseColorFactor': [1, 1, 1, 1], 'baseColorTexture': color_info,
                                   'metallicFactor': 0, 'roughnessFactor': 1,
                                   'metallicRoughnessTexture': orm_info})
body['normalTexture'] = normal_info
body['extras'] = {**body.get('extras', {}), 'surfaceSource': 'ambientCG Paper002',
                  'colorLiftSRGB': 18, 'desaturation': .25, 'labelExcluded': True}


def accessor(index):
    item = gltf['accessors'][index]
    view = gltf['bufferViews'][item['bufferView']]
    dtype = {5123: '<u2', 5125: '<u4', 5126: '<f4'}[item['componentType']]
    components = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3}[item['type']]
    step = np.dtype(dtype).itemsize * components
    return np.ndarray((item['count'], components), dtype=dtype, buffer=payloads[item['bufferView']],
                      offset=item.get('byteOffset', 0), strides=(view.get('byteStride', step), np.dtype(dtype).itemsize)).copy()


def index_accessor(indices, component_type):
    flat = indices.reshape(-1)
    dtype = {5123: '<u2', 5125: '<u4'}[component_type]
    index = len(gltf['accessors'])
    gltf['accessors'].append({'bufferView': append_view(flat.astype(dtype).tobytes(), 34963),
                             'componentType': component_type, 'count': len(flat), 'type': 'SCALAR',
                             'min': [int(flat.min())], 'max': [int(flat.max())]})
    return index


separation = []
for mesh in gltf['meshes']:
    label = next((p for p in mesh['primitives']
                  if gltf['materials'][p['material']].get('name', '').endswith('_Approved_Label')), None)
    if label is None:
        continue
    body_primitive = next(p for p in mesh['primitives'] if p['material'] == body_id)
    assert label['attributes'] == body_primitive['attributes'], 'Existing body and front must share geometry/UVs'
    uv = accessor(label['attributes']['TEXCOORD_0'])
    front_faces = accessor(label['indices']).reshape(-1, 3)
    body_faces = accessor(body_primitive['indices']).reshape(-1, 3)
    face_uv = uv[front_faces]
    # Protect the full printed rectangle plus every triangle touching its boundary.
    # Front artwork uses a 2x U transform; the source geometry uses U=0..0.5.
    touches_label = ((face_uv[:, :, 0].max(1) >= .138 / 2)
                     & (face_uv[:, :, 0].min(1) <= .862 / 2)
                     & (face_uv[:, :, 1].min(1) <= .846))
    protected_faces = front_faces[touches_label]
    paper_faces = front_faces[~touches_label]
    assert len(protected_faces) and len(paper_faces), 'Separate printed artwork from unprinted body'
    component_type = gltf['accessors'][label['indices']]['componentType']
    label['indices'] = index_accessor(protected_faces, component_type)
    body_primitive['indices'] = index_accessor(np.concatenate((body_faces, paper_faces)), component_type)
    separation.append({'mesh': mesh['name'], 'labelTriangles': len(protected_faces),
                       'frontBodyTriangles': len(paper_faces), 'triangleCountUnchanged': True})
assert len(separation) == 3, 'Expected the current three-pouch scene'

# Original label maps/materials, vertex data, seals, props, and scene transforms stay verbatim.
for i, material in enumerate(original['materials']):
    if i != body_id:
        assert gltf['materials'][i] == material
assert gltf['nodes'] == original['nodes']
assert gltf['accessors'][:len(original['accessors'])] == original['accessors']
assert payloads[:len(original_payloads)] == original_payloads
label_checks = []
for i, material in enumerate(original['materials']):
    if not material.get('name', '').endswith('_Approved_Label'):
        continue
    image_id = original['textures'][material['pbrMetallicRoughness']['baseColorTexture']['index']]['source']
    image_view = original['images'][image_id]['bufferView']
    label_checks.append({'material': material['name'], 'materialUnchanged': True,
                         'textureSHA256': hashlib.sha256(payloads[image_view]).hexdigest(),
                         'textureBytesUnchanged': True})

parts, offset = [], 0
for view, payload in zip(gltf['bufferViews'], payloads):
    padding = -offset % 4
    parts.append(b'\0' * padding)
    offset += padding
    view['byteOffset'], view['byteLength'] = offset, len(payload)
    parts.append(payload)
    offset += len(payload)
packed_binary = b''.join(parts)
packed_binary += b'\0' * (-len(packed_binary) % 4)
gltf['buffers'][0]['byteLength'] = len(packed_binary)
encoded_json = json.dumps(gltf, separators=(',', ':')).encode()
encoded_json += b' ' * (-len(encoded_json) % 4)
size = 28 + len(encoded_json) + len(packed_binary)
destination.write_bytes(struct.pack('<4sII', b'glTF', 2, size)
                       + struct.pack('<I4s', len(encoded_json), b'JSON') + encoded_json
                       + struct.pack('<I4s', len(packed_binary), b'BIN\0') + packed_binary)

report = {'surface': 'ambientCG Paper002', 'sourceBytes': len(data), 'outputBytes': size,
          'sourceMeanRGB': color.mean((0, 1)).round(2).tolist(),
          'adjustedMeanRGB': off_white.mean((0, 1)).round(2).tolist(),
          'colorLiftSRGB': 18, 'desaturation': .25, 'normalScale': .18,
          'sourceMaps': {name: {'filename': path.name, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
                         for name, path in map_files.items()},
          'labelChecks': label_checks, 'materialSeparation': separation,
          'verticesNormalsUVsUnchanged': True, 'sceneAndPropsUnchanged': True,
          'sealMaterialUnchanged': True}
pathlib.Path(__file__).with_name('paper002-report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report, indent=2))
