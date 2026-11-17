import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

function load(file, imports = {}, globals = {}) {
    const code = ts.transpileModule(readFileSync(file, "utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    const exports = {};
    vm.runInNewContext(code, {
        exports, ...globals,
        require(name) {
            if (name.endsWith(".css")) return { default: new Proxy({}, { get: (_, key) => key }), __esModule: true };
            if (name in imports) return imports[name];
            if (name === "react/jsx-runtime") return jsxRuntime;
            throw new Error(`Unexpected import: ${name}`);
        },
    });
    return exports;
}

const catalog = load("src/data/products.ts");
const commerce = load("src/lib/commerce.ts", { "../data/products": catalog });
const product = catalog.products[0];
const Link = ({ children, ...props }) => React.createElement("a", props, children);
const Button = ({ children, fullWidth, ...props }) => React.createElement("button", { ...props, "data-full-width": fullWidth || undefined }, children);
const Quantity = () => null;
const baseImports = {
    "next/link": { default: Link, __esModule: true },
    "next/navigation": { useRouter: () => ({ push() {} }) },
    "@/data/products": catalog,
    "@/data/contact": { ZALO_PHONE: "0356597539", ZALO_URL: "https://zalo.me/0356597539" },
    "@/lib/commerce": commerce,
    "@/components/ui/SkeletonImage": { SkeletonImage: () => null },
    "@/components/ui/EditorialReveal": { EditorialReveal: ({ children }) => children, RevealLine: () => null },
    "@/components/ui/Button": { Button },
    "@/components/ui/LinkMarker": { LinkMarker: () => null },
    "@/components/ui/Dropdown": { Dropdown: () => null },
    "./Quantity": { Quantity },
    "./cart-drawer": { openCartDrawer() {} },
};

function cartStore(items = [], failWrite = false) {
    let raw = JSON.stringify(items);
    const cartModule = load("src/components/commerce/useCart.ts", {
        react: { useMemo: fn => fn(), useSyncExternalStore: (_subscribe, snapshot) => snapshot() },
        "@/lib/commerce": commerce,
    }, {
        localStorage: { getItem: () => raw, setItem: (_key, value) => { if (failWrite) throw new Error("Storage unavailable"); raw = value; } },
    });
    return { useCart: cartModule.useCart, replace: items => { raw = JSON.stringify(items); } };
}

// Keep hook cells across renders; effects flush after refs attach, like the DOM commit.
function mount(file, exportName, imports, globals = {}) {
    let cursor = 0, effects = [];
    const cells = [];
    const effect = (setup, deps) => {
        const slot = cursor++, previous = cells[slot];
        if (!previous || deps.some((value, index) => !Object.is(value, previous.deps[index]))) {
            effects.push(() => { previous?.cleanup?.(); cells[slot] = { deps, cleanup: setup() }; });
        }
    };
    const hooks = {
        ...React,
        useState(initial) {
            const slot = cursor++;
            if (!(slot in cells)) cells[slot] = initial;
            return [cells[slot], value => { cells[slot] = typeof value === "function" ? value(cells[slot]) : value; }];
        },
        useRef(initial) {
            const slot = cursor++;
            return cells[slot] ??= { current: initial };
        },
        useEffect: effect,
        useLayoutEffect: effect,
    };
    const Component = load(file, { ...baseImports, ...imports, react: hooks }, globals)[exportName];
    return {
        render(props) { cursor = 0; effects = []; return Component(props); },
        flush() { effects.splice(0).forEach(run => run()); },
    };
}

function nodes(tree) {
    if (Array.isArray(tree)) return tree.flatMap(nodes);
    if (!tree || typeof tree !== "object" || !tree.props) return [];
    return [tree, ...nodes(tree.props.children)];
}

test("add reports the actual clamped mutation, even when the rendered cart snapshot is stale", () => {
    const store = cartStore([{ slug: product.slug, quantity: 98 }]);
    const stale = store.useCart();
    store.replace([{ slug: product.slug, quantity: 99 }]);
    assert.equal(stale.add(product.slug, 4).added, 0);
    assert.equal(store.useCart().count, 99);
    store.replace([{ slug: product.slug, quantity: 98 }]);
    const result = stale.add(product.slug, 4);
    assert.equal(result.added, 1);
    assert.equal(result.count, 99);
});

test("storage write failure keeps an accurate working memory cart and result", () => {
    const store = cartStore([], true);
    assert.equal(store.useCart().add(product.slug, 2).added, 2);
    assert.equal(store.useCart().count, 2);
    assert.equal(store.useCart().add(product.slug).count, 3);
});

test("both add buttons immediately announce real totals, without timers or fake pending state", () => {
    const store = cartStore();
    const view = mount("src/components/commerce/ProductPurchase.tsx", "ProductPurchase", { "./useCart": store });
    let tree = view.render({ product });
    nodes(tree).filter(node => node.type === Button)[0].props.onClick();
    tree = view.render({ product });
    assert.match(renderToStaticMarkup(tree), /Đã thêm 1 gói/);
    assert.match(renderToStaticMarkup(tree), /Tổng số gói trong giỏ: 1/);
    nodes(tree).filter(node => node.type === Button)[1].props.onClick();
    tree = view.render({ product });
    assert.equal(store.useCart().count, 2);
    assert.match(renderToStaticMarkup(tree), /Tổng số gói trong giỏ: 2/);
    nodes(tree).find(node => node.type === Quantity).props.onChange(3);
    assert.doesNotMatch(renderToStaticMarkup(view.render({ product })), /Đã thêm/);
});

test("full cart and mutation errors never announce an added item", () => {
    for (const failure of [false, true]) {
        const store = cartStore([{ slug: product.slug, quantity: 99 }]);
        const view = mount("src/components/commerce/ProductPurchase.tsx", "ProductPurchase", {
            "./useCart": failure ? { useCart: () => ({ ...store.useCart(), add() { throw new Error("Failed"); } }) } : store,
        });
        const tree = view.render({ product });
        nodes(tree).filter(node => node.type === Button)[0].props.onClick();
        const html = renderToStaticMarkup(view.render({ product }));
        assert.doesNotMatch(html, /Đã thêm/);
        assert.match(html, failure ? /Chưa thêm được/ : /Tối đa 99 gói/);
        assert.equal(store.useCart().count, 99);
    }
});

test("cart removal returns focus to the next row, then the empty-cart action", () => {
    const second = catalog.products[1];
    const store = cartStore([{ slug: product.slug, quantity: 1 }, { slug: second.slug, quantity: 1 }]);
    const focused = [];
    const view = mount("src/components/commerce/CartItems.tsx", "CartItems", { "./useCart": store });
    const root = { querySelector: selector => ({ focus: () => focused.push(selector === "a" ? "empty-action" : `cart-item-${second.slug}`) }) };
    const render = () => { const tree = view.render({}); tree.props.ref.current = root; view.flush(); return tree; };
    let tree = render();
    nodes(tree).find(node => node.props["aria-label"] === `Xóa ${product.name}`).props.onClick();
    tree = render();
    assert.equal(focused[0], `cart-item-${second.slug}`);
    assert.match(renderToStaticMarkup(tree), /Đã xóa/);
    nodes(tree).find(node => node.props["aria-label"] === `Xóa ${second.name}`).props.onClick();
    tree = render();
    assert.equal(focused[1], "empty-action");
    assert.equal(store.useCart().count, 0);
});

test("cart count motion skips hydration/reduced motion and cancels when a later update interrupts it", () => {
    let count = 0, ready = false, reduced = false, plays = 0, cancellations = 0;
    const view = mount("src/components/commerce/CartLink.tsx", "CartLink", {
        "./useCart": { useCart: () => ({ count, ready }) },
    }, { window: { matchMedia: () => ({ matches: reduced }) } });
    const render = () => {
        const tree = view.render({});
        nodes(tree).find(node => node.props.className === "badge").props.ref.current = { animate: () => { plays++; return { cancel: () => cancellations++ }; } };
        view.flush();
    };
    render(); ready = true; count = 4; render();
    assert.equal(plays, 0);
    count = 5; render(); count = 6; render();
    assert.equal(plays, 2);
    assert.equal(cancellations, 1);
    reduced = true; count = 7; render();
    assert.equal(plays, 2);
    assert.equal(cancellations, 2);
});

test("cart drawer keeps first-open state during hydration and stays modal until exit finishes", async () => {
    let finish, prevented = false, closes = 0;
    const finished = new Promise(resolve => { finish = resolve; });
    const view = mount("src/components/commerce/CartDrawer.tsx", "CartDrawer", {
        "next/navigation": { usePathname: () => "/" },
        "./useCart": cartStore(),
        "./CartItems": { CartItems: () => null },
    });
    const drawer = { open: true, dataset: {}, close() { closes++; this.open = false; }, getAnimations: () => [{ finished }] };
    const tree = view.render(); tree.props.ref.current = drawer; view.flush();
    assert.equal(closes, 0, "hydration must not close a drawer opened just before its effect");
    tree.props.onCancel({ preventDefault() { prevented = true; } });
    assert(prevented); assert(drawer.open); assert.equal(drawer.dataset.closing, "true");
    finish(); await new Promise(resolve => setImmediate(resolve));
    assert.equal(closes, 1); assert.equal(drawer.dataset.closing, undefined);
});

test("cart links open the native modal and keep checkout as their unavailable-JS fallback", () => {
    let prevented = false, shows = 0;
    const event = { preventDefault() { prevented = true; } };
    const missing = load("src/components/commerce/cart-drawer.ts", {}, { document: { querySelector: () => null } });
    missing.openCartDrawer(event); assert.equal(prevented, false);
    const drawer = { dataset: { closing: "true" }, showModal() { shows++; } };
    const available = load("src/components/commerce/cart-drawer.ts", {}, { document: { querySelector: () => drawer } });
    available.openCartDrawer(event);
    assert(prevented); assert.equal(shows, 1); assert.equal(drawer.dataset.closing, undefined);
});
