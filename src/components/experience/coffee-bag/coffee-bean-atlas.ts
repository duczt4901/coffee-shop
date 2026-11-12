import * as THREE from "three";

export const TILE_SIZE = 128;
export const ATLAS_COLUMNS = 4;

export async function loadCoffeeBeanAtlas(url: string) {
    // Preserve the bake's linear, premultiplied bytes; avoid browser color/alpha conversion.
    const bitmap = await new THREE.ImageBitmapLoader().setOptions({ imageOrientation: "flipY", premultiplyAlpha: "none" }).loadAsync(url);
    const texture = new THREE.Texture(bitmap);
    texture.colorSpace = THREE.NoColorSpace;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.flipY = false;
    texture.needsUpdate = true;
    return texture;
}
