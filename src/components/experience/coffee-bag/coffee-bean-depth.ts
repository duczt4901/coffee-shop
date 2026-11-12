import * as THREE from "three";
import { getCoffeeBeanPosition, planCoffeeBeanDepth } from "./coffee-bean-depth-plan";
import { ATLAS_COLUMNS } from "./coffee-bean-atlas";
import atlasManifest from "./coffee-bean-atlas.generated.json";

/** The hero stays sharp; the blurred half uses a pre-baked texture. */
export function createCoffeeBeanDepth(products: THREE.Object3D, radius: number, atlas: THREE.Texture) {
    const beans = planCoffeeBeanDepth(products, radius);
    const blurred = beans.filter(bean => bean.layer !== "focus");
    if (!blurred.length) return null;
    if (blurred.length > ATLAS_COLUMNS ** 2) throw new Error("Bean atlas capacity exceeded");
    if (blurred.length !== atlasManifest.count) throw new Error("Bean atlas does not match the scene; regenerate it");
    const geometry = new THREE.PlaneGeometry(1, 1);
    const tiles = new THREE.InstancedBufferAttribute(new Float32Array(blurred.length), 1);
    geometry.setAttribute("tile", tiles);
    const material = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false,
        uniforms: { atlas: { value: atlas } },
        vertexShader: `attribute float tile; varying vec2 vUv;
            void main() {
                vUv = (uv + vec2(mod(tile, ${ATLAS_COLUMNS}.), floor(tile / ${ATLAS_COLUMNS}.))) / ${ATLAS_COLUMNS}.;
                vec4 center = modelViewMatrix * instanceMatrix * vec4(0., 0., 0., 1.);
                center.xy += position.xy * instanceMatrix[0][0];
                gl_Position = projectionMatrix * center;
            }`,
        fragmentShader: `uniform sampler2D atlas; varying vec2 vUv;
            void main() {
                vec4 color = texture2D(atlas, vUv);
                if (color.a < .002) discard;
                gl_FragColor = vec4(color.rgb / max(color.a, .0001), color.a);
                #include <colorspace_fragment>
            }`,
    });
    const sprites = new THREE.InstancedMesh(geometry, material, blurred.length);
    sprites.name = "OutOfFocus_Beans";
    sprites.frustumCulled = false;
    const matrix = new THREE.Matrix4();
    const indexed = blurred.map((bean, tile) => ({ ...bean, tile, depth: 0 }));
    // Optional depth must be reversible if setup or a later update fails.
    const originals = [...new Set(beans.map(bean => bean.mesh))].map(mesh => ({
        mesh, count: mesh.count, matrices: new Float32Array(mesh.instanceMatrix.array),
        box: mesh.boundingBox?.clone() ?? null, sphere: mesh.boundingSphere?.clone() ?? null,
    }));
    let disposed = false;
    const dispose = () => {
        if (disposed) return;
        disposed = true;
        for (const { mesh, count, matrices, box, sphere } of originals) {
            mesh.count = count;
            mesh.instanceMatrix.array.set(matrices);
            mesh.instanceMatrix.needsUpdate = true;
            mesh.boundingBox = box;
            mesh.boundingSphere = sphere;
        }
        sprites.dispose(); geometry.dispose(); material.dispose();
    };
    try {
        for (const { mesh } of originals) {
            let count = 0;
            for (const bean of beans.filter(bean => bean.mesh === mesh && bean.layer === "focus")) {
                mesh.getMatrixAt(bean.index, matrix);
                mesh.setMatrixAt(count++, matrix);
            }
            mesh.count = count;
            mesh.instanceMatrix.needsUpdate = true;
            mesh.computeBoundingBox(); mesh.computeBoundingSphere();
        }
    } catch (error) {
        dispose();
        throw error;
    }
    return {
        object: sprites,
        // shortcut: blurred cards use the middle orbit's lighting/view; use multi-view atlases if the camera orbit expands.
        update(camera: THREE.Camera, width: number) {
            camera.updateMatrixWorld();
            for (const bean of indexed) bean.depth = getCoffeeBeanPosition(bean, width).clone().applyMatrix4(camera.matrixWorldInverse).z;
            indexed.sort((a, b) => a.depth - b.depth);
            indexed.forEach((bean, index) => {
                matrix.makeScale(bean.size, bean.size, bean.size).setPosition(getCoffeeBeanPosition(bean, width));
                sprites.setMatrixAt(index, matrix);
                tiles.setX(index, bean.tile);
            });
            sprites.instanceMatrix.needsUpdate = true;
            tiles.needsUpdate = true;
        },
        dispose,
    };
}
