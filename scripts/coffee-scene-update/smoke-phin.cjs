const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const ts = require("C:/coffee-shop/node_modules/typescript");
const { chromium } = require("C:/Users/Nguyen Viet Duc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const screenshot = process.argv[2];
const asset = path.resolve(__dirname, "../../public/images/3d/robusta-product-scene.glb");
const three = path.resolve("C:/coffee-shop/node_modules/three");
const studio = ts.transpileModule(fs.readFileSync("C:/coffee-shop/src/components/experience/coffee-bag/createCoffeeStudio.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const html = `<!doctype html><html><script type="importmap">{"imports":{"three":"/build/three.module.js","three/addons/":"/examples/jsm/"}}</script>
<script type="module">
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {createPhinEnvironment,createCoffeeStudio} from '/studio.mjs';
const check=(condition,message)=>{if(!condition)throw Error(message);};
const renderer=new THREE.WebGLRenderer({alpha:true,antialias:false});renderer.setSize(640,640);renderer.setPixelRatio(1);renderer.transmissionResolutionScale=.5;renderer.toneMapping=THREE.NoToneMapping;
document.body.appendChild(renderer.domElement);
const loaded=await new GLTFLoader().loadAsync('/asset.glb');
check(!loaded.scene.getObjectByName('Cup_Provided_FBX'),'Ceramic cup must be inactive');
check(!!loaded.scene.getObjectByName('Phin_ly_3'),'Original phin glass must load');
check(!loaded.scene.getObjectByName('Phin_Cube001_4'),'Internal filter press must be absent');
const phin=loaded.scene.getObjectByName('Vietnamese_Phin');check(!!phin,'Assembled phin must load');
let meshes=0,triangles=0;const env=createPhinEnvironment(renderer);let envDisposals=0;env.addEventListener('dispose',()=>envDisposals++);
phin.traverse(o=>{check(!/Cylinder003|Cylinder004|Cylinder005|Cube002|ly001/.test(o.name),'No exploded components');if(o.isMesh){meshes++;triangles+=o.geometry.index.count/3;o.material.envMap=env.texture;o.material.envMapIntensity=.65;}});
check(meshes===4&&triangles===5144,'Expected filter and glass with solid bases and without the internal press');
const phinBox=new THREE.Box3().setFromObject(phin);
check(Math.abs(phinBox.min.y)<1e-6,'Phin glass must rest on the floor');
check(loaded.scene.getObjectByName('Coffee_Bags').children.length===3,'Three bags retained');
loaded.scene.getObjectByName('Coffee_Bags').traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])check(!m.envMap,'Bag environment must remain unchanged');});
loaded.scene.traverse(o=>{if(o.isLight)o.visible=false;});
const scene=new THREE.Scene();scene.add(loaded.scene);scene.add(createCoffeeStudio(.4));check(scene.environment===null,'Reflection must stay local to phin');
const camera=new THREE.PerspectiveCamera(35,1,.01,20);camera.position.set(.5,.55,1.3);camera.lookAt(0,.22,.03);
const composer=new EffectComposer(renderer,new THREE.WebGLRenderTarget(640,640,{type:THREE.UnsignedByteType}));
composer.addPass(new RenderPass(scene,camera));const ao=new SSAOPass(scene,camera,320,320,8);ao.copyMaterial.uniforms.opacity.value=.3;ao.copyMaterial.blendDst=THREE.OneMinusSrcAlphaFactor;ao.copyMaterial.blendSrcAlpha=THREE.ZeroFactor;ao.copyMaterial.blendDstAlpha=THREE.OneFactor;composer.addPass(ao);const output=new OutputPass();composer.addPass(output);
const size=renderer.getDrawingBufferSize(new THREE.Vector2());check(size.x===640&&size.y===640,'Full render resolution');composer.render();check(renderer.getContext().getError()===0,'No WebGL errors');
window.renderedImage=renderer.domElement.toDataURL('image/png');
env.dispose();check(envDisposals===1,'Environment target disposed once');ao.dispose();output.dispose();composer.dispose();renderer.dispose();
window.result={phinMeshes:meshes,phinTriangles:triangles,ceramicCupInactive:true,originalPhinGlassRestored:true,internalFilterPressAbsent:true,glassRestsOnFloor:true,explodedSetAbsent:true,threeBagsRetained:true,reflectionOnlyOnPhin:true,environmentDisposed:true,postprocessingRenderPassed:true};
</script></html>`;
(async () => {
    const browser = await chromium.launch({
        executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
        headless: true,
        args: ["--enable-webgl", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
    });
    try {
        const page = await browser.newPage(),
            errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        page.on("console", (m) => {
            if (m.type() === "error") errors.push(m.text());
        });
        await page.route("http://phin-smoke.local/**", (route) => {
            const p = new URL(route.request().url()).pathname;
            if (p === "/") return route.fulfill({ contentType: "text/html", body: html });
            if (p === "/asset.glb") return route.fulfill({ path: asset, contentType: "model/gltf-binary" });
            if (p === "/studio.mjs") return route.fulfill({ contentType: "text/javascript", body: studio });
            const f = path.resolve(three, "." + p);
            assert(f.startsWith(three + path.sep));
            return route.fulfill({ path: f, contentType: "text/javascript" });
        });
        await page.goto("http://phin-smoke.local/");
        await page.waitForFunction(() => window.result, undefined, { timeout: 90000 });
        assert.deepEqual(errors, []);
        const result = await page.evaluate(() => window.result);
        result.errors = errors;
        const png = await page.evaluate(() => window.renderedImage);
        if (screenshot) fs.writeFileSync(screenshot, Buffer.from(png.split(",")[1], "base64"));
        fs.writeFileSync("C:/coffee-shop/scripts/coffee-scene-update/phin-integration-validation.json", JSON.stringify(result, null, 2));
        console.log(JSON.stringify(result));
    } finally {
        await browser.close();
    }
})().catch((e) => {
    console.error(e);
    process.exitCode = 1;
});
