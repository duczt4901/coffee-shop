"""Reuse orange folds for all three pouches, retaining each label and placement.

Usage: python share-pouch-folds.py before.glb candidate.glb report.json
"""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import struct
import sys

import numpy as np

spec = importlib.util.spec_from_file_location('geometry_checks', Path(__file__).with_name('validate-refinement.py'))
checks = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checks)
io = checks.refine


def accessor_references(gltf):
    references = []
    for mesh in gltf['meshes']:
        for primitive in mesh['primitives']:
            references.append((primitive, 'indices'))
            references.extend((primitive['attributes'], key) for key in primitive['attributes'])
    for node in gltf['nodes']:
        attributes = node.get('extensions', {}).get('EXT_mesh_gpu_instancing', {}).get('attributes', {})
        references.extend((attributes, key) for key in attributes)
    return references


def bag_info(gltf, binary, name):
    mesh = next(m for m in gltf['meshes'] if m.get('name') == name)
    points = io.read(gltf, binary, mesh['primitives'][0]['attributes']['POSITION'])
    root = next(n for n in gltf['nodes'] if n.get('name') == name)
    matrix = np.asarray(root['matrix']).reshape(4, 4).T
    assert matrix[1, 0] == matrix[1, 2] == 0
    label = next(p for p in mesh['primitives'] if gltf['materials'][p['material']]['name'].endswith('_Approved_Label'))
    uv = io.read(gltf, binary, label['attributes']['TEXCOORD_0']).astype(float)
    triangles = uv[io.read(gltf, binary, label['indices']).reshape(-1, 3)]
    d, e = triangles[:, 1]-triangles[:, 0], triangles[:, 2]-triangles[:, 0]
    printed_uv = triangles.reshape(-1, 2)
    return {'vertices': len(points), 'triangles': sum(gltf['accessors'][p['indices']]['count']//3 for p in mesh['primitives']),
            'labelMaterial': label['material'], 'labelUVArea': float(np.abs(d[:, 0]*e[:, 1]-d[:, 1]*e[:, 0]).sum()/2),
            'labelUVBounds': [printed_uv.min(0).tolist(), printed_uv.max(0).tolist()],
            'localY': [float(points[:, 1].min()), float(points[:, 1].max())],
            'placementY': float(matrix[1, 3]), 'height': float(np.ptp(points[:, 1])*matrix[1, 1])}


def main():
    source, destination, report_path = map(Path, sys.argv[1:4])
    before, binary, original = io.load(source)
    gltf = copy.deepcopy(before)
    assert not gltf.get('animations') and not gltf.get('skins')
    template = next(m for m in gltf['meshes'] if m.get('name') == 'Bag_1kg_Orange')
    source_label = template['primitives'][0]['material']
    old_references = {container[key] for container, key in accessor_references(gltf)}
    names = ['Bag_1kg_Orange', 'Bag_500g_Blue', 'Bag_500g_Green']
    for name in names[1:]:
        target = next(m for m in gltf['meshes'] if m.get('name') == name)
        label = next(p['material'] for p in target['primitives'] if gltf['materials'][p['material']]['name'].endswith('_Approved_Label'))
        target['primitives'] = copy.deepcopy(template['primitives'])
        for primitive in target['primitives']:
            if primitive['material'] == source_label:
                primitive['material'] = label
    references = accessor_references(gltf)
    dead = old_references-{container[key] for container, key in references}
    dead_views = {gltf['accessors'][index]['bufferView'] for index in dead}
    accessor_map = {old: new for new, old in enumerate(i for i in range(len(gltf['accessors'])) if i not in dead)}
    for container, key in references:
        container[key] = accessor_map[container[key]]
    gltf['accessors'] = [a for i, a in enumerate(gltf['accessors']) if i not in dead]
    live_views = {a['bufferView'] for a in gltf['accessors']} | {image['bufferView'] for image in gltf['images']}
    dead_views -= live_views
    view_map = {old: new for new, old in enumerate(i for i in range(len(gltf['bufferViews'])) if i not in dead_views)}
    parts, offset = [], 0
    for i, view in enumerate(gltf['bufferViews']):
        if i in dead_views:
            continue
        padding = -offset%4
        parts.append(b'\0'*padding); offset += padding
        start = view.get('byteOffset', 0)
        parts.append(binary[start:start+view['byteLength']])
        view['byteOffset'] = offset; offset += view['byteLength']
    gltf['bufferViews'] = [v for i, v in enumerate(gltf['bufferViews']) if i not in dead_views]
    for item in gltf['accessors']+gltf['images']:
        item['bufferView'] = view_map[item['bufferView']]
    packed = b''.join(parts); packed += b'\0'*(-len(packed)%4)
    gltf['buffers'][0]['byteLength'] = len(packed)
    for key in ('materials', 'textures', 'samplers', 'scenes', 'extensionsUsed', 'extensionsRequired', 'extensions'):
        assert before.get(key) == gltf.get(key), key
    assert checks.image_hashes(before, binary) == checks.image_hashes(gltf, packed)
    # Accessor renumbering may change instancing references, never placements or data.
    expected_nodes = copy.deepcopy(before['nodes'])
    for node in expected_nodes:
        attributes = node.get('extensions', {}).get('EXT_mesh_gpu_instancing', {}).get('attributes', {})
        for key in attributes:
            attributes[key] = accessor_map[attributes[key]]
    assert expected_nodes == gltf['nodes']
    for old_mesh, new_mesh in zip(before['meshes'], gltf['meshes']):
        if old_mesh.get('name') in names[1:]:
            continue
        for old_p, new_p in zip(old_mesh['primitives'], new_mesh['primitives']):
            assert old_p['material'] == new_p['material']
            for key, old_index in old_p['attributes'].items():
                assert checks.accessor_bytes(before, binary, old_index) == checks.accessor_bytes(gltf, packed, new_p['attributes'][key])
            assert checks.accessor_bytes(before, binary, old_p['indices']) == checks.accessor_bytes(gltf, packed, new_p['indices'])
    old_info = {name: bag_info(before, binary, name) for name in names}
    new_info = {name: bag_info(gltf, packed, name) for name in names}
    for name in names:
        for key in ('localY', 'placementY', 'height', 'labelMaterial'):
            assert old_info[name][key] == new_info[name][key], (name, key)
        assert np.allclose(old_info[name]['labelUVBounds'], new_info[name]['labelUVBounds'], atol=1e-7, rtol=0)
        # Summing thousands of float32 UV triangles introduces small boundary-area roundoff.
        assert abs(old_info[name]['labelUVArea']-new_info[name]['labelUVArea']) < 1e-5
    bags = [next(m for m in gltf['meshes'] if m.get('name') == name) for name in names]
    for bag in bags[1:]:
        for a, b in zip(bags[0]['primitives'], bag['primitives']):
            assert a['attributes'] == b['attributes'] and a['indices'] == b['indices']
    encoded = json.dumps(gltf, separators=(',', ':')).encode(); encoded += b' '*(-len(encoded)%4)
    data = struct.pack('<4sII', b'glTF', 2, 28+len(encoded)+len(packed))+struct.pack('<I4s', len(encoded), b'JSON')+encoded+struct.pack('<I4s', len(packed), b'BIN\0')+packed
    destination.write_bytes(data)
    report = {'sourceSHA256': hashlib.sha256(original).hexdigest(), 'outputSHA256': hashlib.sha256(data).hexdigest(),
              'inputBytes': len(original), 'outputBytes': len(data), 'before': old_info, 'after': new_info,
              'sharedGeometry': True, 'materialsAndImagesPreserved': True, 'placementsAndHeightsPreserved': True,
              'nonBagAndOrangeGeometryByteIdentical': True, 'removedUnusedAccessors': len(dead), 'removedUnusedBufferViews': len(dead_views)}
    report_path.write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
