"use client";

import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { SSAOPass } from "three/addons/postprocessing/SSAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { createCoffeeStudio, createPhinEnvironment } from "./createCoffeeStudio";
import { createCoffeeRenderLoop } from "./coffee-render-loop";
import { CAMERA_FOV, getCoffeeCameraDistance, getCoffeeProductCorners, measureCoffeeLayout, setOrbitDirection, type CoffeeLayout } from "./coffee-camera";
import styles from "../CoffeeBagExperience.module.css";

declare global {
    interface Window {
        __duckModelReady?: boolean;
    }
}

export type CoffeeModelHandle = { setProgress: (progress: number) => void };

export function LocalCoffeeModel({ ref, onLayout }: { ref: Ref<CoffeeModelHandle>; onLayout?: () => void }) {
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

        let readySignaled = false;
        window.__duckModelReady = false;

        // Keep the page loader informed after the first model frame.
        const signalReady = () => {
            if (readySignaled) return;
            readySignaled = true;
            window.__duckModelReady = true;
            window.dispatchEvent(new Event("duck-model:ready"));
        };

        const scene = new THREE.Scene();
        scene.background = null;
        const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.01, 100);
        let renderer: THREE.WebGLRenderer;

        try {
            renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "high-performance" });
        } catch (error) {
            console.error("WebGL is unavailable for the local 3D model.", error);
            signalReady();
            return;
        }

        renderer.setClearColor(0x000000, 0);
        renderer.setPixelRatio(1);
        renderer.transmissionResolutionScale = 0.5;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.NoToneMapping;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFShadowMap;
        renderer.shadowMap.autoUpdate = false;
        renderer.domElement.className = "absolute inset-0 block h-full w-full";
        renderer.domElement.setAttribute("aria-hidden", "true");
        mount.appendChild(renderer.domElement);

        const renderTarget = new THREE.WebGLRenderTarget(1, 1, { type: THREE.UnsignedByteType, samples: 0 });
        const composer = new EffectComposer(renderer, renderTarget);
        const renderPass = new RenderPass(scene, camera);
        const ambientOcclusion = new SSAOPass(scene, camera, 1, 1, 8);
        ambientOcclusion.copyMaterial.uniforms.opacity.value = 0.3;
        ambientOcclusion.copyMaterial.blendDst = THREE.OneMinusSrcAlphaFactor;
        ambientOcclusion.copyMaterial.blendSrcAlpha = THREE.ZeroFactor;
        ambientOcclusion.copyMaterial.blendDstAlpha = THREE.OneFactor;
        for (const target of [ambientOcclusion.normalRenderTarget, ambientOcclusion.ssaoRenderTarget, ambientOcclusion.blurRenderTarget]) {
            target.texture.type = THREE.UnsignedByteType;
        }
        const outputPass = new OutputPass();
        // Only AO is a visual effect; OutputPass converts linear colors to the display's sRGB space.
        composer.addPass(renderPass);
        composer.addPass(ambientOcclusion);
        composer.addPass(outputPass);

        let model: THREE.Object3D | null = null;
        let modelRadius = 1;
        let studio: THREE.Group | null = null;
        let phinEnvironment: THREE.WebGLRenderTarget | null = null;
        let disposed = false;
        let scrollProgress = progressRef.current;
        let layout: CoffeeLayout | null = null;
        let productCorners: THREE.Vector3[] = [];
        let framedWidth = 0;
        let framedMinimumHeight = 0;
        let resizeFrame = 0;
        const cameraTarget = new THREE.Vector3();
        const cameraDirection = new THREE.Vector3();

        const renderView = () => {
            if (disposed || !layout) return;
            const cameraDistance = getCoffeeCameraDistance(layout.distances, scrollProgress);
            setOrbitDirection(cameraDirection, scrollProgress);
            camera.position.copy(cameraDirection).multiplyScalar(cameraDistance).add(cameraTarget);
            camera.lookAt(cameraTarget);
            composer.render();
            if (model) signalReady();
        };
        const renderLoop = createCoffeeRenderLoop(renderView);

        let intersectsViewport = false;
        const updateActivity = () => renderLoop.setActive(intersectsViewport && !document.hidden);
        const visibilityObserver = new IntersectionObserver(([entry]) => {
            intersectsViewport = entry.isIntersecting && entry.intersectionRect.width > 0 && entry.intersectionRect.height > 0;
            updateActivity();
        });
        // Observe the drawing frame, excluding the canvas container's empty top padding.
        visibilityObserver.observe(mount);
        document.addEventListener("visibilitychange", updateActivity);

        const resize = () => {
            if (disposed || !model) return;
            const width = Math.max(container.clientWidth, 1);
            const minimumHeight = Math.ceil(parseFloat(getComputedStyle(container).minHeight));
            if (width === framedWidth && minimumHeight === framedMinimumHeight) return;
            layout = measureCoffeeLayout(productCorners, width, minimumHeight);
            framedWidth = width;
            framedMinimumHeight = minimumHeight;
            const heightChanged = container.style.blockSize !== `${layout.height}px`;
            container.style.blockSize = `${layout.height}px`;
            container.style.paddingBlockStart = `${layout.height / 2}px`;
            // Spend pixels on the projected model rather than the empty part of
            // a canvas expanded by its CSS minimum height.
            container.dataset.renderPixelBudget = String(width * layout.projectedHeight);
            const renderScale = Math.min(1, Math.sqrt(layout.projectedHeight / layout.height));
            const renderWidth = Math.max(1, Math.floor(width * renderScale));
            const renderHeight = Math.max(1, Math.floor(layout.height * renderScale));
            renderer.setSize(renderWidth, renderHeight, false);
            composer.setSize(renderWidth, renderHeight);
            camera.near = Math.max(0.01, Math.min(...layout.distances) - modelRadius * 2);
            camera.far = Math.max(...layout.distances) + modelRadius * 40;
            // The projection offset is fixed until the next layout change.
            camera.setViewOffset(width, layout.height, 0, layout.offsetY, width, layout.height);
            ambientOcclusion.ssaoMaterial.uniforms.cameraNear.value = camera.near;
            ambientOcclusion.ssaoMaterial.uniforms.cameraFar.value = camera.far;
            ambientOcclusion.kernelRadius = modelRadius * 0.06;
            ambientOcclusion.minDistance = 0.0001;
            ambientOcclusion.maxDistance = 0.006;
            // SSAOPass caches the projection matrix on resize, after the camera has been fitted.
            const aoSize = renderer.getDrawingBufferSize(new THREE.Vector2());
            ambientOcclusion.setSize(Math.round(aoSize.x * 0.5), Math.round(aoSize.y * 0.5));
            renderer.shadowMap.needsUpdate = true;
            // Prepare the loader's first frame once; subsequent changes use the demand loop.
            if (!readySignaled) renderView();
            else renderLoop.invalidate();
            if (heightChanged) onLayout?.();
        };

        const syncScrollView = (progress: number) => {
            if (scrollProgress === progress) return;
            scrollProgress = progress;
            if (layout) renderLoop.invalidate();
        };
        renderProgressRef.current = syncScrollView;

        const requestResize = () => {
            if (resizeFrame) return;
            resizeFrame = requestAnimationFrame(() => {
                resizeFrame = 0;
                resize();
            });
        };
        const resizeObserver = new ResizeObserver(requestResize);
        resizeObserver.observe(container);
        window.addEventListener("resize", requestResize);

        new GLTFLoader().load(
            "/images/3d/robusta-product-scene.glb",
            (gltf) => {
                if (disposed) return;

                model = gltf.scene;
                model.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        const materials = Array.isArray(child.material) ? child.material : [child.material];
                        materials.forEach((material) => {
                            if (material instanceof THREE.MeshStandardMaterial && material.map && material.name.endsWith("_Approved_Label")) {
                                material.map.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
                            }
                        });
                        child.castShadow = child.receiveShadow = true;
                        if (child.name === "Studio_Floor") {
                            child.castShadow = false;
                            child.geometry.dispose();
                            child.geometry = new THREE.PlaneGeometry(100, 100);
                            child.rotation.set(-Math.PI / 2, 0, 0);
                            materials.forEach((material) => material.dispose());
                            child.material = new THREE.ShadowMaterial({ color: 0x62584c, opacity: 0.24, depthWrite: false });
                        }
                    }
                    if (child instanceof THREE.Light) {
                        child.visible = false;
                    }
                });

                // Keep decorative floating-bean shadows off the product artwork.
                model.getObjectByName("Beans_Floating")?.traverse((child) => {
                    if (child instanceof THREE.Mesh) child.castShadow = false;
                });

                const phin = model.getObjectByName("Vietnamese_Phin");
                if (phin) {
                    phinEnvironment = createPhinEnvironment(renderer);
                    const environmentMap = phinEnvironment.texture;
                    phin.traverse((child) => {
                        if (!(child instanceof THREE.Mesh)) return;
                        const materials = Array.isArray(child.material) ? child.material : [child.material];
                        materials.forEach((material) => {
                            if (!(material instanceof THREE.MeshStandardMaterial)) return;
                            material.envMap = environmentMap;
                            material.envMapIntensity = 0.65;
                        });
                    });
                }

                // Fit the static product group, excluding the studio floor and lights.
                const products = model.getObjectByName("Product_Display") ?? model;
                const bounds = new THREE.Box3().setFromObject(products);
                // Decoration changes retain the asset's original camera framing.
                const framingBounds = products.userData.framingBounds;
                if (framingBounds) {
                    bounds.min.fromArray(framingBounds.min);
                    bounds.max.fromArray(framingBounds.max);
                }
                const center = bounds.getCenter(new THREE.Vector3());
                model.position.sub(center);
                productCorners = getCoffeeProductCorners(products);
                modelRadius = Math.max(bounds.getBoundingSphere(new THREE.Sphere()).radius, 0.01);
                scene.add(model);
                studio = createCoffeeStudio(modelRadius);
                scene.add(studio);
                resize();
            },
            undefined,
            (error) => {
                console.error("Local 3D model failed to load.", error);
                signalReady();
            },
        );

        resize();

        return () => {
            disposed = true;
            renderProgressRef.current = null;
            renderLoop.dispose();
            visibilityObserver.disconnect();
            document.removeEventListener("visibilitychange", updateActivity);
            delete container.dataset.renderPixelBudget;
            container.style.removeProperty("block-size");
            container.style.removeProperty("padding-block-start");
            resizeObserver.disconnect();
            window.removeEventListener("resize", requestResize);
            cancelAnimationFrame(resizeFrame);

            model?.traverse((child) => {
                if (child instanceof THREE.DirectionalLight) child.shadow.dispose();
                if (!(child instanceof THREE.Mesh)) return;
                if (child instanceof THREE.InstancedMesh) child.dispose();
                child.geometry.dispose();
                const materials = Array.isArray(child.material) ? child.material : [child.material];
                materials.forEach((material) => {
                    Object.values(material).forEach((value) => {
                        if (value instanceof THREE.Texture && value !== phinEnvironment?.texture) value.dispose();
                    });
                    material.dispose();
                });
            });

            studio?.traverse((child) => {
                if (child instanceof THREE.DirectionalLight) child.shadow.dispose();
            });
            phinEnvironment?.dispose();
            ambientOcclusion.dispose();
            outputPass.dispose();
            composer.dispose();
            renderer.dispose();
            renderer.domElement.remove();
        };
    }, [onLayout]);

    return (
        <div ref={containerRef} data-coffee-canvas className={styles.canvas} role="img" aria-label="Mô hình 3D">
            <div ref={mountRef} data-coffee-frame className={styles.renderFrame} />
        </div>
    );
}
