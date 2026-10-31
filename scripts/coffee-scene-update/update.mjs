import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { MeshoptSimplifier } from 'three/addons/libs/meshopt_simplifier.module.js';

// Build-time simplification only. The result needs standard GLTFLoader, no decoder.
const [sourceFile, texturesDirectory, destination] = process.argv.slice(2);
assert(sourceFile && texturesDirectory && destination, 'Usage: update.mjs original.glb textures/ output.glb');
const source = fs.readFileSync(sourceFile), jsonLength = source.readUInt32LE(12);
const gltf = JSON.parse(source.subarray(20, 20 + jsonLength));
const binary = source.subarray(28 + jsonLength);
const originalAccessors = gltf.accessors, originalViews = gltf.bufferViews;
const typeSize = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
const constructors = { 5121: Uint8Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const componentTypes = new Map([[Float32Array, 5126], [Uint16Array, 5123], [Uint32Array, 5125], [Uint8Array, 5121]]);
const decoded = new Map();
function readAccessor(id) {
  if (decoded.has(id)) return decoded.get(id);
  const a = originalAccessors[id], view = originalViews[a.bufferView], Type = constructors[a.componentType];
  assert(Type && !a.sparse, 'Supported packed accessor');
  const size = typeSize[a.type], bytes = Type.BYTES_PER_ELEMENT, start = (view.byteOffset || 0) + (a.byteOffset || 0);
  const output = new Type(a.count * size);
  for (let i = 0; i < a.count; i++) {
    const row = binary.subarray(start + i * (view.byteStride || size * bytes), start + i * (view.byteStride || size * bytes) + size * bytes);
    new Uint8Array(output.buffer, i * size * bytes, size * bytes).set(row);
  }
  decoded.set(id, output); return output;
}

const clamp = THREE.MathUtils.clamp, smooth = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b);
const gauss = (x, center, width) => Math.exp(-(((x - center) / width) ** 2));
function random(seed) { return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296); }
function creaseField(u, y, back, variant) {
  const base = back ? [[-.84,.30,.30,.072],[.83,.20,-.24,.088],[-.87,2.48,-.38,.062],[.82,2.56,.34,.071]]
    : [[-.85,.24,.28,.086],[.86,.16,-.30,.092],[-.87,2.44,-.32,.069],[.86,2.56,.31,.055]];
  const rng = random(variant + (back ? 159 : 0));
  let value = 0;
  for (let [c, baseY, slope, amplitude] of base) {
    if (variant) { c += (rng() - .5) * .28; baseY += (rng() - .5) * .42; slope *= .35 + rng() * 1.25; amplitude *= .45 + rng() * 1.1; }
    const d = y - baseY - slope * (u - c);
    value += amplitude * gauss(u, c, .40) * (gauss(d, 0, .045) - .72 * gauss(d, .065, .052));
  }
  const phase = variant ? rng() * Math.PI * 2 : 0;
  value += (gauss(u,-.90,.12)*Math.sin(y*10.5+.8+phase)+gauss(u,.9,.13)*Math.sin(y*8.6+2.2-phase))*.012;
  value += gauss(y,2.83 + (variant ? (rng()-.5)*.2 : 0),.22)*(.011*Math.sin(u*8+1.7+phase)+.012*(1-u*u));
  const diagonal = (c, baseY, slope, amount) => amount*gauss(u,c,.32)*(gauss(y,baseY+slope*(u-c),.021)-.65*gauss(y,baseY+.038+slope*(u-c),.033));
  value += variant ? diagonal(-.72,2.94+(rng()-.5)*.3,-.2-rng()*.4,.025) + diagonal(.72,3.05+(rng()-.5)*.2,.2+rng()*.35,.035)
    : diagonal(-.80,3.06,-.40,.030) + diagonal(.79,3.01,.34,.026);
  if (variant) value += .022 * Math.sin(u*5 + y*4 + phase) * (1-u*u) * Math.sin(Math.PI*y/3.554460048675537);
  return value;
}

