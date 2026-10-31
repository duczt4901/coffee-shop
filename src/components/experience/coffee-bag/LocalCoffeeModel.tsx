"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { SSAOPass } from "three/addons/postprocessing/SSAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { createCoffeeStudio, createPhinEnvironment } from "./createCoffeeStudio";
import styles from "../CoffeeBagExperience.module.css";

gsap.registerPlugin(ScrollTrigger);

const CAMERA_FOV = 5.505189;
const CAMERA_START_ELEVATION = 30;
const CAMERA_END_ELEVATION = -15;
const CAMERA_START_AZIMUTH = 20;
const CAMERA_END_AZIMUTH = -20;

function setOrbitDirection(direction: THREE.Vector3, progress: number) {
    const elevation = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(CAMERA_START_ELEVATION, CAMERA_END_ELEVATION, progress));
    const azimuth = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(CAMERA_START_AZIMUTH, CAMERA_END_AZIMUTH, progress));
    return direction.setFromSphericalCoords(1, Math.PI / 2 - elevation, azimuth);
}

declare global {
    interface Window {
        __duckModelReady?: boolean;
    }
}

export function LocalCoffeeModel() {
    const mountRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return;

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
        renderer.domElement.className = "h-full w-full";
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
        let productBounds = new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1));
        let studio: THREE.Group | null = null;
        let phinEnvironment: THREE.WebGLRenderTarget | null = null;
        let disposed = false;
        let scrollProgress = 0;
        let cameraDistance = 1;
        let framedWidth = 0;
        let framedViewportHeight = 0;
        let resizeFrame = 0;
        const cameraTarget = new THREE.Vector3();

        const renderView = () => {
            if (disposed) return;
            setOrbitDirection(camera.position, scrollProgress).multiplyScalar(cameraDistance).add(cameraTarget);
            camera.lookAt(cameraTarget);
            composer.render();
            if (model) signalReady();
        };

        const resize = () => {
            if (disposed || !model) return;
            const width = Math.max(mount.clientWidth, 1);
            const viewportHeight = Math.max(window.innerHeight, 1);
            if (width === framedWidth && viewportHeight === framedViewportHeight) return;
            framedWidth = width;
            framedViewportHeight = viewportHeight;
            const referenceAspect = width / viewportHeight;
            const tangent = Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2));
            const target = new THREE.Vector3(0, -modelRadius * 0.1, 0);
            const corners: THREE.Vector3[] = [];
            let distance = 0;
            for (const x of [productBounds.min.x, productBounds.max.x]) {
                for (const y of [productBounds.min.y, productBounds.max.y]) {
                    for (const z of [productBounds.min.z, productBounds.max.z]) {
                        const corner = new THREE.Vector3(x, y, z).sub(target);
                        corners.push(corner);
                        distance = Math.max(distance, Math.abs(corner.x) / (tangent * referenceAspect) + corner.z, Math.abs(corner.y) / tangent + corner.z);
                    }
                }
            }
            distance *= 2 / 3;
            // Include the middle of the two-axis path when fitting the canvas.
            const views = Array.from({ length: 9 }, (_, index) => {
                const direction = setOrbitDirection(new THREE.Vector3(), index / 8);
                const right = new THREE.Vector3(direction.z, 0, -direction.x).normalize();
                const up = new THREE.Vector3().crossVectors(direction, right);
                return { direction, right, up };
            });
            for (const { direction, right } of views) {
                for (const corner of corners) {
                    distance = Math.max(distance, Math.abs(corner.dot(right)) / (tangent * referenceAspect * 0.95) + corner.dot(direction));
                }
            }
            let verticalExtent = 0;
            for (const { direction, up } of views) {
                for (const corner of corners) {
                    verticalExtent = Math.max(verticalExtent, Math.abs(corner.dot(up)) / (tangent * (distance - corner.dot(direction))));
                }
            }
            const height = Math.max(1, Math.ceil((viewportHeight * verticalExtent) / 0.95));
            const heightChanged = mount.style.blockSize !== `${height}px`;
            mount.style.blockSize = `${height}px`;
            renderer.setSize(width, height, false);
            composer.setSize(width, height);
            // Keep the projected size independent of the canvas height needed to contain it.
            camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan((tangent * height) / viewportHeight));
            camera.aspect = width / height;
            cameraDistance = distance;
            cameraTarget.copy(target);
            camera.near = Math.max(0.01, distance - modelRadius * 2);
            camera.far = distance + modelRadius * 40;
            camera.updateProjectionMatrix();
            ambientOcclusion.ssaoMaterial.uniforms.cameraNear.value = camera.near;
            ambientOcclusion.ssaoMaterial.uniforms.cameraFar.value = camera.far;
            ambientOcclusion.kernelRadius = modelRadius * 0.06;
            ambientOcclusion.minDistance = 0.0001;
            ambientOcclusion.maxDistance = 0.006;
            // SSAOPass caches the projection matrix on resize, after the camera has been fitted.
            const aoSize = renderer.getDrawingBufferSize(new THREE.Vector2());
            ambientOcclusion.setSize(Math.round(aoSize.x * 0.5), Math.round(aoSize.y * 0.5));
            renderer.shadowMap.needsUpdate = true;
            renderView();
            if (heightChanged) ScrollTrigger.refresh();
        };

        const syncScrollView = ({ progress }: ScrollTrigger) => {
            if (scrollProgress === progress) return;
            scrollProgress = progress;
            if (model) renderView();
        };
        const scrollTrigger = ScrollTrigger.create({
            trigger: mount,
            start: "top bottom",
            end: "bottom top",
            onUpdate: syncScrollView,
            onRefresh: syncScrollView,
        });
        scrollProgress = scrollTrigger.progress;

        const requestResize = () => {
            if (resizeFrame) return;
            resizeFrame = requestAnimationFrame(() => {
                resizeFrame = 0;
                resize();
            });
        };
        const resizeObserver = new ResizeObserver(requestResize);
        resizeObserver.observe(mount);
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
                productBounds = bounds.clone().translate(center.negate());
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
            scrollTrigger.kill();
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
    }, []);

    return <div ref={mountRef} className={styles.canvas} role="img" aria-label="Mô hình 3D" />;
}
