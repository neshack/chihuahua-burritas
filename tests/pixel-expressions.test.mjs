import assert from 'node:assert/strict';
import { paintPixelExpression, pixelExpressionState, PIXEL_FACE_REGIONS } from '../src/characters/pixelExpressions.js';

const ids = {
  chicken: ['clasica', 'guerrera', 'robot', 'pirata', 'maga', 'zombi', 'astronauta', 'cyberpunk', 'gorda', 'enana', 'percherona', 'sedosa', 'corredora', 'coqueta', 'vaquera', 'emperatriz'],
  dog: ['clasico', 'mexicano', 'guerrero', 'pirata', 'mago', 'astronauta', 'zombi', 'cyberpunk', 'diva', 'chispa', 'grunon', 'bombon', 'churro', 'lenteja', 'capitan', 'dj'],
};

function makeCanvasContext() {
  const calls = [];
  const ctx = {
    calls,
    globalAlpha: 1,
    drawImage: (...args) => calls.push(['drawImage', ...args.slice(1)]),
    save: () => calls.push(['save']),
    restore: () => calls.push(['restore']),
    beginPath: () => calls.push(['beginPath']),
    ellipse: (...args) => calls.push(['ellipse', ...args]),
    clip: () => calls.push(['clip']),
    rect: (...args) => calls.push(['rect', ...args]),
    moveTo: (...args) => calls.push(['moveTo', ...args]),
    lineTo: (...args) => calls.push(['lineTo', ...args]),
    quadraticCurveTo: (...args) => calls.push(['quadraticCurveTo', ...args]),
    closePath: () => calls.push(['closePath']),
    stroke: () => calls.push(['stroke']),
    fill: () => calls.push(['fill']),
    arc: (...args) => calls.push(['arc', ...args]),
    fillRect: (...args) => calls.push(['fillRect', ...args]),
  };
  return ctx;
}

function render(kind, id, options = {}) {
  const ctx = makeCanvasContext();
  const source = { width: 150, height: 160 };
  const state = paintPixelExpression(ctx, source, { kind, id, ...options });
  return { state, calls: ctx.calls };
}

for (const [kind, names] of Object.entries(ids)) {
  assert.equal(Object.keys(PIXEL_FACE_REGIONS[kind]).length, names.length, `${kind} has one calibration per skin`);
  for (const id of names) {
    const face = PIXEL_FACE_REGIONS[kind][id];
    for (const [xFraction, y, rx, ry] of face.eyes) {
      const x = 150 * xFraction;
      assert.ok(x - rx >= 0 && x + rx <= 150 && y - ry >= 0 && y + ry <= 160, `${kind}/${id} face regions stay inside the cropped sprite`);
    }
    if (face.display) {
      const [left, top, right, bottom] = face.display;
      assert.ok(left >= 0 && right <= 1 && left < right && top >= 0 && bottom <= 160, `${kind}/${id} visor region stays inside the cropped sprite`);
    }
    const { state, calls } = render(kind, id, { time: 1.25, dupla: { punchExt: 0.5 } });
    assert.equal(state, 'attack', `${kind}/${id} should resolve attack`);
    assert.ok(!calls.some(([name]) => name === 'drawImage'), `${kind}/${id} must not overwrite the composed sprite`);
    if (face.eyes.length || face.display) assert.ok(calls.length > 0, `${kind}/${id} has a calibrated expression region`);
    else assert.equal(calls.length, 0, `${kind}/${id} preserves fully covered or already-closed eyes`);
  }
}

const idle = { balance: 100, hitReaction: 0, punchExt: 0, punchTime: -1, alive: true };
assert.equal(render('chicken', 'clasica', { dupla: { ...idle, alive: false }, celebration: { winner: true } }).state, 'ko', 'KO has highest priority');
assert.equal(render('chicken', 'clasica', { dupla: { ...idle, hitReaction: 0.4 }, celebration: { winner: true } }).state, 'win', 'victory outranks a lingering hit reaction');
assert.equal(render('dog', 'clasico', { dupla: { ...idle, hitReaction: 0.4, punchExt: 1 } }).state, 'hit', 'hit outranks attack');
assert.equal(render('dog', 'clasico', { dupla: { ...idle, punchExt: 1, balance: 10 } }).state, 'attack', 'attack outranks danger');
assert.equal(render('dog', 'clasico', { dupla: { ...idle, balance: 10 } }).state, 'danger', 'low balance resolves to danger');
assert.equal(pixelExpressionState({ ...idle, punchExt: 0.16 }), 'idle', 'attack threshold is stable');
assert.equal(pixelExpressionState({ ...idle, punchExt: 0.17 }), 'attack', 'attack state is available to the repaint cache');
assert.equal(pixelExpressionState({ ...idle, balance: 28 }), 'danger', 'danger threshold matches the repaint cache');

