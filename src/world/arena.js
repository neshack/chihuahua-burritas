import * as THREE from 'three';
import { StaticVoxelBatch, makeTextTexture } from './voxel.js';

const TAU = Math.PI * 2;

function mulberry32(seed) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function softDotTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.25, 'rgba(255,244,200,0.9)');
  gradient.addColorStop(0.6, 'rgba(255,226,150,0.28)');
  gradient.addColorStop(1, 'rgba(255,214,120,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createFlagGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.34, 0);
  shape.lineTo(0.34, 0);
  shape.lineTo(0.34, -0.48);
  shape.lineTo(0.16, -0.48);
  shape.lineTo(0, -0.62);
  shape.lineTo(-0.16, -0.48);
  shape.lineTo(-0.34, -0.48);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.035, bevelEnabled: false });
  geometry.translate(0, 0, -0.0175);
  return geometry;
}

const PAPEL_COLORS = [0xe63946, 0xf2c14e, 0x2a9d8f, 0xe8782e, 0xd94f9b, 0x5b9bd5, 0x8ac926];
const SHIRT_COLORS = [0xe63946, 0x2a9d8f, 0xf2c14e, 0x4a7fd4, 0xe8782e, 0xf4f1de, 0x9b5de5];
const CHICKEN_COLORS = [0xfbf5e7, 0xd9c39b, 0xb47e50, 0x8d99a6, 0x7c4db7, 0x7fa45c, 0xe2a45c];
const DOG_COLORS = [0xc98a4b, 0x9c6b42, 0x3a3d4d, 0xd8b07a, 0xbb8a5c, 0x88a95c];

/**
 * Builds a lively voxel spectator. Matches the rich farm animal cast from the concept art:
 * - Chihuahuas (with cowboy hats or neck bandanas)
 * - Chickens (with combs, wattles, beaks)
 * - Vaquitas (cows with horns, spots, pink snouts)
 * - Cerditos (cute pigs with pink snouts and floppy ears)
 */
function addSpectator(batch, x, y, z, rand, index, isCovered = false) {
  // Determine species:
  // Covered stand gets more farm livestock (cows & pigs), while open stands have dogs & chickens.
  const r = rand();
  let species = 'dog';
  if (isCovered) {
    if (r < 0.32) species = 'cow';
    else if (r < 0.60) species = 'pig';
    else if (r < 0.80) species = 'dog';
    else species = 'chicken';
  } else {
    if (r < 0.40) species = 'dog';
    else if (r < 0.68) species = 'chicken';
    else if (r < 0.84) species = 'cow';
    else species = 'pig';
  }

  const shirt = SHIRT_COLORS[Math.floor(rand() * SHIRT_COLORS.length)];
  const bob = (rand() - 0.5) * 0.05;
  const baseY = y + bob;

  if (species === 'dog') {
    const fur = DOG_COLORS[Math.floor(rand() * DOG_COLORS.length)];
    // Body + shirt
    batch.add(0.4, 0.44, 0.3, shirt, x, baseY + 0.3, z);
    batch.add(0.12, 0.26, 0.3, shirt, x - 0.27, baseY + 0.34, z + 0.02);
    batch.add(0.12, 0.26, 0.3, shirt, x + 0.27, baseY + 0.34, z + 0.02);

    // Chihuahua head
    batch.add(0.32, 0.32, 0.3, fur, x, baseY + 0.68, z + 0.02);
    batch.add(0.18, 0.14, 0.14, fur === 0x3a3d4d ? 0x2a2b38 : 0xe8c9a0, x, baseY + 0.63, z + 0.2);
    batch.add(0.07, 0.07, 0.05, 0x24160e, x, baseY + 0.64, z + 0.28);
    // Pointy ears
    batch.add(0.08, 0.22, 0.1, fur, x - 0.13, baseY + 0.91, z, { rz: 0.22 });
    batch.add(0.08, 0.22, 0.1, fur, x + 0.13, baseY + 0.91, z, { rz: -0.22 });

    // Accessories: Cowboy hat or festive bandana
    const accRoll = rand();
    if (accRoll < 0.42) {
      // Cowboy hat
      batch.add(0.62, 0.06, 0.52, 0x9e6a38, x, baseY + 0.88, z + 0.02);
      batch.add(0.32, 0.18, 0.28, 0x82542a, x, baseY + 0.99, z + 0.02);
      batch.add(0.34, 0.04, 0.3, 0xe63946, x, baseY + 0.92, z + 0.02);
    } else if (accRoll < 0.75) {
      // Colorful bandana
      const bandanaCol = PAPEL_COLORS[(index * 2) % PAPEL_COLORS.length];
      batch.add(0.34, 0.09, 0.26, bandanaCol, x, baseY + 0.53, z + 0.08);
      batch.add(0.09, 0.09, 0.08, bandanaCol, x, baseY + 0.48, z + 0.21);
    }
  } else if (species === 'chicken') {
    const fur = CHICKEN_COLORS[Math.floor(rand() * CHICKEN_COLORS.length)];
    // Chicken body
    batch.add(0.38, 0.42, 0.32, fur, x, baseY + 0.3, z);
    batch.add(0.1, 0.26, 0.26, fur, x - 0.23, baseY + 0.32, z);
    batch.add(0.1, 0.26, 0.26, fur, x + 0.23, baseY + 0.32, z);
    // Head & beak
    batch.add(0.28, 0.3, 0.28, fur, x, baseY + 0.66, z + 0.02);
    batch.add(0.1, 0.09, 0.18, 0xf5a623, x, baseY + 0.62, z + 0.24);
    // Wattle & comb
    batch.add(0.08, 0.12, 0.08, 0xdd2f2f, x, baseY + 0.53, z + 0.2);
    batch.add(0.08, 0.11, 0.1, 0xdd2f2f, x - 0.08, baseY + 0.86, z + 0.01);
    batch.add(0.08, 0.15, 0.12, 0xdd2f2f, x, baseY + 0.89, z + 0.01);
    batch.add(0.08, 0.11, 0.1, 0xdd2f2f, x + 0.08, baseY + 0.86, z + 0.01);
    // Eyes
    batch.add(0.06, 0.06, 0.04, 0x1a1a1a, x - 0.1, baseY + 0.69, z + 0.16);
    batch.add(0.06, 0.06, 0.04, 0x1a1a1a, x + 0.1, baseY + 0.69, z + 0.16);
  } else if (species === 'cow') {
    // Vaquita (cute spotted cow)
    const cowWhite = 0xf7f5f0;
    const cowSpot = 0x2b2927;
    // Torso with patch
    batch.add(0.44, 0.46, 0.34, cowWhite, x, baseY + 0.3, z);
    batch.add(0.2, 0.26, 0.35, cowSpot, x - 0.1, baseY + 0.32, z);
    batch.add(0.12, 0.26, 0.32, cowWhite, x - 0.28, baseY + 0.34, z + 0.02);
    batch.add(0.12, 0.26, 0.32, cowWhite, x + 0.28, baseY + 0.34, z + 0.02);

    // Head with eye patch
    batch.add(0.38, 0.34, 0.34, cowWhite, x, baseY + 0.68, z + 0.02);
    batch.add(0.18, 0.18, 0.35, cowSpot, x + 0.09, baseY + 0.72, z + 0.02);
    // Cute pink muzzle & nostrils
    batch.add(0.28, 0.16, 0.16, 0xf4a6b5, x, baseY + 0.61, z + 0.24);
    batch.add(0.05, 0.05, 0.03, 0x823b49, x - 0.07, baseY + 0.61, z + 0.32);
    batch.add(0.05, 0.05, 0.03, 0x823b49, x + 0.07, baseY + 0.61, z + 0.32);
    // Horns
    batch.add(0.08, 0.16, 0.08, 0xedd6b1, x - 0.18, baseY + 0.92, z, { rz: 0.32 });
    batch.add(0.08, 0.16, 0.08, 0xedd6b1, x + 0.18, baseY + 0.92, z, { rz: -0.32 });
    // Sideways cow ears
    batch.add(0.16, 0.09, 0.09, cowWhite, x - 0.24, baseY + 0.76, z, { rz: -0.2 });
    batch.add(0.16, 0.09, 0.09, cowSpot, x + 0.24, baseY + 0.76, z, { rz: 0.2 });
    // Eyes
    batch.add(0.06, 0.06, 0.03, 0x1f1917, x - 0.11, baseY + 0.71, z + 0.2);
    batch.add(0.06, 0.06, 0.03, 0x1f1917, x + 0.11, baseY + 0.71, z + 0.2);
  } else {
    // Cerdito (cute pink pig)
    const pigPink = 0xfcb6c6;
    const snoutPink = 0xf37e97;
    // Body & arms
    batch.add(0.42, 0.44, 0.34, pigPink, x, baseY + 0.3, z);
    batch.add(0.12, 0.26, 0.3, pigPink, x - 0.27, baseY + 0.34, z + 0.02);
    batch.add(0.12, 0.26, 0.3, pigPink, x + 0.27, baseY + 0.34, z + 0.02);
    // Head & snout
    batch.add(0.36, 0.34, 0.32, pigPink, x, baseY + 0.68, z + 0.02);
    batch.add(0.22, 0.16, 0.15, snoutPink, x, baseY + 0.62, z + 0.24);
    batch.add(0.04, 0.05, 0.03, 0xb8425d, x - 0.05, baseY + 0.62, z + 0.315);
    batch.add(0.04, 0.05, 0.03, 0xb8425d, x + 0.05, baseY + 0.62, z + 0.315);
    // Floppy ears
    batch.add(0.12, 0.13, 0.1, 0xf0889f, x - 0.15, baseY + 0.88, z + 0.02, { rz: -0.35, rx: 0.2 });
    batch.add(0.12, 0.13, 0.1, 0xf0889f, x + 0.15, baseY + 0.88, z + 0.02, { rz: 0.35, rx: 0.2 });
    // Eyes
    batch.add(0.05, 0.06, 0.03, 0x221318, x - 0.1, baseY + 0.71, z + 0.19);
    batch.add(0.05, 0.06, 0.03, 0x221318, x + 0.1, baseY + 0.71, z + 0.19);
  }

  // Occasional raised arm with a fiesta flag
  if (index % 6 === 0) {
    batch.add(0.08, 0.42, 0.08, shirt, x + 0.26, baseY + 0.64, z + 0.06, { rz: -0.4 });
    batch.add(0.04, 0.5, 0.04, 0x8a5a33, x + 0.42, baseY + 0.86, z + 0.06, { rz: -0.2 });
    batch.add(0.32, 0.22, 0.03, PAPEL_COLORS[index % PAPEL_COLORS.length], x + 0.56, baseY + 1.05, z + 0.06, {
      rz: -0.2,
    });
  }
}

