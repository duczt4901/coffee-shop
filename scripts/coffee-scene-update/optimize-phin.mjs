import fs from "node:fs";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import * as THREE from "three";
import { mergeGeometries, mergeVertices, toCreasedNormals } from "three/addons/utils/BufferGeometryUtils.js";
import { MeshoptSimplifier } from "three/addons/libs/meshopt_simplifier.module.js";
import { flattenPerforations } from "./flatten-perforations.mjs";

const [source, destination, reportFile] = process.argv.slice(2);
assert(source && destination && reportFile && source !== destination, "Usage: node optimize-phin.mjs original.glb optimized.glb report.json");
const input = fs.readFileSync(source),
    jsonLength = input.readUInt32LE(12);
assert.equal(input.readUInt32LE(0), 0x46546c67);
assert.equal(input.readUInt32LE(4), 2);
assert.equal(input.length, input.readUInt32LE(8));
const original = JSON.parse(input.subarray(20, 20 + jsonLength));
const binary = input.subarray(28 + jsonLength);
assert(!original.animations?.length && !original.skins?.length && !original.images?.length);
const gltf = structuredClone(original);
gltf.meshes = [];
gltf.accessors = [];
gltf.bufferViews = [];
gltf.buffers = [{ byteLength: 0 }];
const payloads = [],
    cache = new Map(),
    entries = [];
const sizes = { SCALAR: 1, VEC2: 2, VEC3: 3 };
const types = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array };
const digest = (value) => crypto.createHash("sha256").update(value).digest("hex");

function read(index) {
    const a = original.accessors[index],
        view = original.bufferViews[a.bufferView];
    const Type = types[a.componentType],
        size = sizes[a.type];
    assert(Type && size && !a.sparse);
    const width = size * Type.BYTES_PER_ELEMENT,
        output = new Type(a.count * size);
    const start = (view.byteOffset || 0) + (a.byteOffset || 0);
    for (let i = 0; i < a.count; i++) {
        new Uint8Array(output.buffer, i * width, width).set(binary.subarray(start + i * (view.byteStride || width), start + i * (view.byteStride || width) + width));
    }
    return output;
}

function accessor(values, type, componentType, target) {
    const size = sizes[type],
        min = Array(size).fill(Infinity),
        max = Array(size).fill(-Infinity);
    for (let i = 0; i < values.length; i++) {
        assert(Number.isFinite(values[i]));
        min[i % size] = Math.min(min[i % size], values[i]);
        max[i % size] = Math.max(max[i % size], values[i]);
    }
    const view = gltf.bufferViews.length;
    payloads.push(Buffer.from(values.buffer, values.byteOffset, values.byteLength));
    gltf.bufferViews.push({ buffer: 0, byteLength: values.byteLength, target });
    const index = gltf.accessors.length;
    gltf.accessors.push({ bufferView: view, componentType, count: values.length / size, type, min, max });
    return index;
}

await MeshoptSimplifier.ready;
const leafIds = new Set(original.nodes.flatMap((n, i) => (n.mesh === undefined ? [] : [i])));
const assembled = new Set(["Cylinder_0", "Cylinder.001_1", "Cylinder.002_2", "ly_3"]);
const discarded = new Set(original.nodes.flatMap((n, i) => (n.children?.length && n.children.every((child) => leafIds.has(child)) && !assembled.has(n.name) ? [i] : [])));
const inputTriangles = original.meshes.reduce((sum, mesh) => sum + mesh.primitives.reduce((n, p) => n + original.accessors[p.indices].count / 3, 0), 0);
let retainedAssemblyTriangles = 0,
    outputTriangles = 0;
