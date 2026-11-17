import assert from "node:assert/strict";
import http from "node:http";
import path from "node:path";
import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import ts from "typescript";

const root = fileURLToPath(new URL("../../", import.meta.url));
const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve("next/package.json"))("sharp");
const threeRoot = path.dirname(path.dirname(require.resolve("three")));
const token = randomBytes(24).toString("hex");
const prefix = "src/components/experience/coffee-bag/";
const sources = new Set([
    "scripts/coffee-scene-update/bake-parallax-scene.ts",
    ...["createCoffeeStudio.ts", "coffee-camera.ts", "coffee-bean-depth.ts", "coffee-bean-depth-plan.ts", "coffee-bean-atlas.ts", "coffee-bean-atlas.generated.json"].map(name => prefix + name),
]);
const manifest = { sourceSHA256: "", desktop: {}, mobile: {} };
const fullPhotos = new Map();
const server = http.createServer(async (request, response) => {
    try {
        const url = new URL(request.url, "http://127.0.0.1");
        response.setHeader("Cache-Control", "no-store");
        if (request.method === "POST" && url.pathname === "/render") {
            assert.equal(url.searchParams.get("token"), token);
            assert.equal(request.headers.origin, "http://127.0.0.1:4176");
            assert.equal(request.headers["content-type"], "image/png");
            const variant = url.searchParams.get("variant"), layer = url.searchParams.get("layer");
            assert(["desktop", "mobile"].includes(variant) && ["products", "blue", "orange", "cup", "green", "middle", "back", "front"].includes(layer));
            const parts = []; let size = 0;
            for await (const part of request) { size += part.length; assert(size <= 20_000_000); parts.push(part); }
            const png = Buffer.concat(parts), info = await sharp(png).metadata();
            assert(info.format === "png" && info.hasAlpha && info.width <= 4000 && info.height <= 4200 && info.width * info.height <= 17_000_000);
            const cutout = ["blue", "orange", "cup", "green"].includes(layer);
            const stats = await sharp(png).stats();
            assert(cutout ? stats.channels[0].min === 0 && stats.channels[0].max > 0 : stats.channels[3].min === 0 && stats.channels[3].max > 0, "Each layer or product mask must be nonempty");
            const photo = layer === "products" || cutout;
            if (layer === "products") fullPhotos.set(variant, png);
            let capture = png;
            if (cutout) {
                const fullPhoto = fullPhotos.get(variant);
                assert(fullPhoto, "Export the interacted full scene before its product masks");
                const photoInfo = await sharp(fullPhoto).metadata();
                assert(photoInfo.width === info.width && photoInfo.height === info.height, "Mask must match the full scene camera and resolution");
                const alpha = await sharp(png).removeAlpha().extractChannel(0).png().toBuffer();
                const mask = await sharp({ create: { width: info.width, height: info.height, channels: 3, background: "white" } }).joinChannel(alpha).png().toBuffer();
                capture = await sharp(fullPhoto).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
            }
            let pipeline = sharp(capture);
            if (photo) pipeline = pipeline.resize({ width: variant === "desktop" ? 2560 : 1170, kernel: "lanczos3" }).sharpen({ sigma: 0.45 });
            const full = await pipeline.png().toBuffer({ resolveWithObject: true });
            const cropped = await (cutout ? sharp(full.data).trim({ threshold: 1 }) : sharp(full.data)).png().toBuffer({ resolveWithObject: true });
            const image = await sharp(cropped.data).webp({ quality: photo ? 96 : 90, smartSubsample: photo, alphaQuality: 100, effort: 6 }).toBuffer();
            const output = await sharp(image).metadata();
            const file = `coffee-${layer}-${variant}.webp`;
            await mkdir(path.join(root, "public/images/parallax"), { recursive: true });
            await writeFile(path.join(root, "public/images/parallax", file), image);
            manifest[variant][layer] = { src: `/images/parallax/${file}`, width: output.width, height: output.height, bytes: image.length,
                frameWidth: full.info.width, frameHeight: full.info.height,
                left: -(cropped.info.trimOffsetLeft || 0) / full.info.width * 100, top: -(cropped.info.trimOffsetTop || 0) / full.info.height * 100,
                displayWidth: output.width / full.info.width * 100, displayHeight: output.height / full.info.height * 100 };
            if (["desktop", "mobile"].every(name => Object.keys(manifest[name]).length === 8)) {
                const hash = createHash("sha256");
                for (const input of [...sources, "public/images/3d/robusta-product-scene.glb", "public/images/3d/coffee-beans-atlas.webp"]) hash.update(await readFile(path.join(root, input)));
                manifest.sourceSHA256 = hash.digest("hex");
                await writeFile(path.join(root, "src/data/coffee-parallax.json"), JSON.stringify(manifest, null, 2) + "\n");
            }
            console.log(`Saved ${file}: ${image.length} bytes, ${output.width}×${output.height}, alpha verified`);
            response.setHeader("Content-Type", "application/json");
            return response.end(JSON.stringify(manifest[variant][layer]));
        }
        assert.equal(request.method, "GET");
        if (url.pathname === "/") {
            response.setHeader("Content-Type", "text/html; charset=utf-8");
            return response.end(`<!doctype html><meta charset="utf-8"><title>Coffee 2.5D bake</title><button id="bake">Render transparent layers</button><pre id="result">Ready</pre>
                <script type="importmap">{"imports":{"three":"/vendor/build/three.module.js","three/addons/":"/vendor/examples/jsm/"}}</script>
                <script type="module">import { bakeParallaxScene } from '/source/scripts/coffee-scene-update/bake-parallax-scene.ts';document.querySelector('#bake').onclick=async()=>{const result=document.querySelector('#result');result.textContent='Rendering…';try{result.textContent=JSON.stringify(await bakeParallaxScene(${JSON.stringify(token)}),null,2)}catch(error){result.textContent='ERROR: '+error.stack}};</script>`);
        }
        if (url.pathname.startsWith("/source/")) {
            const relative = url.pathname.slice(8); assert(sources.has(relative));
            let source = await readFile(path.join(root, relative), "utf8");
            response.setHeader("Content-Type", "text/javascript");
            if (relative.endsWith(".json")) return response.end(`export default ${source}`);
            source = source.replace(/from\s+(["'])(\.[^"']+)\1/g, (_, quote, name) => `from ${quote}${/\.(ts|json)$/.test(name) ? name : name + ".ts"}${quote}`);
            return response.end(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText);
        }
        if (url.pathname.startsWith("/vendor/")) {
            const file = path.resolve(threeRoot, "." + url.pathname.slice(7)); assert(file.startsWith(threeRoot + path.sep) && file.endsWith(".js"));
            response.setHeader("Content-Type", "text/javascript"); return response.end(await readFile(file));
        }
        const name = url.pathname.split("/").pop();
        assert(url.pathname === `/images/3d/${name}` && ["robusta-product-scene.glb", "coffee-beans-atlas.webp"].includes(name));
        response.setHeader("Content-Type", name.endsWith(".webp") ? "image/webp" : "model/gltf-binary");
        response.end(await readFile(path.join(root, "public/images/3d", name)));
    } catch (error) { response.statusCode = 400; response.end(error.message); }
});
server.listen(4176, "127.0.0.1", () => console.log("Offline renderer: http://127.0.0.1:4176/ — no background layer"));
