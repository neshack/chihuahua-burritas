import { pixelPortraits } from './pixelSprites.js';

// Reuse the actual in-game drawings; no temporary 3D portrait renderer.
export function generateSkinThumbnails() {
  return pixelPortraits();
}
