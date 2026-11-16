const number = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const clamp01 = (value) => Math.max(0, Math.min(1, number(value)));

/** Animate only the billboard and weapon art; never move the combat anchors. */
export function animatePixelRider(dupla, sprite, sign, time, reducedMotion, celebration = {}) {
  if (!sprite) return;
  const direction = sign < 0 ? -1 : 1;
  const t = number(time);
  const base = sprite.userData.riderBase ??= {
    x: sprite.position.x, y: sprite.position.y, z: sprite.position.z,
    width: number(sprite.userData.pixelWidth, sprite.scale.x),
    height: number(sprite.userData.pixelHeight, sprite.scale.y),
    depth: sprite.scale.z,
  };
  sprite.position.set(base.x, base.y, base.z);
  sprite.scale.set(base.width, base.height, base.depth);
  sprite.material.rotation = 0;
  sprite.material.color.setHex(0xffffff);
  if (sprite.material.map) {
    sprite.material.map.repeat.x = direction;
    sprite.material.map.offset.x = direction < 0 ? 1 : 0;
  }
  const glove = dupla.dog?.userData?.gloveSprite;
  if (glove) {
    const gloveBase = glove.userData.riderBase ??= { x: glove.position.x, y: glove.position.y, z: glove.position.z };
    glove.position.set(gloveBase.x, gloveBase.y, gloveBase.z);
    glove.visible = dupla.alive !== false;
    glove.material.rotation = direction < 0 ? Math.PI : 0;
  }

  const dead = dupla.alive === false;
  if (dead) {
    // Reduced motion and a settled ragdoll both retain the readable final KO pose.
    sprite.material.rotation = reducedMotion || dupla.ragdoll?.resting ? direction * 1.35 : direction * t * 7;
    return;
  }
  const hit = clamp01(number(dupla.hitReaction) / 0.45);
  const punch = clamp01(dupla.punchExt);
  const windup = dupla.punchTime >= 0 && dupla.punchTime < 0.11 ? 1 - clamp01(dupla.punchTime / 0.11) : 0;
  if (hit > 0) sprite.material.color.setHex(0xffa7a7);
  if (reducedMotion) return;

  const skin = dupla.dogSkin ?? dupla.dog?.userData?.skin ?? {};
  const identity = `${skin.id ?? ''} ${skin.personality ?? ''}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const nervous = /chispa|nervios/.test(identity);
  const grumpy = /grunon|grumpy/.test(identity);
  const diva = /diva/.test(identity);
  const dj = /\bdj\b/.test(identity);
  const speed = clamp01(number(dupla.speed) / 9.2);
  const breath = Math.sin(t * (nervous ? 3.7 : grumpy ? 1.5 : 2.1));
  const ride = Math.abs(Math.sin(t * (nervous ? 15 : grumpy ? 7 : 10))) * speed;
  sprite.scale.y *= 1 + breath * 0.012 - ride * 0.025;
  sprite.scale.x *= 1 - breath * 0.006 + ride * 0.018;
  sprite.position.y += ride * 0.09 + breath * 0.008;
  sprite.material.rotation = direction * (windup * 0.12 - punch * 0.2 + hit * 0.25 + Math.sin(t * 9) * clamp01(1 - number(dupla.balance, 100) / 100) * 0.12);
  sprite.position.x += direction * (punch * 0.07 - windup * 0.04 - hit * 0.06);

  if (celebration.winner) {
    const ct = number(celebration.time);
    const style = skin.tauntStyle ?? 'baile';
    if (glove) {
      glove.position.y += diva ? 0.10 : 0.12 + Math.sin(ct * (dj ? 9 : 5)) * 0.05;
      glove.material.rotation += direction * (diva ? -0.25 : Math.sin(ct * 5) * 0.18);
    }
    if (style === 'giro' || style === 'spin') {
      sprite.material.rotation += direction * ct * 5;
    } else if (style === 'saltito' || style === 'jump' || style === 'hop') {
      sprite.position.y += Math.abs(Math.sin(ct * 5)) * 0.22;
    } else if (style === 'contoneo' || style === 'wiggle' || style === 'swagger') {
      sprite.material.rotation += direction * Math.sin(ct * (grumpy ? 3 : 7)) * (diva ? 0.10 : 0.22);
      sprite.position.x += Math.sin(ct * (grumpy ? 3 : 7)) * 0.06;
    } else {
      sprite.material.rotation += direction * Math.sin(ct * (dj ? 9 : diva ? 3 : 6)) * (diva ? 0.08 : 0.18);
      sprite.position.y += Math.abs(Math.sin(ct * (dj ? 9 : 6))) * (diva ? 0.025 : 0.11);
    }
  }
}
