import * as THREE from 'three';

import { CHICKEN_SKINS, DOG_SKINS } from '../world/skins.js';
import { animatePixelRider } from './pixelAnimation.js';
import { motionPose, paintPixelMotion } from './pixelMotion.js';
import { paintPixelExpression, pixelExpressionState } from './pixelExpressions.js';
const CATALOG = { chicken: CHICKEN_SKINS, dog: DOG_SKINS };

const assets = { chicken: {}, dog: {} };
const cameraRight = new THREE.Vector3();

/** Slice and trim the original sprite drawings once; share textures across fighters. */
export async function loadPixelSprites() {
  await Promise.all(Object.entries(CATALOG).flatMap(([kind, skins]) => ['base', 'extra'].map(async (sheet) => {
    const selected = skins.map((skin,index) => ({skin,index})).filter(({skin}) => (skin.spriteAtlas ?? 'base') === sheet);
    if (!selected.length) return;
    const image = new Image();
    image.src = `${(import.meta.env?.BASE_URL ?? '/')}art/${kind}${sheet === 'extra' ? '-extra' : ''}-atlas.png`;
    await image.decode();

    selected.forEach(({skin, index: fallback}) => {
      const id = skin.id;
      const index = skin.spriteIndex ?? fallback;
      const column = index % 4, row = Math.floor(index / 4);
      const sx = Math.floor(column * image.width / 4), sy = Math.floor(row * image.height / 2);
      const cellW = Math.floor((column + 1) * image.width / 4) - sx;
      const cellH = Math.floor((row + 1) * image.height / 2) - sy;
      const cell = document.createElement('canvas');
      cell.width = cellW;
      cell.height = cellH;
      const ctx = cell.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(image, sx, sy, cellW, cellH, 0, 0, cellW, cellH);
      const pixels = ctx.getImageData(0, 0, cellW, cellH).data;
      let left = cellW, top = cellH, right = 0, bottom = 0;
      for (let y = 0; y < cellH; y++) for (let x = 0; x < cellW; x++) {
        if (pixels[(y * cellW + x) * 4 + 3] > 64) {
          left = Math.min(left, x); right = Math.max(right, x);
          top = Math.min(top, y); bottom = Math.max(bottom, y);
        }
      }
      const width = right - left + 1, height = bottom - top + 1;
      const canvas = document.createElement('canvas');
      canvas.height = 160;
      canvas.width = Math.round(160 * width / height);
      const draw = canvas.getContext('2d');
      draw.imageSmoothingEnabled = false;
      draw.drawImage(cell, left, top, width, height, 0, 0, canvas.width, canvas.height);
      assets[kind][id] = { source: canvas, aspect: width / height, url: canvas.toDataURL() };
    });
  })));
}

export function pixelPortraits() {
  return Object.fromEntries(Object.entries(assets).map(([kind, skins]) => [kind, Object.fromEntries(Object.entries(skins).map(([id, asset]) => [id, asset.url]))]));
}

export function makePixelSprite(kind, id, height) {
  const asset = assets[kind][id];
  if (!asset) throw new Error(`Missing pixel sprite: ${kind}/${id}`);
  const margin = 8;
  const canvas = document.createElement('canvas');
  canvas.width = asset.source.width + margin * 2;
  canvas.height = asset.source.height + margin * 2;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(asset.source, margin, margin);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, alphaTest: 0.25, toneMapped: false });
  const sprite = new THREE.Sprite(material);
  sprite.center.set(0.5, margin / canvas.height);
  const width = height * asset.aspect * canvas.width / asset.source.width;
  const paddedHeight = height * canvas.height / asset.source.height;
  sprite.scale.set(width, paddedHeight, 1);
  sprite.userData.ownsPixelTexture = true;
  sprite.userData.pixelHeight = paddedHeight;
  sprite.userData.pixelWidth = width;
  sprite.userData.pixelCanvas = { canvas, ctx, source: asset.source, kind, id, margin, key: null };
  return sprite;
}

/** Visual state only: combat, collision anchors and timers remain in Dupla. */
export function updatePixelDupla(dupla, camera, time, reducedMotion, celebration = {}) {
  const chicken = dupla.chicken.userData.sprite;
  const dog = dupla.dog.userData.sprite;
  if (!chicken || !dog) return;
  cameraRight.setFromMatrixColumn(camera.matrixWorld, 0);
  const facing = Math.sin(dupla.heading) * cameraRight.x + Math.cos(dupla.heading) * cameraRight.z;
  if (Math.abs(facing) > 0.12) dupla.pixelFacing = facing > 0 ? 1 : -1;
  const sign = dupla.pixelFacing ?? 1;
  const speed = Math.min(1, dupla.speed / 9.2);
  const step = reducedMotion ? 0 : Math.sin(Math.floor(time * 12) * 0.9);
  chicken.scale.set(chicken.userData.pixelWidth * (1 + speed * step * 0.025), chicken.userData.pixelHeight * (1 - speed * step * 0.035), 1);
  chicken.position.y = 0;
  chicken.material.rotation = 0;
  dog.scale.x = dog.userData.pixelWidth;
  for (const sprite of [chicken, dog]) {
    sprite.material.map.repeat.x = sign;
    sprite.material.map.offset.x = sign < 0 ? 1 : 0;
  }
  animatePixelRider(dupla, dog, sign, time, reducedMotion, celebration);
  for (const sprite of [chicken, dog]) {
    const data = sprite.userData.pixelCanvas;
    if (!data) continue;
    // State changes repaint immediately; otherwise cap canvas uploads at 12 fps.
    const key = [reducedMotion ? 0 : Math.floor(time * 12), reducedMotion, !!dupla.airborne, !!dupla.braking, dupla.justLanded > 0, dupla.speed > .46, pixelExpressionState(dupla, celebration)].join('|');
    if (key === data.key) continue;
    data.key = key;
    data.ctx.clearRect(0, 0, data.canvas.width, data.canvas.height);
    data.ctx.save();
    data.ctx.translate(data.margin, data.margin);
    paintPixelMotion(data.ctx, data.source, data.kind, data.id, motionPose(dupla, time, reducedMotion));
    paintPixelExpression(data.ctx, data.source, { kind: data.kind, id: data.id, time, reducedMotion, dupla, celebration });
    data.ctx.restore();
    sprite.material.map.needsUpdate = true;
  }
}
