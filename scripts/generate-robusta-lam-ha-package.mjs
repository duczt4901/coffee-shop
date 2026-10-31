import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const outputDirectory = path.resolve("public/images/3d");
const texturePath = path.join(outputDirectory, "robusta-lam-ha-label.png");
const modelPath = path.join(outputDirectory, "robusta-lam-ha-package.glb");

async function loadSharp() {
    const store = path.resolve("node_modules/.pnpm");
    const packages = (await readdir(store))
        .filter((name) => name.startsWith("sharp@"))
        .sort()
        .reverse();

    if (!packages.length) throw new Error("Sharp is unavailable in node_modules; run pnpm install first.");

    const modulePath = path.join(store, packages[0], "node_modules/sharp/dist/index.mjs");
    return (await import(pathToFileURL(modulePath).href)).default;
}

const labelSvg = String.raw`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1800" viewBox="0 0 1200 1800">
  <rect width="1200" height="1800" rx="46" fill="#f6f3ec"/>
  <path d="M0 46Q0 0 46 0H1154Q1200 0 1200 46V720H0Z" fill="#ef5423"/>
  <g fill="none" stroke="#fff8eb" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="600" cy="205" r="50" stroke-width="14"/>
    <path d="M600 118V72M600 338V292M513 205H467M733 205H687M539 144L506 111M694 299L661 266M661 144L694 111M506 299L539 266" stroke-width="12"/>
    <path d="M490 420C558 336 640 330 710 375C662 472 576 503 490 420Z" stroke-width="13"/>
    <path d="M506 435C556 424 608 410 684 382" stroke-width="11"/>
  </g>
  <g fill="#fff8eb" text-anchor="middle" font-family="Arial, Helvetica, sans-serif">
    <text x="600" y="555" font-size="105" font-weight="700" letter-spacing="4">LÀ VƯỜN</text>
    <text x="600" y="625" font-size="31" font-weight="700" letter-spacing="15">CÀ PHÊ</text>
    <text x="600" y="680" font-size="25" font-weight="600" letter-spacing="6">LÂM HÀ · LÂM ĐỒNG</text>
  </g>
  <g fill="#20252a" font-family="Arial, Helvetica, sans-serif">
    <text x="92" y="850" font-size="34" font-weight="700" letter-spacing="10">ROBUSTA</text>
    <text x="92" y="973" font-size="104" font-weight="700" letter-spacing="1">LÂM HÀ</text>
    <path d="M94 1026H268" stroke="#20252a" stroke-width="7"/>
    <text x="92" y="1115" font-size="24" font-weight="700" letter-spacing="5">HƯƠNG VỊ</text>
    <text x="92" y="1165" font-size="31" font-weight="500">Đậm đà · Chocolate · Ngọt hậu</text>
    <path d="M92 1228H1108" stroke="#c9c6be" stroke-width="2"/>
    <text x="92" y="1302" font-size="22" font-weight="700" letter-spacing="3">PHƯƠNG PHÁP SƠ CHẾ</text>
    <text x="92" y="1352" font-size="33" font-weight="700">NATURAL</text>
    <text x="660" y="1302" font-size="22" font-weight="700" letter-spacing="3">MỨC RANG</text>
    <text x="660" y="1352" font-size="33" font-weight="700">ĐẬM</text>
    <path d="M92 1418H1108" stroke="#c9c6be" stroke-width="2"/>
    <text x="92" y="1494" font-size="24" font-weight="700" letter-spacing="3">PHA PHIN · PHA MÁY</text>
    <text x="92" y="1540" font-size="24" font-weight="700" letter-spacing="3">HẠT · BỘT</text>
    <text x="92" y="1668" font-size="21" font-weight="700" letter-spacing="3">KLT: __________</text>
    <text x="670" y="1668" font-size="21" font-weight="700" letter-spacing="3">LOT: __________</text>
  </g>
</svg>`;

function computeNormals(positions, indices) {
    const normals = new Float32Array(positions.length);

    for (let index = 0; index < indices.length; index += 3) {
        const a = indices[index] * 3;
        const b = indices[index + 1] * 3;
        const c = indices[index + 2] * 3;
        const ab = [positions[b] - positions[a], positions[b + 1] - positions[a + 1], positions[b + 2] - positions[a + 2]];
        const ac = [positions[c] - positions[a], positions[c + 1] - positions[a + 1], positions[c + 2] - positions[a + 2]];
        const normal = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];

        for (const vertex of [a, b, c]) {
            normals[vertex] += normal[0];
            normals[vertex + 1] += normal[1];
            normals[vertex + 2] += normal[2];
        }
    }

    for (let index = 0; index < normals.length; index += 3) {
        const length = Math.hypot(normals[index], normals[index + 1], normals[index + 2]) || 1;
        normals[index] /= length;
        normals[index + 1] /= length;
        normals[index + 2] /= length;
    }

    return normals;
}

