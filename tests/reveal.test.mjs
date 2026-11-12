import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";

const compiled = ts.transpileModule(readFileSync(new URL("../src/lib/reveal.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
});
const { REVEAL, revealStyle, isRevealVisible, getTextRevealDelay } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputText).toString("base64")}`);

test("text and image timing share the image reveal preset", () => {
    assert.equal(REVEAL.duration, 1600);
    assert.equal(REVEAL.easing, "cubic-bezier(0.22, 1, 0.36, 1)");
    assert.equal(revealStyle["--reveal-duration"], `${REVEAL.duration}ms`);
    assert.equal(revealStyle["--reveal-easing"], REVEAL.easing);
});

test("text and images enter at 90%, without revealing content outside the viewport", () => {
    assert.equal(isRevealVisible({ top: 901, height: 100 }, 1000), false);
    assert.equal(isRevealVisible({ top: 899, height: 100 }, 1000), true);
    assert.equal(isRevealVisible({ top: -101, height: 200 }, 1000), false);
    assert.equal(isRevealVisible({ top: -99, height: 200 }, 1000), true);
    assert.equal(isRevealVisible({ top: 500, height: 0 }, 1000), false);
});

test("visible content at the page end reveals even when its normal trigger is unreachable", () => {
    assert.equal(isRevealVisible({ top: 950, height: 30 }, 1000), false);
    assert.equal(isRevealVisible({ top: 950, height: 30 }, 1000, true), true);
    assert.equal(isRevealVisible({ top: 1001, height: 30 }, 1000, true), false);
    assert.equal(isRevealVisible({ top: -31, height: 30 }, 1000, true), false);
});

test("supporting text waits briefly, while headings, decoration and focus stay immediate", () => {
    const body = { closest: () => null, querySelector: () => null };
    const heading = { closest: () => ({}) };
    const mediaBlock = { closest: () => null, querySelector: () => ({}) };
    assert.equal(getTextRevealDelay(body, "lines"), 120);
    assert.equal(getTextRevealDelay(body, "words"), 120);
    assert.equal(getTextRevealDelay(heading, "words"), 0);
    assert.equal(getTextRevealDelay(body, "border"), 0);
    assert.equal(getTextRevealDelay(body, "marker"), 0);
    assert.equal(getTextRevealDelay(body, "words", true), 0);
    assert.equal(getTextRevealDelay(mediaBlock, "block"), 0);
});
