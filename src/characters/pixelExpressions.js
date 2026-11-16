const FACE_REGIONS = {
  chicken: {
    clasica: { eyes: [[0.7572, 46.5, 9.46, 11.03], [0.9217, 46.9, 5.91, 7.88]], lid: '#fbf5e7' },
    guerrera: { eyes: [[0.787, 49.38, 9.57, 10.33], [0.9195, 50.14, 5.74, 7.66]], lid: '#dcc493' },
    robot: { eyes: [[0.772, 45.71, 10.25, 11.03], [0.9145, 46.11, 6.31, 7.49]], lid: '#8492a0' },
    pirata: { eyes: [[0.8803, 47.73, 5.09, 7.04]], lid: '#b47e50' }, // left eye is an eyepatch
    maga: { eyes: [[0.7143, 55.72, 8.66, 9.79], [0.8647, 55.72, 5.27, 7.15]], lid: '#7c4db7' },
    zombi: { eyes: [[0.7558, 45.95, 10.67, 12.31], [0.9117, 45.95, 6.15, 8.21]], lid: '#7fa45c' },
    astronauta: { eyes: [[0.7266, 51.91, 8.52, 9.69], [0.8596, 52.3, 5.81, 6.97]], lid: '#f4f4f4' },
    cyberpunk: { eyes: [], display: [0.70, 40, 0.94, 54], displayColor: '#baffff' }, // cyan visor fully covers both eyes
    gorda: { eyes: [[0.7052, 35.64, 5.69, 6.45], [0.816, 35.64, 3.79, 4.93]], lid: '#e8b85b' },
    enana: { eyes: [[0.7442, 42.78, 7.22, 5], [0.9419, 37.22, 3.89, 4.44]], lid: '#f1e7d7' },
    percherona: { eyes: [[0.7727, 23.66, 5.63, 7.14], [0.8636, 20.66, 3.38, 4.51]], lid: '#edcf99' },
    sedosa: { eyes: [[0.7559, 55.08, 4.42, 5.63]], lid: '#e8e0f4' },
    corredora: { eyes: [[0.8342, 32.75, 6.02, 7.15], [0.9413, 32.75, 3.39, 4.89]], lid: '#f1ca4e' },
    coqueta: { eyes: [[0.7624, 52.47, 4.43, 2.96], [0.8877, 48.04, 2.59, 3.33]], lid: '#f1a58e' },
    vaquera: { eyes: [[0.6028, 39.44, 5.21, 5.95], [0.6998, 35.35, 3.35, 4.09]], lid: '#c47e47' },
    emperatriz: { eyes: [[0.7216, 36.89, 4.89, 3.01], [0.819, 34.64, 2.64, 3.39]], lid: '#7351a6' },
  },
  dog: {
    clasico: { eyes: [[0.5157, 69.7, 9.11, 8.32], [0.7721, 68.91, 4.75, 7.92]], lid: '#c98a4b' },
    mexicano: { eyes: [[0.5123, 71.76, 8.63, 8.24], [0.7562, 69.41, 4.71, 7.84]], lid: '#c99055' },
    guerrero: { eyes: [[0.5223, 72.23, 8.93, 7.77], [0.7765, 70.68, 4.66, 7.38]], lid: '#bb8a5c' },
    pirata: { eyes: [[0.7746, 70.68, 4.66, 7.77]], lid: '#9c6b42' }, // left eye is an eyepatch
    mago: { eyes: [[0.5737, 74.84, 8.4, 8.02], [0.8016, 74.84, 4.58, 7.64]], lid: '#c99a63' },
    astronauta: { eyes: [[0.5084, 71.11, 8.69, 8.3], [0.7486, 70.72, 4.74, 7.9]], lid: '#d8b07a' },
    zombi: { eyes: [[0.4444, 66.11, 11.37, 11.37], [0.7333, 61.89, 5.47, 7.16]], lid: '#88a95c' },
    cyberpunk: { eyes: [], display: [0.57, 64, 0.84, 73], displayColor: '#ffc5ef' }, // opaque magenta visor fully covers both eyes
    diva: { eyes: [[0.5951, 80.37, 6.7, 5.58], [0.8723, 77.4, 5.21, 4.84]], lid: '#d9a9c6' },
    chispa: { eyes: [[0.5691, 70.34, 9.66, 11.98], [0.8271, 65.31, 5.41, 9.28]], lid: '#49bdd8' },
    grunon: { eyes: [[0.5435, 73.82, 9.28, 5.02], [0.8285, 67.25, 5.8, 6.18]], lid: '#8b8580' },
    bombon: { eyes: [[0.5895, 74.42, 10.05, 10.79], [0.85, 69.21, 5.21, 8.56]], lid: '#9b5743' },
    churro: { eyes: [[0.5412, 67.29, 6.26, 2.35], [0.7861, 62.98, 4.69, 1.96]], lid: '#2f8052', style: 'mask' }, // expressive eye slits in the green mask
    lenteja: { eyes: [[0.5385, 72.8, 4.67, 7.01], [0.8011, 67.35, 3.89, 6.23]], lid: '#cdbf91' },
    capitan: { eyes: [[0.8616, 68.13, 5.45, 8.56]], lid: '#9e704d' }, // left eye is already winking
    dj: { eyes: [], display: [0.55, 64, 0.77, 71], displayColor: '#91faff' }, // sunglasses cover both eyes
  },
};