function bagHalfWidth(v) {
    const bottomTaper = v < 0.12 ? 0.91 + (v / 0.12) * 0.09 : 1;
    const topTaper = v > 0.87 ? 1 - ((v - 0.87) / 0.13) * 0.055 : 1;
    return 0.98 * Math.min(bottomTaper, topTaper);
}

function bagFrontZ(u, v) {
    const bulge = 0.13 * Math.sin(Math.PI * u) * Math.sin(Math.PI * v);
    const edgeWrinkle = Math.pow(Math.abs(u - 0.5) * 2, 3);
    const wrinkle = edgeWrinkle * (0.018 * Math.sin(31 * v + 9 * u) + 0.012 * Math.sin(47 * v - 13 * u));
    return 0.27 + bulge + wrinkle;
}

function createBagBody() {
    const columns = 22;
    const rows = 32;
    const positions = [];
    const uvs = [];
    const indices = [];
    const edge = { frontLeft: [], frontRight: [], backLeft: [], backRight: [] };

    for (const side of [1, -1]) {
        const offset = positions.length / 3;

        for (let row = 0; row <= rows; row++) {
            const v = row / rows;
            const y = -1.55 + v * 3.1;
            const halfWidth = bagHalfWidth(v);

            for (let column = 0; column <= columns; column++) {
                const u = column / columns;
                const x = (u * 2 - 1) * halfWidth;
                const z = side === 1 ? bagFrontZ(u, v) : -0.26 - 0.085 * Math.sin(Math.PI * u) * Math.sin(Math.PI * v);
                positions.push(x, y, z);
                uvs.push(u, v);
            }

            const first = offset + row * (columns + 1);
            const last = first + columns;
            const leftKey = side === 1 ? "frontLeft" : "backLeft";
            const rightKey = side === 1 ? "frontRight" : "backRight";
            edge[leftKey].push(first);
            edge[rightKey].push(last);
        }

        for (let row = 0; row < rows; row++) {
            for (let column = 0; column < columns; column++) {
                const a = offset + row * (columns + 1) + column;
                const b = a + 1;
                const c = a + columns + 1;
                const d = c + 1;
                if (side === 1) indices.push(a, b, d, a, d, c);
                else indices.push(a, d, b, a, c, d);
            }
        }
    }

    for (let row = 0; row < rows; row++) {
        const fl0 = edge.frontLeft[row];
        const fl1 = edge.frontLeft[row + 1];
        const bl0 = edge.backLeft[row];
        const bl1 = edge.backLeft[row + 1];
        indices.push(fl0, fl1, bl1, fl0, bl1, bl0);

        const fr0 = edge.frontRight[row];
        const fr1 = edge.frontRight[row + 1];
        const br0 = edge.backRight[row];
        const br1 = edge.backRight[row + 1];
        indices.push(fr0, br1, fr1, fr0, br0, br1);
    }

    const topFrontLeft = edge.frontLeft.at(-1);
    const topFrontRight = edge.frontRight.at(-1);
    const topBackLeft = edge.backLeft.at(-1);
    const topBackRight = edge.backRight.at(-1);
    indices.push(topFrontLeft, topFrontRight, topBackRight, topFrontLeft, topBackRight, topBackLeft);

    const bottomFrontLeft = edge.frontLeft[0];
    const bottomFrontRight = edge.frontRight[0];
    const bottomBackLeft = edge.backLeft[0];
    const bottomBackRight = edge.backRight[0];
    indices.push(bottomFrontLeft, bottomBackRight, bottomFrontRight, bottomFrontLeft, bottomBackLeft, bottomBackRight);

    return {
        positions: new Float32Array(positions),
        normals: computeNormals(positions, indices),
        uvs: new Float32Array(uvs),
        indices: new Uint16Array(indices),
    };
}

