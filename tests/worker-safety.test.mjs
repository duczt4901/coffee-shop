import assert from "node:assert/strict";
import { test } from "node:test";
import { importTypeScript, typeScriptModuleURL } from "../scripts/lib/import-typescript.mjs";

const products = typeScriptModuleURL(new URL("../src/data/products.ts", import.meta.url));
const commerce = typeScriptModuleURL(new URL("../src/lib/commerce.ts", import.meta.url), { "../data/products": products });
const orders = typeScriptModuleURL(new URL("../src/lib/orders.ts", import.meta.url), {
    zod: import.meta.resolve("zod"),
    "../data/products": products,
    "./commerce": commerce,
});
const { default: worker } = await importTypeScript(new URL("../worker/index.ts", import.meta.url), {
    "../src/lib/orders": orders,
    "../src/lib/commerce": commerce,
});

test("disabled checkout cron never reads stored customer orders or sends notifications", async () => {
    let databaseAccessed = false;
    await worker.scheduled({}, {
        get DB() {
            databaseAccessed = true;
            throw new Error("Disabled checkout must not access orders");
        },
    });
    assert.equal(databaseAccessed, false);
    await worker.scheduled({}, {});
});
