import { readFileSync } from "node:fs";
import ts from "typescript";

// Resolve explicit dependencies without requiring Node's experimental TS/JSON module loaders.
export function typeScriptModuleURL(url, imports = {}) {
    const { outputText } = ts.transpileModule(readFileSync(url, "utf8"), {
        compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
    });
    let code = outputText;
    for (const [name, target] of Object.entries({ three: import.meta.resolve("three"), ...imports })) {
        code = code.replaceAll(`from ${JSON.stringify(name)}`, `from ${JSON.stringify(target)}`);
    }
    return `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
}

export async function importTypeScript(url, imports) {
    return import(typeScriptModuleURL(url, imports));
}
