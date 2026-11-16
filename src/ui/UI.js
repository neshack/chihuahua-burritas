import { CHICKEN_SKINS, DOG_SKINS, getChickenSkin, getDogSkin } from '../world/skins.js';
import { clamp } from '../core/utils.js';

const SPEAKER_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 9h4l5-4v14l-5-4H4z" />
    <path d="M16.5 8.5a5 5 0 0 1 0 7" />
    <path d="M19 6a8.5 8.5 0 0 1 0 12" />
  </svg>`;

const MUTED_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 9h4l5-4v14l-5-4H4z" />
    <path d="M17 9l4 6" />
    <path d="M21 9l-4 6" />
  </svg>`;

const PAPEL_COLORS = ['#e63946', '#f2c14e', '#2a9d8f', '#e8782e', '#d94f9b', '#5b9bd5', '#8ac926'];

export class UI {
  constructor(handlers = {}) {
    this.handlers = handlers;
    this.selected = {
      chicken: 'clasica',
      dog: 'clasico',
      p2Chicken: 'guerrera',
      p2Dog: 'guerrero',
    };
    this.editingPlayer = 1; // 1 or 2
    this.mode = 'cpu';
    this.thumbnails = null;
    this.announceTimer = null;
    this.hintTimer = null;
    this.howOpen = false;
    this.lastFocused = null;
    this.hudCache = new Map();
    this.lastScore = null;
    this.lastRound = null;
    this.endTimer = null;
    this.buildPapel();
    this.cacheDom();
    this.dom.howModal?.setAttribute('aria-hidden', 'true');
    this.dom.endScreen?.setAttribute('aria-hidden', 'true');
    this.dom.pauseScreen?.setAttribute('aria-hidden', 'true');
    try {
      this.dom.regeneration.checked = localStorage.getItem('burritas-regeneration') !== 'false';
    } catch { /* Storage may be unavailable; keep the default enabled. */ }
    this.dom.countGallina.textContent = `${CHICKEN_SKINS.length} estilos`;
    this.dom.countDog.textContent = `${DOG_SKINS.length} estilos`;
    this.bindEvents();
    this.setSoundMuted(false);
    this.updateSlotSummaries();
  }

  cacheDom() {
    const $ = (selector) => document.querySelector(selector);
    this.$ = $;
    this.dom = {
      canvas: $('#gameCanvas'),
      hud: $('#hud'),
      startScreen: $('#startScreen'),
      pauseScreen: $('#pauseScreen'),
      endScreen: $('#endScreen'),
      howModal: $('#howModal'),
      loading: $('#loadingScreen'),
      announce: $('#announce'),
      floaters: $('#floaters'),
      danger: $('#dangerVignette'),
      flash: $('#screenFlash'),
      gallinaGrid: $('#gallinaGrid'),
      countGallina: $('#countGallina'),
      countDog: $('#countDog'),
      regeneration: $('#regeneration'),
      dogGrid: $('#dogGrid'),
      tabPlayer1: $('#tabPlayer1'),
      tabPlayer2: $('#tabPlayer2'),
      badgeP2: $('#badgeP2'),
      labelP2: $('#labelP2'),
      summaryP1: $('#summaryP1'),
      summaryP2: $('#summaryP2'),
      btnRandomSkin: $('#btnRandomSkin'),
      btnFight: $('#btnFight'),
      btnHow: $('#btnHow'),
      btnCloseHow: $('#btnCloseHow'),
      btnHowCloseBottom: $('#btnHowCloseBottom'),
      btnResume: $('#btnResume'),
      btnRestart: $('#btnRestart'),
      btnQuitPause: $('#btnQuitPause'),
      btnRematch: $('#btnRematch'),
      btnMenu: $('#btnMenu'),
      btnSound: $('#btnSound'),
      btnPause: $('#btnPause'),
      modeButtons: [...document.querySelectorAll('.mode-btn')],
      controlsHint: $('#controlsHint'),
      cinematicBar: $('#cinematicBar'),
      cinematicKicker: $('#cinematicKicker'),
      cinematicText: $('#cinematicText'),
      cinematicSubtext: $('#cinematicSubtext'),
      roundLabel: $('#roundLabel'),
      scoreP1: $('#scoreP1'),
      scoreP2: $('#scoreP2'),
      pipsP1: $('#pipsP1'),
      pipsP2: $('#pipsP2'),
      endKicker: $('#endKicker'),
      endTitle: $('#endTitle'),
      endSub: $('#endSub'),
      endScore: $('#endScore'),
    };

    this.playerDom = {
      1: {
        card: $('#balanceP1'),
        tag: $('#tagP1'),
        skin: $('#skinP1'),
        value: $('#valueP1'),
        fill: $('#fillP1'),
        ghost: $('#ghostP1'),
        status: $('#statusP1'),
        portrait: $('#portraitP1'),
      },
      2: {
        card: $('#balanceP2'),
        tag: $('#tagP2'),
        skin: $('#skinP2'),
        value: $('#valueP2'),
        fill: $('#fillP2'),
        ghost: $('#ghostP2'),
        status: $('#statusP2'),
        portrait: $('#portraitP2'),
      },
    };
  }

