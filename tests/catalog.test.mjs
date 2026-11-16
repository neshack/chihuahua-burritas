import assert from 'node:assert/strict';
import {
  CHICKEN_BY_ID,
  CHICKEN_SKINS,
  DOG_BY_ID,
  DOG_SKINS,
  getChickenSkin,
  getDogSkin,
} from '../src/world/skins.js';

const extraChickenIds = [
  'gorda', 'enana', 'percherona', 'sedosa',
  'corredora', 'coqueta', 'vaquera', 'emperatriz',
];
const extraDogIds = [
  'diva', 'chispa', 'grunon', 'bombon',
  'churro', 'lenteja', 'capitan', 'dj',
];
const tauntStyles = new Set(['dance', 'swagger', 'hop', 'spin']);
const chickenColorFields = [
  'body', 'shade', 'wing', 'belly', 'comb', 'beak', 'legs', 'eye',
  'accent', 'card', 'glow', 'accessory',
];
const dogColorFields = [
  'fur', 'furLight', 'inner', 'nose', 'accent', 'cloth', 'card',
  'glow', 'accessory',
];

function assertUniqueIds(skins, label) {
  const ids = skins.map((skin) => skin.id);
  assert.equal(new Set(ids).size, ids.length, `${label} IDs must be unique`);
}

function assertExtraAtlas(skins, expectedIds, label) {
  assert.deepEqual(skins.slice(-expectedIds.length).map((skin) => skin.id), expectedIds);
  for (const [index, skin] of skins.slice(-expectedIds.length).entries()) {
    assert.equal(skin.spriteAtlas, 'extra', `${label} ${skin.id} atlas`);
    assert.equal(skin.spriteIndex, index, `${label} ${skin.id} sprite index`);
  }
}

assert.equal(CHICKEN_SKINS.length, 16);
assert.equal(DOG_SKINS.length, 16);
assertUniqueIds(CHICKEN_SKINS, 'Chicken');
assertUniqueIds(DOG_SKINS, 'Dog');
assertExtraAtlas(CHICKEN_SKINS, extraChickenIds, 'Chicken');
assertExtraAtlas(DOG_SKINS, extraDogIds, 'Dog');

for (const skin of CHICKEN_SKINS) {
  assert.equal(getChickenSkin(skin.id), skin);
  assert.equal(CHICKEN_BY_ID[skin.id], skin);
  for (const field of chickenColorFields) assert.ok(field in skin, `${skin.id} needs ${field}`);
}
for (const skin of DOG_SKINS) {
  assert.equal(getDogSkin(skin.id), skin);
  assert.equal(DOG_BY_ID[skin.id], skin);
  for (const field of dogColorFields) assert.ok(field in skin, `${skin.id} needs ${field}`);
  assert.ok(skin.weapon, `${skin.id} needs a weapon`);
  assert.ok(skin.personality, `${skin.id} needs a personality`);
  assert.ok(skin.taunt, `${skin.id} needs a taunt`);
  assert.ok(tauntStyles.has(skin.tauntStyle), `${skin.id} needs a supported taunt style`);
}

for (const skin of CHICKEN_SKINS.slice(-extraChickenIds.length)) {
  assert.ok(skin.shape, `${skin.id} needs a distinct shape`);
  assert.ok(skin.tag, `${skin.id} needs a playful tag`);
  assert.ok(skin.description, `${skin.id} needs a description`);
  assert.ok(Number.isFinite(skin.spriteHeight), `${skin.id} needs a sprite height`);
  assert.ok(Number.isFinite(skin.spriteWidthScale), `${skin.id} needs a sprite width scale`);
  assert.ok(Number.isFinite(skin.saddleY), `${skin.id} needs a visual saddle position`);
}

assert.deepEqual(extraDogIds.map((id) => DOG_BY_ID[id].weapon), [
  'sarten', 'maraca', 'hueso', 'chupeta', 'chancla', 'pescado', 'pollo', 'megafono',
]);
assert.equal(getChickenSkin('unknown'), CHICKEN_SKINS[0]);
assert.equal(getDogSkin('unknown'), DOG_SKINS[0]);

console.log('PASS: 16 unique chicken skins and 16 unique dog skins resolve with atlas and personality metadata.');
