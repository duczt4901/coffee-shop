const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const {chromium} = require('C:/Users/Nguyen Viet Duc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const candidate = path.resolve(process.argv[2] || 'public/images/3d/robusta-product-scene.glb');
const output = path.resolve('scripts/coffee-scene-update');
const viewerDirectory = path.join(__dirname, 'viewer');
const original = 'C:/Users/Nguyen Viet Duc/.codex/visualizations/2026/10/25/01a17293-342c-7841-958e-5ba8d1e506bd/scene-variation-20261026/original.glb';

(async()=>{
  const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try {
    const reports=[];
    const versions=process.argv.includes('--final') ? [['after',candidate]] : [['before',original],['after',candidate]];
    for (const [version,file] of versions) {
      const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
      await page.route('**/robusta-product-scene.glb',route=>route.fulfill({status:200,contentType:'model/gltf-binary',body:fs.readFileSync(file)}));
      await page.route('**/images/3d/product-viewer/**',async route=>{
        const relative = new URL(route.request().url()).pathname.split('/product-viewer/')[1];
        const asset = path.resolve(viewerDirectory, 'product-viewer', relative);
        assert.ok(asset.startsWith(path.join(viewerDirectory, 'product-viewer') + path.sep));
        await route.fulfill({path:asset,contentType:'text/javascript'});
      });
      await page.route('**/product-scene-viewer.html',async route=>{
        const html=fs.readFileSync(path.join(viewerDirectory,'product-scene-viewer.html'),'utf8').replace('window.previewReady=true;','window.__scene=scene;window.previewReady=true;');
        await route.fulfill({status:200,contentType:'text/html',body:html});
      });
      await page.goto('http://localhost:3000/images/3d/product-scene-viewer.html',{waitUntil:'domcontentloaded',timeout:60000});
      await page.waitForFunction(()=>window.previewReady,undefined,{timeout:90000});
      await page.evaluate(()=>document.body.classList.add('capture'));
      for(const view of ['hero','front','top','back','left','right','close','beans']) {
        await page.evaluate(view=>window.setView(view),view);
        await page.waitForTimeout(250);
        await page.screenshot({path:path.join(output,`${version}-${view}.png`)});
      }
      const stats=await page.evaluate(()=>{
        const stats=window.assetStats();
        stats.bags=stats.bags.map(b=>{
          const group=window.__scene.getObjectByName(b.name),q=group.quaternion;
          return {...b,yawDegrees:2*Math.atan2(q.y,q.w)*180/Math.PI};
        });
        return stats;
      });
      assert.equal(stats.bags.length,3);assert.equal(stats.beanInstances,44);assert.equal(errors.length,0,errors.join('\n'));
      reports.push({version,bytes:fs.statSync(file).size,...stats,errors});
      await page.close();
    }
    const after=reports.at(-1);
    assert.ok(after.bytes < fs.statSync(original).size);
    assert.ok(after.renderedTriangles < 465276*.4);
    assert.deepEqual(after.bags.map(b=>Math.round(b.yawDegrees)),[-16,12,4]);
    fs.writeFileSync(path.join(output,process.argv.includes('--final') ? 'final-verification.json' : 'verification.json'),JSON.stringify(reports,null,2));
    console.log(JSON.stringify(reports.map(r=>({version:r.version,bytes:r.bytes,triangles:r.renderedTriangles,meshes:r.meshes,beanInstances:r.beanInstances,errors:r.errors})),null,2));
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
