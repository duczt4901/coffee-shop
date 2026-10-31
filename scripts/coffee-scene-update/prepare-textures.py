"""Compress embedded PBR maps according to their on-screen use; preserve label layout."""
import io
import json
import pathlib
import struct
import sys
from PIL import Image

source, output = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
output.mkdir(parents=True, exist_ok=True)
data = source.read_bytes()
json_size = struct.unpack_from('<I', data, 12)[0]
gltf = json.loads(data[20:20 + json_size])
binary = data[28 + json_size:]
report = []
for index, image in enumerate(gltf['images']):
    view = gltf['bufferViews'][image['bufferView']]
    start = view.get('byteOffset', 0)
    original = binary[start:start + view['byteLength']]
    pixels = Image.open(io.BytesIO(original))
    if 'A' in pixels.getbands():
        assert pixels.getchannel('A').getextrema() == (255, 255), 'Do not discard real transparency'
    pixels = pixels.convert('RGB')
    before_size = pixels.size
    label = index in (1, 3, 4)
    bean_color = index in (6, 9, 12, 15)
    if index >= 5:
        maximum = 512 if bean_color else 256
        pixels.thumbnail((maximum, maximum), Image.Resampling.LANCZOS)
    extension = 'jpg' if label or bean_color else 'png'
    destination = output / f'{index}.{extension}'
    if extension == 'jpg':
        pixels.save(destination, quality=96 if label else 90, subsampling=0, optimize=True)
    else:
        pixels.save(destination, optimize=True)
    report.append({'index': index, 'file': destination.name, 'mimeType': 'image/jpeg' if extension == 'jpg' else 'image/png',
                   'beforeBytes': len(original), 'bytes': destination.stat().st_size,
                   'beforeSize': before_size, 'size': pixels.size,
                   'role': 'label (original resolution)' if label else 'bean map' if index >= 5 else 'pouch PBR map'})
(output / 'report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps({'textureBytesBefore': sum(x['beforeBytes'] for x in report), 'textureBytesAfter': sum(x['bytes'] for x in report)}, indent=2))
