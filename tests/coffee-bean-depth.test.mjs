import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { importTypeScript, typeScriptModuleURL } from "../scripts/lib/import-typescript.mjs";
const { getCoffeeBeanPosition, planCoffeeBeanDepth } = await importTypeScript(new URL("../src/components/experience/coffee-bag/coffee-bean-depth-plan.ts", import.meta.url));
const { getCoffeePixelRatio } = await importTypeScript(new URL("../src/components/experience/coffee-bag/coffee-render-quality.ts", import.meta.url));
const { CAMERA_FOV, getCoffeeCameraDistance, getCoffeeProductCorners, measureCoffeeLayout, setOrbitDirection } = await importTypeScript(new URL("../src/components/experience/coffee-bag/coffee-camera.ts", import.meta.url));
import { getBeanAtlasSourceHash, sha256, validateBeanAtlas } from "../scripts/check-coffee-bean-atlas.mjs";

test("optional bean depth restores original instances after failed setup or disposal", async () => {
    const manifest = fs.readFileSync("src/components/experience/coffee-bag/coffee-bean-atlas.generated.json", "utf8");
    const { createCoffeeBeanDepth } = await importTypeScript(new URL("../src/components/experience/coffee-bag/coffee-bean-depth.ts", import.meta.url), {
        "./coffee-bean-depth-plan": typeScriptModuleURL(new URL("../src/components/experience/coffee-bag/coffee-bean-depth-plan.ts", import.meta.url)),
        "./coffee-bean-atlas": typeScriptModuleURL(new URL("../src/components/experience/coffee-bag/coffee-bean-atlas.ts", import.meta.url)),
        "./coffee-bean-atlas.generated.json": `data:text/javascript,${encodeURIComponent(`export default ${manifest}`)}`,
    });
    const products = new THREE.Group();
    const beans = new THREE.Group();
    beans.name = "Beans_Floating";
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial(), 26);
    for (let i = 0; i < 26; i++) mesh.setMatrixAt(i, new THREE.Matrix4().makeTranslation(i - 13, i % 3, i % 5));
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
    const matrices = [...mesh.instanceMatrix.array];
    const box = mesh.boundingBox.clone();
    const sphere = mesh.boundingSphere.clone();
    beans.add(mesh);
    products.add(beans);
    const compute = mesh.computeBoundingSphere;
    mesh.computeBoundingSphere = () => { throw new Error("injected optional setup failure"); };
    assert.throws(() => createCoffeeBeanDepth(products, 1, new THREE.Texture()), /injected optional setup failure/);
    assert.equal(mesh.count, 26);
    assert.deepEqual([...mesh.instanceMatrix.array], matrices);
    assert(mesh.boundingBox.equals(box));
    assert(mesh.boundingSphere.equals(sphere));
    mesh.computeBoundingSphere = compute;
    const depth = createCoffeeBeanDepth(products, 1, new THREE.Texture());
    assert.equal(mesh.count, 13);
    depth.dispose();
    depth.dispose();
    assert.equal(mesh.count, 26);
    assert.deepEqual([...mesh.instanceMatrix.array], matrices);
});

test("offline atlas matches its sources and rejects stale or changed assets", async () => {
    const manifest = JSON.parse(fs.readFileSync("src/components/experience/coffee-bag/coffee-bean-atlas.generated.json", "utf8"));
    const image = fs.readFileSync("public/images/3d/coffee-beans-atlas.webp");
    const sourceHash = await getBeanAtlasSourceHash();
    assert.equal(manifest.count, 13);
    assert.equal(manifest.width, 512);
    validateBeanAtlas(manifest, image, sourceHash);
    assert.throws(() => validateBeanAtlas(manifest, image, "changed-input"), /atlas is stale/);
    const changed = Buffer.from(image);
    changed[changed.length - 1] ^= 1;
    assert.throws(() => validateBeanAtlas(manifest, changed, sourceHash), /image changed or is corrupt/);
    const lossy = Buffer.from(image);
    lossy.write("VP8 ", 12, "ascii");
    assert.throws(() => validateBeanAtlas({ ...manifest, imageSHA256: sha256(lossy) }, lossy, sourceHash), /lossless VP8L/);
});

