import * as THREE from "three";

export const CAMERA_FOV = 5.5;
const ORBIT_STEPS = 32;
const VERTICAL_SUBSTEPS = 4;

export type CoffeeLayout = {
    height: number;
    projectedHeight: number;
    distances: number[];
    offsetY: number;
};

export function setOrbitDirection(direction: THREE.Vector3, progress: number) {
    const elevation = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(30, -15, progress));
    const azimuth = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(20, -20, progress));
    return direction.setFromSphericalCoords(1, Math.PI / 2 - elevation, azimuth);
}

export function getCoffeeWidthRatio(width: number) {
    return THREE.MathUtils.lerp(1.2, 0.8, THREE.MathUtils.clamp((width - 480) / (1920 - 480), 0, 1));
}

export function getCoffeeCameraDistance(distances: number[], progress: number) {
    const segment = THREE.MathUtils.clamp(progress, 0, 1) * (distances.length - 1);
    const index = Math.floor(segment);
    return THREE.MathUtils.lerp(distances[index], distances[Math.min(index + 1, distances.length - 1)], segment - index);
}

export function getCoffeeProductCorners(products: THREE.Object3D) {
    const corners: THREE.Vector3[] = [];
    const matrix = new THREE.Matrix4();
    products.updateWorldMatrix(true, true);
    products.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
        const bounds = object.geometry.boundingBox;
        if (!bounds || bounds.isEmpty()) return;
        const instances = object instanceof THREE.InstancedMesh ? object.count : 1;
        for (let index = 0; index < instances; index++) {
            if (object instanceof THREE.InstancedMesh) {
                object.getMatrixAt(index, matrix);
                matrix.premultiply(object.matrixWorld);
            } else matrix.copy(object.matrixWorld);
            for (const x of [bounds.min.x, bounds.max.x]) {
                for (const y of [bounds.min.y, bounds.max.y]) {
                    for (const z of [bounds.min.z, bounds.max.z]) corners.push(new THREE.Vector3(x, y, z).applyMatrix4(matrix));
                }
            }
        }
    });
    return corners;
}

/** Owns the canvas height. Inputs never include the height being measured. */
export function measureCoffeeLayout(corners: THREE.Vector3[], width: number, minimumHeight: number): CoffeeLayout {
    if (!corners.length || !Number.isFinite(width) || width <= 0 || !Number.isFinite(minimumHeight) || minimumHeight < 0) {
        throw new Error("Coffee layout requires model geometry, a positive width and a valid CSS minimum height.");
    }
    const tangent = Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2));
    const ratio = getCoffeeWidthRatio(width);
    const steps = ORBIT_STEPS * VERTICAL_SUBSTEPS;
    const views = Array.from({ length: steps + 1 }, (_, index) => {
        const direction = setOrbitDirection(new THREE.Vector3(), index / steps);
        const right = new THREE.Vector3(direction.z, 0, -direction.x).normalize();
        const up = new THREE.Vector3().crossVectors(direction, right);
        return corners.map((corner) => ({ x: corner.dot(right), y: corner.dot(up), depth: corner.dot(direction) }));
    });

    const fit = (height: number): CoffeeLayout => {
        const horizontalTangent = tangent * width / height;
        const distances = Array.from({ length: ORBIT_STEPS + 1 }, (_, index) => {
            const points = views[index * VERTICAL_SUBSTEPS];
            let maxDepth = -Infinity;
            let far = -Infinity;
            for (const point of points) {
                maxDepth = Math.max(maxDepth, point.depth);
                far = Math.max(far, Math.abs(point.x) / (horizontalTangent * ratio) + point.depth);
            }
            let near = maxDepth + Number.EPSILON * Math.max(1, Math.abs(maxDepth));
            far = Math.max(far, near);
            for (let iteration = 0; iteration < 32; iteration++) {
                const middle = (near + far) / 2;
                let left = Infinity;
                let right = -Infinity;
                for (const point of points) {
                    const x = point.x / ((middle - point.depth) * horizontalTangent);
                    left = Math.min(left, x);
                    right = Math.max(right, x);
                }
                if (right - left > 2 * ratio) near = middle;
                else far = middle;
            }
            return far;
        });

        let bottom = Infinity;
        let top = -Infinity;
        for (let index = 0; index <= steps; index++) {
            const distance = getCoffeeCameraDistance(distances, index / steps);
            for (const point of views[index]) {
                const y = point.y / ((distance - point.depth) * tangent);
                bottom = Math.min(bottom, y);
                top = Math.max(top, y);
            }
        }
        return {
            height,
            projectedHeight: (top - bottom) * height / 2,
            distances,
            // One projection offset, chosen at layout time, anchors the lowest
            // reference view to the canvas bottom without following scroll.
            offsetY: (-1 - bottom) * height / 2,
        };
    };

    let low = Math.max(1, Math.ceil(minimumHeight));
    let layout = fit(low);
    if (layout.projectedHeight <= low) return layout;
    let high = Math.max(low + 1, Math.ceil(layout.projectedHeight));
    while (fit(high).projectedHeight > high) high *= 2;
    while (high - low > 1) {
        const middle = Math.floor((low + high) / 2);
        layout = fit(middle);
        if (layout.projectedHeight <= middle) high = middle;
        else low = middle;
    }
    return fit(high);
}
