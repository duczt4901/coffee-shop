import assert from "node:assert/strict";
import { test } from "node:test";
import * as THREE from "three";
import { importTypeScript } from "../scripts/lib/import-typescript.mjs";
const { createCoffeeResources } = await importTypeScript(new URL("../src/components/experience/coffee-bag/coffee-resources.ts", import.meta.url));

test("coffee ownership releases shared bitmaps, detached materials and late scenes exactly once", () => {
    let closed = 0;
    const bitmap = { close() { closed++; } };
    const texture = new THREE.Texture(bitmap);
    const geometry = new THREE.PlaneGeometry();
    const material = new THREE.MeshStandardMaterial({ map: texture, roughnessMap: texture });
    const group = new THREE.Group();
    const a = new THREE.Mesh(geometry, material);
    group.add(a, new THREE.Mesh(geometry, material));
    const disposed = [];
    for (const resource of [texture, geometry, material]) resource.addEventListener("dispose", () => disposed.push(resource));
    const owner = createCoffeeResources();
    owner.track(group);
    const replacement = new THREE.ShadowMaterial();
    replacement.addEventListener("dispose", () => disposed.push(replacement));
    a.material = replacement;
    owner.track(group);
    owner.dispose();
    owner.dispose();
    assert.equal(closed, 1);
    assert.equal(disposed.length, 4);
    assert.equal(new Set(disposed).size, 4);

    // A loader result that arrives after unmount gets its own short-lived owner.
    const lateOwner = createCoffeeResources();
    let lateClosed = 0;
    lateOwner.track(new THREE.Mesh(new THREE.PlaneGeometry(), new THREE.MeshBasicMaterial({ map: new THREE.Texture({ close() { lateClosed++; } }) })));
    lateOwner.dispose();
    assert.equal(lateClosed, 1);
});
