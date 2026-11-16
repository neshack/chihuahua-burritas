import * as THREE from 'three';
import { createChicken } from '../characters/chicken.js';
import { createChihuahua } from '../characters/chihuahua.js';
import { getChickenSkin, getDogSkin } from '../world/skins.js';
import { disposeObject } from '../world/voxel.js';
import {
  clamp,
  damp,
  dampAngle,
  randomRange,
  wrapAngle,
} from '../core/utils.js';

const ARENA_LIMIT = 9.28;
const GRAVITY = 23;
const MAX_SPEED = 9.2;
const CORN_BOOST_SPEED = 11.4;
const PUNCH_COOLDOWN = 1.5;
const PUNCH_DURATION = 0.46;

export class Dupla {
  constructor({
    game,
    scene,
    chickenSkin = 'clasica',
    dogSkin = 'clasico',
    label = 'JUGADOR',
    accent = '#2a9d8f',
    isAI = false,
  }) {
    this.game = game;
    this.scene = scene;
    this.label = label;
    this.accent = accent;
    this.isAI = isAI;
    this.chickenSkinId = chickenSkin;
    this.dogSkinId = dogSkin;

    this.group = new THREE.Group();
    this.group.name = 'dupla';
    scene.add(this.group);

    this.position = new THREE.Vector3();
    this.spawn = new THREE.Vector3(-4, 0, 0);
    this.velocity = new THREE.Vector3();
    this.forward = new THREE.Vector3(0, 0, 1);
    this.right = new THREE.Vector3(1, 0, 0);
    this.heading = 0;
    this.vertical = 0;
    this.vy = 0;
    this.airborne = false;

    this.balance = 100;
    this.alive = true;
    this.out = false;
    this.hitstun = 0;
    this.vulnerable = 0;
    this.vulnerableTimer = 0;
    this.sinceDamage = 10;
    this.regenBoost = 0;
    this.cooldown = 0;
    this.punchTime = -1;
    this.punchExt = 0;
    this.punchHit = false;
    this.punchDir = new THREE.Vector3(0, 0, 1);
    this.punchLungeApplied = false;
    this.missPenaltyApplied = false;
    this.hitReaction = 0;
    this.hitSide = 0;
    this.hitBack = 0;
    this.wobblePhase = Math.random() * 10;
    this.stride = Math.random() * 10;
    this.animTime = Math.random() * 10;
    this.flapTimer = 0;
    this.dustTimer = 0;
    this.hopCooldown = 0;
    this.fenceCooldown = 0;
    this.justLanded = 0;
    this.landingSpeed = 0;
    this.intent = { x: 0, z: 0, hop: false, punch: false, hopHeld: false };

    // Choreography & Rodeo physics state
    this.poseMode = 'mounted'; // 'pecking' | 'perched' | 'leaping' | 'mounted'
    this.perchPosition = new THREE.Vector3(-8.6, 1.65, 0.85);
    this.presenting = false;
    this.leapProgress = 0;
    this.leapStartPos = new THREE.Vector3();
    this.mountShockTimer = 0;
    this.cornBoostTimer = 0;
    this.buckTimer = 0;
    this.buckCooldown = randomRange(3.8, 6.2);
    this.braking = false;
    this.drifting = false;
    this.skidTimer = 0;
    this.hayCooldown = 0;
    this.peckSoundTimer = 0;
    this.peckCycleTimer = randomRange(0.6, 1.4);
    this.isPecking = true;
    this.homeSpot = new THREE.Vector3();
    this.wanderTarget = new THREE.Vector3();

    this.scared = false;
    this.scaredDir = new THREE.Vector3();
    this.scaredTimer = 0;
    this.squawkTimer = 0;
    this.ragdoll = null;
    this.dogPivot = null;
    this.dog = null;
    this.chicken = null;

    this.gloveWorld = new THREE.Vector3();
    this.bodyPosition = new THREE.Vector3();
    this.riderPosition = new THREE.Vector3();
    this.tempVector = new THREE.Vector3();

    this.buildModels();
  }

  buildModels() {
    if (this.chicken) {
      this.group.remove(this.chicken);
      disposeObject(this.chicken);
    }
    if (this.dogPivot) {
      if (this.dogPivot.parent) this.dogPivot.parent.remove(this.dogPivot);
      disposeObject(this.dogPivot);
    }

    this.chicken = createChicken(this.chickenSkinId);
    this.group.add(this.chicken);
    const parts = this.chicken.userData.parts;

    this.dog = createChihuahua(this.dogSkinId);
    this.dogPivot = new THREE.Group();
    this.dogPivot.position.set(0, parts.saddleY, parts.saddleZ);
    this.dogPivot.add(this.dog);
    parts.tilt.add(this.dogPivot);

    this.chickenParts = parts;
    this.dogParts = this.dog.userData.parts;
    this.dogParts.pupils.visible = true;
    this.dogParts.xEyes.visible = false;
    this.chickenSkin = getChickenSkin(this.chickenSkinId);
    this.dogSkin = getDogSkin(this.dogSkinId);
    this.dogPivotBaseY = parts.saddleY;
  }

  setSkins(chickenSkin, dogSkin) {
    if (this.chickenSkinId === chickenSkin && this.dogSkinId === dogSkin) return;
    this.chickenSkinId = chickenSkin;
    this.dogSkinId = dogSkin;
    this.buildModels();
    this.resetPose();
    this.applyTransform();
    this.animate(0, null);
  }

  setLabel(label) {
    this.label = label;
  }

