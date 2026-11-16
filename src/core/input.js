const GAME_KEYS = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'Space',
  'KeyJ',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ShiftLeft',
  'ShiftRight',
  'Enter',
]);

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.pressed = new Set();
    this.enabled = false;
    this.pointerPunch = false;
    this.pausePressed = false;
    this.skipPressed = false;
    this.onAnyGesture = null;

    window.addEventListener('keydown', this.handleKeyDown, { passive: false });
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    canvas?.addEventListener('pointerdown', this.handlePointerDown);
    const triggerGesture = () => this.onAnyGesture?.();
    window.addEventListener('pointerdown', triggerGesture, { passive: true });
    window.addEventListener('touchstart', triggerGesture, { passive: true });
    window.addEventListener('click', triggerGesture, { passive: true });
  }

  get skipIntroPressed() {
    return this.skipPressed;
  }

  set skipIntroPressed(val) {
    this.skipPressed = Boolean(val);
  }

  handleKeyDown = (event) => {
    this.onAnyGesture?.();
    const target = event.target;
    const isTyping =
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable);

    if (isTyping) return;

    if (!event.repeat && (event.code === 'Space' || event.code === 'Enter')) {
      this.skipPressed = true;
    }

    if (event.code === 'Escape' || event.code === 'KeyP') {
      if (this.enabled && !event.repeat) {
        this.pausePressed = true;
        event.preventDefault();
      }
      return;
    }

    if (!this.enabled) return;
    if (GAME_KEYS.has(event.code)) {
      event.preventDefault();
      if (!event.repeat) this.pressed.add(event.code);
    }
    if (event.code === 'KeyM' && !event.repeat) {
      this.pressed.add(event.code);
    }
    this.keys.add(event.code);
  };

  handleKeyUp = (event) => {
    this.keys.delete(event.code);
  };

  handleBlur = () => {
    this.keys.clear();
  };

  handlePointerDown = (event) => {
    if (!this.enabled) return;
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    this.pointerPunch = true;
  };

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.keys.clear();
      this.pressed.clear();
      this.pausePressed = false;
      this.pointerPunch = false;
    }
  }

  isDown(code) {
    return this.keys.has(code);
  }

  consume(code) {
    if (this.pressed.has(code)) {
      this.pressed.delete(code);
      return true;
    }
    return false;
  }

  getMove(player) {
    if (!this.enabled) return { x: 0, z: 0 };
    if (player === 2) {
      return {
        x: (this.isDown('ArrowRight') ? 1 : 0) - (this.isDown('ArrowLeft') ? 1 : 0),
        z: (this.isDown('ArrowDown') ? 1 : 0) - (this.isDown('ArrowUp') ? 1 : 0),
      };
    }
    return {
      x: (this.isDown('KeyD') ? 1 : 0) - (this.isDown('KeyA') ? 1 : 0),
      z: (this.isDown('KeyS') ? 1 : 0) - (this.isDown('KeyW') ? 1 : 0),
    };
  }

  consumeHop(player) {
    if (player === 2) {
      return this.consume('ShiftLeft') || this.consume('ShiftRight');
    }
    return this.consume('Space');
  }

  isHopHeld(player) {
    if (!this.enabled) return false;
    if (player === 2) {
      return this.isDown('ShiftLeft') || this.isDown('ShiftRight');
    }
    return this.isDown('Space');
  }

  consumePunch(player) {
    if (player === 2) {
      return this.consume('Enter');
    }
    const pressed = this.consume('KeyJ');
    if (this.pointerPunch) {
      this.pointerPunch = false;
      return true;
    }
    return pressed;
  }

  consumePause() {
    if (this.pausePressed) {
      this.pausePressed = false;
      return true;
    }
    return false;
  }

  consumeSkip() {
    if (this.skipPressed) {
      this.skipPressed = false;
      return true;
    }
    return false;
  }

  consumeSkipIntro() {
    return this.consumeSkip();
  }

  endFrame() {
    this.pressed.clear();
    this.pointerPunch = false;
  }
}
