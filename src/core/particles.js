import * as THREE from 'three';
import { clamp, randomRange, pick } from '../core/utils.js';

const MAX_PARTICLES = 960;
const PARTICLE_COLORS = [0xffc72c, 0xf5781e, 0xe33687, 0x2a9d8f, 0x63b3ed, 0xf7f2e3];

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

export class ParticleSystem {
  constructor(scene) {
    this.geometry = new THREE.BoxGeometry(1, 1, 1);
    this.material = new THREE.MeshBasicMaterial({
      toneMapped: false,
      vertexColors: false,
    });
    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, MAX_PARTICLES);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
    this.mesh.renderOrder = 2;
    scene.add(this.mesh);

    this.particles = [];
    for (let i = 0; i < MAX_PARTICLES; i += 1) {
      this.particles.push({
        active: false,
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        rotation: new THREE.Euler(),
        spin: new THREE.Vector3(),
        life: 0,
        maxLife: 1,
        size: 0.1,
        aspect: new THREE.Vector3(1, 1, 1),
        gravity: 0,
        drag: 0,
        flutter: 0,
        fade: true,
        bounce: 0.18,
      });
      this.mesh.setColorAt(i, _color.set(0xffffff));
      _dummy.position.set(0, -100, 0);
      _dummy.scale.set(0, 0, 0);
      _dummy.updateMatrix();
      this.mesh.setMatrixAt(i, _dummy.matrix);
    }
    this.mesh.instanceColor.needsUpdate = true;
    this.cursor = 0;
  }

  spawn(options) {
    const index = this.cursor;
    this.cursor = (this.cursor + 1) % MAX_PARTICLES;
    const particle = this.particles[index];
    particle.active = true;
    particle.position.copy(options.position);
    particle.velocity.copy(options.velocity ?? new THREE.Vector3());
    particle.rotation.set(
      options.rotation?.x ?? 0,
      options.rotation?.y ?? 0,
      options.rotation?.z ?? 0,
    );
    particle.spin.copy(options.spin ?? new THREE.Vector3());
    particle.life = options.life ?? 1;
    particle.maxLife = particle.life;
    particle.size = options.size ?? 0.1;
    particle.aspect.set(
      options.aspect?.x ?? 1,
      options.aspect?.y ?? 1,
      options.aspect?.z ?? 1,
    );
    particle.gravity = options.gravity ?? 0;
    particle.drag = options.drag ?? 0;
    particle.flutter = options.flutter ?? 0;
    particle.fade = options.fade ?? true;
    particle.bounce = options.bounce ?? 0.18;
    this.mesh.setColorAt(index, _color.set(options.color ?? 0xffffff));
    this.mesh.instanceColor.needsUpdate = true;
  }

  dust(position, count = 6, options = {}) {
    const color = options.color ?? 0xd8b68a;
    const scale = options.scale ?? 0.18;
    const speed = options.speed ?? 1.6;
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = new THREE.Vector3(
        Math.cos(angle) * speed * randomRange(0.3, 1),
        randomRange(0.4, 1.3),
        Math.sin(angle) * speed * randomRange(0.3, 1),
      );
      this.spawn({
        position: position.clone().add(
          new THREE.Vector3(
            randomRange(-0.18, 0.18),
            randomRange(0, 0.12),
            randomRange(-0.18, 0.18),
          ),
        ),
        velocity,
        size: scale * randomRange(0.6, 1.3),
        aspect: { x: randomRange(0.7, 1.4), y: randomRange(0.5, 1), z: randomRange(0.7, 1.4) },
        color: i % 3 === 0 ? 0xc8a274 : color,
        life: (options.life ?? 0.65) * randomRange(0.7, 1.25),
        gravity: -0.8,
        drag: 1.8,
        spin: new THREE.Vector3(randomRange(-2, 2), randomRange(-2, 2), 0),
      });
    }
  }

  feathers(position, colors, count = 8, options = {}) {
    const palette = colors?.length ? colors : [0xfbf5e7, 0xe8d9bf, 0xdd2f2f];
    for (let i = 0; i < count; i += 1) {
      const angle = randomRange(0, Math.PI * 2);
      const speed = options.speed ?? 2.8;
      this.spawn({
        position: position.clone().add(
          new THREE.Vector3(randomRange(-0.3, 0.3), randomRange(-0.1, 0.35), randomRange(-0.3, 0.3)),
        ),
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed * randomRange(0.4, 1.2),
          randomRange(1.6, 4.2),
          Math.sin(angle) * speed * randomRange(0.4, 1.2),
        ),
        size: randomRange(0.08, 0.16),
        aspect: { x: randomRange(0.35, 0.7), y: randomRange(1.2, 2.4), z: 0.18 },
        color: pick(palette),
        life: randomRange(1.1, 2.1),
        gravity: 2.3,
        drag: 0.6,
        flutter: randomRange(1.2, 2.8),
        spin: new THREE.Vector3(
          randomRange(-5, 5),
          randomRange(-5, 5),
          randomRange(-5, 5),
        ),
      });
    }
  }

  spark(position, count = 10, options = {}) {
    const colors = options.colors ?? [0xfff2a6, 0xffc72c, 0xff8a1e, 0xffffff];
    for (let i = 0; i < count; i += 1) {
      const angle = randomRange(0, Math.PI * 2);
      const speed = options.speed ?? 7;
      this.spawn({
        position: position.clone(),
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed * randomRange(0.35, 1.2),
          randomRange(1, 6),
          Math.sin(angle) * speed * randomRange(0.35, 1.2),
        ),
        size: randomRange(0.05, 0.12),
        aspect: { x: randomRange(0.5, 1.1), y: randomRange(0.5, 1.1), z: randomRange(0.5, 1.1) },
        color: pick(colors),
        life: randomRange(0.3, 0.65),
        gravity: 14,
        drag: 0.4,
        spin: new THREE.Vector3(randomRange(-12, 12), randomRange(-12, 12), randomRange(-12, 12)),
      });
    }
  }

  confetti(center, count = 90) {
    for (let i = 0; i < count; i += 1) {
      const angle = randomRange(0, Math.PI * 2);
      const radius = randomRange(0, 4.5);
      this.spawn({
        position: new THREE.Vector3(
          center.x + Math.cos(angle) * radius,
          center.y + randomRange(1.5, 7),
          center.z + Math.sin(angle) * radius,
        ),
        velocity: new THREE.Vector3(
          randomRange(-1.3, 1.3),
          randomRange(-1.2, 1.4),
          randomRange(-1.3, 1.3),
        ),
        size: randomRange(0.07, 0.15),
        aspect: { x: randomRange(0.8, 1.4), y: randomRange(0.35, 0.7), z: 0.28 },
        color: pick(PARTICLE_COLORS),
        life: randomRange(2.6, 4.6),
        gravity: 1.8,
        drag: 0.45,
        flutter: randomRange(1.1, 3),
        spin: new THREE.Vector3(
          randomRange(-6, 6),
          randomRange(-6, 6),
          randomRange(-6, 6),
        ),
      });
    }
  }

  corn(position, count = 10, options = {}) {
    const colors = options.colors ?? [0xffd23f, 0xffb703, 0xf4a261, 0xfff3b0];
    const speed = options.speed ?? 1.8;
    for (let i = 0; i < count; i += 1) {
      const angle = randomRange(0, Math.PI * 2);
      const horizSpeed = speed * randomRange(0.35, 1.15);
      const velocity = new THREE.Vector3(
        Math.cos(angle) * horizSpeed,
        options.upward ?? randomRange(2.6, 4.9),
        Math.sin(angle) * horizSpeed,
      );
      this.spawn({
        position: position.clone().add(
          new THREE.Vector3(
            randomRange(-0.15, 0.15),
            randomRange(0.02, 0.12),
            randomRange(-0.15, 0.15),
          ),
        ),
        velocity,
        size: options.size ?? randomRange(0.06, 0.12),
        aspect: {
          x: randomRange(0.8, 1.2),
          y: randomRange(0.9, 1.35),
          z: randomRange(0.8, 1.2),
        },
        color: pick(colors),
        life: (options.life ?? randomRange(1.0, 1.8)),
        gravity: options.gravity ?? 11,
        drag: options.drag ?? 0.5,
        bounce: options.bounce ?? 0.42,
        spin: new THREE.Vector3(
          randomRange(-10, 10),
          randomRange(-10, 10),
          randomRange(-10, 10),
        ),
      });
    }
  }

  shockwave(position, count = 18, options = {}) {
    const color = options.color ?? 0xffe29a;
    const speed = options.speed ?? 3.6;
    const radius = options.radius ?? 0.12;
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2 + randomRange(-0.08, 0.08);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const pSpeed = speed * randomRange(0.85, 1.15);
      this.spawn({
        position: new THREE.Vector3(
          position.x + cos * radius,
          position.y + 0.08,
          position.z + sin * radius,
        ),
        velocity: new THREE.Vector3(
          cos * pSpeed,
          options.upward ?? randomRange(0.2, 0.7),
          sin * pSpeed,
        ),
        size: options.size ?? randomRange(0.09, 0.16),
        aspect: {
          x: randomRange(0.9, 1.3),
          y: randomRange(0.4, 0.75),
          z: randomRange(0.9, 1.3),
        },
        color,
        life: (options.life ?? 0.45) * randomRange(0.85, 1.15),
        gravity: options.gravity ?? 1.5,
        drag: options.drag ?? 2.6,
        spin: new THREE.Vector3(
          randomRange(-4, 4),
          randomRange(-4, 4),
          randomRange(-4, 4),
        ),
      });
    }
  }

  gloveTrail(position, color = 0xffc72c, count = 3) {
    for (let i = 0; i < count; i += 1) {
      this.spawn({
        position: position.clone().add(
          new THREE.Vector3(
            randomRange(-0.06, 0.06),
            randomRange(-0.06, 0.06),
            randomRange(-0.06, 0.06),
          ),
        ),
        velocity: new THREE.Vector3(
          randomRange(-0.25, 0.25),
          randomRange(-0.15, 0.25),
          randomRange(-0.25, 0.25),
        ),
        size: randomRange(0.08, 0.15),
        aspect: {
          x: randomRange(0.8, 1.4),
          y: randomRange(0.8, 1.4),
          z: randomRange(0.8, 1.4),
        },
        color,
        life: randomRange(0.14, 0.26),
        gravity: 0,
        drag: 0.8,
        spin: new THREE.Vector3(
          randomRange(-6, 6),
          randomRange(-6, 6),
          randomRange(-6, 6),
        ),
      });
    }
  }

  sweat(position, count = 5) {
    const sweatColors = [0x90e0ef, 0xcaf0f8, 0xffffff];
    for (let i = 0; i < count; i += 1) {
      const angle = randomRange(0, Math.PI * 2);
      const speed = randomRange(1.2, 2.8);
      this.spawn({
        position: position.clone().add(
          new THREE.Vector3(
            randomRange(-0.12, 0.12),
            randomRange(0.1, 0.35),
            randomRange(-0.12, 0.12),
          ),
        ),
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          randomRange(1.8, 3.8),
          Math.sin(angle) * speed,
        ),
        size: randomRange(0.05, 0.09),
        aspect: { x: 0.65, y: 1.25, z: 0.65 },
        color: pick(sweatColors),
        life: randomRange(0.35, 0.65),
        gravity: 7,
        drag: 0.8,
        spin: new THREE.Vector3(
          randomRange(-5, 5),
          randomRange(-5, 5),
          randomRange(-5, 5),
        ),
      });
    }
  }

  update(dt) {
    for (let i = 0; i < MAX_PARTICLES; i += 1) {
      const p = this.particles[i];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        _dummy.position.set(0, -100, 0);
        _dummy.scale.set(0, 0, 0);
        _dummy.updateMatrix();
        this.mesh.setMatrixAt(i, _dummy.matrix);
        continue;
      }

      p.velocity.y -= p.gravity * dt;
      p.velocity.multiplyScalar(Math.exp(-p.drag * dt));
      if (p.flutter) {
        p.velocity.x += Math.sin(p.life * 7 + i) * p.flutter * dt * 0.6;
        p.velocity.z += Math.cos(p.life * 6 + i) * p.flutter * dt * 0.6;
      }
      p.position.addScaledVector(p.velocity, dt);
      if (p.position.y < 0.035) {
        p.position.y = 0.035;
        if (p.velocity.y < 0) p.velocity.y *= -(p.bounce ?? 0.18);
        p.velocity.x *= 0.86;
        p.velocity.z *= 0.86;
      }
      p.rotation.x += p.spin.x * dt;
      p.rotation.y += p.spin.y * dt;
      p.rotation.z += p.spin.z * dt;

      const lifeT = clamp(p.life / p.maxLife, 0, 1);
      const scale = p.fade
        ? p.size * (lifeT < 0.35 ? lifeT / 0.35 : Math.min(1, (1 - lifeT) * 9 + 0.25))
        : p.size;

      _dummy.position.copy(p.position);
      _dummy.rotation.copy(p.rotation);
      _dummy.scale.set(
        scale * p.aspect.x,
        scale * p.aspect.y,
        scale * p.aspect.z,
      );
      _dummy.updateMatrix();
      this.mesh.setMatrixAt(i, _dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.mesh.removeFromParent();
    this.geometry.dispose();
    this.material.dispose();
  }
}