  reset({ position = null, heading = 0, balance = 100 } = {}) {
    if (position) this.spawn.copy(position);
    this.position.copy(this.spawn);
    this.velocity.set(0, 0, 0);
    this.heading = heading;
    this.forward.set(Math.sin(heading), 0, Math.cos(heading));
    this.right.set(Math.cos(heading), 0, -Math.sin(heading));
    this.vertical = 0;
    this.vy = 0;
    this.airborne = false;
    this.balance = balance;
    this.alive = true;
    this.out = false;
    this.hitstun = 0;
    this.vulnerable = 0;
    this.sinceDamage = 10;
    this.cooldown = 0;
    this.punchTime = -1;
    this.punchExt = 0;
    this.punchHit = false;
    this.hitReaction = 0;
    this.hitSide = 0;
    this.flapTimer = 0;
    this.dustTimer = 0;
    this.hopCooldown = 0;
    this.fenceCooldown = 0;
    this.justLanded = 0;
    this.scared = false;
    this.ragdoll = null;
    this.regenBoost = 0;
    this.intent = { x: 0, z: 0, hop: false, punch: false, hopHeld: false };
    this.group.visible = true;

    this.poseMode = 'mounted';
    this.presenting = false;
    this.leapProgress = 0;
    this.mountShockTimer = 0;
    this.cornBoostTimer = 0;
    this.buckTimer = 0;
    this.buckCooldown = randomRange(3.8, 6.2);
    this.braking = false;
    this.drifting = false;
    this.skidTimer = 0;
    this.hayCooldown = 0;
    this.peckSoundTimer = 0;
    this.peckCycleTimer = randomRange(0.6, 1.4);
    this.isPecking = true;
    this.homeSpot.copy(this.position);
    this.wanderTarget.copy(this.position);

    // Put the rider back in the saddle.
    if (this.dogPivot.parent !== this.chickenParts.tilt) {
      this.chickenParts.tilt.add(this.dogPivot);
    }
    this.dogPivot.position.set(0, this.dogPivotBaseY, this.chickenParts.saddleZ);
    this.dogPivot.rotation.set(0, 0, 0);
    this.dogParts.pupils.visible = true;
    this.dogParts.xEyes.visible = false;
    if (this.dogParts.dizzyStars) this.dogParts.dizzyStars.visible = false;
    if (this.chickenParts.surpriseEyes) this.chickenParts.surpriseEyes.visible = false;
    this.resetPose();
    this.applyTransform();
  }

  setChoreographyMode(mode, options = {}) {
    this.poseMode = mode;
    if (options.perchPosition) {
      this.perchPosition.copy(options.perchPosition);
    }
    if (options.position) {
      this.position.copy(options.position);
      this.homeSpot.copy(options.position);
      this.wanderTarget.copy(options.position);
    }
    if (options.presenting !== undefined) {
      this.presenting = options.presenting;
    }

    if (mode === 'pecking' || mode === 'perched') {
      if (this.dogPivot.parent !== this.scene) {
        this.scene.attach(this.dogPivot);
      }
      this.dogPivot.position.copy(this.perchPosition);
      const lookAngle = Math.atan2(-this.perchPosition.x, -this.perchPosition.z);
      this.dogPivot.rotation.set(0, lookAngle, 0);
      this.velocity.set(0, 0, 0);
      this.airborne = false;
      this.vertical = 0;
      this.vy = 0;
      this.resetPose();
      this.applyTransform();
    } else if (mode === 'leaping') {
      this.leapProgress = options.leapProgress ?? 0;
      if (options.startPos) {
        this.leapStartPos.copy(options.startPos);
      } else {
        this.leapStartPos.copy(this.perchPosition);
      }
      if (this.dogPivot.parent !== this.scene) {
        this.scene.attach(this.dogPivot);
      }
      const saddleWorldX = this.position.x + Math.sin(this.heading) * this.chickenParts.saddleZ;
      const saddleWorldY = this.vertical + this.dogPivotBaseY;
      const saddleWorldZ = this.position.z + Math.cos(this.heading) * this.chickenParts.saddleZ;

      const p = clamp(this.leapProgress, 0, 1);
      const start = this.leapStartPos;
      this.dogPivot.position.x = THREE.MathUtils.lerp(start.x, saddleWorldX, p);
      this.dogPivot.position.z = THREE.MathUtils.lerp(start.z, saddleWorldZ, p);
      const arc = 3.2 * Math.sin(p * Math.PI);
      this.dogPivot.position.y = THREE.MathUtils.lerp(start.y, saddleWorldY, p) + arc;
      this.dogPivot.rotation.x = p * Math.PI * 2;
      const dx = saddleWorldX - start.x;
      const dz = saddleWorldZ - start.z;
      this.dogPivot.rotation.y = Math.atan2(dx, dz);
      this.dogPivot.rotation.z = 0;
    } else if (mode === 'mounted') {
      if (this.dogPivot.parent !== this.chickenParts.tilt) {
        this.chickenParts.tilt.add(this.dogPivot);
      }
      this.dogPivot.position.set(0, this.dogPivotBaseY, this.chickenParts.saddleZ);
      this.dogPivot.rotation.set(0, 0, 0);
      this.presenting = false;
      this.mountShockTimer = 0.9;
      if (this.chickenParts?.surpriseEyes) {
        this.chickenParts.surpriseEyes.visible = true;
      }
      this.resetPose();
      this.applyTransform();
    }
  }

