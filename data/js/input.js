// ==========================================
// NEON SURVIVOR - INPUT SYSTEM
// Keyboard, Mouse & Full Gamepad/Controller Support
// ==========================================
'use strict';

class InputSystem {
  constructor() {
    this.K = {};
    this.mouse = { x: 0, y: 0, down: false, rightDown: false, active: false };
    this.dashPressed = false;
    this.secondaryPressed = false;
    this.overloadPressed = false;
    this.pausePressed = false;
    this.gamepadIndex = null;
    this.lastGamepadButtons = {};
    this.initListeners();
  }

  initListeners() {
    window.addEventListener('keydown', e => {
      const c = e.code;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(c)) {
        e.preventDefault();
      }
      this.K[c] = true;

      // Start audio on first user gesture
      if (window.SoundSystem) window.SoundSystem.init();

      if (this.isActionCode(c, 'dash')) this.dashPressed = true;
      if (this.isActionCode(c, 'secondary')) this.secondaryPressed = true;
      if (this.isActionCode(c, 'overload')) this.overloadPressed = true;
      if (this.isActionCode(c, 'pause')) this.pausePressed = true;
    });

    window.addEventListener('keyup', e => {
      this.K[e.code] = false;
    });

    window.addEventListener('mousemove', e => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      this.mouse.active = true;
    });

    window.addEventListener('mousedown', e => {
      if (window.SoundSystem) window.SoundSystem.init();
      if (e.button === 0) {
        this.mouse.down = true;
        this.dashPressed = true;
      } else if (e.button === 2) {
        this.mouse.rightDown = true;
        this.secondaryPressed = true;
      } else if (e.button === 1) {
        this.overloadPressed = true;
      }
    });

    window.addEventListener('mouseup', e => {
      if (e.button === 0) this.mouse.down = false;
      if (e.button === 2) this.mouse.rightDown = false;
    });

    window.addEventListener('contextmenu', e => e.preventDefault());

    window.addEventListener('gamepadconnected', e => {
      console.log('Gamepad connected:', e.gamepad.id);
      this.gamepadIndex = e.gamepad.index;
      if (window.UI) window.UI.showToast('🎮 ' + e.gamepad.id);
    });

    window.addEventListener('gamepaddisconnected', e => {
      console.log('Gamepad disconnected:', e.gamepad.id);
      if (this.gamepadIndex === e.gamepad.index) this.gamepadIndex = null;
    });

    const autoPauseIfPlaying = () => {
      for (const k in this.K) this.K[k] = false;
      this.mouse.down = false;
      this.mouse.rightDown = false;
      this.pausePressed = false;
      if (window.GameState && window.GameState.state === 'play' && typeof window.GameState.pauseGame === 'function') {
        window.GameState.pauseGame();
      }
    };

    window.addEventListener('blur', autoPauseIfPlaying);
    if (typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) autoPauseIfPlaying();
      });
    }
  }

  isActionCode(code, action) {
    const settings = window.SaveSystem ? window.SaveSystem.getSettings() : null;
    const keys = settings && settings.keys ? settings.keys[action] : null;
    if (keys && keys.includes(code)) return true;
    // Defaults fallback
    if (action === 'dash' && (code === 'Space' || code === 'ShiftLeft' || code === 'ShiftRight')) return true;
    if (action === 'secondary' && (code === 'KeyQ' || code === 'KeyF' || code === 'KeyR')) return true;
    if (action === 'overload' && (code === 'KeyE')) return true;
    if (action === 'pause' && (code === 'Escape' || code === 'KeyP')) return true;
    return false;
  }

  isActionActive(action) {
    const settings = window.SaveSystem ? window.SaveSystem.getSettings() : null;
    const keys = settings && settings.keys ? settings.keys[action] : null;
    if (keys) {
      for (const k of keys) {
        if (this.K[k]) return true;
      }
    }
    return false;
  }

  pollGamepad() {
    if (this.gamepadIndex === null && navigator.getGamepads) {
      const gps = navigator.getGamepads();
      for (let i = 0; i < gps.length; i++) {
        if (gps[i]) { this.gamepadIndex = i; break; }
      }
    }
    if (this.gamepadIndex === null) return null;
    const gps = navigator.getGamepads();
    const gp = gps[this.gamepadIndex];
    if (!gp) return null;

    // Deadzones
    const deadzone = 0.22;
    let lx = Math.abs(gp.axes[0]) > deadzone ? gp.axes[0] : 0;
    let ly = Math.abs(gp.axes[1]) > deadzone ? gp.axes[1] : 0;
    let rx = gp.axes.length > 2 && Math.abs(gp.axes[2]) > deadzone ? gp.axes[2] : 0;
    let ry = gp.axes.length > 3 && Math.abs(gp.axes[3]) > deadzone ? gp.axes[3] : 0;

    const b = gp.buttons;
    const isDown = idx => b[idx] && (b[idx].pressed || b[idx].value > 0.5);
    const justPressed = idx => {
      const pressed = isDown(idx);
      const was = !!this.lastGamepadButtons[idx];
      this.lastGamepadButtons[idx] = pressed;
      return pressed && !was;
    };

    // A / Cross or LT (button 6) -> Dash
    if (justPressed(0) || justPressed(6)) this.dashPressed = true;
    // X / Square (button 2) or LB (button 4) -> Secondary
    if (justPressed(2) || justPressed(4)) this.secondaryPressed = true;
    // Y / Triangle (button 3) or RT (button 7) or RB (button 5) -> Overload
    if (justPressed(3) || justPressed(7) || justPressed(5)) this.overloadPressed = true;
    // Start (button 9) -> Pause
    if (justPressed(9)) this.pausePressed = true;

    return {
      lx, ly, rx, ry,
      btnA: justPressed(0),
      btnB: justPressed(1),
      btnX: justPressed(2),
      btnY: justPressed(3),
      dpadUp: justPressed(12),
      dpadDown: justPressed(13),
      dpadLeft: justPressed(14),
      dpadRight: justPressed(15),
      start: justPressed(9),
      lb: justPressed(4),
      rb: justPressed(5)
    };
  }

  vibrate(duration = 150, weak = 0.4, strong = 0.7) {
    if (this.gamepadIndex === null) return;
    const gps = navigator.getGamepads();
    const gp = gps[this.gamepadIndex];
    if (gp && gp.vibrationActuator && gp.vibrationActuator.playEffect) {
      try {
        gp.vibrationActuator.playEffect('dual-rumble', {
          startDelay: 0,
          duration: duration,
          weakMagnitude: weak,
          strongMagnitude: strong
        });
      } catch (e) { }
    }
  }

  getMovementVector(playerX, playerY, camX, camY, screenW, screenH) {
    let ix = 0, iy = 0;

    // Check keyboard actions
    if (this.isActionActive('left') || this.K.KeyA || this.K.ArrowLeft) ix--;
    if (this.isActionActive('right') || this.K.KeyD || this.K.ArrowRight) ix++;
    if (this.isActionActive('up') || this.K.KeyW || this.K.ArrowUp) iy--;
    if (this.isActionActive('down') || this.K.KeyS || this.K.ArrowDown) iy++;

    // Poll Gamepad
    const gp = this.pollGamepad();
    if (gp && (Math.abs(gp.lx) > 0 || Math.abs(gp.ly) > 0)) {
      ix = gp.lx;
      iy = gp.ly;
      const len = Math.hypot(ix, iy);
      if (len > 1) { ix /= len; iy /= len; }
      return { x: ix, y: iy, moving: true, aimX: gp.rx, aimY: gp.ry };
    }

    const keyLen = Math.hypot(ix, iy);
    if (keyLen > 0) {
      return { x: ix / keyLen, y: iy / keyLen, moving: true, aimX: 0, aimY: 0 };
    }

    // Mouse movement
    if (this.mouse.active) {
      const mWorldX = this.mouse.x - screenW / 2 + camX;
      const mWorldY = this.mouse.y - screenH / 2 + camY;
      const mdx = mWorldX - playerX;
      const mdy = mWorldY - playerY;
      const mdist = Math.hypot(mdx, mdy);
      const deadzone = 24;
      if (mdist > deadzone) {
        const factor = Math.min(1, (mdist - deadzone) / 100);
        return { x: (mdx / mdist) * factor, y: (mdy / mdist) * factor, moving: true, aimX: mdx / mdist, aimY: mdy / mdist };
      }
    }

    return { x: 0, y: 0, moving: false, aimX: 0, aimY: 0 };
  }
}

window.Input = new InputSystem();