  buildPapel() {
    const container = document.getElementById('papelTop');
    if (!container) return;
    const count = 20;
    let html = '';
    for (let i = 0; i < count; i += 1) {
      const color = PAPEL_COLORS[i % PAPEL_COLORS.length];
      html += `<span class="papel-flag" style="--flag:${color};animation-delay:-${(i * 0.37).toFixed(2)}s"></span>`;
    }
    container.innerHTML = html;
  }

  bindEvents() {
    this.dom.regeneration.addEventListener('change', () => {
      const enabled = this.dom.regeneration.checked;
      try { localStorage.setItem('burritas-regeneration', String(enabled)); } catch { /* Continue without persistence. */ }
      this.handlers.onRegenerationChange?.(enabled);
    });
    this.dom.modeButtons.forEach((button) => {
      button.addEventListener('click', () => {
        this.setMode(button.dataset.mode, true);
      });
    });

    this.dom.tabPlayer1?.addEventListener('click', () => this.setEditingPlayer(1));
    this.dom.tabPlayer2?.addEventListener('click', () => this.setEditingPlayer(2));
    this.dom.tabPlayer1?.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        this.setEditingPlayer(2);
        this.dom.tabPlayer2?.focus();
      }
    });
    this.dom.tabPlayer2?.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        this.setEditingPlayer(1);
        this.dom.tabPlayer1?.focus();
      }
    });

    this.dom.btnRandomSkin?.addEventListener('click', () => this.randomizeCurrentSlot());

    this.dom.btnFight.addEventListener('click', () => {
      document.activeElement?.blur?.();
      this.handlers.onStart?.(this.getSettings());
    });

    this.dom.btnHow?.addEventListener('click', () => this.openHow());
    this.dom.btnCloseHow?.addEventListener('click', () => this.closeHow());
    this.dom.btnHowCloseBottom?.addEventListener('click', () => {
      this.closeHow();
      document.activeElement?.blur?.();
      this.handlers.onStart?.(this.getSettings());
    });
    this.dom.howModal?.addEventListener('click', (event) => {
      if (event.target === this.dom.howModal) this.closeHow();
    });

    this.dom.btnPause?.addEventListener('click', () => this.handlers.onPause?.());
    this.dom.btnSound?.addEventListener('click', () => {
      const muted = this.handlers.onToggleSound?.();
      if (typeof muted === 'boolean') this.setSoundMuted(muted);
    });

    this.dom.btnResume?.addEventListener('click', () => this.handlers.onResume?.());
    this.dom.btnRestart?.addEventListener('click', () => this.handlers.onRestart?.());
    this.dom.btnQuitPause?.addEventListener('click', () => this.handlers.onQuit?.());
    this.dom.btnRematch?.addEventListener('click', () => this.handlers.onRematch?.());
    this.dom.btnMenu?.addEventListener('click', () => this.handlers.onMenu?.());

    window.addEventListener('keydown', (event) => {
      if (event.code === 'Escape' && this.howOpen) {
        event.preventDefault();
        this.closeHow();
      }
    });
  }

  setEditingPlayer(player) {
    const next = player === 2 ? 2 : 1;
    if (this.editingPlayer === next) return;
    this.editingPlayer = next;
    this.dom.tabPlayer1?.classList.toggle('is-active', this.editingPlayer === 1);
    this.dom.tabPlayer1?.setAttribute('aria-selected', this.editingPlayer === 1 ? 'true' : 'false');
    this.dom.tabPlayer2?.classList.toggle('is-active', this.editingPlayer === 2);
    this.dom.tabPlayer2?.setAttribute('aria-selected', this.editingPlayer === 2 ? 'true' : 'false');
    this.updateSkinCards();
  }

  updateSlotSummaries() {
    const p1C = getChickenSkin(this.selected.chicken);
    const p1D = getDogSkin(this.selected.dog);
    const p2C = getChickenSkin(this.selected.p2Chicken);
    const p2D = getDogSkin(this.selected.p2Dog);

    if (this.dom.summaryP1) {
      this.dom.summaryP1.textContent = `${p1C.name} · ${p1D.name}`;
    }
    if (this.dom.summaryP2) {
      this.dom.summaryP2.textContent = `${p2C.name} · ${p2D.name}`;
    }
    if (this.dom.labelP2) {
      this.dom.labelP2.textContent = this.mode === 'cpu' ? 'RIVAL CPU' : 'JUGADOR 2';
    }
    if (this.dom.badgeP2) {
      this.dom.badgeP2.textContent = this.mode === 'cpu' ? 'CPU' : 'P2';
    }
  }

  randomizeCurrentSlot() {
    const randomChicken = CHICKEN_SKINS[Math.floor(Math.random() * CHICKEN_SKINS.length)];
    const randomDog = DOG_SKINS[Math.floor(Math.random() * DOG_SKINS.length)];
    if (this.editingPlayer === 1) {
      this.selected.chicken = randomChicken.id;
      this.selected.dog = randomDog.id;
    } else {
      this.selected.p2Chicken = randomChicken.id;
      this.selected.p2Dog = randomDog.id;
    }
    this.updateSkinCards();
    this.updateSlotSummaries();
    const chosenChicken = this.editingPlayer === 1 ? this.selected.chicken : this.selected.p2Chicken;
    const chosenDog = this.editingPlayer === 1 ? this.selected.dog : this.selected.p2Dog;
    this.handlers.onSkinChange?.('chicken', chosenChicken, this.editingPlayer, this.getSettings());
    this.handlers.onSkinChange?.('dog', chosenDog, this.editingPlayer, this.getSettings());
  }

  setThumbnails(thumbnails) {
    this.thumbnails = thumbnails;
    this.buildSkins();
  }

  buildSkins() {
    if (!this.thumbnails) return;
    const build = (container, skins, kind) => {
      if (!container) return;
      container.innerHTML = '';
      for (const skin of skins) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'skin-card';
        button.dataset.kind = kind;
        button.dataset.id = skin.id;
        button.setAttribute('aria-label', `${kind === 'chicken' ? 'Gallina' : 'Chihuahua'} ${skin.name}: ${skin.tag}`);
        button.title = skin.tag;

        const art = document.createElement('span');
        art.className = 'skin-art';
        art.style.setProperty('--ca', skin.card[0]);
        art.style.setProperty('--cb', skin.card[1]);
        const img = document.createElement('img');
        img.src = this.thumbnails[kind][skin.id];
        img.alt = '';
        img.draggable = false;
        art.appendChild(img);

        const name = document.createElement('span');
        name.className = 'skin-name';
        name.textContent = skin.name;

        const badges = document.createElement('span');
        badges.className = 'skin-badges';
        badges.setAttribute('aria-hidden', 'true');

        const badgeP1 = document.createElement('span');
        badgeP1.className = 'skin-badge-pill p1';
        badgeP1.textContent = 'P1';

        const badgeP2 = document.createElement('span');
        badgeP2.className = 'skin-badge-pill p2';
        badgeP2.textContent = this.mode === 'cpu' ? 'CPU' : 'P2';

        badges.append(badgeP1, badgeP2);
        button.append(art, name, badges);
        button.addEventListener('click', () => this.pickSkin(kind, skin.id));
        container.appendChild(button);
      }
    };

    build(this.dom.gallinaGrid, CHICKEN_SKINS, 'chicken');
    build(this.dom.dogGrid, DOG_SKINS, 'dog');
    this.updateSkinCards();
    this.updateSlotSummaries();
  }

  updateSkinCards() {
    const updateGrid = (grid, kind) => {
      if (!grid) return;
      const isChicken = kind === 'chicken';
      const selP1 = isChicken ? this.selected.chicken : this.selected.dog;
      const selP2 = isChicken ? this.selected.p2Chicken : this.selected.p2Dog;
      const activeId = this.editingPlayer === 1 ? selP1 : selP2;

      grid.querySelectorAll('.skin-card').forEach((card) => {
        const id = card.dataset.id;
        const isP1 = id === selP1;
        const isP2 = id === selP2;
        const isActive = id === activeId;

        card.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        card.classList.toggle('is-active-selection', isActive);
        card.dataset.activePlayer = isActive ? String(this.editingPlayer) : '';

        const badgeP1 = card.querySelector('.skin-badge-pill.p1');
        const badgeP2 = card.querySelector('.skin-badge-pill.p2');
        if (badgeP1) badgeP1.classList.toggle('is-selected', isP1);
        if (badgeP2) {
          badgeP2.classList.toggle('is-selected', isP2);
          badgeP2.textContent = this.mode === 'cpu' ? 'CPU' : 'P2';
        }
      });
    };

    updateGrid(this.dom.gallinaGrid, 'chicken');
    updateGrid(this.dom.dogGrid, 'dog');
  }

  pickSkin(kind, id) {
    const isChicken = kind === 'chicken';
    if (this.editingPlayer === 1) {
      const key = isChicken ? 'chicken' : 'dog';
      if (this.selected[key] === id) return;
      this.selected[key] = id;
    } else {
      const key = isChicken ? 'p2Chicken' : 'p2Dog';
      if (this.selected[key] === id) return;
      this.selected[key] = id;
    }

    this.updateSkinCards();
    this.updateSlotSummaries();
    this.handlers.onSkinChange?.(kind, id, this.editingPlayer, this.getSettings());
  }

  setSelectedSkins(settings = {}) {
    if (settings.chicken) this.selected.chicken = settings.chicken;
    if (settings.dog) this.selected.dog = settings.dog;
    if (settings.p2Chicken) this.selected.p2Chicken = settings.p2Chicken;
    if (settings.p2Dog) this.selected.p2Dog = settings.p2Dog;
    this.updateSkinCards();
    this.updateSlotSummaries();
  }

  setMode(mode, notify = false) {
    this.mode = mode === 'local' ? 'local' : 'cpu';
    this.dom.modeButtons.forEach((button) => {
      const active = button.dataset.mode === this.mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    this.updateSlotSummaries();
    this.updateSkinCards();
    if (notify) this.handlers.onModeChange?.(this.mode);
  }

  hideMenu() {
    this.dom.startScreen.classList.add('is-hidden');
    this.dom.endScreen.classList.add('is-hidden');
    this.dom.pauseScreen.classList.add('is-hidden');
    this.dom.endScreen.setAttribute('aria-hidden', 'true');
    this.dom.pauseScreen.setAttribute('aria-hidden', 'true');
    this.hideCinematicBar();
  }

  getSettings() {
    return {
      mode: this.mode,
      regeneration: this.dom.regeneration.checked,
      chicken: this.selected.chicken,
      dog: this.selected.dog,
      p2Chicken: this.selected.p2Chicken,
      p2Dog: this.selected.p2Dog,
    };
  }

  setPlayerInfo(player, { tag, skinLabel, portraitUrl }) {
    const dom = this.playerDom[player];
    if (!dom) return;
    if (tag !== undefined) dom.tag.textContent = tag;
    if (skinLabel !== undefined) dom.skin.textContent = skinLabel;
    if (portraitUrl) dom.portrait.src = portraitUrl;
    dom.portrait.alt = `Retrato de ${skinLabel ?? 'la dupla'}`;
  }

  resetHud() {
    this.hudCache.clear();
    this.lastScore = null;
    this.lastRound = null;
    for (const player of [1, 2]) {
      const dom = this.playerDom[player];
      dom.fill.style.width = '100%';
      dom.ghost.style.width = '100%';
      dom.value.textContent = '100';
      dom.card.classList.remove('is-low', 'is-warning', 'is-ko');
      dom.status.textContent = '';
      dom.status.className = 'status-chip';
    }
    this.setDanger(false);
    this.hideCinematicBar();
  }

  updateHUD({ p1, p2, score, round, roundWins }) {
    this.applyPlayer(1, p1);
    this.applyPlayer(2, p2);

    if (score) {
      if (!this.lastScore || this.lastScore[0] !== score[0]) {
        this.dom.scoreP1.textContent = String(score[0]);
        [...this.dom.pipsP1.children].forEach((pip, index) => {
          pip.classList.toggle('is-won', index < score[0]);
        });
      }
      if (!this.lastScore || this.lastScore[1] !== score[1]) {
        this.dom.scoreP2.textContent = String(score[1]);
        [...this.dom.pipsP2.children].forEach((pip, index) => {
          pip.classList.toggle('is-won', index < score[1]);
        });
      }
      this.lastScore = [score[0], score[1]];
    }

    if (round && round !== this.lastRound) {
      this.dom.roundLabel.textContent = `RONDA ${round}`;
      this.lastRound = round;
    }

    const aliveMin = Math.min(
      p1 && p1.alive ? p1.balance : 101,
      p2 && p2.alive ? p2.balance : 101,
    );
    this.setDanger(aliveMin < 22 && !!roundWins);
  }

  applyPlayer(player, data) {
    if (!data) return;
    const dom = this.playerDom[player];
    const balance = clamp(data.balance ?? 0, 0, 100);
    const rounded = Math.ceil(balance);
    const cornBoostActive = (data.cornBoost ?? 0) > 0;
    const buckingActive = Boolean(data.bucking);
    const brakingActive = Boolean(data.braking);
    const cacheKey = `${player}:${rounded}:${data.alive}:${data.vulnerable}:${data.cooldown > 0}:${cornBoostActive}:${buckingActive}:${brakingActive}`;
    if (this.hudCache.get(player) === cacheKey) return;
    this.hudCache.set(player, cacheKey);

    dom.fill.style.width = `${balance}%`;
    dom.ghost.style.width = `${balance}%`;
    dom.value.textContent = String(rounded);

    dom.card.classList.toggle('is-low', data.alive && balance < 28);
    dom.card.classList.toggle('is-warning', data.alive && balance >= 28 && balance < 55);
    dom.card.classList.toggle('is-ko', !data.alive);

    let status = '';
    let statusClass = '';
    if (!data.alive) {
      status = 'TUMBADO';
      statusClass = 'is-danger';
    } else if (data.vulnerable > 0) {
      status = 'VULNERABLE';
      statusClass = 'is-vulnerable';
    } else if (balance < 28) {
      status = '¡AL BORDE!';
      statusClass = 'is-danger';
    } else if (cornBoostActive) {
      status = '¡TURBO MAÍZ!';
      statusClass = 'is-boost';
    } else if (buckingActive) {
      status = '¡GALLINA LOCA!';
      statusClass = 'is-bucking';
    } else if (brakingActive) {
      status = 'FRENANDO';
      statusClass = 'is-braking';
    }
    dom.status.textContent = status;
    dom.status.className = `status-chip${status ? ' is-visible' : ''}${statusClass ? ` ${statusClass}` : ''}`;
  }

  setDanger(on) {
    this.dom.danger.classList.toggle('is-on', on);
  }

  announce(text, tone = 'cream', duration = 1200) {
    const el = this.dom.announce;
    if (!el) return;
    if (this.announceTimer) window.clearTimeout(this.announceTimer);
    el.classList.remove('is-visible');
    el.textContent = text;
    el.dataset.tone = tone;
    // Force the pop animation to restart.
    void el.offsetWidth;
    el.classList.add('is-visible');
    if (duration > 0) {
      this.announceTimer = window.setTimeout(() => {
        el.classList.remove('is-visible');
      }, duration);
    }
  }

  hideAnnounce() {
    if (this.announceTimer) window.clearTimeout(this.announceTimer);
    this.dom.announce.classList.remove('is-visible');
  }

  floater(text, x, y, tone = 'damage') {
    const container = this.dom.floaters;
    if (!container) return;
    while (container.children.length > 15) container.firstElementChild?.remove();
    const el = document.createElement('span');
    el.className = 'floater';
    el.textContent = text;
    el.dataset.tone = tone;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    container.appendChild(el);
    window.setTimeout(() => el.remove(), 1200);
  }

  clearFloaters() {
    this.dom.floaters.replaceChildren();
  }

  flash(tone = 'hit') {
    const el = this.dom.flash;
    if (!el) return;
    el.className = 'screen-flash';
    void el.offsetWidth;
    el.classList.add(`flash-${tone}`);
  }

  showHUD(show = true) {
    this.dom.hud.classList.toggle('is-hidden', !show);
    if (show) {
      this.dom.controlsHint.classList.remove('is-faded');
      if (this.hintTimer) window.clearTimeout(this.hintTimer);
      this.hintTimer = window.setTimeout(() => {
        this.dom.controlsHint.classList.add('is-faded');
      }, 9000);
    } else {
      this.hideCinematicBar();
    }
  }

  showMenu() {
    this.closeHow();
    this.dom.startScreen.classList.remove('is-hidden');
    this.dom.pauseScreen.classList.add('is-hidden');
    this.dom.endScreen.classList.add('is-hidden');
    this.dom.pauseScreen.setAttribute('aria-hidden', 'true');
    this.dom.endScreen.setAttribute('aria-hidden', 'true');
    this.dom.hud.classList.add('is-hidden');
    this.dom.hud.inert = false;
    this.hideAnnounce();
    this.clearFloaters();
    this.setDanger(false);
    this.dom.danger.classList.remove('is-on');
    this.dom.controlsHint.classList.remove('is-faded');
    this.hudCache.clear();
    this.hideCinematicBar();
    this.updateSlotSummaries();
    this.updateSkinCards();
  }

  showPause(show = true) {
    this.dom.pauseScreen.classList.toggle('is-hidden', !show);
    this.dom.pauseScreen.setAttribute('aria-hidden', show ? 'false' : 'true');
    if (this.dom.hud) this.dom.hud.inert = show;
    if (show) this.dom.pauseScreen.querySelector('button')?.focus();
  }

  showEnd({ title, kicker, sub, score, winnerNumber }) {
    this.dom.startScreen.classList.add('is-hidden');
    this.dom.pauseScreen.classList.add('is-hidden');
    this.dom.pauseScreen.setAttribute('aria-hidden', 'true');
    this.dom.endScreen.classList.remove('is-hidden');
    this.dom.endScreen.setAttribute('aria-hidden', 'false');
    this.dom.hud.inert = true;
    this.dom.endKicker.textContent = kicker ?? '¡FIN DE LA BURRITA!';
    this.dom.endTitle.textContent = title ?? '¡GANÓ JUGADOR 1!';
    this.dom.endSub.textContent = sub ?? '';
    this.dom.endScore.textContent = score ? `${score[0]} — ${score[1]}` : '';
    this.dom.endScore.dataset.winner = winnerNumber ? String(winnerNumber) : '';
    this.dom.endTitle.classList.remove('is-p1', 'is-p2');
    if (winnerNumber) this.dom.endTitle.classList.add(`is-p${winnerNumber}`);
    this.hideCinematicBar();
    window.setTimeout(() => this.dom.btnRematch?.focus(), 60);
  }

  showLoading(show = true) {
    this.dom.loading.classList.toggle('is-gone', !show);
  }

  openHow() {
    this.howOpen = true;
    this.lastFocused = document.activeElement;
    this.dom.startScreen.inert = true;
    this.dom.howModal.classList.remove('is-hidden');
    this.dom.howModal.setAttribute('aria-hidden', 'false');
    window.setTimeout(() => this.dom.btnCloseHow?.focus(), 20);
  }

  closeHow() {
    if (!this.howOpen) return;
    this.howOpen = false;
    this.dom.howModal.classList.add('is-hidden');
    this.dom.howModal.setAttribute('aria-hidden', 'true');
    this.dom.startScreen.inert = false;
    if (this.lastFocused && typeof this.lastFocused.focus === 'function') {
      this.lastFocused.focus();
      this.lastFocused = null;
    }
  }

  setSoundMuted(muted) {
    this.soundMuted = !!muted;
    if (!this.dom.btnSound) return;
    this.dom.btnSound.classList.toggle('is-muted', this.soundMuted);
    this.dom.btnSound.innerHTML = this.soundMuted ? MUTED_ICON : SPEAKER_ICON;
    this.dom.btnSound.setAttribute(
      'aria-label',
      this.soundMuted ? 'Activar sonido' : 'Silenciar sonido',
    );
    this.dom.btnSound.title = this.soundMuted ? 'Activar sonido (M)' : 'Silenciar (M)';
  }

  setCinematicCaption(text, subtext = '', visible = true) {
    const bar = this.dom.cinematicBar;
    if (!bar) return;
    if (!visible || !text) {
      bar.classList.add('is-hidden');
      return;
    }
    if (this.dom.cinematicText) this.dom.cinematicText.textContent = text;
    if (this.dom.cinematicSubtext) {
      this.dom.cinematicSubtext.textContent = subtext || '';
      this.dom.cinematicSubtext.style.display = subtext ? 'block' : 'none';
    }
    bar.classList.remove('is-hidden');
  }

  hideCinematicBar() {
    this.dom.cinematicBar?.classList.add('is-hidden');
  }

  beginFight() {
    this.hideCinematicBar();
  }

  quitToMenu() {
    this.hideCinematicBar();
    this.showMenu();
  }
}
