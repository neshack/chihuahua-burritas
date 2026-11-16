import * as THREE from 'three';
import { getChickenSkin } from '../world/skins.js';
import { makePixelSprite } from './pixelSprites.js';

/** Sprite character with lightweight animation anchors; no voxel geometry. */
export function createChicken(skinId = 'clasica') {
  const skin = getChickenSkin(skinId);
  const root = new THREE.Group();
  root.name = `pixel-chicken-${skin.id}`;
  const anchor = (parent, x = 0, y = 0, z = 0) => {
    const group = new THREE.Group(); group.position.set(x, y, z); parent.add(group); return group;
  };
  const tilt = anchor(root);
  const head = anchor(tilt, 0, 1.5, 0.5);
  const sprite = makePixelSprite('chicken', skin.id, skin.spriteHeight ?? 2.0);
  sprite.userData.pixelWidth *= skin.spriteWidthScale ?? 1;
  sprite.scale.x = sprite.userData.pixelWidth;
  tilt.add(sprite);
  const surpriseEyes = anchor(head); surpriseEyes.visible = false;
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 32; shadowCanvas.height = 16;
  const ctx = shadowCanvas.getContext('2d');
  ctx.fillStyle = '#302313'; ctx.beginPath(); ctx.ellipse(16, 8, 15, 6, 0, 0, Math.PI * 2); ctx.fill();
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.1), new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, opacity: 0.27, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.025; root.add(shadow);
  root.userData.parts = { tilt, head, neck: anchor(tilt), wings: [anchor(tilt), anchor(tilt)], legs: [anchor(tilt), anchor(tilt)], tail: anchor(tilt), body: tilt, beakLower: anchor(head), wattle: anchor(head), combGroup: anchor(head), brows: anchor(head), surpriseEyes, shadow, saddleY: skin.saddleY ?? 1.53, saddleZ: -0.38 };
  root.userData.sprite = sprite;
  root.userData.kind = 'chicken'; root.userData.skin = skin;
  return root;
}
