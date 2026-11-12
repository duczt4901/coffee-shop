import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { createCoffeeStudio } from "../../src/components/experience/coffee-bag/createCoffeeStudio";
import { setOrbitDirection } from "../../src/components/experience/coffee-bag/coffee-camera";

import { planCoffeeBeanDepth } from "../../src/components/experience/coffee-bag/coffee-bean-depth-plan";

import { TILE_SIZE, ATLAS_COLUMNS, loadCoffeeBeanAtlas } from "../../src/components/experience/coffee-bag/coffee-bean-atlas";

/** Developer-only bake; never imported by the website. */
export function bakeCoffeeBeanAtlas(renderer: THREE.WebGLRenderer, products: THREE.Object3D, radius: number) {
    const beans = planCoffeeBeanDepth(products, radius);
    const blurred = beans.filter(bean => bean.layer !== "focus");
    if (!blurred.length) return null;
    if (blurred.length > ATLAS_COLUMNS ** 2) throw new Error("Bean atlas capacity exceeded");
    const atlas = new THREE.WebGLRenderTarget(TILE_SIZE * ATLAS_COLUMNS, TILE_SIZE * ATLAS_COLUMNS, { depthBuffer: false, generateMipmaps: false });
    const source = new THREE.WebGLRenderTarget(TILE_SIZE, TILE_SIZE, { samples: Math.min(4, renderer.capabilities.maxSamples) });
    const scratch = new THREE.WebGLRenderTarget(TILE_SIZE, TILE_SIZE, { depthBuffer: false });
    const bakeScene = new THREE.Scene();
    const studio = createCoffeeStudio(radius);
    studio.traverse(object => { if (object instanceof THREE.Light) object.castShadow = false; });
    bakeScene.add(studio);
    const bakeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.001, radius * 8);
    const direction = setOrbitDirection(new THREE.Vector3(), 0.5);
    const plane = new THREE.PlaneGeometry(2, 2);
    const blurMaterial = new THREE.ShaderMaterial({
        depthTest: false, depthWrite: false,
        uniforms: { image: { value: source.texture }, step: { value: new THREE.Vector2() } },
        vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
        fragmentShader: `uniform sampler2D image; uniform vec2 step; varying vec2 vUv;
            void main() {
                gl_FragColor = texture2D(image, vUv) * .227027027;
                gl_FragColor += (texture2D(image, vUv + step * 1.384615385) + texture2D(image, vUv - step * 1.384615385)) * .316216216;
                gl_FragColor += (texture2D(image, vUv + step * 3.230769231) + texture2D(image, vUv - step * 3.230769231)) * .070270270;
            }`,
    });
    const blurScene = new THREE.Scene();
    blurScene.add(new THREE.Mesh(plane, blurMaterial));
    const previousTarget = renderer.getRenderTarget();
    const clearColor = renderer.getClearColor(new THREE.Color());
    const clearAlpha = renderer.getClearAlpha();
    const autoClear = renderer.autoClear;
    const shadowsEnabled = renderer.shadowMap.enabled;
    const viewport = renderer.getViewport(new THREE.Vector4());
    const scissor = renderer.getScissor(new THREE.Vector4());
    const scissorTest = renderer.getScissorTest();
    try {
        renderer.shadowMap.enabled = false;
        renderer.autoClear = true;
        renderer.setClearColor(0, 0);
        renderer.setScissorTest(false);
        renderer.setRenderTarget(atlas);
        renderer.clear();
        blurred.forEach((bean, tile) => {
            const mesh = new THREE.Mesh(bean.mesh.geometry, bean.mesh.material);
            mesh.matrixAutoUpdate = false;
            mesh.matrix.copy(bean.matrix);
            bakeScene.add(mesh);
            Object.assign(bakeCamera, { left: -bean.size / 2, right: bean.size / 2, top: bean.size / 2, bottom: -bean.size / 2 });
            bakeCamera.position.copy(bean.center).addScaledVector(direction, radius * 3);
            bakeCamera.lookAt(bean.center);
            bakeCamera.updateProjectionMatrix();
            renderer.setRenderTarget(source);
            renderer.render(bakeScene, bakeCamera);
            bakeScene.remove(mesh);
            blurMaterial.uniforms.image.value = source.texture;
            blurMaterial.uniforms.step.value.set(bean.blur / TILE_SIZE, 0);
            renderer.setRenderTarget(scratch);
            renderer.render(blurScene, bakeCamera);
            blurMaterial.uniforms.image.value = scratch.texture;
            blurMaterial.uniforms.step.value.set(0, bean.blur / TILE_SIZE);
            renderer.setRenderTarget(atlas);
            renderer.setViewport((tile % ATLAS_COLUMNS) * TILE_SIZE, Math.floor(tile / ATLAS_COLUMNS) * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            renderer.autoClear = false;
            renderer.render(blurScene, bakeCamera);
            renderer.autoClear = true;
        });
    } catch (error) {
        atlas.dispose();
        throw error;
    } finally {
        renderer.setRenderTarget(previousTarget);
        renderer.setViewport(viewport);
        renderer.setScissor(scissor);
        renderer.setScissorTest(scissorTest);
        renderer.setClearColor(clearColor, clearAlpha);
        renderer.autoClear = autoClear;
        renderer.shadowMap.enabled = shadowsEnabled;
        source.dispose(); scratch.dispose(); plane.dispose(); blurMaterial.dispose();
        studio.traverse(object => { if (object instanceof THREE.DirectionalLight) object.shadow.dispose(); });
    }

    return { target: atlas, count: blurred.length };
}

