// Foot bounds are fractions of the tight crop's width and source pixels in y.
// They exclude the outer tail, shield, cloak and dress on each original drawing.
const LEGS = {
  chicken: {
    clasica: [[.24,.46,140],[.57,.79,140]], guerrera: [[.24,.46,140],[.57,.79,140]],
    robot: [[.24,.50,140],[.59,.84,140]], pirata: [[.24,.46,140],[.56,.84,140]],
    maga: [[.24,.46,140],[.57,.79,140]], zombi: [[.24,.46,140],[.57,.79,140]],
    astronauta: [[.24,.46,140],[.57,.79,140]], cyberpunk: [[.24,.46,140],[.57,.79,140]],
    gorda: [[.27,.49,148],[.49,.75,148]], enana: [[.30,.56,136],[.58,.84,136]],
    percherona: [[.08,.51,128],[.52,.91,128]], sedosa: [[.23,.56,137],[.56,.86,137]],
    corredora: [[.09,.44,121],[.49,.87,121]], coqueta: [[.31,.56,140],[.56,.82,140]],
    vaquera: [[.20,.48,134],[.51,.79,134]], emperatriz: [[.37,.59,145],[.60,.84,145]],
  },
  dog: {
    clasico: [[.20,.43,137],[.56,.79,137]], mexicano: [[.20,.43,137],[.56,.79,137]],
    guerrero: [[.17,.43,137],[.56,.79,137]], pirata: [[.20,.43,137],[.56,.79,137]],
    mago: [[.24,.45,139],[.58,.82,139]], astronauta: [[.20,.43,137],[.56,.79,137]],
    zombi: [[.16,.43,137],[.56,.79,137]], cyberpunk: [[.20,.43,137],[.56,.79,137]],
    diva: [[.08,.40,140],[.45,.78,140]], chispa: [[.07,.30,140],[.30,.75,140]],
    grunon: [[.08,.30,140],[.30,.79,140]], bombon: [[.07,.28,141],[.28,.78,141]],
    churro: [[.07,.30,140],[.30,.75,140]], lenteja: [[.07,.28,140],[.28,.75,140]],
    capitan: [[.06,.29,140],[.29,.75,140]], dj: [[.06,.26,140],[.26,.89,140]],
  },
};

/** Deterministic integer-pixel limb offsets; one foot stays on the ground. */
export function motionPose(dupla, time, reducedMotion) {
  if (dupla.alive === false) return { legs: [{ x: 0, y: 0 }, { x: 0, y: 0 }] };
  if (dupla.airborne) return { legs: [{ x: -2, y: -5 }, { x: 2, y: -5 }] };
  const speed = Math.max(0, Math.min(1, (dupla.speed || 0) / 9.2));
  if (dupla.braking || dupla.justLanded > 0) return { legs: [{ x: -2, y: 0 }, { x: 2, y: 0 }] };
  if (reducedMotion || speed < .05) return { legs: [{ x: 0, y: 0 }, { x: 0, y: 0 }] };
  const phase = Math.sin(Math.floor(time * 12) * .9);
  const x = Math.round(phase * speed * 5);
  const lift = Math.round(Math.abs(phase) * speed * 5);
  return { legs: [{ x, y: phase > 0 ? -lift : 0 }, { x: -x, y: phase < 0 ? -lift : 0 }] };
}

/** Paint in original source coordinates; the caller provides transparent margin. */
export function paintPixelMotion(ctx, source, kind, id, pose) {
  const bounds = LEGS[kind]?.[id] ?? [[.2,.44,140],[.56,.8,140]];
  const width = source.width, height = source.height;
  ctx.drawImage(source, 0, 0);
  if (pose.legs.every(leg => leg.x === 0 && leg.y === 0)) return;
  const regions = bounds.map(([left, right, top]) => {
    const x = Math.floor(width * left), end = Math.ceil(width * right);
    return { x, top, w: end - x, h: height - top };
  });
  regions.forEach(({ x, top, w, h }, index) => {
    const leg = pose.legs[index];
    if (leg.x !== 0 || leg.y !== 0) ctx.clearRect(x, top, w, h);
  });
  regions.forEach(({ x, top, w, h }, index) => {
    const leg = pose.legs[index];
    if (leg.x === 0 && leg.y === 0) return;
    // Horizontal bands bend gradually from the fixed hip to the moving foot.
    for (let row = 0; row < h; row += 3) {
      const band = Math.min(3, h - row);
      const progress = row / h;
      const dx = Math.round(leg.x * progress);
      const dy = Math.round(leg.y * progress);
      ctx.drawImage(source, x, top + row, w, band, x + dx, top + row + dy, w, band);
    }
    // Restore the body-side joint, leaving the foot itself free to move.
    const joint = Math.min(8, Math.floor(h * .4));
    ctx.drawImage(source, x, top, w, joint, x, top, w, joint);
  });
}
