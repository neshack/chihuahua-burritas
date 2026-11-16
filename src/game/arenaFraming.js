import * as THREE from 'three';

// The arena cylinder has radius 10.95 at its bottom (y=-0.36). The
// circumscribed circle also covers its smaller top and the painted rim.
// Circumscribe the circular edge between the sampled angles as well.
const ARENA_RADIUS = 10.95 / Math.cos(Math.PI / 128);
const ARENA_BOTTOM = -0.36;
const perimeter = [];
for (let i = 0; i < 128; i += 1) {
  const angle = (i / 128) * Math.PI * 2;
  const x = Math.cos(angle) * ARENA_RADIUS;
  const z = Math.sin(angle) * ARENA_RADIUS;
  perimeter.push(new THREE.Vector3(x, ARENA_BOTTOM, z));
  perimeter.push(new THREE.Vector3(x, 0.006, z));
  // A fighter can reach radius 9.28, plus roughly one unit of billboard width.
  // Include the rider's approximate maximum height in the HUD-safe area.
  const fighterRadius = 10.28 / Math.cos(Math.PI / 128);
  perimeter.push(new THREE.Vector3(Math.cos(angle) * fighterRadius, 4.5, Math.sin(angle) * fighterRadius));
}

/** Pull a perspective camera back along its current view axis until the arena
 * fits inside the safe viewport. Apply after camera shake and zoom. */
export function fitArenaInCamera(camera) {
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
  const backward = new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion);
  const relative = new THREE.Vector3();
  const tanVertical = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) / camera.zoom;
  const tanHorizontal = tanVertical * camera.aspect;
  // Top margin leaves room for the HUD; lower and side margins protect the rim.
  const top = 0.64;
  const bottom = 0.88;
  const side = 0.90;
  let retreat = 0;
  for (const point of perimeter) {
    relative.subVectors(point, camera.position);
    const x = relative.dot(right);
    const y = relative.dot(up);
    const depth = -relative.dot(backward);
    retreat = Math.max(retreat,
      Math.abs(x) / (tanHorizontal * side) - depth,
      y / (tanVertical * top) - depth,
      -y / (tanVertical * bottom) - depth,
      camera.near - depth);
  }
  camera.position.addScaledVector(backward, retreat);
}
