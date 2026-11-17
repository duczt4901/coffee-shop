import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";

const source = ts.transpileModule(readFileSync("src/components/sections/home-page/HeroVideo.tsx", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

test("hero keeps its poster and defers video until reveal, visibility and motion allow it", () => {
    let effect, intersect, changed, plays = 0, disconnected = 0;
    const reveal = { hidden: false, dataset: { revealState: "waiting" } };
    const preference = Object.assign(new EventTarget(), { matches: false });
    const video = { src: "", closest: () => ({}), getAttribute: () => video.src, play() { plays++; return Promise.resolve(); }, pause() {} };
    const exports = {};
    vm.runInNewContext(source, {
        exports,
        document: Object.assign(new EventTarget(), { hidden: false, querySelector: () => reveal }),
        window: { matchMedia: () => preference },
        IntersectionObserver: class { constructor(callback) { intersect = callback; } observe() {} disconnect() { disconnected++; } },
        MutationObserver: class { constructor(callback) { changed = callback; } observe() {} disconnect() { disconnected++; } },
        require(name) {
            if (name === "react/jsx-runtime") return jsxRuntime;
            if (name === "react") return { useRef: () => ({ current: video }), useEffect(setup) { effect = setup; } };
            throw Error(name);
        },
    });
    const html = renderToStaticMarkup(exports.HeroVideo());
    assert(html.includes('preload="none"'));
    assert(html.includes('poster="/images/coffee/coffee-cherry-sorting-hero-poster.webp"'));
    assert(!html.includes("coffee-cherry-harvest.webp"), "the hero must not flash the slideshow's second image");
    const poster = readFileSync("public/images/coffee/coffee-cherry-sorting-hero-poster.webp");
    assert.equal(poster.toString("ascii", 8, 12), "WEBP");
    assert(!html.includes(".mp4"), "HTML must not start a video request");
    const cleanup = effect();
    intersect([{ isIntersecting: true }]);
    assert.equal(video.src, "");
    reveal.dataset.revealState = "opening";
    preference.matches = true;
    changed();
    assert.equal(video.src, "", "reduced motion keeps the poster without fetching video");
    preference.matches = false;
    changed();
    assert(video.src.endsWith(".mp4"));
    assert.equal(plays, 1);
    intersect([{ isIntersecting: false }]);
    changed();
    assert.equal(plays, 1, "offscreen video must not restart");
    cleanup();
    assert.equal(disconnected, 2);
});