const stateFrames = [
  ['attack', { dupla: { ...idle, punchExt: 0.8 } }],
  ['hit', { dupla: { ...idle, hitReaction: 0.3 } }],
  ['danger', { dupla: { ...idle, balance: 28 } }],
  ['ko', { dupla: { ...idle, alive: false } }],
  ['win', { dupla: idle, celebration: { winner: true } }],
].map(([expected, options]) => {
  const frame = render('dog', 'clasico', options);
  assert.equal(frame.state, expected);
  assert.ok(frame.calls.some(([name]) => name === 'clip'), `${expected} paints inside the original eye boundary`);
  assert.ok(!frame.calls.some(([name]) => name === 'drawImage'), `${expected} does not redraw the source or duplicate eyes`);
  return JSON.stringify(frame.calls);
});
assert.equal(new Set(stateFrames).size, stateFrames.length, 'attack, hit, danger, KO, and win use visibly distinct eye poses');

const specialFaces = [
  ['chicken', 'cyberpunk'],
  ['dog', 'cyberpunk'],
  ['dog', 'churro'],
  ['dog', 'dj'],
];
for (const [kind, id] of specialFaces) {
  const poses = [
    ['attack', { dupla: { ...idle, punchExt: 0.8 } }],
    ['hit', { dupla: { ...idle, hitReaction: 0.3 } }],
    ['danger', { dupla: { ...idle, balance: 28 } }],
    ['ko', { dupla: { ...idle, alive: false } }],
    ['win', { dupla: idle, celebration: { winner: true } }],
  ];
  const frames = poses.map(([expected, options]) => {
    const frame = render(kind, id, options);
    assert.equal(frame.state, expected, `${kind}/${id} resolves ${expected}`);
    assert.ok(frame.calls.length > 0, `${kind}/${id} paints a ${expected} fallback`);
    assert.ok(frame.calls.some(([name]) => name === 'clip'), `${kind}/${id} keeps the ${expected} mark inside its accessory or eye slit`);
    assert.ok(!frame.calls.some(([name]) => name === 'drawImage'), `${kind}/${id} never redraws the base sprite`);
    return JSON.stringify(frame.calls);
  });
  assert.equal(new Set(frames).size, poses.length, `${kind}/${id} has distinct combat and victory states`);
  assert.equal(render(kind, id, { time: 3, reducedMotion: true, dupla: idle }).calls.length, 0, `${kind}/${id} suppresses idle glints when motion is reduced`);
}

const sameA = render('dog', 'clasico', { time: 2.5, dupla: idle });
const sameB = render('dog', 'clasico', { time: 2.5, dupla: idle });
assert.deepEqual(sameA.calls, sameB.calls, 'a frozen game clock produces a repeatable pose');
const blinkCounts = Array.from({ length: 190 }, (_, index) => render('dog', 'clasico', { time: index * 0.02, dupla: idle }).calls.filter(([name]) => name === 'quadraticCurveTo').length);
assert.ok(blinkCounts.some((count) => count > 0), 'eyes blink at deterministic time phases');
assert.ok(blinkCounts.includes(1), 'each eye blinks on a different phase');
const reducedA = render('dog', 'clasico', { time: 0, reducedMotion: true, dupla: idle });
const reducedB = render('dog', 'clasico', { time: 500, reducedMotion: true, dupla: idle });
assert.deepEqual(reducedA.calls, reducedB.calls, 'reduced motion removes decorative blink loops');
assert.equal(reducedA.calls.length, 0, 'idle reduced motion leaves the original eye art intact');
const reducedKo = render('dog', 'clasico', { time: 500, reducedMotion: true, dupla: { ...idle, alive: false } });
assert.notDeepEqual(reducedA.calls, reducedKo.calls, 'reduced motion keeps state driven KO expression');

const invalid = makeCanvasContext();
assert.equal(paintPixelExpression(invalid, { width: 150, height: 160 }, { kind: 'dog', id: 'missing' }), 'idle');
assert.equal(invalid.calls.length, 0, 'unknown IDs preserve the composed art without an overlay');
console.log('PASS: 32 calibrated faces, state priority, deterministic blinks, reduced motion, and covered accessories');
