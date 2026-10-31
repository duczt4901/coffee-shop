import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { MeshoptSimplifier } from 'three/addons/libs/meshopt_simplifier.module.js';

const [source, destination, reportFile] = process.argv.slice(2);
assert(source && destination && reportFile, 'Usage: node reduce-orange.mjs before.glb candidate.glb report.json');
assert(source !== destination);
const input = fs.readFileSync(source), jsonLength = input.readUInt32LE(12);
const gltf = JSON.parse(input.subarray(20, 20 + jsonLength));
const original = structuredClone(gltf), binary = input.subarray(28 + jsonLength);
const payloads = gltf.bufferViews.map(v => Buffer.from(binary.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength)));
const sizes = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
const types = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array };
function read(index) {
  const a = original.accessors[index], v = original.bufferViews[a.bufferView], Type = types[a.componentType];
  assert(Type && !a.sparse);
  const size = sizes[a.type], width = size * Type.BYTES_PER_ELEMENT, output = new Type(a.count * size);
  const start = (v.byteOffset || 0) + (a.byteOffset || 0);
  for (let i = 0; i < a.count; i++) new Uint8Array(output.buffer, i * width, width).set(binary.subarray(start + i * (v.byteStride || width), start + i * (v.byteStride || width) + width));
  return output;
}
function replace(index, values, componentType) {
  const a = gltf.accessors[index], size = sizes[a.type];
  assert.equal(original.accessors.filter(x => x.bufferView === a.bufferView).length, 1, 'Replace dedicated views only');
  payloads[a.bufferView] = Buffer.from(values.buffer, values.byteOffset, values.byteLength);
  a.componentType = componentType; a.count = values.length / size; a.byteOffset = 0;
  const min = Array(size).fill(Infinity), max = Array(size).fill(-Infinity);
  values.forEach((value, i) => { min[i % size] = Math.min(min[i % size], value); max[i % size] = Math.max(max[i % size], value); });
  a.min = min; a.max = max;
  delete gltf.bufferViews[a.bufferView].byteStride;
}
const mesh = gltf.meshes.find(m => m.name === 'Bag_1kg_Orange');
assert(mesh && mesh.primitives.length === 3);
const attrs = mesh.primitives[0].attributes;
assert(mesh.primitives.every(p => JSON.stringify(p.attributes) === JSON.stringify(attrs)));
const positions = read(attrs.POSITION), normals = read(attrs.NORMAL), uv = read(attrs.TEXCOORD_0);
const attributes = new Float32Array(positions.length / 3 * 5);
for (let i = 0; i < positions.length / 3; i++) attributes.set([...normals.subarray(i*3, i*3+3), ...uv.subarray(i*2, i*2+2)], i*5);
const locks = new Uint8Array(positions.length / 3);
for (let axis = 0; axis < 3; axis++) {
  let lo = 0, hi = 0;
  for (let i = 1; i < locks.length; i++) { if (positions[i*3+axis] < positions[lo*3+axis]) lo = i; if (positions[i*3+axis] > positions[hi*3+axis]) hi = i; }
  locks[lo] = locks[hi] = 1;
}
await MeshoptSimplifier.ready;
const report = { sourceSHA256: crypto.createHash('sha256').update(input).digest('hex'), mesh: mesh.name,
  beforeVertices: positions.length / 3, beforeTriangles: 0, primitives: [], targetRatio: 1/3,
  method: 'Existing meshoptimizer; preserve material/seam borders, imported normals and UV attributes; compact kept vertices.' };
const simplified = mesh.primitives.map(p => {
  const indices = Uint32Array.from(read(p.indices)), before = indices.length / 3;
  report.beforeTriangles += before;
  const target = Math.round(before / 3) * 3;
  let result, error;
  for (const tolerance of [.0005, .001, .002, .004, .008]) {
    [result, error] = MeshoptSimplifier.simplifyWithAttributes(indices, positions, 3, attributes, 5,
      [.2, .2, .2, .6, .6], locks, target, tolerance, ['LockBorder']);
    if (result.length <= target * 1.015) break;
  }
  report.primitives.push({ material: gltf.materials[p.material].name, beforeTriangles: before,
    afterTriangles: result.length / 3, achievedRelativeError: error });
  return result;
});
const all = Uint32Array.from(simplified.flatMap(a => Array.from(a)));
const [remap, count] = MeshoptSimplifier.compactMesh(all);
function compact(values, size) {
  const output = new Float32Array(count * size);
  for (let i = 0; i < remap.length; i++) if (remap[i] !== 0xffffffff) output.set(values.subarray(i*size, i*size+size), remap[i]*size);
  return output;
}
replace(attrs.POSITION, compact(positions, 3), 5126);
replace(attrs.NORMAL, compact(normals, 3), 5126);
replace(attrs.TEXCOORD_0, compact(uv, 2), 5126);
let cursor = 0;
mesh.primitives.forEach((p, i) => {
  const result = all.subarray(cursor, cursor + simplified[i].length); cursor += result.length;
  assert(count < 65536);
  replace(p.indices, Uint16Array.from(result), 5123);
});
report.afterTriangles = all.length / 3; report.afterVertices = count;
report.retainedTriangleRatio = report.afterTriangles / report.beforeTriangles;
assert(report.retainedTriangleRatio > .30 && report.retainedTriangleRatio < .38, 'Stay close to one-third without excessive error');
const outputPositions = compact(positions, 3);
for (let axis = 0; axis < 3; axis++) {
  const beforeAxis = Array.from(positions).filter((_, i) => i%3 === axis), afterAxis = Array.from(outputPositions).filter((_, i) => i%3 === axis);
  assert.equal(Math.min(...beforeAxis), Math.min(...afterAxis)); assert.equal(Math.max(...beforeAxis), Math.max(...afterAxis));
}
for (const key of ['materials', 'nodes', 'scenes', 'images', 'textures', 'samplers']) assert.deepEqual(gltf[key], original[key]);
const parts = []; let offset = 0;
gltf.bufferViews.forEach((v, i) => { const padding = (-offset) & 3; parts.push(Buffer.alloc(padding)); offset += padding;
  v.byteOffset = offset; v.byteLength = payloads[i].length; parts.push(payloads[i]); offset += payloads[i].length; });
parts.push(Buffer.alloc((-offset) & 3));
const packed = Buffer.concat(parts); gltf.buffers[0].byteLength = packed.length;
const encoded = Buffer.from(JSON.stringify(gltf)), json = Buffer.concat([encoded, Buffer.alloc((-encoded.length) & 3, 32)]);
const header = Buffer.alloc(12), jh = Buffer.alloc(8), bh = Buffer.alloc(8);
header.writeUInt32LE(0x46546c67); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + json.length + packed.length, 8);
jh.writeUInt32LE(json.length); jh.writeUInt32LE(0x4e4f534a, 4); bh.writeUInt32LE(packed.length); bh.writeUInt32LE(0x004e4942, 4);
const output = Buffer.concat([header, jh, json, bh, packed]); fs.writeFileSync(destination, output);
report.inputBytes = input.length; report.outputBytes = output.length; report.outputSHA256 = crypto.createHash('sha256').update(output).digest('hex');
report.materialsAndImagesUnchanged = true; report.otherBagsAndPropsUnchanged = true; report.additionalDrawCalls = 0;
fs.writeFileSync(reportFile, JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2));
