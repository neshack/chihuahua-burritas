import * as THREE from 'three';
import { clamp, randomRange, wrapAngle } from '../core/utils.js';

/**
 * Rodeo AI controller:
 * PATROL → ALIGN → CHARGE → RECOVER, with fence avoidance, corn gathering, and wing-braking.
 */
export class AIController {
  constructor(self, foe, game) {
    this.self = self;
    this.foe = foe;
    this.game = game;
    this.state = 'PATROL';
    this.stateTime = 0;
    this.orbitDir = Math.random() < 0.5 ? -1 : 1;
    this.orbitTimer = randomRange(1.4, 2.8);
    this.thinkTimer = 0;
    this.dodgeCooldown = 0;
    this.targetSide = 1;
    this.lastState = '';
    this.temp = new THREE.Vector3();
    this.desired = new THREE.Vector3();
  }

  setState(state) {
    if (this.state === state) return;
    this.lastState = this.state;
    this.state = state;
    this.stateTime = 0;
    if (state === 'ALIGN') {
      this.targetSide = Math.random() < 0.5 ? -1 : 1;
    }
  }

  update(dt) {
    if (!this.self.alive || !this.game.canFight()) {
      this.self.regenBoost = 0;
      return;
    }

    this.stateTime += dt;
    this.thinkTimer -= dt;
    this.dodgeCooldown = Math.max(0, this.dodgeCooldown - dt);

    const self = this.self;
    const foe = this.foe;
    self.regenBoost = this.state === 'RECOVER' ? 4.2 : 0;

    if (self.balance < 26 && this.state !== 'RECOVER') {
      this.setState('RECOVER');
    }

    const dx = foe.position.x - self.position.x;
    const dz = foe.position.z - self.position.z;
    const distance = Math.hypot(dx, dz) || 0.001;
    const dirX = dx / distance;
    const dirZ = dz / distance;
    const selfRadius = Math.hypot(self.position.x, self.position.z);
    const towardCenterX = selfRadius > 0.01 ? -self.position.x / selfRadius : 0;
    const towardCenterZ = selfRadius > 0.01 ? -self.position.z / selfRadius : 0;

    let moveX = 0;
    let moveZ = 0;
    let hop = false;
    let punch = false;

    // Avoid getting pinned to the fence.
    const fenceAvoid = clamp((selfRadius - 7.4) / 1.8, 0, 1);
    const addFenceAvoid = (x, z, strength = 1.5) => {
      moveX += towardCenterX * fenceAvoid * strength;
      moveZ += towardCenterZ * fenceAvoid * strength;
      return [x, z];
    };

    // Check for active corn pickups if low balance
    let targetCorn = null;
    const cornPickups = this.game.arena?.cornPickups;
    if (self.balance < 65 && Array.isArray(cornPickups) && cornPickups.length > 0) {
      let closestDist = Infinity;
      for (const cp of cornPickups) {
        if (!cp.active) continue;
        const cpos = cp.position || cp;
        const d = Math.hypot(cpos.x - self.position.x, cpos.z - self.position.z);
        if (d < closestDist) {
          closestDist = d;
          targetCorn = cpos;
        }
      }
    }

    if (targetCorn && (this.state === 'RECOVER' || this.state === 'PATROL')) {
      const cx = targetCorn.x - self.position.x;
      const cz = targetCorn.z - self.position.z;
      const cDist = Math.hypot(cx, cz) || 0.001;
      moveX = cx / cDist;
      moveZ = cz / cDist;
      addFenceAvoid(moveX, moveZ, 1.8);
    } else {
      switch (this.state) {
        case 'RECOVER': {
          moveX = -dirX + towardCenterX * (0.35 + fenceAvoid * 1.7);
          moveZ = -dirZ + towardCenterZ * (0.35 + fenceAvoid * 1.7);
          self.regenBoost = 5.2;
          if (distance < 3.1 && this.dodgeCooldown <= 0 && Math.random() < 0.02) {
            hop = true;
            this.dodgeCooldown = 1.6;
          }
          if (
            this.stateTime > 2.8 ||
            self.balance > 58 ||
            (distance > 6.5 && self.balance > 32)
          ) {
            this.setState('PATROL');
          }
          break;
        }

        case 'PATROL': {
          this.orbitTimer -= dt;
          if (this.orbitTimer <= 0) {
            this.orbitTimer = randomRange(1.3, 2.8);
            this.orbitDir *= -1;
          }

          const orbitRadius = 4.2;
          const radial = clamp((distance - orbitRadius) * 0.5, -1, 1);
          const tangentialX = -dirZ * this.orbitDir;
          const tangentialZ = dirX * this.orbitDir;
          moveX = tangentialX * 0.85 + dirX * radial;
          moveZ = tangentialZ * 0.85 + dirZ * radial;
          addFenceAvoid(moveX, moveZ, 2.0);

          const readyToAttack = self.cooldown <= 0 && distance < 5.4;
          if (readyToAttack && this.stateTime > 0.7) {
            const aggression = foe.balance < 30 ? 1.6 : 0.35;
            if (Math.random() < aggression * dt || this.stateTime > 2.6) {
              this.setState('ALIGN');
            }
          }
          if (foe.balance < 26 && distance < 6.5 && self.cooldown <= 0) {
            this.setState('ALIGN');
          }
          break;
        }

        case 'ALIGN': {
          const behindX = foe.position.x - foe.forward.x * 1.9;
          const behindZ = foe.position.z - foe.forward.z * 1.9;
          const sideOffsetX = foe.right.x * this.targetSide * 1.4;
          const sideOffsetZ = foe.right.z * this.targetSide * 1.4;
          const targetX = behindX + sideOffsetX;
          const targetZ = behindZ + sideOffsetZ;
          const tx = targetX - self.position.x;
          const tz = targetZ - self.position.z;
          const targetDistance = Math.hypot(tx, tz) || 0.001;

          if (targetDistance > 0.5) {
            moveX = tx / targetDistance;
            moveZ = tz / targetDistance;
          }
          addFenceAvoid(moveX, moveZ, 2.2);

          const facing = wrapAngle(Math.atan2(dx, dz) - self.heading);
          const arrived = targetDistance < 1.15 && distance < 4.1;
          const canCharge = distance < 3.45 && Math.abs(facing) < 0.9;
          if (self.cooldown <= 0 && (arrived || canCharge)) {
            this.setState('CHARGE');
          } else if (this.stateTime > 1.9) {
            this.setState('CHARGE');
          }
          if (foe.balance < 24 && distance < 4.2 && self.cooldown <= 0) {
            this.setState('CHARGE');
          }
          break;
        }

        case 'CHARGE': {
          const lead = clamp(distance * 0.06, 0, 0.45);
          moveX = dx / distance + foe.velocity.x * lead * 0.04;
          moveZ = dz / distance + foe.velocity.z * lead * 0.04;
          addFenceAvoid(moveX, moveZ, 1.2);

          const facing = Math.abs(wrapAngle(Math.atan2(dx, dz) - self.heading));
          if (distance < 3.35 && facing < 0.55 && self.cooldown <= 0) {
            punch = true;
          }
          if (this.stateTime > 0.55 || distance > 5.2) {
            this.setState('PATROL');
          }
          break;
        }

        default:
          break;
      }
    }

    if (
      foe.punchTime >= 0 &&
      foe.punchTime < 0.12 &&
      distance < 3.6 &&
      this.dodgeCooldown <= 0 &&
      self.balance > 32 &&
      Math.random() < 0.45
    ) {
      const dodgeDir = Math.random() < 0.5 ? -1 : 1;
      moveX += -dirZ * dodgeDir * 1.8;
      moveZ += dirX * dodgeDir * 1.8;
      hop = true;
      this.dodgeCooldown = 2.2;
    }

    const length = Math.hypot(moveX, moveZ);
    if (length > 1) {
      moveX /= length;
      moveZ /= length;
    }

    const errorPhase = this.game.clock * 2.3;
    if (this.state === 'CHARGE' && distance > 1.6) {
      const angleError = Math.sin(errorPhase) * 0.06;
      const cos = Math.cos(angleError);
      const sin = Math.sin(angleError);
      const rx = moveX * cos - moveZ * sin;
      const rz = moveX * sin + moveZ * cos;
      moveX = rx;
      moveZ = rz;
    }

    // Rodeo wing-braking & sharp turn handling
    let hopHeld = false;
    if (length > 0.05) {
      const desiredAngle = Math.atan2(moveX, moveZ);
      const facingDiff = Math.abs(wrapAngle(desiredAngle - self.heading));
      const outwardDot =
        (self.velocity.x * self.position.x + self.velocity.z * self.position.z) / (selfRadius || 1);
      const nearFenceOutward = selfRadius > 7.8 && outwardDot > 1.1;
      const sharpTurn = facingDiff > 1.35;
      hopHeld = sharpTurn || nearFenceOutward;
    }

    self.setIntent(moveX, moveZ, hop, punch, hopHeld);
  }
}
