import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const root = fileURLToPath(new URL("../", import.meta.url));
export const framingCSSPath = "src/components/experience/coffee-bag/coffee-framing.generated.css";
export const framingSources = [
    "public/images/3d/robusta-product-scene.glb",
    "src/components/experience/coffee-bag/coffee-camera.ts",
    "scripts/generate-coffee-framing-css.mjs",
];
export const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
export async function getCoffeeFramingSourceHash() {
    const require = createRequire(import.meta.url);
    const version = JSON.parse(await readFile(path.join(path.dirname(require.resolve("three")), "../package.json"), "utf8")).version;
    const inputs = await Promise.all(framingSources.map(async file => [file, sha256((await readFile(path.join(root, file))).toString(file.endsWith(".glb") ? "base64" : "utf8").replace(/\r\n/g, "\n"))]));
    return sha256(JSON.stringify({ version, inputs }));
}
export function validateCoffeeFramingCSS(css, sourceHash) {
    const match = css.match(/^\/\* Generated coffee framing; source: ([a-f0-9]{64}); body: ([a-f0-9]{64}) \*\/\n/);
    const regenerate = "Run node scripts/generate-coffee-framing-css.mjs";
    assert(match, `Missing generated coffee framing header. ${regenerate}`);
    assert.equal(match[1], sourceHash, `Coffee framing is stale. ${regenerate}`);
    assert.equal(match[2], sha256(css.slice(match[0].length)), `Coffee framing CSS was edited. ${regenerate}`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    validateCoffeeFramingCSS((await readFile(path.join(root, framingCSSPath), "utf8")).replace(/\r\n/g, "\n"), await getCoffeeFramingSourceHash());
    console.log("Coffee framing CSS: asset, camera and generator verified.");
}