  updateChoreography(dt) {
    this.animTime += dt;
    const parts = this.chickenParts;
    const dogParts = this.dogParts;
    const t = this.animTime;

    if (this.poseMode === 'pecking' || this.poseMode === 'perched') {
      this.peckCycleTimer -= dt;
      if (this.peckCycleTimer <= 0) {
        this.isPecking = !this.isPecking;
        this.peckCycleTimer = this.isPecking ? randomRange(0.6, 1.4) : randomRange(0.8, 1.8);
        if (!this.isPecking) {
          const ang = Math.random() * Math.PI * 2;
          const rad = Math.random() * 2.2;
          this.wanderTarget.set(
            this.homeSpot.x + Math.cos(ang) * rad,
            0,
            this.homeSpot.z + Math.sin(ang) * rad,
          );
        }
      }

      if (!this.isPecking) {
        const wdx = this.wanderTarget.x - this.position.x;
        const wdz = this.wanderTarget.z - this.position.z;
        const wDist = Math.hypot(wdx, wdz);
        if (wDist > 0.15) {
          const targetHeading = Math.atan2(wdx, wdz);
          this.heading = dampAngle(this.heading, targetHeading, 6, dt);
          const speed = 1.1;
          this.position.x += Math.sin(this.heading) * speed * dt;
          this.position.z += Math.cos(this.heading) * speed * dt;
          this.stride += dt * 8;
        }
        parts.legs[0].rotation.x = Math.sin(this.stride) * 0.45;
        parts.legs[1].rotation.x = -Math.sin(this.stride) * 0.45;
        parts.tilt.position.y = Math.abs(Math.sin(this.stride)) * 0.03;
        parts.head.rotation.x = damp(parts.head.rotation.x, 0, 8, dt);
        if (parts.neck) parts.neck.rotation.x = damp(parts.neck.rotation.x, 0, 8, dt);
        if (parts.beakLower) parts.beakLower.rotation.x = 0;
      } else {
        parts.legs[0].rotation.x = damp(parts.legs[0].rotation.x, 0, 8, dt);
        parts.legs[1].rotation.x = damp(parts.legs[1].rotation.x, 0, 8, dt);
        const peckWave = Math.sin(t * 28);
        const pitch = clamp(peckWave, -0.2, 1);
        if (parts.neck) {
          parts.neck.rotation.x = 0.35 + pitch * 0.45;
        }
        parts.head.rotation.x = 0.2 + pitch * 0.65;
        parts.tilt.rotation.x = -0.06 + pitch * 0.14;
        if (parts.beakLower) {
          parts.beakLower.rotation.x = Math.max(0, -peckWave * 0.35);
        }

        this.peckSoundTimer = Math.max(0, (this.peckSoundTimer || 0) - dt);
        if (peckWave > 0.85 && this.peckSoundTimer <= 0) {
          this.peckSoundTimer = 0.22;
          const pan = this.game?.panFor?.(this) ?? 0;
          this.game?.audio?.play?.('peck', { pan });
          const beakPos = this.tempVector.set(
            this.position.x + Math.sin(this.heading) * 0.85,
            0.08,
            this.position.z + Math.cos(this.heading) * 0.85,
          );
          this.game?.particles?.corn?.(beakPos, 3);
        }
      }

      // Perch dog animation
      if (this.dogPivot.parent !== this.scene) {
        this.scene.attach(this.dogPivot);
      }
      this.dogPivot.position.copy(this.perchPosition);
      const lookAngle = Math.atan2(-this.perchPosition.x, -this.perchPosition.z);
      this.dogPivot.rotation.set(0, lookAngle, 0);

      if (this.presenting) {
        this.dogPivot.position.y = this.perchPosition.y + Math.abs(Math.sin(t * 6)) * 0.22;
        this.punchExt = 0.85 * Math.abs(Math.sin(t * 6));
        dogParts.leftArm.rotation.x = Math.sin(t * 8) * 0.35 - 0.2;
        dogParts.head.rotation.x = Math.sin(t * 5) * 0.1 - 0.05;
        dogParts.head.rotation.y = Math.sin(t * 3) * 0.15;
      } else {
        this.dogPivot.position.y = this.perchPosition.y + Math.abs(Math.sin(t * 4)) * 0.06;
        this.punchExt = 0;
        dogParts.head.rotation.x = Math.sin(t * 2.5) * 0.05;
        dogParts.head.rotation.y = Math.sin(t * 1.8) * 0.12;
      }
      if (dogParts.tail) {
        dogParts.tail.rotation.y = Math.sin(t * 14) * 0.55;
      }
      const step = 0.055 + this.punchExt * 0.16;
      dogParts.segments.forEach((segment, index) => {
        segment.position.z = 0.05 + index * step;
      });
      dogParts.glove.position.z = 0.05 + 5 * step + 0.22;
    } else if (this.poseMode === 'leaping') {
      if (this.leapProgress < 0.95) {
        const peckWave = Math.sin(t * 28);
        parts.head.rotation.x = 0.2 + Math.max(0, peckWave) * 0.5;
      } else {
        parts.head.rotation.x = damp(parts.head.rotation.x, -0.15, 12, dt);
      }
    }

    this.applyTransform();
  }

  resetPose() {
    this.chickenParts.tilt.position.set(0, 0, 0);
    this.chickenParts.tilt.rotation.set(0, 0, 0);
    this.chickenParts.head.rotation.set(0, 0, 0);
    if (this.chickenParts.neck) this.chickenParts.neck.rotation.set(0, 0, 0);
    if (this.chickenParts.beakLower) this.chickenParts.beakLower.rotation.set(0, 0, 0);
    this.chickenParts.wings[0].rotation.set(0, 0, 0);
    this.chickenParts.wings[1].rotation.set(0, 0, 0);
    this.chickenParts.legs[0].rotation.set(0, 0, 0);
    this.chickenParts.legs[1].rotation.set(0, 0, 0);
    this.dogPivot.rotation.set(0, 0, 0);
    this.dogParts.head.rotation.set(0, 0, 0);
    this.dogParts.ears[0].rotation.set(0, 0, 0);
    this.dogParts.ears[1].rotation.set(0, 0, 0);
    this.dogParts.body.position.set(0, 0, 0);
    this.dogParts.leftArm.rotation.set(0, 0, 0);
  }

  setIntent(x, z, hop = false, punch = false, hopHeld = false) {
    this.intent.x = x;
    this.intent.z = z;
    if (hop) this.intent.hop = true;
    if (punch) this.intent.punch = true;
    this.intent.hopHeld = !!hopHeld;
  }

  clearIntent() {
    this.intent.x = 0;
    this.intent.z = 0;
    this.intent.hop = false;
    this.intent.punch = false;
    this.intent.hopHeld = false;
  }

  applyCornBoost(heal = 16, duration = 3.5) {
    if (this.game?.settings?.regeneration !== false) this.balance = Math.min(100, this.balance + heal);
    this.cornBoostTimer = duration;
    this.sinceDamage = 0;
  }

  get speed() {
    return Math.hypot(this.velocity.x, this.velocity.z);
  }

