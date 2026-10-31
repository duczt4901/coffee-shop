import fs from "node:fs";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import * as THREE from "three";

const [sceneFile, phinFile, destination, reportFile] = process.argv.slice(2);
assert(sceneFile && phinFile && destination && reportFile && sceneFile !== destination);
function read(file) {
    const data = fs.readFileSync(file),
        length = data.readUInt32LE(12);
    assert.equal(data.readUInt32LE(0), 0x46546c67);
    assert.equal(data.readUInt32LE(8), data.length);
    return { data, gltf: JSON.parse(data.subarray(20, 20 + length)), binary: data.subarray(28 + length) };
}
function bounds(gltf, index, parent = new THREE.Matrix4()) {
    const node = gltf.nodes[index];
    const local = node.matrix
        ? new THREE.Matrix4().fromArray(node.matrix)
        : new THREE.Matrix4().compose(
              new THREE.Vector3().fromArray(node.translation || [0, 0, 0]),
              new THREE.Quaternion().fromArray(node.rotation || [0, 0, 0, 1]),
              new THREE.Vector3().fromArray(node.scale || [1, 1, 1]),
          );
    const world = parent.clone().multiply(local),
        box = new THREE.Box3();
    if (node.mesh !== undefined)
        for (const primitive of gltf.meshes[node.mesh].primitives) {
            const a = gltf.accessors[primitive.attributes.POSITION];
            box.union(new THREE.Box3(new THREE.Vector3().fromArray(a.min), new THREE.Vector3().fromArray(a.max)).applyMatrix4(world));
        }
    for (const child of node.children || []) box.union(bounds(gltf, child, world));
    return box;
}
const scene = read(sceneFile),
    phin = read(phinFile),
    gltf = structuredClone(scene.gltf);
assert(!phin.gltf.images?.length && !phin.gltf.animations?.length && !phin.gltf.skins?.length);
assert.equal(phin.gltf.meshes.length, 4);
assert.equal(phin.gltf.nodes.length, 7, "Assembled set without the internal filter press");
assert(!gltf.nodes.some((n) => n.name === "Vietnamese_Phin"), "Start from the scene without a phin");
const cup = gltf.nodes.findIndex((n) => n.name === "Cup_Provided_FBX");
assert(cup >= 0);
assert(phin.gltf.nodes.some((n) => n.name === "ly_3"));
assert(!phin.gltf.nodes.some((n) => n.name === "Cube.001_4"));
const cupBox = bounds(gltf, cup),
    phinBox = new THREE.Box3();
for (const index of phin.gltf.scenes[phin.gltf.scene || 0].nodes) phinBox.union(bounds(phin.gltf, index));
const scale = 0.135 / phinBox.getSize(new THREE.Vector3()).y;
const center = phinBox.getCenter(new THREE.Vector3()),
    slot = cupBox.getCenter(new THREE.Vector3());
const position = [slot.x - center.x * scale, -phinBox.min.y * scale, slot.z - center.z * scale];
const offsets = { view: gltf.bufferViews.length, accessor: gltf.accessors.length, material: gltf.materials.length, mesh: gltf.meshes.length, node: gltf.nodes.length };
for (const view of phin.gltf.bufferViews) gltf.bufferViews.push({ ...view, buffer: 0, byteOffset: scene.binary.length + (view.byteOffset || 0) });
for (const a of phin.gltf.accessors) gltf.accessors.push({ ...structuredClone(a), bufferView: a.bufferView + offsets.view });
for (const [i, material] of phin.gltf.materials.entries()) {
    const copy = structuredClone(material);
    copy.name = i === 0 ? "Phin_Stainless_Steel" : "Phin_Glass";
    if (i === 0) copy.pbrMetallicRoughness.metallicFactor = 1;
    gltf.materials.push(copy);
}
for (const mesh of phin.gltf.meshes)
    gltf.meshes.push({
        ...structuredClone(mesh),
        name: "Phin_" + mesh.name,
        primitives: mesh.primitives.map((p) => ({
            ...structuredClone(p),
            attributes: Object.fromEntries(Object.entries(p.attributes).map(([name, index]) => [name, index + offsets.accessor])),
            indices: p.indices + offsets.accessor,
            material: p.material + offsets.material,
        })),
    });
for (const node of phin.gltf.nodes) {
    const copy = { ...structuredClone(node), name: "Phin_" + node.name };
    if (copy.mesh !== undefined) copy.mesh += offsets.mesh;
    if (copy.children) copy.children = copy.children.map((i) => i + offsets.node);
    gltf.nodes.push(copy);
}
const root = gltf.nodes.length;
gltf.nodes.push({
    name: "Vietnamese_Phin",
    translation: position,
    scale: [scale, scale, scale],
    children: phin.gltf.scenes[phin.gltf.scene || 0].nodes.map((i) => i + offsets.node),
    extras: { role: "coffee_filter", assembledOnly: true, vessel: "original_phin_glass", internalFilterPressRemoved: true, solidFilterBases: true, attribution: phin.gltf.asset.extras },
});
gltf.nodes.find((n) => n.name === "Product_Display").children.push(root);
gltf.asset.extras = {
    ...gltf.asset.extras,
    phin: {
        ...phin.gltf.asset.extras,
        modifications:
            "Perforated bases replaced with solid faces; geometry simplified, normals rebuilt, unused UVs removed; exploded set and internal filter press removed; assembled phin with its original glass scaled into the product scene.",
    },
};
gltf.scenes[0].extras.description = "Three coffee pouches, Vietnamese phin with original glass and no internal filter press, beans and podium";
gltf.extensionsUsed = [...new Set([...(gltf.extensionsUsed || []), ...(phin.gltf.extensionsUsed || [])])];
const packed = Buffer.concat([scene.binary, phin.binary]);
gltf.buffers[0].byteLength = packed.length;
assert.deepEqual(gltf.accessors.slice(0, offsets.accessor), scene.gltf.accessors);
assert.deepEqual(gltf.meshes.slice(0, offsets.mesh), scene.gltf.meshes);
assert.deepEqual(gltf.materials.slice(0, offsets.material), scene.gltf.materials);
assert.deepEqual(gltf.nodes.slice(1, offsets.node), scene.gltf.nodes.slice(1));
assert(packed.subarray(0, scene.binary.length).equals(scene.binary));
const placed = bounds(gltf, root),
    framing = gltf.nodes[0].extras.framingBounds;
assert(new THREE.Box3(new THREE.Vector3().fromArray(framing.min), new THREE.Vector3().fromArray(framing.max)).containsBox(placed));
assert(Math.abs(placed.min.y) < 1e-7, "Phin glass rests on the floor");
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
    outputBytes: output.length,
    outputSHA256: crypto.createHash("sha256").update(output).digest("hex"),
    phinHeightMetres: placed.getSize(new THREE.Vector3()).y,
    phinBounds: { min: placed.min.toArray(), max: placed.max.toArray() },
    assembledOnly: true,
    originalCupInactive: true,
    originalPhinGlassRestored: true,
    internalFilterPressRemoved: true,
    existingGeometryMaterialsAndPlacementsBytePreserved: true,
    framingBoundsPreserved: true,
    phinAttribution: phin.gltf.asset.extras,
};
fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
