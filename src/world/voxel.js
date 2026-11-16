import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// One shared unit cube keeps the whole voxel world lightweight.
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const MATERIALS = new Map();

let voxelBumpTexture = null;

/**
 * Shared procedural 64x64 bump texture providing subtle edge beveling
 * and tactile micro-grain across voxel blocks.
 */
export function getVoxelEdgeBumpTexture() {
  if (voxelBumpTexture) return voxelBumpTexture;
  if (typeof document === 'undefined') return null;

  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const idx = (y * size + x) * 4;
      // Distance from face boundary (0 at the edge, up to 31 in center)
      const d = Math.min(x, y, size - 1 - x, size - 1 - y);

      let val;
      if (d === 0) {
        val = 98; // soft darker edge line (1st pixel)
      } else if (d === 1) {
        val = 112; // soft border bevel transition (2nd pixel)
      } else if (d === 2) {
        val = 144; // subtle bright inner bevel highlight
      } else if (d === 3) {
        val = 138; // inner bevel slope
      } else {
        val = 128; // neutral face surface
      }

      // Micro-grain: subtle pseudo-random noise (-3 to +3)
      const noise = (((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1) - 0.5) * 6;
      const finalVal = Math.min(255, Math.max(0, Math.round(val + noise)));

      data[idx] = finalVal;
      data[idx + 1] = finalVal;
      data[idx + 2] = finalVal;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.generateMipmaps = true;
  texture.colorSpace = THREE.NoColorSpace;
  voxelBumpTexture = texture;
  return voxelBumpTexture;
}

let blobShadowTexture = null;

function getBlobShadowTexture() {
  if (blobShadowTexture) return blobShadowTexture;
  if (typeof document === 'undefined') return null;

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.48);
  grad.addColorStop(0, 'rgba(32, 16, 8, 1)');
  grad.addColorStop(0.28, 'rgba(35, 18, 9, 0.95)');
  grad.addColorStop(0.55, 'rgba(40, 22, 12, 0.60)');
  grad.addColorStop(0.82, 'rgba(45, 25, 15, 0.20)');
  grad.addColorStop(1.0, 'rgba(50, 30, 18, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  blobShadowTexture = new THREE.CanvasTexture(canvas);
  blobShadowTexture.wrapS = THREE.ClampToEdgeWrapping;
  blobShadowTexture.wrapT = THREE.ClampToEdgeWrapping;
  return blobShadowTexture;
}

/**
 * Creates a soft radial dark-brown shadow plane for grounded contact shadows.
 */
export function createBlobShadow(radiusX = 0.65, radiusZ = 0.75, opacity = 0.28) {
  const geo = new THREE.PlaneGeometry(radiusX * 2, radiusZ * 2);
  const texture = getBlobShadowTexture();
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    color: 0xffffff,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.015;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.name = 'blob-shadow';
  return mesh;
}

export function voxelMaterial(color, options = {}) {
  const {
    emissive = 0x000000,
    emissiveIntensity = 1,
    roughness = 0.9,
    metalness = 0,
    transparent = false,
    opacity = 1,
    side = THREE.FrontSide,
    bumpScale = 0.015,
  } = options;

  const key = [
    color,
    emissive,
    emissiveIntensity,
    roughness,
    metalness,
    transparent,
    opacity,
    side,
    bumpScale,
  ].join('|');

  let material = MATERIALS.get(key);
  if (!material) {
    const bumpMap = getVoxelEdgeBumpTexture();
    material = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
      flatShading: true,
      emissive,
      emissiveIntensity,
      transparent,
      opacity,
      side,
      bumpMap: bumpMap || undefined,
      bumpScale,
    });
    MATERIALS.set(key, material);
  }
  return material;
}

/**
 * The core voxel constructor from the brief.
 * Dimensions are in world units; the returned mesh can be re-used as a building block.
 */
export function createVoxelBox(w, h, d, color, x = 0, y = 0, z = 0, options = {}) {
  const mesh = new THREE.Mesh(UNIT_BOX, voxelMaterial(color, options));
  mesh.scale.set(w, h, d);
  mesh.position.set(x, y, z);
  if (options.rx) mesh.rotation.x = options.rx;
  if (options.ry) mesh.rotation.y = options.ry;
  if (options.rz) mesh.rotation.z = options.rz;
  mesh.castShadow = options.castShadow ?? true;
  mesh.receiveShadow = options.receiveShadow ?? true;
  return mesh;
}

export function addBox(parent, w, h, d, color, x = 0, y = 0, z = 0, options = {}) {
  const mesh = createVoxelBox(w, h, d, color, x, y, z, options);
  parent.add(mesh);
  return mesh;
}

export function addGroup(parent, x = 0, y = 0, z = 0) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  parent.add(group);
  return group;
}

export function setShadows(object, cast = true, receive = true) {
  object.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = cast;
      child.receiveShadow = receive;
    }
  });
  return object;
}

/**
 * Accumulates static boxes and merges them per-material, so an entire
 * bleacher crowd costs a handful of draw calls instead of hundreds.
 */
export class StaticVoxelBatch {
  constructor() {
    this.buckets = new Map();
  }

  add(w, h, d, color, x = 0, y = 0, z = 0, options = {}) {
    const key = [
      color,
      options.emissive ?? 0x000000,
      options.emissiveIntensity ?? 1,
      options.roughness ?? 0.9,
      options.metalness ?? 0,
      options.castShadow ?? true,
      options.receiveShadow ?? true,
    ].join('|');

    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = {
        color,
        options,
        geometries: [],
      };
      this.buckets.set(key, bucket);
    }

    const geometry = new THREE.BoxGeometry(w, h, d);
    const quaternion = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(options.rx ?? 0, options.ry ?? 0, options.rz ?? 0),
    );
    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      quaternion,
      new THREE.Vector3(1, 1, 1),
    );
    geometry.applyMatrix4(matrix);
    bucket.geometries.push(geometry);
    return this;
  }

  flush(parent) {
    for (const bucket of this.buckets.values()) {
      if (!bucket.geometries.length) continue;
      const merged = mergeGeometries(bucket.geometries, false);
      bucket.geometries.forEach((geometry) => geometry.dispose());
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, voxelMaterial(bucket.color, bucket.options));
      mesh.castShadow = bucket.options.castShadow ?? true;
      mesh.receiveShadow = bucket.options.receiveShadow ?? true;
      parent.add(mesh);
    }
    this.buckets.clear();
    return parent;
  }
}

export function makeTextTexture({ width = 512, height = 256, draw }) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  draw(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function disposeObject(object) {
  object.traverse((child) => {
    if (child.isMesh) {
      if (child.geometry && child.geometry !== UNIT_BOX) child.geometry.dispose();
    }
    if (child.isSprite) {
      if (child.userData.ownsPixelTexture) child.material.map?.dispose();
      child.material.dispose();
    }
  });
}

export { UNIT_BOX };
