# CPU ×6 loading diagnosis — local development, 2026-11-15

Chrome in-app browser, localhost:3000 (Next development), 1280×720; Emulation.setCPUThrottlingRate(6). CPU was restored to 1 afterward. These are single diagnostic runs, not production scores or statistically controlled benchmarks.

| Observation | Before | After splitting offscreen 3D |
| --- | ---: | ---: |
| Opening starts (ms since navigation) | 13815.5 | 14959.0 |
| Loading hidden (ms since navigation) | 15420.8 | 16255.2 |
| Longest main-thread task overlapping opening (ms) | 1302 | 220 |
| Recorded rAF callbacks while opening | 2 | 11 |

The rAF count measures JavaScript scheduling opportunities, not compositor FPS. The maximum blocking task improved in this pair, but total startup did not: do not claim a faster overall load from these runs. Development compilation, caches and concurrent machine activity are not isolated. A profiler attempt captured mostly idle/native program samples and does not attribute the 1302 ms task to a specific function.

Confirmed separately: at ~8 seconds a waiting overlay had computed visibility:hidden because its CSS-only escape fired before hydration. The CSS-only escape is now 30 seconds and is disabled once the layout effect marks hydration; the existing JS watchdog remains 6 seconds after client setup. Noscript still exposes the page immediately.

Three.js and WebGL initialization moved out of the React shell into a dynamically imported runtime. Before entering the scene, no canvas was created; after entering it, the real model reached ready without console errors. Placeholder geometry and queued scroll progress remain intact. A later reload inside the scene was not compared to top-of-page loading.

Validation: 20 focused tests, typecheck and references/unused CSS checks passed. Production build, production CPU ×6, physical-device performance and reliable animation FPS were not measured for this change.
