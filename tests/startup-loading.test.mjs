import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const flush = () => new Promise(resolve => setImmediate(resolve));
const compile = file => ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

test("home client imports exclude config validation, Lenis and Three.js from eager dependencies", () => {
    const visited = new Set();
    function visit(file, client = false) {
        if (!/\.tsx?$/.test(file)) return;
        const text = readFileSync(file, "utf8");
        client ||= /^\s*["']use client["']/.test(text);
        const key = `${client}:${file}`;
        if (visited.has(key)) return;
        visited.add(key);
        const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
        for (const node of source.statements) {
            if (!ts.isImportDeclaration(node) && !ts.isExportDeclaration(node)) continue;
            if (!node.moduleSpecifier || node.isTypeOnly || node.importClause?.isTypeOnly) continue;
            const names = node.importClause?.namedBindings ?? node.exportClause;
            if (names && "elements" in names && names.elements.length && names.elements.every(name => name.isTypeOnly) && !node.importClause?.name) continue;
            const name = node.moduleSpecifier.text;
            if (client) assert(!/^(zod|lenis|three)(\/|$)/.test(name), `${file} eagerly imports ${name}`);
            const stem = name.startsWith("@/") ? path.resolve("src", name.slice(2)) : name.startsWith(".") ? path.resolve(path.dirname(file), name) : undefined;
            if (!stem) continue;
            const resolved = [stem, `${stem}.ts`, `${stem}.tsx`, path.join(stem, "index.ts"), path.join(stem, "index.tsx")].find(candidate => /\.tsx?$/.test(candidate) && existsSync(candidate));
            if (resolved) visit(resolved, client);
        }
    }
    visit("src/app/layout.tsx");
    visit("src/app/page.tsx");
    assert(visited.size > 20);
    assert(!/\brequire\s*\(/.test(readFileSync("public/scripts/page-reveal.js", "utf8")));
});

function approach() {
    let entered, resolve, imported = 0, setups = 0, cleanups = 0;
    const pending = new Promise(yes => { resolve = yes; });
    const events = Object.assign(new EventTarget(), { innerHeight: 800 });
    const root = { dataset: {} };
    const exports = {};
    vm.runInNewContext(compile("src/lib/enhance-when-visible.ts"), {
        exports, window: events, document: { documentElement: root }, console,
        IntersectionObserver: class { constructor(callback) { entered = callback; } observe() {} disconnect() {} },
    });
    const cleanup = exports.enhanceWhenVisible({}, () => { imported++; return pending; });
    return {
        cleanup,
        enter(top, intersecting = true) { entered([{ isIntersecting: intersecting, boundingClientRect: { top, bottom: top + 100 } }]); },
        done() { root.dataset.initialReveal = "done"; events.dispatchEvent(new Event("lavuon:reveal-done")); },
        resolve() { resolve(() => { setups++; return () => { cleanups++; }; }); },
        counts: () => [imported, setups, cleanups],
    };
}

test("offscreen enhancements wait for reveal, while a restored visible section prepares immediately", async () => {
    const near = approach();
    near.enter(850);
    assert.deepEqual(near.counts(), [0, 0, 0]);
    near.done();
    assert.deepEqual(near.counts(), [1, 0, 0]);
    near.resolve(); await flush();
    near.cleanup();
    assert.deepEqual(near.counts(), [1, 1, 1]);
    const visible = approach();
    visible.enter(100);
    assert.deepEqual(visible.counts(), [1, 0, 0]);
    visible.resolve(); await flush();
    visible.enter(100); visible.done();
    assert.deepEqual(visible.counts(), [1, 1, 0]);
    visible.cleanup();
});

test("unmount rejects a late enhancement import without changing its HTML", async () => {
    const frame = approach();
    frame.enter(100);
    frame.cleanup();
    frame.resolve(); await flush();
    assert.deepEqual(frame.counts(), [1, 0, 0]);
});

function smooth() {
    let resolve, imports = 0, creates = 0, destroys = 0, observer;
    const effects = [], moves = [];
    const pending = new Promise(yes => { resolve = yes; });
    const media = Object.assign(new EventTarget(), { matches: false });
    const events = Object.assign(new EventTarget(), { scrollY: 600, matchMedia: () => media });
    const root = { dataset: {}, style: {} };
    const exports = {};
    vm.runInNewContext(compile("src/providers/SmoothScroll.tsx"), {
        exports, window: events, document: { documentElement: root }, console,
        MutationObserver: class { constructor(callback) { observer = callback; } observe() {} disconnect() {} },
        require(name) {
            if (name === "react") return { useEffect: setup => effects.push(setup) };
            if (name === "next/navigation") return { usePathname: () => "/" };
            if (name.endsWith("smooth-scroll")) return { getSmoothScroll: () => events.__lavuonLenis };
            if (name === "lenis") { imports++; return pending; }
            throw Error(name);
        },
    });
    assert.equal(exports.default({ children: "server HTML" }), "server HTML");
    const cleanup = effects[0]();
    return {
        root, cleanup, moves,
        done() { root.dataset.initialReveal = "done"; root.dataset.revealActive = "false"; events.dispatchEvent(new Event("lavuon:reveal-done")); },
        load() { resolve({ default: class {
            constructor() { creates++; }
            scrollTo(position) { moves.push(position); }
            resize() {} destroy() { destroys++; }
        } }); },
        lock(value) { root.style.overflow = value ? "hidden" : ""; observer(); },
        motion(value) { media.matches = value; media.dispatchEvent(new Event("change")); },
        counts: () => [imports, creates, destroys],
    };
}

test("Lenis loads after reveal, preserves restored scroll and waits out a menu lock", async () => {
    const frame = smooth();
    assert.deepEqual(frame.counts(), [0, 0, 0]);
    frame.done(); await flush();
    assert.deepEqual(frame.counts(), [1, 0, 0]);
    frame.lock(true); frame.load(); await flush();
    assert.deepEqual(frame.counts(), [1, 0, 0]);
    frame.lock(false);
    assert.deepEqual(frame.counts(), [1, 1, 0]);
    assert.deepEqual(frame.moves, [600]);
    frame.motion(true);
    assert.deepEqual(frame.counts(), [1, 1, 1]);
    frame.motion(false);
    assert.deepEqual(frame.counts(), [1, 2, 1]);
    frame.cleanup();
    assert.deepEqual(frame.counts(), [1, 2, 2]);
});

test("a delayed Lenis import cannot create an instance after unmount", async () => {
    const frame = smooth(); frame.done(); await flush();
    frame.cleanup(); frame.load(); await flush();
    assert.deepEqual(frame.counts(), [1, 0, 0]);
});
