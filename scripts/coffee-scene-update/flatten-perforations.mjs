import assert from "node:assert/strict";
import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

// Replace the two perforated planes and their hole walls, retaining the outer rim.
export function flattenPerforations(geometry) {
    const points = geometry.attributes.position;
    const indices = geometry.index.array;
    const levels = new Map();
    for (let i = 0; i < points.count; i++) {
        const y = Math.round(points.getY(i) * 1e5) / 1e5;
        levels.set(y, (levels.get(y) || 0) + 1);
    }
    const planes = [...levels]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([y]) => y)
        .sort((a, b) => a - b);
    assert(planes[1] - planes[0] < 0.15, "Expected a thin perforated base");
    const caps = [];
    const removed = new Set();
    let innerRadius = Infinity;
    for (const y of planes) {
        const edges = new Map();
        const addEdge = (a, b) => {
            const key = a < b ? `${a}:${b}` : `${b}:${a}`;
            if (edges.has(key)) edges.delete(key);
            else edges.set(key, [a, b]);
        };
        for (let i = 0; i < indices.length; i += 3) {
            const face = Array.from(indices.slice(i, i + 3));
            if (!face.every((v) => Math.abs(points.getY(v) - y) < 2e-5)) continue;
            removed.add(i);
            for (let k = 0; k < 3; k++) addEdge(face[k], face[(k + 1) % 3]);
        }
        const next = new Map([...edges.values()]);
        assert.equal(next.size, edges.size, "Plane boundary must be oriented loops");
        const loops = [];
        while (next.size) {
            const start = next.keys().next().value;
            const loop = [];
            let cursor = start;
            do {
                assert(next.has(cursor), "Closed plane boundary");
                loop.push(cursor);
                const target = next.get(cursor);
                next.delete(cursor);
                cursor = target;
            } while (cursor !== start);
            loops.push(loop);
        }
        const area = (loop) => Math.abs(THREE.ShapeUtils.area(loop.map((v) => new THREE.Vector2(points.getX(v), points.getZ(v)))));
        loops.sort((a, b) => area(b) - area(a));
        assert(loops.length > 20 && area(loops[0]) > 2, "Expected an outer disk with many small holes");
        const outer = loops[0];
        innerRadius = Math.min(innerRadius, ...outer.map((v) => Math.hypot(points.getX(v), points.getZ(v))));
        const contour = outer.map((v) => new THREE.Vector2(points.getX(v), points.getZ(v)));
        const faces = THREE.ShapeUtils.triangulateShape(contour, []);
        const desiredY = y === planes[0] ? -1 : 1;
        for (const face of faces) {
            const tri = face.map((i) => outer[i]);
            const a = new THREE.Vector3().fromBufferAttribute(points, tri[0]);
            const b = new THREE.Vector3().fromBufferAttribute(points, tri[1]);
            const c = new THREE.Vector3().fromBufferAttribute(points, tri[2]);
            if (b.sub(a).cross(c.sub(a)).y * desiredY < 0) [tri[1], tri[2]] = [tri[2], tri[1]];
            caps.push(...tri);
        }
    }
    const kept = [];
    for (let i = 0; i < indices.length; i += 3) {
        if (removed.has(i)) continue;
        const tri = Array.from(indices.slice(i, i + 3));
        const holeWall = tri.every((v) => points.getY(v) >= planes[0] - 2e-5 && points.getY(v) <= planes[1] + 2e-5 && Math.hypot(points.getX(v), points.getZ(v)) < innerRadius - 1e-4);
        if (!holeWall) kept.push(...tri);
    }
    geometry.setIndex([...kept, ...caps]);
    geometry.deleteAttribute("normal");
    const welded = mergeVertices(geometry, 1e-5);
    welded.computeVertexNormals();
    const counts = new Map();
    const finalIndices = welded.index.array;
    for (let i = 0; i < finalIndices.length; i += 3) {
        for (let k = 0; k < 3; k++) {
            const a = finalIndices[i + k],
                b = finalIndices[i + ((k + 1) % 3)];
            const key = a < b ? `${a}:${b}` : `${b}:${a}`;
            counts.set(key, (counts.get(key) || 0) + 1);
        }
    }
    assert(
        [...counts.values()].every((n) => n === 2),
        "Flat replacement must remain watertight",
    );
    return welded;
}
