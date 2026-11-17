import assert from "node:assert/strict";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve("next/package.json"))("sharp");
const placeholders = {};
const responsive = {};
const responsiveFolder = new URL("../public/images/responsive/", import.meta.url);
await mkdir(responsiveFolder, { recursive: true });

for (const directory of ["coffee", "products", "3d"]) {
    const folder = new URL(`../public/images/${directory}/`, import.meta.url);
    for (const name of (await readdir(folder)).sort()) {
        if (!/\.(webp|png|jpe?g)$/i.test(name) || (directory === "3d" && !name.includes("poster"))) continue;
        const { data, info } = await sharp(fileURLToPath(new URL(name, folder)))
            .rotate()
            .resize(24, 24, { fit: "inside", withoutEnlargement: true })
            .webp({ quality: 35 })
            .toBuffer({ resolveWithObject: true });
        assert(info.width <= 24 && info.height <= 24 && data.length < 2048);
        placeholders[`/images/${directory}/${name}`] = `data:image/webp;base64,${data.toString("base64")}`;
        if (directory === "products" && /\.webp$/i.test(name)) {
            const input = fileURLToPath(new URL(name, folder));
            const metadata = await sharp(input).metadata();
            const candidates = [];
            for (const width of [320, 640, 960].filter(width => width < metadata.width)) {
                const variant = `${name.replace(/\.[^.]+$/, "")}-${width}.webp`;
                const output = await sharp(input).resize({ width }).webp({ quality: 90, alphaQuality: 100, effort: 5 }).toFile(fileURLToPath(new URL(variant, responsiveFolder)));
                assert.equal(output.width, width);
                assert(Math.abs(output.height / output.width - metadata.height / metadata.width) < 1 / width);
                candidates.push(`/images/responsive/${variant} ${width}w`);
            }
            candidates.push(`/images/products/${name} ${metadata.width}w`);
            responsive[`/images/products/${name}`] = candidates.join(", ");
        }
    }
}

assert(Object.keys(placeholders).length > 0);
await writeFile(new URL("../src/data/image-placeholders.json", import.meta.url), `${JSON.stringify(placeholders, null, 2)}\n`);
await writeFile(new URL("../src/data/responsive-images.json", import.meta.url), `${JSON.stringify(responsive, null, 2)}\n`);
console.log(`Generated ${Object.keys(placeholders).length} tiny image previews.`);