export class Arena {
  constructor(scene) {
    this.scene = scene;
    this.time = 0;
    this.cheerTimer = 0;
    this.flags = [];
    this.clouds = [];
    this.birds = [];
    this.crowdRows = [];
    this.hayBales = [];
    this.cornPickups = [];
    this.introCornGroup = null;
    this.chalkboardTexture = null;
    this.chalkboardCtx = null;
    this.chalkboardCanvas = null;
    this.skidMarks = [];
    this.skidMesh = null;
    this.skidCursor = 0;
    this.ambientDust = null;
    this.dotTexture = softDotTexture();
    this.dummy = new THREE.Object3D();

    this.buildSky();
    this.buildLights();
    this.buildGround();
    this.buildFence();
    this.buildScoreboard();
    this.buildPerches();
    this.buildHayBales();
    this.buildStands();
    this.buildScenery();
    this.buildGarlands();
    this.buildDustAndBirds();
    this.buildCornSystem();
    this.buildSkidSystem();

    // Initial scoreboard state
    this.updateScoreboard([0, 0], 1);
  }

  buildSky() {
    // Rich golden-hour fiesta sky
    const uniforms = {
      topColor: { value: new THREE.Color(0x388ec0) },
      horizonColor: { value: new THREE.Color(0xffd58e) },
      lowColor: { value: new THREE.Color(0xf5b26b) },
      sunColor: { value: new THREE.Color(0xfff5d2) },
      sunDir: { value: new THREE.Vector3(-0.62, 0.46, -0.63).normalize() },
    };
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          vWorldPosition = world.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 horizonColor;
        uniform vec3 lowColor;
        uniform vec3 sunColor;
        uniform vec3 sunDir;
        varying vec3 vWorldPosition;
        void main() {
          vec3 dir = normalize(vWorldPosition);
          float h = dir.y;
          vec3 col = mix(horizonColor, topColor, smoothstep(0.0, 0.65, h));
          col = mix(lowColor, col, smoothstep(-0.12, 0.08, h));
          float sun = pow(max(dot(dir, normalize(sunDir)), 0.0), 24.0);
          col += sunColor * sun * 0.62;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
      toneMapped: false,
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(125, 40, 24), skyMaterial);
    sky.renderOrder = -10;
    this.scene.add(sky);

    this.scene.fog = new THREE.Fog(0xf5d6ab, 44, 110);

    const sunMaterial = new THREE.SpriteMaterial({
      map: this.dotTexture,
      color: 0xfff3cf,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const sun = new THREE.Sprite(sunMaterial);
    sun.position.set(-52, 40, -56);
    sun.scale.set(30, 30, 1);
    this.scene.add(sun);

    this.scene.background = new THREE.Color(0xf5d6ab);
  }

  buildLights() {
    // Warm hemisphere ambient light: warm golden sky and rich terracotta ground
    this.scene.add(new THREE.HemisphereLight(0xffeedb, 0x82542a, 0.92));

    // Warm golden-hour sunlight
    const sun = new THREE.DirectionalLight(0xffeed0, 3.1);
    sun.position.set(-18, 25, -10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -20;
    sun.shadow.camera.right = 20;
    sun.shadow.camera.top = 20;
    sun.shadow.camera.bottom = -20;
    sun.shadow.camera.near = 2;
    sun.shadow.camera.far = 70;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.025;
    sun.target.position.set(0, 0, 0);
    this.scene.add(sun);
    this.scene.add(sun.target);

    // Subtle sky-blue bounce fill light
    const fill = new THREE.DirectionalLight(0xa5d6ff, 0.42);
    fill.position.set(14, 10, 15);
    this.scene.add(fill);

    // Warm fiesta rim light
    const warmRim = new THREE.DirectionalLight(0xff9e4a, 0.65);
    warmRim.position.set(8, 6, 14);
    this.scene.add(warmRim);

    // Secondary soft backlight
    const backRim = new THREE.DirectionalLight(0xffb866, 0.35);
    backRim.position.set(-4, 5, 16);
    this.scene.add(backRim);
  }

  buildGround() {
    const grass = new THREE.Mesh(
      new THREE.CircleGeometry(72, 80),
      new THREE.MeshStandardMaterial({ color: 0x6f9b43, roughness: 1 }),
    );
    grass.rotation.x = -Math.PI / 2;
    grass.position.y = -0.2;
    grass.receiveShadow = true;
    this.scene.add(grass);

    const arena = new THREE.Mesh(
      new THREE.CylinderGeometry(10.55, 10.95, 0.36, 64),
      new THREE.MeshStandardMaterial({ color: 0xd0a05d, roughness: 1 }),
    );
    arena.position.y = -0.18;
    arena.receiveShadow = true;
    arena.castShadow = false;
    this.scene.add(arena);

    const rim = new THREE.Mesh(
      new THREE.RingGeometry(10.25, 10.55, 64),
      new THREE.MeshStandardMaterial({ color: 0xb98c50, roughness: 1 }),
    );
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = 0.006;
    rim.receiveShadow = true;
    this.scene.add(rim);

    // Upgraded procedural dirt floor texture (1024x1024)
    // Features concentric rodeo track rings, chicken claw scratches, hoof marks,
    // warm sunlit dust gradients, and the center fiesta emblem.
    const dirtTexture = makeTextTexture({
      width: 1024,
      height: 1024,
      draw(ctx, w, h) {
        const cx = w / 2;
        const cy = h / 2;

        // Base warm dirt fill
        ctx.fillStyle = '#c79251';
        ctx.fillRect(0, 0, w, h);

        const dirtRand = mulberry32(73);

        // Sunlit dust gradient across arena floor
        const sunGrad = ctx.createRadialGradient(cx - 160, cy - 140, 40, cx, cy, 520);
        sunGrad.addColorStop(0, 'rgba(255, 222, 155, 0.42)');
        sunGrad.addColorStop(0.45, 'rgba(235, 185, 115, 0.22)');
        sunGrad.addColorStop(0.85, 'rgba(175, 115, 52, 0.18)');
        sunGrad.addColorStop(1, 'rgba(125, 75, 30, 0.35)');
        ctx.fillStyle = sunGrad;
        ctx.fillRect(0, 0, w, h);

        // Layered earthy dirt tones
        for (let i = 0; i < 55; i += 1) {
          const x = dirtRand() * w;
          const y = dirtRand() * h;
          const radius = 30 + dirtRand() * 180;
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
          const tone = i % 3 === 0 ? '198, 142, 75' : i % 3 === 1 ? '228, 178, 110' : '172, 118, 58';
          gradient.addColorStop(0, `rgba(${tone}, ${0.1 + dirtRand() * 0.08})`);
          gradient.addColorStop(1, 'rgba(198, 142, 75, 0)');
          ctx.fillStyle = gradient;
          ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        }

        // Concentric Rodeo Track Rings (worn circular rut paths)
        const trackRadii = [425, 385, 305];
        for (const tr of trackRadii) {
          ctx.strokeStyle = 'rgba(135, 82, 35, 0.22)';
          ctx.lineWidth = 36 + dirtRand() * 12;
          ctx.beginPath();
          ctx.arc(cx, cy, tr, 0, Math.PI * 2);
          ctx.stroke();

          // Dusty rut highlight inside the groove
          ctx.strokeStyle = 'rgba(240, 202, 142, 0.18)';
          ctx.lineWidth = 14;
          ctx.beginPath();
          ctx.arc(cx, cy, tr - 6, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Chicken claw marks (3 radiating toes) along the concentric running ruts
        for (let i = 0; i < 75; i += 1) {
          const trackR = trackRadii[i % trackRadii.length] + (dirtRand() - 0.5) * 38;
          const angle = dirtRand() * Math.PI * 2;
          const fx = cx + Math.cos(angle) * trackR;
          const fy = cy + Math.sin(angle) * trackR;
          const rot = angle + Math.PI / 2 + (dirtRand() - 0.5) * 0.6;

          ctx.save();
          ctx.translate(fx, fy);
          ctx.rotate(rot);
          ctx.strokeStyle = `rgba(88, 48, 18, ${0.18 + dirtRand() * 0.16})`;
          ctx.lineWidth = 2 + dirtRand() * 1.5;
          // Center toe
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, 10 + dirtRand() * 4);
          ctx.stroke();
          // Left toe
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-6, 8);
          ctx.stroke();
          // Right toe
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(6, 8);
          ctx.stroke();
          ctx.restore();
        }

        // Hoof & boot scuffs around the arena
        for (let i = 0; i < 50; i += 1) {
          const hx = 90 + dirtRand() * (w - 180);
          const hy = 90 + dirtRand() * (h - 180);
          ctx.strokeStyle = `rgba(95, 54, 22, ${0.12 + dirtRand() * 0.12})`;
          ctx.lineWidth = 4 + dirtRand() * 7;
          ctx.beginPath();
          ctx.arc(hx, hy, 16 + dirtRand() * 60, dirtRand() * Math.PI, dirtRand() * Math.PI + 1.2);
          ctx.stroke();
        }

        // Fine dirt pebbles and grain speckles
        for (let i = 0; i < 3500; i += 1) {
          const alpha = 0.04 + dirtRand() * 0.1;
          ctx.fillStyle = dirtRand() < 0.52 ? `rgba(80, 44, 18, ${alpha})` : `rgba(255, 226, 170, ${alpha * 0.9})`;
          const size = 1 + dirtRand() * 3.5;
          ctx.fillRect(dirtRand() * w, dirtRand() * h, size, size);
        }

        // Faded Fiesta Crest painted into the dirt
        ctx.save();
        ctx.translate(cx, cy);

        ctx.strokeStyle = 'rgba(84, 48, 20, 0.22)';
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.arc(0, 0, 248, 0, Math.PI * 2);
        ctx.stroke();

        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(84, 48, 20, 0.18)';
        ctx.beginPath();
        ctx.arc(0, 0, 228, 0, Math.PI * 2);
        ctx.stroke();

        // Star studs around circle
        for (let i = 0; i < 16; i += 1) {
          const sa = (i / 16) * Math.PI * 2;
          const sx = Math.cos(sa) * 238;
          const sy = Math.sin(sa) * 238;
          ctx.fillStyle = 'rgba(84, 48, 20, 0.2)';
          ctx.fillRect(sx - 3, sy - 3, 6, 6);
        }

        ctx.fillStyle = 'rgba(84, 48, 20, 0.22)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '900 86px "Arial Black", sans-serif';
        ctx.fillText('LA BURRITA', 0, -32);
        ctx.font = '800 32px "Arial", sans-serif';
        ctx.fillText('★  CORRAL DE LA FIESTA  ★', 0, 48);

        ctx.restore();
      },
    });
    dirtTexture.anisotropy = 8;

    const dirt = new THREE.Mesh(
      new THREE.CircleGeometry(10.54, 64),
      new THREE.MeshStandardMaterial({ map: dirtTexture, roughness: 1 }),
    );
    dirt.rotation.x = -Math.PI / 2;
    dirt.position.y = 0.004;
    dirt.receiveShadow = true;
    this.scene.add(dirt);

    const rand = mulberry32(9);
    const batch = new StaticVoxelBatch();
    for (let i = 0; i < 16; i += 1) {
      const angle = rand() * TAU;
      const radius = 2 + rand() * 7.4;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      batch.add(0.1 + rand() * 0.22, 0.06, 0.12 + rand() * 0.2, rand() < 0.5 ? 0xa88f6a : 0xc3a97f, x, 0.03, z, {
        ry: rand() * TAU,
      });
    }
    // Grass patches and little flowers just outside the ring
    for (let i = 0; i < 55; i += 1) {
      const angle = rand() * TAU;
      const radius = 11.8 + rand() * 16;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const w = 0.8 + rand() * 2.8;
      const d = 0.8 + rand() * 2.2;
      batch.add(w, 0.02, d, rand() < 0.5 ? 0x6d9644 : 0x87ad58, x, -0.17, z, {
        ry: rand() * TAU,
        castShadow: false,
      });
    }
    for (let i = 0; i < 90; i += 1) {
      const angle = rand() * TAU;
      const radius = 11.6 + rand() * 18;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const h = 0.18 + rand() * 0.28;
      batch.add(0.06, h, 0.06, rand() < 0.5 ? 0x5b8435 : 0x93b960, x, -0.16 + h / 2, z, {
        rz: (rand() - 0.5) * 0.5,
        castShadow: false,
      });
      if (rand() < 0.18) {
        batch.add(0.1, 0.1, 0.1, rand() < 0.5 ? 0xf2c14e : 0xe56b8f, x + 0.1, -0.05, z, {
          castShadow: false,
        });
      }
    }
    batch.flush(this.scene);
  }

  buildFence() {
    const batch = new StaticVoxelBatch();
    const radius = 10.42;
    const segments = 28;
    const woodDark = 0x6b4528;
    const wood = 0x8a5a33;
    const woodLight = 0x9c6a3e;

    for (let i = 0; i < segments; i += 1) {
      const angle = (i / segments) * TAU;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const tall = i % 7 === 0;
      const height = tall ? 1.85 : 1.55;
      batch.add(0.34, height, 0.34, woodDark, x, height / 2, z, { ry: -angle });
      batch.add(0.44, 0.1, 0.44, woodLight, x, height + 0.05, z, { ry: -angle });
      if (tall) {
        batch.add(0.12, 0.3, 0.12, 0x4e3020, x, height + 0.24, z);
        batch.add(0.2, 0.1, 0.2, 0xf2c14e, x, height + 0.42, z);
      }

      const nextAngle = ((i + 1) / segments) * TAU;
      const midAngle = (angle + nextAngle) / 2;
      const chord = 2 * radius * Math.sin(Math.PI / segments);
      const mx = Math.cos(midAngle) * radius;
      const mz = Math.sin(midAngle) * radius;
      const heights = [0.5, 0.98, 1.42];
      heights.forEach((h, index) => {
        const color = index === 1 ? wood : index === 0 ? woodDark : woodLight;
        batch.add(chord + 0.06, index === 2 ? 0.14 : 0.18, 0.15, color, mx, h, mz, {
          ry: -midAngle - Math.PI / 2,
        });
      });
    }

    // Gate posts and cross beam in the front
    for (const side of [-1, 1]) {
      const angle = Math.PI / 2 + side * 0.11;
      const x = Math.cos(angle) * (radius + 0.12);
      const z = Math.sin(angle) * (radius + 0.12);
      batch.add(0.5, 2.2, 0.5, woodDark, x, 1.1, z, { ry: -angle });
      batch.add(0.6, 0.12, 0.6, woodLight, x, 2.23, z, { ry: -angle });
      batch.add(0.16, 0.36, 0.16, 0x4e3020, x, 2.47, z);
    }
    batch.add(3.9, 0.2, 0.24, woodLight, 0, 2.25, radius + 0.1, {});
    batch.add(1.2, 0.62, 0.12, 0x4e3020, 0, 1.8, radius + 0.16);
    batch.add(0.9, 0.36, 0.06, 0xf2c14e, 0, 1.82, radius + 0.23);

    // Lantern posts
    const lanternPositions = [
      [-8.9, 0.55],
      [8.9, 0.55],
    ];
    for (const [x, z] of lanternPositions) {
      batch.add(0.14, 3.4, 0.14, woodDark, x, 1.7, z);
      batch.add(0.8, 0.12, 0.12, woodDark, x - 0.3, 3.3, z);
      batch.add(0.3, 0.42, 0.3, 0xf2a12e, x - 0.62, 3.04, z, {
        emissive: 0xff9a2e,
        emissiveIntensity: 1.2,
      });
      batch.add(0.38, 0.08, 0.38, 0x4e3020, x - 0.62, 3.28, z);
      batch.add(0.08, 0.24, 0.08, 0x4e3020, x - 0.62, 3.46, z);
    }

    batch.flush(this.scene);

    const signTexture = makeTextTexture({
      width: 1024,
      height: 320,
      draw(ctx, w, h) {
        ctx.fillStyle = '#5d341d';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#8a5a33';
        for (let i = 0; i < 6; i += 1) {
          ctx.fillRect(20 + i * 168, 16, 152, h - 32);
        }
        ctx.strokeStyle = '#3d2212';
        ctx.lineWidth = 22;
        ctx.strokeRect(11, 11, w - 22, h - 22);
        ctx.fillStyle = '#ffe9b0';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '900 122px "Arial Black", sans-serif';
        ctx.fillText('LA BURRITA', w / 2, h / 2 - 26);
        ctx.fillStyle = '#f2c14e';
        ctx.font = '800 42px "Arial", sans-serif';
        ctx.fillText('★  CORRAL DE LA FIESTA  ★', w / 2, h / 2 + 88);
      },
    });
    const signMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(4.4, 1.38),
      new THREE.MeshStandardMaterial({ map: signTexture, roughness: 0.85, side: THREE.DoubleSide }),
    );
    signMesh.position.set(0, 3.05, -11.05);
    signMesh.castShadow = true;
    signMesh.receiveShadow = true;
    this.scene.add(signMesh);

    const signFrame = new StaticVoxelBatch();
    signFrame.add(0.22, 2.4, 0.22, 0x5b3a22, -2.05, 1.2, -11.15);
    signFrame.add(0.22, 2.4, 0.22, 0x5b3a22, 2.05, 1.2, -11.15);
    signFrame.add(4.8, 0.16, 0.26, 0x5b3a22, 0, 3.82, -11.15);
    signFrame.add(4.8, 0.16, 0.26, 0x5b3a22, 0, 2.3, -11.15);
    signFrame.flush(this.scene);
  }

  /**
   * Pizarrón de Puntajes (Wooden Chalkboard Scoreboard).
   * Located at x = -6.8, z = -10.8, angled toward camera.
   */
  buildScoreboard() {
    const scoreboardGroup = new THREE.Group();
    scoreboardGroup.position.set(-6.8, 0, -10.8);
    scoreboardGroup.rotation.y = 0.38; // Angled toward camera
    this.scene.add(scoreboardGroup);

    // Frame batch for the chalkboard stand
    const frame = new StaticVoxelBatch();
    const woodDark = 0x5b3a22;
    const woodLight = 0x8a5a33;

    // Main support posts
    frame.add(0.18, 3.2, 0.18, woodDark, -1.6, 1.6, 0);
    frame.add(0.18, 3.2, 0.18, woodDark, 1.6, 1.6, 0);
    // Rear easel leg
    frame.add(0.14, 3.1, 0.14, woodDark, 0, 1.55, -0.65, { rx: 0.25 });
    // Chalkboard frame borders
    frame.add(3.4, 0.16, 0.16, woodDark, 0, 3.05, 0.05);
    frame.add(3.4, 0.16, 0.24, woodDark, 0, 1.15, 0.08); // Chalk ledge
    frame.add(0.16, 1.8, 0.14, woodDark, -1.55, 2.1, 0.05);
    frame.add(0.16, 1.8, 0.14, woodDark, 1.55, 2.1, 0.05);
    // Sticks of chalk on the bottom ledge
    frame.add(0.12, 0.04, 0.04, 0xffffff, -0.4, 1.25, 0.15, { ry: 0.2 });
    frame.add(0.12, 0.04, 0.04, 0xf2c14e, 0.3, 1.25, 0.15, { ry: -0.3 });

    // Colorful fiesta bunting flags along the top of the scoreboard
    for (let i = 0; i < 7; i += 1) {
      const fx = -1.2 + i * 0.4;
      frame.add(0.24, 0.2, 0.03, PAPEL_COLORS[i % PAPEL_COLORS.length], fx, 3.2, 0.08, {
        rz: i % 2 === 0 ? 0.15 : -0.15,
        castShadow: false,
      });
    }

    frame.flush(scoreboardGroup);

    // CanvasTexture for dynamic chalk scores and tally marks
    this.chalkboardCanvas = document.createElement('canvas');
    this.chalkboardCanvas.width = 512;
    this.chalkboardCanvas.height = 300;
    this.chalkboardCtx = this.chalkboardCanvas.getContext('2d');
    this.chalkboardTexture = new THREE.CanvasTexture(this.chalkboardCanvas);
    this.chalkboardTexture.colorSpace = THREE.SRGBColorSpace;
    this.chalkboardTexture.anisotropy = 4;

    const boardMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(3.1, 1.76),
      new THREE.MeshStandardMaterial({
        map: this.chalkboardTexture,
        roughness: 0.9,
        metalness: 0.05,
      }),
    );
    boardMesh.position.set(0, 2.1, 0.06);
    boardMesh.receiveShadow = true;
    scoreboardGroup.add(boardMesh);
  }

  /**
   * Helper to draw authentic chalk tally marks on the chalkboard.
   */
  drawChalkTallies(ctx, count, centerX, y) {
    if (count <= 0) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(centerX, y + 8, 9, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';

    const groupWidth = 44;
    const numGroups = Math.ceil(count / 5);
    const startX = centerX - ((numGroups - 1) * (groupWidth + 14)) / 2;

    let remaining = count;
    for (let g = 0; g < numGroups; g += 1) {
      const gx = startX + g * (groupWidth + 14);
      const sticks = Math.min(4, remaining);
      for (let s = 0; s < sticks; s += 1) {
        const sx = gx - groupWidth / 2 + s * 11 + 6;
        ctx.beginPath();
        ctx.moveTo(sx, y - 11);
        ctx.lineTo(sx + (s % 2 === 0 ? 1 : -1), y + 16);
        ctx.stroke();
      }
      if (remaining >= 5) {
        ctx.beginPath();
        ctx.moveTo(gx - groupWidth / 2 + 1, y + 13);
        ctx.lineTo(gx + groupWidth / 2 - 1, y - 8);
        ctx.stroke();
      }
      remaining -= 5;
      if (remaining <= 0) break;
    }
  }

  /**
   * Updates the Chalkboard Scoreboard with scores, current round, and player names.
   */
  updateScoreboard(score = [0, 0], round = 1, p1Label = 'P1', p2Label = 'P2') {
    if (!this.chalkboardCtx || !this.chalkboardTexture) return;
    const ctx = this.chalkboardCtx;
    const w = this.chalkboardCanvas.width;
    const h = this.chalkboardCanvas.height;

    // Dark chalk slate background with dusty texture
    ctx.fillStyle = '#1c2826';
    ctx.fillRect(0, 0, w, h);

    const rand = mulberry32(42);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    for (let i = 0; i < 22; i += 1) {
      ctx.beginPath();
      ctx.arc(rand() * w, rand() * h, 30 + rand() * 80, 0, Math.PI * 2);
      ctx.fill();
    }

    // Hand-drawn chalk borders
    ctx.strokeStyle = 'rgba(235, 245, 240, 0.55)';
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.strokeStyle = 'rgba(235, 245, 240, 0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(14, 14, w - 28, h - 28);

    // Top Header: ROUND
    ctx.fillStyle = '#ffd152';
    ctx.font = '900 28px "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`★ ROUND ${round} ★`, w / 2, 22);

    // Divider line
    ctx.strokeStyle = 'rgba(255, 209, 82, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(35, 58);
    ctx.lineTo(w - 35, 58);
    ctx.stroke();

    // Center vertical chalk line
    ctx.strokeStyle = 'rgba(235, 245, 240, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w / 2, 65);
    ctx.lineTo(w / 2, h - 25);
    ctx.stroke();

    // Player 1 Column
    ctx.fillStyle = '#7ed6df';
    ctx.font = '800 24px "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(p1Label).toUpperCase(), w * 0.25, 70);

    // Player 1 Score big number
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 64px "Arial Black", sans-serif';
    ctx.fillText(String(score[0] ?? 0), w * 0.25, 102);

    // Player 1 Chalk tallies
    this.drawChalkTallies(ctx, score[0] ?? 0, w * 0.25, 185);

    // Player 2 Column
    ctx.fillStyle = '#ff7979';
    ctx.font = '800 24px "Arial Black", sans-serif';
    ctx.fillText(String(p2Label).toUpperCase(), w * 0.75, 70);

    // Player 2 Score big number
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 64px "Arial Black", sans-serif';
    ctx.fillText(String(score[1] ?? 0), w * 0.75, 102);

    // Player 2 Chalk tallies
    this.drawChalkTallies(ctx, score[1] ?? 0, w * 0.75, 185);

    // Bottom decorative tagline
    ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
    ctx.font = '700 13px sans-serif';
    ctx.fillText('PUNTAJES  •  LA BURRITA', w / 2, h - 22);

    this.chalkboardTexture.needsUpdate = true;
  }

  /**
   * Two decorated wooden starting perch platforms right at the fence edge.
   * Allows the Chihuahuas to pose majestically before leaping onto their burritas!
   */
  buildPerches() {
    const batch = new StaticVoxelBatch();
    const woodDark = 0x5b3a22;
    const woodLight = 0x8a5a33;

    for (const [x, z, angle] of [
      [-8.6, 0.85, 0.2],
      [8.6, 0.85, -0.2],
    ]) {
      // Main wooden podium post
      batch.add(0.52, 1.65, 0.52, woodDark, x, 0.825, z);
      // Platform top deck
      batch.add(0.92, 0.14, 0.92, woodLight, x, 1.58, z);
      batch.add(0.96, 0.04, 0.96, 0x9c6a3e, x, 1.63, z);
      // Support braces
      batch.add(0.14, 0.5, 0.14, woodDark, x, 1.25, z + 0.35, { rx: 0.5 });
      batch.add(0.14, 0.5, 0.14, woodDark, x, 1.25, z - 0.35, { rx: -0.5 });
      // Festive fiesta sash wrapped around post
      batch.add(0.56, 0.24, 0.56, 0xe63946, x, 1.35, z);
      batch.add(0.58, 0.08, 0.58, 0xf2c14e, x, 1.35, z);
    }
    batch.flush(this.scene);
  }

  /**
   * Exposes the perch positions for P1 and P2 dog intro presentations.
   */
  getPerchPositions() {
    return {
      p1: new THREE.Vector3(-8.6, 1.65, 0.85),
      p2: new THREE.Vector3(8.6, 1.65, 0.85),
    };
  }

  /**
   * 4 bouncy hay bale bumpers nestled right against the inside of the wooden fence
   * at diagonal angles.
   */
  buildHayBales() {
    const angles = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
    const radius = 9.35;

    for (const angle of angles) {
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const group = new THREE.Group();
      group.position.set(x, 0, z);
      group.rotation.y = -angle - Math.PI / 2; // Aligned with the fence curve
      this.scene.add(group);

      const batch = new StaticVoxelBatch();
      // Bottom hay bales
      batch.add(1.4, 0.65, 0.85, 0xe3b55c, -0.65, 0.32, 0);
      batch.add(1.4, 0.65, 0.85, 0xd7a94f, 0.65, 0.32, 0);
      // Twine tie bands
      batch.add(0.08, 0.68, 0.88, 0x8a6225, -0.95, 0.32, 0);
      batch.add(0.08, 0.68, 0.88, 0x8a6225, -0.35, 0.32, 0);
      batch.add(0.08, 0.68, 0.88, 0x8a6225, 0.35, 0.32, 0);
      batch.add(0.08, 0.68, 0.88, 0x8a6225, 0.95, 0.32, 0);

      // Top stacked hay bale
      batch.add(1.35, 0.62, 0.82, 0xdeb156, 0, 0.92, -0.04, { ry: 0.08 });
      batch.add(0.08, 0.65, 0.85, 0x8a6225, -0.32, 0.92, -0.04);
      batch.add(0.08, 0.65, 0.85, 0x8a6225, 0.32, 0.92, -0.04);

      // A few loose hay sprigs sticking out
      batch.add(0.08, 0.05, 0.35, 0xf0c868, 0.4, 0.04, 0.5, { ry: 0.4, castShadow: false });
      batch.add(0.08, 0.05, 0.35, 0xf0c868, -0.5, 0.04, 0.45, { ry: -0.6, castShadow: false });

      batch.flush(group);

      this.hayBales.push({
        group,
        position: new THREE.Vector3(x, 0, z),
        x,
        z,
        angle,
        bounceTimer: 0,
      });
    }
  }

  /**
   * Checks collision with any of the 4 bouncy hay bale bumpers.
   * Returns { normal, point, bale } or null.
   */
  checkHayBaleBounce(position, radius = 0.95) {
    if (!position) return null;
    const hitDistance = radius + 0.85;

    for (const bale of this.hayBales) {
      const dx = position.x - bale.x;
      const dz = position.z - bale.z;
      const dist = Math.hypot(dx, dz);

      if (dist < hitDistance) {
        // Trigger visual pop animation
        bale.bounceTimer = 0.4;
        // Inward normal pointing toward arena center
        const normal = new THREE.Vector3(-bale.x, 0, -bale.z).normalize();
        const point = new THREE.Vector3(
          bale.x + normal.x * 0.75,
          0.38,
          bale.z + normal.z * 0.75,
        );
        return { normal, point, bale };
      }
    }
    return null;
  }

  buildStands() {
    const rand = mulberry32(4242);
    let standIndex = 0;

    const buildStand = (x, z, rotation, width, isCovered = false) => {
      const stand = new THREE.Group();
      stand.position.set(x, -0.18, z);
      stand.rotation.y = rotation;
      this.scene.add(stand);
      const structure = new StaticVoxelBatch();
      const rows = 3;

      for (let row = 0; row < rows; row += 1) {
        const rowZ = -0.9 - row * 1.5;
        const topY = 0.4 + row * 0.62;
        structure.add(width, 0.2, 1.6, row === 1 ? 0x8a5a33 : 0x7b4d2c, 0, topY, rowZ);
        structure.add(width, 0.55, 0.14, 0x5b3a22, 0, topY - 0.3, rowZ - 0.75);
        structure.add(0.16, 0.75, 0.16, 0x4e3020, -width / 2 + 0.25, topY - 0.3, rowZ - 0.68);
        structure.add(0.16, 0.75, 0.16, 0x4e3020, width / 2 - 0.25, topY - 0.3, rowZ - 0.68);
      }
      structure.add(width, 0.1, 0.3, 0x4e3020, 0, 2.4, -4.4);
      structure.add(0.2, 2.6, 0.2, 0x4e3020, -width / 2 + 0.3, 1.1, -4.3);
      structure.add(0.2, 2.6, 0.2, 0x4e3020, width / 2 - 0.3, 1.1, -4.3);

      // Bunting along the front rail
      for (let i = 0; i < 12; i += 1) {
        structure.add(0.3, 0.26, 0.04, PAPEL_COLORS[i % PAPEL_COLORS.length], -width / 2 + 0.6 + i * ((width - 1.2) / 11), 2.3, -4.23, {
          rz: Math.PI / 4,
          castShadow: false,
        });
      }

      // Wooden pergola / roof structure for covered stand (matching reference image)
      if (isCovered) {
        const timber = 0x5b3a22;
        const roofSlat = 0x7b4d2c;
        const postH = 5.2;

        // 4 corner timber posts
        const postPositions = [
          [-width / 2 + 0.35, 0.4],
          [width / 2 - 0.35, 0.4],
          [-width / 2 + 0.35, -4.6],
          [width / 2 - 0.35, -4.6],
        ];
        for (const [px, pz] of postPositions) {
          structure.add(0.26, postH, 0.26, timber, px, postH / 2, pz);
        }

        // Longitudinal top beams
        structure.add(width + 0.4, 0.24, 0.28, timber, 0, postH - 0.15, 0.4);
        structure.add(width + 0.4, 0.24, 0.28, timber, 0, postH + 0.25, -4.6);

        // Slanted rafters across the top
        for (let r = 0; r < 7; r += 1) {
          const rx = -width / 2 + 0.5 + r * ((width - 1.0) / 6);
          structure.add(0.18, 0.22, 5.2, timber, rx, postH + 0.08, -2.1, { rx: -0.08 });
        }

        // Rustic wooden roof planks
        for (let s = 0; s < 10; s += 1) {
          const sz = -4.5 + s * 0.52;
          structure.add(width + 0.5, 0.08, 0.48, roofSlat, 0, postH + 0.2 + s * 0.04, sz, { rx: -0.08 });
        }

        // Hanging fiesta papel picado bunting under the front eave
        for (let b = 0; b < 11; b += 1) {
          const bx = -width / 2 + 0.6 + b * ((width - 1.2) / 10);
          structure.add(0.32, 0.28, 0.03, PAPEL_COLORS[b % PAPEL_COLORS.length], bx, postH - 0.42, 0.42, {
            rz: b % 2 === 0 ? 0.18 : -0.18,
            castShadow: false,
          });
        }

        // Warm glowing lanterns hanging from rafters
        for (const lx of [-2.4, 2.4]) {
          structure.add(0.06, 0.6, 0.06, 0x3a2517, lx, postH - 0.45, -1.8);
          structure.add(0.3, 0.42, 0.3, 0xf29c2b, lx, postH - 0.85, -1.8, {
            emissive: 0xff9922,
            emissiveIntensity: 1.8,
          });
          structure.add(0.38, 0.08, 0.38, 0x4e3020, lx, postH - 0.61, -1.8);
          structure.add(0.38, 0.08, 0.38, 0x4e3020, lx, postH - 1.08, -1.8);
        }
      }

      structure.flush(stand);

      for (let row = 0; row < rows; row += 1) {
        const rowGroup = new THREE.Group();
        stand.add(rowGroup);
        const crowd = new StaticVoxelBatch();
        const rowZ = -0.75 - row * 1.5;
        const baseY = 0.5 + row * 0.62;
        const count = Math.max(4, Math.floor(width / 0.95));
        for (let i = 0; i < count; i += 1) {
          const px = -width / 2 + 0.75 + i * ((width - 1.5) / Math.max(1, count - 1));
          addSpectator(
            crowd,
            px + (rand() - 0.5) * 0.18,
            baseY + (rand() - 0.5) * 0.04,
            rowZ + (rand() - 0.5) * 0.12,
            rand,
            i + row * 3 + standIndex * 7,
            isCovered,
          );
        }
        crowd.flush(rowGroup);
        rowGroup.traverse((child) => {
          if (child.isMesh) child.castShadow = false;
        });
        this.crowdRows.push({
          group: rowGroup,
          phase: standIndex * 1.7 + row * 0.9,
          amp: 0.014 + row * 0.003,
        });
      }
      standIndex += 1;
    };

    // Build the 3 spectator stands:
    // Back stand
    buildStand(0, -14.8, 0, 16, false);
    // Left stand
    buildStand(-15.2, -2.2, Math.PI / 2, 9.5, false);
    // Right stand (covered pergola with lively farm spectators, matching concept art!)
    buildStand(15.2, -2.2, -Math.PI / 2, 9.5, true);

    // Bunting strings above the back stand
    const bunting = new StaticVoxelBatch();
    for (let i = 0; i < 22; i += 1) {
      const x = -8 + i * 0.76;
      const sag = 0.4 * (1 - (x / 8) ** 2);
      bunting.add(0.32, 0.28, 0.04, PAPEL_COLORS[i % PAPEL_COLORS.length], x, 5.2 - sag, -14.1, {
        rz: Math.PI / 4,
        castShadow: false,
      });
    }
    bunting.flush(this.scene);
  }

  buildScenery() {
    const rand = mulberry32(808);
    const batch = new StaticVoxelBatch();

    // Hay bales outside the fence
    const baleAngles = [0.72, 2.42, 3.95, 5.5];
    for (const angle of baleAngles) {
      const radius = 12.1;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const ry = -angle;
      for (let i = 0; i < 3; i += 1) {
        const offset = (i - 1) * 0.35;
        batch.add(1.55, 0.72, 1.05, i === 1 ? 0xd7a94f : 0xe3b55c, x + offset, 0.18, z, { ry });
        batch.add(1.6, 0.08, 1.1, 0xb68738, x + offset, 0.15, z, { ry });
        batch.add(0.12, 0.75, 1.08, 0x9a7130, x + offset, 0.18, z, { ry });
      }
      batch.add(1.5, 0.65, 1.0, 0xcf9f49, x, 0.9, z, { ry });
      batch.add(0.12, 0.68, 1.04, 0x9a7130, x, 0.9, z, { ry });
      for (let i = 0; i < 6; i += 1) {
        batch.add(0.08, 0.06, 0.3, 0xe9c36e, x + (rand() - 0.5) * 1.8, 0.04, z + (rand() - 0.5) * 1.6, {
          ry: rand() * TAU,
          castShadow: false,
        });
      }
    }

    // Barrels by the gate
    for (const [x, z] of [
      [4.8, 11.6],
      [5.7, 12.3],
    ]) {
      batch.add(0.72, 1.2, 0.72, 0x8a5a33, x, 0.42, z);
      batch.add(0.82, 0.12, 0.82, 0x4e3020, x, 0.32, z);
      batch.add(0.82, 0.12, 0.82, 0x4e3020, x, 0.86, z);
      batch.add(0.74, 0.08, 0.74, 0x9c6a3e, x, 1.03, z);
    }

    // Trees
    const trees = [
      [-19, -11, 1.15],
      [18.5, -10, 1.0],
      [-21, 8, 0.9],
      [22, 7, 1.1],
    ];
    for (const [x, z, scale] of trees) {
      const trunkH = 2.9 * scale;
      batch.add(0.7 * scale, trunkH, 0.7 * scale, 0x6b4528, x, -0.16 + trunkH / 2, z);
      batch.add(0.8 * scale, 0.3, 0.8 * scale, 0x51331d, x, 0.0, z);
      const leaves = [
        [0, trunkH + 0.7, 0, 2.6, 2.0, 2.5],
        [-1.1, trunkH + 0.4, 0.2, 1.8, 1.5, 1.8],
        [1.15, trunkH + 0.5, -0.15, 1.9, 1.6, 1.9],
        [0.2, trunkH + 1.7, 0.1, 1.8, 1.2, 1.7],
      ];
      for (const [lx, ly, lz, w, h, d] of leaves) {
        batch.add(
          w * scale,
          h * scale,
          d * scale,
          rand() < 0.5 ? 0x6f9e46 : 0x598c39,
          x + lx * scale,
          -0.16 + ly * scale,
          z + lz * scale,
        );
      }
      batch.add(0.16 * scale, 0.5, 0.16 * scale, 0x7a4a2a, x, -0.16 + trunkH * 0.55, z + 0.36 * scale);
    }

    // Distant blocky hills
    const hills = [
      [-34, -45, 16, 7],
      [6, -50, 22, 8],
      [38, -34, 15, 6],
      [-46, -12, 14, 5],
    ];
    for (const [x, z, w, h] of hills) {
      batch.add(w, h, 12, 0x6f9658, x, -0.18 + h / 2, z);
      batch.add(w * 0.7, h * 0.45, 9, 0x7ea663, x + 3, -0.18 + h * 0.72, z + 1);
    }

    // Barn, off to the right of the back stand
    const barn = new THREE.Group();
    barn.position.set(9.5, -0.18, -27);
    barn.rotation.y = -0.12;
    this.scene.add(barn);
    const barnBatch = new StaticVoxelBatch();
    barnBatch.add(9, 5.2, 7.5, 0xa84c34, 0, 2.6, 0);
    barnBatch.add(9.4, 0.7, 7.9, 0xf0e5cc, 0, 0.35, 0);
    barnBatch.add(2.8, 3.6, 0.2, 0x6b2c20, 0, 1.9, 3.82);
    barnBatch.add(3.1, 0.3, 0.16, 0xf0e5cc, 0, 3.75, 3.86);
    barnBatch.add(2.1, 0.22, 0.14, 0xf0e5cc, 0, 1.95, 3.92, { rz: Math.PI / 4 });
    barnBatch.add(2.1, 0.22, 0.14, 0xf0e5cc, 0, 1.95, 3.92, { rz: -Math.PI / 4 });
    for (const [x, y] of [
      [-3.4, 3.9],
      [3.4, 3.9],
    ]) {
      barnBatch.add(1.4, 1.4, 0.18, 0x5b2b20, x, y, 3.82);
      barnBatch.add(1.5, 0.2, 0.2, 0xf0e5cc, x, y + 0.78, 3.86);
    }
    barnBatch.add(10.4, 1.1, 8.9, 0x6b2d24, 0, 5.8, 0);
    barnBatch.add(8.4, 1.0, 7.1, 0x8a3a2a, 0, 6.5, 0);
    barnBatch.add(6.4, 0.8, 5.2, 0x6b2d24, 0, 7.1, 0);
    barnBatch.add(1.2, 1.1, 1.2, 0xf0e5cc, 0, 7.9, 0);
    barnBatch.add(1.4, 0.18, 1.4, 0x6b2d24, 0, 8.55, 0);
    barnBatch.flush(barn);

    const barnSignTexture = makeTextTexture({
      width: 768,
      height: 192,
      draw(ctx, w, h) {
        ctx.fillStyle = '#5b2b20';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#f0e5cc';
        ctx.lineWidth = 12;
        ctx.strokeRect(10, 10, w - 20, h - 20);
        ctx.fillStyle = '#f2c14e';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '900 92px "Arial Black", sans-serif';
        ctx.fillText('LA BURRITA', w / 2, h / 2 + 4);
      },
    });
    const barnSign = new THREE.Mesh(
      new THREE.PlaneGeometry(4.2, 1.05),
      new THREE.MeshStandardMaterial({ map: barnSignTexture, roughness: 0.8 }),
    );
    barnSign.position.set(0, 4.5, 3.78);
    barn.add(barnSign);

    // Silo
    batch.add(3.2, 5.5, 3.2, 0x8b939c, -10.5, 2.55, -26);
    batch.add(3.6, 0.5, 3.6, 0x6b747e, -10.5, 5.35, -26);
    batch.add(2.8, 1.1, 2.8, 0x9aa3ad, -10.5, 6.0, -26);
    batch.add(1.5, 0.8, 1.5, 0x6b747e, -10.5, 6.8, -26);

    batch.flush(this.scene);
  }

  buildGarlands() {
    const flagGeometry = createFlagGeometry();
    flagGeometry.scale(0.76, 0.76, 0.76);
    const flagMaterial = new THREE.MeshStandardMaterial({
      side: THREE.DoubleSide,
      roughness: 0.85,
      metalness: 0,
    });
    const count = 15 * 2;
    const mesh = new THREE.InstancedMesh(flagGeometry, flagMaterial, count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    this.scene.add(mesh);
    this.flagMesh = mesh;

    const strings = [
      { z: -4.3, y: 7.15, sag: 0.5 },
      { z: 3.3, y: 7.5, sag: 0.42 },
    ];
    const colors = new THREE.Color();
    const stringMaterial = new THREE.LineBasicMaterial({ color: 0x4a3422, transparent: true, opacity: 0.75 });
    let index = 0;

    for (const [stringIndex, string] of strings.entries()) {
      const points = [];
      for (let i = 0; i <= 28; i += 1) {
        const x = -11.2 + (22.4 * i) / 28;
        const sag = string.sag * (1 - (x / 11.2) ** 2);
        points.push(new THREE.Vector3(x, string.y - sag, string.z));
      }
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), stringMaterial);
      this.scene.add(line);

      for (let i = 0; i < 15; i += 1) {
        const x = -10.6 + (21.2 * i) / 14;
        const sag = string.sag * (1 - (x / 11.2) ** 2);
        this.flags.push({
          index,
          x,
          y: string.y - sag - 0.02,
          z: string.z,
          phase: i * 0.65 + stringIndex * 1.3,
          speed: 0.7 + (i % 3) * 0.12,
        });
        mesh.setColorAt(index, colors.setHex(PAPEL_COLORS[(i + stringIndex * 3) % PAPEL_COLORS.length]));
        index += 1;
      }
    }
    mesh.instanceColor.needsUpdate = true;
    this.updateFlags(0);

    // Poles holding the garlands
    const poleBatch = new StaticVoxelBatch();
    for (const z of [-4.3, 3.3]) {
      for (const x of [-11.35, 11.35]) {
        poleBatch.add(0.2, 8.3, 0.2, 0x6b4528, x, 3.95, z);
        poleBatch.add(0.26, 0.26, 0.26, 0xf2c14e, x, 8.1, z);
        poleBatch.add(0.5, 0.14, 0.5, 0x4e3020, x, 0.02, z);
      }
    }
    poleBatch.flush(this.scene);
  }

  updateFlags(time) {
    if (!this.flagMesh) return;
    const dummy = this.dummy ?? new THREE.Object3D();
    for (const flag of this.flags) {
      const sway = Math.sin(time * flag.speed + flag.phase) * 0.12;
      const swayX = Math.sin(time * flag.speed * 0.7 + flag.phase * 1.7) * 0.05;
      dummy.position.set(
        flag.x + Math.sin(time * 0.5 + flag.phase) * 0.03,
        flag.y,
        flag.z + Math.cos(time * flag.speed + flag.phase) * 0.04,
      );
      dummy.rotation.set(swayX, 0, sway);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      this.flagMesh.setMatrixAt(flag.index, dummy.matrix);
    }
    this.flagMesh.instanceMatrix.needsUpdate = true;
  }

  buildDustAndBirds() {
    const rand = mulberry32(77);
    const count = 90;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const angle = rand() * TAU;
      const radius = 2 + rand() * 8;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = 0.5 + rand() * 5.2;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      map: this.dotTexture,
      color: 0xffe6a8,
      size: 0.13,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      toneMapped: false,
    });
    this.ambientDust = new THREE.Points(geometry, material);
    this.scene.add(this.ambientDust);

