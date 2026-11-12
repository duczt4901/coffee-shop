import * as THREE from "three";

export function getCoffeeBeanPosition(bean: { position: THREE.Vector3; narrowPosition: THREE.Vector3 }, width: number) {
    return width < 1440 ? bean.narrowPosition : bean.position;
}

export function planCoffeeBeanDepth(products: THREE.Object3D, radius: number) {
    const beans: { mesh: THREE.InstancedMesh; index: number; matrix: THREE.Matrix4; center: THREE.Vector3; size: number; layer: "focus" | "foreground" | "background"; blur: number }[] = [];
    products.updateWorldMatrix(true, true);
    products.getObjectByName("Beans_Floating")?.traverse(object => {
        if (!(object instanceof THREE.InstancedMesh)) return;
        object.geometry.computeBoundingBox();
        for (let index = 0; index < object.count; index++) {
            const matrix = new THREE.Matrix4();
            object.getMatrixAt(index, matrix);
            matrix.premultiply(object.matrixWorld);
            const box = object.geometry.boundingBox!.clone().applyMatrix4(matrix);
            beans.push({ mesh: object, index, matrix, center: box.getCenter(new THREE.Vector3()), size: box.getSize(new THREE.Vector3()).length() * 1.55, layer: "focus", blur: 0 });
        }
    });
    const count = Math.floor(beans.length / 2);
    // Keep foreground blur on the outside edges, away from the three product labels.
    const foreground = [...beans].sort((a, b) => Math.abs(b.center.x) - Math.abs(a.center.x)).slice(0, Math.min(4, count));
    const background = beans.filter(bean => !foreground.includes(bean)).sort((a, b) => a.center.z - b.center.z).slice(0, count - foreground.length);
    foreground.forEach((bean, index) => {
        bean.layer = "foreground";
        bean.blur = [3.25, 1.8, 2.6, 3.6][index];
    });
    background.forEach((bean, index) => {
        bean.layer = "background";
        bean.blur = [0.75, 1.25, 2.2][index % 3];
    });
    return beans.map(bean => {
        const position = bean.center.clone();
        const order = bean.layer === "foreground" ? foreground.indexOf(bean) : background.indexOf(bean);
        if (bean.layer === "foreground") position.z += radius * (0.32 + order * 0.035);
        if (bean.layer === "foreground") position.x += radius * (position.x > 0 ? 0.13 : -0.06);
        if (bean.layer === "background") position.z -= radius * (0.08 + (order % 3) * 0.045);
        const narrowPosition = position.clone();
        // The narrow composition crops the outer edges; keep two foreground accents in its upper breathing space.
        if (bean.layer === "foreground" && foreground.find(other => other.center.x * bean.center.x > 0) === bean) {
            narrowPosition.x = radius * (position.x > 0 ? 0.26 : -0.05);
            narrowPosition.y = radius * (position.x > 0 ? 0.62 : 0.63);
            narrowPosition.z *= 0.65;
        }
        return { ...bean, position, narrowPosition };
    });
}

