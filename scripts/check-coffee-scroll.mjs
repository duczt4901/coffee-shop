import assert from "node:assert/strict";
import fs from "node:fs";

const reports = JSON.parse(fs.readFileSync(process.argv[2] || ".next/coffee-text/scroll-checks.json", "utf8"));
const expectedText = {
    "opening-a": [true, false],
    "opening-b": [true, false],
    "before-closing": [true, false],
    "closing-entry": [true, true],
    overlap: [true, true],
    "opening-exit": [false, true],
    "closing-sticky": [false, true],
    end: [false, true],
    reverse: [true, false],
};
assert(reports.length >= 2, "Capture desktop and mobile scroll sequences");
for (const { name, phases, boundary, marginBottom, idle } of reports) {
    assert(phases.some(({ requested }) => requested > 0.9), `${name}: reach the end of the scene`);
    assert(phases.at(-1).requested < 0.38, `${name}: scroll back to the opening`);
    assert.deepEqual(phases.map(({ label }) => label), Object.keys(expectedText), `${name}: capture each transition and reverse scroll`);
    for (const phase of phases) {
        assert(Math.abs(phase.actualProgress - phase.requested) < 0.002, `${name}: capture was taken before layout/scroll settled`);
        assert.deepEqual(phase.visible, expectedText[phase.label], `${name}: incorrect text phase at ${phase.label}`);
        assert.deepEqual(phase.buffer, phases[0].buffer, `${name}: scrolling reallocated the render buffer`);
        assert(Math.abs(phase.canvasDocumentTop - phases[0].canvasDocumentTop) <= 1, `${name}: canvas moved inside the document during scroll`);
        assert.equal(phase.translate, "none", `${name}: scroll must not translate the canvas`);
        assert.equal(phase.stagePosition, "relative", `${name}: stage must not be pinned`);
        assert.equal(phase.openingPosition, "sticky", `${name}: opening text must be sticky`);
        assert.equal(phase.closingPosition, "sticky", `${name}: closing text must be sticky`);
        if (phase.label === "closing-sticky") assert(Math.abs(phase.closingTop - phase.closingAnchor) <= 1, `${name}: closing text must reach its viewport anchor`);
    }
    assert(Math.abs(phases[0].stageTop - phases[3].stageTop) > 100, `${name}: stage is not moving naturally through the viewport`);
    const stickyPhases = phases.filter(({ label }) => label === "opening-a" || label === "opening-b");
    assert.equal(stickyPhases.length, 2, `${name}: capture two positions while the opening is visible and sticky`);
    assert(Math.abs(stickyPhases[0].openingTop - stickyPhases[1].openingTop) <= 1, `${name}: opening text moved while it should be sticky`);
    assert.equal(idle.before.scroll, idle.after.scroll, `${name}: idle measurement was interrupted by scrolling`);
    assert.equal(idle.before.draws, idle.after.draws, `${name}: GPU kept drawing while idle`);
    assert.equal(idle.resizeMutations, 0, `${name}: canvas sizing did not settle`);
    assert.equal(idle.surface.paddingTop, 0, `${name}: content must have no top padding`);
    assert.equal(idle.surface.paddingBottom, 0, `${name}: content must have no bottom padding`);
    assert(idle.surface.overlap > 0, `${name}: content must overlap the canvas bottom`);
    assert(Math.abs(idle.surface.fadeHeight - idle.surface.overlap / 3) <= 1, `${name}: fade must be one third of the overlap`);
    assert(idle.surface.gradient.includes("linear-gradient"), `${name}: missing background fade`);
    assert(idle.surface.closingBottom <= idle.surface.fadeTop + 1, `${name}: fade covers the closing phrase`);
    assert(marginBottom > 0, `${name}: add space after the experience`);
    assert(Math.abs(boundary[0].top - boundary[0].anchor) <= 1, `${name}: text must stick before reaching the parent boundary`);
    assert(boundary[1].top < boundary[1].anchor - 30, `${name}: text must leave its anchor at the parent boundary`);
    assert(Math.abs(boundary[1].bottom - boundary[1].trackBottom + boundary[1].padding) <= 1, `${name}: parent padding must bound the closing text`);
    assert(boundary[1].bottom < boundary[1].fadeTop, `${name}: closing text must stop above the fade`);
}
console.log(`Passed ${reports.length} natural-scroll sequences, including reverse scroll, stable layout and idle GPU checks.`);
