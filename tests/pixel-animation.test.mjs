import assert from 'node:assert/strict';
import * as THREE from 'three';
import { animatePixelRider } from '../src/characters/pixelAnimation.js';
import { makeWeaponTexture } from '../src/characters/pixelWeapons.js';

const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.Texture() }));
sprite.position.y = -0.28; sprite.scale.set(1.2, 1.6, 1);
sprite.userData.pixelWidth = 1.2; sprite.userData.pixelHeight = 1.6;
const glove = new THREE.Sprite(new THREE.SpriteMaterial());
const fighter = { alive: true, speed: 5, balance: 100, punchTime: -1, dog: { userData: { gloveSprite: glove } }, dogSkin: { tauntStyle: 'giro' } };
const state = () => [sprite.position.x, sprite.position.y, sprite.scale.x, sprite.scale.y, sprite.material.rotation];
animatePixelRider(fighter, sprite, -1, 1, false);
assert.equal(sprite.material.map.repeat.x, -1); assert.equal(sprite.material.map.offset.x, 1);
assert.equal(glove.material.rotation, Math.PI);
const frozen = state(); animatePixelRider(fighter, sprite, -1, 1, false); assert.deepEqual(state(), frozen);
animatePixelRider(fighter, sprite, 1, 2, false); assert.notDeepEqual(state(), frozen);
fighter.punchExt = 1; animatePixelRider(fighter, sprite, 1, 2, false); assert.ok(sprite.position.x > 0);
fighter.hitReaction = 0.4; animatePixelRider(fighter, sprite, 1, 2, false); assert.equal(sprite.material.color.getHex(), 0xffa7a7);
fighter.alive = false; animatePixelRider(fighter, sprite, -1, 3, true); assert.equal(sprite.material.rotation, -1.35); assert.equal(glove.visible, false);
fighter.ragdoll = { resting: true }; animatePixelRider(fighter, sprite, 1, 4, false); assert.equal(sprite.material.rotation, 1.35);
fighter.alive = true; fighter.hitReaction = 0; fighter.punchExt = 0;
animatePixelRider(fighter, sprite, 1, 5, true, { winner: true, time: 5 });
assert.deepEqual(state(), [0, -0.28, 1.2, 1.6, 0]); assert.equal(glove.visible, true);
animatePixelRider(fighter, sprite, 1, 0, false, { winner: true, time: 1 }); assert.equal(sprite.material.rotation, 5);
fighter.dogSkin = { id: 'chispa', tauntStyle: 'hop' };
animatePixelRider(fighter, sprite, 1, 0, false, { winner: true, time: 0.2 });
assert.ok(sprite.position.y > -0.28); const chispa = state();
fighter.dogSkin = { id: 'grunon', tauntStyle: 'swagger' };
animatePixelRider(fighter, sprite, 1, 0, false, { winner: true, time: 0.2 }); assert.notDeepEqual(state(), chispa);
fighter.dogSkin = { id: 'diva', tauntStyle: 'dance' };
animatePixelRider(fighter, sprite, 1, 0, false, { winner: true, time: 0.2 }); const diva = state();
fighter.dogSkin = { id: 'dj', tauntStyle: 'dance' };
animatePixelRider(fighter, sprite, 1, 0, false, { winner: true, time: 0.2 }); assert.notDeepEqual(state(), diva);
animatePixelRider(fighter, sprite, 1, 0, true); assert.deepEqual(state(), [0, -0.28, 1.2, 1.6, 0]);
animatePixelRider(fighter, sprite, 1, NaN, false); assert.ok(state().every(Number.isFinite));

const previousDocument = globalThis.document;
const drawings = [];
try {
  globalThis.document = { createElement() { const rects = []; drawings.push(rects); const ctx = { fillStyle: '', fillRect(...args) { rects.push([this.fillStyle, ...args]); } }; return { getContext: () => ctx }; } };
  const kinds = ['guante', 'sarten', 'maraca', 'hueso', 'chupeta', 'chancla', 'pescado', 'pollo', 'megafono', 'martillo', 'sable', 'varita', 'laser', 'gancho', 'katana'];
  const textures = kinds.map(makeWeaponTexture);
  assert.equal(new Set(textures).size, kinds.length);
  assert.equal(new Set(drawings.map(JSON.stringify)).size, kinds.length);
  assert.equal(makeWeaponTexture('unknown'), textures[0]);
} finally {
  if (previousDocument === undefined) delete globalThis.document; else globalThis.document = previousDocument;
}
console.log('PASS: pixel rider timing, orientation, KO, reduced motion, reset and distinct weapons');
