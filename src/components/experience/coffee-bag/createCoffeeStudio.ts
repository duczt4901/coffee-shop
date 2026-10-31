import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export function createPhinEnvironment(renderer: THREE.WebGLRenderer) {
    const room = new RoomEnvironment();
    const generator = new THREE.PMREMGenerator(renderer);
    const environment = generator.fromScene(room, 0.04);
    room.dispose();
    generator.dispose();
    return environment;
}

/** Neutral product lighting keeps the white packaging distinct from the warm page. */
export function createCoffeeStudio(radius: number) {
    const studio = new THREE.Group();
    const target = new THREE.Object3D();
    studio.add(target);

    const key = new THREE.DirectionalLight(0xffffff, 2.1);
    key.position.set(-0.45, 0.7, 0.85).multiplyScalar(radius * 5);
    key.target = target;
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, {
        left: -radius * 1.3,
        right: radius * 1.3,
        top: radius * 1.3,
        bottom: -radius * 1.3,
        near: radius,
        far: radius * 9,
    });
    key.shadow.bias = -0.00005;
    key.shadow.normalBias = radius * 0.003;
    key.shadow.radius = 6;

    const fill = new THREE.DirectionalLight(0xffffff, 1.25);
    fill.position.set(0.6, 0.6, 0.9).multiplyScalar(radius * 5);
    fill.target = target;

    // A low diffuse sky/ground fill keeps the unlit side readable without an environment map.
    const bounce = new THREE.HemisphereLight(0xffffff, 0xd8d3ca, 1.15);
    studio.add(key, fill, bounce);
    return studio;
}
