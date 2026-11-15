// ==========================================
// NEON SURVIVOR - AUDIO SYSTEM (Web Audio API)
// Procedural Synthwave Music & Neon SFX
// Master Limiter, Polyphony Management & Ear-Friendly Acoustics
// ==========================================
'use strict';

class SoundSystem {
  constructor() {
    this.ac = null;
    this.master = null;
    this.limiter = null;
    this.sfxFilter = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.noiseBuf = null;
    this.lastSfx = {};
    this.recentSfx = [];
    this.gemStep = 0;
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

    // 1. Audio Nodes
    this.master = this.ac.createGain();
    this.sfxGain = this.ac.createGain();
    this.musicGain = this.ac.createGain();

    // 2. SFX Bus Low-Pass Filter: entfernt schneidende, schmerzhafte Frequenzen über 4500 Hz
    this.sfxFilter = this.ac.createBiquadFilter();
    this.sfxFilter.type = 'lowpass';
    this.sfxFilter.frequency.value = 4500;
    this.sfxFilter.Q.value = 0.7;

    // 3. Master Dynamics Compressor / Brickwall Limiter
    // Verhindert digitales Clipping, Übersteuerung und laute Lautstärke-Spitzen bei Massenangriffen!
    this.limiter = this.ac.createDynamicsCompressor();
    this.limiter.threshold.value = -12; // Greift frühzeitig sanft ein
    this.limiter.knee.value = 10;        // Weicher Übergang
    this.limiter.ratio.value = 16;       // Starker Schutz gegen Übersteuerung
    this.limiter.attack.value = 0.002;   // Blitzschnelle 2ms Reaktionszeit
    this.limiter.release.value = 0.12;   // Schnelles, natürliches Abklingen

    // Signalfluss:
    // [SFX] -> sfxGain -> sfxFilter -> master ↘
    // [Musik] ----------> musicGain -> master -> limiter -> Lautsprecher / Kopfhörer
    this.sfxGain.connect(this.sfxFilter);
    this.sfxFilter.connect(this.master);
    this.musicGain.connect(this.master);
    this.master.connect(this.limiter);
    this.limiter.connect(this.ac.destination);

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
    this.musicGain.gain.value = settings.volMusic * 0.40;
    this.sfxGain.gain.value = settings.volSfx * 0.55;
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

    // 1. Voice-Throttling Gaps (verhindert das Überlagern von Dutzenden identischen Sounds im selben Frame)
    const gap = {
      shoot: 0.065,
      hit: 0.050,
      crit: 0.065,
      kill: 0.048,
      gem: 0.040,
      zap: 0.070,
      boom: 0.080,
      laser: 0.080,
      flak: 0.075,
      saw: 0.075,
      fire: 0.065,
      dash: 0.120,
      hurt: 0.150,
      freeze: 0.090,
      pickup: 0.080,
      nova: 0.090,
      magnet: 0.100,
      heal: 0.100,
      shield: 0.120,
      shield_break: 0.150,
      click: 0.035
    }[name] || 0.045;

    if (this.lastSfx[name] && t - this.lastSfx[name] < gap) return;
    this.lastSfx[name] = t;

    // 2. Dynamisches Dichtigkeit-Ducking (Combat Burst Scaling):
    // Misst die Anzahl der SFX-Aufrufe in einem rollenden 140ms-Fenster.
    // Wenn in einer Sekunde viele Gegner getroffen werden, skaliert die Einzellautstärke automatisch sanft ab,
    // sodass der Soundmix sauber, differenziert und angenehm für die Ohren bleibt.
    if (!this.recentSfx) this.recentSfx = [];
    this.recentSfx = this.recentSfx.filter(stamp => t - stamp < 0.14);
    this.recentSfx.push(t);
    const density = this.recentSfx.length;
    const scale = density > 2 ? Math.max(0.40, 1 / (1 + (density - 2) * 0.16)) : 1.0;

    const D = this.sfxGain;

    switch (name) {
      case 'shoot':
        this.note(t, 760, 0.05, 'triangle', 0.038 * scale, D, 0.35, 1900);
        break;

      case 'hit':
        // Weicher, dumpfer Treffertick statt kratzigem Rauschen
        this.noise(t, 0.025, 0.030 * scale, 1200, 'lowpass', D);
        this.note(t, 150, 0.025, 'triangle', 0.025 * scale, D, 0.45);
        break;

      case 'crit':
        // Harmonischer, belohnender Doppelton (880 Hz / 1320 Hz) statt stechendem 2500Hz-Sägezahn
        this.note(t, 880, 0.065, 'sine', 0.060 * scale, D, 0.85);
        this.note(t + 0.01, 1320, 0.055, 'triangle', 0.040 * scale, D, 0.90);
        this.noise(t, 0.025, 0.025 * scale, 1800, 'bandpass', D);
        break;

      case 'kill':
        // Satte, trockene Pop-Explosion
        this.note(t, 220, 0.075, 'triangle', 0.075 * scale, D, 0.32);
        this.noise(t, 0.045, 0.035 * scale, 900, 'lowpass', D);
        break;

      case 'gem': {
        // Pentatonische Tonleiter (C - E - G - C - E) für funkelnden, melodischen Klang
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
        this.gemStep = ((this.gemStep || 0) + 1) % notes.length;
        const f = notes[this.gemStep];
        this.note(t, f, 0.045, 'sine', 0.035 * scale, D, 1.05);
        break;
      }

      case 'hurt':
        this.note(t, 140, 0.22, 'sawtooth', 0.16 * scale, D, 0.35, 900);
        this.noise(t, 0.16, 0.13 * scale, 750, 'lowpass', D);
        break;

      case 'dash':
        this.noise(t, 0.15, 0.11 * scale, 2100, 'bandpass', D);
        this.note(t, 360, 0.11, 'sine', 0.055 * scale, D, 2.0);
        break;

      case 'laser':
        this.note(t, 1100, 0.09, 'sawtooth', 0.045 * scale, D, 0.45, 2300);
        break;

      case 'zap':
        this.note(t, 920, 0.07, 'triangle', 0.050 * scale, D, 0.35, 2200);
        this.noise(t, 0.04, 0.030 * scale, 2200, 'bandpass', D);
        break;

      case 'boom':
        this.note(t, 105, 0.26, 'sine', 0.19 * scale, D, 0.25);
        this.noise(t, 0.22, 0.13 * scale, 850, 'lowpass', D);
        break;

      case 'missile':
        this.note(t, 320, 0.14, 'sawtooth', 0.055 * scale, D, 1.6, 1500);
        this.noise(t, 0.12, 0.055 * scale, 1200, 'bandpass', D);
        break;

      case 'flak':
        this.noise(t, 0.08, 0.11 * scale, 650, 'lowpass', D);
        this.note(t, 180, 0.07, 'triangle', 0.055 * scale, D, 0.4);
        break;

      case 'saw':
        this.note(t, 400, 0.07, 'sawtooth', 0.032 * scale, D, 1.1, 1500);
        break;

      case 'fire':
        this.noise(t, 0.07, 0.055 * scale, 950, 'bandpass', D);
        break;

      case 'freeze':
        this.note(t, 850, 0.22, 'sine', 0.09 * scale, D, 0.4);
        this.noise(t, 0.16, 0.055 * scale, 3000, 'bandpass', D);
        break;

      case 'nova':
        this.note(t, 240, 0.22, 'sine', 0.12 * scale, D, 2.5);
        this.noise(t, 0.18, 0.08 * scale, 1700, 'bandpass', D);
        break;

      case 'magnet':
        this.note(t, 520, 0.12, 'sine', 0.07 * scale, D, 2.0);
        break;

      case 'heal':
        this.note(t, 440, 0.15, 'sine', 0.08 * scale, D, 1.5);
        this.note(t + 0.05, 660, 0.18, 'sine', 0.08 * scale, D, 1.2);
        break;

      case 'nuke':
        this.note(t, 85, 1.0, 'sawtooth', 0.28, D, 0.2, 550);
        this.noise(t, 0.8, 0.24, 750, 'lowpass', D);
        break;

      case 'shield':
        this.note(t, 550, 0.18, 'sine', 0.14, D, 1.6);
        this.note(t + 0.07, 820, 0.22, 'sine', 0.12, D, 1.2);
        break;

      case 'shield_break':
        this.note(t, 380, 0.18, 'square', 0.14, D, 0.3, 1400);
        this.noise(t, 0.13, 0.16, 2400, 'bandpass', D);
        break;

      case 'overload':
        [220, 440, 880, 1320].forEach((f, i) => this.note(t + i * 0.05, f, 0.35, 'triangle', 0.09, D, 1.1));
        this.noise(t, 0.4, 0.18, 2500, 'bandpass', D);
        break;

      case 'level':
      case 'levelup':
        [523, 659, 784, 1047].forEach((f, i) => this.note(t + i * 0.07, f, 0.18, 'triangle', 0.065, D));
        break;

      case 'evolution':
        [440, 554, 659, 880, 1108].forEach((f, i) => this.note(t + i * 0.08, f, 0.28, 'triangle', 0.09, D));
        this.noise(t, 0.5, 0.14, 2800, 'bandpass', D);
        break;

      case 'boss':
        this.note(t, 80, 1.4, 'sawtooth', 0.24, D, 0.4, 600);
        this.note(t, 60, 1.4, 'square', 0.16, D, 0.4, 450);
        break;

      case 'victory':
        [523, 659, 784, 1047, 1318].forEach((f, i) => this.note(t + i * 0.1, f, 0.5, 'sine', 0.12, D));
        break;

      case 'over':
        this.note(t, 380, 1.0, 'sawtooth', 0.17, D, 0.2, 1000);
        this.note(t + 0.14, 280, 1.0, 'sawtooth', 0.14, D, 0.2, 800);
        break;

      case 'click':
        this.note(t, 680, 0.04, 'sine', 0.05, D, 1.2);
        break;

      case 'pickup':
        this.note(t, 620, 0.10, 'sine', 0.11, D, 1.6);
        this.note(t + 0.06, 930, 0.10, 'sine', 0.09, D, 1.3);
        break;

      case 'achievement':
        [659, 880, 1175, 1318].forEach((f, i) => this.note(t + i * 0.08, f, 0.25, 'sine', 0.08, D));
        break;

      // ==========================================
      // NEUE SOUNDS: SEKUNDÄRFÄHIGKEITEN & MINIGAMES
      // ==========================================
      case 'secondary_apex':
        [520, 780, 1040].forEach((f, i) => this.note(t + i * 0.04, f, 0.18, 'sine', 0.12, D, 1.3));
        break;

      case 'secondary_valkyrie':
        this.note(t, 220, 0.25, 'sawtooth', 0.16, D, 3.5, 2000);
        this.noise(t, 0.18, 0.15, 2800, 'bandpass', D);
        break;

      case 'secondary_colossus':
        this.note(t, 90, 0.5, 'square', 0.20, D, 0.8, 600);
        this.note(t, 180, 0.4, 'triangle', 0.15, D, 1.0);
        break;

      case 'secondary_tesla':
        [150, 420, 840, 1260].forEach((f, i) => this.note(t + i * 0.03, f, 0.22, 'sawtooth', 0.14, D, 0.4, 2500));
        this.noise(t, 0.25, 0.20, 3200, 'highpass', D);
        break;

      case 'secondary_specter':
        this.note(t, 680, 0.4, 'sine', 0.13, D, 0.35);
        this.note(t + 0.1, 440, 0.45, 'triangle', 0.11, D, 0.5);
        break;

      case 'secondary_havoc':
        [180, 240, 320, 420, 560].forEach((f, i) => this.note(t + i * 0.05, f, 0.16, 'sawtooth', 0.13, D, 0.3, 1500));
        this.noise(t + 0.1, 0.35, 0.22, 1200, 'lowpass', D);
        break;

      case 'secondary_nova':
        this.note(t, 320, 0.6, 'sine', 0.20, D, 0.25);
        this.noise(t, 0.45, 0.25, 1800, 'bandpass', D);
        break;

      case 'secondary_chronos':
        [1046, 880, 659, 523].forEach((f, i) => this.note(t + i * 0.07, f, 0.35, 'triangle', 0.12, D, 0.7));
        break;

      case 'portal_enter':
      case 'portal_open':
        [330, 440, 660, 880, 1320].forEach((f, i) => this.note(t + i * 0.06, f, 0.28, 'sine', 0.11, D, 1.2));
        break;

      case 'portal_win':
        [440, 554, 659, 880, 1108, 1320].forEach((f, i) => this.note(t + i * 0.08, f, 0.35, 'triangle', 0.12, D));
        this.noise(t + 0.2, 0.35, 0.14, 2500, 'bandpass', D);
        break;

      case 'minigame_hit':
        this.note(t, 880, 0.08, 'sine', 0.12, D, 1.4);
        break;

      case 'minigame_combo':
        this.note(t, 1175, 0.12, 'triangle', 0.14, D, 1.2);
        this.note(t + 0.04, 1568, 0.14, 'sine', 0.12, D, 1.1);
        break;
    }
  }

