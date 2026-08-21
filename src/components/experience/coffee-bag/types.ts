export type Vector3 = [number, number, number];

export type SketchfabApi = {
    start: () => void;
    addEventListener: (event: string, callback: () => void) => void;
    getCameraLookAt: (
        callback: (
            error: unknown,
            camera: {
                position: Vector3;
                target: Vector3;
            }
        ) => void
    ) => void;
    setCameraLookAt: (position: Vector3, target: Vector3, duration?: number) => void;
    setFov: (angle: number) => void;
};

export type SketchfabClient = {
    init: (
        uid: string,
        options: {
            autostart?: number;
            camera?: number;
            transparent?: number;
            scrollwheel?: number;
            ui_hint?: number;
            ui_stop?: number;
            ui_controls?: number;
            ui_infos?: number;
            ui_watermark?: number;
            ui_settings?: number;
            ui_help?: number;
            ui_fullscreen?: number;
            ui_inspector?: number;
            ui_annotations?: number;
            ui_animations?: number;
            ui_vr?: number;
            ui_ar?: number;
            success: (api: SketchfabApi) => void;
            error: () => void;
        }
    ) => void;
};

declare global {
    interface Window {
        Sketchfab?: new (version: string, iframe: HTMLIFrameElement) => SketchfabClient;
    }
}