test("real scene has exactly half out-of-focus beans, irregular depth, and clear foreground labels throughout the orbit", async () => {
    const loader = new GLTFLoader();
    loader.register(() => ({ name: "GeometryOnly", loadTexture: () => Promise.resolve(new THREE.Texture()) }));
    const buffer = fs.readFileSync("public/images/3d/robusta-product-scene.glb");
    const { scene } = await loader.parseAsync(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), "");
    const products = scene.getObjectByName("Product_Display");
    const framing = products.userData.framingBounds;
    const bounds = new THREE.Box3(new THREE.Vector3().fromArray(framing.min), new THREE.Vector3().fromArray(framing.max));
    scene.position.sub(bounds.getCenter(new THREE.Vector3()));
    const radius = bounds.getBoundingSphere(new THREE.Sphere()).radius;
    const originalCorners = getCoffeeProductCorners(products);
    const plan = planCoffeeBeanDepth(products, radius);
    const foreground = plan.filter(bean => bean.layer === "foreground");
    const background = plan.filter(bean => bean.layer === "background");
    assert.equal(plan.length, 26);
    assert.equal(plan.filter(bean => bean.layer === "focus").length, 13);
    assert.equal(foreground.length, 4);
    assert.equal(background.length, 9);
    assert(new Set(plan.map(bean => bean.blur)).size >= 5, "Blur strength must vary");
    for (const layer of [foreground, background]) {
        assert(layer.some(bean => bean.position.x < 0) && layer.some(bean => bean.position.x > 0), "Each depth layer spans both sides");
        assert(new Set(layer.map(bean => bean.position.z.toFixed(3))).size >= 4);
    }
    assert.deepEqual(getCoffeeProductCorners(products), originalCorners, "Planning cannot mutate hero geometry or framing");
    assert.deepEqual(planCoffeeBeanDepth(products, radius).map(b => b.position), plan.map(b => b.position), "Layout must not change randomly on remount");
    const labels = [];
    products.traverse(object => {
        if (!object.isMesh || object.isInstancedMesh) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        if (!materials.some(material => material.name.endsWith("_Approved_Label"))) return;
        // Text occupies x .18–.84 / y .43–.82 in the existing approved artwork.
        const box = new THREE.Box3();
        const uv = new THREE.Vector2();
        const vertex = new THREE.Vector3();
        for (let index = 0; index < object.geometry.index.count; index++) {
            const id = object.geometry.index.getX(index);
            uv.fromBufferAttribute(object.geometry.attributes.uv, id);
            if (uv.x * 2 < .16 || uv.x * 2 > .86 || uv.y < .41 || uv.y > .84) continue;
            vertex.fromBufferAttribute(object.geometry.attributes.position, id).applyMatrix4(object.matrixWorld);
            box.expandByPoint(vertex);
        }
        assert(!box.isEmpty());
        labels.push(box.expandByScalar(.003));
    });
    assert.equal(labels.length, 3);
    for (const [width, minimumHeight] of [[320, 568], [390, 844], [480, 600], [768, 600], [1024, 600], [1200, 844], [1440, 844], [1920, 844]]) {
        const layout = measureCoffeeLayout(originalCorners, width, minimumHeight);
        const camera = new THREE.PerspectiveCamera(CAMERA_FOV, width / layout.height, 0.01, 100);
        camera.setViewOffset(width, layout.height, 0, layout.offsetY, width, layout.height);
        const projectBox = box => {
            const result = new THREE.Box2();
            for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
                const point = new THREE.Vector3(x, y, z).project(camera);
                result.expandByPoint(new THREE.Vector2(point.x, point.y));
            }
            return result;
        };
        for (let step = 0; step <= 64; step++) {
            const progress = step / 64;
            setOrbitDirection(camera.position, progress).multiplyScalar(getCoffeeCameraDistance(layout.distances, progress));
            camera.lookAt(0, 0, 0);
            camera.updateMatrixWorld(true);
            const projectedLabels = labels.map(projectBox);
            let visibleForeground = 0;
            for (const bean of foreground) {
                const position = getCoffeeBeanPosition(bean, width);
                const center = position.clone().project(camera);
                // The complete padded card is larger than the visible blurred silhouette.
                const halfWidth = bean.size * camera.projectionMatrix.elements[0] / (2 * position.distanceTo(camera.position));
                const halfHeight = halfWidth * width / layout.height;
                const card = new THREE.Box2(new THREE.Vector2(center.x - halfWidth, center.y - halfHeight), new THREE.Vector2(center.x + halfWidth, center.y + halfHeight));
                const viewport = new THREE.Box2(new THREE.Vector2(-1, -1), new THREE.Vector2(1, 1));
                if (card.intersectsBox(viewport)) assert(!projectedLabels.some(label => label.intersect(viewport).intersectsBox(card)), `${width}, orbit ${progress}: ${bean.mesh.name}/${bean.index} foreground blur overlaps a product label`);
                if (viewport.containsPoint(new THREE.Vector2(center.x, center.y))) visibleForeground++;
            }
            assert(visibleForeground >= 1, `${width}, orbit ${progress}: foreground depth must remain visible`);
        }
    }
});

test("pixel budget uses native 1x and caps retina buffers without reducing below CSS resolution", () => {
    assert.equal(getCoffeePixelRatio(1920, 1626, 1), 1);
    assert.equal(getCoffeePixelRatio(390, 844, 3), 2);
    const ratio = getCoffeePixelRatio(1920, 1626, 2);
    assert(Math.abs(1920 * 1626 * ratio ** 2 - 4_500_000) < 1);
    assert.equal(getCoffeePixelRatio(3840, 2160, 2), 1);
});

