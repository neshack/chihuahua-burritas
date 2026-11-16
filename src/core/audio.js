import { clamp } from './utils.js';

const midiToFreq = (midi) => 440 * 2 ** ((midi - 69) / 12);
const MUTE_KEY = 'chihuahua-burritas-muted';

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicBus = null;
    this.sfxBus = null;
    this.noiseBuffer = null;
    this.muted = false;
    this.musicPlaying = false;
    this.musicTimer = null;
    this.nextNoteTime = 0;
    this.step = 0;
    this.tempo = 110;
    this.musicLevel = 0.55;
    this.intensity = 1;
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === '1';
    } catch {
      this.muted = false;
    }

    if (typeof window !== 'undefined') {
      const unlock = () => {
        this.ensure();
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
      };
      window.addEventListener('pointerdown', unlock, { capture: true, passive: true });
      window.addEventListener('touchstart', unlock, { capture: true, passive: true });
      window.addEventListener('keydown', unlock, { capture: true, passive: true });
      window.addEventListener('click', unlock, { capture: true, passive: true });
    }
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return true;
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return false;
    try {
      this.ctx = new AudioContextClass();
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.85;
      this.master.connect(this.ctx.destination);

      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0.5;
      this.musicBus.connect(this.master);

      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = 0.95;
      this.sfxBus.connect(this.master);

      const length = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buffer;
      return true;
    } catch {
      return false;
    }
  }

  get now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    try {
      localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0');
    } catch {
      /* ignore private mode */
    }
    if (!this.ctx) {
      if (!this.muted) this.ensure();
      return;
    }
    const time = this.ctx.currentTime;
    try {
      this.master.gain.cancelScheduledValues(time);
      this.master.gain.setValueAtTime(this.master.gain.value, time);
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.85, time, 0.03);
    } catch {
      this.master.gain.value = this.muted ? 0 : 0.85;
    }
    if (!this.muted && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  toggleMuted() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  tone({
    freq = 440,
    endFreq = null,
    type = 'sine',
    duration = 0.2,
    volume = 0.1,
    attack = 0.004,
    when = 0,
    detune = 0,
    filterFreq = null,
    filterType = 'lowpass',
    music = false,
    pan = 0,
  } = {}) {
    if (!this.ctx || this.muted) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    const now = this.now;
    const start = Math.max(now + 0.002, now + Math.max(0, when));
    const safeDuration = Math.max(0.02, duration);
    const safeAttack = Math.min(Math.max(0.002, attack), safeDuration * 0.45);
    const safeVol = Math.max(0.0002, volume);

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(20, freq), start);
      osc.detune.setValueAtTime(detune, start);
      if (endFreq && endFreq > 0) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), start + safeDuration);
      }
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(safeVol, start + safeAttack);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + safeDuration);

      let lastNode = gain;
      if (filterFreq) {
        const filter = this.ctx.createBiquadFilter();
        filter.type = filterType;
        filter.frequency.setValueAtTime(Math.max(20, filterFreq), start);
        filter.Q.value = 0.8;
        lastNode.connect(filter);
        lastNode = filter;
      }
      osc.connect(gain);
      if (pan && this.ctx.createStereoPanner) {
        const panner = this.ctx.createStereoPanner();
        panner.pan.value = clamp(pan, -1, 1);
        lastNode.connect(panner);
        panner.connect(music ? this.musicBus : this.sfxBus);
      } else {
        lastNode.connect(music ? this.musicBus : this.sfxBus);
      }
      osc.start(start);
      osc.stop(start + safeDuration + 0.04);
    } catch {
      /* Audio scheduling fallback */
    }
  }

  noise({
    duration = 0.2,
    volume = 0.1,
    when = 0,
    filterFreq = 1000,
    filterType = 'lowpass',
    sweepTo = null,
    q = 0.9,
    music = false,
    pan = 0,
  } = {}) {
    if (!this.ctx || !this.noiseBuffer || this.muted) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    const now = this.now;
    const start = Math.max(now + 0.002, now + Math.max(0, when));
    const safeDuration = Math.max(0.02, duration);
    const safeVol = Math.max(0.0002, volume);

    try {
      const source = this.ctx.createBufferSource();
      source.buffer = this.noiseBuffer;
      source.loop = true;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(safeVol, start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + safeDuration);

      const filter = this.ctx.createBiquadFilter();
      filter.type = filterType;
      filter.Q.value = q;
      filter.frequency.setValueAtTime(Math.max(40, filterFreq), start);
      if (sweepTo && sweepTo > 0) {
        filter.frequency.exponentialRampToValueAtTime(Math.max(40, sweepTo), start + safeDuration);
      }

      source.connect(filter);
      filter.connect(gain);
      if (pan && this.ctx.createStereoPanner) {
        const panner = this.ctx.createStereoPanner();
        panner.pan.value = clamp(pan, -1, 1);
        gain.connect(panner);
        panner.connect(music ? this.musicBus : this.sfxBus);
      } else {
        gain.connect(music ? this.musicBus : this.sfxBus);
      }
      source.start(start);
      source.stop(start + safeDuration + 0.03);
    } catch {
      /* Audio scheduling fallback */
    }
  }

  play(name, options = {}) {
    if (this.muted) return;
    if (!this.ctx) {
      if (!this.ensure()) return;
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    switch (name) {
      case 'cluck':
        this.cluck(options);
        break;
      case 'squawk':
        this.squawk(options);
        break;
      case 'bark':
        this.bark(options);
        break;
      case 'yip':
        this.bark({ ...options, volume: 1.3 });
        break;
      case 'whoosh':
        this.whoosh(options);
        break;
      case 'punch':
        this.punchHit(options);
        break;
      case 'clash':
        this.clash(options);
        break;
      case 'bounce':
        this.bounce(options);
        break;
      case 'jump':
        this.jump(options);
        break;
      case 'land':
        this.land(options);
        break;
      case 'stomp':
        this.stomp(options);
        break;
      case 'ko':
        this.ko(options);
        break;
      case 'win':
        this.victoryFanfare();
        break;
      case 'lose':
        this.loseSting();
        break;
      case 'count':
        this.countdown(options.step ?? 0);
        break;
      case 'go':
        this.go();
        break;
      case 'click':
        this.tone({ freq: 520, endFreq: 620, type: 'sine', duration: 0.06, volume: 0.05 });
        break;
      case 'select':
        this.tone({ freq: 700, endFreq: 920, type: 'triangle', duration: 0.09, volume: 0.05 });
        break;
      case 'damage':
        this.tone({ freq: 280, endFreq: 140, type: 'triangle', duration: 0.12, volume: 0.08 });
        break;
      case 'crowd':
        this.crowd(options);
        break;
      case 'peck':
        this.peck(options);
        break;
      case 'drumroll':
        this.drumroll(options);
        break;
      case 'present':
        this.present(options);
        break;
      case 'mount':
        this.mount(options);
        break;
      case 'skid':
        this.skid(options);
        break;
      case 'cornPickup':
        this.cornPickup(options);
        break;
      case 'hayBounce':
        this.hayBounce(options);
        break;
      case 'buck':
        this.buck(options);
        break;
      default:
        break;
    }
  }

  cluck({ pitch = 1, pan = 0 } = {}) {
    for (let i = 0; i < 3; i += 1) {
      const when = i * 0.075;
      const base = (760 + i * 90) * pitch;
      this.tone({
        freq: base,
        endFreq: base * 0.62,
        type: 'square',
        duration: 0.075,
        volume: 0.055,
        when,
        filterFreq: 2200,
        pan,
      });
      this.tone({
        freq: base * 0.55,
        endFreq: base * 0.38,
        type: 'sawtooth',
        duration: 0.07,
        volume: 0.028,
        when: when + 0.012,
        filterFreq: 1200,
        pan,
      });
    }
    this.noise({ duration: 0.2, volume: 0.025, filterType: 'bandpass', filterFreq: 1600, q: 1.4, pan });
  }

  squawk({ pan = 0, pitch = 1 } = {}) {
    this.tone({
      freq: 1150 * pitch,
      endFreq: 450 * pitch,
      type: 'sawtooth',
      duration: 0.3,
      volume: 0.11,
      when: 0,
      filterFreq: 2600,
      pan,
    });
    this.tone({
      freq: 620 * pitch,
      endFreq: 330 * pitch,
      type: 'square',
      duration: 0.22,
      volume: 0.05,
      when: 0.05,
      filterFreq: 1800,
      pan,
    });
    this.noise({ duration: 0.22, volume: 0.04, filterType: 'bandpass', filterFreq: 1900, q: 1.1, pan });
  }

  bark({ pan = 0, volume = 1 } = {}) {
    for (let i = 0; i < 2; i += 1) {
      const when = i * 0.105;
      this.tone({
        freq: 1350,
        endFreq: 700,
        type: 'square',
        duration: 0.085,
        volume: 0.045 * volume,
        when,
        filterFreq: 2800,
        pan,
      });
      this.tone({
        freq: 900,
        endFreq: 500,
        type: 'triangle',
        duration: 0.09,
        volume: 0.07 * volume,
        when,
        pan,
      });
    }
    this.noise({ duration: 0.12, volume: 0.025 * volume, filterType: 'bandpass', filterFreq: 2200, pan });
  }

  whoosh({ pan = 0 } = {}) {
    this.noise({
      duration: 0.2,
      volume: 0.18,
      filterType: 'bandpass',
      filterFreq: 500,
      sweepTo: 2100,
      q: 0.8,
      pan,
    });
    this.tone({
      freq: 190,
      endFreq: 820,
      type: 'sine',
      duration: 0.2,
      volume: 0.1,
      pan,
      when: 0.02,
    });
  }

  punchHit({ pan = 0 } = {}) {
    this.tone({ freq: 155, endFreq: 48, type: 'sine', duration: 0.26, volume: 0.5, pan });
    this.noise({ duration: 0.15, volume: 0.26, filterType: 'lowpass', filterFreq: 900, pan });
    this.tone({ freq: 320, endFreq: 120, type: 'triangle', duration: 0.1, volume: 0.12, pan });
    this.noise({ duration: 0.05, volume: 0.12, filterType: 'highpass', filterFreq: 2600, pan });
  }

  clash({ pan = 0 } = {}) {
    this.tone({ freq: 2000, endFreq: 1750, type: 'square', duration: 0.16, volume: 0.05, filterFreq: 5000, pan });
    this.tone({ freq: 2700, endFreq: 2400, type: 'triangle', duration: 0.22, volume: 0.04, pan });
    this.noise({ duration: 0.12, volume: 0.13, filterType: 'highpass', filterFreq: 2200, pan });
    this.tone({ freq: 180, endFreq: 90, type: 'sine', duration: 0.18, volume: 0.22, pan });
  }

  bounce({ pan = 0 } = {}) {
    this.tone({ freq: 120, endFreq: 55, type: 'sine', duration: 0.2, volume: 0.26, pan });
    this.noise({ duration: 0.14, volume: 0.16, filterType: 'bandpass', filterFreq: 500, q: 1.3, pan });
    this.noise({ duration: 0.06, volume: 0.1, filterType: 'highpass', filterFreq: 1800, pan });
  }

  jump({ pan = 0 } = {}) {
    this.noise({ duration: 0.1, volume: 0.07, filterType: 'bandpass', filterFreq: 900, q: 1, pan });
    this.tone({ freq: 360, endFreq: 660, type: 'sine', duration: 0.16, volume: 0.045, pan });
    for (let i = 0; i < 3; i += 1) {
      this.noise({
        duration: 0.055,
        volume: 0.055,
        filterType: 'bandpass',
        filterFreq: 1300,
        q: 1.4,
        when: 0.07 + i * 0.07,
        pan,
      });
    }
  }

  land({ pan = 0 } = {}) {
    this.tone({ freq: 110, endFreq: 60, type: 'sine', duration: 0.12, volume: 0.16, pan });
    this.noise({ duration: 0.12, volume: 0.1, filterType: 'lowpass', filterFreq: 600, pan });
  }

  stomp({ pan = 0 } = {}) {
    this.tone({ freq: 120, endFreq: 40, type: 'sine', duration: 0.3, volume: 0.36, pan });
    this.tone({ freq: 300, endFreq: 80, type: 'square', duration: 0.18, volume: 0.08, filterFreq: 800, pan });
    this.noise({ duration: 0.16, volume: 0.2, filterType: 'lowpass', filterFreq: 1200, pan });
  }

  ko({ pan = 0 } = {}) {
    this.tone({ freq: 520, endFreq: 85, type: 'sawtooth', duration: 0.75, volume: 0.12, filterFreq: 1300, pan });
    this.tone({ freq: 260, endFreq: 65, type: 'triangle', duration: 0.9, volume: 0.1, when: 0.08, pan });
    this.noise({ duration: 0.3, volume: 0.24, filterType: 'lowpass', filterFreq: 1000, pan });
    this.tone({ freq: 1500, endFreq: 900, type: 'square', duration: 0.2, volume: 0.045, when: 0.2, filterFreq: 3000, pan });
    this.crowd({ duration: 1.5, volume: 0.18 });
    this.squawk({ pan, pitch: 1.3 });
  }

  countdown(step = 0) {
    this.tone({
      freq: step >= 2 ? 880 : 660,
      type: 'triangle',
      duration: 0.16,
      volume: 0.14,
      filterFreq: 3000,
    });
    this.tone({
      freq: step >= 2 ? 1320 : 990,
      type: 'sine',
      duration: 0.12,
      volume: 0.05,
      when: 0.01,
    });
  }

  go() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, index) => {
      this.tone({
        freq,
        type: 'triangle',
        duration: 0.38,
        volume: 0.12,
        when: index * 0.035,
        filterFreq: 4000,
      });
    });
    this.noise({ duration: 0.3, volume: 0.08, filterType: 'highpass', filterFreq: 1200 });
  }

  crowd({ duration = 1.2, volume = 0.15 } = {}) {
    this.noise({
      duration,
      volume,
      filterType: 'bandpass',
      filterFreq: 700,
      sweepTo: 1400,
      q: 0.5,
    });
    this.noise({
      duration: duration * 0.8,
      volume: volume * 0.5,
      filterType: 'bandpass',
      filterFreq: 1500,
      q: 0.6,
      when: 0.08,
    });
  }

  loseSting() {
    this.tone({ freq: 330, endFreq: 180, type: 'triangle', duration: 0.5, volume: 0.1, filterFreq: 1200 });
    this.tone({ freq: 220, endFreq: 110, type: 'sawtooth', duration: 0.7, volume: 0.06, when: 0.1, filterFreq: 900 });
  }

  victoryFanfare() {
    if (!this.ctx) return;
    const melody = [
      [60, 0],
      [64, 0.12],
      [67, 0.24],
      [72, 0.38],
      [71, 0.56],
      [67, 0.68],
      [69, 0.82],
      [72, 0.96],
      [76, 1.2],
    ];
    for (const [midi, when] of melody) {
      this.tone({
        freq: midiToFreq(midi + 12),
        type: 'sawtooth',
        duration: when > 1 ? 0.7 : 0.26,
        volume: 0.055,
        when,
        filterFreq: 2300,
        detune: 4,
      });
      this.tone({
        freq: midiToFreq(midi),
        type: 'triangle',
        duration: 0.22,
        volume: 0.12,
        when,
      });
    }
    for (let i = 0; i < 4; i += 1) {
      this.noise({
        duration: 0.1,
        volume: 0.07,
        filterType: 'bandpass',
        filterFreq: 1800,
        q: 1.2,
        when: i * 0.25,
      });
      this.noise({
        duration: 0.08,
        volume: 0.05,
        filterType: 'bandpass',
        filterFreq: 2400,
        when: i * 0.25 + 0.13,
      });
    }
    this.crowd({ duration: 2.2, volume: 0.2 });
  }

  peck({ pan = 0, volume = 1 } = {}) {
    // Click 1: 1400Hz
    this.tone({
      freq: 1400,
      endFreq: 1050,
      type: 'triangle',
      duration: 0.035,
      volume: 0.08 * volume,
      when: 0,
      pan,
    });
    this.noise({
      duration: 0.025,
      volume: 0.06 * volume,
      filterType: 'bandpass',
      filterFreq: 1400,
      q: 2.2,
      when: 0,
      pan,
    });

    // Click 2: 1800Hz
    this.tone({
      freq: 1800,
      endFreq: 1350,
      type: 'triangle',
      duration: 0.035,
      volume: 0.07 * volume,
      when: 0.045,
      pan,
    });
    this.noise({
      duration: 0.025,
      volume: 0.05 * volume,
      filterType: 'bandpass',
      filterFreq: 1800,
      q: 2.5,
      when: 0.045,
      pan,
    });

    // Contented soft low cluck
    this.tone({
      freq: 580,
      endFreq: 340,
      type: 'square',
      duration: 0.05,
      volume: 0.02 * volume,
      when: 0.085,
      filterFreq: 1600,
      pan,
    });
    this.tone({
      freq: 390,
      endFreq: 250,
      type: 'triangle',
      duration: 0.06,
      volume: 0.025 * volume,
      when: 0.09,
      pan,
    });
  }

  drumroll({ pan = 0, volume = 1 } = {}) {
    const hits = 8;
    const interval = 0.45 / hits;
    for (let i = 0; i < hits; i += 1) {
      const when = i * interval;
      const progress = i / (hits - 1);
      const hitVol = (0.04 + progress * 0.07) * volume;
      this.tone({
        freq: 110 + i * 4,
        endFreq: 60,
        type: 'sine',
        duration: 0.075,
        volume: hitVol * 1.3,
        when,
        pan,
      });
      this.noise({
        duration: 0.045,
        volume: hitVol * 0.95,
        filterType: 'bandpass',
        filterFreq: 1100 + i * 110,
        q: 1.6,
        when,
        pan,
      });
    }
  }

  present({ pan = 0, volume = 1 } = {}) {
    const triad = [
      { freq: 523.25, when: 0, duration: 0.12 },
      { freq: 659.25, when: 0.1, duration: 0.12 },
      { freq: 783.99, when: 0.2, duration: 0.45 },
    ];
    triad.forEach(({ freq, when, duration }, idx) => {
      this.tone({
        freq,
        type: 'sawtooth',
        duration,
        volume: (idx === 2 ? 0.11 : 0.08) * volume,
        when,
        filterFreq: 2500,
        detune: 4,
        pan,
      });
      this.tone({
        freq,
        type: 'triangle',
        duration,
        volume: (idx === 2 ? 0.13 : 0.09) * volume,
        when,
        pan,
      });
    });
    this.noise({
      duration: 0.1,
      volume: 0.07 * volume,
      filterType: 'bandpass',
      filterFreq: 2400,
      q: 1.4,
      when: 0.2,
      pan,
    });
  }

  mount({ pan = 0, volume = 1 } = {}) {
    // Rising slide whistle leap (420Hz -> 1180Hz)
    this.tone({
      freq: 420,
      endFreq: 1180,
      type: 'sine',
      duration: 0.2,
      volume: 0.14 * volume,
      when: 0,
      pan,
    });
    // Saddle leather thud at +0.18s (110Hz -> 45Hz)
    this.tone({
      freq: 110,
      endFreq: 45,
      type: 'sine',
      duration: 0.22,
      volume: 0.38 * volume,
      when: 0.18,
      pan,
    });
    this.noise({
      duration: 0.14,
      volume: 0.22 * volume,
      filterType: 'lowpass',
      filterFreq: 580,
      when: 0.18,
      pan,
    });
    // Startled squawk at +0.18s
    this.tone({
      freq: 1200,
      endFreq: 500,
      type: 'sawtooth',
      duration: 0.24,
      volume: 0.09 * volume,
      when: 0.2,
      filterFreq: 2600,
      pan,
    });
    this.tone({
      freq: 650,
      endFreq: 350,
      type: 'square',
      duration: 0.18,
      volume: 0.045 * volume,
      when: 0.22,
      filterFreq: 1800,
      pan,
    });
    this.noise({
      duration: 0.18,
      volume: 0.04 * volume,
      filterType: 'bandpass',
      filterFreq: 1900,
      q: 1.1,
      when: 0.2,
      pan,
    });
  }

  skid({ pan = 0, volume = 1 } = {}) {
    // Gritty dirt-scraping noise (850Hz -> 420Hz, duration 0.16s, volume 0.09)
    this.noise({
      duration: 0.16,
      volume: 0.09 * volume,
      filterType: 'bandpass',
      filterFreq: 850,
      sweepTo: 420,
      q: 1.2,
      pan,
    });
    this.tone({
      freq: 180,
      endFreq: 95,
      type: 'triangle',
      duration: 0.14,
      volume: 0.035 * volume,
      filterFreq: 500,
      pan,
    });
  }

  cornPickup({ pan = 0, volume = 1 } = {}) {
    // Crunchy bite
    this.noise({
      duration: 0.055,
      volume: 0.12 * volume,
      filterType: 'bandpass',
      filterFreq: 2800,
      q: 2.2,
      when: 0,
      pan,
    });
    this.noise({
      duration: 0.04,
      volume: 0.08 * volume,
      filterType: 'highpass',
      filterFreq: 3400,
      when: 0.02,
      pan,
    });
    // Ascending 3-note fiesta arpeggio (587Hz, 740Hz, 880Hz)
    const notes = [587, 740, 880];
    notes.forEach((freq, idx) => {
      const when = 0.03 + idx * 0.065;
      this.tone({
        freq,
        type: 'triangle',
        duration: 0.18,
        volume: 0.11 * volume,
        when,
        pan,
      });
      this.tone({
        freq: freq * 2,
        type: 'sine',
        duration: 0.12,
        volume: 0.04 * volume,
        when,
        pan,
      });
    });
  }

  hayBounce({ pan = 0, volume = 1 } = {}) {
    // Elastic boing (160Hz -> 420Hz -> 240Hz)
    this.tone({
      freq: 160,
      endFreq: 420,
      type: 'sine',
      duration: 0.1,
      volume: 0.28 * volume,
      when: 0,
      pan,
    });
    this.tone({
      freq: 160,
      endFreq: 420,
      type: 'triangle',
      duration: 0.1,
      volume: 0.14 * volume,
      when: 0,
      pan,
    });
    this.tone({
      freq: 420,
      endFreq: 240,
      type: 'sine',
      duration: 0.18,
      volume: 0.24 * volume,
      when: 0.09,
      pan,
    });
    this.tone({
      freq: 420,
      endFreq: 240,
      type: 'triangle',
      duration: 0.18,
      volume: 0.11 * volume,
      when: 0.09,
      pan,
    });
    // Straw rustle noise
    this.noise({
      duration: 0.22,
      volume: 0.14 * volume,
      filterType: 'bandpass',
      filterFreq: 1800,
      sweepTo: 850,
      q: 1.1,
      pan,
    });
    this.noise({
      duration: 0.08,
      volume: 0.08 * volume,
      filterType: 'highpass',
      filterFreq: 2900,
      when: 0.02,
      pan,
    });
  }

  buck({ pan = 0, volume = 1 } = {}) {
    // Agitated double-squawk + wing flutter
    this.tone({
      freq: 1180,
      endFreq: 460,
      type: 'sawtooth',
      duration: 0.18,
      volume: 0.1 * volume,
      when: 0,
      filterFreq: 2500,
      pan,
    });
    this.tone({
      freq: 660,
      endFreq: 320,
      type: 'square',
      duration: 0.14,
      volume: 0.05 * volume,
      when: 0.02,
      filterFreq: 1800,
      pan,
    });

    for (let i = 0; i < 4; i += 1) {
      this.noise({
        duration: 0.055,
        volume: 0.065 * volume,
        filterType: 'bandpass',
        filterFreq: 1100 + (i % 2) * 300,
        q: 1.3,
        when: 0.03 + i * 0.06,
        pan,
      });
    }

    this.tone({
      freq: 1350,
      endFreq: 520,
      type: 'sawtooth',
      duration: 0.22,
      volume: 0.11 * volume,
      when: 0.16,
      filterFreq: 2700,
      pan,
    });
    this.tone({
      freq: 720,
      endFreq: 360,
      type: 'square',
      duration: 0.16,
      volume: 0.055 * volume,
      when: 0.18,
      filterFreq: 1900,
      pan,
    });
  }

  startMusic() {
    if (!this.ensure() || this.musicPlaying) return;
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => {
        if (this.musicPlaying && this.ctx) {
          this.nextNoteTime = this.ctx.currentTime + 0.05;
        }
      }).catch(() => {});
    }
    this.musicPlaying = true;
    this.step = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.08;
    try {
      this.musicBus.gain.setTargetAtTime(0.5, this.ctx.currentTime, 0.2);
    } catch {
      this.musicBus.gain.value = 0.5;
    }
    if (!this.musicTimer) {
      this.musicTimer = window.setInterval(() => this.scheduleMusic(), 35);
    }
    this.scheduleMusic();
  }

  stopMusic() {
    this.musicPlaying = false;
    if (this.musicTimer) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    if (this.ctx && this.musicBus) {
      try {
        this.musicBus.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.15);
      } catch {
        this.musicBus.gain.value = 0.0001;
      }
    }
  }

  duckMusic(ducked) {
    if (!this.ctx || !this.musicBus) return;
    try {
      this.musicBus.gain.setTargetAtTime(ducked ? 0.08 : 0.5, this.ctx.currentTime, 0.15);
    } catch {
      this.musicBus.gain.value = ducked ? 0.08 : 0.5;
    }
  }

  scheduleMusic() {
    if (!this.musicPlaying || !this.ctx || this.muted) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
      return;
    }
    const stepDuration = 60 / this.tempo / 2;
    const now = this.ctx.currentTime;
    if (this.nextNoteTime < now) {
      this.nextNoteTime = now + 0.02;
    }
    while (this.nextNoteTime < now + 0.16) {
      const when = Math.max(0.001, this.nextNoteTime - now);
      this.scheduleStep(this.step, when);
      this.nextNoteTime += stepDuration;
      this.step = (this.step + 1) % 32;
    }
  }

  scheduleStep(step, when) {
    if (!this.ctx) return;
    const bar = Math.floor(step / 8);
    const beat = step % 8;
    const chords = [
      [60, 64, 67],
      [57, 60, 64],
      [53, 57, 60],
      [55, 59, 62],
    ];
    const roots = [36, 33, 29, 31];
    const chord = chords[bar];
    const root = roots[bar];

    // Mariachi guitar pulse on every beat.
    if (beat % 2 === 0) {
      for (let i = 0; i < 3; i += 1) {
        this.tone({
          freq: midiToFreq(chord[i] + 12),
          type: 'triangle',
          duration: 0.2,
          volume: 0.02,
          when,
          music: true,
          pan: (i - 1) * 0.2,
        });
      }
      this.tone({
        freq: midiToFreq(root),
        type: 'triangle',
        duration: 0.28,
        volume: 0.08,
        when,
        music: true,
        filterFreq: 420,
      });
    }

    // Shaker.
    this.noise({
      duration: 0.045,
      volume: 0.018,
      filterType: 'highpass',
      filterFreq: 5000,
      when,
      music: true,
      pan: 0.25,
    });

    // Marimba arpeggio, sparse and bouncy.
    if ([0, 2, 3, 5, 6].includes(beat)) {
      const note = chord[(beat + bar) % 3] + 12 + (beat === 5 ? 12 : 0);
      this.tone({
        freq: midiToFreq(note),
        type: 'triangle',
        duration: 0.3,
        volume: 0.045,
        when,
        music: true,
        pan: -0.15,
      });
    }

    // Palmas on the backbeat.
    if (beat === 2 || beat === 6) {
      this.noise({
        duration: 0.08,
        volume: 0.045,
        filterType: 'bandpass',
        filterFreq: 1900,
        q: 1.3,
        when,
        music: true,
      });
      this.noise({
        duration: 0.05,
        volume: 0.02,
        filterType: 'highpass',
        filterFreq: 3000,
        when: when + 0.01,
        music: true,
      });
    }

    // Low drum.
    if (beat === 0 || beat === 4) {
      this.tone({
        freq: 90,
        endFreq: 50,
        type: 'sine',
        duration: 0.16,
        volume: 0.06,
        when,
        music: true,
      });
    }

    // Sparse trumpet answer every other phrase.
    if (bar >= 2 && (beat === 1 || beat === 4)) {
      const notes = bar === 2 ? [67, 64] : [71, 67];
      const note = notes[beat === 1 ? 0 : 1];
      this.tone({
        freq: midiToFreq(note),
        type: 'sawtooth',
        duration: 0.3,
        volume: 0.022,
        when,
        music: true,
        filterFreq: 1500,
        detune: 3,
      });
    }
  }
}
