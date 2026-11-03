import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const postcss = createRequire(require.resolve("next/package.json"))("postcss");
const sourceRoot = path.resolve("src");
const files = fs.readdirSync(sourceRoot, { recursive: true }).map((file) => path.join(sourceRoot, file));
const modules = new Map();

for (const file of files.filter((file) => file.endsWith(".module.css"))) {
    const declared = new Set();
    postcss.parse(fs.readFileSync(file, "utf8")).walkRules((rule) => {
        const selector = rule.selector.replace(/:global\([^)]*\)/g, "");
        for (const match of selector.matchAll(/\.([a-zA-Z_][\w-]*)/g)) declared.add(match[1]);
    });
    modules.set(file, {
        declared,
        used: new Set(),
        importers: 0,
    });
}

for (const file of files.filter((file) => /\.tsx?$/.test(file))) {
    const ast = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
    for (const statement of ast.statements) {
        if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
        const specifier = statement.moduleSpecifier.text;
        if (!specifier.endsWith(".module.css")) continue;
        const target = specifier.startsWith("@/") ? path.resolve(sourceRoot, specifier.slice(2)) : path.resolve(path.dirname(file), specifier);
        const stylesheet = modules.get(target);
        assert(stylesheet, `${file}: missing CSS stylesheet ${specifier}`);
        stylesheet.importers++;
        const binding = statement.importClause?.name?.text;
        assert(binding, `${file}: CSS stylesheet needs a named default binding`);
        function visit(node) {
            if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === binding) {
                const name = node.name.text;
                assert(stylesheet.declared.has(name), `${file}: ${binding}.${name} has no CSS declaration`);
                stylesheet.used.add(name);
            }
            ts.forEachChild(node, visit);
        }
        visit(ast);
    }
}

for (const [file, stylesheet] of modules) {
    assert(stylesheet.importers > 0, `${file}: stylesheet has no importers`);
    for (const name of stylesheet.declared) assert(stylesheet.used.has(name), `${file}: unused local class .${name}`);
}

console.log(`Passed references and unused-class checks for ${modules.size} CSS modules.`);
