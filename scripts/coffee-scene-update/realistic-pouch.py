"""Refine the existing pouch PBR maps; preserve label pixels and all geometry."""
import copy
import hashlib
import io
import json
import pathlib
import struct
import sys

import numpy as np
from PIL import Image, ImageFilter

source, destination = map(pathlib.Path, sys.argv[1:3])
data = source.read_bytes()
assert struct.unpack_from('<III', data) == (0x46546C67, 2, len(data)), 'Expected an intact glTF 2.0 binary'
json_size = struct.unpack_from('<I', data, 12)[0]
gltf = json.loads(data[20:20 + json_size])
original = copy.deepcopy(gltf)
binary = data[28 + json_size:]
payloads = [binary[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']]
            for v in gltf['bufferViews']]


def pixels(index):
    return np.array(Image.open(io.BytesIO(payloads[gltf['images'][index]['bufferView']])).convert('RGB'))


def png(array):
    stream = io.BytesIO()
    Image.fromarray(np.clip(np.rint(array), 0, 255).astype(np.uint8)).save(stream, format='PNG', optimize=True)
    return stream.getvalue()


def texture(array, sampler, name):
    view_id = len(gltf['bufferViews'])
    gltf['bufferViews'].append({'buffer': 0})
    payloads.append(png(array))
    image_id = len(gltf['images'])
    gltf['images'].append({'bufferView': view_id, 'mimeType': 'image/png', 'name': name})
    texture_id = len(gltf['textures'])
    gltf['textures'].append({'sampler': sampler, 'source': image_id})
    return texture_id


rng = np.random.default_rng(20261026)
orm = pixels(0).astype(float)
normal = pixels(2).astype(float)
height, width = orm.shape[:2]
grain = rng.normal(0, 1, (height, width))
cloud = np.array(Image.fromarray(np.uint8(rng.uniform(100, 156, (32, 32))))
                 .resize((width, height), Image.Resampling.BICUBIC).filter(ImageFilter.GaussianBlur(6)), dtype=float)
cloud = (cloud - cloud.mean()) / max(cloud.std(), 1)

# A soft laminate response, with fine grain rather than coarse cardboard fibers.
body_orm = orm.copy()
body_orm[:, :, 1] = 190 + cloud * 2.5 + grain * 1.1
body_orm[:, :, 2] = 0
dy, dx = np.gradient(grain)
body_normal = normal.copy()
body_normal[:, :, 0] = 128 + (normal[:, :, 0] - 128) * .3 + dx * 1.2
body_normal[:, :, 1] = 128 + (normal[:, :, 1] - 128) * .3 + dy * 1.2
body_normal[:, :, 2] = 255

# Base-color maps repeat twice in U; the original ORM/normal maps do not.
# Keep the whole printed rectangle, including the white label background, intact.
yy, xx = np.mgrid[:height, :width]
printed = ((xx + .5) / width * 2 >= .138) & ((xx + .5) / width * 2 <= .862) & ((yy + .5) / height <= .846)
front_orm = np.where(printed[:, :, None], orm, body_orm)
front_normal = np.where(printed[:, :, None], normal, body_normal)
assert np.array_equal(front_orm[printed], orm[printed])
assert np.array_equal(front_normal[printed], normal[printed])
sampler = gltf['textures'][0].get('sampler', 0)
body_roughness = texture(body_orm, sampler, 'Pouch_soft_laminate_ORM')
body_detail = texture(body_normal, sampler, 'Pouch_fine_surface_normal')
front_roughness = texture(front_orm, sampler, 'Pouch_front_ORM_label_preserved')
front_detail = texture(front_normal, sampler, 'Pouch_front_normal_label_preserved')

label_checks = []
for index in (1, 3, 4):
    before = pixels(index)
    h, w = before.shape[:2]
    y, x = np.mgrid[:h, :w]
    label = ((x + .5) / w >= .138) & ((x + .5) / w <= .862) & ((y + .5) / h <= .846)
    # Only the unprinted pouch border changes, with a barely perceptible warm cast.
    variation = np.array(Image.fromarray(np.uint8(np.clip(128 + cloud, 0, 255)))
                         .resize((w, h), Image.Resampling.BICUBIC), dtype=float) - 128
    after = before.astype(float) * np.array([232 / 238, 231 / 238, 228 / 239])
    after += variation[:, :, None] * .16
    after[label] = before[label]
    encoded = png(after)
    decoded = np.array(Image.open(io.BytesIO(encoded)).convert('RGB'))
    assert np.array_equal(decoded[label], before[label]), 'Printed label pixels must not change'
    label_checks.append({'image': index, 'unchangedPixels': int(label.sum()),
                         'sha256': hashlib.sha256(decoded[label].tobytes()).hexdigest()})
    image = gltf['images'][index]
    payloads[image['bufferView']] = encoded
    image['mimeType'] = 'image/png'


def srgb(value):
    value /= 255
    return value / 12.92 if value <= .04045 else ((value + .055) / 1.055) ** 2.4


for material in gltf['materials']:
    name = material.get('name', '')
    if name in ('White_flexible_laminate', 'Compressed_heat_seal'):
        pbr = material['pbrMetallicRoughness']
        pbr['baseColorFactor'] = [srgb(c) for c in (232, 231, 228)] + [1]
        pbr['metallicRoughnessTexture'] = {'index': body_roughness, 'texCoord': 0}
        pbr['roughnessFactor'] = 1 if name == 'White_flexible_laminate' else .92
        material['normalTexture'] = {'index': body_detail, 'texCoord': 0, 'scale': .28}
        material['extensions']['KHR_materials_specular']['specularFactor'] = .65
    elif name.endswith('_Approved_Label'):
        material['pbrMetallicRoughness']['metallicRoughnessTexture']['index'] = front_roughness
        material['normalTexture']['index'] = front_detail

# Repack existing buffer views verbatim; no vertex, UV, index, transform, or scene edit.
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
assert original['meshes'] == gltf['meshes']
assert original['nodes'] == gltf['nodes']
assert original['accessors'] == gltf['accessors']
for accessor in original['accessors']:
    view_id = accessor['bufferView']
    view = original['bufferViews'][view_id]
    start = view.get('byteOffset', 0)
    assert payloads[view_id] == binary[start:start + view['byteLength']], 'Geometry and UV bytes must remain intact'
for index, material in enumerate(original['materials']):
    if material['name'].endswith('_Approved_Label'):
        assert material['pbrMetallicRoughness']['baseColorTexture'] == gltf['materials'][index]['pbrMetallicRoughness']['baseColorTexture']
    elif material['name'] not in ('White_flexible_laminate', 'Compressed_heat_seal'):
        assert material == gltf['materials'][index], 'Do not modify props, floor, or lighting'
encoded_json = json.dumps(gltf, separators=(',', ':')).encode()
encoded_json += b' ' * (-len(encoded_json) % 4)
size = 28 + len(encoded_json) + len(packed_binary)
destination.write_bytes(struct.pack('<4sII', b'glTF', 2, size)
                       + struct.pack('<I4s', len(encoded_json), b'JSON') + encoded_json
                       + struct.pack('<I4s', len(packed_binary), b'BIN\0') + packed_binary)
report = {'sourceBytes': len(data), 'outputBytes': size, 'labelChecks': label_checks,
          'geometryAndUVsUnchanged': True, 'propsAndLightsUnchanged': True,
          'printedLabelPBRUnchanged': True, 'bodyColorSRGB': '#e8e7e4'}
pathlib.Path(__file__).with_name('pouch-material-report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report, indent=2))
