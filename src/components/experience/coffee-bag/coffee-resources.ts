import * as THREE from "three";

/** Track before replacing glTF materials so detached resources keep an owner. */
export function createCoffeeResources() {
    const resources = new Set<{ dispose(): void }>();
    const bitmaps = new Set<{ close(): void }>();
    return {
        track(root: THREE.Object3D) {
            root.traverse(object => {
                if (object instanceof THREE.DirectionalLight || object instanceof THREE.PointLight || object instanceof THREE.SpotLight) resources.add(object.shadow);
                if (!(object instanceof THREE.Mesh)) return;
                if (object instanceof THREE.InstancedMesh) resources.add(object);
                resources.add(object.geometry);
                for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
                    resources.add(material);
                    for (const value of Object.values(material)) {
                        if (!(value instanceof THREE.Texture)) continue;
                        resources.add(value);
                        if (typeof value.image?.close === "function") bitmaps.add(value.image);
                    }
                }
            });
        },
        dispose() {
            resources.forEach(resource => resource.dispose());
            bitmaps.forEach(bitmap => bitmap.close());
            resources.clear();
            bitmaps.clear();
        },
    };
}
