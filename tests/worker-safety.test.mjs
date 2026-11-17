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

test("enabled checkout cron reads pending orders and tolerates an unconfigured database", async () => {
    let databaseAccessed = false;
    await worker.scheduled({}, {
        DB: { prepare(query) {
            assert.match(query, /email_status = 'pending'/);
            databaseAccessed = true;
            return { async all() { return { results: [] }; } };
        } },
    });
    assert.equal(databaseAccessed, true);
    await worker.scheduled({}, {});
});
