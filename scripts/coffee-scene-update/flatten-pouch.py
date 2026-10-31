"""Press pouch borders and tune the existing laminate, retaining UVs and artwork.

Usage: python flatten-pouch.py before.glb candidate.glb report.json
Always rebuild from the unchanged input, rather than flattening a previous result.
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


def main():
    source, destination, report_path = map(Path, sys.argv[1:4])
    assert source.resolve() != destination.resolve()
    gltf, binary, original_data = io.load(source)
    original = copy.deepcopy(gltf)
    original_binary = bytes(binary)
    bags = [mesh for mesh in gltf['meshes'] if mesh.get('name', '').startswith('Bag_')]
    attributes = bags[0]['primitives'][0]['attributes']
    assert len(bags) == 3
    assert all(primitive['attributes'] == attributes for bag in bags for primitive in bag['primitives'])
    before = io.read(gltf, binary, attributes['POSITION']).astype(float)
    faces = np.concatenate([io.read(gltf, binary, p['indices']).reshape(-1, 3) for p in bags[0]['primitives']]).astype(int)
    after = before.copy()
    depth, height, width = before.T
    # Local +X faces forward; Z runs across the bag. Keep a thin, closed flange.
    side_scale = .035 + .965 * (1 - io.ramp(.77, .91, np.abs(width)))
    bottom_scale = .035 + .965 * io.ramp(.07, .26, height)
    top_scale = .35 + .65 * (1 - io.ramp(3.18, 3.31, height))
    compression = np.minimum(np.minimum(side_scale, bottom_scale), top_scale)
    fold_band = np.exp(-((np.abs(width) - .835) / .085) ** 2)
    fold_band *= io.ramp(.15, .35, height) * (1 - io.ramp(3.05, 3.28, height))
    compression *= 1 + fold_band * (.09 * np.sin(height * 17 + width * 4) + .045 * np.sin(height * 29 - width * 7))
    after[:, 0] = .0212 + (depth - .0212) * compression
    # Round the sealed corners without changing the overall height or label UVs.
    corner = io.ramp(.90, 1.01, np.abs(width))
    after[:, 1] -= .075 * corner * io.ramp(height.max() - .14, height.max(), height)
    after[:, 1] += .035 * corner * (1 - io.ramp(0, .08, height))
    after = after.astype('<f4')
    face_normals = io.triangle_normals(after.astype(float), faces)
    assert np.linalg.norm(face_normals, axis=1).min() > 1e-12
    normals = np.zeros(after.shape, dtype=float)
    for corner_index in range(3):
        np.add.at(normals, faces[:, corner_index], face_normals)
    normals /= np.linalg.norm(normals, axis=1, keepdims=True)
    assert np.isfinite(after).all() and np.isfinite(normals).all()
    io.write(gltf, binary, attributes['POSITION'], after)
    io.write(gltf, binary, attributes['NORMAL'], normals)

    edited_materials = []
    for material in gltf['materials']:
        name = material.get('name', '')
        if name not in ('White_flexible_laminate', 'Compressed_heat_seal') and not name.endswith('_Approved_Label'):
            continue
        pbr = material['pbrMetallicRoughness']
        # The visible coating is a dielectric laminate, with no exposed metal.
        pbr['metallicFactor'] = 0
        if name == 'White_flexible_laminate':
            pbr['baseColorFactor'] = [.86, .875, .89, 1]
            pbr['roughnessFactor'] = .90
            material['normalTexture']['scale'] = .08
            material['extras'] = {**material.get('extras', {}), 'surfaceRevision': 'Cool off-white matte laminate with compressed borders'}
        elif name == 'Compressed_heat_seal':
            pbr['baseColorFactor'] = [.80, .815, .83, 1]
            pbr['roughnessFactor'] = .95
            material['normalTexture']['scale'] = .08
        else:
            pbr['baseColorFactor'] = [.94, .945, .95, 1]
            pbr['roughnessFactor'] = .95
            material['normalTexture']['scale'] = .10
        material['extensions']['KHR_materials_specular']['specularFactor'] = .55
        edited_materials.append(name)

    # Only the shared pouch positions/normals and five surface definitions change.
    changed_views = {gltf['accessors'][attributes[key]]['bufferView'] for key in ('POSITION', 'NORMAL')}
    assert len(changed_views) == 2
    for index, view in enumerate(gltf['bufferViews']):
        if index not in changed_views:
            start, length = view.get('byteOffset', 0), view['byteLength']
            assert binary[start:start + length] == original_binary[start:start + length], index
    for key in ('nodes', 'meshes', 'textures', 'images', 'samplers', 'scenes', 'extensionsUsed', 'extensionsRequired'):
        assert gltf.get(key) == original.get(key), key
    for old, new in zip(original['materials'], gltf['materials']):
        if old.get('name') not in edited_materials:
            assert old == new
    for image in gltf['images']:
        view = gltf['bufferViews'][image['bufferView']]
        start, length = view.get('byteOffset', 0), view['byteLength']
        assert binary[start:start + length] == original_binary[start:start + length]
    stats = io.stats(after.astype(float), faces)
    assert stats['boundaryEdges'] == stats['nonManifoldEdges'] == stats['degenerateTriangles'] == 0
    assert np.allclose(before[:, 1].min(), after[:, 1].min())
    assert np.allclose(before[:, 1].max(), after[:, 1].max())
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
        'sideAndBottomDepthScale': .035,
        'geometry': stats, 'editedMaterials': edited_materials,
        'allArtworkAndTextureBytesPreserved': True,
        'allUVsIndicesAndNonPouchGeometryPreserved': True,
        'allTransformsInstancesAndCameraFramingPreserved': True,
    }
    report_path.write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