  get damageTakenFactor() {
    return this.vulnerable > 0 ? 1.25 : 1;
  }

  get isThreatLow() {
    return this.balance < 25;
  }

  update(dt, { opponent = null, canControl = false } = {}) {
    if (this.poseMode !== 'mounted' && this.alive) {
      this.updateChoreography(dt);
      return;
    }

    this.animTime += dt;
    if (!this.alive) {
      this.updateKnockedOut(dt);
      return;
    }

    this.cooldown = Math.max(0, this.cooldown - dt);
    this.hitstun = Math.max(0, this.hitstun - dt);
    this.vulnerable = Math.max(0, this.vulnerable - dt);
    this.hitReaction = Math.max(0, this.hitReaction - dt);
    this.hopCooldown = Math.max(0, this.hopCooldown - dt);
    this.fenceCooldown = Math.max(0, this.fenceCooldown - dt);
    this.flapTimer = Math.max(0, this.flapTimer - dt);
    this.justLanded = Math.max(0, this.justLanded - dt);
    this.hayCooldown = Math.max(0, this.hayCooldown - dt);
    this.mountShockTimer = Math.max(0, this.mountShockTimer - dt);
    this.cornBoostTimer = Math.max(0, this.cornBoostTimer - dt);
    this.sinceDamage += dt;

    if (canControl && this.hitstun <= 0) {
      this.handleMovement(dt);
      if (this.intent.hop) this.tryHop();
      if (this.intent.punch) this.tryPunch(opponent);
    } else if (this.buckTimer > 0) {
      this.buckTimer = Math.max(0, this.buckTimer - dt);
      this.flapTimer = Math.max(this.flapTimer, 0.25);
      const weave = Math.sin(this.animTime * 18) * 2.2 * dt;
      this.heading = wrapAngle(this.heading + weave);
      this.forward.set(Math.sin(this.heading), 0, Math.cos(this.heading));
      this.velocity.x = this.forward.x * 6.8;
      this.velocity.z = this.forward.z * 6.8;
    } else {
      this.drag(dt);
    }
    this.intent.hop = false;
    this.intent.punch = false;

    this.updatePunch(dt);
    this.updateVertical(dt);
    this.integrate(dt);
    this.resolveFence();
    this.updateBalance(dt);
    this.applyTransform();
    this.updateGloveWorld();
    this.animate(dt, opponent);
    this.updateGroundDust(dt);
  }

  updateGroundDust(dt) {
    if (!this.alive || this.airborne || this.speed < 3.2) {
      this.dustTimer = 0;
      return;
    }
    this.dustTimer -= dt;
    if (this.dustTimer > 0) return;
    this.dustTimer = randomRange(0.08, 0.14);
    const foot = this.tempVector.set(
      this.position.x - Math.sin(this.heading) * 0.45 + randomRange(-0.18, 0.18),
      0.06,
      this.position.z - Math.cos(this.heading) * 0.45 + randomRange(-0.18, 0.18),
    );
    this.game?.particles?.dust(foot, 1, {
      scale: 0.13,
      speed: 0.8,
      life: 0.45,
      color: 0xd8b88a,
    });
  }

  handleMovement(dt) {
    const minForwardSpeed = 3.4;
    const maxSpeed = this.cornBoostTimer > 0 ? CORN_BOOST_SPEED : MAX_SPEED;

    let ix = this.intent.x;
    let iz = this.intent.z;
    const magnitude = Math.hypot(ix, iz);
    if (magnitude > 1) {
      ix /= magnitude;
      iz /= magnitude;
    }
    const hasInput = magnitude > 0.14;

    this.buckCooldown -= dt;
    if (this.buckCooldown <= 0 && this.buckTimer <= 0) {
      this.buckTimer = 0.75;
      this.buckCooldown = randomRange(3.8, 6.2);
      this.game?.onChickenBuck?.(this);
    }
    if (this.buckTimer > 0) {
      this.buckTimer -= dt;
    }

    this.braking = false;
    if (this.intent.hopHeld) {
      if (this.airborne) {
        // Gliding in updateVertical and air steering
      } else if (this.punchTime < 0) {
        this.braking = true;
        this.buckTimer = 0;
      }
    }

    let targetHeading = this.heading;
    if (hasInput) {
      targetHeading = Math.atan2(ix, iz);
    }

    if (this.buckTimer > 0) {
      const weave = Math.sin(this.animTime * 16) * 0.45;
      targetHeading = wrapAngle(targetHeading + weave);
    }

    const angleDiff = wrapAngle(targetHeading - this.heading);
    let turnRate = this.braking ? 18 : 8.5;
    if (this.airborne) {
      turnRate = this.intent.hopHeld ? 10 : 4.5;
    }

    if (this.punchTime < 0) {
      this.heading = dampAngle(this.heading, targetHeading, turnRate, dt);
    }

    this.forward.set(Math.sin(this.heading), 0, Math.cos(this.heading));
    this.right.set(Math.cos(this.heading), 0, -Math.sin(this.heading));

    let targetSpeed = 0;
    if (this.braking) {
      targetSpeed = 2.2;
    } else {
      targetSpeed = hasInput ? magnitude * maxSpeed : minForwardSpeed;
      if (this.buckTimer > 0) {
        targetSpeed += 2.8;
      }
    }
    if (this.punchTime >= 0) {
      targetSpeed *= 0.34;
    }

    this.drifting = !this.airborne && !this.braking && Math.abs(angleDiff) > 0.55 && this.speed > 4.5;
    if (this.drifting) {
      this.game?.arena?.addSkidMark?.(this.position.x, this.position.z, this.heading);
      this.skidTimer = Math.max(0, this.skidTimer - dt);
      if (this.skidTimer <= 0) {
        this.skidTimer = 0.22;
        this.game?.audio?.play?.('skid', { pan: this.game?.panFor?.(this) ?? 0 });
      }
      if (Math.random() < dt * 14) {
        this.game?.particles?.dust(
          this.position.clone().add(new THREE.Vector3(randomRange(-0.3, 0.3), 0.05, randomRange(-0.3, 0.3))),
          2,
          { scale: 0.16, color: 0xd8b88a, speed: 1.4 },
        );
      }
    } else if (this.braking && this.speed > 2.8) {
      this.game?.arena?.addSkidMark?.(this.position.x, this.position.z, this.heading);
      this.skidTimer = Math.max(0, this.skidTimer - dt);
      if (this.skidTimer <= 0) {
        this.skidTimer = 0.22;
        this.game?.audio?.play?.('skid', { pan: this.game?.panFor?.(this) ?? 0 });
      }
    }

    const lateralControl = this.airborne
      ? (this.intent.hopHeld ? 5.5 : 2.2)
      : (this.drifting ? 3.8 : 7.2);

    const targetVx = this.forward.x * targetSpeed;
    const targetVz = this.forward.z * targetSpeed;

    this.velocity.x = damp(this.velocity.x, targetVx, lateralControl, dt);
    this.velocity.z = damp(this.velocity.z, targetVz, lateralControl, dt);

    if (this.balance < 28) {
      const wobble = (1 - this.balance / 28) * 0.9;
      this.velocity.x += Math.sin(this.animTime * 6.1) * wobble * dt * 4;
      this.velocity.z += Math.cos(this.animTime * 5.2) * wobble * dt * 4;
    }

    this.flapTimer = Math.max(this.flapTimer, this.drifting || this.braking ? 0.3 : 0.12);
  }

