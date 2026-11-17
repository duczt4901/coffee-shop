import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/page-reveal-runtime.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, removeComments: true },
});
assert(!/\brequire\s*\(/.test(outputText), "The early reveal must have no runtime dependencies");
await mkdir(new URL("../public/scripts/", import.meta.url), { recursive: true });
await writeFile(new URL("../public/scripts/page-reveal.js", import.meta.url), `(function(exports){\n${outputText}\n})({});\n`);
