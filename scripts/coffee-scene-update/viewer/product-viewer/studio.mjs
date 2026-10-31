import * as THREE from 'three';

export function createStudioEnvironment(renderer){
  const studio=new THREE.Scene();studio.background=new THREE.Color(.22,.22,.22);
  const panel=(color,intensity,width,height,position)=>{
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(intensity),side:THREE.DoubleSide}));
    mesh.position.set(...position);mesh.lookAt(0,1,0);studio.add(mesh);
  };
  panel('#fff7ed',5.5,4.5,6,[-3,4,4]);panel('#ffffff',2.7,3,5,[4,2,3]);
  panel('#fff4e4',3.5,2.5,4,[2,4,-3]);panel('#ffffff',1.1,6,5,[0,6,0]);
  const generator=new THREE.PMREMGenerator(renderer),target=generator.fromScene(studio,.08);
  studio.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});generator.dispose();return target;
}

export function configureStudioScene(scene,renderer){
  scene.background=new THREE.Color('#efede7');
  const environment=createStudioEnvironment(renderer);scene.environment=environment.texture;scene.environmentIntensity=.85;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.96;
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.VSMShadowMap;
  scene.traverse(object=>{
    if(object.isMesh)object.castShadow=object.receiveShadow=true;
    if(object.name==='Studio_Floor')object.castShadow=false;
    if(object.name==='Studio_Key'&&object.isDirectionalLight){
      object.castShadow=true;object.shadow.mapSize.set(2048,2048);
      Object.assign(object.shadow.camera,{left:-.65,right:.65,top:.7,bottom:-.5,near:.01,far:8});
      object.shadow.bias=-.00003;object.shadow.normalBias=.00022;object.shadow.radius=3;object.shadow.blurSamples=8;
    }
  });
  return environment;
}
