import * as THREE from 'three';
import { getDogSkin } from '../world/skins.js';
import { makePixelSprite } from './pixelSprites.js';

import { makeWeaponTexture } from './pixelWeapons.js';

const coilCanvas = document.createElement('canvas'); coilCanvas.width = 12; coilCanvas.height = 12;
const coilCtx = coilCanvas.getContext('2d');
coilCtx.fillStyle = '#283346'; coilCtx.fillRect(1, 1, 10, 10);
coilCtx.fillStyle = '#eef3ff'; coilCtx.fillRect(3, 1, 6, 2); coilCtx.fillRect(3, 9, 6, 2);
coilCtx.fillStyle = '#95a9bd'; coilCtx.fillRect(1, 3, 3, 6); coilCtx.fillRect(8, 3, 3, 6);
const coilMap = new THREE.CanvasTexture(coilCanvas); coilMap.magFilter = THREE.NearestFilter; coilMap.minFilter = THREE.NearestFilter;


/** Preserve the weapon's original anchors while drawing an entirely new rider. */
export function createChihuahua(skinId = 'clasico') {
  const skin = getDogSkin(skinId);
  const root = new THREE.Group(); root.name = `pixel-chihuahua-${skin.id}`;
  const anchor = (parent, x = 0, y = 0, z = 0) => {
    const group = new THREE.Group(); group.position.set(x, y, z); parent.add(group); return group;
  };
  const body = anchor(root);
  const head = anchor(body, 0, 0.66, 0.08);
  const sprite = makePixelSprite('dog', skin.id, 1.6); sprite.position.y = -0.28; body.add(sprite);
  const gloveRoot = anchor(body, 0.45, 0.46, 0.10);
  const spring = anchor(gloveRoot, 0, 0, 0.34);
  const segments = Array.from({ length: 6 }, () => {
    const segment = anchor(spring);
    const coil = new THREE.Sprite(new THREE.SpriteMaterial({ map: coilMap, transparent: true, alphaTest: 0.25, toneMapped: false }));
    coil.scale.set(0.15, 0.15, 1); segment.add(coil); return segment;
  });
  const glove = anchor(spring, 0, 0, 0.55);
  const gloveSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeWeaponTexture(skin.weapon), transparent: true, alphaTest: 0.25, toneMapped: false }));
  gloveSprite.scale.set(0.67, 0.50, 1); glove.add(gloveSprite);
  const pupils = anchor(head), xEyes = anchor(head), dizzyStars = anchor(head, 0, 0.68, 0);
  xEyes.visible = false; dizzyStars.visible = false;
  root.userData.parts = { body, head, ears: [anchor(head), anchor(head)], brows: anchor(head), eyelids: anchor(head), pupils, xEyes, tail: anchor(body), dizzyStars, leftArm: anchor(body, -0.31, 0.40, 0.12), gloveRoot, spring, segments, glove, springBaseZ: 0.34, gloveBaseZ: 0.84 };
  root.userData.sprite = sprite; root.userData.gloveSprite = gloveSprite;
  root.userData.kind = 'chihuahua'; root.userData.skin = skin;
  return root;
}
