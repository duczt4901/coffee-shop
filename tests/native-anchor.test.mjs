import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as jsxRuntime from "react/jsx-runtime";

const compiled = ts.transpileModule(readFileSync("src/components/ui/EditorialReveal.tsx", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;

function anchor(href, variant, reduced = false, found = true, smooth = false) {
    const actions = [];
    const exports = {};
    vm.runInNewContext(compiled, {
        exports,
        document: { getElementById: () => found ? { scrollIntoView: (options) => actions.push(["scroll", { ...options }]) } : null },
        window: { matchMedia: () => ({ matches: reduced }) },
        require: (name) => {
            if (name === "lenis/react") return { useLenis: () => smooth ? { scrollTo: (_target, options) => actions.push(["lenis-scroll", { ...options }]) } : undefined };
            if (name === "next/navigation") return { useRouter: () => ({ push: (url, options) => actions.push(["push", url, { ...options }]) }) };
            if (name === "react/jsx-runtime") return jsxRuntime;
            if (name === "react" || name.startsWith("@/lib/") || name.endsWith(".css")) return {};
            if (["next/link", "./Button", "./LinkMarker"].includes(name)) return {};
            throw new Error(`Unexpected component dependency: ${name}`);
        },
    });
    const rendered = exports.RevealLink({ href, variant, children: "Anchor" });
    const link = rendered.props.children;
    assert.equal(link.props.href, href, "render the original href for no-JS and modified clicks");
    link.props.onNavigate({ preventDefault: () => actions.push(["cancel-default-scroll"]) });
    return actions;
}

test("valid in-page anchors use one native smooth scroll while Next owns the URL/history", () => {
    for (const variant of ["button", "border"]) {
        assert.deepEqual(anchor("#collection", variant), [
            ["cancel-default-scroll"],
            ["push", "#collection", { scroll: false }],
            ["scroll", { behavior: "smooth", block: "start" }],
        ]);
    }
});

test("reduced motion uses instant anchor scrolling", () => {
    for (const variant of ["button", "border"]) {
        assert.deepEqual(anchor("#collection", variant, true).at(-1), ["scroll", { behavior: "instant", block: "start" }]);
    }
});

test("page links, bare hashes and missing targets retain the default navigation", () => {
    for (const variant of ["button", "border"]) {
        assert.deepEqual(anchor("/san-pham/", variant), []);
        assert.deepEqual(anchor("#", variant), []);
        assert.deepEqual(anchor("#missing", variant, false, false), []);
    }
});

test("Lenis owns anchor scrolling without starting a second native animation", () => {
    for (const variant of ["button", "border"]) {
        for (const reduced of [false, true]) {
            assert.deepEqual(anchor("#collection", variant, reduced, true, true), [
                ["cancel-default-scroll"],
                ["push", "#collection", { scroll: false }],
                ["lenis-scroll", { immediate: reduced }],
            ]);
        }
    }
});
