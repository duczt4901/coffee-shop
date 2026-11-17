import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';

const runtime = process.env.QA_NODE_MODULES || 'C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1112-737-0_26.1112.737.0_x64__3k8sg7r9htsxt/dependencies/node/node_modules';
const require = createRequire(path.join(runtime, 'qa-loader.cjs'));
const { chromium, firefox, webkit } = require('playwright');
const root = path.resolve(process.argv[2] || 'out');
const phase = process.argv[3] || 'baseline';
const evidence = path.resolve('output/experience-2026-11-16', phase);
await fs.mkdir(evidence, { recursive: true });
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.txt': 'text/plain', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.xml': 'application/xml' };
const server = http.createServer(async (req, res) => {
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
    let file;
    try {
        file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
        if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
        if ((await fs.stat(file)).isDirectory()) file = path.join(file, 'index.html');
        const size = (await fs.stat(file)).size;
        res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
        const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
        if (range) {
            const start = Number(range[1]), end = Math.min(size - 1, range[2] ? Number(range[2]) : size - 1);
            if (start > end) { res.writeHead(416); res.end(); return; }
            res.writeHead(206, { 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1, 'Accept-Ranges': 'bytes' });
            if (req.method === 'HEAD') res.end(); else fsSync.createReadStream(file, { start, end }).pipe(res);
            return;
        }
        res.setHeader('Content-Length', size);
        if (req.method === 'HEAD') res.end(); else fsSync.createReadStream(file).pipe(res);
    } catch {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        try { res.end(await fs.readFile(path.join(root, '404.html'))); } catch { res.end('Not found'); }
    }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const report = { phase, root, at: new Date().toISOString(), environment: {}, captures: [], scenarios: [], errors: [], limitations: ['Chrome headless là emulation, không phải điện thoại thật.', 'Server kiểm thử phục vụ export, không mô phỏng Worker API hoặc CDN/cache production.', 'Số đo lab không phải Core Web Vitals p75.'] };
const record = async (name, run) => {
    try { const result = await run(); report.scenarios.push({ name, passed: true, result }); console.log(`PASS ${name}`); return result; }
    catch (error) { report.scenarios.push({ name, passed: false, error: error.stack }); console.log(`FAIL ${name}: ${error.message}`); }
};
const browser = await chromium.launch({ headless: true, executablePath: process.env.QA_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
report.environment.chromium = await browser.version();
for (const [name, type] of Object.entries({ firefox, webkit })) {
    try { const candidate = await type.launch({ headless: true }); report.environment[name] = await candidate.version(); await candidate.close(); }
    catch (error) { report.environment[name] = { available: false, reason: error.message.split('\n')[0] }; }
}
const instrument = () => {
    window.__qa = { animations: [], tasks: [], shifts: [], paints: [], events: [], loafs: [], errors: [] };
    const original = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
        window.__qa.animations.push({ at: performance.now(), path: location.pathname, target: this.getAttribute('data-reveal-curtain') !== null ? 'curtain' : this.hasAttribute('data-page-reveal') ? 'page-reveal' : this.hasAttribute('data-brand-mark') ? 'brand-mark' : this.hasAttribute('data-reveal-brand') ? 'loading-brand' : this.hasAttribute('data-site-header') ? 'header' : this.hasAttribute('data-brand-text') ? 'brand-text' : this.tagName, heading: this.closest('h1')?.textContent, revealState: document.querySelector('[data-page-reveal]')?.dataset.revealState, frames, options });
        return original.call(this, frames, options);
    };
    for (const type of ['longtask', 'layout-shift', 'largest-contentful-paint']) {
        if (!PerformanceObserver.supportedEntryTypes.includes(type)) continue;
        new PerformanceObserver(list => {
            for (const entry of list.getEntries()) {
                if (type === 'longtask') window.__qa.tasks.push({ start: entry.startTime, duration: entry.duration });
                if (type === 'layout-shift') window.__qa.shifts.push({ value: entry.value, recentInput: entry.hadRecentInput, sources: entry.sources.map(s => ({ tag: s.node?.tagName ?? null, label: s.node?.hasAttribute?.('data-hero-video-control') ? 'video-control' : s.node?.getAttribute?.('aria-label') ?? null, previous: s.previousRect.toJSON(), current: s.currentRect.toJSON() })) });
                if (type === 'largest-contentful-paint') window.__qa.paints.push({ start: entry.startTime, tag: entry.element?.tagName, url: entry.url });
            }
        }).observe({ type, buffered: true });
    }
    if (PerformanceObserver.supportedEntryTypes.includes('event')) new PerformanceObserver(list => {
        window.__qa.events.push(...list.getEntries().filter(e => e.interactionId).map(e => ({ name: e.name, duration: e.duration, inputDelay: e.processingStart - e.startTime, processingDuration: e.processingEnd - e.processingStart })));
    }).observe({ type: 'event', durationThreshold: 16, buffered: true });
    if (PerformanceObserver.supportedEntryTypes.includes('long-animation-frame')) new PerformanceObserver(list => {
        window.__qa.loafs.push(...list.getEntries().map(e => ({ start: e.startTime, duration: e.duration, blockingDuration: e.blockingDuration, renderStart: e.renderStart, styleAndLayoutStart: e.styleAndLayoutStart, scripts: e.scripts.map(s => ({ duration: s.duration, forcedStyleAndLayoutDuration: s.forcedStyleAndLayoutDuration, sourceURL: s.sourceURL, sourceFunctionName: s.sourceFunctionName, invoker: s.invoker, invokerType: s.invokerType })) })));
    }).observe({ type: 'long-animation-frame', buffered: true });
};
const makeContext = async options => {
    const context = await browser.newContext({ deviceScaleFactor: 1, ...options });
    await context.addInitScript(instrument);
    // Mode A stills compare the poster; the video is independently tested as media behavior.
    await context.route('**/*.mp4', route => route.abort());
    return context;
};
const ready = async page => {
    await page.waitForFunction(() => [...document.querySelectorAll('[data-page-reveal]')].every(e => e.hidden || getComputedStyle(e).display === 'none' || getComputedStyle(e).visibility === 'hidden'), null, { timeout: 15000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => document.querySelector('[data-site-header]')?.dataset.menuEnhanced === 'true');
};
const settle = async page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const measure = async page => page.evaluate(() => {
    const rect = selector => [...document.querySelectorAll(selector)].map(element => {
        const bounds = element.getBoundingClientRect(), style = getComputedStyle(element);
        return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height, documentTop: bounds.y + scrollY, transform: style.transform, position: style.position, font: style.fontFamily, fontSize: style.fontSize };
    });
    return { route: location.pathname, viewport: [innerWidth, innerHeight], scrollY, documentHeight: document.documentElement.scrollHeight, overflow: document.documentElement.scrollWidth - innerWidth, locked: document.documentElement.style.overflow === 'hidden', inert: [...document.querySelectorAll('[data-site-content],main,[data-site-footer]')].map(e => e.inert), revealCount: document.querySelectorAll('[data-page-reveal]:not([hidden])').length, routeCoverOpacity: Number(getComputedStyle(document.querySelector('[data-route-transition]')).opacity), header: rect('[data-site-header]'), logo: rect('[data-site-header] a[aria-label="Là Vườn Coffee"]'), h1: rect('main h1'), hero: rect('[data-hero]'), scene: rect('[data-coffee-canvas]'), origin: rect('[data-coffee-origin]'), productMedia: rect('[data-product-media]'), footer: rect('[data-site-footer]'), main: rect('main'), menu: rect('#site-navigation'), drawer: rect('#site-navigation [class*="drawer"]'), menuLinks: rect('#site-navigation nav[aria-label="Điều hướng chính"] a'), hamburgerLines: rect('[data-site-header] summary i'), closeIcon: rect('[data-menu-close] svg'), faqQuestions: rect('summary[id$="-question"]'), active: document.activeElement?.getAttribute('aria-label') || document.activeElement?.tagName };
});
const capture = async (page, name) => {
    await page.waitForLoadState('networkidle');
    await page.evaluate(async () => {
        for (let pass = 0; pass < 3; pass++) {
            const running = document.getAnimations().filter(animation => animation.playState === 'running' && Number.isFinite(animation.effect.getTiming().iterations));
            if (!running.length) break;
            await Promise.allSettled(running.map(animation => animation.finished));
        }
    });
    const data = await measure(page);
    const file = `${name}.png`;
    await page.screenshot({ path: path.join(evidence, file) });
    report.captures.push({ name, file, data });
    return data;
};
const mainProduct = '/san-pham/trung-toan-coffee-robusta/';

try {
    if (phase.endsWith('curtain-probe')) {
        await record('Home protected: curtain controlled progress', async () => {
            const context = await makeContext({ viewport: { width: 1280, height: 800 } }); const page = await context.newPage();
            await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
            await page.waitForFunction(() => document.querySelector('[data-page-reveal]')?.dataset.revealState === 'opening');
            await page.evaluate(() => {
                const targets = ['[data-reveal-curtain]', '[data-reveal-brand]', '[data-site-header]', '[data-hero-brand] [data-brand-mark]', '[data-brand-text]'];
                window.__qaCapturedAnimations = targets.flatMap(selector => [...document.querySelectorAll(selector)].flatMap(element => element.getAnimations()));
                window.__qaCapturedAnimations.forEach(animation => animation.pause());
            });
            const states = [];
            for (const progress of [0, 0.5, 1]) {
                const state = await page.evaluate(progress => {
                    const curtain = document.querySelector('[data-reveal-curtain]');
                    const duration = Number(curtain.getAnimations()[0].effect.getTiming().duration);
                    window.__qaCapturedAnimations.forEach(animation => { animation.currentTime = duration * progress; });
                    const brand = document.querySelector('[data-reveal-brand]');
                    return { progress, duration, curtain: getComputedStyle(curtain).clipPath, brand: { rect: brand.getBoundingClientRect().toJSON(), transform: getComputedStyle(brand).transform }, log: window.__qa.animations.filter(a => ['curtain', 'loading-brand', 'brand-mark', 'brand-text', 'header'].includes(a.target)) };
                }, progress);
                await page.screenshot({ path: path.join(evidence, `curtain-${progress}.png`) }); states.push(state);
            }
            await context.close(); return states;
        });
    } else if (phase.endsWith('nojs-probe')) {
        await record('No-JS trang chủ: ẩn control video cần JavaScript', async () => {
            const context = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false }); const page = await context.newPage();
            await page.goto(base + '/'); assert.equal(await page.locator('[data-hero-video-control]').isVisible(), false);
            assert(await page.locator('main h1').isVisible()); await context.close(); return { controlHidden: true, headingVisible: true };
        });
    } else if (phase.endsWith('cpu-probe')) {
        for (let attempt = 0; attempt < 3; attempt++) await record(`CPU x6 lần ${attempt + 1}`, async () => {
            const context = await makeContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const page = await context.newPage();
            const cdp = await context.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
            await page.goto(base + '/'); await ready(page);
            await page.getByLabel('Mở menu', { exact: true }).tap(); await page.waitForFunction(() => document.querySelector('#site-navigation')?.getAttribute('aria-hidden') === 'false');
            await page.getByRole('button', { name: 'Đóng menu', exact: true }).last().tap(); await page.waitForFunction(() => !document.querySelector('main')?.inert);
            await settle(page);
            const metrics = await page.evaluate(() => ({ tasks: window.__qa.tasks, loafs: window.__qa.loafs, shifts: window.__qa.shifts, eventTimings: window.__qa.events, locked: document.documentElement.style.overflow === 'hidden', reveal: document.querySelector('[data-page-reveal]')?.dataset.revealState }));
            assert.equal(metrics.locked, false); await context.close(); return metrics;
        });
    } else if (phase.endsWith('settled-probe')) {
        await record('So sánh trạng thái ổn định của horizontal/product', async () => {
            const states = [];
            for (const [label, viewport] of Object.entries({ desktop: { width: 1280, height: 800 }, mobile: { width: 390, height: 844 } })) {
                const context = await makeContext({ viewport, isMobile: label === 'mobile', hasTouch: label === 'mobile' }); const page = await context.newPage();
                await page.goto(base + '/'); await ready(page);
                await page.evaluate(() => { const root = document.querySelector('[data-coffee-origin]'); window.__lavuonLenis?.scrollTo(root.getBoundingClientRect().top + scrollY + innerHeight * 1.6, { immediate: true }); scrollTo(0, root.getBoundingClientRect().top + scrollY + innerHeight * 1.6); });
                await page.waitForFunction(() => document.querySelector('[data-coffee-origin]')?.dataset.originPin === 'active');
                await capture(page, `${label}-horizontal`);
                const caption = await page.locator('[data-coffee-origin] h2').first().evaluate(e => ({ html: e.outerHTML, rect: e.getBoundingClientRect().toJSON(), font: getComputedStyle(e).font, transform: getComputedStyle(e).transform, children: [...e.children].map(x => ({ opacity: getComputedStyle(x).opacity, rect: x.getBoundingClientRect().toJSON() })) }));
                await page.goto(base + mainProduct); await ready(page); await capture(page, `${label}-product`);
                const product = await page.locator('main img').evaluateAll(elements => elements.map(e => ({ src: e.currentSrc, rect: e.getBoundingClientRect().toJSON(), parent: e.parentElement.tagName, filter: getComputedStyle(e).filter, pictureChildren: e.parentElement.tagName === 'PICTURE' ? [...e.parentElement.children].map(c => ({ tag: c.tagName, display: getComputedStyle(c).display, rect: c.getBoundingClientRect().toJSON() })) : [] })));
                states.push({ label, caption, product }); await context.close();
            }
            return states;
        });
    } else if (phase.endsWith('heading-probe')) {
        await record('H1 cold-load và SPA: Animation API ownership', async () => {
            const context = await makeContext({ viewport: { width: 1280, height: 800 } }); const page = await context.newPage();
            const consoleErrors = [], failedResponses = []; page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); }); page.on('response', response => { if (response.status() >= 400) failedResponses.push({ status: response.status(), url: response.url() }); });
            await page.goto(base + '/faq/'); await ready(page); await page.waitForLoadState('networkidle'); await settle(page);
            const cold = await page.evaluate(async () => {
                const scope = document.querySelector('main h1').closest('[data-editorial-reveal]');
                const intersection = await new Promise(resolve => { const ob = new IntersectionObserver(([entry]) => { resolve({ isIntersecting: entry.isIntersecting, bounds: entry.boundingClientRect.toJSON() }); ob.disconnect(); }); ob.observe(scope); });
                return { log: window.__qa.animations, html: document.querySelector('main h1')?.outerHTML, pending: document.querySelectorAll('[data-reveal-pending]').length, scope: { display: getComputedStyle(scope).display, bounds: scope.getBoundingClientRect().toJSON(), childBounds: scope.firstElementChild.getBoundingClientRect().toJSON(), intersection }, resources: performance.getEntriesByType('resource').filter(e => e.name.includes('.js')).map(e => e.name) };
            });
            await page.getByLabel('Mở menu', { exact: true }).click(); await page.locator('#site-navigation').getByRole('link', { name: 'Sản phẩm', exact: true }).click(); await page.waitForURL('**/san-pham/'); await ready(page); await page.waitForLoadState('networkidle');
            await page.getByLabel('Mở menu', { exact: true }).click(); await page.locator('#site-navigation').getByRole('link', { name: 'FAQ', exact: true }).click(); await page.waitForURL('**/faq/'); await ready(page); await page.waitForLoadState('networkidle'); await settle(page);
            const spa = await page.evaluate(() => ({ log: window.__qa.animations, html: document.querySelector('main h1')?.outerHTML, pending: document.querySelectorAll('[data-reveal-pending]').length }));
            await context.close(); return { cold, spa, consoleErrors, failedResponses };
        });
    } else {
    for (const [label, viewport] of [['desktop', { width: 1280, height: 800 }], ['mobile', { width: 390, height: 844 }]]) {
        const context = await makeContext({ viewport, isMobile: label === 'mobile', hasTouch: label === 'mobile' });
        await context.tracing.start({ screenshots: true, snapshots: true, sources: false });
        const page = await context.newPage();
        page.on('pageerror', error => report.errors.push({ label, error: error.message }));
        await record(`${label}: baseline lặp và geometry`, async () => {
            for (let repeat = 0; repeat < 3; repeat++) {
                await page.goto(base + '/', { waitUntil: 'load' }); await ready(page); await settle(page);
                await capture(page, `${label}-home-${repeat}`);
            }
            const animations = await page.evaluate(() => window.__qa.animations);
            await fs.writeFile(path.join(evidence, `${label}-home-animations.json`), JSON.stringify(animations, null, 2));
            return { repetitions: 3, animations };
        });
        await record(`${label}: menu entry/exit và bàn phím`, async () => {
            await page.getByLabel('Mở menu', { exact: true }).click();
            await page.waitForFunction(() => document.querySelector('#site-navigation')?.getAttribute('aria-hidden') === 'false');
            await settle(page);
            const transition = await page.evaluate(() => {
                const panel = document.querySelector('#site-navigation');
                return panel.getAnimations({ subtree: true }).map(animation => ({ property: animation.transitionProperty || animation.animationName, timing: animation.effect.getTiming(), frames: animation.effect.getKeyframes() }));
            });
            const iconTransition = await page.locator('[data-site-header] summary i').evaluateAll(elements => elements.map(e => ({ duration: getComputedStyle(e).transitionDuration, easing: getComputedStyle(e).transitionTimingFunction, animations: e.getAnimations().map(a => ({ property: a.transitionProperty, timing: a.effect.getTiming(), frames: a.effect.getKeyframes() })) })));
            if (phase !== 'baseline') assert(iconTransition.length === 2 && iconTransition.every(e => e.duration === '0.4s'), 'Hamburger lines must share 400ms timing');
            await page.evaluate(() => {
                const panel = document.querySelector('#site-navigation');
                const drawer = panel.querySelector('[class*="drawer"]');
                const duration = drawer.getAnimations().find(a => a.transitionProperty === 'transform')?.effect.getTiming().duration;
                if (typeof duration !== 'number') throw new Error('No drawer transition to establish shared capture clock');
                for (const a of panel.getAnimations({ subtree: true })) { a.pause(); a.currentTime = duration / 2; }
            });
            await capture(page, `${label}-menu-half`);
            await page.evaluate(async () => {
                const panel = document.querySelector('#site-navigation');
                for (const a of panel.getAnimations({ subtree: true })) a.finish();
                await Promise.resolve();
            });
            await capture(page, `${label}-menu-open`);
            assert(await page.evaluate(() => document.querySelector('main').inert || document.querySelector('#site-navigation').matches(':modal')), 'Modal background must be inert');
            await page.getByRole('button', { name: 'Đóng menu', exact: true }).last().focus();
            await page.keyboard.press('Shift+Tab');
            assert(await page.locator('#site-navigation').evaluate(e => e.contains(document.activeElement)), 'Focus must stay in panel');
            await page.keyboard.press('Escape');
            await page.waitForFunction(() => !document.querySelector('header details')?.open && !document.querySelector('main')?.inert);
            const closed = await measure(page);
            assert.equal(closed.locked, false); assert.equal(closed.active, 'Mở menu');
            for (let i = 0; i < 3; i++) {
                await page.getByLabel('Mở menu', { exact: true }).click();
                await page.waitForFunction(() => document.querySelector('#site-navigation')?.getAttribute('aria-hidden') === 'false');
                await page.keyboard.press('Escape');
                await page.getByLabel('Mở menu', { exact: true }).click();
                await page.waitForFunction(() => document.querySelector('#site-navigation')?.getAttribute('aria-hidden') === 'false');
                await page.keyboard.press('Escape');
                await page.waitForFunction(() => !document.querySelector('header details')?.open && !document.querySelector('main')?.inert);
            }
            return { transition, iconTransition, closed, eventTimings: await page.evaluate(() => window.__qa.events) };
        });
        await record(`${label}: section ngang và reload sâu`, async () => {
            await page.evaluate(() => { const root = document.querySelector('[data-coffee-origin]'); window.__lavuonLenis?.scrollTo(root.getBoundingClientRect().top + scrollY + innerHeight * 1.6, { immediate: true }); scrollTo(0, root.getBoundingClientRect().top + scrollY + innerHeight * 1.6); });
            await page.waitForFunction(() => document.querySelector('[data-coffee-origin]')?.dataset.originPin === 'active'); await settle(page);
            const state = () => page.evaluate(() => { const root = document.querySelector('[data-coffee-origin]'), stage = root.querySelector('[class*="stickyViewport"]'); return { y: scrollY, top: stage.getBoundingClientRect().top, pin: root.dataset.originPin, slides: [...root.querySelectorAll('article')].map(e => getComputedStyle(e).transform) }; });
            const before = await state(); await capture(page, `${label}-horizontal`);
            await page.reload({ waitUntil: 'load' }); await ready(page); await page.waitForFunction(() => document.querySelector('[data-coffee-origin]')?.dataset.originPin === 'active'); await settle(page);
            const after = await state(); await capture(page, `${label}-horizontal-reload`);
            assert.deepEqual(after, before, 'Restored pin and slides must match before reload');
            return { before, after };
        });
        await record(`${label}: product/cart feedback đồng bộ`, async () => {
            await page.goto(base + mainProduct); await ready(page);
            await capture(page, `${label}-product`);
            const add = page.getByRole('button', { name: /Thêm vào giỏ hàng/ }).first();
            await add.scrollIntoViewIfNeeded();
            const feedbackGeometry = () => page.evaluate(() => ({ sectionHeight: document.querySelector('[data-header-hero]').getBoundingClientRect().height, statusHeight: document.querySelector('[data-header-hero] [role=status]')?.getBoundingClientRect().height, documentHeight: document.documentElement.scrollHeight }));
            const beforeFeedback = await feedbackGeometry();
            await add.click();
            await page.waitForFunction(() => document.querySelector('[data-site-header] a[href="/gio-hang/"]')?.getAttribute('aria-label') === 'Giỏ hàng, 1 sản phẩm');
            const first = await page.getByRole('status').allTextContents();
            const afterFeedback = await feedbackGeometry();
            if (phase !== 'baseline') assert(first.some(text => /Đã thêm 1\b/.test(text)), 'Status must confirm actual added quantity');
            if (phase !== 'baseline') assert.equal(afterFeedback.sectionHeight, beforeFeedback.sectionHeight, 'Add feedback must not resize product hero');
            await page.getByLabel('Tăng số lượng', { exact: true }).click(); await add.click();
            await page.waitForFunction(() => document.querySelector('[data-site-header] a[href="/gio-hang/"]')?.getAttribute('aria-label') === 'Giỏ hàng, 3 sản phẩm');
            const cart = await page.evaluate(() => JSON.parse(localStorage.getItem('coffee-shop-cart-v1')));
            assert.equal(cart[0].quantity, 3);
            const badgeAnimations = await page.evaluate(() => window.__qa.animations.filter(a => a.options?.duration === 240 && JSON.stringify(a.frames).includes('scale(1.2)')));
            if (phase !== 'baseline') assert.equal(badgeAnimations.length, 2, 'Two actual count changes must produce two badge pulses');
            const responsiveImage = await page.locator('[data-product-media] img').evaluate(e => ({ currentSrc: e.currentSrc, naturalWidth: e.naturalWidth, renderedWidth: e.getBoundingClientRect().width, complete: e.complete }));
            await page.goto(base + '/gio-hang/'); await ready(page);
            await page.waitForFunction(() => document.querySelector('main h1')?.textContent.includes('(3)'));
            await capture(page, `${label}-cart`);
            await page.getByRole('button', { name: /^Xóa / }).first().click();
            await page.waitForFunction(() => document.querySelector('main h1')?.textContent.includes('(0)'));
            const activeAfterRemoval = await page.evaluate(() => document.activeElement?.textContent);
            if (phase !== 'baseline') assert(activeAfterRemoval?.includes('Xem sản phẩm'), 'Last-item removal must focus empty-cart CTA');
            return { firstStatus: first, beforeFeedback, afterFeedback, cart, activeAfterRemoval, badgeAnimations, responsiveImage, afterRemoval: await page.locator('main').innerText() };
        });
        await record(`${label}: route menu → FAQ → home/history`, async () => {
            await page.getByLabel('Mở menu', { exact: true }).click();
            await page.locator('#site-navigation').getByRole('link', { name: 'FAQ', exact: true }).click();
            await page.waitForURL('**/faq/'); await ready(page);
            const faq = await measure(page); assert(!faq.locked); assert(!faq.inert.some(Boolean)); assert.equal(faq.routeCoverOpacity, 0, 'Departure cover must not hide arrival');
            const faqAnimations = await page.evaluate(() => window.__qa.animations.filter(a => a.path === '/faq/' && (a.heading || a.target === 'page-reveal')));
            await capture(page, `${label}-faq`);
            await page.locator('[data-site-header] a[aria-label="Là Vườn Coffee"]').click();
            await page.waitForURL(base + '/'); await ready(page);
            const homeAnimations = await page.evaluate(() => window.__qa.animations.filter(a => a.path === '/' && a.target === 'curtain'));
            assert(homeAnimations.some(a => a.options.duration === 900), 'Home keeps custom 900ms curtain');
            await page.goBack(); await ready(page); assert.equal(new URL(page.url()).pathname, '/faq/');
            await page.goForward(); await ready(page);
            const final = await measure(page); assert(!final.locked); assert(!final.inert.some(Boolean)); assert.equal(final.routeCoverOpacity, 0, 'History navigation must clear cover');
            return { faq, faqAnimations, homeAnimations, final };
        });
        await context.tracing.stop({ path: path.join(evidence, `${label}-interactions.zip`) });
        await context.close();
    }
    await record('reduced motion: ảnh/footer tĩnh, sticky và section ngang còn dùng được', async () => {
        const context = await makeContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' }); const page = await context.newPage();
        await page.goto(base + '/'); await ready(page);
        await page.evaluate(() => { const e = document.querySelector('[data-image-reveal]'); scrollTo(0, e.getBoundingClientRect().top + scrollY - innerHeight * .5); });
        await page.waitForLoadState('networkidle'); await settle(page);
        const images = await page.locator('[data-image-reveal-layer]').evaluateAll(elements => elements.map(e => getComputedStyle(e).transform));
        await page.evaluate(() => { const e = document.querySelector('[data-footer-reveal]'); scrollTo(0, e.getBoundingClientRect().top + scrollY - innerHeight * .5); }); await page.waitForLoadState('networkidle'); await settle(page);
        const footer = await page.locator('[data-site-footer]').evaluate(e => getComputedStyle(e).transform);
        await capture(page, 'reduced-footer');
        await page.emulateMedia({ reducedMotion: 'no-preference' }); await settle(page);
        const footerWithMotion = await page.locator('[data-site-footer]').evaluate(e => getComputedStyle(e).transform);
        await page.emulateMedia({ reducedMotion: 'reduce' }); await settle(page);
        const footerAfterToggle = await page.locator('[data-site-footer]').evaluate(e => getComputedStyle(e).transform);
        const result = { images, footer, footerWithMotion, footerAfterToggle, videoPaused: await page.locator('video').evaluate(e => e.paused) };
        if (phase !== 'baseline') { assert(images.every(value => value === 'none'), 'Reduced motion image transform must be none'); assert.equal(footer, 'none'); }
        if (phase !== 'baseline') { assert.notEqual(footerWithMotion, 'none', 'Normal footer parallax must remain'); assert.equal(footerAfterToggle, 'none', 'Changing preference must clear transform'); }
        await context.close(); return result;
    });
    await record('no-JS: native FAQ và menu', async () => {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false }); const page = await context.newPage();
        await page.goto(base + '/faq/'); await page.locator('summary[id$="-question"]').first().click();
        assert(await page.locator('main details').filter({ has: page.locator('summary[id$="-question"]') }).first().getAttribute('open') !== null);
        await page.getByLabel('Mở menu', { exact: true }).click(); assert(await page.locator('header details').getAttribute('open') !== null);
        await page.screenshot({ path: path.join(evidence, 'no-js-menu.png') }); await context.close(); return { nativeDisclosures: true };
    });
    await record('FAQ: native toggle sau hydration đồng bộ aria/inert', async () => {
        const context = await makeContext({ viewport: { width: 390, height: 844 } }); const page = await context.newPage();
        await page.goto(base + '/faq/'); await ready(page);
        const details = page.locator('main details').filter({ has: page.locator('summary[id$="-question"]') }).first();
        await details.evaluate(e => { e.open = true; }); await settle(page);
        const state = await details.evaluate(e => ({ open: e.open, expanded: e.querySelector('summary').getAttribute('aria-expanded'), inert: e.querySelector('[role=region]').inert }));
        if (phase !== 'baseline') { assert.equal(state.expanded, 'true'); assert.equal(state.inert, false); }
        await context.close(); return state;
    });
    await record('cart: MAX99 không báo thêm thành công khi không tăng', async () => {
        const context = await makeContext({ viewport: { width: 390, height: 844 } });
        await context.addInitScript(() => localStorage.setItem('coffee-shop-cart-v1', JSON.stringify([{ slug: 'trung-toan-coffee-robusta', quantity: 99 }])));
        const page = await context.newPage(); await page.goto(base + mainProduct); await ready(page);
        await page.getByRole('button', { name: /Thêm vào giỏ hàng/ }).first().click();
        const state = await page.evaluate(() => ({ cart: JSON.parse(localStorage.getItem('coffee-shop-cart-v1')), statuses: [...document.querySelectorAll('[role=status]')].map(e => e.textContent) }));
        assert.equal(state.cart[0].quantity, 99);
        if (phase !== 'baseline') assert(!state.statuses.some(text => text?.includes('Đã thêm')), 'Unchanged MAX cart must not announce add success');
        await context.close(); return state;
    });
    await record('bộ nhớ fallback: không báo thành công giả khi localStorage bị chặn', async () => {
        const context = await makeContext({ viewport: { width: 390, height: 844 } });
        await context.addInitScript(() => { Storage.prototype.getItem = () => { throw new DOMException('QA blocked', 'SecurityError'); }; Storage.prototype.setItem = () => { throw new DOMException('QA blocked', 'SecurityError'); }; });
        const page = await context.newPage(); await page.goto(base + mainProduct); await ready(page);
        await page.getByRole('button', { name: /Thêm vào giỏ hàng/ }).first().click();
        await page.waitForFunction(() => document.querySelector('[data-site-header] a[href="/gio-hang/"]')?.getAttribute('aria-label') === 'Giỏ hàng, 1 sản phẩm');
        const status = await page.getByRole('status').allTextContents();
        await context.close(); return { status, sessionMemoryCart: true };
    });
    if (phase !== 'baseline') await record('cart: xóa dòng đầu chuyển focus vào control dùng được của dòng còn lại', async () => {
        const context = await makeContext({ viewport: { width: 390, height: 844 } });
        await context.addInitScript(() => localStorage.setItem('coffee-shop-cart-v1', JSON.stringify([{ slug: 'trung-toan-coffee-robusta', quantity: 1 }, { slug: 'trung-toan-coffee-arabica', quantity: 1 }])));
        const page = await context.newPage(); await page.goto(base + '/gio-hang/'); await ready(page);
        await page.getByRole('button', { name: /^Xóa / }).first().click();
        await page.waitForFunction(() => document.querySelectorAll('li[id^="cart-item-"]').length === 1);
        const focus = await page.evaluate(() => ({ tag: document.activeElement?.tagName, name: document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent, hidden: !!document.activeElement?.closest('[aria-hidden=true],[inert]'), tabIndex: document.activeElement?.tabIndex, row: document.activeElement?.closest('li')?.id }));
        assert.equal(focus.row, 'cart-item-trung-toan-coffee-arabica'); assert.equal(focus.hidden, false); assert(focus.tabIndex >= 0);
        await context.close(); return focus;
    });
    await record('CPU ×6: reveal hoàn tất và menu còn tương tác', async () => {
        const context = await makeContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const page = await context.newPage();
        const cdp = await context.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
        await page.goto(base + '/'); await ready(page);
        await page.getByLabel('Mở menu', { exact: true }).tap();
        await page.waitForFunction(() => document.querySelector('#site-navigation')?.getAttribute('aria-hidden') === 'false');
        await page.getByRole('button', { name: 'Đóng menu', exact: true }).last().tap();
        await page.waitForFunction(() => !document.querySelector('main')?.inert);
        const result = await page.evaluate(() => ({ tasks: window.__qa.tasks, lcp: window.__qa.paints, shifts: window.__qa.shifts, eventTimings: window.__qa.events, locked: document.documentElement.style.overflow === 'hidden', reveal: document.querySelector('[data-page-reveal]')?.dataset.revealState, animations: window.__qa.animations.filter(a => ['curtain', 'brand-text'].includes(a.target)) }));
        assert.equal(result.locked, false); await page.screenshot({ path: path.join(evidence, 'cpu6-home.png') });
        await context.close(); return result;
    });
    await record('JS đến muộn: native HTML đọc được và không khóa sau hydrate', async () => {
        const context = await makeContext({ viewport: { width: 390, height: 844 } });
        await context.route('**/_next/**/*.js', async route => { await new Promise(resolve => setTimeout(resolve, 3000)); await route.continue(); });
        const page = await context.newPage(); await page.goto(base + '/faq/', { waitUntil: 'domcontentloaded' });
        const early = await page.locator('main h1').textContent(); assert.equal(early?.trim(), 'Câu hỏi thường gặp');
        await ready(page); const final = await measure(page); assert(!final.locked); assert(!final.inert.some(Boolean));
        await context.close(); return { earlyHeading: early, final };
    });
    await record('mạng giới hạn150ms/200kBps: nội dung và navigation không bị khóa', async () => {
        const context = await makeContext({ viewport: { width: 390, height: 844 } }); const page = await context.newPage();
        const cdp = await context.newCDPSession(page);
        const conditions = { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750, connectionType: 'cellular3g' };
        await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true }); await cdp.send('Network.emulateNetworkConditions', conditions);
        await page.goto(base + '/faq/', { waitUntil: 'domcontentloaded' });
        const heading = await page.locator('main h1').textContent(); await ready(page);
        await page.getByLabel('Mở menu', { exact: true }).click(); await page.getByRole('button', { name: 'Đóng menu', exact: true }).last().click();
        await page.waitForFunction(() => !document.querySelector('main')?.inert);
        const result = { conditions, heading, final: await measure(page), resources: await page.evaluate(() => performance.getEntriesByType('resource').map(e => ({ name: e.name.split('/').pop(), duration: e.duration, encodedBytes: e.encodedBodySize }))) };
        assert(!result.final.locked); await context.close(); return result;
    });
    if (phase !== 'baseline') await record('video thật: autoplay, dừng ngoài viewport và reduced motion; không có nút điều khiển', async () => {
        const context = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const page = await context.newPage();
        await page.goto(base + '/'); await ready(page);
        await page.waitForFunction(() => { const video = document.querySelector('video'); return !!video && !video.paused && video.currentTime > 0; });
        assert.equal(await page.locator('[data-hero-video-control]').count(), 0);
        await page.evaluate(() => scrollTo(0, innerHeight * 2)); await settle(page);
        await page.waitForFunction(() => document.querySelector('video').paused);
        await page.evaluate(() => scrollTo(0, 0)); await settle(page);
        await page.waitForFunction(() => !document.querySelector('video').paused);
        await page.screenshot({ path: path.join(evidence, 'hero-video.png') });
        const state = await page.locator('video').evaluate(e => ({ paused: e.paused, time: e.currentTime }));
        await page.emulateMedia({ reducedMotion: 'reduce' }); await page.waitForFunction(() => document.querySelector('video').paused);
        await context.close(); return state;
    });
    if (phase !== 'baseline') await record('video phát thất bại: giữ poster và mở trang bình thường', async () => {
        const context = await makeContext({ viewport: { width: 390, height: 844 } });
        await context.addInitScript(() => { HTMLMediaElement.prototype.play = function () { return Promise.reject(new DOMException('QA blocked playback', 'NotAllowedError')); }; });
        const page = await context.newPage(); await page.goto(base + '/'); await ready(page);
        assert.equal(await page.locator('[data-hero-video-control]').count(), 0);
        const state = { paused: await page.locator('video').evaluate(e => e.paused), poster: await page.locator('video').getAttribute('poster'), locked: (await measure(page)).locked };
        assert(state.paused && state.poster && !state.locked);
        await context.close(); return state;
    });
    await record('smoke 320px: route tĩnh và metadata', async () => {
        const context = await makeContext({ viewport: { width: 320, height: 700 }, reducedMotion: 'reduce' }); const page = await context.newPage(); const routes = [];
        for (const route of ['/san-pham/', '/lien-he/', '/ve-chung-toi/', '/cau-chuyen/', '/faq/', '/gio-hang/', '/bai-viet/']) {
            const response = await page.goto(base + route); await ready(page);
            const state = await page.evaluate(() => ({ route: location.pathname, title: document.title, canonical: document.querySelector('link[rel=canonical]')?.href, overflow: document.documentElement.scrollWidth - innerWidth, heading: document.querySelector('main h1')?.textContent, locked: document.documentElement.style.overflow === 'hidden' }));
            routes.push({ ...state, status: response.status() }); assert.equal(state.overflow, 0, route); assert(!state.locked, route);
        }
        await context.close(); return routes;
    });
    }
} finally {
    await browser.close(); await new Promise(resolve => server.close(resolve));
    await fs.writeFile(path.join(evidence, 'results.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ phase, passed: report.scenarios.filter(s => s.passed).length, failed: report.scenarios.filter(s => !s.passed).length, evidence }));
}
