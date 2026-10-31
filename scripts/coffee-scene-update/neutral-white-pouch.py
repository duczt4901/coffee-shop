"""Refine the existing white laminate; preserve artwork, geometry and placement.

Usage: python neutral-white-pouch.py before.glb candidate.glb report.json
"""
import copy
import hashlib
import io
import json
from pathlib import Path
import struct
import sys

import numpy as np
from PIL import Image


def main():
    source, destination, report_path = map(Path, sys.argv[1:4])
    assert source.resolve() != destination.resolve()
    data = source.read_bytes()
    assert struct.unpack_from('<III', data) == (0x46546C67, 2, len(data))
    json_size = struct.unpack_from('<I', data, 12)[0]
    gltf = json.loads(data[20:20+json_size])
    original = copy.deepcopy(gltf)
    binary = data[28+json_size:]
    payloads = [binary[v.get('byteOffset', 0):v.get('byteOffset', 0)+v['byteLength']] for v in gltf['bufferViews']]
    body = next(m for m in gltf['materials'] if m['name'] == 'White_flexible_laminate')
    image_id = gltf['textures'][body['pbrMetallicRoughness']['baseColorTexture']['index']]['source']
    view_id = gltf['images'][image_id]['bufferView']
    pixels = np.asarray(Image.open(io.BytesIO(payloads[view_id])).convert('RGB')).astype(float)
    luma = pixels @ np.array([.2126, .7152, .0722])
    # Keep paper variation, but remove the warm flecks and high-contrast fibers.
    neutral = 243+(luma-luma.mean())*.45
    result = neutral[:, :, None] + (pixels-luma[:, :, None])*.12 + np.array([.35, .2, 0])
    result = np.clip(np.rint(result), 0, 255).astype('uint8')
    encoded_image = io.BytesIO()
    Image.fromarray(result).save(encoded_image, format='JPEG', quality=94, subsampling=0, optimize=True)
    payloads[view_id] = encoded_image.getvalue()
    result = np.asarray(Image.open(io.BytesIO(payloads[view_id])).convert('RGB'))
    gltf['images'][image_id]['mimeType'] = 'image/jpeg'
    gltf['images'][image_id]['name'] = 'Paper002_neutral_white_fine_laminate'
    edited_materials = []
    for i, material in enumerate(gltf['materials']):
        name = material.get('name', '')
        if name == 'White_flexible_laminate':
            material['pbrMetallicRoughness']['roughnessFactor'] = .70
            material['normalTexture']['scale'] = .10
            material['extensions']['KHR_materials_specular']['specularFactor'] = .75
            material['extras'] = {**material.get('extras', {}), 'surfaceRevision': 'Neutral white satin; reduced paper contrast; original artwork separate'}
        elif name == 'Compressed_heat_seal':
            def linear(v):
                v /= 255
                return v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4
            material['pbrMetallicRoughness']['baseColorFactor'] = [linear(v) for v in [246, 246, 244]]+[1]
            material['normalTexture']['scale'] = .12
        elif name.endswith('_Approved_Label'):
            material['normalTexture']['scale'] = .12
            material['extensions']['KHR_materials_specular']['specularFactor'] = .75
            assert material['pbrMetallicRoughness']['baseColorTexture'] == original['materials'][i]['pbrMetallicRoughness']['baseColorTexture']
        else:
            continue
        if 'occlusionTexture' in material:
            material['occlusionTexture']['strength'] = .4
        edited_materials.append(name)
    for key in ['nodes', 'meshes', 'accessors', 'scenes', 'textures', 'samplers', 'extensionsUsed', 'extensionsRequired']:
        assert gltf.get(key) == original.get(key), key
    for i, material in enumerate(original['materials']):
        if material['name'] not in edited_materials:
            assert gltf['materials'][i] == material
    for index, payload in enumerate(payloads):
        if index == view_id:
            continue
        view = original['bufferViews'][index]
        assert payload == binary[view.get('byteOffset', 0):view.get('byteOffset', 0)+view['byteLength']]
    parts, offset = [], 0
    for view, payload in zip(gltf['bufferViews'], payloads):
        padding = -offset%4
        parts.append(b'\0'*padding); offset += padding
        view.update(byteOffset=offset, byteLength=len(payload))
        parts.append(payload); offset += len(payload)
    packed = b''.join(parts); packed += b'\0'*(-len(packed)%4)
    gltf['buffers'][0]['byteLength'] = len(packed)
    encoded = json.dumps(gltf, separators=(',', ':')).encode(); encoded += b' '*(-len(encoded)%4)
    output = struct.pack('<4sII', b'glTF', 2, 28+len(encoded)+len(packed))+struct.pack('<I4s', len(encoded), b'JSON')+encoded+struct.pack('<I4s', len(packed), b'BIN\0')+packed
    destination.write_bytes(output)
    label_hashes = []
    for material in original['materials']:
        if material.get('name', '').endswith('_Approved_Label'):
            texture = material['pbrMetallicRoughness']['baseColorTexture']['index']
            image = original['textures'][texture]['source']
            label_view = original['images'][image]['bufferView']
            label_hashes.append({'material': material['name'], 'baseColorSHA256': hashlib.sha256(payloads[label_view]).hexdigest(), 'bytesUnchanged': True})
    report = {'sourceSHA256': hashlib.sha256(data).hexdigest(), 'outputSHA256': hashlib.sha256(output).hexdigest(),
              'inputBytes': len(data), 'outputBytes': len(output), 'bodyMeanRGBBefore': pixels.mean((0, 1)).round(2).tolist(),
              'bodyMeanRGBAfter': result.mean((0, 1)).round(2).tolist(), 'bodyColorContrastScale': .45,
              'bodyColorEncoding': 'JPEG quality 94, no chroma subsampling',
              'bodyNormalStrength': .10, 'bodyRoughnessFactor': .70, 'labelNormalStrength': .12,
              'editedMaterials': edited_materials, 'labelArtwork': label_hashes,
              'allGeometryUVNormalsAndInstancesByteIdentical': True, 'allOtherImagesByteIdentical': True,
              'geometryTransformsAndTextureCountsUnchanged': True}
    report_path.write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