export async function generateCoffeeBeanAtlas(token: string) {
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    if (renderer.capabilities.maxSamples < 4) throw new Error("Bake on a GPU supporting 4x MSAA to preserve the current quality");
    const { scene } = await new GLTFLoader().loadAsync("/images/3d/robusta-product-scene.glb");
    const products = scene.getObjectByName("Product_Display")!;
    const framing = products.userData.framingBounds;
    const bounds = new THREE.Box3(new THREE.Vector3().fromArray(framing.min), new THREE.Vector3().fromArray(framing.max));
    scene.position.sub(bounds.getCenter(new THREE.Vector3()));
    const bake = bakeCoffeeBeanAtlas(renderer, products, bounds.getBoundingSphere(new THREE.Sphere()).radius);
    if (!bake) throw new Error("No blurred beans found");
    const size = TILE_SIZE * ATLAS_COLUMNS;
    const pixels = new Uint8Array(size * size * 4);
    renderer.readRenderTargetPixels(bake.target, 0, 0, size, size, pixels);
    const result = await fetch(`/atlas?token=${token}&count=${bake.count}&size=${size}&tileSize=${TILE_SIZE}&columns=${ATLAS_COLUMNS}`, {
        method: "POST", headers: { "Content-Type": "application/octet-stream" }, body: pixels,
    });
    if (!result.ok) throw new Error(await result.text());
    const manifest = await result.json();
    const texture = await loadCoffeeBeanAtlas(manifest.url);
    const copyTarget = new THREE.WebGLRenderTarget(size, size, { depthBuffer: false });
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
        uniforms: { image: { value: texture } }, depthTest: false, depthWrite: false,
        vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }",
        fragmentShader: "uniform sampler2D image; varying vec2 vUv; void main() { gl_FragColor = texture2D(image, vUv); }",
    });
    const copyScene = new THREE.Scene();
    copyScene.add(new THREE.Mesh(geometry, material));
    renderer.setRenderTarget(copyTarget);
    renderer.render(copyScene, new THREE.Camera());
    const roundTrip = new Uint8Array(pixels.length);
    renderer.readRenderTargetPixels(copyTarget, 0, 0, size, size, roundTrip);
    let maxByteError = 0;
    for (let index = 0; index < pixels.length; index++) maxByteError = Math.max(maxByteError, Math.abs(pixels[index] - roundTrip[index]));
    copyTarget.dispose(); bake.target.dispose(); material.dispose(); geometry.dispose();
    texture.dispose(); texture.image.close(); renderer.dispose();
    if (maxByteError !== 0) throw new Error(`WebP/GPU round-trip changed source bytes: maximum error ${maxByteError}`);
    return { ...manifest, gpuRoundTripMaxByteError: maxByteError };
}
