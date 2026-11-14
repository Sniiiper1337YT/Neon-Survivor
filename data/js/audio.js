// ==========================================
// NEON SURVIVOR - AUDIO SYSTEM (Web Audio API)
// Procedural Synthwave Music & Neon SFX
// ==========================================
'use strict';

class SoundSystem {
  constructor() {
    this.ac = null;
    this.master = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.noiseBuf = null;
    this.lastSfx = {};
    this.musicNext = 0;
    this.musicStep = 0;
    this.musicInterval = null;
    this.theme = 'normal'; // 'normal', 'boss', 'overload', 'victory'
  }

  init() {
    if (this.ac) {
      if (this.ac.state === 'suspended') this.ac.resume();
      return;
    }
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ac = new AudioCtx();
    } catch (e) {
      console.warn('Web Audio not supported');
      return;
    }

    this.master = this.ac.createGain();
    this.sfxGain = this.ac.createGain();
    this.musicGain = this.ac.createGain();

    this.sfxGain.connect(this.master);
    this.musicGain.connect(this.master);
    this.master.connect(this.ac.destination);

    this.applyVolumes();

    // Noise buffer for percussive sounds & explosions
    const len = this.ac.sampleRate * 2;
    this.noiseBuf = this.ac.createBuffer(1, len, this.ac.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    this.musicNext = this.ac.currentTime + 0.1;
    if (!this.musicInterval) {
      this.musicInterval = setInterval(() => this.musicTick(), 25);
    }
  }

  applyVolumes() {
    if (!this.master) return;
    const settings = window.SaveSystem ? window.SaveSystem.getSettings() : { volMaster: 0.8, volMusic: 0.6, volSfx: 0.7 };
    this.master.gain.value = settings.volMaster;
    this.musicGain.gain.value = settings.volMusic * 0.45;
    this.sfxGain.gain.value = settings.volSfx * 0.75;
  }

  note(t, f, dur, type, vol, dest, slide = 1, filt = 0) {
    if (!this.ac) return;
    const o = this.ac.createOscillator();
    const g = this.ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (slide !== 1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f * slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    let n = o;
    if (filt > 0) {
      const bq = this.ac.createBiquadFilter();
      bq.type = 'lowpass';
      bq.frequency.value = filt;
      o.connect(bq);
      n = bq;
    }
    n.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(t + dur + 0.03);
    o.onended = () => {
      try { n.disconnect(); g.disconnect(); } catch (e) {}
    };
  }

  noise(t, dur, vol, freq, type, dest) {
    if (!this.ac || !this.noiseBuf) return;
    const s = this.ac.createBufferSource();
    const f = this.ac.createBiquadFilter();
    const g = this.ac.createGain();
    s.buffer = this.noiseBuf;
    f.type = type || 'lowpass';
    f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    s.connect(f);
    f.connect(g);
    g.connect(dest);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.03);
    s.onended = () => {
      try { s.disconnect(); f.disconnect(); g.disconnect(); } catch (e) {}
    };
  }

