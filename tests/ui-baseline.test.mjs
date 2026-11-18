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
    "@/lib/smooth-scroll": { getSmoothScroll: () => undefined },
    "@/lib/enhance-when-visible": { enhanceWhenVisible: () => () => {} },
    "@/lib/utils": { cn: (...names) => names.filter(Boolean).join(" ") },
    "@/lib/image-load-reveal": { revealLoadedImage() {} },
    "@/data/image-placeholders.json": JSON.parse(readFileSync("src/data/image-placeholders.json", "utf8")),
    "@/data/responsive-images.json": JSON.parse(readFileSync("src/data/responsive-images.json", "utf8")),
    "@/lib/database": { database: { site: { name: "Là Vườn Coffee" }, header: { href: "/", ariaLabel: "Là Vườn", headerItems: [{ href: "/san-pham/", ariaLabel: "Sản phẩm" }] } } },
    "@/lib/native-motion": { observeScroll: () => () => {} },
    "@/lib/scroll-viewport": { getScrollViewportHeight: () => 800 },
    "@/data/contact": { ZALO_PHONE: "0356597539", ZALO_URL: "https://zalo.me/0356597539" },
    "@/components/ui/ScribbleText": { ScribbleText: { Root: Pass, Item: ({ href, text }) => React.createElement("a", { href }, text) } },
    "@/components/commerce/CartLink": { CartLink: () => React.createElement("a", { href: "/thanh-toan/" }, "Giỏ hàng") },
    "@/components/commerce/cart-drawer": { openCartDrawer() {} },
    "./cart-drawer": { openCartDrawer() {} },
    "@/components/ui/EditorialReveal": { EditorialReveal: Pass, RevealLink: Link, RevealLine: () => null },
    "./Chevron": { ChevronDownIcon: () => React.createElement("svg") },
};
modules["@/lib/site-config"] = { siteConfig: modules["@/lib/database"].database };
modules["@/data/page-content"] = load("src/data/page-content.ts");
modules["@/data/page-images"] = load("src/data/page-images.ts");

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
            if (name === "@/components/ui/SkeletonImage") return load("src/components/ui/SkeletonImage.tsx", overrides, globals);
            if (name === "@/lib/scroll-lock") return load("src/lib/scroll-lock.ts", overrides, globals);
            if (name === "./smooth-scroll") return overrides["@/lib/smooth-scroll"] ?? modules["@/lib/smooth-scroll"];
            if (name === "@/components/ui/useEnhancedDisclosure") return load("src/components/ui/useEnhancedDisclosure.ts", overrides, globals);
            if (name === "@/components/layout/BrandIntro") return load("src/components/layout/BrandIntro.tsx", overrides, globals);
            if (name === "./SiteMenu") return load("src/components/layout/SiteMenu.tsx", overrides, globals);
            throw new Error(`Unexpected import: ${name}`);
        },
    });
    return exports;
}

test("server header has a native menu, centered wordmark and cart without a Zalo header button", () => {
    const { SiteHeader } = load("src/components/layout/SiteHeader.tsx");
    const html = renderToStaticMarkup(React.createElement(SiteHeader));
    assert.match(html, /<header[^>]*data-over-hero="true"[^>]*class="header"/);
    assert.doesNotMatch(html, /data-scroll-ready/);
    assert.match(html, /<details[^>]*class="menu"[^>]*><summary/);
    const menu = html.slice(html.indexOf("<details"), html.indexOf("</details>"));
    assert.match(menu, /href="\/san-pham\/"/);
    assert.match(menu, /href="\/faq\/"/);
    assert.doesNotMatch(menu, /<div[^>]*class="panel"[^>]*aria-hidden="true"|<a[^>]*tabindex="-1"/);
    assert(!html.includes("Điều hướng nhanh") && !html.includes("VI-VN"));
    assert(html.includes('class="toggleLabel">Menu</span>'));
    assert(html.includes('data-menu-close="true"'));
    assert.match(html, /class="logo"/);
    assert(!html.includes("data-page-reveal-logo"));
    assert(html.includes('href="https://zalo.me/0356597539"'));
    assert(!html.slice(html.indexOf('class="actions"')).includes("zalo.me"));
});