await MeshoptSimplifier.ready;
const parts = [], accessors = [], views = [];
let byteOffset = 0;
function appendView(bytes, target) {
  const padding = (4 - byteOffset % 4) % 4;
  if (padding) { parts.push(Buffer.alloc(padding)); byteOffset += padding; }
  const id = views.length;
  views.push({ buffer: 0, byteOffset, byteLength: bytes.length, ...(target ? { target } : {}) });
  parts.push(bytes); byteOffset += bytes.length; return id;
}
function appendAccessor(array, type, target, normalized = false) {
  const size = typeSize[type], min = Array(size).fill(Infinity), max = Array(size).fill(-Infinity);
  for (let i = 0; i < array.length; i++) { const k = i % size; min[k] = Math.min(min[k], array[i]); max[k] = Math.max(max[k], array[i]); }
  const id = accessors.length;
  accessors.push({ bufferView: appendView(Buffer.from(array.buffer, array.byteOffset, array.byteLength), target), componentType: componentTypes.get(array.constructor), count: array.length / size, type, min, max, ...(normalized ? { normalized } : {}) });
  return id;
}
const report = { sourceBytes: source.length, geometries: [], variations: [], layout: [] };
const newMeshes = [], meshMap = new Map();
function packGeometry(positions, normals, uv, primitives, name, ratio, error, preserve = false) {
  const attributes = new Float32Array(positions.length / 3 * 5);
  for (let i = 0; i < positions.length / 3; i++) attributes.set([...normals.subarray(i*3,i*3+3), ...(uv ? uv.subarray(i*2,i*2+2) : [0,0])], i*5);
  const simplified = primitives.map(p => {
    const index = Uint32Array.from(p.index);
    const [result, achievedError] = preserve ? [index, 0] : MeshoptSimplifier.simplifyWithAttributes(index, positions, 3, attributes, 5, [.2,.2,.2,.4,.4], null, Math.floor(index.length*ratio/3)*3, error, ['LockBorder']);
    report.geometries.push({ name, material: p.material, beforeTriangles: index.length/3, triangles: result.length/3, relativeError: achievedError });
    return { ...p, index: result };
  });
  // Keep all orange attributes/indices byte-for-byte; compact the edited or reduced geometry.
  const allIndices = Uint32Array.from(simplified.flatMap(p => Array.from(p.index)));
  const [remap, count] = preserve ? [null, positions.length/3] : MeshoptSimplifier.compactMesh(allIndices);
  function compact(array, size) {
    if (!array || preserve) return array;
    const output = new Float32Array(count*size);
    for (let i = 0; i < remap.length; i++) if (remap[i] !== 0xffffffff) output.set(array.subarray(i*size,i*size+size),remap[i]*size);
    return output;
  }
  const packed = { POSITION: appendAccessor(compact(positions,3),'VEC3',34962), NORMAL: appendAccessor(compact(normals,3),'VEC3',34962) };
  if (uv) packed.TEXCOORD_0 = appendAccessor(compact(uv,2),'VEC2',34962);
  let cursor = 0;
  const output = { name, primitives: simplified.map(p => {
    const indices = allIndices.subarray(cursor,cursor+p.index.length); cursor += p.index.length;
    const typed = count <= 65535 ? Uint16Array.from(indices) : Uint32Array.from(indices);
    return { mode: 4, attributes: packed, indices: appendAccessor(typed,'SCALAR',34963), material: p.material };
  }) };
  newMeshes.push(output); return newMeshes.length-1;
}
function meshGeometry(meshId) {
  const mesh = gltf.meshes[meshId], p = mesh.primitives[0], a = p.attributes;
  return { positions: readAccessor(a.POSITION), normals: readAccessor(a.NORMAL), uv: a.TEXCOORD_0 === undefined ? null : readAccessor(a.TEXCOORD_0),
    primitives: mesh.primitives.map(p => ({ material:p.material, index:p.indices === undefined ? Uint32Array.from({length:originalAccessors[a.POSITION].count},(_,i)=>i) : readAccessor(p.indices) })) };
}
function descendants(nodeId) { return [nodeId,...(gltf.nodes[nodeId].children || []).flatMap(descendants)]; }