for (const [nodeIndex, node] of original.nodes.entries()) {
    if (!assembled.has(node.name)) continue;
    const geometries = [],
        materials = new Set();
    for (const childId of node.children) {
        const child = original.nodes[childId];
        assert(!child.matrix && !child.translation && !child.rotation && !child.scale && !child.children);
        for (const p of original.meshes[child.mesh].primitives) {
            assert((p.mode ?? 4) === 4);
            assert.deepEqual(Object.keys(p.attributes).sort(), ["NORMAL", "POSITION", "TEXCOORD_0"]);
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute("position", new THREE.BufferAttribute(read(p.attributes.POSITION), 3));
            geometry.setAttribute("normal", new THREE.BufferAttribute(read(p.attributes.NORMAL), 3));
            geometry.setIndex(new THREE.BufferAttribute(read(p.indices), 1));
            geometries.push(geometry);
            materials.add(p.material);
        }
    }
    assert.equal(materials.size, 1);
    const material = [...materials][0],
        merged = mergeGeometries(geometries, false);
    assert(merged);
    // Weld the facet-normal splits before decimation; restore creased shading afterward.
    merged.deleteAttribute("normal");
    let welded = mergeVertices(merged, 1e-5);
    const sourceTriangles = welded.index.count / 3;
    if (node.name === "Cylinder_0" || node.name === "Cylinder.002_2") {
        const flat = flattenPerforations(welded);
        welded.dispose();
        welded = flat;
    }
    welded.computeVertexNormals();
    const positions = welded.attributes.position.array;
    const indices = Uint32Array.from(welded.index.array),
        triangles = indices.length / 3;
    retainedAssemblyTriangles += sourceTriangles;
    const key = [digest(Buffer.from(positions.buffer, positions.byteOffset, positions.byteLength)), digest(Buffer.from(indices.buffer)), material].join(":");
    let meshIndex = cache.get(key);
    if (meshIndex === undefined) {
        const locks = new Uint8Array(positions.length / 3);
        for (let axis = 0; axis < 3; axis++) {
            let lo = 0,
                hi = 0;
            for (let i = 1; i < locks.length; i++) {
                if (positions[i * 3 + axis] < positions[lo * 3 + axis]) lo = i;
                if (positions[i * 3 + axis] > positions[hi * 3 + axis]) hi = i;
            }
            locks[lo] = locks[hi] = 1;
        }
        let simplified = indices,
            error = 0;
        if (triangles > 1500) {
            [simplified, error] = MeshoptSimplifier.simplifyWithAttributes(
                indices,
                positions,
                3,
                welded.attributes.normal.array,
                3,
                [0.05, 0.05, 0.05],
                locks,
                Math.floor(triangles * 0.04) * 3,
                0.002,
                [],
            );
        }
        const [remap, count] = MeshoptSimplifier.compactMesh(simplified);
        const points = new Float32Array(count * 3);
        for (let i = 0; i < remap.length; i++) {
            if (remap[i] === 0xffffffff) continue;
            points.set(positions.subarray(i * 3, i * 3 + 3), remap[i] * 3);
        }
        const oldBounds = new THREE.Box3().setFromBufferAttribute(welded.attributes.position);
        const newBounds = new THREE.Box3().setFromBufferAttribute(new THREE.BufferAttribute(points, 3));
        assert(oldBounds.equals(newBounds), "Keep all six extent vertices");
        assert(simplified.every((i) => i < count));
        const shape = new THREE.BufferGeometry();
        shape.setAttribute("position", new THREE.BufferAttribute(points, 3));
        shape.setIndex(new THREE.BufferAttribute(simplified, 1));
        const creased = toCreasedNormals(shape, THREE.MathUtils.degToRad(35));
        const shaded = mergeVertices(creased, 1e-5);
        const finalPoints = shaded.attributes.position.array,
            shading = shaded.attributes.normal.array;
        const finalIndices = shaded.index.array,
            finalCount = finalPoints.length / 3;
        for (let i = 0; i < shading.length; i += 3) {
            assert(Math.abs(Math.hypot(shading[i], shading[i + 1], shading[i + 2]) - 1) < 1e-4);
        }
        const use16 = finalCount < 65536;
        const packedIndices = use16 ? Uint16Array.from(finalIndices) : Uint32Array.from(finalIndices);
        meshIndex = gltf.meshes.length;
        gltf.meshes.push({
            name: node.name,
            primitives: [
                {
                    attributes: { POSITION: accessor(finalPoints, "VEC3", 5126, 34962), NORMAL: accessor(shading, "VEC3", 5126, 34962) },
                    indices: accessor(packedIndices, "SCALAR", use16 ? 5123 : 5125, 34963),
                    material,
                    mode: 4,
                },
            ],
        });
        cache.set(key, meshIndex);
        entries.push({
            name: node.name,
            sourceChunks: geometries.length,
            beforeTriangles: sourceTriangles,
            afterFillingPerforations: triangles,
            afterTriangles: simplified.length / 3,
            weldedVertices: positions.length / 3,
            afterVertices: finalCount,
            meshoptAttributeError: error,
        });
        shape.dispose();
        creased.dispose();
        shaded.dispose();
    }
    const changed = gltf.nodes[nodeIndex];
    changed.mesh = meshIndex;
    delete changed.children;
    outputTriangles += gltf.accessors[gltf.meshes[meshIndex].primitives[0].indices].count / 3;
    geometries.forEach((g) => g.dispose());
    merged.dispose();
    welded.dispose();
}
assert.equal(entries.length, 4, "Assembled set without the internal filter press");
const removed = new Set([...leafIds, ...discarded]);
const nodeMap = new Map(gltf.nodes.flatMap((_, i) => (removed.has(i) ? [] : [[i, 0]])));
let nodeCount = 0;
for (const i of nodeMap.keys()) nodeMap.set(i, nodeCount++);
gltf.nodes = gltf.nodes.filter((_, i) => !removed.has(i));
for (const n of gltf.nodes)
    if (n.children)
        n.children = n.children
            .filter((i) => !removed.has(i))
            .map((i) => {
                assert(nodeMap.has(i));
                return nodeMap.get(i);
            });
