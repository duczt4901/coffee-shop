import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { importTypeScript } from "./lib/import-typescript.mjs";
import { root, framingCSSPath, getCoffeeFramingSourceHash, sha256 } from "./check-coffee-framing-css.mjs";

export async function generateCoffeeFramingCSS() {
    const { getCoffeeProductCorners, getCoffeeWidthRatio, measureCoffeeLayout } = await importTypeScript(new URL("../src/components/experience/coffee-bag/coffee-camera.ts", import.meta.url));
    const loader = new GLTFLoader();
    loader.register(() => ({ name: "GeometryOnly", loadTexture: () => Promise.resolve(new THREE.Texture()) }));
    const bytes = await readFile(path.join(root, "public/images/3d/robusta-product-scene.glb"));
    const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "");
    const products = gltf.scene.getObjectByName("Product_Display");
    assert(products?.userData.framingBounds, "The generated shell needs the approved framing bounds");
    const bounds = products.userData.framingBounds;
    gltf.scene.position.sub(new THREE.Box3(new THREE.Vector3().fromArray(bounds.min), new THREE.Vector3().fromArray(bounds.max)).getCenter(new THREE.Vector3()));
    const corners = getCoffeeProductCorners(products);
    // The fit is homogeneous in width × responsive width ratio; a large reference removes integer rounding error.
    const referenceWidth = 1_000_000;
    const scale = measureCoffeeLayout(corners, referenceWidth, 1).height / (referenceWidth * getCoffeeWidthRatio(referenceWidth));
    const geometryHeight = width => scale * width * getCoffeeWidthRatio(width);
    const starts = [0, ...Array.from({ length: 31 }, (_, index) => 480 + index * 48)];
    const segments = starts.map((start, index) => {
        const end = starts[index + 1] ?? start + 480;
        const slope = (geometryHeight(end) - geometryHeight(start)) / (end - start);
        return { start, slope, intercept: geometryHeight(start) - slope * start + 0.25 };
    });
    let maxError = 0;
    const widths = new Set([240, 320, 390, 768, 1024, 1440, 1920, 2560, 3840, 5120, ...starts.flatMap(start => [Math.max(1, start), start + 24, start + 47.5])]);
    for (const width of widths) {
        const segment = segments.findLast(segment => segment.start <= width);
        const geometry = segment.slope * width + segment.intercept;
        for (const minimum of [1, 844]) {
            const original = measureCoffeeLayout(corners, width, minimum);
            const reserved = Math.max(minimum, geometry);
            maxError = Math.max(maxError, Math.abs(reserved - original.height));
            assert(Math.abs(reserved - original.height) <= 1, `CSS shell differs by more than 1px at ${width}×${minimum}`);
            assert(measureCoffeeLayout(corners, width, Math.ceil(reserved)).height - original.height <= 1, `Enhanced frame changed at ${width}`);
        }
    }
    const declaration = (segment, unit) => `[data-coffee-canvas] { --coffee-geometry-height: calc(${(segment.slope * 100).toFixed(8)}${unit} + ${segment.intercept.toFixed(8)}px); }`;
    const media = segments.map((segment, index) => index ? `@media (min-width: ${segment.start}px) { ${declaration(segment, "vw")} }` : declaration(segment, "vw")).join("\n");
    const containers = segments.map(segment => `    @container (min-width: ${segment.start}px) { ${declaration(segment, "cqw")} }`).join("\n");
    const body = `/* Offline fit of the approved GLB/orbit; <=1px from the solver. Regenerate, never hand-edit. */\n${media}\n@supports (container-type: inline-size) {\n${containers}\n}\n`;
    const css = `/* Generated coffee framing; source: ${await getCoffeeFramingSourceHash()}; body: ${sha256(body)} */\n${body}`;
    return { css, maxError, samples: widths.size * 2 };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const { css, maxError, samples } = await generateCoffeeFramingCSS();
    await writeFile(path.join(root, framingCSSPath), css);
    console.log(`Generated coffee framing: ${samples} geometry checks, max ${maxError.toFixed(3)}px difference.`);
}