  drag(dt) {
    const decay = this.airborne ? 0.35 : 2.6;
    const factor = Math.exp(-decay * dt);
    this.velocity.x *= factor;
    this.velocity.z *= factor;
    if (this.punchTime >= 0) {
      this.velocity.multiplyScalar(1 + dt * 0.18);
    }
  }

  tryHop() {
    if (this.airborne || this.hopCooldown > 0) return;
    this.vy = 7.1;
    this.airborne = true;
    this.vertical = Math.max(this.vertical, 0.01);
    this.hopCooldown = 0.42;
    this.flapTimer = 0.55;
    const headingForward = this.tempVector.set(
      Math.sin(this.heading),
      0,
      Math.cos(this.heading),
    );
    this.velocity.addScaledVector(headingForward, 1.7);
    this.game?.onHop?.(this);
  }

  tryPunch(opponent) {
    if (this.cooldown > 0 || this.hitstun > 0 || !this.alive) return;
    if (this.punchTime >= 0) return;

    if (opponent && opponent.alive) {
      const dx = opponent.position.x - this.position.x;
      const dz = opponent.position.z - this.position.z;
      const distance = Math.hypot(dx, dz);
      const desired = Math.atan2(dx, dz);
      const delta = Math.abs(wrapAngle(desired - this.heading));
      // Subtle nudge only if already aimed within ~20 degrees and nearby
      if (distance < 3.2 && delta < 0.35) {
        this.heading = dampAngle(this.heading, desired, 5, 0.08);
      }
    }

    this.forward.set(Math.sin(this.heading), 0, Math.cos(this.heading));
    this.punchDir.copy(this.forward);
    this.punchTime = 0;
    this.punchExt = 0;
    this.punchHit = false;
    this.punchLungeApplied = false;
    this.missPenaltyApplied = false;
    this.cooldown = PUNCH_COOLDOWN;
    this.flapTimer = 0.42;
    this.velocity.addScaledVector(this.forward, 2.6);
    this.game?.onPunchStart?.(this);
  }

  updatePunch(dt) {
    if (this.punchTime < 0) {
      this.punchExt = Math.max(0, this.punchExt - dt * 10);
      return;
    }

    this.punchTime += dt;
    const t = this.punchTime;
    if (t < 0.11) {
      this.punchExt = (t / 0.11) ** 0.55;
    } else if (t < 0.27) {
      this.punchExt = 1;
    } else if (t < PUNCH_DURATION) {
      this.punchExt = 1 - (t - 0.27) / (PUNCH_DURATION - 0.27);
    } else {
      this.punchExt = 0;
      if (!this.punchHit && !this.missPenaltyApplied) {
        this.missPenaltyApplied = true;
        this.balance = Math.max(0, this.balance - 2);
        this.vulnerable = 0.6;
        this.vulnerableTimer = 0.6;
        this.sinceDamage = 0;
        this.game?.onPunchMiss?.(this);
      }
      this.punchTime = -1;
    }
  }

  onPunchLanded() {
    this.punchHit = true;
    this.missPenaltyApplied = true;
    this.punchTime = Math.max(this.punchTime, 0.28);
  }

  updateVertical(dt) {
    if (this.airborne) {
      const effGravity = this.intent.hopHeld ? GRAVITY * 0.48 : GRAVITY;
      this.vy -= effGravity * dt;
      this.vertical += this.vy * dt;
      if (this.vertical <= 0) {
        const impact = Math.abs(this.vy);
        this.vertical = 0;
        this.vy = 0;
        this.airborne = false;
        this.landingSpeed = impact;
        this.justLanded = 0.06;
        this.game?.onLand?.(this, impact);
      }
    }
  }

  integrate(dt) {
    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;

    const distance = Math.hypot(this.position.x, this.position.z);
    if (distance > ARENA_LIMIT) {
      const nx = this.position.x / distance;
      const nz = this.position.z / distance;
      this.position.x = nx * ARENA_LIMIT;
      this.position.z = nz * ARENA_LIMIT;
      const outward = this.velocity.x * nx + this.velocity.z * nz;
      if (outward > 0) {
        this.velocity.x -= nx * outward * 1.62;
        this.velocity.z -= nz * outward * 1.62;
        this.velocity.x *= 0.92;
        this.velocity.z *= 0.92;
        if (outward > 3.4 && this.fenceCooldown <= 0) {
          this.fenceCooldown = 0.4;
          this.buckTimer = 0.75;
          this.buckCooldown = randomRange(3.8, 6.2);
          const damage = 0.5 + outward * 0.35;
          this.balance = Math.max(0, this.balance - damage);
          this.sinceDamage = 0;
          this.hitReaction = 0.35;
          this.game?.onFenceHit?.(this, outward, damage);
        }
      }
    }
  }