for (const [name, seed, yaw, x, z] of [
  ['Bag_1kg_Orange',0,-16,.162,-.020], ['Bag_500g_Blue',7193,12,-.126,-.075], ['Bag_500g_Green',2861,4,-.026,.095],
]) {
  const nodeId = gltf.nodes.findIndex(n => n.name === name), node = gltf.nodes[nodeId];
  const children = descendants(nodeId).filter(i => gltf.nodes[i].mesh !== undefined);
  const first = meshGeometry(gltf.nodes[children[0]].mesh);
  const positions = first.positions.slice(), normals = first.normals.slice();
  const primitives = children.flatMap(i => meshGeometry(gltf.nodes[i].mesh).primitives);
  if (seed) {
    let maxChange = 0;
    for (let i=0;i<positions.length;i+=3) {
      const [depth,y,width] = positions.subarray(i,i+3), u = clamp(-width,-1,1), back = depth < 0;
      const weight = Math.abs(normals[i]) ** 2 * smooth(.045,.15,y) * (1-smooth(3.18,3.35,y));
      const delta = (back ? -1 : 1) * (creaseField(u,y,back,seed)-creaseField(u,y,back,0)) * weight;
      positions[i] += delta; maxChange=Math.max(maxChange,Math.abs(delta));
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
    geometry.setIndex(primitives.flatMap(p=>Array.from(p.index))); geometry.computeVertexNormals();
    normals.set(geometry.attributes.normal.array); geometry.dispose();
    node.extras = {...node.extras, approvedMeshAndFoldsPreserved:false, wrinkleSeed:seed, wrinkleVariation:'Independent coherent corner/shoulder crease field; original UVs and label design retained'};
    report.variations.push({ name, seed, maxDepthChangeMetres: maxChange * .4640112817287445 * .09565447222474503 * .9 });
  }
  const mesh = packGeometry(positions,normals,first.uv,primitives,name,.50,.00065,!seed);
  // A single node owns the three material primitives after replacing the original split nodes.
  gltf.nodes[children[0]].mesh=mesh;
  for (const i of children.slice(1)) delete gltf.nodes[i].mesh;
  const matrix = new THREE.Matrix4().fromArray(node.matrix), position = new THREE.Vector3(), quaternion = new THREE.Quaternion(), scale = new THREE.Vector3();
  matrix.decompose(position,quaternion,scale);position.x=x;position.z=z;
  quaternion.setFromAxisAngle(new THREE.Vector3(0,1,0),THREE.MathUtils.degToRad(yaw));
  node.matrix = matrix.compose(position,quaternion,scale).toArray();
  node.extras = {...node.extras, placementYawDegrees:yaw};
  report.layout.push({name,yawDegrees:yaw,position:position.toArray()});
}

// Other source meshes are shared by both sets of bean instances.
for (const node of gltf.nodes) {
  if (node.mesh === undefined || node.name?.startsWith('mesh_0')) continue;
  const oldMesh = node.mesh;
  if (!meshMap.has(oldMesh)) {
    const geometry = meshGeometry(oldMesh), bean = /Bean_/.test(node.name || ''), cup = /Cup_Original|Coffee_Original/.test(node.name || '');
    if (node.name === 'Studio_Floor') {
      const positions = new Float32Array([-2,0,-2, -2,0,2, 2,0,2, 2,0,-2]);
      meshMap.set(oldMesh,packGeometry(positions,new Float32Array([0,1,0,0,1,0,0,1,0,0,1,0]),null,[{material:geometry.primitives[0].material,index:new Uint32Array([0,1,2,0,2,3])}],node.name,1,0,true));
    } else meshMap.set(oldMesh,packGeometry(geometry.positions,geometry.normals,geometry.uv,geometry.primitives,node.name || `mesh_${oldMesh}`,bean ? .15 : cup ? .55 : 1,bean ? .003 : .0008,!bean&&!cup));
  }
  node.mesh=meshMap.get(oldMesh);
}

// Repack just the live data. In particular, avoid retaining orphaned source buffers.
const copied = new Map();
function copyAccessor(id) {
  if (!copied.has(id)) copied.set(id,appendAccessor(readAccessor(id),originalAccessors[id].type,undefined,originalAccessors[id].normalized));
  return copied.get(id);
}
for (const node of gltf.nodes) if (node.extensions?.EXT_mesh_gpu_instancing) {
  const attrs=node.extensions.EXT_mesh_gpu_instancing.attributes;
  for (const key in attrs) attrs[key]=copyAccessor(attrs[key]);
}
const textures = JSON.parse(fs.readFileSync(path.join(texturesDirectory,'report.json'),'utf8'));
gltf.images = textures.map(t => ({bufferView:appendView(fs.readFileSync(path.join(texturesDirectory,t.file))),mimeType:t.mimeType}));
gltf.meshes=newMeshes;gltf.accessors=accessors;gltf.bufferViews=views;gltf.buffers=[{byteLength:byteOffset}];
gltf.asset.generator='Coffee scene variation + build-time meshoptimizer; standard glTF 2.0';
gltf.scenes[0].extras={...gltf.scenes[0].extras,variationRevision:'2026-10-26',studioFloor:'Flat receiver; unused studio cove removed'};
const json=Buffer.from(JSON.stringify(gltf)),jsonPadding=(4-json.length%4)%4;
const bin=Buffer.concat(parts),binPadding=(4-bin.length%4)%4;
const header=Buffer.alloc(12),jsonHeader=Buffer.alloc(8),binHeader=Buffer.alloc(8);
header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(12+8+json.length+jsonPadding+8+bin.length+binPadding,8);
jsonHeader.writeUInt32LE(json.length+jsonPadding,0);jsonHeader.writeUInt32LE(0x4e4f534a,4);
binHeader.writeUInt32LE(bin.length+binPadding,0);binHeader.writeUInt32LE(0x004e4942,4);
const output=Buffer.concat([header,jsonHeader,json,Buffer.alloc(jsonPadding,32),binHeader,bin,Buffer.alloc(binPadding)]);
fs.writeFileSync(destination,output);
report.bytes=output.length;report.textureBytesBefore=textures.reduce((sum,t)=>sum+t.beforeBytes,0);report.textureBytes=textures.reduce((sum,t)=>sum+t.bytes,0);
report.noNewRuntimeDecoder=true;
fs.writeFileSync(path.join(path.dirname(destination),'scene-optimization-report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
