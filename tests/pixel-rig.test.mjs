import assert from 'node:assert/strict';
import * as THREE from 'three';

// Rendering is verified in the browser. A minimal canvas lets this test exercise
// the real physics and animation anchors without a GPU or browser timing.
const context = { fillRect() {}, clearRect() {}, save() {}, restore() {}, translate() {}, rect() {}, clip() {}, moveTo() {}, lineTo() {}, quadraticCurveTo() {}, closePath() {}, stroke() {}, beginPath() {}, ellipse() {}, fill() {}, drawImage() {}, getImageData: () => ({ data: new Uint8Array([0, 0, 0, 255]) }) };
globalThis.document = { createElement: () => ({ width: 1, height: 1, getContext: () => context, toDataURL: () => 'data:image/png;base64,' }) };
globalThis.Image = class { width = 4; height = 2; async decode() {} };
const { loadPixelSprites, updatePixelDupla } = await import('../src/characters/pixelSprites.js');
await loadPixelSprites();
const { Dupla } = await import('../src/game/dupla.js');
const { CHICKEN_SKINS, DOG_SKINS } = await import('../src/world/skins.js');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera();
camera.position.set(0, 10, 16); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
const fighter = new Dupla({ scene });
for (let index = 0; index < CHICKEN_SKINS.length; index++) {
  fighter.setSkins(CHICKEN_SKINS[index].id, DOG_SKINS[index].id);
  fighter.reset({ heading: Math.PI / 2 });
  for (const model of [fighter.chicken, fighter.dog]) {
    assert.ok(model.userData.sprite.isSprite);
    model.traverse(node => { if (node.isMesh) assert.equal(node, fighter.chickenParts.shadow); });
  }
  fighter.tryPunch(null);
  for (let frame = 0; frame < 40; frame++) fighter.update(1 / 60);
  fighter.updateGloveWorld();
  assert.ok(fighter.gloveWorld.toArray().every(Number.isFinite));
  assert.equal(fighter.dogPivot.parent, fighter.chickenParts.tilt);
  fighter.takeHit(150, fighter.forward);
  assert.equal(fighter.balance, 0);
  fighter.knockout(fighter.forward);
  for (let frame = 0; frame < 120; frame++) fighter.update(1 / 60);
  updatePixelDupla(fighter, camera, 2, false);
  assert.equal(fighter.alive, false);
  assert.ok(fighter.ragdoll);
  assert.ok(fighter.dogPivot.position.toArray().every(Number.isFinite));
  fighter.reset();
  updatePixelDupla(fighter, camera, 3, true);
  assert.equal(fighter.alive, true);
  assert.equal(fighter.dogPivot.parent, fighter.chickenParts.tilt);
}
// Repainting is driven by the game clock and visible state, not render frames.
fighter.reset();
fighter.balance = 100;
updatePixelDupla(fighter, camera, 4, false);
const map = fighter.chicken.userData.sprite.material.map;
let version = map.version;
updatePixelDupla(fighter, camera, 4, false);
assert.equal(map.version, version, 'paused clock does not upload again');
fighter.velocity.x = 5;
updatePixelDupla(fighter, camera, 4, false);
version = map.version;
fighter.velocity.x = 6;
updatePixelDupla(fighter, camera, 4, false);
assert.equal(map.version, version, 'speed changes within a state do not upload every frame');
fighter.hitReaction = .4;
updatePixelDupla(fighter, camera, 4, false);
version = map.version;
fighter.hitReaction = .3;
updatePixelDupla(fighter, camera, 4, false);
assert.equal(map.version, version, 'hit reaction changes within a state do not upload every frame');
fighter.hitReaction = 0;
fighter.balance = 29;
updatePixelDupla(fighter, camera, 3, true);
version = map.version;
updatePixelDupla(fighter, camera, 5, true);
assert.equal(map.version, version, 'reduced motion does not upload for clock changes');
fighter.balance = 28;
updatePixelDupla(fighter, camera, 5, true);
assert.ok(map.version > version, 'danger expression updates immediately at threshold');
fighter.dispose();
console.log('PASS: 32 sprite variants, original animation anchors, punch, KO, reduced motion and round reset.');