const TAU = Math.PI * 2;
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const wrap = (value, span) => ((value % span) + span) % span;

export function pixelExpressionState(dupla, celebration = null) {
  if (dupla?.alive === false || dupla?.knockedOut === true) return 'ko';
  if (celebration?.winner) return 'win';
  if (finite(dupla?.hitReaction) > 0) return 'hit';
  if (finite(dupla?.punchExt) > 0.16 || (finite(dupla?.punchTime, -1) >= 0 && finite(dupla?.punchTime) < 0.28)) return 'attack';
  if (Number.isFinite(dupla?.balance) && dupla.balance <= 28) return 'danger';
  return 'idle';
}

function hash(text) {
  let value = 2166136261;
  for (let i = 0; i < text.length; i += 1) value = Math.imul(value ^ text.charCodeAt(i), 16777619);
  return (value >>> 0) / 4294967296;
}

function blinkFor(time, kind, id, eyeIndex, reducedMotion) {
  if (reducedMotion) return false;
  const period = 3.8;
  const offset = (hash(`${kind}:${id}`) + eyeIndex * 0.13) * period;
  return wrap(finite(time) + offset, period) < 0.12;
}

function eyePoint(source, eye) {
  return { x: source.width * eye[0], y: eye[1], rx: eye[2], ry: eye[3] };
}

