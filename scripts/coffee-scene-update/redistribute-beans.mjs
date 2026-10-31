import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import * as THREE from 'three';

const [source, destination, reportFile, seedArgument] = process.argv.slice(2);
assert(source && destination && reportFile && source !== destination,
  'Usage: node redistribute-beans.mjs before.glb after.glb report.json [seed]');
const input = fs.readFileSync(source), jsonLength = input.readUInt32LE(12);
const gltf = JSON.parse(input.subarray(20, 20 + jsonLength));
const original = structuredClone(gltf), binary = input.subarray(28 + jsonLength);
const seed = seedArgument === undefined ? crypto.randomInt(0, 2 ** 32) : Number(seedArgument);
assert(Number.isInteger(seed) && seed >= 0 && seed < 2 ** 32);
let state = seed;
const random = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 2 ** 32);
const vector = values => new THREE.Vector3().fromArray(values);
function read(index) {
  const a = original.accessors[index], view = original.bufferViews[a.bufferView];
  assert.equal(a.componentType, 5126);
  assert(!a.sparse);
  const size = a.type === 'VEC4' ? 4 : 3, start = (view.byteOffset || 0) + (a.byteOffset || 0);
  return Array.from({ length: a.count }, (_, i) => Array.from({ length: size }, (_, k) =>
    binary.readFloatLE(start + i * (view.byteStride || size * 4) + k * 4)));
}
const worlds = new Map();
function visit(index, parent = new THREE.Matrix4()) {
  const node = original.nodes[index];
  const local = node.matrix ? new THREE.Matrix4().fromArray(node.matrix) : new THREE.Matrix4().compose(
    vector(node.translation || [0, 0, 0]), new THREE.Quaternion().fromArray(node.rotation || [0, 0, 0, 1]), vector(node.scale || [1, 1, 1]));
  const world = parent.clone().multiply(local);
  worlds.set(index, world);
  for (const child of node.children || []) visit(child, world);
}
for (const root of original.scenes[original.scene || 0].nodes) visit(root);
function meshBox(index) {
  const box = new THREE.Box3();
  for (const primitive of original.meshes[index].primitives) {
    const a = original.accessors[primitive.attributes.POSITION];
    box.union(new THREE.Box3(vector(a.min), vector(a.max)));
  }
  return box;
}
const beans = [], solidBoxes = [], productBox = new THREE.Box3();
const productId = original.nodes.findIndex(n => n.name === 'Product_Display');
const groundId = original.nodes.findIndex(n => n.name === 'Beans_Ground');
const floatingId = original.nodes.findIndex(n => n.name === 'Beans_Floating');
assert(productId >= 0 && groundId >= 0 && floatingId >= 0);
function collect(index) {
  const node = original.nodes[index];
  if (node.mesh !== undefined) {
    const geometry = meshBox(node.mesh), attrs = node.extensions?.EXT_mesh_gpu_instancing?.attributes;
    if (attrs) {
      const positions = read(attrs.TRANSLATION), rotations = read(attrs.ROTATION), scales = read(attrs.SCALE);
      positions.forEach((position, i) => {
        const matrix = new THREE.Matrix4().compose(vector(position), new THREE.Quaternion().fromArray(rotations[i]), vector(scales[i]));
        const box = geometry.clone().applyMatrix4(matrix).applyMatrix4(worlds.get(index));
        productBox.union(box);
        if (node.extras?.role === 'floating_beans') beans.push({ nodeId: index, position: vector(position).applyMatrix4(worlds.get(index)), scale: scales[i], box });
      });
    } else {
      const box = geometry.applyMatrix4(worlds.get(index));
      productBox.union(box);
      solidBoxes.push(box);
    }
  }
  for (const child of node.children || []) collect(child);
}
collect(productId);
assert.equal(beans.length, 16, 'Start from the original 16 floating beans');
const groundCount = original.nodes[groundId].children.reduce((sum, id) =>
  sum + original.accessors[original.nodes[id].extensions.EXT_mesh_gpu_instancing.attributes.TRANSLATION].count, 0);
assert.equal(groundCount, 28);
const solidBox = new THREE.Box3();
solidBoxes.forEach(box => solidBox.union(box));
const center = solidBox.getCenter(new THREE.Vector3());
const limits = new THREE.Box3().setFromPoints(beans.map(bean => bean.position));
const distances = beans.map(bean => bean.position.distanceTo(center));
const near = Math.min(...distances), far = Math.max(...distances);
// Preserve the old depth envelope throughout the existing two-axis camera path.
const depthLimits = Array.from({ length: 9 }, (_, i) => {
  const progress = i / 8;
  const direction = new THREE.Vector3().setFromSphericalCoords(1,
    Math.PI / 2 - THREE.MathUtils.degToRad(30 - 45 * progress), THREE.MathUtils.degToRad(20 - 40 * progress));
  const depths = beans.map(bean => bean.position.dot(direction));
  return { direction, min: Math.min(...depths), max: Math.max(...depths) };
});
const additions = [], existing = [...beans];
for (let attempt = 0; additions.length < 10 && attempt < 100000; attempt++) {
  const template = beans[Math.floor(random() * beans.length)];
  const position = new THREE.Vector3(...['x', 'y', 'z'].map(axis =>
    Math.fround(THREE.MathUtils.lerp(limits.min[axis], limits.max[axis], random()))));
  const distance = position.distanceTo(center);
  if (distance < near || distance > far || depthLimits.some(limit => {
    const depth = position.dot(limit.direction);
    return depth < limit.min || depth > limit.max;
  })) continue;
  const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(random() * Math.PI * 2, random() * Math.PI * 2, random() * Math.PI * 2));
  const localPosition = position.clone().applyMatrix4(worlds.get(template.nodeId).clone().invert());
  const rotation = quaternion.toArray().map(Math.fround);
  const matrix = new THREE.Matrix4().compose(localPosition, new THREE.Quaternion().fromArray(rotation), vector(template.scale));
  const box = meshBox(original.nodes[template.nodeId].mesh).applyMatrix4(matrix).applyMatrix4(worlds.get(template.nodeId));
  if (!productBox.containsBox(box) || solidBoxes.some(solid => solid.intersectsBox(box)) || existing.some(bean => bean.box.intersectsBox(box))) continue;
  const bean = { ...template, position, rotation, localPosition: localPosition.toArray(), box };
  additions.push(bean);
  existing.push(bean);
}
assert.equal(additions.length, 10, 'Ten separate airborne beans must fit inside the original limits');

