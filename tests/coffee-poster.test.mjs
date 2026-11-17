import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";

test("the scene has responsive WebP placeholders before hydration or WebGL", () => {
    const source = ts.transpileModule(readFileSync("src/components/experience/coffee-bag/LocalCoffeeModel.tsx", "utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    const exports = {};
    vm.runInNewContext(source, { exports, require(name) {
        if (name === "react/jsx-runtime") return jsxRuntime;
        if (name === "@/components/ui/SkeletonImage") return { SkeletonImage: props => jsxRuntime.jsx("img", props) };
        if (name === "react") return { useRef: () => ({ current: null }), useEffect() {}, useImperativeHandle() {} };
        if (name.endsWith(".module.css")) return { default: new Proxy({}, { get: (_, key) => key }) };
        return {};
    } });
    const html = renderToStaticMarkup(exports.LocalCoffeeModel({ ref: null }));
    assert(html.includes('data-coffee-state="loading"'));
    assert(html.includes("<picture>"));
    assert(html.includes('media="(max-width: 47.999rem)"'));
    for (const file of ["robusta-scene-poster.webp", "robusta-scene-poster-mobile.webp"]) {
        assert(html.includes(`/images/3d/${file}`));
        const bytes = readFileSync(`public/images/3d/${file}`);
        assert.equal(bytes.toString("ascii", 8, 12), "WEBP");
        assert(bytes.length > 10_000 && bytes.length < 150_000);
    }
    assert(!html.includes("/images/products/"), "fallback must show the rendered scene, not a catalog photo");
});
