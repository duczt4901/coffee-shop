import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { generateCoffeeFramingCSS } from "../scripts/generate-coffee-framing-css.mjs";
import { validateCoffeeFramingCSS, getCoffeeFramingSourceHash } from "../scripts/check-coffee-framing-css.mjs";

test("static CSS shell matches the real GLB and rejects stale or hand-edited framing", async () => {
    const generated = await generateCoffeeFramingCSS();
    const css = (await readFile(new URL("../src/components/experience/coffee-bag/coffee-framing.generated.css", import.meta.url), "utf8")).replace(/\r\n/g, "\n");
    assert.equal(css, generated.css);
    assert(generated.samples >= 200);
    assert(generated.maxError <= 1);
    const sourceHash = await getCoffeeFramingSourceHash();
    validateCoffeeFramingCSS(css, sourceHash);
    assert.throws(() => validateCoffeeFramingCSS(css, "changed-source"), /framing is stale/);
    assert.throws(() => validateCoffeeFramingCSS(css + " ", sourceHash), /CSS was edited/);
});
