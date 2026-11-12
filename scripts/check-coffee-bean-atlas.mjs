import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

export const root = fileURLToPath(new URL("../", import.meta.url));
export const atlasPath = "public/images/3d/coffee-beans-atlas.webp";
export const manifestPath = "src/components/experience/coffee-bag/coffee-bean-atlas.generated.json";
export const bakeSources = [
    "public/images/3d/robusta-product-scene.glb",
    "src/components/experience/coffee-bag/coffee-bean-atlas.ts",
    "src/components/experience/coffee-bag/coffee-bean-depth-plan.ts",
    "src/components/experience/coffee-bag/createCoffeeStudio.ts",
    "src/components/experience/coffee-bag/coffee-camera.ts",
    "scripts/coffee-scene-update/bake-bean-atlas.ts",
    "scripts/coffee-scene-update/generate-bean-atlas.mjs",
];
export const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");

export async function getBeanAtlasSourceHash() {
    const require = createRequire(import.meta.url);
    const threePackage = path.join(path.dirname(require.resolve("three")), "../package.json");
    const version = JSON.parse(await readFile(threePackage, "utf8")).version;
    const inputs = await Promise.all(bakeSources.map(async file => {
        const bytes = await readFile(path.join(root, file));
        return [file, sha256(file.endsWith(".glb") ? bytes : bytes.toString("utf8").replace(/\r\n/g, "\n"))];
    }));
    return sha256(JSON.stringify({ three: version, inputs }));
}

export function validateBeanAtlas(manifest, image, sourceHash) {
    const regenerate = "Run pnpm bake:coffee-atlas, open its local page and generate the atlas.";
    assert.equal(manifest.version, 2);
    assert.equal(manifest.format, "webp-lossless");
    assert.equal(manifest.sourceSHA256, sourceHash, `Coffee bean atlas is stale. ${regenerate}`);
    assert.equal(manifest.imageSHA256, sha256(image), `Coffee bean atlas image changed or is corrupt. ${regenerate}`);
    // Canonical lossless WebP header: https://developers.google.com/speed/webp/docs/webp_lossless_bitstream_specification#riff-header
    assert(image.length >= 25 && image.toString("ascii", 0, 4) === "RIFF" && image.toString("ascii", 8, 16) === "WEBPVP8L", "Atlas must be lossless VP8L WebP");
    assert.equal(image.readUInt32LE(4) + 8, image.length);
    assert.equal(image[20], 0x2f);
    const dimensions = image.readUInt32LE(21);
    assert.equal((dimensions & 0x3fff) + 1, manifest.width);
    assert.equal(((dimensions >>> 14) & 0x3fff) + 1, manifest.height);
    assert.equal(dimensions >>> 29, 0, "Unsupported lossless WebP version");
    assert.equal(manifest.width, manifest.tileSize * manifest.columns);
    assert.equal(manifest.height, manifest.width);
    assert(Number.isInteger(manifest.count) && manifest.count > 0 && manifest.count <= manifest.columns ** 2);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try {
        const manifest = JSON.parse(await readFile(path.join(root, manifestPath), "utf8"));
        validateBeanAtlas(manifest, await readFile(path.join(root, atlasPath)), await getBeanAtlasSourceHash());
        console.log(`Coffee bean atlas: ${manifest.count} tiles, ${manifest.width}x${manifest.height}, inputs verified.`);
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}
