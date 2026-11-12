import assert from "node:assert/strict";
import http from "node:http";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import ts from "typescript";
import { root, atlasPath, manifestPath, bakeSources, sha256, getBeanAtlasSourceHash, validateBeanAtlas } from "../check-coffee-bean-atlas.mjs";

const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve("next/package.json"))("sharp");
const threeRoot = path.dirname(path.dirname(require.resolve("three")));
const token = randomBytes(24).toString("hex");
const sourceHash = await getBeanAtlasSourceHash();
const sourcePaths = new Set(bakeSources.filter(file => file.endsWith(".ts")));

const server = http.createServer(async (request, response) => {
    try {
        const url = new URL(request.url, "http://127.0.0.1");
        response.setHeader("Cache-Control", "no-store");
        if (request.method === "POST" && url.pathname === "/atlas") {
            assert.equal(url.searchParams.get("token"), token, "Invalid bake token");
            assert.equal(request.headers.origin, `http://127.0.0.1:${server.address().port}`);
            assert.equal(request.headers["content-type"], "application/octet-stream");
            const size = Number(url.searchParams.get("size"));
            assert(Number.isInteger(size) && size > 0 && size <= 2048, "Invalid atlas dimensions");
            assert.equal(Number(request.headers["content-length"]), size * size * 4);
            const parts = [];
            let length = 0;
            for await (const chunk of request) {
                length += chunk.length;
                assert(length <= size * size * 4, "Atlas upload is too large");
                parts.push(chunk);
            }
            const pixels = Buffer.concat(parts);
            assert.equal(pixels.length, size * size * 4);
            assert(pixels.some((value, index) => index % 4 === 3 && value > 0), "Atlas cannot be empty");
            // WebGL rows start at the bottom. Encode the flipped raw bytes without a canvas round-trip.
            const rgba = Buffer.alloc(pixels.length);
            for (let row = 0; row < size; row++) pixels.copy(rgba, row * size * 4, (size - row - 1) * size * 4, (size - row) * size * 4);
            const image = await sharp(rgba, { raw: { width: size, height: size, channels: 4 } }).webp({ lossless: true, effort: 6 }).toBuffer();
            assert((await sharp(image).raw().toBuffer()).equals(rgba), "Lossless WebP must preserve every source RGBA byte");
            assert.equal(await getBeanAtlasSourceHash(), sourceHash, "Bake inputs changed while the generator was open; restart it");
            const count = Number(url.searchParams.get("count"));
            const manifest = { version: 2, format: "webp-lossless", width: size, height: size, tileSize: Number(url.searchParams.get("tileSize")), columns: Number(url.searchParams.get("columns")), count, sourceSHA256: sourceHash, imageSHA256: sha256(image), rgbaSHA256: sha256(rgba) };
            validateBeanAtlas(manifest, image, sourceHash);
            await writeFile(path.join(root, atlasPath), image);
            await writeFile(path.join(root, manifestPath), JSON.stringify(manifest, null, 2) + "\n");
            console.log(`Saved ${atlasPath}: ${image.length} bytes, ${count} tiles, lossless RGBA verified.`);
            response.setHeader("Content-Type", "application/json");
            return response.end(JSON.stringify({ url: "/images/3d/coffee-beans-atlas.webp", ...manifest }));
        }
        assert.equal(request.method, "GET", "Unsupported request");
        if (url.pathname === "/") {
            response.setHeader("Content-Type", "text/html; charset=utf-8");
            return response.end(`<!doctype html><meta charset="utf-8"><title>Coffee atlas bake</title>
                <h1>Offline coffee bean atlas</h1><button id="generate">Generate atlas</button><pre id="result">Ready</pre>
                <script type="importmap">{"imports":{"three":"/vendor/build/three.module.js","three/addons/":"/vendor/examples/jsm/"}}</script>
                <script type="module">
                    import { generateCoffeeBeanAtlas } from '/source/scripts/coffee-scene-update/bake-bean-atlas.ts';
                    const button = document.querySelector('#generate'), result = document.querySelector('#result');
                    button.onclick = async () => { button.disabled = true; result.textContent = 'Baking…';
                        try { result.textContent = JSON.stringify(await generateCoffeeBeanAtlas(${JSON.stringify(token)}), null, 2); }
                        catch (error) { result.textContent = 'ERROR: ' + error.stack; }
                        finally { button.disabled = false; }
                    };
                </script>`);
        }
        if (url.pathname.startsWith("/source/")) {
            const relative = url.pathname.slice("/source/".length);
            assert(sourcePaths.has(relative), "Unknown source module");
            let source = await readFile(path.join(root, relative), "utf8");
            source = source.replace(/from\s+(["'])(\.[^"']+)\1/g, (_, quote, specifier) => `from ${quote}${specifier.endsWith(".ts") ? specifier : specifier + ".ts"}${quote}`);
            response.setHeader("Content-Type", "text/javascript");
            return response.end(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText);
        }
        if (url.pathname.startsWith("/vendor/")) {
            const file = path.resolve(threeRoot, "." + url.pathname.slice("/vendor".length));
            assert(file.startsWith(threeRoot + path.sep) && file.endsWith(".js"));
            response.setHeader("Content-Type", "text/javascript");
            return response.end(await readFile(file));
        }
        const assets = new Map([
            ["/images/3d/robusta-product-scene.glb", "public/images/3d/robusta-product-scene.glb"],
            ["/images/3d/coffee-beans-atlas.webp", atlasPath],
        ]);
        assert(assets.has(url.pathname), "Unknown asset");
        response.setHeader("Content-Type", url.pathname.endsWith(".webp") ? "image/webp" : "model/gltf-binary");
        response.end(await readFile(path.join(root, assets.get(url.pathname))));
    } catch (error) {
        response.statusCode = 400;
        response.end(error.message);
    }
});
server.listen(4175, "127.0.0.1", () => console.log("Open http://127.0.0.1:4175/ and click Generate atlas. Ctrl+C to stop. No server is used in production."));