  setTheme(theme) {
    this.theme = theme;
  }

  setMap(map) {
    this.currentMap = map || 'void';
  }

  getMapMusicProfile() {
    const map = this.currentMap || (window.GameState && window.GameState.selectedMap) || 'void';
    switch (map) {
      case 'matrix':
        return {
          bpm: 132,
          chords: [[0, 3, 7], [5, 8, 12], [-2, 2, 5], [3, 7, 10]],
          bassType: 'square',
          leadType: 'sawtooth',
          bassCutoff: 650,
          leadCutoff: 2800,
          leadBase: 261.63
        };
      case 'abyss':
        return {
          bpm: 118,
          chords: [[0, 3, 6], [-4, -1, 3], [-2, 1, 5], [-5, -2, 2]],
          bassType: 'sawtooth',
          leadType: 'sine',
          bassCutoff: 400,
          leadCutoff: 1800,
          leadBase: 196.00
        };
      case 'reactor':
        return {
          bpm: 136,
          chords: [[0, 3, 7], [-1, 2, 6], [3, 7, 10], [5, 8, 12]],
          bassType: 'sawtooth',
          leadType: 'sawtooth',
          bassCutoff: 850,
          leadCutoff: 3200,
          leadBase: 220.00
        };
      case 'asteroids':
        return {
          bpm: 128,
          chords: [[0, 4, 7], [-3, 0, 4], [2, 5, 9], [-5, -1, 2]],
          bassType: 'triangle',
          leadType: 'square',
          bassCutoff: 550,
          leadCutoff: 2600,
          leadBase: 293.66
        };
      case 'glitch':
        return {
          bpm: 138,
          chords: [[0, 3, 7], [1, 4, 8], [-2, 1, 5], [6, 9, 13]],
          bassType: 'square',
          leadType: 'square',
          bassCutoff: 750,
          leadCutoff: 3600,
          leadBase: 246.94
        };
      case 'void':
      default:
        return {
          bpm: 124,
          chords: [[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5]],
          bassType: 'sawtooth',
          leadType: 'square',
          bassCutoff: 500,
          leadCutoff: 2400,
          leadBase: 220.00
        };
    }
  }

