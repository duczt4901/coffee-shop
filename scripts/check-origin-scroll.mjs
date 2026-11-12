import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const reports = JSON.parse(readFileSync(process.argv[2] || ".next/origin-scroll/checks.json", "utf8"));
assert(reports.length >= 2, "Capture both desktop and mobile interactions");
for (const { viewport, distance, steps } of reports) {
    const label = viewport.join("×");
    const [start, early, middle, idle, late, complete, after, reverse, reset] = steps;
    assert(distance >= viewport[1] * 0.65 && distance <= viewport[1] * 0.85, `${label}: use the shortened scroll range`);
    assert(start.scale < early.scale && early.scale < middle.scale && middle.scale < late.scale && late.scale < complete.scale, `${label}: SVG must grow continuously with scrolling`);
    assert.equal(middle.scrollY, idle.scrollY, `${label}: keep the user's position while idle`);
    assert.equal(middle.scale, idle.scale, `${label}: the SVG must stop growing as soon as scrolling stops`);
    assert.equal(complete.scale, after.scale, `${label}: finish zoom at the end of the intro`);
    assert.equal(reverse.scale, middle.scale, `${label}: reverse scrolling must restore the same size`);
    assert.equal(reset.scale, start.scale, `${label}: return to the original size`);
    for (const step of steps) {
        assert.equal(step.borders, start.borders, `${label}: surrounding province borders must stay at their original size`);
        assert(Math.abs(step.scale - step.fill) < 0.001, `${label}: visible fill and mask must share the actual SVG transform`);
    }
}
const component = readFileSync("src/components/sections/home-page/CoffeeOriginSection.tsx", "utf8");
assert(!/\b(?:scrollTo|scrollBy|scrollIntoView)\s*\(|\bscrollTop\s*=/.test(component), "The map must not change the user's scroll position");
assert(!/\b(?:requestAnimationFrame|setTimeout|setInterval)\s*\(/.test(component), "No autonomous zoom animation should remain");
console.log(`Passed ${reports.length} continuous scroll, idle, reverse scroll and fixed border checks.`);
