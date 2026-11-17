import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";

function load(file, imports = {}, globals = {}) {
    const exports = {};
    const { outputText } = ts.transpileModule(readFileSync(file, "utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    });
    vm.runInNewContext(outputText, { exports, ...globals, require(name) {
        if (name in imports) return imports[name];
        if (name.endsWith(".css")) return { default: new Proxy({}, { get: (_, name) => name }), __esModule: true };
        throw new Error(`Unexpected dependency: ${name}`);
    } });
    return exports;
}

function footer(reduced, { width = 1280, height = 800, nativeCSS = false } = {}) {
    const updates = new Set(), changes = new Set();
    let top = 400, measurements = 0;
    const window = { matchMedia: (query) => ({
        get matches() { return (!query.includes("no-preference") || !reduced) && (!query.includes("min-width: 64rem") || width >= 1024) && (!query.includes("min-height: 38rem") || height >= 608); },
        addEventListener: (_event, callback) => changes.add(callback),
        removeEventListener: (_event, callback) => changes.delete(callback),
    }) };
    const native = load("src/lib/native-motion.ts", {}, { window });
    const { setupFooterParallax } = load("src/components/layout/footer-parallax-runtime.ts", {
        "@/lib/native-motion": {
            observeMotion: native.observeMotion,
            observeScroll(update) { updates.add(update); update(); return () => updates.delete(update); },
        },
        "@/lib/scroll-viewport": { getScrollViewportHeight: () => height },
    }, { CSS: { supports: () => nativeCSS } });
    const style = { removeProperty(name) { delete this[name]; } };
    const stop = setupFooterParallax({
        querySelector: () => ({ style }),
        getBoundingClientRect: () => { measurements++; return { top, height }; },
    });
    return { style, stop, subscribers: () => updates.size, measurements: () => measurements, listeners: () => changes.size,
        move(value) { top = value; updates.forEach((update) => update()); },
        motion(value) { reduced = value; changes.forEach((change) => change()); },
    };
}

test("reduced motion leaves footer static and performs no geometry work", () => {
    const mounted = footer(true);
    assert.equal(mounted.style.transform, undefined);
    assert.equal(mounted.subscribers(), 0);
    mounted.move(100);
    assert.equal(mounted.measurements(), 0);
    mounted.stop();
    assert.equal(mounted.listeners(), 0);
});

test("footer retains its normal range and cleans up when reduced motion changes", () => {
    const mounted = footer(false);
    assert.equal(mounted.style.transform, "translateY(-25%)");
    mounted.move(200);
    assert.equal(mounted.style.transform, "translateY(-12.5%)");
    mounted.motion(true);
    assert.equal(mounted.style.transform, undefined);
    assert.equal(mounted.subscribers(), 0);
    const reads = mounted.measurements();
    mounted.move(0);
    assert.equal(mounted.measurements(), reads);
    mounted.motion(false);
    assert.equal(mounted.style.transform, "translateY(0%)");
    mounted.stop();
    assert.equal(mounted.style.transform, undefined);
    assert.equal(mounted.subscribers(), 0);
    assert.equal(mounted.listeners(), 0);
});

test("mobile footer fallback has the same depth without a desktop breakpoint", () => {
    const mounted = footer(false, { width: 390, height: 844 });
    mounted.move(422);
    assert.equal(mounted.style.transform, "translateY(-25%)");
    mounted.move(0);
    assert.equal(mounted.style.transform, "translateY(0%)");
    mounted.stop();
});

test("native footer timeline does not register JavaScript scroll work", () => {
    const mounted = footer(false, { width: 390, nativeCSS: true });
    assert.equal(mounted.style.transform, undefined);
    assert.equal(mounted.subscribers(), 0);
    assert.equal(mounted.measurements(), 0);
    assert.equal(mounted.listeners(), 0);
});

test("FAQ keeps native disclosures and category headings without misleading summary headings", () => {
    const Pass = ({ children }) => children;
    const { FaqContent } = load("src/app/faq/FaqContent.tsx", {
        react: React, "react/jsx-runtime": jsxRuntime,
        "@/components/ui/EditorialReveal": { EditorialReveal: Pass, RevealLink: ({ href, children }) => React.createElement("a", { href }, children) },
        "@/components/ui/Dropdown": { Dropdown: () => null },
        "@/components/ui/useEnhancedDisclosure": { useEnhancedDisclosure: () => ({ detailsRef: {}, panelRef: {}, enhanced: false, open: false, nativeOpen: false, setOpen() {} }) },
    });
    const html = renderToStaticMarkup(React.createElement(FaqContent));
    const summaries = html.match(/<summary\b[\s\S]*?<\/summary>/g);
    assert.equal(summaries.length, 17);
    summaries.forEach((summary) => {
        assert.doesNotMatch(summary, /<h[1-6]\b/);
        assert.match(summary, /data-reveal-title="true" class="questionRow"/);
    });
    assert.match(html, /<h2[^>]*id="ca-phe-title"/);
    assert.doesNotMatch(html, /id="[^"]*-answer"[^>]*(?:inert|aria-hidden="true")/);
});