function createLabel() {
    const columns = 16;
    const rows = 24;
    const positions = [];
    const uvs = [];
    const indices = [];

    for (let row = 0; row <= rows; row++) {
        const v = row / rows;
        const y = -1.18 + v * 2.54;
        const bodyV = (y + 1.55) / 3.1;

        for (let column = 0; column <= columns; column++) {
            const u = column / columns;
            const x = -0.79 + u * 1.58;
            const bodyU = (x / bagHalfWidth(bodyV) + 1) / 2;
            positions.push(x, y, bagFrontZ(bodyU, bodyV) + 0.018);
            uvs.push(u, 1 - v);
        }
    }

    for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
            const a = row * (columns + 1) + column;
            const b = a + 1;
            const c = a + columns + 1;
            const d = c + 1;
            indices.push(a, b, d, a, d, c);
        }
    }

    return {
        positions: new Float32Array(positions),
        normals: computeNormals(positions, indices),
        uvs: new Float32Array(uvs),
        indices: new Uint16Array(indices),
    };
}

function createBox(width, height, depth, x, y, z) {
    const x0 = x - width / 2;
    const x1 = x + width / 2;
    const y0 = y - height / 2;
    const y1 = y + height / 2;
    const z0 = z - depth / 2;
    const z1 = z + depth / 2;
    const positions = [
        x0,
        y0,
        z1,
        x1,
        y0,
        z1,
        x1,
        y1,
        z1,
        x0,
        y1,
        z1,
        x1,
        y0,
        z0,
        x0,
        y0,
        z0,
        x0,
        y1,
        z0,
        x1,
        y1,
        z0,
        x0,
        y0,
        z0,
        x0,
        y0,
        z1,
        x0,
        y1,
        z1,
        x0,
        y1,
        z0,
        x1,
        y0,
        z1,
        x1,
        y0,
        z0,
        x1,
        y1,
        z0,
        x1,
        y1,
        z1,
        x0,
        y1,
        z1,
        x1,
        y1,
        z1,
        x1,
        y1,
        z0,
        x0,
        y1,
        z0,
        x0,
        y0,
        z0,
        x1,
        y0,
        z0,
        x1,
        y0,
        z1,
        x0,
        y0,
        z1,
    ];
    const indices = [];
    for (let face = 0; face < 6; face++) {
        const offset = face * 4;
        indices.push(offset, offset + 1, offset + 2, offset, offset + 2, offset + 3);
    }
    return {
        positions: new Float32Array(positions),
        normals: computeNormals(positions, indices),
        uvs: new Float32Array(24 * 2),
        indices: new Uint16Array(indices),
    };
}