  musicTick() {
    if (!this.ac) return;
    const prof = this.getMapMusicProfile();
    let BPM = prof.bpm;
    if (this.theme === 'boss') BPM = 144;
    else if (this.theme === 'overload') BPM = 152;
    const STEP = 60 / BPM / 4;
    while (this.musicNext < this.ac.currentTime + 0.12) {
      this.playStep(this.musicStep, this.musicNext, STEP, prof);
      this.musicNext += STEP;
      this.musicStep++;
    }
  }

  playStep(s, t, STEP, prof) {
    const M = this.musicGain;
    if (!M || M.gain.value <= 0.001) return;

    if (!prof) prof = this.getMapMusicProfile();
    const bossChords = [[0, 3, 6], [-2, 1, 5], [1, 4, 8], [-3, 0, 4]];
    const chords = this.theme === 'boss' ? bossChords : prof.chords;

    const bar = Math.floor(s / 16) % 4;
    const st = s % 16;
    const ch = chords[bar];

    const isPlaying = window.GameState && window.GameState.state === 'play';
    const isOverload = window.GameState && window.GameState.isOverload;

    // Kick
    if (st % 4 === 0 && (isPlaying || this.theme === 'boss')) {
      const kickVol = isOverload ? 0.65 : 0.50;
      this.note(t, 160, 0.16, 'sine', kickVol, M, 0.28);
    }

    // Hi-hat
    if (st % 2 === 1) {
      this.noise(t, 0.03, isOverload ? 0.06 : 0.035, 6000, 'highpass', M);
    }

    // Snare / Clap
    if ((st === 4 || st === 12) && isPlaying) {
      this.noise(t, 0.12, isOverload ? 0.18 : 0.13, 1900, 'bandpass', M);
    }

    // Bassline (Map-spezifischer Bass-Sound)
    if (st % 2 === 0 || st === 7 || st === 15) {
      const root = ch[0] + (st % 8 === 6 ? 12 : 0);
      const f = 55 * Math.pow(2, root / 12);
      const bType = this.theme === 'boss' ? 'sawtooth' : prof.bassType;
      const bCut = isOverload ? 800 : prof.bassCutoff;
      this.note(t, f, STEP * 0.95, bType, isOverload ? 0.26 : 0.18, M, 1, bCut);
    }

    // Arpeggio melody (Map-spezifischer Lead-Sound)
    const n = ch[st % 3] + 12 * (1 + (Math.floor(st / 3) % 2));
    const arpVol = isOverload ? 0.05 : 0.028;
    const lType = this.theme === 'boss' ? 'sawtooth' : prof.leadType;
    const lBase = this.theme === 'boss' ? 220 : prof.leadBase;
    this.note(t, lBase * Math.pow(2, n / 12), STEP * 0.8, lType, arpVol, M, 1, prof.leadCutoff);
  }
}

window.SoundSystem = new SoundSystem();
