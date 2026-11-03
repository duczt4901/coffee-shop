import assert from "node:assert/strict";
import { test } from "node:test";
import { createCoffeeRenderLoop } from "../src/components/experience/coffee-bag/coffee-render-loop.ts";

test("render lifecycle coalesces changes, suspends work and resumes with the latest state", () => {
    let nextId = 0;
    const pending = new Map();
    const clock = {
        requestAnimationFrame(callback) {
            pending.set(++nextId, callback);
            return nextId;
        },
        cancelAnimationFrame(id) { pending.delete(id); },
    };
    const flush = () => {
        const callbacks = [...pending.values()];
        pending.clear();
        callbacks.forEach((callback) => callback(0));
    };
    let progress = 0;
    const drawn = [];
    const loop = createCoffeeRenderLoop(() => drawn.push(progress), clock);
    const scrollTo = (value) => { progress = value; loop.invalidate(); };

    for (let value = 0; value < 100; value++) scrollTo(value);
    assert.equal(pending.size, 0, "offscreen scroll must not schedule frames");
    loop.setActive(true);
    scrollTo(100);
    scrollTo(101);
    assert.equal(pending.size, 1, "scroll/resize updates must share one frame");
    flush();
    assert.deepEqual(drawn, [101], "draw the latest state, not a queue of stale views");
    flush();
    loop.setActive(true);
    assert.equal(pending.size, 0, "idle must not have a continuous render loop");

    scrollTo(102);
    loop.setActive(false);
    assert.equal(pending.size, 0, "leaving the viewport or hiding the tab cancels queued work");
    scrollTo(120);
    flush();
    assert.deepEqual(drawn, [101]);
    loop.setActive(true);
    flush();
    assert.deepEqual(drawn, [101, 120], "re-entry must render the current view");

    scrollTo(121);
    loop.dispose();
    loop.setActive(true);
    scrollTo(122);
    flush();
    assert.deepEqual(drawn, [101, 120], "unmounted components must never render again");
    assert.equal(pending.size, 0);
});