function createGlb(geometries, labelPng) {
    const json = {
        asset: { version: "2.0", generator: "La Vuon coffee package generator" },
        scene: 0,
        scenes: [{ nodes: geometries.map((_, index) => index) }],
        nodes: geometries.map((geometry, index) => ({ name: geometry.name, mesh: index })),
        meshes: [],
        materials: [
            {
                name: "Matte white pouch",
                pbrMetallicRoughness: { baseColorFactor: [0.94, 0.935, 0.91, 1], metallicFactor: 0, roughnessFactor: 0.62 },
            },
            {
                name: "Heat-sealed edges",
                pbrMetallicRoughness: { baseColorFactor: [0.84, 0.84, 0.82, 1], metallicFactor: 0, roughnessFactor: 0.72 },
            },
            {
                name: "Robusta Lam Ha front label",
                pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: 0, roughnessFactor: 0.74 },
                doubleSided: false,
            },
            {
                name: "Resealable zipper",
                pbrMetallicRoughness: { baseColorFactor: [0.13, 0.14, 0.14, 1], metallicFactor: 0, roughnessFactor: 0.8 },
            },
        ],
        textures: [{ sampler: 0, source: 0 }],
        samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 33071, wrapT: 33071 }],
        images: [],
        accessors: [],
        bufferViews: [],
        buffers: [],
    };
    const chunks = [];
    let binaryLength = 0;

    const append = (buffer, target) => {
        const padding = (4 - (binaryLength % 4)) % 4;
        if (padding) {
            chunks.push(Buffer.alloc(padding));
            binaryLength += padding;
        }
        const view = Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        const index = json.bufferViews.length;
        json.bufferViews.push({ buffer: 0, byteOffset: binaryLength, byteLength: view.length, ...(target ? { target } : {}) });
        chunks.push(view);
        binaryLength += view.length;
        return index;
    };

    const addAccessor = (array, type, componentType, target) => {
        const components = { SCALAR: 1, VEC2: 2, VEC3: 3 }[type];
        const count = array.length / components;
        const accessor = { bufferView: append(array, target), componentType, count, type };
        if (type === "VEC3") {
            accessor.min = [Infinity, Infinity, Infinity];
            accessor.max = [-Infinity, -Infinity, -Infinity];
            for (let index = 0; index < array.length; index += 3) {
                for (let axis = 0; axis < 3; axis++) {
                    accessor.min[axis] = Math.min(accessor.min[axis], array[index + axis]);
                    accessor.max[axis] = Math.max(accessor.max[axis], array[index + axis]);
                }
            }
        }
        json.accessors.push(accessor);
        return json.accessors.length - 1;
    };

    for (const item of geometries) {
        const attributes = {
            POSITION: addAccessor(item.geometry.positions, "VEC3", 5126, 34962),
            NORMAL: addAccessor(item.geometry.normals, "VEC3", 5126, 34962),
            TEXCOORD_0: addAccessor(item.geometry.uvs, "VEC2", 5126, 34962),
        };
        const indices = addAccessor(item.geometry.indices, "SCALAR", 5123, 34963);
        json.meshes.push({ name: item.name, primitives: [{ attributes, indices, material: item.material }] });
    }

    const imagePadding = (4 - (binaryLength % 4)) % 4;
    if (imagePadding) {
        chunks.push(Buffer.alloc(imagePadding));
        binaryLength += imagePadding;
    }
    const imageView = json.bufferViews.length;
    json.bufferViews.push({ buffer: 0, byteOffset: binaryLength, byteLength: labelPng.length });
    chunks.push(labelPng);
    binaryLength += labelPng.length;
    json.images.push({ name: "Robusta Lam Ha label", bufferView: imageView, mimeType: "image/png" });

    const finalPadding = (4 - (binaryLength % 4)) % 4;
    if (finalPadding) {
        chunks.push(Buffer.alloc(finalPadding));
        binaryLength += finalPadding;
    }
    json.buffers.push({ byteLength: binaryLength });

    const binaryChunk = Buffer.concat(chunks, binaryLength);
    let jsonChunk = Buffer.from(JSON.stringify(json));
    const jsonPadding = (4 - (jsonChunk.length % 4)) % 4;
    if (jsonPadding) jsonChunk = Buffer.concat([jsonChunk, Buffer.alloc(jsonPadding, 0x20)]);

    const header = Buffer.alloc(12);
    header.writeUInt32LE(0x46546c67, 0);
    header.writeUInt32LE(2, 4);
    header.writeUInt32LE(12 + 8 + jsonChunk.length + 8 + binaryChunk.length, 8);

    const jsonHeader = Buffer.alloc(8);
    jsonHeader.writeUInt32LE(jsonChunk.length, 0);
    jsonHeader.writeUInt32LE(0x4e4f534a, 4);

    const binaryHeader = Buffer.alloc(8);
    binaryHeader.writeUInt32LE(binaryChunk.length, 0);
    binaryHeader.writeUInt32LE(0x004e4942, 4);

    return Buffer.concat([header, jsonHeader, jsonChunk, binaryHeader, binaryChunk]);
}

const sharp = await loadSharp();
const labelPng = await sharp(Buffer.from(labelSvg)).png({ compressionLevel: 9 }).toBuffer();
await writeFile(texturePath, labelPng);

const geometries = [
    { name: "Pouch body", geometry: createBagBody(), material: 0 },
    { name: "Top heat seal", geometry: createBox(2.0, 0.11, 0.49, 0, 1.595, 0), material: 1 },
    { name: "Bottom heat seal", geometry: createBox(1.92, 0.09, 0.51, 0, -1.595, 0), material: 1 },
    { name: "Left edge seal", geometry: createBox(0.045, 3.02, 0.035, -0.965, 0, 0.288), material: 1 },
    { name: "Right edge seal", geometry: createBox(0.045, 3.02, 0.035, 0.965, 0, 0.288), material: 1 },
    { name: "Upper zipper rail", geometry: createBox(1.78, 0.018, 0.025, 0, 1.43, 0.307), material: 3 },
    { name: "Lower zipper rail", geometry: createBox(1.78, 0.018, 0.025, 0, 1.39, 0.307), material: 3 },
    { name: "Front label", geometry: createLabel(), material: 2 },
];

const glb = createGlb(geometries, labelPng);
await writeFile(modelPath, glb);

const storedLength = glb.readUInt32LE(8);
if (glb.readUInt32LE(0) !== 0x46546c67 || storedLength !== glb.length) throw new Error("Generated GLB failed its header check.");

console.log(`Wrote ${path.relative(process.cwd(), modelPath)} (${(glb.length / 1024).toFixed(1)} KiB)`);
console.log(`Wrote ${path.relative(process.cwd(), texturePath)} (${(labelPng.length / 1024).toFixed(1)} KiB)`);
