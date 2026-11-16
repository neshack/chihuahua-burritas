import * as THREE from 'three';
import { updatePixelDupla } from '../characters/pixelSprites.js';
import { Arena } from '../world/arena.js';
import { fitArenaInCamera } from './arenaFraming.js';
import { Dupla } from './dupla.js';
import { AIController } from './ai.js';
import { ParticleSystem } from '../core/particles.js';
import { AudioEngine } from '../core/audio.js';
import { Input } from '../core/input.js';
import { UI } from '../ui/UI.js';
import { generateSkinThumbnails } from '../characters/thumbnails.js';
import { getChickenSkin, getDogSkin } from '../world/skins.js';
import { clamp, damp, randomRange, smoothstep } from '../core/utils.js';

const P1_SPAWN = new THREE.Vector3(-4.15, 0, 0.85);
const P2_SPAWN = new THREE.Vector3(4.15, 0, 0.85);
const MENU_P1 = new THREE.Vector3(-1.45, 0, 0.75);
const MENU_P2 = new THREE.Vector3(1.45, 0, 0.45);
const WINS_NEEDED = 2;

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.state = 'loading';
    this.mode = 'cpu';
    this.settings = {
      mode: 'cpu',
      regeneration: true,
      chicken: 'clasica',
      dog: 'clasico',
      p2Chicken: 'guerrera',
      p2Dog: 'guerrero',
    };
    this.rivalSkins = { chicken: 'guerrera', dog: 'guerrero' };
    this.round = 1;
    this.score = [0, 0];
    this.roundWinsTarget = WINS_NEEDED;
    this.roundActive = false;
    this.scoreAnnounced = false;
    this.matchWinnerIndex = null;
    this.introTimer = 0;
    this.introStep = 0;
    this.introDuration = 5.2;
    this.cornSpawnTimer = 6.5;
    this.koTimer = 0;
    this.koLoser = null;
    this.koWinner = null;
    this.koAnnounced = false;
    this.koHopDone = false;
    this.celebrationTimer = 0;
    this.confettiTimer = 0;
    this.hitstop = 0;
    this.slowmo = 1;
    this.cameraBlend = 0;
    this.fightZoom = 1;
    this.trauma = 0;
    this.zoomPulse = 0;
    this.bumpTimer = 0;
    this.clock = 0;
    this.realTime = 0;
    this.cameraShakeEnabled = true;
    this.viewportWidth = window.innerWidth;
    this.viewportHeight = window.innerHeight;
    this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    this.perches = {
      p1: new THREE.Vector3(-8.6, 1.65, 0.85),
      p2: new THREE.Vector3(8.6, 1.65, 0.85),
    };
    this.introCamCurrentPos = new THREE.Vector3(0, 4.7, 9.8);
    this.introCamCurrentLook = new THREE.Vector3(0, 1.55, 0.75);

    this.setupRenderer();
    this.audio = new AudioEngine();
    this.input = new Input(canvas);
    this.input.onAnyGesture = () => this.audio.ensure();

    this.particles = new ParticleSystem(this.scene);
    this.arena = new Arena(this.scene);
    this.thumbnails = generateSkinThumbnails();

    this.ui = new UI({
      onStart: (settings) => this.startMatch(settings),
      onRegenerationChange: (enabled) => { this.settings.regeneration = enabled; },
      onModeChange: (mode) => {
        this.mode = mode;
        this.settings.mode = mode;
        this.audio.ensure();
        this.audio.play('click');
      },
      onSkinChange: (kind, id, playerSlot, allSettings) =>
        this.handleSkinChange(kind, id, playerSlot, allSettings),
      onPause: () => this.togglePause(),
      onResume: () => this.resumeFromPause(),
      onRestart: () => {
        this.ui.showPause(false);
        this.startMatch({ ...this.settings });
      },
      onQuit: () => this.quitToMenu(),
      onRematch: () => this.startMatch({ ...this.settings }),
      onMenu: () => this.quitToMenu(),
      onToggleSound: () => {
        this.audio.ensure();
        const muted = this.audio.toggleMuted();
        this.ui.setSoundMuted(muted);
        return muted;
      },
    });

    this.settings.regeneration = this.ui.getSettings().regeneration;
    this.ui.setThumbnails(this.thumbnails);
    this.ui.setSoundMuted(this.audio.muted);
    this.ui.setSelectedSkins(this.settings);
    this.ui.setMode(this.mode);

    this.p1 = new Dupla({
      game: this,
      scene: this.scene,
      chickenSkin: this.settings.chicken,
      dogSkin: this.settings.dog,
      label: 'JUGADOR 1',
      accent: '#168f83',
    });
    this.p2 = new Dupla({
      game: this,
      scene: this.scene,
      chickenSkin: this.rivalSkins.chicken,
      dogSkin: this.rivalSkins.dog,
      label: 'CPU',
      accent: '#d63a74',
      isAI: true,
    });
    this.duplas = [this.p1, this.p2];

    this.setupMenuDuplas();
    this.bindWindowEvents();

    this.input.setEnabled(false);
    this.state = 'menu';
    this.ui.showHUD(false);
    this.ui.showMenu();
    this.updateCamera(0.016);
    this.renderScene();

    this.lastTime = performance.now();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);

    window.setTimeout(() => {
      this.ui.showLoading(false);
      const params = new URLSearchParams(window.location.search);
      if (params.get('play') === '1' || window.location.hash === '#play') {
        window.setTimeout(() => this.startMatch({ ...this.settings }), 120);
      }
    }, 420);

    window.__burritas = this;
  }

  renderScene() {
    for (const dupla of this.duplas ?? []) {
      updatePixelDupla(dupla, this.camera, this.clock, this.reducedMotion, {
        winner: (this.state === 'ko' && this.koWinner === dupla) ||
          (this.state === 'matchEnd' && this.duplas[this.matchWinnerIndex] === dupla),
        time: this.clock,
      });
    }
    this.renderer.render(this.scene, this.camera);
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(this.viewportWidth, this.viewportHeight, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.02;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      44,
      this.viewportWidth / this.viewportHeight,
      0.1,
      220,
    );
    this.camera.position.set(0, 10, 16);
  }

  bindWindowEvents() {
    window.addEventListener('resize', () => this.onResize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.pauseIfPlaying();
    });
    window.addEventListener('keydown', (event) => {
      if (event.code === 'KeyM' && !event.repeat) {
        this.audio.ensure();
        const muted = this.audio.toggleMuted();
        this.ui.setSoundMuted(muted);
      }
      if ((event.code === 'Escape' || event.code === 'KeyP') && !event.repeat) {
        if (this.ui.howOpen) return;
        if (this.state === 'fight' || this.state === 'intro') {
          event.preventDefault();
          this.pauseMatch();
        } else if (this.state === 'paused') {
          event.preventDefault();
          this.resumeFromPause();
        }
      }
    });
  }

  onResize() {
    this.viewportWidth = window.innerWidth;
    this.viewportHeight = window.innerHeight;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(this.viewportWidth, this.viewportHeight, false);
    this.camera.aspect = this.viewportWidth / this.viewportHeight;
    this.camera.updateProjectionMatrix();
  }

  pickRivalSkins(settings) {
    if (settings.chicken !== 'guerrera' && settings.dog !== 'guerrero') {
      return { chicken: 'guerrera', dog: 'guerrero' };
    }
    if (settings.chicken !== 'pirata' && settings.dog !== 'pirata') {
      return { chicken: 'pirata', dog: 'pirata' };
    }
    return { chicken: 'cyberpunk', dog: 'cyberpunk' };
  }

  handleSkinChange(kind, id, playerSlot = 1, allSettings = null) {
    if (allSettings) {
      if (allSettings.chicken) this.settings.chicken = allSettings.chicken;
      if (allSettings.dog) this.settings.dog = allSettings.dog;
      if (allSettings.p2Chicken) this.rivalSkins.chicken = allSettings.p2Chicken;
      if (allSettings.p2Dog) this.rivalSkins.dog = allSettings.p2Dog;
      if (allSettings.mode) this.mode = allSettings.mode;
    } else if (playerSlot === 2) {
      if (kind === 'chicken') this.rivalSkins.chicken = id;
      if (kind === 'dog') this.rivalSkins.dog = id;
      if (this.settings) {
        this.settings.p2Chicken = this.rivalSkins.chicken;
        this.settings.p2Dog = this.rivalSkins.dog;
      }
    } else {
      if (kind === 'chicken') this.settings.chicken = id;
      if (kind === 'dog') this.settings.dog = id;
    }

    this.audio.ensure();
    this.audio.play('select');
    if (this.state !== 'menu') return;

    if (playerSlot !== 2 && !allSettings?.p2Chicken && !allSettings?.p2Dog) {
      this.rivalSkins = this.pickRivalSkins(this.settings);
    }
    this.p1.setSkins(this.settings.chicken, this.settings.dog);
    this.p2.setSkins(this.rivalSkins.chicken, this.rivalSkins.dog);
    this.setupMenuDuplas();
    this.updateCamera(0.016);
  }

  setupMenuDuplas() {
    this.arena.resetCornForIntro?.();
    const perches = this.arena.getPerchPositions?.() ?? {
      p1: new THREE.Vector3(-8.6, 1.65, 0.85),
      p2: new THREE.Vector3(8.6, 1.65, 0.85),
    };
    this.perches = perches;
    const pos1 = MENU_P1.clone();
    const pos2 = MENU_P2.clone();
    this.p1.reset({ position: pos1, heading: 0.24, balance: 100 });
    this.p2.reset({ position: pos2, heading: -0.38, balance: 100 });
    this.p1.setChoreographyMode('pecking', { perchPosition: perches.p1, position: pos1 });
    this.p2.setChoreographyMode('pecking', { perchPosition: perches.p2, position: pos2 });
    this.p1.setLabel('JUGADOR 1');
    this.p2.setLabel(this.mode === 'cpu' ? 'CPU' : 'JUGADOR 2');
    this.p1.isAI = false;
    this.p2.isAI = this.mode === 'cpu';
  }

  startMatch(settings = this.settings) {
    const wasMenu = this.state === 'menu';
    this.settings = {
      mode: settings.mode === 'local' ? 'local' : 'cpu',
      regeneration: settings.regeneration ?? this.settings.regeneration,
      chicken: settings.chicken ?? this.settings.chicken,
      dog: settings.dog ?? this.settings.dog,
      p2Chicken: settings.p2Chicken ?? this.rivalSkins.chicken,
      p2Dog: settings.p2Dog ?? this.rivalSkins.dog,
    };
    this.mode = this.settings.mode;

    if (settings.p2Chicken || settings.p2Dog) {
      this.rivalSkins = {
        chicken: settings.p2Chicken ?? this.rivalSkins.chicken,
        dog: settings.p2Dog ?? this.rivalSkins.dog,
      };
    } else {
      this.rivalSkins = this.pickRivalSkins(this.settings);
    }

    this.audio.ensure();
    this.audio.startMusic();
    this.ui.closeHow();
    this.ui.showPause(false);
    this.ui.hideMenu();
    this.ui.showHUD(true);
    this.ui.setSoundMuted(this.audio.muted);

    this.p1.setSkins(this.settings.chicken, this.settings.dog);
    this.p2.setSkins(this.rivalSkins.chicken, this.rivalSkins.dog);
    this.p1.setLabel('JUGADOR 1');
    this.p2.setLabel(this.mode === 'cpu' ? 'CPU' : 'JUGADOR 2');
    this.p1.isAI = false;
    this.p2.isAI = this.mode === 'cpu';

    const p1Chicken = getChickenSkin(this.settings.chicken);
    const p1Dog = getDogSkin(this.settings.dog);
    const p2Chicken = getChickenSkin(this.rivalSkins.chicken);
    const p2Dog = getDogSkin(this.rivalSkins.dog);
    this.ui.setPlayerInfo(1, {
      tag: 'JUGADOR 1',
      skinLabel: `${p1Chicken.name} · ${p1Dog.name}`,
      portraitUrl: this.thumbnails.chicken[this.settings.chicken],
    });
    this.ui.setPlayerInfo(2, {
      tag: this.mode === 'cpu' ? 'CPU' : 'JUGADOR 2',
      skinLabel: `${p2Chicken.name} · ${p2Dog.name}`,
      portraitUrl: this.thumbnails.chicken[this.rivalSkins.chicken],
    });

    this.score = [0, 0];
    this.round = 1;
    this.matchWinnerIndex = null;
    this.ui.resetHud();
    this.cameraBlend = wasMenu ? 0 : Math.max(this.cameraBlend, 0.99);
    this.startRound();
  }

  startRound() {
    this.state = 'intro';
    this.introTimer = 0;
    this.introStep = 0;
    this.introDuration = this.round === 1 ? 5.2 : 2.4;
    this.roundActive = false;
    this.scoreAnnounced = false;
    this.koAnnounced = false;
    this.koHopDone = false;
    this.koTimer = 0;
    this.koLoser = null;
    this.koWinner = null;
    this.hitstop = 0;
    this.slowmo = 1;
    this.trauma = 0;
    this.zoomPulse = 0;
    this.bumpTimer = 0;
    this.celebrationTimer = 0;
    this.confettiTimer = 0;
    this.cornSpawnTimer = 4.0;

    this.arena.resetCornForIntro?.();
    this.arena.clearCornPickups?.();
    this.arena.updateScoreboard?.(this.score, this.round, this.p1.label, this.p2.label);

    const perches = this.arena.getPerchPositions?.() ?? {
      p1: new THREE.Vector3(-8.6, 1.65, 0.85),
      p2: new THREE.Vector3(8.6, 1.65, 0.85),
    };
    this.perches = perches;

    if (this.round === 1) {
      const p1Pos = new THREE.Vector3(-1.5, 0, 0.6);
      const p2Pos = new THREE.Vector3(1.5, 0, -0.2);
      this.p1.reset({ position: p1Pos, heading: 0.8, balance: 100 });
      this.p2.reset({ position: p2Pos, heading: -0.8, balance: 100 });
      this.p1.setChoreographyMode('pecking', { perchPosition: perches.p1, position: p1Pos });
      this.p2.setChoreographyMode('pecking', { perchPosition: perches.p2, position: p2Pos });
      this.ui.announce('¡HORA DEL MAÍZ!', 'corn', 1400);
      this.ui.setCinematicCaption?.('EN EL RUEDO', 'Las gallinas comen maíz tranquilamente… por ahora', true);
    } else {
      const p1Pos = new THREE.Vector3(-1.6, 0, 0.4);
      const p2Pos = new THREE.Vector3(1.6, 0, -0.4);
      this.p1.reset({ position: p1Pos, heading: 0.8, balance: 100 });
      this.p2.reset({ position: p2Pos, heading: -0.8, balance: 100 });
      this.p1.setChoreographyMode('pecking', { perchPosition: perches.p1, position: p1Pos });
      this.p2.setChoreographyMode('pecking', { perchPosition: perches.p2, position: p2Pos });
      this.ui.announce(`¡RONDA ${this.round}!`, 'dark', 900);
      this.ui.setCinematicCaption?.(`RONDA ${this.round}`, '¡Gallinas listas para la monta!', true);
    }

    this.p1.setLabel('JUGADOR 1');
    this.p2.setLabel(this.mode === 'cpu' ? 'CPU' : 'JUGADOR 2');

    this.ai = this.mode === 'cpu' ? new AIController(this.p2, this.p1, this) : null;
    this.input.setEnabled(false);
    this.ui.showHUD(true);
    this.ui.showPause(false);
    this.ui.resetHud();
    this.ui.clearFloaters();
    this.ui.setDanger(false);
    this.audio.ensure();
    this.audio.startMusic();
    this.audio.play('count', { step: 0 });
    this.audio.duckMusic(false);
    this.refreshHUD();
  }

  beginFight() {
    this.state = 'fight';
    this.roundActive = true;
    this.input.setEnabled(true);
    this.ui.setCinematicCaption?.('', '', false);
    this.ui.announce('¡BURRITAS!', 'yellow', 900);
    this.audio.play('go');
    this.arena.cheer();
    for (const dupla of this.duplas) {
      dupla.vy = 3.3;
      dupla.airborne = true;
      dupla.vertical = Math.max(dupla.vertical, 0.01);
      dupla.flapTimer = 0.45;
      this.particles.dust(
        new THREE.Vector3(dupla.position.x, 0.08, dupla.position.z),
        5,
        { scale: 0.16, color: 0xd8b88a, speed: 1.3, life: 0.55 },
      );
    }
    this.refreshHUD();
  }

  canFight() {
    return this.state === 'fight' && this.roundActive;
  }

  togglePause() {
    if (this.state === 'fight' || this.state === 'intro') this.pauseMatch();
    else if (this.state === 'paused') this.resumeFromPause();
  }

  pauseIfPlaying() {
    if (this.state === 'fight' || this.state === 'intro') this.pauseMatch();
  }

  pauseMatch() {
    if (this.state !== 'fight' && this.state !== 'intro') return;
    this.prePauseState = this.state;
    this.state = 'paused';
    this.input.setEnabled(false);
    this.input.pausePressed = false;
    this.audio.duckMusic(true);
    this.ui.showPause(true);
  }

  resumeFromPause() {
    if (this.state !== 'paused') return;
    this.state = this.prePauseState ?? 'fight';
    this.audio.duckMusic(false);
    this.ui.showPause(false);
    this.input.setEnabled(this.state === 'fight');
  }

  quitToMenu() {
    this.state = 'menu';
    this.input.setEnabled(false);
    this.audio.duckMusic(false);
    this.audio.stopMusic();
    this.ui.showPause(false);
    this.ui.showHUD(false);
    this.ui.hideAnnounce();
    this.ui.clearFloaters();
    this.ui.setDanger(false);
    this.ui.setCinematicCaption?.('', '', false);
    this.ui.showMenu();
    this.arena.clearCornPickups?.();
    if (this.settings.p2Chicken && this.settings.p2Dog) {
      this.rivalSkins = {
        chicken: this.settings.p2Chicken,
        dog: this.settings.p2Dog,
      };
    } else {
      this.rivalSkins = this.pickRivalSkins(this.settings);
    }
    this.p1.setSkins(this.settings.chicken, this.settings.dog);
    this.p2.setSkins(this.rivalSkins.chicken, this.rivalSkins.dog);
    this.setupMenuDuplas();
    this.cameraBlend = Math.min(this.cameraBlend, 0.95);
    this.slowmo = 1;
    this.hitstop = 0;
    this.trauma = 0;
    this.zoomPulse = 0;
  }

  loop(now) {
    const raw = Math.min(0.05, Math.max(0.0001, (now - this.lastTime) / 1000));
    this.lastTime = now;
    this.update(raw);
    requestAnimationFrame(this.loop);
  }

  update(raw) {
    this.realTime += raw;

    if (this.state === 'paused') {
      this.renderScene();
      this.input.endFrame();
      return;
    }

    if (this.hitstop > 0) {
      this.hitstop -= raw;
      this.particles.update(raw * 0.2);
      this.arena.update(raw * 0.2);
      this.updateCamera(raw);
      this.renderScene();
      this.input.endFrame();
      return;
    }

    if (this.state === 'ko' || this.state === 'matchEnd') {
      this.slowmo = damp(this.slowmo, 1, 2.4, raw);
    } else {
      this.slowmo = 1;
    }
    const dt = raw * this.slowmo;
    this.clock += dt;

    const targetBlend = this.state === 'menu' ? 0 : 1;
    this.cameraBlend = damp(this.cameraBlend, targetBlend, 3.2, raw);

    switch (this.state) {
      case 'menu':
        this.updateMenu(dt);
        break;
      case 'intro':
        this.updateIntro(raw, dt);
        break;
      case 'fight':
        this.updateFight(raw, dt);
        break;
      case 'ko':
        this.updateKnockout(raw, dt);
        break;
      case 'matchEnd':
        this.updateMatchEnd(raw, dt);
        break;
      default:
        break;
    }

    this.arena.update(dt);
    this.particles.update(dt);
    this.updateCamera(raw);

    if (this.state === 'fight' || this.state === 'ko' || this.state === 'intro') {
      this.refreshHUD();
    }

    this.renderScene();
    this.input.endFrame();
  }

  updateMenu(dt) {
    this.p1.update(dt, { opponent: this.p2, canControl: false });
    this.p2.update(dt, { opponent: this.p1, canControl: false });
  }

  updateIntro(raw, dt) {
    const skip =
      this.input.consumeSkip?.() || this.input.consume('Space') || this.input.consume('Enter');
    if (this.round === 1 && skip && this.introTimer < 3.85) {
      this.introTimer = 3.85;
    }

    this.introTimer += raw;

    if (this.round === 1) {
      // Phase 1: 0.0s to 1.7s (pecking corn in center)
      // Phase 2: 1.7s to 3.9s (presentation of the chihuahuas)
      if (this.introTimer >= 1.7 && this.introStep < 1) {
        this.introStep = 1;
        this.audio.play('drumroll');
        this.audio.play('present');
        this.p1.setChoreographyMode('perched', { presenting: true, perchPosition: this.perches.p1 });
        const p1Dog = getDogSkin(this.settings.dog);
        this.ui.announce(`¡${p1Dog.name.toUpperCase()}!`, 'present', 1050);
        this.ui.setCinematicCaption?.(
          'JINETE 1 LISTO',
          `${p1Dog.name} prepara su guante de resorte`,
          true,
        );
      }
      if (this.introTimer >= 2.8 && this.introStep < 2) {
        this.introStep = 2;
        this.audio.play('present');
        this.p1.presenting = false;
        this.p2.setChoreographyMode('perched', { presenting: true, perchPosition: this.perches.p2 });
        const p2Dog = getDogSkin(this.rivalSkins.dog);
        this.ui.announce(`¡${p2Dog.name.toUpperCase()}!`, 'present', 1050);
        this.ui.setCinematicCaption?.('RIVAL LISTO', `${p2Dog.name} acepta el desafío`, true);
      }
      // Phase 3: 3.9s to 5.2s (Mount & bolt!)
      if (this.introTimer >= 3.9 && this.introStep < 3) {
        this.introStep = 3;
        this.audio.play('mount');
        this.ui.announce('¡A MONTAR!', 'rodeo', 1100);
        this.ui.setCinematicCaption?.('¡A LAS GALLINAS!', '¡Súbete y agárrate fuerte!', true);
      }
      if (this.introTimer >= 3.9 && this.introTimer < 4.65) {
        const leapProgress = clamp((this.introTimer - 3.9) / 0.75, 0, 1);
        this.p1.setChoreographyMode('leaping', { leapProgress, startPos: this.perches.p1 });
        this.p2.setChoreographyMode('leaping', { leapProgress, startPos: this.perches.p2 });
      }
      if (this.introTimer >= 4.65 && this.introStep < 4) {
        this.introStep = 4;
        this.p1.setChoreographyMode('mounted');
        this.p2.setChoreographyMode('mounted');
        this.arena.scatterCornOnStart?.(this.particles);
        this.particles.shockwave?.(this.p1.position, 20);
        this.particles.shockwave?.(this.p2.position, 20);
        this.particles.feathers(
          this.p1.position,
          [this.p1.chickenSkin.body, this.p1.chickenSkin.comb],
          12,
        );
        this.particles.feathers(
          this.p2.position,
          [this.p2.chickenSkin.body, this.p2.chickenSkin.comb],
          12,
        );
        this.audio.play('squawk');
        this.addShake(0.35, 0.8);
        this.p1.heading = 0.8;
        this.p1.velocity.set(Math.sin(0.8) * 6.8, 0, Math.cos(0.8) * 6.8);
        this.p1.buckTimer = 0.6;
        this.p2.heading = -0.8;
        this.p2.velocity.set(Math.sin(-0.8) * 6.8, 0, Math.cos(-0.8) * 6.8);
        this.p2.buckTimer = 0.6;
      }
      if (this.introTimer >= 5.2) {
        this.ui.setCinematicCaption?.('', '', false);
        this.beginFight();
        return;
      }
    } else {
      // Round > 1: Snappier 2.4s version
      if (this.introTimer >= 1.0 && this.introStep < 1) {
        this.introStep = 1;
        this.audio.play('mount');
        this.ui.announce('¡A MONTAR!', 'yellow', 800);
        this.ui.setCinematicCaption?.('¡A MONTAR!', '¡Súbete y agárrate fuerte!', true);
      }
      if (this.introTimer >= 1.0 && this.introTimer < 1.8) {
        const leapProgress = clamp((this.introTimer - 1.0) / 0.8, 0, 1);
        this.p1.setChoreographyMode('leaping', { leapProgress, startPos: this.perches.p1 });
        this.p2.setChoreographyMode('leaping', { leapProgress, startPos: this.perches.p2 });
      }
      if (this.introTimer >= 1.8 && this.introStep < 2) {
        this.introStep = 2;
        this.p1.setChoreographyMode('mounted');
        this.p2.setChoreographyMode('mounted');
        this.arena.scatterCornOnStart?.(this.particles);
        this.particles.shockwave?.(this.p1.position, 16);
        this.particles.shockwave?.(this.p2.position, 16);
        this.audio.play('squawk');
        this.addShake(0.3, 0.6);
        this.p1.heading = 0.8;
        this.p1.velocity.set(Math.sin(0.8) * 6.8, 0, Math.cos(0.8) * 6.8);
        this.p1.buckTimer = 0.5;
        this.p2.heading = -0.8;
        this.p2.velocity.set(Math.sin(-0.8) * 6.8, 0, Math.cos(-0.8) * 6.8);
        this.p2.buckTimer = 0.5;
      }
      if (this.introTimer >= 2.4) {
        this.ui.setCinematicCaption?.('', '', false);
        this.beginFight();
        return;
      }
    }

    this.p1.update(dt, { opponent: this.p2, canControl: false });
    this.p2.update(dt, { opponent: this.p1, canControl: false });
  }

  updateFight(raw, dt) {
    this.bumpTimer = Math.max(0, this.bumpTimer - dt);
    this.cornSpawnTimer = Math.max(0, this.cornSpawnTimer - dt);
    if (this.cornSpawnTimer <= 0) {
      this.cornSpawnTimer = 6.5;
      this.arena.spawnCornPickup?.();
    }

    if (this.ai) this.ai.update(dt);

    const move1 = this.input.getMove(1);
    const hop1 = this.input.consumeHop(1);
    const punch1 = this.input.consumePunch(1);
    const hopHeld1 = this.input.isHopHeld?.(1) ?? this.input.isDown('Space');
    this.p1.setIntent(move1.x, move1.z, hop1, punch1, hopHeld1);

    if (this.mode === 'local') {
      const move2 = this.input.getMove(2);
      const hop2 = this.input.consumeHop(2);
      const punch2 = this.input.consumePunch(2);
      const hopHeld2 =
        this.input.isHopHeld?.(2) ??
        (this.input.isDown('ShiftLeft') || this.input.isDown('ShiftRight'));
      this.p2.setIntent(move2.x, move2.z, hop2, punch2, hopHeld2);
    }

    this.p1.update(dt, { opponent: this.p2, canControl: true });
    this.p2.update(dt, { opponent: this.p1, canControl: true });

    // Arena interactive mechanics: Corn pickups
    for (const dupla of this.duplas) {
      if (!dupla.alive) continue;
      const pickup = this.arena.checkCornPickup?.(dupla.position, 1.15);
      if (pickup) {
        dupla.applyCornBoost(pickup.heal ?? 16, pickup.boost ?? 3.5);
        this.audio.play('cornPickup');
        this.particles.corn?.(pickup.position, 14);
        this.particles.shockwave?.(pickup.position, 14);
        this.addFloater(
          `¡MAÍZ TURBO! +${pickup.heal ?? 16}`,
          new THREE.Vector3(dupla.position.x, dupla.vertical + 2.5, dupla.position.z),
          'heal',
        );
      }
    }

    // Arena interactive mechanics: Hay bale bumpers
    for (const dupla of this.duplas) {
      if (!dupla.alive) continue;
      const hay = this.arena.checkHayBaleBounce?.(dupla.position, 0.95);
      if (hay && (dupla.hayCooldown ?? 0) <= 0) {
        dupla.hayCooldown = 0.45;
        const bounceSpeed = Math.max(8.2, dupla.speed * 1.35);
        dupla.velocity.x = hay.normal.x * bounceSpeed;
        dupla.velocity.z = hay.normal.z * bounceSpeed;
        dupla.vy = 4.2;
        dupla.airborne = true;
        dupla.buckTimer = 0.75;
        this.audio.play('hayBounce');
        this.particles.shockwave?.(hay.point, 12);
        this.particles.dust(
          hay.point,
          8,
          { scale: 0.22, color: 0xe8c772, speed: 2.5, life: 0.6 },
        );
        this.addShake(0.24, 0.3);
        this.addFloater(
          '¡REBOTE!',
          new THREE.Vector3(dupla.position.x, dupla.vertical + 2.4, dupla.position.z),
          'crit',
        );
      }
    }

    this.resolveGloveCombat();
    if (this.state === 'fight') this.resolveBodyCollision();
    if (this.state === 'fight') this.checkKnockout();
  }

  updateKnockout(raw, dt) {
    this.koTimer += raw;
    this.p1.update(dt, { opponent: this.p2, canControl: false });
    this.p2.update(dt, { opponent: this.p1, canControl: false });

    if (!this.koHopDone && this.koTimer > 0.85 && this.koWinner) {
      this.koHopDone = true;
      if (this.koWinner.alive) {
        this.koWinner.vy = 4.8;
        this.koWinner.airborne = true;
        this.koWinner.flapTimer = 0.5;
        this.audio.play('cluck', { pan: this.panFor(this.koWinner), pitch: 1.1 });
      }
    }

    if (!this.koAnnounced && this.koTimer > 1.7) {
      this.koAnnounced = true;
      if (!this.koWinner) return;
      const winnerIndex = this.koWinner === this.p1 ? 0 : 1;
      const matchPoint = this.score[winnerIndex] >= this.roundWinsTarget;
      if (matchPoint) {
        this.ui.announce(
          `¡${this.koWinner.label} GANA LA BURRITA!`,
          'green',
          1500,
        );
      } else {
        this.ui.announce(`¡RONDA PARA ${this.koWinner.label}!`, 'teal', 1400);
      }
      this.audio.play('cluck', { pan: this.panFor(this.koWinner), pitch: 0.9 });
    }

    if (this.koTimer > 3.35) {
      if (!this.koWinner) return;
      const winnerIndex = this.koWinner === this.p1 ? 0 : 1;
      if (this.score[winnerIndex] >= this.roundWinsTarget) {
        this.finishMatch();
      } else {
        this.round += 1;
        this.startRound();
      }
    }
  }

  updateMatchEnd(raw, dt) {
    this.p1.update(dt, { opponent: this.p2, canControl: false });
    this.p2.update(dt, { opponent: this.p1, canControl: false });

    this.celebrationTimer -= raw;
    if (this.celebrationTimer <= 0) {
      this.celebrationTimer = 1.7;
      const winner = this.matchWinnerIndex === 0 ? this.p1 : this.p2;
      if (winner?.alive) {
        winner.vy = randomRange(3.2, 5.1);
        winner.airborne = true;
        winner.flapTimer = 0.55;
        this.audio.play('cluck', { pan: this.panFor(winner), pitch: 1.15 });
      }
    }

    this.confettiTimer -= raw;
    if (this.confettiTimer <= 0) {
      this.confettiTimer = 1.5;
      this.particles.confetti(new THREE.Vector3(0, 1.2, 0), 26);
    }
  }

  resolveGloveCombat() {
    const a = this.p1;
    const b = this.p2;
    if (!a.alive || !b.alive) return;

    if (a.isPunchActive() && b.isPunchActive()) {
      if (a.gloveWorld.distanceTo(b.gloveWorld) < 1.3) {
        this.resolveGloveClash(a, b);
        return;
      }
    }

    const target = new THREE.Vector3();
    const hits = [];
    const collect = (attacker, defender) => {
      if (!attacker.isPunchActive() || !defender.alive) return;
      if (attacker.punchExt < 0.35) return;

      const toDefenderX = defender.position.x - attacker.position.x;
      const toDefenderZ = defender.position.z - attacker.position.z;
      const len = Math.hypot(toDefenderX, toDefenderZ) || 0.001;
      const alignment = (attacker.forward.x * toDefenderX + attacker.forward.z * toDefenderZ) / len;
      // Harder to hit: attacker must be facing toward defender within ~55 degree cone
      if (alignment < 0.55) return;

      target.set(defender.position.x, defender.vertical + 1.05, defender.position.z);
      const distance = attacker.gloveWorld.distanceTo(target);
      // Tighter hitbox distance (1.22m instead of 1.62m)
      if (distance < 1.22) {
        const zone = defender.getImpactZone(attacker.position);
        const relativeSpeed = attacker.speed + defender.speed * 0.45;
        hits.push({ attacker, defender, zone, relativeSpeed });
      }
    };
    collect(a, b);
    collect(b, a);

    for (const hit of hits) {
      this.applyGloveHit(hit.attacker, hit.defender, hit.zone, hit.relativeSpeed);
    }
  }

  applyGloveHit(attacker, defender, zone, relativeSpeed) {
    const dx = defender.position.x - attacker.position.x;
    const dz = defender.position.z - attacker.position.z;
    const direction = new THREE.Vector3(dx, 0, dz);
    if (direction.lengthSq() < 0.0001) direction.copy(attacker.forward);
    direction.normalize();

    // Rebalanced damage curve: durable fighters requiring clean combinations to KO
    const multipliers = { front: 0.8, side: 1.35, back: 1.65 };
    let damage = (3.6 + relativeSpeed * 0.38) * (multipliers[zone] ?? 1);
    let critical = false;
    if (zone === 'back' && defender.balance < 8) {
      damage = Math.max(damage, defender.balance + 1);
      critical = true;
    }

    const force = 3.6 + relativeSpeed * 0.35;
    const finalDamage = defender.takeHit(damage, direction, force, {
      hitstun: zone === 'back' ? 0.36 : zone === 'side' ? 0.3 : 0.24,
    });
    attacker.onPunchLanded();

    if (zone === 'front') {
      attacker.velocity.addScaledVector(direction, -force * 0.2);
      attacker.flapTimer = Math.max(attacker.flapTimer, 0.2);
    }

    const pan = this.panFor(defender);
    const hitPoint = new THREE.Vector3(
      defender.position.x,
      defender.vertical + 2.15,
      defender.position.z,
    );
    const impactPoint = new THREE.Vector3(
      attacker.gloveWorld.x,
      attacker.gloveWorld.y,
      attacker.gloveWorld.z,
    );

    this.audio.play('punch', { pan });
    if (zone === 'back') this.audio.play('bark', { pan, volume: 1.15 });
    this.particles.feathers(
      hitPoint,
      [
        defender.chickenSkin.body,
        defender.chickenSkin.wing,
        defender.chickenSkin.comb,
        defender.chickenSkin.belly,
      ],
      zone === 'back' ? 13 : 8,
      { speed: 3.4 + force * 0.15 },
    );
    this.particles.spark(impactPoint, zone === 'front' ? 7 : 12);
    this.particles.dust(
      new THREE.Vector3(defender.position.x, 0.06, defender.position.z),
      4,
      { scale: 0.2, speed: 2.4 },
    );

    this.addShake(0.28 + Math.min(0.32, relativeSpeed * 0.025), zone === 'back' ? 1.4 : 0.6);
    this.hitstop = Math.max(this.hitstop, zone === 'back' ? 0.085 : 0.06);
    if (zone === 'back' || critical) this.ui.flash('hit');

    let text;
    let tone = 'damage';
    if (critical) {
      text = `¡KO CRÍTICO! -${Math.ceil(finalDamage)}`;
      tone = 'crit';
      this.ui.flash('ko');
      this.addShake(0.3, 1.2);
    } else if (zone === 'back') {
      text = `¡ESPALDA! -${Math.ceil(finalDamage)}`;
      tone = 'crit';
    } else if (zone === 'side') {
      text = `¡FLANCO! -${Math.ceil(finalDamage)}`;
      tone = 'crit';
    } else {
      text = `-${Math.ceil(finalDamage)}`;
    }
    this.addFloater(
      text,
      new THREE.Vector3(defender.position.x, defender.vertical + 2.6, defender.position.z),
      tone,
    );
  }

  resolveGloveClash(a, b) {
    const mid = new THREE.Vector3().addVectors(a.gloveWorld, b.gloveWorld).multiplyScalar(0.5);
    this.particles.spark(mid, 22, { speed: 8 });
    this.audio.play('clash');
    this.addShake(0.5, 1.2);
    this.hitstop = Math.max(this.hitstop, 0.09);
    a.onPunchLanded();
    b.onPunchLanded();
    a.velocity.addScaledVector(a.forward, -4.2);
    b.velocity.addScaledVector(b.forward, -4.2);
    a.flapTimer = 0.35;
    b.flapTimer = 0.35;
    this.addFloater('¡CLASH!', new THREE.Vector3(mid.x, 3.1, mid.z), 'crit');
    this.ui.flash('hit');
  }

  resolveBodyCollision() {
    const a = this.p1;
    const b = this.p2;
    if (!a.alive || !b.alive) return;
    if (a.airborne || b.airborne) return;

    const dx = b.position.x - a.position.x;
    const dz = b.position.z - a.position.z;
    let distance = Math.hypot(dx, dz);
    const minDistance = 2.18;
    const verticalGap = Math.abs((a.vertical + 0.5) - (b.vertical + 0.5));
    if (distance >= minDistance) return;
    if (verticalGap > 1.4) return;

    if (distance < 0.001) {
      distance = 0.001;
    }
    const nx = distance > 0.001 ? dx / distance : 1;
    const nz = distance > 0.001 ? dz / distance : 0;
    const overlap = minDistance - distance;
    a.position.x -= nx * overlap * 0.5;
    a.position.z -= nz * overlap * 0.5;
    b.position.x += nx * overlap * 0.5;
    b.position.z += nz * overlap * 0.5;

    if (a.punchTime >= 0 || b.punchTime >= 0) return;
    if (this.bumpTimer > 0) return;

    const closing = (a.velocity.x - b.velocity.x) * nx + (a.velocity.z - b.velocity.z) * nz;
    if (closing > 2.4) {
      this.bumpTimer = 0.35;
      const impulse = closing * 0.48;
      a.velocity.x -= nx * impulse;
      a.velocity.z -= nz * impulse;
      b.velocity.x += nx * impulse;
      b.velocity.z += nz * impulse;
      const damage = clamp(0.6 + closing * 0.35, 1, 4.5);
      a.balance = Math.max(0, a.balance - damage);
      b.balance = Math.max(0, b.balance - damage);
      a.sinceDamage = 0;
      b.sinceDamage = 0;
      a.hitReaction = Math.max(a.hitReaction, 0.25);
      b.hitReaction = Math.max(b.hitReaction, 0.25);
      this.audio.play('bounce');
      this.addShake(0.16, 0.3);
      const mid = new THREE.Vector3(
        (a.position.x + b.position.x) * 0.5,
        0.9,
        (a.position.z + b.position.z) * 0.5,
      );
      this.particles.dust(mid, 5, { scale: 0.18, speed: 2.2 });
      this.addFloater(`-${Math.ceil(damage)}`, new THREE.Vector3(a.position.x, 2.7, a.position.z));
      this.addFloater(`-${Math.ceil(damage)}`, new THREE.Vector3(b.position.x, 2.7, b.position.z));
    }
  }

  checkKnockout() {
    if (this.state !== 'fight' || !this.roundActive) return;
    const dead = this.duplas.filter((dupla) => dupla.alive && dupla.balance <= 0);
    if (!dead.length) return;

    let loser = dead[0];
    if (dead.length > 1) {
      dead.sort((one, two) => one.balance - two.balance);
      loser = dead[0];
    }
    const winner = loser === this.p1 ? this.p2 : this.p1;
    this.knockout(loser, winner);
  }

  knockout(loser, winner) {
    if (this.state !== 'fight') return;
    this.state = 'ko';
    this.roundActive = false;
    this.input.setEnabled(false);
    this.koTimer = 0;
    this.koAnnounced = false;
    this.koHopDone = false;
    this.koLoser = loser;
    this.koWinner = winner;
    this.slowmo = 0.28;
    this.trauma = 0;
    this.zoomPulse = 0;

    const winnerIndex = winner === this.p1 ? 0 : 1;
    this.score[winnerIndex] += 1;

    this.arena.updateScoreboard?.(this.score, this.round, this.p1.label, this.p2.label);

    const dx = loser.position.x - winner.position.x;
    const dz = loser.position.z - winner.position.z;
    const dir = new THREE.Vector3(dx, 0, dz);
    if (dir.lengthSq() < 0.0001) dir.copy(winner.forward);
    dir.normalize();

    const away = new THREE.Vector3(loser.position.x, 0, loser.position.z);
    if (away.lengthSq() < 0.01) away.set(1, 0, 0);
    away.normalize();
    const chickenRun = away
      .clone()
      .multiplyScalar(0.8)
      .add(new THREE.Vector3(randomRange(-0.9, 0.9), 0, randomRange(-0.9, 0.9)))
      .normalize();

    loser.knockout(dir, chickenRun);

    const hitPoint = new THREE.Vector3(loser.position.x, 2.2, loser.position.z);
    this.particles.feathers(
      hitPoint,
      [loser.chickenSkin.body, loser.chickenSkin.wing, loser.chickenSkin.comb],
      24,
      { speed: 5.5 },
    );
    this.particles.spark(new THREE.Vector3(loser.position.x, 1.6, loser.position.z), 24);
    this.particles.confetti(new THREE.Vector3(0, 1.5, 0), 40);
    this.audio.play('ko', { pan: this.panFor(loser) });
    this.arena.cheer();
    this.addShake(0.9, 2.4);
    this.ui.flash('ko');
    this.ui.announce('¡TUMBADO!', 'red', 1450);
    this.ui.setDanger(false);
    this.refreshHUD();
  }

  finishMatch() {
    if (this.state === 'matchEnd') return;
    this.state = 'matchEnd';
    this.roundActive = false;
    this.input.setEnabled(false);
    this.ui.setCinematicCaption?.('', '', false);
    const winner = this.koWinner ?? (this.score[0] > this.score[1] ? this.p1 : this.p2);
    this.matchWinnerIndex = winner === this.p1 ? 0 : 1;
    const winnerChicken = getChickenSkin(winner.chickenSkinId);
    const winnerDog = getDogSkin(winner.dogSkinId);
    const title =
      winner === this.p1
        ? '¡GANÓ JUGADOR 1!'
        : this.mode === 'cpu'
          ? '¡GANÓ LA CPU!'
          : '¡GANÓ JUGADOR 2!';

    this.ui.hideAnnounce();
    this.ui.showHUD(false);
    this.ui.setDanger(false);
    this.ui.showEnd({
      title,
      kicker: '¡FIN DE LA BURRITA!',
      sub: `${winnerDog.name}: «${winnerDog.taunt ?? "¡Otra ronda, gallinita!"}»`,
      score: this.score,
      winnerNumber: this.matchWinnerIndex + 1,
    });
    this.ui.flash('win');
    this.audio.stopMusic();
    this.audio.play('win');
    this.arena.cheer();
    this.particles.confetti(new THREE.Vector3(0, 1.6, 0), 120);
    this.confettiTimer = 1.1;
    this.celebrationTimer = 0.8;
    this.addShake(0.3, 0);
  }

  addShake(amount, zoom = 0) {
    if (this.reducedMotion) amount *= 0.2;
    this.trauma = Math.min(1.1, this.trauma + amount);
    this.zoomPulse = Math.min(3.2, this.zoomPulse + zoom);
  }

  panFor(dupla) {
    return clamp(dupla.position.x / 9, -0.85, 0.85);
  }

  addFloater(text, worldPosition, tone = 'damage') {
    if (!worldPosition) return;
    const projected = worldPosition.clone().project(this.camera);
    if (projected.z > 1) return;
    const x = (projected.x * 0.5 + 0.5) * this.viewportWidth;
    const y = (-projected.y * 0.5 + 0.5) * this.viewportHeight;
    if (x < -60 || x > this.viewportWidth + 60 || y < -40 || y > this.viewportHeight + 40) {
      return;
    }
    this.ui.floater(text, x, y, tone);
  }

  refreshHUD() {
    if (!this.ui || this.ui.dom.hud.classList.contains('is-hidden')) return;
    this.ui.updateHUD({
      p1: {
        balance: this.p1.balance,
        alive: this.p1.alive,
        vulnerable: this.p1.vulnerable,
        cooldown: this.p1.cooldown,
        cornBoost: this.p1.cornBoostTimer > 0,
        bucking: this.p1.buckTimer > 0,
        braking: this.p1.braking,
      },
      p2: {
        balance: this.p2.balance,
        alive: this.p2.alive,
        vulnerable: this.p2.vulnerable,
        cooldown: this.p2.cooldown,
        cornBoost: this.p2.cornBoostTimer > 0,
        bucking: this.p2.buckTimer > 0,
        braking: this.p2.braking,
      },
      score: this.score,
      round: this.round,
      roundWins: this.roundActive,
    });
  }

  updateCamera(raw) {
    const isMenu = this.state === 'menu';
    const isIntro = this.state === 'intro';
    const aspect = this.camera.aspect || 1.6;
    const distanceScale = clamp(1.55 / aspect, 1, 1.35);

    const menuAngle = 0.1 + Math.sin(this.realTime * 0.11) * 0.2;
    const menuRadius = 9.8 * distanceScale;
    const menuPos = new THREE.Vector3(
      Math.sin(menuAngle) * menuRadius,
      4.7,
      Math.cos(menuAngle) * menuRadius,
    );
    const menuLook = new THREE.Vector3(0, 1.55, 0.75);

    const fightPos = new THREE.Vector3(0, 8.4 * distanceScale, 12.2 * distanceScale);
    const fightLook = new THREE.Vector3(0, 1.28, 0.35);
    const midpointX = (this.p1.position.x + this.p2.position.x) * 0.5;
    const midpointZ = (this.p1.position.z + this.p2.position.z) * 0.5;
    const extent = Math.max(
      4.2,
      Math.abs(this.p1.position.x),
      Math.abs(this.p2.position.x),
      Math.abs(this.p1.position.z),
      Math.abs(this.p2.position.z),
    );
    const targetFightZoom = clamp(0.78 + (extent - 4.2) * 0.052, 0.78, 1.08);
    const koWide = this.state === 'ko' || this.state === 'matchEnd' ? 0.14 : 0;
    if (!isMenu && !isIntro) {
      this.fightZoom = damp(this.fightZoom, Math.max(targetFightZoom, 0.78 + koWide), 2.4, raw);
    } else {
      this.fightZoom = 1;
    }
    fightPos.multiplyScalar(this.fightZoom);
    fightPos.x += midpointX * 0.28;
    fightLook.x += midpointX * 0.55;
    fightLook.z += midpointZ * 0.16;

    let activePos = fightPos;
    let activeLook = fightLook;

    if (isIntro) {
      const t = this.introTimer;
      const introCamPos = new THREE.Vector3();
      const introCamLook = new THREE.Vector3();

      if (this.round === 1) {
        if (t < 1.7) {
          // Phase 1: Warm low-angle close shot of chickens eating corn in center
          introCamPos.set(Math.sin(t * 0.6) * 0.8, 2.2 * distanceScale, 5.1 * distanceScale);
          introCamLook.set(0, 0.75, 0.25);
        } else if (t < 2.8) {
          // Phase 2A: Close-up of P1 on left perch
          const perch = this.perches.p1;
          introCamPos.set(perch.x + 2.4, perch.y + 0.85, perch.z + 2.3);
          introCamLook.set(perch.x, perch.y + 0.42, perch.z);
        } else if (t < 3.9) {
          // Phase 2B: Close-up of P2 on right perch
          const perch = this.perches.p2;
          introCamPos.set(perch.x - 2.4, perch.y + 0.85, perch.z + 2.3);
          introCamLook.set(perch.x, perch.y + 0.42, perch.z);
        } else {
          // Phase 3: Leaping & bolting, pulls back dynamically to wide arena view
          const pullBackT = smoothstep(0, 1, clamp((t - 3.9) / 1.15, 0, 1));
          const wideStart = new THREE.Vector3(0, 4.4 * distanceScale, 7.8 * distanceScale);
          introCamPos.lerpVectors(wideStart, fightPos, pullBackT);
          introCamLook.lerpVectors(new THREE.Vector3(0, 1.2, 0.1), fightLook, pullBackT);
        }
      } else {
        // Multi-round quick intro
        if (t < 1.0) {
          introCamPos.set(0, 2.6 * distanceScale, 5.8 * distanceScale);
          introCamLook.set(0, 0.85, 0.1);
        } else {
          const pullBackT = smoothstep(0, 1, clamp((t - 1.0) / 1.1, 0, 1));
          const wideStart = new THREE.Vector3(0, 3.8 * distanceScale, 6.8 * distanceScale);
          introCamPos.lerpVectors(wideStart, fightPos, pullBackT);
          introCamLook.lerpVectors(new THREE.Vector3(0, 1.0, 0), fightLook, pullBackT);
        }
      }

      if (t < 0.05) {
        this.introCamCurrentPos.copy(introCamPos);
        this.introCamCurrentLook.copy(introCamLook);
      } else {
        const camSpeed = t >= 3.9 ? 7.5 : 6.2;
        this.introCamCurrentPos.x = damp(this.introCamCurrentPos.x, introCamPos.x, camSpeed, raw);
        this.introCamCurrentPos.y = damp(this.introCamCurrentPos.y, introCamPos.y, camSpeed, raw);
        this.introCamCurrentPos.z = damp(this.introCamCurrentPos.z, introCamPos.z, camSpeed, raw);
        this.introCamCurrentLook.x = damp(this.introCamCurrentLook.x, introCamLook.x, camSpeed * 1.2, raw);
        this.introCamCurrentLook.y = damp(this.introCamCurrentLook.y, introCamLook.y, camSpeed * 1.2, raw);
        this.introCamCurrentLook.z = damp(this.introCamCurrentLook.z, introCamLook.z, camSpeed * 1.2, raw);
      }
      activePos = this.introCamCurrentPos.clone();
      activeLook = this.introCamCurrentLook.clone();
    }

    let koFocus = 0;
    if ((this.state === 'ko' || this.state === 'matchEnd') && this.koLoser) {
      koFocus = smoothstep(0, 1, Math.min(1, this.koTimer / 1.3));
      let focusTarget = new THREE.Vector3(
        this.koLoser.position.x,
        Math.max(1.81, this.koLoser.vertical + 1.6),
        this.koLoser.position.z,
      );
      if (this.koLoser.dogPivot) {
        const dogWorld = new THREE.Vector3();
        this.koLoser.dogPivot.getWorldPosition(dogWorld);
        focusTarget = new THREE.Vector3(
          this.koLoser.position.x * 0.45 + dogWorld.x * 0.55,
          Math.max(2.0, dogWorld.y * 0.5 + 1.1),
          this.koLoser.position.z * 0.45 + dogWorld.z * 0.55,
        );
      }
      activeLook.lerp(focusTarget, koFocus * 0.5);
    }

    const blend = smoothstep(0, 1, clamp(this.cameraBlend, 0, 1));
    const position = menuPos.lerp(activePos, blend);
    const look = menuLook.lerp(activeLook, blend);
    const baseFov = 46 - blend * 0.5;

    this.camera.position.copy(position);
    this.camera.fov = baseFov - this.zoomPulse + (isMenu ? 0 : -koFocus * 1.8);
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(look);

    this.trauma = Math.max(0, this.trauma - raw * 1.9);
    this.zoomPulse = damp(this.zoomPulse, 0, 8, raw);
    if (this.trauma > 0.001) {
      const shake = this.trauma * this.trauma;
      this.camera.position.x += (Math.random() * 2 - 1) * shake * 0.5;
      this.camera.position.y += (Math.random() * 2 - 1) * shake * 0.28;
      this.camera.position.z += (Math.random() * 2 - 1) * shake * 0.22;
      this.camera.rotation.z += (Math.random() * 2 - 1) * shake * 0.015;
    }
    if (this.state === 'fight' || this.state === 'ko' || this.state === 'matchEnd') {
      fitArenaInCamera(this.camera);
    }
  }

  // Callbacks used by Dupla --------------------------------------------------

  onHop(dupla) {
    this.audio.play('jump', { pan: this.panFor(dupla) });
    this.particles.dust(
      new THREE.Vector3(dupla.position.x, 0.08, dupla.position.z),
      3,
      { scale: 0.14, speed: 1.2, life: 0.45 },
    );
  }

  onLand(dupla, impact) {
    this.audio.play('land', { pan: this.panFor(dupla) });
    this.particles.dust(
      new THREE.Vector3(dupla.position.x, 0.06, dupla.position.z),
      impact > 6 ? 7 : 4,
      { scale: 0.16, speed: 1.8 },
    );
    this.addShake(Math.min(0.18, impact * 0.012));

    if (this.state !== 'fight' || !dupla.alive || impact < 5.8) return;
    const foe = dupla === this.p1 ? this.p2 : this.p1;
    if (!foe.alive) return;
    const dx = foe.position.x - dupla.position.x;
    const dz = foe.position.z - dupla.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance < 1.75 && foe.vertical < 1.15) {
      const direction = new THREE.Vector3(dx, 0, dz);
      if (direction.lengthSq() < 0.0001) direction.copy(dupla.forward);
      direction.normalize();
      const damage = 9 + impact * 0.9;
      const dealt = foe.takeHit(damage, direction, 5.8, {
        hitstun: 0.36,
        knockbackScale: 1.1,
      });
      dupla.vy = 3.2;
      dupla.airborne = true;
      dupla.flapTimer = 0.35;
      this.audio.play('stomp');
      this.addShake(0.42, 1.2);
      this.hitstop = Math.max(this.hitstop, 0.065);
      this.particles.feathers(
        new THREE.Vector3(foe.position.x, foe.vertical + 1.8, foe.position.z),
        [foe.chickenSkin.body, foe.chickenSkin.wing, foe.chickenSkin.comb],
        10,
      );
      this.addFloater(
        `¡PISOTÓN! -${Math.ceil(dealt)}`,
        new THREE.Vector3(foe.position.x, foe.vertical + 2.5, foe.position.z),
        'crit',
      );
      this.ui.flash('hit');
    }
  }

  onPunchStart(dupla) {
    this.audio.play('whoosh', { pan: this.panFor(dupla) });
    this.audio.play('bark', { pan: this.panFor(dupla) });
    this.addShake(0.04);
  }

  onPunchMiss(dupla) {
    this.addFloater(
      '-10 FALLO',
      new THREE.Vector3(dupla.position.x, 2.75, dupla.position.z),
      'miss',
    );
    this.audio.play('yip', { pan: this.panFor(dupla) });
  }

  onFenceHit(dupla, impact, damage) {
    this.audio.play('bounce', { pan: this.panFor(dupla) });
    this.addShake(0.2, 0.2);
    const direction = new THREE.Vector3(-dupla.position.x, 0, -dupla.position.z).normalize();
    const point = new THREE.Vector3(
      dupla.position.x + direction.x * 0.7,
      0.5,
      dupla.position.z + direction.z * 0.7,
    );
    this.particles.dust(point, 8, { scale: 0.2, speed: 2.2, color: 0xc69a5f });
    this.addFloater(
      `-${Math.ceil(damage)}`,
      new THREE.Vector3(dupla.position.x, 2.5, dupla.position.z),
      'damage',
    );
  }

  onChickenBuck(dupla) {
    this.audio.play('buck', { pan: this.panFor(dupla) });
    this.particles.feathers(
      new THREE.Vector3(dupla.position.x, dupla.vertical + 1.2, dupla.position.z),
      [dupla.chickenSkin.body, dupla.chickenSkin.comb],
      4,
    );
  }

  onScaredSquawk(dupla) {
    this.audio.play('squawk', { pan: this.panFor(dupla), pitch: randomRange(0.9, 1.15) });
    this.particles.feathers(
      new THREE.Vector3(dupla.position.x, 1.2, dupla.position.z),
      [dupla.chickenSkin.body, dupla.chickenSkin.wing],
      5,
    );
  }

  onRagdollBounce(dupla) {
    this.audio.play('bounce', { pan: this.panFor(dupla) });
    this.addShake(0.08);
  }
}
