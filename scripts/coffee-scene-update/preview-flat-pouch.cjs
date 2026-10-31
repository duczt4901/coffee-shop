// Render the real GLB with the homepage lights, before/after and from two angles.
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { chromium } = require("C:/Users/Nguyen Viet Duc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const [asset, output, prefix = "after"] = process.argv.slice(2);
assert(asset && output, "Usage: node preview-flat-pouch.cjs asset.glb output-directory [prefix]");
const root = path.resolve(__dirname, "../../node_modules/three");
const html = `<!doctype html><html><style>body{margin:0;background:#f4f1ea}canvas{display:block}</style>
<script type="importmap">{"imports":{"three":"/build/three.module.js","three/addons/":"/examples/jsm/"}}</script>
<script type="module">
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.NoToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
document.body.appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#f4f1ea');
const camera=new THREE.PerspectiveCamera(30,innerWidth/innerHeight,.01,100);
const loaded=await new GLTFLoader().loadAsync('/asset.glb');
loaded.scene.traverse(o=>{if(o.isLight)o.visible=false;if(o.isMesh){o.castShadow=o.receiveShadow=true;}if(o.name==='Studio_Floor'){o.castShadow=false;o.geometry.dispose();o.geometry=new THREE.PlaneGeometry(100,100);o.rotation.set(-Math.PI/2,0,0);o.material=new THREE.ShadowMaterial({color:0x62584c,opacity:.24,depthWrite:false});}});
loaded.scene.getObjectByName('Beans_Floating')?.traverse(o=>{if(o.isMesh)o.castShadow=false;});
scene.add(loaded.scene);loaded.scene.updateMatrixWorld(true);
const product=loaded.scene.getObjectByName('Product_Display');
const bounds=new THREE.Box3().setFromObject(product),radius=bounds.getBoundingSphere(new THREE.Sphere()).radius;
const target=new THREE.Object3D();target.position.copy(bounds.getCenter(new THREE.Vector3()));scene.add(target);
const key=new THREE.DirectionalLight(0xffffff,2.1);key.position.copy(target.position).add(new THREE.Vector3(-.45,.7,.85).multiplyScalar(radius*5));key.target=target;key.castShadow=true;key.shadow.mapSize.set(2048,2048);
Object.assign(key.shadow.camera,{left:-radius*1.3,right:radius*1.3,top:radius*1.3,bottom:-radius*1.3,near:radius,far:radius*9});key.shadow.bias=-.00005;key.shadow.normalBias=radius*.003;key.shadow.radius=6;
const fill=new THREE.DirectionalLight(0xffffff,1.25);fill.position.copy(target.position).add(new THREE.Vector3(.6,.6,.9).multiplyScalar(radius*5));fill.target=target;
scene.add(key,fill,new THREE.HemisphereLight(0xffffff,0xd8d3ca,1.15));
const composer=new EffectComposer(renderer,new THREE.WebGLRenderTarget(innerWidth,innerHeight,{type:THREE.UnsignedByteType}));
composer.addPass(new RenderPass(scene,camera));const ao=new SSAOPass(scene,camera,innerWidth/2,innerHeight/2,16);ao.copyMaterial.uniforms.opacity.value=.3;ao.copyMaterial.blendDst=THREE.OneMinusSrcAlphaFactor;ao.copyMaterial.blendSrcAlpha=THREE.ZeroFactor;ao.copyMaterial.blendDstAlpha=THREE.OneFactor;ao.kernelRadius=radius*.06;ao.minDistance=.0001;ao.maxDistance=.006;composer.addPass(ao);composer.addPass(new OutputPass());
const bag=loaded.scene.getObjectByName('Bag_1kg_Orange');
const bagBox=new THREE.Box3().setFromObject(bag),bagCenter=bagBox.getCenter(new THREE.Vector3());
let pouchMesh;bag.traverse(o=>{if(o.isMesh&&o.geometry.attributes.position.count===6098)pouchMesh=o;});
window.renderView=(view)=>{
  const isolated=view!=='scene';
  product.children.forEach(o=>o.visible=!isolated||o.name==='Coffee_Bags');
  loaded.scene.getObjectByName('Coffee_Bags').children.forEach(o=>o.visible=!isolated||o===bag);
  const center=isolated?bagCenter:bounds.getCenter(new THREE.Vector3());
  const height=isolated?bagBox.getSize(new THREE.Vector3()).y:bounds.getSize(new THREE.Vector3()).y;
  const distance=height/(2*Math.tan(THREE.MathUtils.degToRad(15)))*1.18;
  const yaw=THREE.MathUtils.degToRad(view==='front'?-16:view==='back'?164:view==='side'?74:view==='angle'?12:6);
  const elevation=THREE.MathUtils.degToRad(view==='scene'?12:view==='angle'?8:0);
  camera.position.copy(center).add(new THREE.Vector3(Math.sin(yaw)*Math.cos(elevation),Math.sin(elevation),Math.cos(yaw)*Math.cos(elevation)).multiplyScalar(distance));
  if(view==='seam'){
    center.set(.86,1.50,-.97).applyMatrix4(pouchMesh.matrixWorld);
    camera.position.copy(center).add(new THREE.Vector3(.10,.012,.15));
  }
  camera.lookAt(center);camera.updateProjectionMatrix();
  ao.ssaoMaterial.uniforms.cameraNear.value=camera.near;ao.ssaoMaterial.uniforms.cameraFar.value=camera.far;
  ao.setSize(innerWidth/2,innerHeight/2);composer.render();
};
window.renderView('front');window.ready=true;
</script></html>`;

(async () => {
    fs.mkdirSync(output, { recursive: true });
    const browser = await chromium.launch({
        executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
        headless: true,
        args: ["--enable-webgl", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
    });
    try {
        const page = await browser.newPage({ viewport: { width: 1200, height: 1200 } });
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.route("http://pouch-preview.local/**", async (route) => {
            const pathname = new URL(route.request().url()).pathname;
            if (pathname === "/") return route.fulfill({ contentType: "text/html", body: html });
            if (pathname === "/asset.glb") return route.fulfill({ path: path.resolve(asset), contentType: "model/gltf-binary" });
            const file = path.resolve(root, "." + pathname);
            assert(file.startsWith(root + path.sep));
            return route.fulfill({ path: file, contentType: "text/javascript" });
        });
        await page.goto("http://pouch-preview.local/");
        await page.waitForFunction(() => window.ready, undefined, { timeout: 90000 });
        for (const view of ["front", "angle", "back", "side", "scene", "seam"]) {
            await page.evaluate((v) => window.renderView(v), view);
            await page.screenshot({ path: path.join(output, prefix + "-" + view + ".png") });
        }
        assert.deepEqual(errors, []);
        console.log(JSON.stringify({ prefix, screenshots: 6, errors }));
    } finally {
        await browser.close();
    }
})().catch((e) => {
    console.error(e);
    process.exitCode = 1;
});
