import hashlib
import collections
import io
import json
import pathlib
import struct
import sys
from PIL import Image, ImageChops, ImageStat

def read_glb(filename):
    data = pathlib.Path(filename).read_bytes()
    assert struct.unpack_from('<III', data) == (0x46546c67, 2, len(data))
    size = struct.unpack_from('<I', data, 12)[0]
    return json.loads(data[20:20+size]), data[28+size:]

before, before_bin = read_glb(sys.argv[1])
after, after_bin = read_glb(sys.argv[2])
def accessor(gltf, binary, index):
    a = gltf['accessors'][index]
    v = gltf['bufferViews'][a['bufferView']]
    start = v.get('byteOffset', 0) + a.get('byteOffset', 0)
    components = {'VEC2': 2, 'VEC3': 3, 'SCALAR': 1}[a['type']]
    width = {5123: 2, 5125: 4, 5126: 4}[a['componentType']] * components
    stride = v.get('byteStride', width)
    return b''.join(binary[start+i*stride:start+i*stride+width] for i in range(a['count']))

for key in ('POSITION', 'NORMAL', 'TEXCOORD_0'):
    assert accessor(before, before_bin, before['meshes'][0]['primitives'][0]['attributes'][key]) == accessor(after, after_bin, after['meshes'][0]['primitives'][0]['attributes'][key]), key
def triangle_indices(gltf, binary, primitive):
    a = gltf['accessors'][primitive['indices']]
    indices = struct.unpack('<' + ('H' if a['componentType'] == 5123 else 'I') * a['count'], accessor(gltf, binary, primitive['indices']))
    return list(zip(indices[0::3], indices[1::3], indices[2::3]))

# Paper body faces can move between material groups without changing the surface.
old_faces = [face for mesh in before['meshes'][:3] for face in triangle_indices(before, before_bin, mesh['primitives'][0])]
new_faces = [face for primitive in after['meshes'][0]['primitives'] for face in triangle_indices(after, after_bin, primitive)]
assert collections.Counter(old_faces) == collections.Counter(new_faces), 'Preserve every original triangle and winding'
assert len(after['images']) >= 17
for a in after['accessors']:
    v = after['bufferViews'][a['bufferView']]
    assert v.get('byteOffset', 0) + v['byteLength'] <= len(after_bin)
for img in after['images']:
    assert img['mimeType'] in ('image/png', 'image/jpeg') and 'uri' not in img
assert set(after['extensionsUsed']) == set(before['extensionsUsed'])

labels = []
for index in (1, 3, 4):
    def image(gltf, binary):
        v = gltf['bufferViews'][gltf['images'][index]['bufferView']]
        start = v.get('byteOffset', 0)
        return Image.open(io.BytesIO(binary[start:start+v['byteLength']])).convert('RGB')
    a, b = image(before, before_bin), image(after, after_bin)
    assert a.size == b.size == (1024, 2048)
    # Body laminate may change; compare the entire original printed label rectangle.
    label_box = (142, 0, 883, 1733)
    rms = ImageStat.Stat(ImageChops.difference(a.crop(label_box), b.crop(label_box))).rms
    assert max(rms) < 3, rms
    labels.append({'index': index, 'sizeUnchanged': True, 'channelRMSError': rms})
bags = [n for n in after['nodes'] if n.get('name', '').startswith('Bag_')]
assert [b['extras']['placementYawDegrees'] for b in bags] == [-16, 12, 4]
assert [b['extras'].get('wrinkleSeed') for b in bags] == [None, 7193, 2861]
fingerprints = [hashlib.sha256(accessor(after, after_bin, m['primitives'][0]['attributes']['POSITION'])).hexdigest() for m in after['meshes'][:3]]
assert len(set(fingerprints)) == 3
for mesh in after['meshes'][:3]:
    raw = accessor(after, after_bin, mesh['primitives'][0]['attributes']['POSITION'])
    positions = list(struct.iter_unpack('<fff', raw))
    # The master contains coincident zipper rings. Weld only for the closure
    # check (tolerance below 0.001mm in scene units); keep shading/UV seams intact.
    vertices = [tuple(round(v * 1e5) for v in point) for point in positions]
    edges = collections.Counter()
    for primitive in mesh['primitives']:
        a = after['accessors'][primitive['indices']]
        indices = struct.unpack('<' + ('H' if a['componentType'] == 5123 else 'I') * a['count'], accessor(after, after_bin, primitive['indices']))
        for ids in zip(indices[0::3], indices[1::3], indices[2::3]):
            points = [vertices[i] for i in ids]
            if len(set(points)) < 3:
                continue
            for x, y in [(0, 1), (1, 2), (2, 0)]:
                edges[tuple(sorted((points[x], points[y])))]+=1
    assert all(n != 1 for n in edges.values()), mesh['name']
report = {'orangeGeometryIdentical': True, 'independentPouchGeometries': True,
          'yawDegrees': [-16, 12, 4], 'labelDesignAndResolutionRetained': labels,
          'closedPouchSurfaces': True, 'embeddedTexturesOnly': True, 'noAdditionalRuntimeExtensions': True}
pathlib.Path('scripts/coffee-scene-update/structure-check.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report, indent=2))
