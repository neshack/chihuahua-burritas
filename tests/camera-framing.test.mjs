import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { fitArenaInCamera } from '../src/game/arenaFraming.js';

function verifyFrame(width, height, target, shake = false) {
  const camera = new THREE.PerspectiveCamera(shake ? 40.5 : 45.5, width / height, 0.1, 220);
  camera.position.set(target.x * 0.28, 7.2, 10.5);
  camera.lookAt(target.x * 0.55, target.y, target.z);
  if (shake) {
    camera.position.add(new THREE.Vector3(0.5, -0.28, -0.22));
    camera.rotation.z += 0.015;
  }
  fitArenaInCamera(camera);
  camera.updateMatrixWorld();
  let maxDistance = 0;
  for (let i = 0; i < 2048; i += 1) {
    const angle = 2 * Math.PI * i / 2048;
    for (const y of [-0.36, 0.006]) {
      const point = new THREE.Vector3(10.95 * Math.cos(angle), y, 10.95 * Math.sin(angle));
      maxDistance = Math.max(maxDistance, camera.position.distanceTo(point));
      point.project(camera);
      assert.ok(Math.abs(point.x) <= 0.90001, `horizontal bound: ${point.x}`);
      assert.ok(point.y <= 0.64001 && point.y >= -0.88001, `vertical bound: ${point.y}`);
      assert.ok(point.z < 1, 'arena must remain within the far plane');
    }
  }
  assert.ok(maxDistance < camera.far);
  // Fighter billboards can reach beyond the ground circle and above the rim.
  // Check their full approximate width and rider height at the playable edge.
  for (let i = 0; i < 32; i += 1) {
    const angle = 2 * Math.PI * i / 32;
    const x = 9.28 * Math.cos(angle);
    const z = 9.28 * Math.sin(angle);
    for (const dx of [-1, 1]) {
      for (const y of [0, 4.5]) {
        const point = new THREE.Vector3(x + dx, y, z).project(camera);
        assert.ok(Math.abs(point.x) <= 0.95, `fighter horizontal bound: ${point.x}`);
        assert.ok(point.y <= 0.64 && point.y >= -0.95, `fighter vertical bound: ${point.y}`);
      }
    }
  }
}

for (const [width, height] of [[390, 844], [1440, 900], [1728, 1080], [2560, 1080]]) {
  test(`complete arena fits ${width}x${height}, including extremes and KO shake`, () => {
    for (const target of [{ x: 0, y: 1.28, z: 0.35 }, { x: 8, y: 2, z: 8 }, { x: -8, y: 2, z: -8 }]) {
      verifyFrame(width, height, target);
      verifyFrame(width, height, target, true);
    }
  });
}

test('already fitting cameras do not move', () => {
  const camera = new THREE.PerspectiveCamera(45, 1.6, 0.1, 220);
  camera.position.set(0, 40, 60);
  camera.lookAt(0, 0, 0);
  const before = camera.position.clone();
  fitArenaInCamera(camera);
  assert.ok(camera.position.equals(before));
});