for (const scene of gltf.scenes) scene.nodes = scene.nodes.map((i) => nodeMap.get(i));
assert.deepEqual(gltf.materials, original.materials);
assert.deepEqual(gltf.asset, original.asset);
const parts = [];
let offset = 0;
gltf.bufferViews.forEach((v, i) => {
    const pad = -offset & 3;
    parts.push(Buffer.alloc(pad));
    offset += pad;
    v.byteOffset = offset;
    parts.push(payloads[i]);
    offset += payloads[i].length;
});
parts.push(Buffer.alloc(-offset & 3));
const packed = Buffer.concat(parts);
gltf.buffers[0].byteLength = packed.length;
const encoded = Buffer.from(JSON.stringify(gltf)),
    json = Buffer.concat([encoded, Buffer.alloc(-encoded.length & 3, 32)]);
const header = Buffer.alloc(20),
    bh = Buffer.alloc(8);
header.write("glTF");
header.writeUInt32LE(2, 4);
header.writeUInt32LE(28 + json.length + packed.length, 8);
header.writeUInt32LE(json.length, 12);
header.write("JSON", 16);
bh.writeUInt32LE(packed.length);
bh.write("BIN\0", 4);
const output = Buffer.concat([header, json, bh, packed]);
fs.writeFileSync(destination, output);
const report = {
    sourceSHA256: digest(input),
    outputSHA256: digest(output),
    inputBytes: input.length,
    outputBytes: output.length,
    inputTriangles,
    retainedAssemblyTriangles,
    outputTriangles,
    uniqueComponents: entries,
    originalMaterialsAndAttributionPreserved: true,
    assembledSetOnly: true,
    internalFilterPressRemoved: true,
    perforatedBasesReplacedWithSolidFaces: true,
    noRuntimeDecoderRequired: true,
    removedOnlyUnusedUVs: true,
    normalsRecomputedWith35DegreeCreases: true,
};
fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