  resolveFence() {
    const distance = Math.hypot(this.position.x, this.position.z);
    if (distance <= ARENA_LIMIT) return;
    const nx = this.position.x / distance;
    const nz = this.position.z / distance;
    this.position.x = nx * ARENA_LIMIT;
    this.position.z = nz * ARENA_LIMIT;
    const outward = this.velocity.x * nx + this.velocity.z * nz;
    if (outward > 0) {
      this.velocity.x -= nx * outward * 1.6;
      this.velocity.z -= nz * outward * 1.6;
    }
  }

  updateBalance(dt) {
    if (this.game?.settings?.regeneration !== false && this.sinceDamage > 1.8 && this.balance < 100) {
      const rate = 4.8 + this.regenBoost + (this.balance < 40 ? 2.2 : 0);
      this.balance = Math.min(100, this.balance + rate * dt);
    }
    if (this.vulnerable > 0) this.vulnerableTimer -= dt;
  }

  applyTransform() {
    this.group.position.set(this.position.x, this.vertical, this.position.z);
    this.group.rotation.y = this.heading;
    this.forward.set(Math.sin(this.heading), 0, Math.cos(this.heading));
    this.right.set(Math.cos(this.heading), 0, -Math.sin(this.heading));
    this.bodyPosition.set(this.position.x, this.vertical + 1.1, this.position.z);
    this.riderPosition.set(this.position.x, this.vertical + 2.25, this.position.z);
  }

  updateGloveWorld() {
    if (!this.dogParts?.glove) return;
    this.dogParts.glove.getWorldPosition(this.gloveWorld);
    this.gloveWorld.y += 0.05;
    this.gloveWorld.addScaledVector(this.forward, 0.18);
  }

  getGloveSphere() {
    return {
      center: this.gloveWorld,
      radius: 0.52,
    };
  }

  isPunchActive() {
    return this.punchTime >= 0.09 && this.punchTime <= 0.26 && !this.punchHit;
  }

  takeHit(damage, direction, force = 4, options = {}) {
    if (!this.alive) return 0;
    const wasVulnerable = this.vulnerable > 0;
    const finalDamage = damage * this.damageTakenFactor;
    this.balance = Math.max(0, this.balance - finalDamage);
    this.sinceDamage = 0;
    this.hitstun = Math.max(this.hitstun, options.hitstun ?? 0.26);
    this.hitReaction = 0.45;
    const factor = (wasVulnerable ? 1.25 : 1) * (options.knockbackScale ?? 1);
    this.velocity.addScaledVector(direction, force * factor);
    if (force > 4.5 && !this.airborne) {
      this.vy = Math.max(this.vy, Math.min(4.8, force * 0.4));
      this.airborne = true;
      this.vertical = Math.max(this.vertical, 0.01);
    }
    const localSide =
      direction.x * Math.cos(this.heading) - direction.z * Math.sin(this.heading);
    const localBack =
      -(direction.x * Math.sin(this.heading) + direction.z * Math.cos(this.heading));
    this.hitSide = clamp(localSide, -1, 1);
    this.hitBack = clamp(localBack, -1, 1);
    this.flapTimer = 0.4;
    this.punchTime = -1;
    this.punchExt = 0;
    return finalDamage;
  }

  getImpactZone(attackerPosition) {
    const dx = attackerPosition.x - this.position.x;
    const dz = attackerPosition.z - this.position.z;
    const forwardDot = (dx * Math.sin(this.heading) + dz * Math.cos(this.heading)) /
      (Math.hypot(dx, dz) || 1);
    if (forwardDot > 0.35) return 'front';
    if (forwardDot < -0.25) return 'back';
    return 'side';
  }

  knockout(direction, chickenRunDirection = null) {
    if (this.out) return;
    this.alive = false;
    this.out = true;
    this.balance = 0;
    this.punchTime = -1;
    this.punchExt = 0;
    this.hitstun = 0;
    this.velocity.set(0, 0, 0);
    this.vertical = 0;
    this.vy = 0;
    this.airborne = false;
    this.intent = { x: 0, z: 0, hop: false, punch: false, hopHeld: false };
    this.dogParts.pupils.visible = false;
    this.dogParts.xEyes.visible = true;
    this.dogParts.head.rotation.z = 0.16;
    if (this.dogParts.dizzyStars) this.dogParts.dizzyStars.visible = false;

    this.scene.attach(this.dogPivot);
    const flyingDirection = direction.clone().normalize();
    this.ragdoll = {
      velocity: new THREE.Vector3(
        flyingDirection.x * 5.4 + randomRange(-0.9, 0.9),
        8.9,
        flyingDirection.z * 5.4 + randomRange(-0.9, 0.9),
      ),
      spin: new THREE.Vector3(
        randomRange(-7, 7),
        randomRange(-5, 5),
        randomRange(-8, 8),
      ),
      resting: false,
      restTimer: 0,
    };
    this.dogPivot.rotation.x = 0;
    this.dogPivot.rotation.z = 0.25;

    this.scared = true;
    this.scaredTimer = 0;
    this.squawkTimer = 0.25;
    const run = chickenRunDirection
      ? chickenRunDirection.clone()
      : new THREE.Vector3(randomRange(-1, 1), 0, randomRange(-1, 1));
    if (run.lengthSq() < 0.01) run.set(1, 0, 0);
    run.normalize();
    this.scaredDir.copy(run);
    this.velocity.copy(run).multiplyScalar(4.8);
  }

