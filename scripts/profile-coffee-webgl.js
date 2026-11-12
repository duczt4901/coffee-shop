// Run in the preview page's DevTools/CDP Runtime.evaluate with awaitPromise.
(async () => {
    const canvas = document.querySelector('[data-coffee-frame] canvas');
    if (!canvas) throw new Error('Coffee canvas is not mounted');
    const gl = canvas.getContext('webgl2');
    const timer = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    const methods = ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced'];
    const originals = new Map();
    const frames = [];
    let current = null;
    let draws = 0;
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
    const startY = scrollY;
    try {
        for (const method of methods) {
            originals.set(method, gl[method]);
            gl[method] = function (...args) {
                draws++;
                if (!current) {
                    const sample = { draws: 0, query: timer ? gl.createQuery() : null };
                    current = sample;
                    if (sample.query) gl.beginQuery(timer.TIME_ELAPSED_EXT, sample.query);
                    queueMicrotask(() => {
                        if (sample.query) gl.endQuery(timer.TIME_ELAPSED_EXT);
                        frames.push(sample);
                        current = null;
                    });
                }
                current.draws++;
                return originals.get(method).apply(this, args);
            };
        }
        const top = canvas.getBoundingClientRect().top + scrollY + 250;
        scrollTo({ top, behavior: 'instant' });
        await frame(); await frame(); await wait(300);
        const began = performance.now();
        await new Promise(resolve => {
            const tick = now => {
                const t = Math.min((now - began) / 2400, 1);
                scrollTo({ top: Math.round(top + Math.sin(t * Math.PI) * innerHeight * 0.45), behavior: 'instant' });
                if (t < 1) requestAnimationFrame(tick);
                else requestAnimationFrame(resolve);
            };
            requestAnimationFrame(tick);
        });
        await wait(500);
        const idleStart = draws;
        await wait(1000);
        const idleDraws = draws - idleStart;
        const disjoint = timer ? gl.getParameter(timer.GPU_DISJOINT_EXT) : null;
        const times = frames.filter(f => f.query && gl.getQueryParameter(f.query, gl.QUERY_RESULT_AVAILABLE))
            .map(f => gl.getQueryParameter(f.query, gl.QUERY_RESULT) / 1e6).sort((a, b) => a - b);
        const calls = frames.map(f => f.draws).sort((a, b) => a - b);
        return {
            viewport: [innerWidth, innerHeight], devicePixelRatio,
            buffer: [canvas.width, canvas.height], pixels: canvas.width * canvas.height,
            gpu: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
            samples: times.length, disjoint, draws, frameCount: frames.length,
            drawsPerFrame: { min: calls[0], median: calls[Math.floor(calls.length / 2)], max: calls.at(-1) },
            gpuMedianMs: times[Math.floor(times.length / 2)], gpuP95Ms: times[Math.floor(times.length * 0.95)],
            idleDraws, contextLost: gl.isContextLost(),
        };
    } finally {
        for (const [method, original] of originals) gl[method] = original;
        for (const sample of frames) if (sample.query) gl.deleteQuery(sample.query);
        scrollTo({ top: startY, behavior: 'instant' });
    }
})();
