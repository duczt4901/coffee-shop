const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { chromium } = require("C:/Users/Nguyen Viet Duc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const [asset, output, prefix = "after"] = process.argv.slice(2);
assert(asset && output);
const root = path.resolve(__dirname, "../../node_modules/three");
const html = `<!doctype html><html><style>body{margin:0;background:#f4f1ea}canvas{display:block}</style>
<script type="importmap">{"imports":{"three":"/build/three.module.js","three/addons/":"/examples/jsm/"}}</script>
<script type="module">
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createStudioEnvironment} from '/studio.mjs';
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(1);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
document.body.appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#f4f1ea');
scene.environment=createStudioEnvironment(renderer).texture;scene.environmentIntensity=.9;
const key=new THREE.DirectionalLight(0xffffff,2);key.position.set(-2,3,4);scene.add(key,new THREE.HemisphereLight(0xffffff,0x777777,.5));
const loaded=await new GLTFLoader().loadAsync('/asset.glb');scene.add(loaded.scene);loaded.scene.updateMatrixWorld(true);
const camera=new THREE.PerspectiveCamera(35,innerWidth/innerHeight,.001,100);
const assembled=new Set(['Cylinder_0','Cylinder.001_1','Cylinder.002_2','ly_3','Cube.001_4'].map(THREE.PropertyBinding.sanitizeNodeName));
const groups=loaded.scene.getObjectByName('GLTF_SceneRootNode').children;
window.renderView=(view)=>{
 groups.forEach(o=>o.visible=view==='all'||(view==='filter'?o.name===THREE.PropertyBinding.sanitizeNodeName('Cube.001_4'):assembled.has(o.name)));
 const box=new THREE.Box3();groups.filter(o=>o.visible).forEach(o=>box.union(new THREE.Box3().setFromObject(o)));
 const center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
 const distance=Math.max(size.y,size.x)/(2*Math.tan(THREE.MathUtils.degToRad(17.5)))*1.22;
 const direction=view==='filter'?new THREE.Vector3(.05,1,.08):view==='top'?new THREE.Vector3(.4,1,.35):view==='front'?new THREE.Vector3(0,.15,1):new THREE.Vector3(.8,.55,1);
 camera.position.copy(center).add(direction.normalize().multiplyScalar(distance));camera.lookAt(center);renderer.render(scene,camera);
};
window.renderView('all');window.ready=true;
</script></html>`;
(async () => {
    fs.mkdirSync(output, { recursive: true });
    const browser = await chromium.launch({
        executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
        headless: true,
        args: ["--enable-webgl", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
    });
    try {
        const page = await browser.newPage({ viewport: { width: 1000, height: 1000 } }),
            errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.route("http://phin-preview.local/**", async (route) => {
            const pathname = new URL(route.request().url()).pathname;
            if (pathname === "/") return route.fulfill({ contentType: "text/html", body: html });
            if (pathname === "/asset.glb") return route.fulfill({ path: path.resolve(asset), contentType: "model/gltf-binary" });
            if (pathname === "/studio.mjs") return route.fulfill({ path: path.join(__dirname, "viewer/product-viewer/studio.mjs"), contentType: "text/javascript" });
            const file = path.resolve(root, "." + pathname);
            assert(file.startsWith(root + path.sep));
            return route.fulfill({ path: file, contentType: "text/javascript" });
        });
        await page.goto("http://phin-preview.local/");
        await page.waitForFunction(() => window.ready, undefined, { timeout: 90000 });
        for (const view of ["all", "front", "angle", "top", "filter"]) {
            await page.evaluate((v) => window.renderView(v), view);
            await page.screenshot({ path: path.join(output, prefix + "-" + view + ".png") });
        }
        assert.deepEqual(errors, []);
        console.log(JSON.stringify({ prefix, views: 5, errors }));
    } finally {
        await browser.close();
    }
})().catch((e) => {
    console.error(e);
    process.exitCode = 1;
});
