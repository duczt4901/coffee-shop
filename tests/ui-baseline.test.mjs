import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const styles = new Proxy({}, { get: (_, name) => name });
const Link = ({ children, ...props }) => React.createElement("a", props, children);
const Pass = ({ children }) => children;
const modules = {
    react: React,
    "react/jsx-runtime": jsxRuntime,
    "next/link": { default: Link, __esModule: true },
    "next/image": { default: (props) => React.createElement("img", { ...props, priority: undefined }), __esModule: true },
    "next/navigation": { usePathname: () => "/" },
    "lenis/react": { useLenis: () => undefined },
    "@/lib/utils": { cn: (...names) => names.filter(Boolean).join(" ") },
    "@/lib/database": { database: { header: { href: "/", ariaLabel: "Lá Vườn", headerItems: [{ href: "/san-pham/", ariaLabel: "Sản phẩm" }] } } },
    "@/lib/scroll-viewport": { getScrollViewportHeight: () => 800 },
    "@/components/ui/ScribbleText": { ScribbleText: { Root: Pass, Item: ({ href, text }) => React.createElement("a", { href }, text) } },
    "@/components/commerce/CartLink": { CartLink: () => React.createElement("a", { href: "/gio-hang/" }, "Giỏ hàng") },
    "@/components/ui/EditorialReveal": { EditorialReveal: Pass, RevealLink: Link, RevealLine: () => null },
    "./Chevron": { ChevronDownIcon: () => React.createElement("svg") },
};

