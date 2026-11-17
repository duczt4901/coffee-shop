import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { SSAARenderPass } from "three/addons/postprocessing/SSAARenderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { createCoffeeStudio, createPhinEnvironment } from "../../src/components/experience/coffee-bag/createCoffeeStudio";
import { CAMERA_FOV, getCoffeeCameraDistance, getCoffeeProductCorners, measureCoffeeLayout, setOrbitDirection } from "../../src/components/experience/coffee-bag/coffee-camera";
import { createCoffeeBeanDepth } from "../../src/components/experience/coffee-bag/coffee-bean-depth";
import { planCoffeeBeanDepth } from "../../src/components/experience/coffee-bag/coffee-bean-depth-plan";
import { loadCoffeeBeanAtlas } from "../../src/components/experience/coffee-bag/coffee-bean-atlas";

/** Offline only: export aligned product cutouts, bean layers and a full fallback. */
export async function bakeParallaxScene(token: string) {
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setClearColor(0, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = false;
    const scene = new THREE.Scene();
    const { scene: model } = await new GLTFLoader().loadAsync("/images/3d/robusta-product-scene.glb");
    model.traverse(child => {
        if (child instanceof THREE.Light) child.visible = false;
        if (!(child instanceof THREE.Mesh)) return;
        child.castShadow = child.receiveShadow = true;
        for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
            if (!(material instanceof THREE.MeshStandardMaterial)) continue;
            for (const texture of [material.map, material.normalMap, material.roughnessMap, material.aoMap]) {
                if (texture) texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
            }
            if (material.name === "White_flexible_laminate" || material.name.endsWith("_Approved_Label")) {
                material.roughness = material.name === "White_flexible_laminate" ? 0.72 : 0.82;
                material.normalScale.multiplyScalar(1.5);
                if (material instanceof THREE.MeshPhysicalMaterial) {
                    material.clearcoat = 0.12;
                    material.clearcoatRoughness = 0.5;
                }
            }
        }
        if (child.name === "Studio_Floor") {
            child.castShadow = false;
            child.geometry = new THREE.PlaneGeometry(100, 100);
            child.rotation.set(-Math.PI / 2, 0, 0);
            child.material = new THREE.ShadowMaterial({ color: 0x62584c, opacity: 0.24, depthWrite: false });
        }
    });
    model.getObjectByName("Beans_Floating")?.traverse(child => { if (child instanceof THREE.Mesh) child.castShadow = false; });
    const environment = createPhinEnvironment(renderer);
    model.getObjectByName("Vietnamese_Phin")?.traverse(child => {
        if (!(child instanceof THREE.Mesh)) return;
        for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
            if (!(material instanceof THREE.MeshStandardMaterial)) continue;
            material.envMap = environment.texture;
            material.envMapIntensity = 0.65;
            if (material instanceof THREE.MeshPhysicalMaterial && material.transmission > 0) {
                material.transmission = 0;
                material.opacity = 0.22;
                material.transparent = true;
                material.depthWrite = false;
            }
        }
    });
    const products = model.getObjectByName("Product_Display")!;
    const framing = products.userData.framingBounds;
    const bounds = new THREE.Box3(new THREE.Vector3().fromArray(framing.min), new THREE.Vector3().fromArray(framing.max));
    model.position.sub(bounds.getCenter(new THREE.Vector3()));
    const radius = bounds.getBoundingSphere(new THREE.Sphere()).radius;
    const corners = getCoffeeProductCorners(products);
    const blurred = planCoffeeBeanDepth(products, radius).filter(bean => bean.layer !== "focus");
    const atlas = await loadCoffeeBeanAtlas("/images/3d/coffee-beans-atlas.webp");
    const depth = createCoffeeBeanDepth(products, radius, atlas)!;
    const focusMeshes = new Set<THREE.Mesh>();
    products.getObjectByName("Beans_Floating")?.traverse(child => { if (child instanceof THREE.Mesh) focusMeshes.add(child); });
    if (!focusMeshes.size) throw Error("No sharp beans to export separately");
    const modelMeshes: { mesh: THREE.Mesh; visible: boolean }[] = [];
    model.traverse(child => { if (child instanceof THREE.Mesh) modelMeshes.push({ mesh: child, visible: child.visible }); });
    const photoMeshes: Record<string, Set<THREE.Mesh>> = {};
    for (const [name, nodes] of Object.entries({ blue: ["Bag_500g_Blue", "Podium_Left_Rear"], orange: ["Bag_1kg_Orange"], green: ["Bag_500g_Green"], cup: ["Vietnamese_Phin"] })) {
        const meshes = photoMeshes[name] = new Set();
        for (const node of nodes) {
            const group = model.getObjectByName(node);
            if (!group) throw Error(`Missing product: ${node}`);
            group.traverse(child => { if (child instanceof THREE.Mesh) meshes.add(child); });
        }
        if (!meshes.size) throw Error(`Empty product: ${name}`);
    }
    const studio = createCoffeeStudio(radius);
    const photoStudio = createCoffeeStudio(radius);
    const photoLights = photoStudio.children.filter((child): child is THREE.DirectionalLight => child instanceof THREE.DirectionalLight);
    const key = photoLights[0];
    key.intensity = 2.6;
    key.shadow.mapSize.set(4096, 4096);
    key.shadow.normalBias = radius * 0.0008;
    photoLights[1].intensity = 0.65;
    for (const light of photoStudio.children) if (light instanceof THREE.HemisphereLight) light.intensity = 0.35;
    const keyPosition = key.position.clone();
    scene.add(model, studio, photoStudio, depth.object);
    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.01, 100);
    const empty = new THREE.Matrix4().makeScale(0, 0, 0);
    const whiteMask = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    const blackMask = new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false });
    const results = [];
    for (const variant of [{ name: "desktop", width: 1280, height: 1325, scale: 1.25 }, { name: "mobile", width: 390, height: 844, scale: 2 }]) {
        const layout = measureCoffeeLayout(corners, variant.width, variant.height);
        camera.aspect = variant.width / layout.height;
        camera.near = Math.max(0.01, Math.min(...layout.distances) - radius * 2);
        camera.far = Math.max(...layout.distances) + radius * 40;
        camera.setViewOffset(variant.width, layout.height, 0, layout.offsetY, variant.width, layout.height);
        camera.position.copy(setOrbitDirection(new THREE.Vector3(), 0.5)).multiplyScalar(getCoffeeCameraDistance(layout.distances, 0.5));
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();
        for (const layer of ["products", "blue", "orange", "cup", "green", "middle", "back", "front"]) {
            const cutout = photoMeshes[layer];
            const photo = layer === "products" || !!cutout;
            renderer.setPixelRatio(photo ? (variant.name === "desktop" ? 3 : 4) : variant.scale);
            renderer.setSize(variant.width, layout.height, false);
            renderer.toneMapping = photo ? THREE.NeutralToneMapping : THREE.NoToneMapping;
            renderer.toneMappingExposure = 0.95;
            studio.visible = !photo;
            photoStudio.visible = photo;
            scene.environment = photo ? environment.texture : null;
            scene.environmentIntensity = 0.2;
            model.visible = photo || layer === "middle";
            for (const { mesh, visible } of modelMeshes) mesh.visible = visible && (layer === "middle" ? focusMeshes.has(mesh) : !focusMeshes.has(mesh));
            if (photo && [...focusMeshes].some(mesh => mesh.visible)) throw Error("Product layer must contain no floating beans");
            depth.object.visible = layer === "back" || layer === "front";
            depth.update(camera, variant.width);
            if (depth.object.visible) {
                const tiles = depth.object.geometry.getAttribute("tile");
                for (let index = 0; index < depth.object.count; index++) {
                    const bean = blurred[tiles.getX(index)];
                    if (bean.layer !== (layer === "back" ? "background" : "foreground")) depth.object.setMatrixAt(index, empty);
                }
                depth.object.instanceMatrix.needsUpdate = true;
            } else renderer.shadowMap.needsUpdate = true;
            const canvas = document.createElement("canvas");
            canvas.width = renderer.domElement.width;
            canvas.height = renderer.domElement.height;
            const context = canvas.getContext("2d")!;
            // Accumulate in linear half-float, then tone-map once to avoid 8-bit banding.
            if (cutout) {
                // All objects remain present: the mask uses the same occlusion as the full photo.
                const materials = modelMeshes.map(({ mesh }) => mesh.material);
                renderer.toneMapping = THREE.NoToneMapping;
                scene.environment = null;
                renderer.shadowMap.enabled = false;
                for (const { mesh } of modelMeshes) mesh.material = cutout.has(mesh) || (layer === "blue" && mesh.name === "Studio_Floor") ? whiteMask : blackMask;
                try { renderer.render(scene, camera); }
                finally {
                    modelMeshes.forEach(({ mesh }, index) => { mesh.material = materials[index]; });
                    renderer.shadowMap.enabled = true;
                }
            } else if (photo) {
                const composer = new EffectComposer(renderer);
                const ssaa = new SSAARenderPass(scene, camera, 0, 0);
                const output = new OutputPass();
                ssaa.sampleLevel = 4;
                composer.addPass(ssaa);
                composer.addPass(output);
                let sample = 0;
                scene.onBeforeRender = () => {
                    const angle = sample * Math.PI * (3 - Math.sqrt(5));
                    const spread = radius * 0.055 * Math.sqrt((sample++ + 0.5) / 16);
                    key.position.copy(keyPosition).add(new THREE.Vector3(Math.cos(angle) * spread, Math.sin(angle) * spread, 0));
                    key.updateMatrixWorld();
                    renderer.shadowMap.needsUpdate = true;
                };
                try { composer.render(); }
                finally {
                    scene.onBeforeRender = () => {};
                    composer.dispose(); ssaa.dispose(); output.dispose();
                }
            } else renderer.render(scene, camera);
            context.filter = cutout ? "none" : photo ? "saturate(1.08)" : "saturate(1.35)";
            context.drawImage(renderer.domElement, 0, 0);
            const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(Error("Empty render")), "image/png"));
            const response = await fetch(`/render?token=${token}&variant=${variant.name}&layer=${layer}`, {
                method: "POST", headers: { "Content-Type": "image/png" }, body: blob,
            });
            if (!response.ok) throw Error(await response.text());
            results.push(await response.json());
        }
    }
    depth.dispose();
    whiteMask.dispose(); blackMask.dispose();
    atlas.dispose(); atlas.image.close();
    environment.dispose(); renderer.dispose();
    return results;
}
