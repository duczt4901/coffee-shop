"use client";

import type { RefObject } from "react";
import { useCallback, useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MODEL_UID } from "./constants";
import type { Vector3 } from "./types";

gsap.registerPlugin(ScrollTrigger);

type UseSketchfabCameraProps = {
    containerRef: RefObject<HTMLDivElement | null>;
    iframeRef: RefObject<HTMLIFrameElement | null>;
};

export function useSketchfabCamera({
                                       containerRef,
                                       iframeRef,
                                   }: UseSketchfabCameraProps): () => void {
    const cameraTweenRef = useRef<gsap.core.Tween | null>(null);

    useEffect(() => {
        return () => {
            cameraTweenRef.current?.kill();
        };
    }, []);

    return useCallback(() => {
        const iframe = iframeRef.current;
        const container = containerRef.current;

        if (!iframe || !container || !window.Sketchfab) return;

        const client = new window.Sketchfab("1.12.1", iframe);

        client.init(MODEL_UID, {
            autostart: 1,
            camera: 0,
            transparent: 1,
            scrollwheel: 0,
            ui_hint: 0,
            ui_stop: 0,
            ui_controls: 0,
            ui_infos: 0,
            ui_watermark: 0,
            ui_settings: 0,
            ui_help: 0,
            ui_fullscreen: 0,
            ui_inspector: 0,
            ui_annotations: 0,
            ui_animations: 0,
            ui_vr: 0,
            ui_ar: 0,

            success(api) {
                api.start();

                api.addEventListener("viewerready", () => {
                    window.__sketchfabReady = true;
                    window.dispatchEvent(new Event("sketchfab:ready"));

                    api.getCameraLookAt((error, camera) => {
                        if (error || !containerRef.current) return;

                        const cameraState = {
                            targetZOffset: 2,
                            targetYVector: 0.5,
                            targetZVector: -10,
                        };

                        const updateCamera = () => {
                            const target: Vector3 = [
                                camera.target[0],
                                camera.target[1],
                                camera.target[2] - cameraState.targetZOffset,
                            ];

                            const position: Vector3 = [
                                target[0] + 18,
                                target[1] - cameraState.targetYVector,
                                target[2] - cameraState.targetZVector,
                            ];

                            api.setCameraLookAt(position, target, 0);
                        };

                        api.setFov(40);
                        updateCamera();

                        cameraTweenRef.current?.kill();

                        cameraTweenRef.current = gsap.to(cameraState, {
                            targetZOffset: -2,
                            targetYVector: 2,
                            targetZVector: 5,
                            ease: "none",
                            scrollTrigger: {
                                trigger: containerRef.current,
                                start: "top top",
                                end: "bottom bottom",
                                scrub: true,
                                invalidateOnRefresh: true,
                            },
                            onUpdate: updateCamera,
                        });
                    });
                });
            },

            error() {
                console.error("Sketchfab viewer failed to initialize.");
            },
        });
    }, [containerRef, iframeRef]);
}