function load(file, overrides = {}, globals = {}) {
    const compiled = ts.transpileModule(readFileSync(file, "utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    const exports = {};
    vm.runInNewContext(compiled, {
        exports,
        ...globals,
        require(name) {
            if (name.endsWith(".css")) return { default: styles, __esModule: true };
            if (name in overrides) return overrides[name];
            if (name in modules) return modules[name];
            if (name === "@/components/ui/useEnhancedDisclosure") return load("src/components/ui/useEnhancedDisclosure.ts", overrides, globals);
            throw new Error(`Unexpected import: ${name}`);
        },
    });
    return exports;
}

test("server HTML has a native mobile menu, usable links and the homepage logo geometry", () => {
    const { SiteHeader } = load("src/components/layout/SiteHeader.tsx");
    const html = renderToStaticMarkup(React.createElement(SiteHeader));
    assert.match(html, /<nav[^>]*class="header homeHeader /);
    assert.doesNotMatch(html, /data-scroll-ready/);
    assert.match(html, /<details[^>]*class="mobileMenu"[^>]*><summary/);
    const menu = html.slice(html.indexOf("<details"), html.indexOf("</details>"));
    assert.match(menu, /href="\/san-pham\/"/);
    assert.match(menu, /href="\/faq\/"/);
    assert.doesNotMatch(menu, /aria-hidden="true"|tabindex="-1"/);
    assert.match(html, /class="logo homeLogo"/);
});

test("home hero keeps the shared poster/video layer without an oversized title", () => {
    const { ImmersivePage } = load("src/components/layout/ImmersivePage.tsx", { "@/lib/native-motion": {} });
    const { HeroVideo } = load("src/components/sections/home-page/HeroVideo.tsx");
    const { default: HomePage } = load("src/app/page.tsx", {
        "@/components/layout/ImmersivePage": { ImmersivePage },
        "@/components/experience/CoffeeBagExperience": { CoffeeBagExperience: () => null },
        "@/components/sections/home-page/CoffeeOriginSection": { CoffeeOriginSection: () => null },
        "@/components/sections/home-page/ProcessGallerySection": { ProcessGallerySection: () => null },
        "@/components/sections/home-page": { HeroVideo, FeaturedProductsSection: () => null },
        "@/lib/metadata": { createMetadata: () => ({}) },
    });
    const html = renderToStaticMarkup(React.createElement(HomePage));
    assert(html.includes('data-hero-media="true"'));
    assert(html.includes('poster="/images/coffee/coffee-cherry-sorting-hero-poster.webp"'));
    assert(!html.includes(".mp4"));
    assert(!html.includes("data-hero-title-line"));
    assert(!html.includes("heroTitle"));
    assert(html.includes('class="relative z-10 min-h-screen min-h-svh"'));
});

test("header fixes its position only after valid geometry and restores the baseline on failure", () => {
    for (const failure of [undefined, "geometry", "listener"]) {
        const layout = [];
        const listeners = new Map();
        const header = { dataset: {} };
        const logo = { offsetWidth: 600, offsetHeight: 420, style: { removeProperty(name) { delete this[name]; } } };
        const react = {
            ...React,
            useState: (value) => [value, () => {}],
            useRef: (value) => ({ current: value }),
            useLayoutEffect: (effect) => layout.push(effect),
            useEffect() {},
        };
        const { SiteHeader } = load("src/components/layout/SiteHeader.tsx", {
            react,
            "@/components/ui/useEnhancedDisclosure": { useEnhancedDisclosure: () => ({
                detailsRef: { current: null }, panelRef: { current: null }, enhanced: false, open: false, nativeOpen: false, setOpen() {}, disable() {},
            }) },
        }, {
            document: { readyState: "loading" },
            window: {
                scrollY: 2400,
                addEventListener(name, callback) {
                    if (failure === "listener" && name === "resize") throw new Error("listener failed");
                    listeners.set(name, callback);
                },
                removeEventListener(name) { listeners.delete(name); },
            },
            getComputedStyle: () => ({ top: failure === "geometry" ? "auto" : "20px", getPropertyValue: () => "72px" }),
            requestAnimationFrame: () => 1,
            cancelAnimationFrame() {},
        });
        const tree = SiteHeader();
        tree.props.ref.current = header;
        const findLogo = (node) => {
            if (!node?.props) return;
            if (node.props.className === "logo homeLogo") return node;
            return React.Children.toArray(node.props.children).map(findLogo).find(Boolean);
        };
        findLogo(tree).props.ref.current = logo;
        const cleanup = layout[0]();
        if (failure) {
            assert.equal(header.dataset.scrollReady, undefined);
            assert.equal(logo.style.transform, undefined);
            assert.equal(listeners.size, 0);
        } else {
            assert.equal(header.dataset.scrollReady, "");
            assert.equal(logo.style.transform, "translate3d(-50%, 0px, 0) scale(0.12)");
            assert.equal(listeners.size, 3);
            cleanup();
            assert.equal(header.dataset.scrollReady, undefined);
            assert.equal(logo.style.transform, undefined);
            assert.equal(listeners.size, 0);
        }
    }
});

test("FAQ answers are behind native disclosures rather than JS-only inert panels", () => {
    const { Dropdown } = load("src/components/ui/Dropdown.tsx");
    const { FaqContent } = load("src/app/faq/FaqContent.tsx", { "@/components/ui/Dropdown": { Dropdown } });
    const html = renderToStaticMarkup(React.createElement(FaqContent));
    assert.match(html, /<details[^>]*><summary id="ca-phe-0-question"/);
    assert.match(html, /id="ca-phe-0-answer"[^>]*class="answer "/);
    assert.doesNotMatch(html, /id="[^"]*-answer"[^>]*(?:inert|aria-hidden="true")/);
    assert.match(html, /href="#cach-pha"/);
    assert.match(html, /Bộ sưu tập hiện có cà phê Robusta và Arabica/);
});

test("dropdown fallback exposes real variant URLs without waiting for event handlers", () => {
    const { Dropdown } = load("src/components/ui/Dropdown.tsx");
    const html = renderToStaticMarkup(React.createElement(Dropdown, {
        value: "250", label: "Khối lượng", onChange() {},
        options: [{ value: "250", label: "250g", href: "/san-pham/250/" }, { value: "500", label: "500g", href: "/san-pham/500/" }],
    }));
    assert.match(html, /<details/);
    assert.match(html, /<summary/);
    assert.match(html, /href="\/san-pham\/250\/"/);
    assert.match(html, /href="\/san-pham\/500\/"/);
    assert.doesNotMatch(html, /<button|role="listbox"/);
});

test("dropdown enhancement preserves native focus and the active option without scrolling", () => {
    for (const focused of ["summary", "option", "outside"]) {
        const slots = [];
        const effects = [];
        let cursor = 0;
        let focusOptions;
        const react = {
            ...React,
            useId: () => "variant",
            useRef(value) { const key = cursor++; return slots[key] ??= { current: value }; },
            useState(initial) {
                const key = cursor++;
                if (!(key in slots)) slots[key] = typeof initial === "function" ? initial() : initial;
                return [slots[key], (value) => { slots[key] = value; }];
            },
            useEffect() {},
            useLayoutEffect(callback, deps) {
                const key = cursor++;
                if (!slots[key] || deps.some((dep, index) => dep !== slots[key][index])) effects.push(callback);
                slots[key] = deps;
            },
        };
        const activeElement = {};
        const { Dropdown } = load("src/components/ui/Dropdown.tsx", { react }, { document: { activeElement } });
        const props = { value: "250", label: "Khối lượng", onChange() {}, options: [
            { value: "250", label: "250g", href: "/250/" }, { value: "500", label: "500g", href: "/500/" },
        ] };
        const native = Dropdown(props);
        native.props.ref.current = {
            open: focused === "option",
            contains: (element) => element === activeElement && focused !== "outside",
            querySelector: () => focused === "option" ? { dataset: { optionIndex: "1" } } : null,
        };
        effects.splice(0).forEach((effect) => effect());
        cursor = 0;
        const enhanced = Dropdown(props);
        const trigger = enhanced.props.children[0];
        trigger.props.ref.current = { focus: (options) => { focusOptions = options; } };
        effects.splice(0).forEach((effect) => effect());
        assert.equal(focusOptions?.preventScroll, focused === "outside" ? undefined : true);
        assert.equal(trigger.props["aria-activedescendant"], focused === "option" ? "variant-1" : undefined);
        assert.equal(trigger.props["aria-expanded"], focused === "option");
    }
});

test("purchase controls stay disabled until the local cart is ready and explain the no-JS alternative", () => {
    const product = { slug: "coffee-250", name: "Cà phê", category: "Robusta", tagline: "Đậm vị", sizeLabel: "250g", priceVnd: 100000, image: "/coffee.webp", accent: "#fff" };
    const { Button } = load("src/components/ui/Button.tsx");
    const { Dropdown } = load("src/components/ui/Dropdown.tsx");
    for (const ready of [false, true]) {
        const { ProductPurchase } = load("src/components/commerce/ProductPurchase.tsx", {
            "next/navigation": { useRouter: () => ({ push() {} }) },
            "@/data/products": { products: [product] },
            "@/lib/commerce": { formatPrice: (value) => `${value}đ` },
            "@/components/ui/Button": { Button },
            "@/components/ui/Dropdown": { Dropdown },
            "@/components/ui/LinkMarker": { LinkMarker: () => null },
            "./Quantity": { Quantity: () => null },
            "./useCart": { useCart: () => ({ ready, add() {} }) },
        });
        const html = renderToStaticMarkup(React.createElement(ProductPurchase, { product }));
        const controls = html.match(/<button[^>]*>/g);
        assert.equal(controls.length, 2);
        controls.forEach((control) => assert.equal(control.includes('disabled=""'), !ready));
        assert.match(html, /Giỏ hàng cần JavaScript để thêm sản phẩm/);
        assert.match(html, /href="\/lien-he\/"/);
    }
});

function menuLock({ alreadyStopped = false, failMedia = false, failStop = false } = {}) {
    let effect;
    let stateIndex = 0;
    let starts = 0;
    let removes = 0;
    const root = { style: { overflow: "scroll" } };
    const lenis = {
        isStopped: alreadyStopped,
        stop() { this.isStopped = true; if (failStop) throw new Error("stop failed"); },
        start() { starts++; this.isStopped = false; },
    };
    const react = {
        ...React,
        useState(initial) { return [stateIndex++ === 1 ? true : initial, () => {}]; },
        useRef() { return { current: null }; },
        useLayoutEffect() {},
        useEffect(callback) { effect = callback; },
    };
    const { SiteHeader } = load("src/components/layout/SiteHeader.tsx", {
        react, "lenis/react": { useLenis: () => lenis },
        "@/components/ui/useEnhancedDisclosure": { useEnhancedDisclosure: () => ({
            detailsRef: { current: null }, panelRef: { current: null }, enhanced: true, open: true, nativeOpen: true, setOpen() {}, disable() {},
        }) },
    }, {
        document: { documentElement: root },
        queueMicrotask,
        window: { matchMedia: () => ({ matches: false, addEventListener() { if (failMedia) throw new Error("media failed"); }, removeEventListener() { removes++; } }) },
    });
    SiteHeader();
    const cleanup = effect();
    return { root, lenis, cleanup, starts: () => starts, removes: () => removes };
}

test("mobile menu releases its own scroll lock and preserves a pre-existing Lenis stop", () => {
    for (const alreadyStopped of [false, true]) {
        const mounted = menuLock({ alreadyStopped });
        assert.equal(mounted.root.style.overflow, "hidden");
        mounted.cleanup();
        assert.equal(mounted.root.style.overflow, "scroll");
        assert.equal(mounted.lenis.isStopped, alreadyStopped);
        assert.equal(mounted.starts(), alreadyStopped ? 0 : 1);
        assert.equal(mounted.removes(), 1);
    }
});

test("optional menu setup failures cannot leave native overflow or Lenis locked", () => {
    for (const failure of [{ failMedia: true }, { failStop: true }]) {
        const mounted = menuLock(failure);
        assert.equal(mounted.root.style.overflow, "scroll");
        assert.equal(mounted.lenis.isStopped, false);
        mounted.cleanup();
        assert.equal(mounted.root.style.overflow, "scroll");
    }
});
