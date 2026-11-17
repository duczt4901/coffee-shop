import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const runtime = process.env.QA_NODE_MODULES || 'C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1112-737-0_26.1112.737.0_x64__3k8sg7r9htsxt/dependencies/node/node_modules';
const require = createRequire(path.join(runtime, 'qa-loader.cjs'));
const { PNG } = require('pngjs');
const pixelmatch = (await import(pathToFileURL(path.join(runtime, 'pixelmatch/index.js')).href)).default;
const root = path.resolve('output/experience-2026-11-16');
const baselinePhase = process.argv[2] || 'baseline', postPhase = process.argv[3] || 'post';
const baseline = JSON.parse(await fs.readFile(path.join(root, baselinePhase, 'results.json')));
const after = await fs.readFile(path.join(root, postPhase, 'results.json'), 'utf8').then(JSON.parse).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
const output = path.join(root, process.argv[4] || 'comparison');
await fs.mkdir(output, { recursive: true });
function flatten(value, prefix = '', result = {}) {
    if (typeof value === 'number') result[prefix] = value;
    else if (value && typeof value === 'object') for (const [key, item] of Object.entries(value)) flatten(item, `${prefix}.${key}`, result);
    return result;
}
function styles(value, prefix = '', result = {}) {
    if (typeof value === 'string' && /\.(font|transform|position|fontSize)$/.test(prefix)) result[prefix] = value;
    else if (value && typeof value === 'object') for (const [key, item] of Object.entries(value)) styles(item, `${prefix}.${key}`, result);
    return result;
}
const calibration = {};
const baselinePixelNoise = [];
for (const viewport of ['desktop', 'mobile']) {
    const runs = baseline.captures.filter(c => c.name.startsWith(`${viewport}-home-`)).map(c => flatten(c.data));
    calibration[viewport] = Object.fromEntries(Object.keys(runs[0] || {}).map(key => [key, { min: Math.min(...runs.map(r => r[key])), max: Math.max(...runs.map(r => r[key])), observedSpread: Math.max(...runs.map(r => r[key])) - Math.min(...runs.map(r => r[key])) }]));
    const captures = baseline.captures.filter(c => c.name.startsWith(`${viewport}-home-`));
    for (const capture of captures.slice(1)) {
        const a = PNG.sync.read(await fs.readFile(path.join(root, baselinePhase, captures[0].file))), b = PNG.sync.read(await fs.readFile(path.join(root, baselinePhase, capture.file)));
        const changedPixels = pixelmatch(a.data, b.data, null, a.width, a.height, { threshold: 0, includeAA: true });
        baselinePixelNoise.push({ viewport, first: captures[0].name, repeat: capture.name, changedPixels });
    }
}
const comparisons = [];
for (const capture of after?.captures || []) {
    const before = baseline.captures.find(c => c.name === capture.name);
    if (!before) continue;
    const first = flatten(before.data), second = flatten(capture.data);
    const geometryChanges = Object.entries(second).filter(([key, value]) => first[key] !== undefined && value !== first[key]).map(([key, value]) => ({ key, before: first[key], after: value, delta: value - first[key] }));
    const initialStyles = styles(before.data), finalStyles = styles(capture.data);
    const styleChanges = Object.entries(finalStyles).filter(([key, value]) => initialStyles[key] !== undefined && value !== initialStyles[key]).map(([key, value]) => ({ key, before: initialStyles[key], after: value }));
    const a = PNG.sync.read(await fs.readFile(path.join(root, baselinePhase, before.file)));
    const b = PNG.sync.read(await fs.readFile(path.join(root, postPhase, capture.file)));
    let changedPixels = null, changedBounds = null;
    if (a.width === b.width && a.height === b.height) {
        const diff = new PNG({ width: a.width, height: a.height });
        changedPixels = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0, includeAA: true });
        let left = a.width, top = a.height, right = -1, bottom = -1;
        for (let y = 0; y < a.height; y++) for (let x = 0; x < a.width; x++) {
            const i = (y * a.width + x) * 4;
            if ([0, 1, 2, 3].some(c => a.data[i + c] !== b.data[i + c])) { left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y); }
        }
        if (right >= 0) changedBounds = { left, top, right, bottom };
        await fs.writeFile(path.join(output, capture.file), PNG.sync.write(diff));
    }
    comparisons.push({ name: capture.name, geometryChanges, styleChanges, changedPixels, changedBounds, pixels: a.width * a.height });
}
const result = { policy: 'Geometry reference is the observed min/max of three repeated baseline captures for home per viewport; no invented pixel/timing acceptance threshold. Other states report every numeric delta for engineering review. Pixel differences use exact RGBA matching and produce diagnostics, not an aesthetic pass/fail. Intentional icon/feedback changes are Mode B, outside preservation pixel equivalence.', calibration, baselinePixelNoise, comparisons };
await fs.writeFile(path.join(output, 'comparison.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ comparisons: comparisons.length, changed: comparisons.filter(c => c.geometryChanges.length || c.styleChanges.length || c.changedPixels).map(c => ({ name: c.name, geometryChanges: c.geometryChanges.length, styleChanges: c.styleChanges.length, changedPixels: c.changedPixels })), output }, null, 2));
