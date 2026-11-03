import assert from "node:assert/strict";
import fs from "node:fs";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { CAMERA_FOV, getCoffeeCameraDistance, getCoffeeProductCorners, getCoffeeWidthRatio, measureCoffeeLayout, setOrbitDirection } from "../src/components/experience/coffee-bag/coffee-camera.ts";

// Load the real geometry and instances without decoding images or creating WebGL.
const loader = new GLTFLoader();
loader.register(() => ({ name: "GeometryOnlyTextures", loadTexture: () => Promise.resolve(new THREE.Texture()) }));
const asset = fs.readFileSync("public/images/3d/robusta-product-scene.glb");
const gltf = await loader.parseAsync(asset.buffer.slice(asset.byteOffset, asset.byteOffset + asset.byteLength), "");
const products = gltf.scene.getObjectByName("Product_Display");
assert(products, "The scene must contain its product group");
const framing = products.userData.framingBounds;
const originalBounds = new THREE.Box3(new THREE.Vector3().fromArray(framing.min), new THREE.Vector3().fromArray(framing.max));
gltf.scene.position.sub(originalBounds.getCenter(new THREE.Vector3()));
const corners = getCoffeeProductCorners(products);
assert(corners.length > 24, "Test the complete GLB, including its instances");
assert.throws(() => measureCoffeeLayout([], 1920, 1080), /requires model geometry/);
assert.equal(getCoffeeWidthRatio(320), 1.2);
assert.equal(getCoffeeWidthRatio(480), 1.2);
assert.equal(getCoffeeWidthRatio(1200), 1);
assert.equal(getCoffeeWidthRatio(1920), 0.8);
assert.equal(getCoffeeWidthRatio(3840), 0.8);

const reports = [];
for (const width of [320, 390, 480, 768, 1024, 1440, 1920, 2560, 3840]) {
    const layouts = [];
    for (const minimumHeight of [600, 844, 1080]) {
        const started = performance.now();
        const layout = measureCoffeeLayout(corners, width, minimumHeight);
        const elapsed = performance.now() - started;
        layouts.push(layout);
        assert(Number.isInteger(layout.height) && layout.height >= minimumHeight, "Canvas must respect the CSS minimum");
        const camera = new THREE.PerspectiveCamera(CAMERA_FOV, width / layout.height, 0.01, 1000);
        camera.setViewOffset(width, layout.height, 0, layout.offsetY, width, layout.height);
        const fixedOffset = camera.view.offsetY;
        let referenceBottom = Infinity;
        for (let index = 0; index <= 256; index++) {
            const progress = index / 256;
            const distance = getCoffeeCameraDistance(layout.distances, progress);
            setOrbitDirection(camera.position, progress).multiplyScalar(distance);
            camera.lookAt(0, 0, 0);
            camera.updateMatrixWorld(true);
            let left = Infinity;
            let right = -Infinity;
            let bottom = Infinity;
            let top = -Infinity;
            for (const corner of corners) {
                const point = corner.clone().project(camera);
                left = Math.min(left, point.x);
                right = Math.max(right, point.x);
                bottom = Math.min(bottom, point.y);
                top = Math.max(top, point.y);
            }
            const label = `${width}x${minimumHeight}, progress ${progress}`;
            assert(Math.abs((right - left) / 2 - getCoffeeWidthRatio(width)) < 0.005, `${label}: responsive width`);
            assert(bottom >= -1 - 2 / layout.height && top <= 1 + 2 / layout.height, `${label}: canvas clips vertical geometry`);
            assert.equal(camera.fov, CAMERA_FOV, `${label}: FOV changed`);
            assert.equal(camera.view.offsetY, fixedOffset, `${label}: scroll changed the reference framing`);
            referenceBottom = Math.min(referenceBottom, bottom);
        }
        assert(Math.abs(referenceBottom + 1) < 2 / layout.height, "The lowest reference view must meet the canvas bottom");
        if (minimumHeight === 844) reports.push({ width, ratio: +getCoffeeWidthRatio(width).toFixed(3), canvasHeight: layout.height, projectedHeight: Math.round(layout.projectedHeight), layoutMs: +elapsed.toFixed(1) });
    }
    // Once geometry determines the height, a different smaller minimum cannot change it.
    for (let index = 1; index < layouts.length; index++) {
        if (layouts[index].height > [600, 844, 1080][index]) assert.equal(layouts[index].height, layouts[0].height, `${width}: height still depends on an unrelated viewport reference`);
    }
}
const css = fs.readFileSync("src/components/experience/CoffeeBagExperience.module.css", "utf8");
const component = fs.readFileSync("src/components/experience/coffee-bag/LocalCoffeeModel.tsx", "utf8");
assert(!/\.(?:stage|scene|canvas)\s*\{[^}]*position:\s*(sticky|fixed)|100svh|112\.5rem/.test(css), "Remove canvas and parent pinning and artificial scroll height");
assert(/min-height:\s*100vh/.test(css), "Keep the requested canvas minimum");
assert(!/getScrollViewportHeight|(?:mount|container)\.clientHeight|style\.translate|camera\.translateY|camera\.fov\s*=/.test(component), "No parent-height input, scroll positioning, bottom snapping or FOV compensation");
console.table(reports);
console.log(`Passed 27 layouts using ${corners.length} corners from the real GLB and 257 views per layout.`);