    for (let i = 0; i < 4; i += 1) {
      const bird = new THREE.Group();
      const wingL = new THREE.Group();
      const wingR = new THREE.Group();
      const wingMat = new THREE.MeshBasicMaterial({ color: 0x4a3a2c, toneMapped: false });
      const wingGeo = new THREE.BoxGeometry(0.5, 0.04, 0.12);
      const left = new THREE.Mesh(wingGeo, wingMat);
      left.position.x = -0.26;
      const right = new THREE.Mesh(wingGeo, wingMat);
      right.position.x = 0.26;
      wingL.add(left);
      wingR.add(right);
      bird.add(wingL, wingR);
      bird.position.y = 13 + i * 1.2;
      bird.userData = {
        radius: 18 + i * 4,
        angle: i * 1.7,
        speed: 0.08 + i * 0.01,
        wingL,
        wingR,
        flap: i,
      };
      this.scene.add(bird);
      this.birds.push(bird);
    }

    const cloudRand = mulberry32(1312);
    const cloudSpots = [
      [-26, 20, -26],
      [18, 23, -38],
      [38, 18, -10],
      [-40, 17, 4],
      [6, 25, -55],
    ];
    for (const [x, y, z] of cloudSpots) {
      const cloud = new THREE.Group();
      cloud.position.set(x, y, z);
      const batch = new StaticVoxelBatch();
      const parts = 3 + Math.floor(cloudRand() * 3);
      for (let i = 0; i < parts; i += 1) {
        const w = 3 + cloudRand() * 4;
        const h = 0.9 + cloudRand() * 1.1;
        const d = 2 + cloudRand() * 2.5;
        batch.add(w, h, d, cloudRand() < 0.5 ? 0xfff7e7 : 0xf3ead8, (i - parts / 2) * 2.4, cloudRand() * 0.8, cloudRand() * 1.2, {
          castShadow: false,
          receiveShadow: false,
        });
      }
      batch.flush(cloud);
      cloud.userData.drift = 0.25 + cloudRand() * 0.25;
      this.scene.add(cloud);
      this.clouds.push(cloud);
    }
  }

  /**
   * Golden Corn System:
   * 1. Intro/Menu Corn Clusters (around chicken pecking points)
   * 2. Interactive Fight Corn Pickups (with glowing rings & floating cobs)
   */
  buildCornSystem() {
    const rand = mulberry32(101);
    this.introCornGroup = new THREE.Group();
    this.scene.add(this.introCornGroup);

    const kernelGeo = new THREE.BoxGeometry(0.12, 0.08, 0.16);
    const kernelMat = new THREE.MeshStandardMaterial({
      color: 0xffcc11,
      roughness: 0.35,
      metalness: 0.05,
      emissive: 0x442600,
    });

    // Centers where chickens peck during menu/intro
    const peckCenters = [
      [-1.6, 0.8],
      [1.6, 0.6],
    ];

    // Scatter ~45 golden 3D corn kernels
    for (let i = 0; i < 46; i += 1) {
      const center = peckCenters[i % peckCenters.length];
      const jx = center[0] + (rand() - 0.5) * 1.1;
      const jz = center[1] + (rand() - 0.5) * 1.1;
      const kernel = new THREE.Mesh(kernelGeo, kernelMat);
      kernel.position.set(jx, 0.04, jz);
      kernel.rotation.set((rand() - 0.5) * 0.3, rand() * TAU, (rand() - 0.5) * 0.3);
      kernel.scale.set(0.9 + rand() * 0.3, 0.9 + rand() * 0.3, 0.9 + rand() * 0.3);
      kernel.receiveShadow = true;
      this.introCornGroup.add(kernel);
    }

    // Mini corn cob chunks
    const cobGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.34, 6);
    cobGeo.rotateZ(Math.PI / 2);
    for (let c = 0; c < 4; c += 1) {
      const center = peckCenters[c % peckCenters.length];
      const cob = new THREE.Mesh(cobGeo, kernelMat);
      cob.position.set(center[0] + (rand() - 0.5) * 0.9, 0.07, center[1] + (rand() - 0.5) * 0.9);
      cob.rotation.y = rand() * TAU;
      this.introCornGroup.add(cob);
    }

    // Interactive Fight Corn Pickups (pool of 2 pickups)
    this.cornPickups = [];
    for (let i = 0; i < 2; i += 1) {
      const pickupGroup = new THREE.Group();
      pickupGroup.visible = false;

      // Glowing pulsing ring on the ground
      const ringGeo = new THREE.RingGeometry(0.48, 0.74, 32);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xffd700,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.y = 0.016;
      pickupGroup.add(ringMesh);

      // Floating golden corn cob cluster
      const cluster = new THREE.Group();
      cluster.position.y = 0.38;

      const mainCobGeo = new THREE.CylinderGeometry(0.12, 0.13, 0.48, 8);
      mainCobGeo.rotateZ(Math.PI / 5);
      const mainCobMat = new THREE.MeshStandardMaterial({
        color: 0xffc416,
        roughness: 0.3,
        emissive: 0x553500,
        emissiveIntensity: 1.2,
      });
      const mainCob = new THREE.Mesh(mainCobGeo, mainCobMat);
      cluster.add(mainCob);

      // Green husk leaves at base of cob
      const huskMat = new THREE.MeshStandardMaterial({ color: 0x6e9c38, roughness: 0.7 });
      const husk1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.12), huskMat);
      husk1.position.set(-0.14, -0.14, 0);
      husk1.rotation.z = -0.4;
      cluster.add(husk1);

      // Floating golden kernels
      for (let k = 0; k < 4; k += 1) {
        const kAngle = (k / 4) * TAU;
        const kMesh = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.11), mainCobMat);
        kMesh.position.set(Math.cos(kAngle) * 0.28, Math.sin(kAngle) * 0.08, Math.sin(kAngle) * 0.28);
        cluster.add(kMesh);
      }
      pickupGroup.add(cluster);
      this.scene.add(pickupGroup);

      this.cornPickups.push({
        group: pickupGroup,
        ring: ringMesh,
        cluster,
        position: new THREE.Vector3(),
        active: false,
        phase: i * 2.5,
      });
    }
  }

  /**
   * Resets the intro corn kernels (called during menu / intro presentation).
   */
  resetCornForIntro() {
    if (this.introCornGroup) {
      this.introCornGroup.visible = true;
    }
  }

  /**
   * Scatters golden corn on fight start when chickens panic and bolt!
   */
  scatterCornOnStart(particles) {
    if (this.introCornGroup) {
      this.introCornGroup.visible = false;
    }
    const p1Pos = new THREE.Vector3(-1.6, 0.25, 0.8);
    const p2Pos = new THREE.Vector3(1.6, 0.25, 0.6);

    if (particles?.corn) {
      particles.corn(p1Pos, 18);
      particles.corn(p2Pos, 18);
    } else if (particles?.spark) {
      particles.spark(p1Pos, 18, { color: 0xffd23f, speed: 4.2 });
      particles.spark(p2Pos, 18, { color: 0xffd23f, speed: 4.2 });
    }
    if (particles?.dust) {
      particles.dust(p1Pos, 8, { color: 0xe6b345, scale: 0.18 });
      particles.dust(p2Pos, 8, { color: 0xe6b345, scale: 0.18 });
    }
  }

  /**
   * Spawns an active corn pickup at a random safe spot inside the ring (radius 1.8 to 7.2)
   * if fewer than 2 pickups are currently active.
   */
  spawnCornPickup(position = null) {
    const activeCount = this.cornPickups.filter((p) => p.active).length;
    if (activeCount >= 2) return null;
    const pickup = this.cornPickups.find((p) => !p.active);
    if (!pickup) return null;

    let targetPos = null;
    if (position) {
      targetPos = position.clone();
    } else {
      // Find a safe spot inside ring: radius between 1.8 and 7.2
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const angle = Math.random() * TAU;
        const radius = 1.8 + Math.random() * (7.2 - 1.8);
        const cand = new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
        const otherActive = this.cornPickups.find((p) => p.active && p !== pickup);
        if (!otherActive || cand.distanceTo(otherActive.position) > 3.2) {
          targetPos = cand;
          break;
        }
      }
      if (!targetPos) {
        const a = Math.random() * TAU;
        targetPos = new THREE.Vector3(Math.cos(a) * 4.2, 0, Math.sin(a) * 4.2);
      }
    }

    pickup.position.copy(targetPos);
    pickup.group.position.set(targetPos.x, 0, targetPos.z);
    pickup.active = true;
    pickup.group.visible = true;
    return pickup;
  }

  /**
   * Deactivates all fight corn pickups.
   */
  clearCornPickups() {
    for (const pickup of this.cornPickups) {
      pickup.active = false;
      pickup.group.visible = false;
    }
  }

  /**
   * Checks if position is within radius of an active corn pickup.
   * If so, consumes it and returns { position, heal: 16, boost: 3.5 }.
   */
  checkCornPickup(position, radius = 1.15) {
    if (!position) return null;
    for (const pickup of this.cornPickups) {
      if (!pickup.active) continue;
      const dx = position.x - pickup.position.x;
      const dz = position.z - pickup.position.z;
      if (Math.hypot(dx, dz) <= radius) {
        pickup.active = false;
        pickup.group.visible = false;
        return {
          position: pickup.position.clone(),
          heal: 16,
          boost: 3.5,
        };
      }
    }
    return null;
  }

  /**
   * Skid marks system: 120 flat dark-earth scuff rectangles on the dirt.
   */
  buildSkidSystem() {
    const geom = new THREE.PlaneGeometry(0.28, 0.55);
    geom.rotateX(-Math.PI / 2); // Lay flat on XZ ground

    const mat = new THREE.MeshBasicMaterial({
      color: 0x4e301d,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
    });

    const count = 120;
    this.skidMesh = new THREE.InstancedMesh(geom, mat, count);
    this.skidMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.skidMesh.frustumCulled = false;
    this.skidMesh.renderOrder = 1;
    this.scene.add(this.skidMesh);

    this.skidMarks = [];
    const dummy = this.dummy ?? new THREE.Object3D();
    for (let i = 0; i < count; i += 1) {
      this.skidMarks.push({
        index: i,
        active: false,
        x: 0,
        z: 0,
        heading: 0,
        life: 0,
        maxLife: 4.5,
      });
      dummy.position.set(0, -100, 0);
      dummy.scale.set(0, 0, 0);
      dummy.updateMatrix();
      this.skidMesh.setMatrixAt(i, dummy.matrix);
    }
    this.skidMesh.instanceMatrix.needsUpdate = true;
    this.skidCursor = 0;
  }

  /**
   * Adds a dark-earth claw/foot drift skid mark at (x, 0.012, z) oriented along heading.
   */
  addSkidMark(x, z, heading) {
    if (!this.skidMesh) return;
    const mark = this.skidMarks[this.skidCursor];
    this.skidCursor = (this.skidCursor + 1) % this.skidMarks.length;

    mark.active = true;
    mark.x = x;
    mark.z = z;
    mark.heading = heading;
    mark.life = 4.5;
    mark.maxLife = 4.5;

    const dummy = this.dummy ?? new THREE.Object3D();
    dummy.position.set(x, 0.012, z);
    dummy.rotation.set(0, -heading, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    this.skidMesh.setMatrixAt(mark.index, dummy.matrix);
    this.skidMesh.instanceMatrix.needsUpdate = true;
  }

  cheer() {
    this.cheerTimer = 4.5;
  }

  update(dt) {
    this.time += dt;
    const time = this.time;
    this.cheerTimer = Math.max(0, this.cheerTimer - dt);
    const cheer = this.cheerTimer > 0 ? Math.min(1, this.cheerTimer * 0.85) : 0;

    this.updateFlags(time);

    // Energetic crowd cheering & bouncing
    for (const row of this.crowdRows) {
      const amp = row.amp + cheer * 0.06;
      row.group.position.y = Math.sin(time * (2.2 + cheer * 5.0) + row.phase) * amp;
      row.group.rotation.z = Math.sin(time * (2.6 + cheer * 3.5) + row.phase) * (cheer * 0.025);
    }

    // Clouds drifting
    for (const cloud of this.clouds) {
      cloud.position.x += cloud.userData.drift * dt;
      if (cloud.position.x > 52) cloud.position.x = -52;
      cloud.position.y += Math.sin(time * 0.2 + cloud.position.x) * dt * 0.05;
    }

    // Birds circling overhead
    for (const bird of this.birds) {
      const data = bird.userData;
      data.angle += data.speed * dt;
      bird.position.x = Math.cos(data.angle) * data.radius;
      bird.position.z = Math.sin(data.angle) * data.radius - 8;
      bird.rotation.y = -data.angle + Math.PI / 2;
      const flap = Math.sin(time * 9 + data.flap) * 0.55;
      data.wingL.rotation.z = flap;
      data.wingR.rotation.z = -flap;
    }

    // Hay bale bounce squash-and-stretch recovery
    for (const bale of this.hayBales) {
      if (bale.bounceTimer > 0) {
        bale.bounceTimer = Math.max(0, bale.bounceTimer - dt);
        const p = 1 - bale.bounceTimer / 0.4;
        const pop = Math.sin(p * Math.PI * 3) * Math.exp(-p * 3.5) * 0.35;
        bale.group.scale.set(1 + pop * 0.45, 1 - pop * 0.4, 1 + pop * 0.45);
      } else {
        bale.group.scale.set(1, 1, 1);
      }
    }

    // Corn pickup animations (pulse ground ring and bob floating cobs)
    for (const pickup of this.cornPickups) {
      if (pickup.active) {
        pickup.ring.rotation.z += dt * 1.8;
        const pulse = 1 + Math.sin(time * 4.2 + pickup.phase) * 0.12;
        pickup.ring.scale.set(pulse, pulse, 1);
        pickup.cluster.position.y = 0.38 + Math.sin(time * 3.2 + pickup.phase) * 0.08;
        pickup.cluster.rotation.y += dt * 2.2;
      }
    }

    // Skid marks fading and expiring
    if (this.skidMesh) {
      let skidNeedsUpdate = false;
      const dummy = this.dummy ?? new THREE.Object3D();
      for (const mark of this.skidMarks) {
        if (!mark.active) continue;
        mark.life -= dt;
        if (mark.life <= 0) {
          mark.active = false;
          dummy.position.set(0, -100, 0);
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          this.skidMesh.setMatrixAt(mark.index, dummy.matrix);
          skidNeedsUpdate = true;
        } else if (mark.life < 1.4) {
          const fade = mark.life / 1.4;
          dummy.position.set(mark.x, 0.012, mark.z);
          dummy.rotation.set(0, -mark.heading, 0);
          dummy.scale.set(fade, 1, fade);
          dummy.updateMatrix();
          this.skidMesh.setMatrixAt(mark.index, dummy.matrix);
          skidNeedsUpdate = true;
        }
      }
      if (skidNeedsUpdate) {
        this.skidMesh.instanceMatrix.needsUpdate = true;
      }
    }

    // Ambient floating dust particles
    if (this.ambientDust) {
      this.ambientDust.rotation.y += dt * 0.025;
      this.ambientDust.position.y = Math.sin(time * 0.25) * 0.1;
    }
  }
}