  sfx(name) {
    if (!this.ac) return;
    const t = this.ac.currentTime;
    const gap = {
      shoot: 0.05, hit: 0.03, gem: 0.03, kill: 0.04, zap: 0.05,
      boom: 0.06, laser: 0.08, flak: 0.07, saw: 0.07, fire: 0.06
    }[name] || 0;
    if (gap && this.lastSfx[name] && t - this.lastSfx[name] < gap) return;
    this.lastSfx[name] = t;
    const D = this.sfxGain;

    switch (name) {
      case 'shoot':
        this.note(t, 920, 0.06, 'square', 0.04, D, 0.4);
        break;
      case 'hit':
        this.noise(t, 0.04, 0.06, 2800, 'lowpass', D);
        break;
      case 'crit':
        this.note(t, 1400, 0.08, 'sawtooth', 0.12, D, 1.8);
        this.noise(t, 0.06, 0.08, 4500, 'bandpass', D);
        break;
      case 'kill':
        this.note(t, 340, 0.11, 'triangle', 0.12, D, 0.3);
        this.noise(t, 0.08, 0.07, 1400, 'lowpass', D);
        break;
      case 'gem':
        this.note(t, 1100 + Math.random() * 600, 0.06, 'sine', 0.07, D, 1.5);
        break;
      case 'hurt':
        this.note(t, 160, 0.28, 'sawtooth', 0.24, D, 0.35);
        this.noise(t, 0.2, 0.22, 900, 'lowpass', D);
        break;
      case 'dash':
        this.noise(t, 0.2, 0.18, 2600, 'bandpass', D);
        this.note(t, 420, 0.14, 'sine', 0.08, D, 2.5);
        break;
      case 'laser':
        this.note(t, 1800, 0.14, 'sawtooth', 0.06, D, 0.5, 3000);
        break;
      case 'zap':
        this.note(t, 1600, 0.12, 'sawtooth', 0.08, D, 0.3);
        this.noise(t, 0.08, 0.09, 4500, 'highpass', D);
        break;
      case 'boom':
        this.note(t, 120, 0.38, 'sine', 0.32, D, 0.25);
        this.noise(t, 0.32, 0.24, 1100, 'lowpass', D);
        break;
      case 'missile':
        this.note(t, 360, 0.16, 'sawtooth', 0.08, D, 1.8, 1600);
        this.noise(t, 0.14, 0.08, 1400, 'bandpass', D);
        break;
      case 'flak':
        this.noise(t, 0.12, 0.2, 800, 'lowpass', D);
        this.note(t, 220, 0.1, 'square', 0.08, D, 0.4);
        break;
      case 'saw':
        this.note(t, 480, 0.08, 'sawtooth', 0.05, D, 1.2, 2000);
        break;
      case 'fire':
        this.noise(t, 0.09, 0.08, 1200, 'bandpass', D);
        break;
      case 'freeze':
        this.note(t, 1200, 0.35, 'sine', 0.15, D, 0.4);
        this.noise(t, 0.25, 0.1, 5000, 'highpass', D);
        break;
      case 'nuke':
        this.note(t, 90, 1.2, 'sawtooth', 0.4, D, 0.2, 600);
        this.noise(t, 1.0, 0.35, 800, 'lowpass', D);
        break;
      case 'shield':
        this.note(t, 600, 0.2, 'sine', 0.18, D, 1.8);
        this.note(t + 0.08, 900, 0.25, 'sine', 0.15, D, 1.2);
        break;
      case 'shield_break':
        this.note(t, 450, 0.2, 'square', 0.2, D, 0.3);
        this.noise(t, 0.15, 0.25, 3000, 'bandpass', D);
        break;
      case 'overload':
        [220, 440, 880, 1760].forEach((f, i) => this.note(t + i * 0.05, f, 0.4, 'sawtooth', 0.12, D, 1.2));
        this.noise(t, 0.5, 0.25, 3000, 'bandpass', D);
        break;
      case 'level':
        [523, 659, 784, 1047].forEach((f, i) => this.note(t + i * 0.07, f, 0.22, 'square', 0.08, D));
        break;
      case 'evolution':
        [440, 554, 659, 880, 1108].forEach((f, i) => this.note(t + i * 0.09, f, 0.35, 'square', 0.12, D));
        this.noise(t, 0.6, 0.2, 3500, 'bandpass', D);
        break;
      case 'boss':
        this.note(t, 85, 1.5, 'sawtooth', 0.3, D, 0.4, 700);
        this.note(t, 65, 1.5, 'square', 0.2, D, 0.4, 500);
        break;
      case 'victory':
        [523, 659, 784, 1047, 1318].forEach((f, i) => this.note(t + i * 0.1, f, 0.6, 'sine', 0.15, D));
        break;
      case 'over':
        this.note(t, 440, 1.2, 'sawtooth', 0.22, D, 0.2, 1200);
        this.note(t + 0.15, 330, 1.2, 'sawtooth', 0.18, D, 0.2, 900);
        break;
      case 'click':
        this.note(t, 750, 0.05, 'square', 0.06, D, 1.3);
        break;
      case 'pickup':
        this.note(t, 660, 0.12, 'sine', 0.14, D, 1.8);
        this.note(t + 0.07, 990, 0.12, 'sine', 0.12, D, 1.4);
        break;
      case 'achievement':
        [659, 880, 1175, 1318].forEach((f, i) => this.note(t + i * 0.08, f, 0.3, 'sine', 0.1, D));
        break;
    }
  }

  setTheme(theme) {
    this.theme = theme;
  }

  musicTick() {
    if (!this.ac) return;
    const BPM = this.theme === 'boss' ? 140 : this.theme === 'overload' ? 150 : 126;
    const STEP = 60 / BPM / 4;
    while (this.musicNext < this.ac.currentTime + 0.12) {
      this.playStep(this.musicStep, this.musicNext, STEP);
      this.musicNext += STEP;
      this.musicStep++;
    }
  }

  playStep(s, t, STEP) {
    const M = this.musicGain;
    if (!M || M.gain.value <= 0.001) return;

    const normalChords = [[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5]];
    const bossChords = [[0, 3, 6], [-2, 1, 5], [1, 4, 8], [-3, 0, 4]];
    const chords = this.theme === 'boss' ? bossChords : normalChords;

    const bar = Math.floor(s / 16) % 4;
    const st = s % 16;
    const ch = chords[bar];

    const isPlaying = window.GameState && window.GameState.state === 'play';
    const isOverload = window.GameState && window.GameState.isOverload;

    // Kick
    if (st % 4 === 0 && (isPlaying || this.theme === 'boss')) {
      const kickVol = isOverload ? 0.9 : 0.7;
      this.note(t, 160, 0.16, 'sine', kickVol, M, 0.28);
    }

    // Hi-hat
    if (st % 2 === 1) {
      this.noise(t, 0.03, isOverload ? 0.08 : 0.04, 7500, 'highpass', M);
    }

    // Snare / Clap
    if ((st === 4 || st === 12) && isPlaying) {
      this.noise(t, 0.13, isOverload ? 0.22 : 0.16, 2000, 'bandpass', M);
    }

    // Bassline
    if (st % 2 === 0 || st === 7 || st === 15) {
      const root = ch[0] + (st % 8 === 6 ? 12 : 0);
      const f = 55 * Math.pow(2, root / 12);
      this.note(t, f, STEP * 0.95, 'sawtooth', isOverload ? 0.32 : 0.22, M, 1, isOverload ? 800 : 500);
    }

    // Arpeggio melody
    const n = ch[st % 3] + 12 * (1 + (Math.floor(st / 3) % 2));
    const arpVol = isOverload ? 0.06 : 0.03;
    this.note(t, 220 * Math.pow(2, n / 12), STEP * 0.8, 'square', arpVol, M, 1, 2600);
  }
}

window.SoundSystem = new SoundSystem();