test("home keeps its poster/video and owns the three-line brand outside the header", () => {
    const { ImmersivePage } = load("src/components/layout/ImmersivePage.tsx", { "@/lib/native-motion": {} });
    const { HeroVideo } = load("src/components/sections/home-page/HeroVideo.tsx");
    const { default: HomePage } = load("src/app/page.tsx", {
        "@/components/layout/ImmersivePage": { ImmersivePage },
        "@/components/experience/CoffeeBagExperience": { CoffeeBagExperience: () => React.createElement("section", { "data-coffee-experience": true }) },
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
    assert(!html.includes("data-home-benefits"));
    assert(html.includes('data-hero-brand="true"'));
    assert(!html.includes("data-hero-video-control"));
    assert.equal((html.match(/data-brand-line="true"/g) ?? []).length, 3);
    assert.match(html, /<h1[^>]*>Chậm một chút, đậm một ngày\.<\/h1>/);
});

test("catalog and featured products assign a distinct reveal step to each complete card", () => {
    const catalog = load("src/data/products.ts");
    const imports = {
        "@/data/products": catalog,
        "@/lib/commerce": { formatListingPrice: value => `${value} vnđ` },
        "@/lib/metadata": { createMetadata: () => ({}) },
        "@/components/ui/ImageReveal": { ImageReveal: Pass },
        "@/components/ui/SkeletonImage": { SkeletonImage: ({ src, alt }) => React.createElement("img", { src, alt }) },
    };
    for (const [file, name, tag, firstStep] of [
        ["src/app/san-pham/page.tsx", "default", "li", 1],
        ["src/components/sections/home-page/FeaturedProductsSection.tsx", "FeaturedProductsSection", "article", 0],
    ]) {
        const Component = load(file, imports)[name];
        const html = renderToStaticMarkup(React.createElement(Component));
        const cards = [...html.matchAll(new RegExp(`<${tag}\\b[^>]*data-reveal-step="(\\d+)"[^>]*>([\\s\\S]*?)</${tag}>`, "g"))];
        assert.equal(cards.length, catalog.products.length, file);
        cards.forEach(([, step, card], index) => {
            assert.equal(Number(step), firstStep + index);
            assert(card.includes(`href="/san-pham/${catalog.products[index].slug}/"`));
            assert(card.includes("data-product-details"), "image, name and price share the card's step");
        });
    }
});

test("benefits use a plain heading, empty icon slots and a native dismissible popover", () => {
    const { BenefitsSection } = load("src/components/sections/home-page/BenefitsSection.tsx", {
        "@/lib/commerce": { formatPrice: value => `${value} ₫`, FREE_SHIPPING_THRESHOLD: 700000 },
    });
    const html = renderToStaticMarkup(React.createElement(BenefitsSection));
    const heading = html.match(/<h2 id="home-benefits-title"[^>]*>[^<]*<\/h2>/)?.[0];
    assert(heading);
    assert(!heading.includes("data-reveal"));
    assert(!html.includes("data-editorial-reveal"));
    assert.equal((html.match(/data-benefit-icon="true" aria-hidden="true" class="icon"><\/span>/g) ?? []).length, 3);
    assert(!html.includes("<img") && !html.includes("<svg"));
    assert(html.includes('popover="auto" role="dialog"'));
    assert.equal((html.match(/popoverTarget="home-benefits-details"/gi) ?? []).length, 4);
    assert(html.includes('popoverTargetAction="hide"'));
    assert(html.includes("700000 ₫"), "free shipping follows the real commerce threshold");
});

test("about hero starts with a readable light logo while product heroes keep their dark logo", () => {
    for (const [pathname, light] of [["/ve-chung-toi/", true], ["/san-pham/robusta/", false]]) {
        const { SiteHeader } = load("src/components/layout/SiteHeader.tsx", { "next/navigation": { usePathname: () => pathname } });
        const html = renderToStaticMarkup(React.createElement(SiteHeader));
        assert(html.includes(`data-light-logo="${light}"`));
        assert(html.includes('data-over-hero="true"'));
    }
});

test("footer mark, legal text and contact controls have reveals without hiding server HTML", () => {
    const { Button } = load("src/components/ui/Button.tsx");
    const { ContactForm } = load("src/components/ui/ContactForm.tsx", {
        "@/components/ui/Button": { Button },
    }, { process: { env: {} } });
    const { SiteFooter } = load("src/components/layout/SiteFooter.tsx", {
        "@/components/ui/ContactForm": { ContactForm },
        "@/lib/native-motion": {},
    });
    const html = renderToStaticMarkup(React.createElement(SiteFooter));
    assert.match(html, /<svg[^>]*data-reveal="block"[^>]*aria-label="Là Vườn Coffee"/);
    assert(html.includes("Là Vườn Coffee"));
    assert(html.includes('href="https://zalo.me/0356597539"'));
    assert.match(html, /data-reveal="words">All Rights Reserved<\/span>/);
    assert.match(html, /data-reveal="words">Credits<\/span>/);
    assert.match(html, /<input data-reveal="lines"[^>]*name="contactInfo"/);
    assert.match(html, /<button[^>]*data-reveal="lines"[^>]*>gửi<\/button>/);
    assert.match(html, /<p data-reveal="lines"[^>]*>Kênh gửi tư vấn/);
    assert(!html.includes("data-reveal-pending"));
});

test("shared cart items preserve quantity and removal controls inside checkout and the drawer", () => {
    const { Button } = load("src/components/ui/Button.tsx");
    const { CartItems } = load("src/components/commerce/CartItems.tsx", {
        "@/components/ui/Button": { Button },
        "@/components/ui/LinkMarker": { LinkMarker: () => null },
        "@/lib/commerce": { formatPrice: value => `${value} ₫`, FREE_SHIPPING_THRESHOLD: 500000 },
        "./Quantity": { Quantity: () => null },
        "./useCart": { useCart: () => ({ ready: true, count: 1, items: [{ slug: "coffee", quantity: 1 }], subtotal: 119000, lines: [{ slug: "coffee", quantity: 1, lineTotal: 119000, product: { slug: "coffee", name: "Là Vườn Coffee Robusta", image: "/coffee.webp", priceVnd: 119000, sizeLabel: "200 g" } }] }) },
    });
    const html = renderToStaticMarkup(React.createElement(CartItems));
    assert(html.includes("Là Vườn Coffee Robusta"));
    assert(html.includes('data-cart-item="coffee"'));
    assert(html.includes('aria-label="Xóa Là Vườn Coffee Robusta"'));
    assert(!html.includes('href="/gio-hang/"'));
});

test("enabled checkout route mounts its form", () => {
    const { default: Page } = load("src/app/thanh-toan/page.tsx", {
        "@/lib/commerce": { CHECKOUT_ENABLED: true },
        "next/navigation": { notFound() { throw new Error("NOT_FOUND"); } },
        "@/components/commerce/CheckoutPage": { CheckoutPage: () => React.createElement("form", { "data-checkout": true }) },
    });
    assert.match(renderToStaticMarkup(React.createElement(Page)), /data-checkout/);
});

test("disabled checkout route returns not found before mounting its form", () => {
    const { default: Page } = load("src/app/thanh-toan/page.tsx", {
        "next/navigation": { notFound() { throw new Error("NOT_FOUND"); } },
        "@/lib/commerce": { CHECKOUT_ENABLED: false },
        "@/components/commerce/CheckoutPage": { CheckoutPage() { throw new Error("Checkout must not mount"); } },
    });
    assert.throws(() => Page(), /NOT_FOUND/);
});

test("header tracks hero boundaries on home and product pages without moving the hero brand", () => {
    for (const pathname of ["/", "/san-pham/trung-toan-coffee-robusta/"]) {
        let effect, sync, stopped = false, state, bottom = 900;
        const events = { scrollY: 0 };
        const { SiteHeader } = load("src/components/layout/SiteHeader.tsx", {
            react: { ...React, useRef: value => ({ current: value }), useLayoutEffect: setup => { effect ??= setup; }, useEffect() {}, useState(initial) { state = initial; return [initial, update => { state = update(state); }]; } },
            "@/components/ui/useEnhancedDisclosure": { useEnhancedDisclosure: () => ({ detailsRef: {}, panelRef: {}, enhanced: false, open: false, nativeOpen: false, setOpen() {} }) },
            "@/lib/native-motion": { observeScroll(update) { sync = update; update(); return () => { stopped = true; }; } },
            "next/navigation": { usePathname: () => pathname },
        }, { document: { documentElement: {}, querySelector: () => ({ getBoundingClientRect: () => ({ bottom }) }) }, window: events, getComputedStyle: () => ({ fontSize: "16px" }) });
        const tree = SiteHeader();
        tree.props.ref.current = { offsetHeight: 100 };
        const cleanup = effect();
        assert.equal(state.overHero, true);
        assert.equal(state.scrolled, false);
        assert.equal(state.expanded, true);
        events.scrollY = 1;
        sync();
        assert.equal(state.scrolled, true);
        assert.equal(state.expanded, true);
        for (const scrollY of [63, 64, 65, 64, 0]) {
            events.scrollY = scrollY;
            sync();
            assert.equal(state.expanded, scrollY <= 64);
        }
        bottom = 1;
        sync();
        assert.equal(state.overHero, true);
        bottom = 0;
        sync();
        assert.equal(state.overHero, false);
        bottom = -100;
        events.scrollY = 1000;
        sync();
        assert.equal(state.overHero, false);
        assert.equal(state.scrolled, true);
        cleanup();
        assert.equal(stopped, true);
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

test("purchase controls require a ready cart and an available build-time product", () => {
    const product = { slug: "coffee-250", name: "Cà phê", category: "Robusta", tagline: "Đậm vị", sizeLabel: "250g", priceVnd: 100000, image: "/coffee.webp", accent: "#fff" };
    const { Button } = load("src/components/ui/Button.tsx");
    const { Dropdown } = load("src/components/ui/Dropdown.tsx");
    for (const [ready, available] of [[false, true], [true, true], [true, false]]) {
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
        const html = renderToStaticMarkup(React.createElement(ProductPurchase, { product: { ...product, available } }));
        const controls = html.match(/<button[^>]*>/g);
        assert.equal(controls.length, 2);
        controls.forEach((control) => assert.equal(control.includes('disabled=""'), !ready || !available));
        assert.equal(html.includes("Tạm hết hàng"), !available);
        assert.match(html, /Giỏ hàng cần JavaScript để thêm sản phẩm/);
        assert.match(html, /href="\/lien-he\/"/);
    }
});

function menuLock({ alreadyStopped = false, failStop = false } = {}) {
    let effect, starts = 0, closed;
    const root = { style: { overflow: "scroll" } };
    const background = [{ inert: false }, { inert: true }];
    const doc = Object.assign(new EventTarget(), { documentElement: root, querySelector: () => null, querySelectorAll: () => background, activeElement: null });
    const controls = Array.from({ length: 2 }, () => ({ getClientRects: () => [{}], hasAttribute: () => false, focus() { doc.activeElement = this; } }));
    const backdrop = { ...controls[0], tabIndex: -1, focus() { throw new Error("Backdrop must stay out of the Tab sequence"); } };
    const panel = { querySelector: () => controls[0], querySelectorAll: () => [...controls, backdrop], contains: element => controls.includes(element) };
    const header = {};
    const lenis = { isStopped: alreadyStopped, stop() { this.isStopped = true; if (failStop) throw new Error("stop failed"); }, start() { starts++; this.isStopped = false; } };
    const { SiteHeader } = load("src/components/layout/SiteHeader.tsx", {
        react: { ...React, useState: value => [value, () => {}], useRef: value => ({ current: value }), useLayoutEffect() {}, useEffect(setup) { effect ??= setup; } },
        "@/lib/smooth-scroll": { getSmoothScroll: () => lenis },
        "@/components/ui/useEnhancedDisclosure": { useEnhancedDisclosure: () => ({ detailsRef: {}, panelRef: { current: panel }, enhanced: true, open: true, nativeOpen: true, setOpen(value) { closed = value; } }) },
    }, { document: doc, getComputedStyle: () => ({ visibility: "visible" }) });
    const tree = SiteHeader();
    tree.props.ref.current = header;
    const cleanup = effect();
    return { root, lenis, background, doc, controls, cleanup, starts: () => starts, closed: () => closed };
}

test("menu releases its own scroll/inert lock and preserves a pre-existing Lenis stop", () => {
    for (const alreadyStopped of [false, true]) {
        const mounted = menuLock({ alreadyStopped });
        assert.equal(mounted.root.style.overflow, "hidden");
        assert(mounted.background.every(element => element.inert));
        mounted.cleanup();
        assert.equal(mounted.root.style.overflow, "scroll");
        assert.deepEqual(mounted.background.map(element => element.inert), [false, true]);
        assert.equal(mounted.lenis.isStopped, alreadyStopped);
        assert.equal(mounted.starts(), alreadyStopped ? 0 : 1);
    }
});

test("menu setup failures cannot strand scroll or background controls", () => {
    const mounted = menuLock({ failStop: true });
    assert.equal(mounted.root.style.overflow, "scroll");
    assert.equal(mounted.lenis.isStopped, false);
    assert.equal(mounted.closed(), false);
    mounted.cleanup();
    assert.equal(mounted.starts(), 1);
});

test("menu closes with Escape and wraps keyboard focus inside its own panel", () => {
    const mounted = menuLock();
    mounted.doc.activeElement = mounted.controls[1];
    const tab = Object.assign(new Event("keydown", { cancelable: true }), { key: "Tab", shiftKey: false });
    mounted.doc.dispatchEvent(tab);
    assert.equal(tab.defaultPrevented, true);
    assert.equal(mounted.doc.activeElement, mounted.controls[0]);
    mounted.doc.dispatchEvent(Object.assign(new Event("keydown"), { key: "Escape" }));
    assert.equal(mounted.closed(), false);
    mounted.cleanup();
});