function paintEye(ctx, source, face, eye, index, state, time, reducedMotion, kind, id) {
  const { x, y, rx, ry } = eyePoint(source, eye);
  const blink = state === 'idle' && blinkFor(time, kind, id, index, reducedMotion);
  if (state === 'idle' && !blink) return;
  const lid = face.lids?.[index] ?? face.lid ?? '#d4b28d';

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.clip();

  if (state === 'ko' || state === 'win' || blink) {
    ctx.fillStyle = lid;
    ctx.fillRect(x - rx, y - ry, rx * 2, ry * 2);
    if (face.style === 'mask' && state === 'ko') {
      ctx.beginPath();
      ctx.moveTo(x - rx * 0.55, y - ry * 0.55);
      ctx.lineTo(x + rx * 0.55, y + ry * 0.55);
      ctx.moveTo(x + rx * 0.55, y - ry * 0.55);
      ctx.lineTo(x - rx * 0.55, y + ry * 0.55);
      ctx.strokeStyle = '#164c36';
      ctx.lineWidth = Math.max(1, rx * 0.2);
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();
      return;
    }
    if (face.style === 'mask' && state === 'win') {
      ctx.beginPath();
      ctx.moveTo(x - rx * 0.55, y + ry * 0.35);
      ctx.lineTo(x, y - ry * 0.4);
      ctx.lineTo(x + rx * 0.55, y + ry * 0.35);
      ctx.strokeStyle = '#164c36';
      ctx.lineWidth = Math.max(1, rx * 0.2);
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();
      return;
    }
    ctx.beginPath();
    ctx.moveTo(x - rx * 0.82, y + ry * 0.08);
    ctx.quadraticCurveTo(x, y + ry * (state === 'ko' ? 0.54 : state === 'win' ? 0.35 : 0.38), x + rx * 0.82, y + ry * 0.08);
    ctx.strokeStyle = state === 'ko' ? '#473333' : '#4a3027';
    ctx.lineWidth = Math.max(1, rx * 0.22);
    ctx.lineCap = 'round';
    ctx.stroke();
    if (state === 'win') {
      ctx.beginPath();
      ctx.moveTo(x - rx * 0.48, y + ry * 0.38);
      ctx.lineTo(x, y + ry * 0.65);
      ctx.lineTo(x + rx * 0.48, y + ry * 0.38);
      ctx.strokeStyle = '#744538';
      ctx.lineWidth = Math.max(1, rx * 0.18);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  ctx.beginPath();
  if (state === 'danger') {
    ctx.moveTo(x - rx, y + ry * 0.25);
    ctx.quadraticCurveTo(x, y - ry * 0.05, x + rx, y + ry * 0.25);
    ctx.lineTo(x + rx, y + ry);
    ctx.lineTo(x - rx, y + ry);
  } else {
    const slant = (state === 'attack' ? -1 : index === 0 ? 1 : -1) * ry * 0.12;
    ctx.moveTo(x - rx, y - ry * 0.68 + slant);
    ctx.quadraticCurveTo(x, y - ry * 0.08 + slant, x + rx, y - ry * 0.56 - slant);
    ctx.lineTo(x + rx, y - ry);
    ctx.lineTo(x - rx, y - ry);
  }
  ctx.closePath();
  ctx.fillStyle = lid;
  ctx.fill();

  if (state === 'hit') {
    ctx.beginPath();
    ctx.moveTo(x + rx * 0.35, y - ry * 0.55);
    ctx.lineTo(x + rx * 0.62, y - ry * 0.90);
    ctx.moveTo(x + rx * 0.58, y - ry * 0.42);
    ctx.lineTo(x + rx * 0.9, y - ry * 0.68);
    ctx.strokeStyle = '#fff5d8';
    ctx.lineWidth = Math.max(1, rx * 0.12);
    ctx.stroke();
  }
  ctx.restore();
}

function paintVisor(ctx, source, face, state, time, reducedMotion, kind, id) {
  if (!face.display) return;
  const [left, top, right, bottom] = face.display;
  const x = source.width * left;
  const y = top;
  const width = source.width * (right - left);
  const height = bottom - top;
  const blink = state === 'idle' && blinkFor(time, kind, id, 0, reducedMotion);
  if (state === 'idle' && !blink) return;
  const colors = {
    attack: face.displayColor,
    hit: '#fff2a3',
    danger: '#ff615e',
    ko: '#263441',
    win: '#ffe08a',
    blink: face.displayColor,
  };
  const color = colors[blink ? 'blink' : state] ?? face.displayColor;
  const cx = x + width * 0.5;
  const cy = y + height * 0.5;
  const edge = Math.min(width, height);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1, edge * 0.1);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (state === 'ko') {
    const radius = edge * 0.2;
    ctx.beginPath();
    ctx.moveTo(cx - radius, cy - radius);
    ctx.lineTo(cx + radius, cy + radius);
    ctx.moveTo(cx + radius, cy - radius);
    ctx.lineTo(cx - radius, cy + radius);
    ctx.stroke();
  } else if (state === 'win') {
    const radius = edge * 0.25;
    ctx.beginPath();
    ctx.moveTo(cx - radius, cy + radius * 0.45);
    ctx.lineTo(cx, cy - radius * 0.55);
    ctx.lineTo(cx + radius, cy + radius * 0.45);
    ctx.stroke();
  } else if (state === 'danger') {
    const radius = edge * 0.18;
    ctx.beginPath();
    ctx.moveTo(cx, cy - radius);
    ctx.lineTo(cx - radius * 0.85, cy + radius * 0.55);
    ctx.lineTo(cx + radius * 0.85, cy + radius * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(cx - ctx.lineWidth * 0.45, cy - radius * 0.48, ctx.lineWidth * 0.9, radius * 0.65);
  } else if (state === 'hit') {
    const radius = edge * 0.3;
    ctx.beginPath();
    ctx.moveTo(cx - radius, cy - radius * 0.45);
    ctx.lineTo(cx - radius * 0.12, cy - radius * 0.08);
    ctx.lineTo(cx - radius * 0.42, cy + radius * 0.5);
    ctx.lineTo(cx + radius * 0.05, cy + radius * 0.1);
    ctx.lineTo(cx + radius * 0.37, cy + radius * 0.46);
    ctx.stroke();
  } else if (state === 'attack') {
    ctx.beginPath();
    ctx.moveTo(cx - width * 0.32, cy + height * 0.2);
    ctx.lineTo(cx + width * 0.32, cy - height * 0.2);
    ctx.stroke();
  } else if (blink) {
    ctx.beginPath();
    ctx.moveTo(cx - width * 0.25, cy + height * 0.1);
    ctx.lineTo(cx + width * 0.25, cy - height * 0.1);
    ctx.stroke();
  }
  ctx.restore();
}

/** Paint deterministic facial state over the original, tightly cropped 160px-high sprite. */
export function paintPixelExpression(ctx, source, { kind, id, time = 0, reducedMotion = false, dupla = null, celebration = null } = {}) {
  if (!ctx || !source || !Number.isFinite(source.width) || !Number.isFinite(source.height)) return 'idle';
  const face = FACE_REGIONS[kind]?.[id];
  if (!face) return 'idle';
  const state = pixelExpressionState(dupla, celebration);
  if (face.eyes?.length) face.eyes.forEach((eye, index) => paintEye(ctx, source, face, eye, index, state, time, reducedMotion, kind, id));
  paintVisor(ctx, source, face, state, time, reducedMotion, kind, id);
  return state;
}

/** x is a fraction of tight-crop width; y/radii use source pixels after scaling height to 160. */
export const PIXEL_FACE_REGIONS = FACE_REGIONS;