  updateKnockedOut(dt) {
    this.animTime += dt;
    this.flapTimer = Math.max(0, this.flapTimer - dt);
    const parts = this.chickenParts;
    const dogParts = this.dogParts;
    this.scaredTimer -= dt;
    this.squawkTimer -= dt;

    if (this.scared) {
      if (this.scaredTimer <= 0) {
        this.scaredTimer = randomRange(0.7, 1.6);
        const angle = Math.atan2(this.scaredDir.x, this.scaredDir.z) + randomRange(-1.6, 1.6);
        this.scaredDir.set(Math.sin(angle), 0, Math.cos(angle));
        if (Math.hypot(this.position.x, this.position.z) > ARENA_LIMIT - 1.4) {
          this.scaredDir.set(-this.position.x, 0, -this.position.z).normalize();
        }
      }
      this.velocity.x = damp(this.velocity.x, this.scaredDir.x * 4.6, 3, dt);
      this.velocity.z = damp(this.velocity.z, this.scaredDir.z * 4.6, 3, dt);
      this.heading = dampAngle(this.heading, Math.atan2(this.velocity.x, this.velocity.z), 8, dt);
      this.position.x += this.velocity.x * dt;
      this.position.z += this.velocity.z * dt;
      this.resolveFence();

      if (this.squawkTimer <= 0) {
        this.squawkTimer = randomRange(1.4, 2.6);
        this.game?.onScaredSquawk?.(this);
      }

      if (Math.random() < dt * 8) {
        this.game?.particles?.dust(
          new THREE.Vector3(
            this.position.x + randomRange(-0.4, 0.4),
            this.vertical + 0.1,
            this.position.z + randomRange(-0.4, 0.4),
          ),
          1,
          { scale: 0.16, color: 0xd8b88a, speed: 0.6, life: 0.5 },
        );
      }
    }

    this.group.position.set(this.position.x, 0, this.position.z);
    this.group.rotation.y = this.heading;

    this.stride += dt * 16;
    const swing = Math.sin(this.stride) * 0.85;
    parts.legs[0].rotation.x = swing;
    parts.legs[1].rotation.x = -swing;
    parts.tilt.position.y = Math.abs(Math.sin(this.stride)) * 0.06;
    parts.tilt.rotation.x = -0.08;
    parts.tilt.rotation.z = Math.sin(this.animTime * 3) * 0.05;
    const flap = 0.55 + Math.sin(this.animTime * 20) * 0.7;
    parts.wings[0].rotation.z = -flap;
    parts.wings[1].rotation.z = flap;
    parts.head.rotation.x = Math.sin(this.animTime * 18) * 0.08;
    parts.head.rotation.z = Math.sin(this.animTime * 13) * 0.1;
    parts.tail.rotation.x = Math.sin(this.animTime * 8) * 0.15;

    if (this.ragdoll && !this.ragdoll.resting) {
      const rag = this.ragdoll;
      rag.velocity.y -= 22 * dt;
      this.dogPivot.position.x += rag.velocity.x * dt;
      this.dogPivot.position.y += rag.velocity.y * dt;
      this.dogPivot.position.z += rag.velocity.z * dt;
      this.dogPivot.rotation.x += rag.spin.x * dt;
      this.dogPivot.rotation.y += rag.spin.y * dt;
      this.dogPivot.rotation.z += rag.spin.z * dt;

      if (this.dogPivot.position.y < 0.45) {
        this.dogPivot.position.y = 0.45;
        if (rag.velocity.y < -1.2) {
          this.game?.particles?.dust(this.dogPivot.position.clone(), 5, {
            scale: 0.22,
            color: 0xd8b88a,
            speed: 2.3,
            life: 0.7,
          });
          this.game?.onRagdollBounce?.(this);
          rag.velocity.y *= -0.34;
          rag.velocity.x *= 0.7;
          rag.velocity.z *= 0.7;
          rag.spin.multiplyScalar(0.6);
        } else {
          rag.velocity.set(0, 0, 0);
          rag.spin.multiplyScalar(0.8);
          rag.restTimer += dt;
          if (rag.restTimer > 0.8) {
            rag.resting = true;
            this.dogPivot.rotation.x = Math.PI * 0.42;
            this.dogPivot.rotation.z = 0.5;
          }
        }
      }
      const distance = Math.hypot(this.dogPivot.position.x, this.dogPivot.position.z);
      if (distance > ARENA_LIMIT + 0.6) {
        this.dogPivot.position.x *= (ARENA_LIMIT + 0.6) / distance;
        this.dogPivot.position.z *= (ARENA_LIMIT + 0.6) / distance;
      }
    }

    dogParts.body.position.y = 0;
  }

