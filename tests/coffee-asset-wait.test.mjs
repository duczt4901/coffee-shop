import assert from "node:assert/strict";
import { test } from "node:test";
import { importTypeScript } from "../scripts/lib/import-typescript.mjs";
const { waitForCoffeeAsset } = await importTypeScript(new URL("../src/components/experience/coffee-bag/coffee-asset-wait.ts", import.meta.url));

test("optional asset keeps the normal result and bounds a stalled request", async () => {
    const controller = new AbortController();
    const asset = {};
    let released = 0;
    assert.equal(await waitForCoffeeAsset(Promise.resolve(asset), 100, controller.signal, () => released++), asset);
    assert.equal(released, 0);
    let deliver;
    const pending = new Promise(resolve => { deliver = resolve; });
    assert.equal(await waitForCoffeeAsset(pending, 1, controller.signal, () => released++), null);
    deliver(asset);
    await Promise.resolve();
    assert.equal(released, 1);
});

test("unmount resolves promptly, disposes late data and handles failed requests", async () => {
    const controller = new AbortController();
    let deliver;
    let released = 0;
    const result = waitForCoffeeAsset(new Promise(resolve => { deliver = resolve; }), 10000, controller.signal, () => released++);
    controller.abort();
    assert.equal(await result, null);
    deliver({});
    await Promise.resolve();
    assert.equal(released, 1);
    assert.equal(await waitForCoffeeAsset(Promise.reject(new Error("offline")), 10000, new AbortController().signal, () => released++), null);
});
