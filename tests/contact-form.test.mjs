import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { renderToStaticMarkup } from "react-dom/server";
import * as jsxRuntime from "react/jsx-runtime";

const compiled = ts.transpileModule(readFileSync("src/components/ui/ContactForm.tsx", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function render(endpoint) {
    const exports = {};
    vm.runInNewContext(compiled, {
        exports, process: { env: { NEXT_PUBLIC_CONTACT_ENDPOINT: endpoint } },
        require(name) {
            if (name === "react/jsx-runtime") return jsxRuntime;
            if (name.endsWith("EditorialReveal")) return { EditorialReveal: ({ children }) => children };
            if (name.endsWith("Button")) return { Button: props => jsxRuntime.jsx("button", props) };
            throw Error(name);
        },
    });
    return renderToStaticMarkup(exports.ContactForm());
}

test("unconfigured contact form cannot silently send personal data to the current URL", () => {
    const html = render(undefined);
    assert.equal((html.match(/disabled=""/g) ?? []).length, 2);
    assert(html.includes("Kênh gửi tư vấn đang được cập nhật."));
    assert(!html.includes("action="));
});

test("configured receiver uses a native POST contract without claiming success in advance", () => {
    const html = render(" /api/contact ");
    assert(html.includes('action="/api/contact"'));
    assert(html.includes('method="post"'));
    assert(html.includes('name="contactInfo"'));
    assert(!html.includes("disabled="));
    assert(!html.includes("đang được cập nhật"));
});
