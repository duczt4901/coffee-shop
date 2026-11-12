"use client";

import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { createCoffeeStudio, createPhinEnvironment } from "./createCoffeeStudio";
import { createCoffeeRenderLoop } from "./coffee-render-loop";
import { getCoffeePixelRatio } from "./coffee-render-quality";
import { createCoffeeBeanDepth } from "./coffee-bean-depth";
import { loadCoffeeBeanAtlas } from "./coffee-bean-atlas";
import { waitForCoffeeAsset } from "./coffee-asset-wait";
import { createCoffeeResources } from "./coffee-resources";
import beanAtlasManifest from "./coffee-bean-atlas.generated.json";
import { CAMERA_FOV, getCoffeeCameraDistance, getCoffeeProductCorners, measureCoffeeLayout, setOrbitDirection, type CoffeeLayout } from "./coffee-camera";
import styles from "../CoffeeBagExperience.module.css";
import "./coffee-framing.generated.css";

export type CoffeeModelHandle = { setProgress: (progress: number) => void };

export function LocalCoffeeModel({ ref }: { ref: Ref<CoffeeModelHandle> }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mountRef = useRef<HTMLDivElement>(null);
    const progressRef = useRef(0.5);
    const renderProgressRef = useRef<((progress: number) => void) | null>(null);
    useImperativeHandle(ref, () => ({
        setProgress(progress) {
            progressRef.current = THREE.MathUtils.clamp(progress, 0, 1);
            renderProgressRef.current?.(progressRef.current);
        },
    }), []);

    useEffect(() => {
        const mount = mountRef.current;
        const container = containerRef.current;
        if (!mount || !container) return;
        const resources = createCoffeeResources();
        const assets = new AbortController();
        let disposed = false;
        let renderer: THREE.WebGLRenderer | undefined;
        let renderLoop: ReturnType<typeof createCoffeeRenderLoop> | undefined;
        let visibilityObserver: IntersectionObserver | undefined;
        let resizeObserver: ResizeObserver | undefined;
        let removeListeners = () => {};
        let resizeFrame = 0;
        let phinEnvironment: THREE.WebGLRenderTarget | null = null;
        let beanDepth: ReturnType<typeof createCoffeeBeanDepth> = null;
        let beanAtlas: THREE.Texture<ImageBitmap> | null = null;
        const disposeAtlas = (texture: THREE.Texture<ImageBitmap>) => {
            texture.dispose();
            texture.image.close();
        };
        const cleanup = () => {
            if (disposed) return;
            disposed = true;
            assets.abort();
            renderProgressRef.current = null;
            renderLoop?.dispose();
            visibilityObserver?.disconnect();
            resizeObserver?.disconnect();
            removeListeners();
            cancelAnimationFrame(resizeFrame);
            resources.dispose();
            phinEnvironment?.dispose();
            beanDepth?.dispose();
            if (beanAtlas) disposeAtlas(beanAtlas);
            renderer?.dispose();
            renderer?.forceContextLoss();
            renderer?.domElement.remove();
        };
        const fail = (error: unknown) => {
            if (disposed) return;
            console.error("Coffee 3D is unavailable; keeping the product image.", error);
            container.dataset.coffeeState = "error";
            cleanup();
        };

        container.dataset.coffeeState = "loading";
        try {
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.01, 100);
            const view = new THREE.WebGLRenderer({ alpha: true, antialias: true });
            renderer = view;
            view.setClearColor(0x000000, 0);
            view.transmissionResolutionScale = 0.5;
            view.outputColorSpace = THREE.SRGBColorSpace;
            view.toneMapping = THREE.NoToneMapping;
            view.shadowMap.enabled = true;
            view.shadowMap.type = THREE.PCFShadowMap;
            view.shadowMap.autoUpdate = false;
            view.domElement.className = "absolute inset-0 block h-full w-full";
            view.domElement.setAttribute("aria-hidden", "true");
            mount.appendChild(view.domElement);
            let model: THREE.Object3D | null = null;
            let modelRadius = 1;
            let layout: CoffeeLayout | null = null;
            let productCorners: THREE.Vector3[] = [];
            let scrollProgress = progressRef.current;
            let framedWidth = 0;
            let framedHeight = 0;
            let framedPixelRatio = 0;
            let initialized = false;
            let hasFrame = false;
            let contextLost = false;
            let environmentDirty = true;
            let intersectsViewport = false;
            const cameraDirection = new THREE.Vector3();
            const rebuildEnvironment = () => {
                const phin = model?.getObjectByName("Vietnamese_Phin");
                if (phin) {
                    const previous = phinEnvironment;
                    phinEnvironment = createPhinEnvironment(view);
                    const texture = phinEnvironment.texture;
                    phin.traverse(child => {
                        if (!(child instanceof THREE.Mesh)) return;
                        for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
                            if (!(material instanceof THREE.MeshStandardMaterial)) continue;
                            material.envMap = texture;
                            material.envMapIntensity = 0.65;
                            material.needsUpdate = true;
                        }
                    });
                    previous?.dispose();
                }
                environmentDirty = false;
            };
            const renderView = () => {
                if (disposed || contextLost || !layout || !initialized) return;
                try {
                    if (environmentDirty) rebuildEnvironment();
                    setOrbitDirection(cameraDirection, scrollProgress);
                    camera.position.copy(cameraDirection).multiplyScalar(getCoffeeCameraDistance(layout.distances, scrollProgress));
                    camera.lookAt(0, 0, 0);
                    try {
                        beanDepth?.update(camera, framedWidth);
                    } catch (error) {
                        if (beanDepth) {
                            scene.remove(beanDepth.object);
                            beanDepth.dispose();
                            beanDepth = null;
                        }
                        console.error("Coffee bean depth failed; keeping the original 3D beans.", error);
                    }
                    view.render(scene, camera);
                    if (view.getContext().isContextLost()) return;
                    hasFrame = true;
                    container.dataset.coffeeState = "ready";
                } catch (error) { fail(error); }
            };
            const loop = createCoffeeRenderLoop(renderView);
            renderLoop = loop;
            const updateActivity = () => loop.setActive(intersectsViewport && !document.hidden && !contextLost);
            const onContextLost = (event: Event) => {
                event.preventDefault();
                contextLost = true;
                container.dataset.coffeeState = "lost";
                updateActivity();
            };
            const onContextRestored = () => {
                contextLost = false;
                environmentDirty = true;
                view.shadowMap.needsUpdate = true;
                loop.invalidate();
                updateActivity();
            };
            view.domElement.addEventListener("webglcontextlost", onContextLost);
            view.domElement.addEventListener("webglcontextrestored", onContextRestored);
            document.addEventListener("visibilitychange", updateActivity);
            removeListeners = () => {
                view.domElement.removeEventListener("webglcontextlost", onContextLost);
                view.domElement.removeEventListener("webglcontextrestored", onContextRestored);
                document.removeEventListener("visibilitychange", updateActivity);
            };
            const resize = () => {
                if (disposed || !initialized) return;
                const width = Math.max(container.clientWidth, 1);
                // Generated CSS reserves the same geometry before any 3D asset loads.
                const height = Math.max(1, Math.ceil(mount.getBoundingClientRect().height));
                const pixelRatio = getCoffeePixelRatio(width, height, window.devicePixelRatio);
                if (width === framedWidth && height === framedHeight && pixelRatio === framedPixelRatio) return;
                layout = measureCoffeeLayout(productCorners, width, height);
                framedWidth = width;
                framedHeight = height;
                framedPixelRatio = getCoffeePixelRatio(width, layout.height, window.devicePixelRatio);
                view.setPixelRatio(framedPixelRatio);
                view.setSize(width, layout.height, false);
                camera.near = Math.max(0.01, Math.min(...layout.distances) - modelRadius * 2);
                camera.far = Math.max(...layout.distances) + modelRadius * 40;
                camera.setViewOffset(width, layout.height, 0, layout.offsetY, width, layout.height);
                view.shadowMap.needsUpdate = true;
                if (!hasFrame) renderView();
                else loop.invalidate();
            };
            const requestResize = () => {
                if (resizeFrame) return;
                resizeFrame = requestAnimationFrame(() => {
                    resizeFrame = 0;
                    try { resize(); } catch (error) { fail(error); }
                });
            };
            const removeActivityListeners = removeListeners;
            removeListeners = () => {
                removeActivityListeners();
                window.removeEventListener("resize", requestResize);
            };
            window.addEventListener("resize", requestResize);
            resizeObserver = new ResizeObserver(requestResize);
            resizeObserver.observe(container);
            visibilityObserver = new IntersectionObserver(([entry]) => {
                intersectsViewport = entry.isIntersecting && entry.intersectionRect.width > 0 && entry.intersectionRect.height > 0;
                updateActivity();
            });
            visibilityObserver.observe(mount);
            renderProgressRef.current = progress => {
                if (scrollProgress === progress) return;
                scrollProgress = progress;
                if (initialized) loop.invalidate();
            };
            const atlasReady = waitForCoffeeAsset(
                loadCoffeeBeanAtlas(`/images/3d/coffee-beans-atlas.webp?v=${beanAtlasManifest.imageSHA256.slice(0, 12)}`),
                5000, assets.signal, disposeAtlas,
            ).then(texture => {
                if (disposed) {
                    if (texture) disposeAtlas(texture);
                    return null;
                }
                beanAtlas = texture;
                return texture;
            });
            void new GLTFLoader().loadAsync("/images/3d/robusta-product-scene.glb").then(async gltf => {
                if (disposed) {
                    const lateResources = createCoffeeResources();
                    gltf.scenes.forEach(lateResources.track);
                    lateResources.dispose();
                    return;
                }
                model = gltf.scene;
                gltf.scenes.forEach(resources.track);
                model.traverse(child => {
                    if (child instanceof THREE.Mesh) {
                        const materials = Array.isArray(child.material) ? child.material : [child.material];
                        materials.forEach(material => {
                            if (material instanceof THREE.MeshStandardMaterial && material.map && material.name.endsWith("_Approved_Label")) material.map.anisotropy = view.capabilities.getMaxAnisotropy();
                        });
                        child.castShadow = child.receiveShadow = true;
                        if (child.name === "Studio_Floor") {
                            child.castShadow = false;
                            child.geometry = new THREE.PlaneGeometry(100, 100);
                            resources.track(child);
                            child.rotation.set(-Math.PI / 2, 0, 0);
                            child.material = new THREE.ShadowMaterial({ color: 0x62584c, opacity: 0.24, depthWrite: false });
                            resources.track(child);
                        }
                    }
                    if (child instanceof THREE.Light) child.visible = false;
                });
                model.getObjectByName("Beans_Floating")?.traverse(child => {
                    if (child instanceof THREE.Mesh) child.castShadow = false;
                });
                model.getObjectByName("Vietnamese_Phin")?.traverse(child => {
                    if (!(child instanceof THREE.Mesh)) return;
                    for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
                        if (material instanceof THREE.MeshPhysicalMaterial && material.transmission > 0) {
                            material.transmission = 0;
                            material.opacity = 0.22;
                            material.transparent = true;
                            material.depthWrite = false;
                        }
                    }
                });
                const products = model.getObjectByName("Product_Display") ?? model;
                const bounds = new THREE.Box3().setFromObject(products);
                const framingBounds = products.userData.framingBounds;
                if (framingBounds) {
                    bounds.min.fromArray(framingBounds.min);
                    bounds.max.fromArray(framingBounds.max);
                }
                model.position.sub(bounds.getCenter(new THREE.Vector3()));
                productCorners = getCoffeeProductCorners(products);
                modelRadius = Math.max(bounds.getBoundingSphere(new THREE.Sphere()).radius, 0.01);
                scene.add(model);
                const studio = createCoffeeStudio(modelRadius);
                resources.track(studio);
                scene.add(studio);
                const atlas = await atlasReady;
                if (disposed) return;
                if (atlas) {
                    try {
                        beanDepth = createCoffeeBeanDepth(products, modelRadius, atlas);
                        if (beanDepth) scene.add(beanDepth.object);
                    } catch (error) {
                        console.error("Coffee bean depth could not be applied; keeping the original 3D beans.", error);
                    }
                }
                initialized = true;
                resize();
            }).catch(fail);
        } catch (error) { fail(error); }
        return cleanup;
    }, []);

    return (
        <div ref={containerRef} data-coffee-canvas data-coffee-state="loading" className={styles.canvas} role="img" aria-label="Cà phê Robusta Lâm Đồng">
            <div ref={mountRef} data-coffee-frame className={styles.renderFrame}>
                {/* eslint-disable-next-line @next/next/no-img-element -- Static fallback also works without hydration. */}
                <img data-coffee-fallback className={styles.modelFallback} src="/images/products/trung-toan-robusta-500g.webp" alt="" loading="lazy" decoding="async" />
            </div>
        </div>
    );
}
