# Horizontal story reload lifecycle

## Cause (fixed 2026-11-15)

The old readable fallback stacked photos and captions vertically. `baselineViewed` treated initial viewport geometry as proof the visitor had read that fallback. A reload restored midway therefore skipped enhancement permanently. Layout also depended on the external SVG completing successfully.

## Current contract

- HTML/CSS always render one horizontal track and reserve the pinned stage plus intro/story travel before hydration. No asset or enhancement attribute changes section height. With scripting disabled, a noscript rule removes the extra animation travel; the native horizontal scroller and full caption remain available.
- The scroll timeline starts in a layout effect and renders the current position immediately, independently of SVG loading. Container/viewport changes invalidate cached geometry. A zero-sized stage waits for a measurable size instead of permanently disabling the timeline.
- The SVG starts hidden. Its readiness only enables the decorative map; loading/error/render failure cannot stop the story or reveal an opaque cover. It joins at the current progress and sleeps after the intro completes.
- The owner reads section bounds once per update and supplies normalized progress and width to the slideshow. The slideshow performs no layout reads and skips unchanged frames.
- Reduced motion retains horizontal navigation, with map zoom, image parallax and caption transitions disabled.
- Shared scroll observation resynchronizes on pageshow as well as scroll, resize, body layout and font completion. The origin invalidates its geometry on pageshow and container resize. Asset callbacks and observers are released on teardown.

Regression coverage lives in `tests/coffee-origin.test.mjs` and `tests/native-motion.test.mjs`: restored positions, delayed/rejected SVG, map-only errors, zero geometry, container/orientation changes, browser controls, restoration, reduced motion and cleanup.

## Verification (2026-11-15)

- Motion suite: 105 passed. Typecheck, style references and production build passed. Scoped lint has no errors; the existing raw-image warning remains.
- Browser reload at the story midpoint preserved scroll position, section height and slide transforms at 1280×720 and 390×844. Browser Back also restored the same mobile frame.
- Cold-cache SVG requests held pending, then released, did not reset story progress. Rejecting SVG requests kept the story active and the map hidden, including inside the intro.
- With JavaScript disabled, the section occupies one stage and its three photos remain a native horizontal scroller. Reduced motion disables the map and inner-image parallax.
- Mobile viewport emulation does not establish touch/GPU performance on a physical phone; that still needs device verification.