// Retain the measured framing after removing ground decoration from the asset.
gltf.nodes[productId].extras = { ...gltf.nodes[productId].extras, framingBounds: { min: productBox.min.toArray(), max: productBox.max.toArray() } };
const removed = new Set([groundId, ...original.nodes[groundId].children]);
assert(!gltf.animations && !gltf.skins, 'Node remapping assumes this static product asset');
const nodeMap = new Map();
gltf.nodes.forEach((_, index) => { if (!removed.has(index)) nodeMap.set(index, nodeMap.size); });
gltf.nodes = gltf.nodes.filter((_, index) => !removed.has(index));
for (const node of gltf.nodes) if (node.children) node.children = node.children.filter(id => !removed.has(id)).map(id => nodeMap.get(id));
for (const scene of gltf.scenes) scene.nodes = scene.nodes.map(id => nodeMap.get(id));

const parts = [binary];
let offset = binary.length;
for (const nodeId of original.nodes[floatingId].children) {
  const node = gltf.nodes[nodeMap.get(nodeId)], attrs = node.extensions.EXT_mesh_gpu_instancing.attributes;
  const added = additions.filter(bean => bean.nodeId === nodeId);
  if (!added.length) continue;
  for (const [key, field] of [['TRANSLATION', 'localPosition'], ['ROTATION', 'rotation'], ['SCALE', 'scale']]) {
    const values = [...read(attrs[key]), ...added.map(bean => bean[field])];
    const data = Float32Array.from(values.flat()), size = values[0].length;
    const padding = (-offset) & 3;
    parts.push(Buffer.alloc(padding)); offset += padding;
    const bufferView = gltf.bufferViews.length;
    gltf.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: data.byteLength });
    parts.push(Buffer.from(data.buffer)); offset += data.byteLength;
    Object.assign(gltf.accessors[attrs[key]], { bufferView, byteOffset: 0, count: values.length,
      min: Array.from({ length: size }, (_, axis) => Math.min(...values.map(value => value[axis]))),
      max: Array.from({ length: size }, (_, axis) => Math.max(...values.map(value => value[axis]))) });
  }
  node.extras.instances += added.length;
}
for (const key of ['meshes', 'materials', 'images', 'textures', 'samplers', 'cameras', 'extensions', 'extensionsUsed', 'extensionsRequired']) assert.deepEqual(gltf[key], original[key]);
gltf.buffers[0].byteLength = offset;
const json = Buffer.from(JSON.stringify(gltf));
const jsonPadding = Buffer.alloc((-json.length) & 3, 32), binPadding = Buffer.alloc((-offset) & 3);
const header = Buffer.alloc(12), jsonHeader = Buffer.alloc(8), binHeader = Buffer.alloc(8);
header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4);
header.writeUInt32LE(28 + json.length + jsonPadding.length + offset + binPadding.length, 8);
jsonHeader.writeUInt32LE(json.length + jsonPadding.length, 0); jsonHeader.writeUInt32LE(0x4e4f534a, 4);
binHeader.writeUInt32LE(offset + binPadding.length, 0); binHeader.writeUInt32LE(0x004e4942, 4);
const output = Buffer.concat([header, jsonHeader, json, jsonPadding, binHeader, ...parts, binPadding]);
assert.equal(output.length, header.readUInt32LE(8));
assert(output.subarray(28 + json.length + jsonPadding.length, 28 + json.length + jsonPadding.length + binary.length).equals(binary), 'All original geometry and texture bytes retained');
fs.writeFileSync(destination, output);
const report = { seed, sourceSHA256: crypto.createHash('sha256').update(input).digest('hex'),
  removedGroundBeans: groundCount, originalFloatingBeans: beans.length, addedFloatingBeans: additions.length, totalFloatingBeans: existing.length,
  distanceOrigin: center.toArray(), allowedDistance: { min: near, max: far }, originalCenterLimits: { min: limits.min.toArray(), max: limits.max.toArray() },
  framingBounds: gltf.nodes[nodeMap.get(productId)].extras.framingBounds,
  checks: { preservedOriginalBinary: true, unchangedGeometryMaterialsAndTextures: true, withinOriginalRadiusAndDepth: true, noIntersections: true },
  additions: additions.map(bean => ({ position: bean.position.toArray(), distance: bean.position.distanceTo(center), mesh: original.nodes[bean.nodeId].mesh })) };
fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