  animate(dt, opponent) {
    const parts = this.chickenParts;
    const dogParts = this.dogParts;
    const t = this.animTime;
    const speed = this.speed;
    const move = clamp(speed / MAX_SPEED, 0, 1);
    const danger = clamp(1 - this.balance / 100, 0, 1);
    const grounded = !this.airborne;

    this.stride += dt * (4 + speed * 2.1) * (grounded ? 1 : 0.2);
    const strideAmp = grounded ? 0.66 * move : 0.18;
    parts.legs[0].rotation.x = Math.sin(this.stride) * strideAmp + (grounded ? 0 : -0.55);
    parts.legs[1].rotation.x = -Math.sin(this.stride) * strideAmp + (grounded ? 0 : -0.55);

    const bob = grounded ? Math.abs(Math.sin(this.stride)) * 0.05 * move : 0;
    const idleBreath = Math.sin(t * 2.1) * 0.008;
    parts.tilt.position.y = bob + idleBreath;

    const rightX = Math.cos(this.heading);
    const rightZ = -Math.sin(this.heading);
    const lateral = this.velocity.x * rightX + this.velocity.z * rightZ;
    const lateralLean = clamp(-lateral * 0.018, -0.16, 0.16);
    const baseWobble = Math.sin(t * 7.4) * 0.06 * danger;
    parts.tilt.rotation.z = lateralLean + baseWobble;
    parts.tilt.rotation.x = -move * 0.045 + Math.sin(t * 2.2) * 0.012;

    if (this.drifting) {
      parts.tilt.rotation.z += lateralLean * 1.8;
    }

    if (this.buckTimer > 0) {
      const buckWave = Math.sin(t * 22) * 0.25;
      parts.tilt.rotation.x += buckWave;
    }

    const flapWave = Math.sin(t * 24) * 0.6;
    const flapAmount = this.flapTimer > 0 ? 0.55 + flapWave : 0;
    const wingBase = 0.08 + move * 0.16 + Math.sin(t * 2.6) * 0.035;

    if (this.braking) {
      parts.wings[0].rotation.z = -(wingBase + flapAmount + 0.6);
      parts.wings[1].rotation.z = wingBase + flapAmount + 0.6;
      parts.wings[0].rotation.y = 0.45;
      parts.wings[1].rotation.y = -0.45;
    } else {
      parts.wings[0].rotation.z = -(wingBase + flapAmount);
      parts.wings[1].rotation.z = wingBase + flapAmount;
      parts.wings[0].rotation.y = 0;
      parts.wings[1].rotation.y = 0;
    }

    parts.head.rotation.x =
      Math.sin(this.stride * 2) * 0.06 * move + Math.sin(t * 1.7) * 0.015 - move * 0.04;
    parts.head.rotation.z = Math.sin(t * 5.1) * 0.035 * danger;
    parts.head.rotation.y = Math.sin(t * 0.8) * 0.04;
    parts.tail.rotation.x = Math.sin(t * 3.3) * 0.07 + move * 0.12;

    // Rider wobble, tracking, bucking reaction
    const wobble = danger ** 1.15;
    let riderX = Math.sin(t * 6.7 + 1.3) * 0.1 * wobble;
    let riderZ = Math.sin(t * 8.3) * 0.22 * wobble;
    riderX += Math.sin(t * 2.3) * 0.02;
    riderZ += lateralLean * 0.8;

    if (this.braking) {
      riderX -= 0.32;
    }
    if (this.buckTimer > 0) {
      riderX += Math.sin(t * 22) * 0.35;
      riderZ += Math.sin(t * 16) * 0.22;
    }
    if (this.drifting) {
      riderZ += lateralLean * 1.4;
    }

    if (this.hitReaction > 0) {
      const k = this.hitReaction / 0.45;
      riderX += this.hitBack * 0.28 * k;
      riderZ += -this.hitSide * 0.36 * k;
    }
    if (this.airborne) {
      riderX -= clamp(this.vy * 0.018, -0.1, 0.12);
    }
    riderX += this.punchExt * 0.24;

    this.dogPivot.rotation.x = riderX;
    this.dogPivot.rotation.z = riderZ;
    this.dogPivot.position.y =
      this.dogPivotBaseY + Math.sin(t * 2.5) * 0.01 + Math.abs(Math.sin(this.stride)) * 0.02 * move;
    this.dogPivot.position.x = Math.sin(t * 5.9) * 0.02 * wobble;

    dogParts.leftArm.rotation.x = Math.sin(t * 3.4) * 0.12 + move * 0.25;
    dogParts.leftArm.rotation.z = Math.sin(t * 2.6) * 0.08 - 0.04;
    dogParts.body.position.y = Math.sin(t * 2.1) * 0.012;

    const earJiggle = Math.sin(t * 9.2) * 0.055 + move * 0.06 + (this.flapTimer > 0 ? 0.08 : 0);
    dogParts.ears[0].rotation.z = -0.08 - earJiggle;
    dogParts.ears[1].rotation.z = 0.08 + earJiggle;
    dogParts.ears[0].rotation.x = Math.sin(t * 6.1) * 0.03 - 0.03;
    dogParts.ears[1].rotation.x = Math.sin(t * 6.7 + 1) * 0.03 - 0.03;

    let look = 0;
    if (opponent && opponent.alive) {
      const dx = opponent.position.x - this.position.x;
      const dz = opponent.position.z - this.position.z;
      look = wrapAngle(Math.atan2(dx, dz) - this.heading);
      look = clamp(look, -0.55, 0.55);
    }
    dogParts.head.rotation.y = damp(dogParts.head.rotation.y, look, 7, dt);
    dogParts.head.rotation.x = Math.sin(t * 2.7) * 0.025 + this.punchExt * 0.06;
    dogParts.head.rotation.z = Math.sin(t * 4.2) * 0.045 * danger;

    // Optional dizzy stars
    if (dogParts.dizzyStars) {
      dogParts.dizzyStars.visible = this.vulnerable > 0;
      if (this.vulnerable > 0) dogParts.dizzyStars.rotation.y += dt * 6;
    }

    // Optional surprise eyes
    if (parts.surpriseEyes) {
      parts.surpriseEyes.visible =
        this.buckTimer > 0 || this.mountShockTimer > 0 || this.balance < 30 || this.scared;
    }

    // Particles: glove trail & corn boost trail
    if (this.isPunchActive()) {
      this.game?.particles?.gloveTrail?.(this.gloveWorld, 0xffd23f, 2);
    }
    if (this.cornBoostTimer > 0) {
      const tailPos = this.tempVector.set(
        this.position.x - Math.sin(this.heading) * 0.65,
        this.vertical + 0.95,
        this.position.z - Math.cos(this.heading) * 0.65,
      );
      this.game?.particles?.gloveTrail?.(tailPos, 0xffc72c, 2);
    }

    // Sweat drops when low balance or wild bucking
    if ((this.balance < 28 || this.buckTimer > 0) && Math.random() < dt * 4) {
      this.game?.particles?.sweat?.(this.riderPosition, 2);
    }

    // Spring + glove
    const step = 0.055 + this.punchExt * 0.16;
    this.dogParts.segments.forEach((segment, index) => {
      segment.position.z = 0.05 + index * step;
    });
    dogParts.glove.position.z = 0.05 + 5 * step + 0.22;
    dogParts.gloveRoot.rotation.x = -0.02 - this.punchExt * 0.06;
    dogParts.gloveRoot.rotation.y = 0;
  }

  dispose() {
    this.scene.remove(this.group);
    disposeObject(this.group);
    if (this.dogPivot && this.dogPivot.parent) {
      this.dogPivot.parent.remove(this.dogPivot);
      disposeObject(this.dogPivot);
    }
  }
}
