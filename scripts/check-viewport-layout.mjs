import assert from "node:assert/strict";
import fs from "node:fs";

// Also evaluated in the browser by the visual checks.
export function collectViewportLayout() {
    const measure = (selector) => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return { width: rect.width, height: rect.height, top: rect.top + scrollY, position: getComputedStyle(element).position };
    };
    const canvas = document.querySelector("[data-coffee-canvas] canvas");
    const copies = [...document.querySelectorAll("[data-display-copy]")];
    return {
        width: innerWidth,
        height: innerHeight,
        stableHeight: document.querySelector("[data-scroll-viewport]").clientHeight,
        documentHeight: document.documentElement.scrollHeight,
        overflow: document.documentElement.scrollWidth - innerWidth,
        origin: measure("[data-coffee-origin]"),
        canvas: measure("[data-coffee-canvas]"),
        coffeeFrame: measure("[data-coffee-frame]"),
        canvasMinimumHeight: canvas ? parseFloat(getComputedStyle(canvas.closest("[data-coffee-canvas]")).minHeight) : null,
        canvasPaddingTop: canvas ? parseFloat(getComputedStyle(canvas.closest("[data-coffee-canvas]")).paddingTop) : null,
        canvasBuffer: canvas ? [canvas.width, canvas.height] : null,
        canvasPixelBudget: Number(canvas?.closest("[data-coffee-canvas]").dataset.renderPixelBudget),
        coffeeStage: measure("[data-coffee-stage]"),
        coffeeScene: measure("[data-coffee-scene]"),
        coffeeText: copies.length ? {
            visible: copies.map((element) => [...element.classList].some((name) => name.includes("__copyVisible"))),
            closingTop: copies[1].parentElement.getBoundingClientRect().top,
        } : null,
        gallery: measure("[data-process-gallery]"),
        feature: measure("[data-process-feature]"),
        featureClip: document.querySelector("[data-process-feature] [data-image-reveal]") ? getComputedStyle(document.querySelector("[data-process-feature] [data-image-reveal]")).clipPath : null,
        products: measure("#product-title"),
        productMedia: measure("[data-product-media]"),
        footer: measure("[data-site-footer]"),
    };
}

if (process.argv[1]?.endsWith("check-viewport-layout.mjs")) {
    const reports = JSON.parse(fs.readFileSync(process.argv[2] || ".next/viewport-layout/checks.json", "utf8"));
    assert(reports.length >= 3, "Capture desktop, mobile and a simulated toolbar resize");
    for (const report of reports) {
        const snapshot = report.after;
        const label = `${report.name} ${snapshot.width}×${snapshot.height}`;
        assert(snapshot.overflow <= 1, `${label}: horizontal overflow`);
        if (report.revealed) assert.equal(snapshot.featureClip, "none", `${label}: completed sticky image must not remain clipped`);
        if (snapshot.feature) {
            const sticky = snapshot.width >= 768;
            assert.equal(snapshot.feature.position, sticky ? "sticky" : "relative", `${label}: gallery positioning`);
            const expectedHeight = sticky ? snapshot.stableHeight - 20 : (snapshot.feature.width * 5) / 4;
            assert(Math.abs(snapshot.feature.height - expectedHeight) <= 1, `${label}: gallery must fit the screen or its mobile aspect ratio`);
        }
        if (snapshot.canvas) {
            const [width, height] = snapshot.canvasBuffer;
            assert(width > 0 && width <= Math.round(snapshot.coffeeFrame.width), `${label}: canvas buffer width`);
            assert(height > 0 && height <= Math.round(snapshot.coffeeFrame.height), `${label}: canvas buffer height`);
            assert(width * height <= snapshot.canvasPixelBudget, `${label}: exceeded render pixel budget`);
            assert(Math.abs(width / height - snapshot.coffeeFrame.width / snapshot.coffeeFrame.height) < 0.005, `${label}: buffer aspect ratio`);
            assert.equal(snapshot.coffeeStage.position, "relative", `${label}: coffee stage must stay in document flow`);
            assert(snapshot.coffeeFrame.height >= snapshot.canvasMinimumHeight, `${label}: frame must respect 100vh minimum`);
            assert(Math.abs(snapshot.canvasPaddingTop - snapshot.coffeeFrame.height / 2) <= 1, `${label}: top padding must equal half the frame height`);
            assert(Math.abs(snapshot.canvas.height - snapshot.coffeeFrame.height - snapshot.canvasPaddingTop) <= 1, `${label}: padding must not stretch the render frame`);
            assert(Math.abs(snapshot.coffeeStage.height - snapshot.canvas.height) <= 1, `${label}: stage height must follow canvas`);
            assert(Math.abs(snapshot.coffeeScene.height - snapshot.canvas.height) <= 1, `${label}: scene height must follow canvas`);
            assert.deepEqual(snapshot.coffeeText.visible, [snapshot.coffeeText.closingTop > snapshot.stableHeight * 0.6, snapshot.coffeeText.closingTop <= snapshot.stableHeight * 0.7], `${label}: opening and closing must overlap briefly`);
        }
        if (snapshot.productMedia) assert(Math.abs(snapshot.productMedia.height - (snapshot.productMedia.width * 5) / 4) <= 1, `${label}: product media aspect ratio`);
        if (report.before) {
            assert.notEqual(report.before.height, snapshot.height, `${label}: simulate a change in dynamic viewport height`);
            assert.equal(report.before.documentHeight, snapshot.documentHeight, `${label}: toolbar resize changed document height`);
            assert.equal(report.before.stableHeight, snapshot.stableHeight, `${label}: toolbar resize changed the stable reference`);
            for (const key of ["origin", "canvas", "gallery", "products", "productMedia"]) {
                if (!snapshot[key]) continue;
                for (const dimension of ["width", "height", "top"]) {
                    assert(Math.abs(report.before[key][dimension] - snapshot[key][dimension]) <= 1, `${label}: toolbar resize moved ${key}.${dimension}`);
                }
            }
        }
    }
    console.log(`Passed ${reports.length} viewport layout checks.`);
}
