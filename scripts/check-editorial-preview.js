const assert = require("node:assert/strict");
const fs = require("node:fs");

// Self-contained so the collector can also run through the browser's read-only evaluate API.
function collectEditorialSnapshot(options = {}) {
    const story = document.querySelector("[data-story-page]");
    const cards = story ? [...story.querySelectorAll("[data-story-card]")] : [];
    const masks = [...document.querySelectorAll("[data-reveal-mask]")];
    const words = [...document.querySelectorAll("[data-reveal-word]")];
    const parts = [...document.querySelectorAll("[data-reveal-line], [data-reveal-word]")];
    return {
        path: location.pathname,
        width: innerWidth,
        height: innerHeight,
        complete: !!options.complete,
        reducedMotion: !!options.reducedMotion,
        revealTargets: document.querySelectorAll("main [data-reveal]").length,
        horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
        footer: getComputedStyle(document.querySelector("[data-site-footer]")).backgroundColor,
        footerWrapper: getComputedStyle(document.querySelector("[data-footer-reveal]")).backgroundColor,
        masks: masks.length,
        clippedMasks: masks.filter((element) => getComputedStyle(element).overflow !== "visible").length,
        words: words.length,
        unfinishedParts: parts.filter((element) => {
            const transform = getComputedStyle(element).transform;
            return transform !== "none" && !new DOMMatrixReadOnly(transform).isIdentity;
        }).length,
        invalidMasks: masks.filter((element) => getComputedStyle(element).display !== "block").length,
        invalidWords: words.filter((element) => getComputedStyle(element).display !== "inline-block").length,
        splitProductDetails: document.querySelectorAll("[data-product-details] [data-reveal-word], [data-product-details] [data-reveal-line]").length,
        hiddenTargets: [...document.querySelectorAll('[data-reveal]:not([data-reveal="border"])')].filter((element) => {
            const style = getComputedStyle(element);
            return style.visibility === "hidden" || Number(style.opacity) < 0.99;
        }).length,
        linkBorders: [...document.querySelectorAll("[data-reveal-border]")].map((element) => ({ transform: getComputedStyle(element).transform, height: element.getBoundingClientRect().height })),
        faq: document.querySelector("[data-faq-category]")
            ? {
                  activeCategories: document.querySelectorAll('nav[aria-label="Chủ đề câu hỏi"] [aria-current]').length,
                  questions: [...document.querySelectorAll("h6 button")].map((button) => {
                      const answer = document.getElementById(button.getAttribute("aria-controls"));
                      return {
                          controlled: !!answer,
                          expanded: button.getAttribute("aria-expanded") === "true",
                          hidden: answer?.getAttribute("aria-hidden") === "true",
                          inert: !!answer?.hasAttribute("inert"),
                      };
                  }),
              }
            : null,
        story: story
            ? {
                  h1Count: story.querySelectorAll("h1").length,
                  stage: getComputedStyle(story).backgroundColor,
                  spacerColors: [...story.querySelectorAll(".pin-spacer")].map((element) => getComputedStyle(element).backgroundColor),
                  cardOverflow: cards.map((element) => element.scrollHeight - element.clientHeight),
                  bodyFontSizes: [...story.querySelectorAll("section p:not([class])")].map((element) => Number(getComputedStyle(element).fontSize.replace("px", ""))),
                  introWidth: story.querySelector("[data-story-intro]").getBoundingClientRect().width,
              }
            : null,
    };
}

module.exports = { collectEditorialSnapshot };

if (require.main === module) {
    const report = JSON.parse(fs.readFileSync(process.argv[2] || ".next/editorial-preview/checks.json", "utf8"));
    assert(report.length >= 5, "Capture desktop, tablet, mobile, landscape and reduced motion");
    for (const result of report) {
        const label = `${result.path} ${result.width}×${result.height}`;
        assert(result.horizontalOverflow <= 1, `${label}: horizontal overflow`);
        if (result.revealTargets !== undefined) assert(result.revealTargets > 0, `${label}: missing page reveals`);
        assert.equal(result.footer, "rgb(237, 232, 221)", `${label}: footer color`);
        assert.equal(result.footerWrapper, result.footer, `${label}: wrapper color`);
        assert.equal(result.invalidMasks + result.invalidWords, 0, `${label}: invalid text boxes`);
        assert.equal(result.splitProductDetails, 0, `${label}: product details should remain unsplit`);
        assert(
            result.linkBorders.every((border) => Math.abs(border.height - 1) < 0.1),
            `${label}: invalid link border`,
        );
        if (result.complete || result.reducedMotion) assert.equal(result.hiddenTargets, 0, `${label}: content remained hidden`);
        if (result.complete && !result.reducedMotion) {
            assert(result.masks > 0, `${label}: finished text must retain its line wrappers`);
            assert.equal(result.clippedMasks, 0, `${label}: finished text must not clip glyphs`);
            assert.equal(result.unfinishedParts, 0, `${label}: finished text is still displaced`);
        }
        if (result.reducedMotion) assert.equal(result.masks + result.words, 0, `${label}: reduced motion must leave text unsplit`);
        if (result.faq) {
            assert.equal(result.faq.activeCategories, 1, `${label}: missing active FAQ category`);
            assert(result.faq.questions.length > 0, `${label}: missing FAQ questions`);
            for (const question of result.faq.questions) {
                assert(question.controlled, `${label}: FAQ button has no answer`);
                assert.equal(question.hidden, !question.expanded, `${label}: FAQ accessible state mismatch`);
                assert.equal(question.inert, !question.expanded, `${label}: closed FAQ answer is interactive`);
            }
        }
        if (result.story) {
            assert.equal(result.story.h1Count, 1, `${label}: heading hierarchy`);
            assert(
                result.story.cardOverflow.every((value) => value <= 1),
                `${label}: card clips content`,
            );
            assert(
                result.story.bodyFontSizes.every((value) => value >= 15),
                `${label}: body text too small`,
            );
            assert(
                result.story.spacerColors.every((color) => color === result.story.stage),
                `${label}: spacer background mismatch`,
            );
            if (result.width <= 1000 || result.height < 700 || result.reducedMotion) assert.equal(result.story.spacerColors.length, 0, `${label}: compact/reduced layout must flow naturally`);
            if (result.width <= 1000) assert(result.story.introWidth > result.width * 0.7, `${label}: intro trapped in a desktop grid column`);
        }
    }
    console.log(`Passed ${report.length} browser snapshots.`);
}
