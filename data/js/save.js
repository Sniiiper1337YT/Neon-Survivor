// ==========================================
// NEON SURVIVOR - SAVE & PROGRESSION SYSTEM
// Skilltree, Credits, 50 Achievements, Settings
// ==========================================
'use strict';

class SaveSystem {
  constructor() {
    this.STORAGE_KEY = 'neon_survivor_save_v2';
    this.data = this.getDefaultSave();
    this.load();
  }

  getDefaultSave() {
    return {
      version: 2,
      credits: 0,
      lifetimeCredits: 0,
      skilltree: {
        maxHp: 0,        // +10 HP per rank (max 10)
        regen: 0,        // +0.3 HP/s per rank (max 5)
        damage: 0,       // +5% dmg per rank (max 10)
        armor: 0,        // +1 armor per rank (max 5)
        speed: 0,        // +4% speed per rank (max 5)
        attackSpeed: 0,  // +4% rate per rank (max 5)
        crit: 0,         // +2% crit per rank (max 5)
        magnet: 0,       // +15% magnet per rank (max 5)
        xpBoost: 0,      // +6% XP per rank (max 5)
        rerolls: 0,      // +1 reroll per rank (max 5)
        overloadRate: 0, // +10% rate per rank (max 5)
        creditBoost: 0   // +10% credits per rank (max 5)
      },
      unlockedCharacters: ['apex'], // 'apex', 'valkyrie', 'colossus', 'tesla', 'specter', 'havoc', 'nova', 'chronos'
      unlockedMaps: ['void'],       // 'void', 'matrix', 'abyss', 'reactor', 'asteroids', 'glitch'
      unlockedModes: ['classic', 'sandbox'],   // 'classic', 'endless', 'bossrush', 'hardcore', 'chaos', 'sandbox'
      selectedCharacter: 'apex',
      selectedMap: 'void',
      selectedMode: 'classic',
      achievements: {},             // id: timestamp
      stats: {
        runsStarted: 0,
        runsWon: 0,
        totalTime: 0,
        totalKills: 0,
        totalBossKills: 0,
        totalDamage: 0,
        totalGemsCollected: 0,
        highestLevel: 1,
        highestScore: 0,
        bestSurvivalTime: 0,
        powerupsCollected: 0,
        distanceTraveled: 0,
        evolutionsMade: 0,
        overloadsUsed: 0
      },
      settings: {
        volMaster: 0.8,
        volMusic: 0.6,
        volSfx: 0.7,
        quality: 'high',   // 'high', 'med', 'low'
        fpsLimit: 60,      // 30, 60, 120, 0 (uncapped)
        screenShake: true,
        damageNumbers: true,
        lang: 'de',
        discordClientId: '1570824779005689919',
        keys: {
          up: ['KeyW', 'ArrowUp'],
          down: ['KeyS', 'ArrowDown'],
          left: ['KeyA', 'ArrowLeft'],
          right: ['KeyD', 'ArrowRight'],
          dash: ['Space', 'ShiftLeft'],
          overload: ['KeyE', 'KeyQ'],
          pause: ['Escape', 'KeyP']
        }
      }
    };
  }

  // ----------------------------------------------------
  // TAMPER-PROOF ENCRYPTION & CHECKSUM VERIFICATION
  // ----------------------------------------------------
  toB64(str) {
    if (typeof btoa === 'function') {
      try { return btoa(unescape(encodeURIComponent(str))); } catch (e) {}
    }
    return typeof Buffer !== 'undefined' ? Buffer.from(str, 'utf8').toString('base64') : str;
  }

  fromB64(b64) {
    if (typeof atob === 'function') {
      try { return decodeURIComponent(escape(atob(b64))); } catch (e) {}
    }
    return typeof Buffer !== 'undefined' ? Buffer.from(b64, 'base64').toString('utf8') : b64;
  }

  computeChecksum(str) {
    const salt = 'NEON_SURVIVOR_ANTI_TAMPER_SALT_9f82d41a7b';
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    const full = str + salt;
    for (let i = 0; i < full.length; i++) {
      const ch = full.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = ((h1 ^ (h1 >>> 16)) >>> 0);
    h2 = ((h2 ^ (h2 >>> 13)) >>> 0);
    return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
  }

  encryptPayload(str) {
    const key = 'NS_SECURE_PAYLOAD_CIPHER_2026';
    let out = '';
    for (let i = 0; i < str.length; i++) {
      out += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return this.toB64(out);
  }

  decryptPayload(b64) {
    const decoded = this.fromB64(b64);
    const key = 'NS_SECURE_PAYLOAD_CIPHER_2026';
    let out = '';
    for (let i = 0; i < decoded.length; i++) {
      out += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return out;
  }

  load() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY) || localStorage.getItem('neon_survivor_save_v1');
      if (raw) {
        let jsonStr = null;
        let isEnvelope = false;

        // Check if saved as encrypted tamper-proof envelope
        try {
          const envelope = JSON.parse(raw);
          if (envelope && envelope.v === 2 && envelope.c && envelope.p) {
            isEnvelope = true;
            const decrypted = this.decryptPayload(envelope.p);
            const expectedChecksum = this.computeChecksum(decrypted);
            if (expectedChecksum === envelope.c) {
              jsonStr = decrypted;
            } else {
              console.warn('⚠️ Manipulierter Spielstand erkannt (Prüfsummen-Fehler)! Sicherer Spielstand wiederhergestellt.');
              if (window.UI && window.UI.showToast) window.UI.showToast('⚠️ Manipulierter Spielstand abgewiesen!');
            }
          }
        } catch (e) { }

        // Fallback / Migration: If raw is legacy plain JSON string
        if (!jsonStr && !isEnvelope) {
          try {
            const legacyParsed = JSON.parse(raw);
            if (legacyParsed && legacyParsed.version) {
              jsonStr = raw;
            }
          } catch (e) { }
        }

        if (jsonStr) {
          const parsed = JSON.parse(jsonStr);
          this.data = this.mergeDeep(this.getDefaultSave(), parsed);
          if (!this.data.settings.discordClientId || this.data.settings.discordClientId === '1306300000000000000') {
            this.data.settings.discordClientId = '1570824779005689919';
          }
          if (!this.data.unlockedModes.includes('sandbox')) {
            this.data.unlockedModes.push('sandbox');
          }
          // Immediately save with encrypted envelope
          this.save();
        } else {
          this.data = this.getDefaultSave();
        }
      }
    } catch (e) {
      console.error('Failed to load savegame, using defaults:', e);
      this.data = this.getDefaultSave();
    }
  }

  save() {
    try {
      const json = JSON.stringify(this.data);
      const envelope = {
        v: 2,
        c: this.computeChecksum(json),
        p: this.encryptPayload(json)
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(envelope));
    } catch (e) {
      console.error('Failed to savegame:', e);
    }
  }

  mergeDeep(target, source) {
    for (const key of Object.keys(source)) {
      if (source[key] instanceof Object && !Array.isArray(source[key]) && key in target) {
        Object.assign(source[key], this.mergeDeep(target[key], source[key]));
      }
    }
    Object.assign(target || {}, source);
    return target;
  }

  getCredits() {
    return this.data.credits;
  }

  addCredits(amount) {
    if (amount <= 0) return;
    const bonus = 1 + (this.data.skilltree.creditBoost * 0.1);
    const finalAmount = Math.round(amount * bonus);
    this.data.credits += finalAmount;
    this.data.lifetimeCredits += finalAmount;
    this.save();
    return finalAmount;
  }

  getSkillCosts(skillId) {
    const baseCosts = {
      maxHp: 100, regen: 150, damage: 120, armor: 150, speed: 100,
      attackSpeed: 120, crit: 140, magnet: 80, xpBoost: 110,
      rerolls: 200, overloadRate: 160, creditBoost: 150
    };
    const maxRanks = {
      maxHp: 10, regen: 5, damage: 10, armor: 5, speed: 5,
      attackSpeed: 5, crit: 5, magnet: 5, xpBoost: 5,
      rerolls: 5, overloadRate: 5, creditBoost: 5
    };
    const currentRank = this.data.skilltree[skillId] || 0;
    const maxRank = maxRanks[skillId] || 5;
    if (currentRank >= maxRank) return null; // Maxed out
    const cost = Math.round(baseCosts[skillId] * Math.pow(1.5, currentRank));
    return { currentRank, maxRank, cost };
  }

  upgradeSkill(skillId) {
    const info = this.getSkillCosts(skillId);
    if (!info) return false;
    if (this.data.credits < info.cost) return false;
    this.data.credits -= info.cost;
    this.data.skilltree[skillId]++;
    this.save();
    this.checkAchievements();
    return true;
  }

  refundSkilltree() {
    let refundAmount = 0;
    const baseCosts = {
      maxHp: 100, regen: 150, damage: 120, armor: 150, speed: 100,
      attackSpeed: 120, crit: 140, magnet: 80, xpBoost: 110,
      rerolls: 200, overloadRate: 160, creditBoost: 150
    };
    for (const skillId in this.data.skilltree) {
      const rank = this.data.skilltree[skillId];
      for (let r = 0; r < rank; r++) {
        refundAmount += Math.round(baseCosts[skillId] * Math.pow(1.5, r));
      }
      this.data.skilltree[skillId] = 0;
    }
    this.data.credits += refundAmount;
    this.save();
    return refundAmount;
  }

  getSkillModifiers() {
    const st = this.data.skilltree;
    return {
      hp: st.maxHp * 10,
      regen: st.regen * 0.3,
      dmg: 1 + st.damage * 0.05,
      armor: st.armor * 1.0,
      speed: 1 + st.speed * 0.04,
      rate: 1 + st.attackSpeed * 0.04,
      crit: st.crit * 0.02,
      magnet: 1 + st.magnet * 0.15,
      xp: 1 + st.xpBoost * 0.06,
      rerolls: st.rerolls,
      overloadRate: 1 + st.overloadRate * 0.10,
      creditBoost: 1 + st.creditBoost * 0.10
    };
  }

  unlockCharacter(charId) {
    if (!this.data.unlockedCharacters.includes(charId)) {
      this.data.unlockedCharacters.push(charId);
      this.save();
      return true;
    }
    return false;
  }

  unlockMap(mapId) {
    if (!this.data.unlockedMaps.includes(mapId)) {
      this.data.unlockedMaps.push(mapId);
      this.save();
      return true;
    }
    return false;
  }

  unlockMode(modeId) {
    if (!this.data.unlockedModes.includes(modeId)) {
      this.data.unlockedModes.push(modeId);
      this.save();
      return true;
    }
    return false;
  }

  getSettings() {
    return this.data.settings;
  }

  saveSettings(newSettings) {
    Object.assign(this.data.settings, newSettings);
    this.save();
    if (window.SoundSystem) window.SoundSystem.applyVolumes();
  }

  unlockAchievement(id) {
    if (window.GameState && window.GameState.selectedMode === 'sandbox') return false;
    if (this.data.achievements[id]) return false;
    this.data.achievements[id] = Date.now();
    this.save();

    // Reward player with 150 Neon Credits per Achievement
    this.addCredits(150);

    // Audio cue & banner
    if (window.SoundSystem) window.SoundSystem.sfx('achievement');
    if (window.UI) window.UI.showAchievementPopup(id);

    // Trigger unlock rewards
    this.checkUnlockRewards();
    return true;
  }

  checkAchievements() {
    if (window.GameState && window.GameState.selectedMode === 'sandbox') return;
    const s = this.data.stats;
    const a = this.data.achievements;
    const u = (id, cond) => { if (!a[id] && cond) this.unlockAchievement(id); };

    // Kill achievements
    u('kills_10', s.totalKills >= 10);
    u('kills_100', s.totalKills >= 100);
    u('kills_500', s.totalKills >= 500);
    u('kills_1000', s.totalKills >= 1000);
    u('kills_2500', s.totalKills >= 2500);
    u('kills_5000', s.totalKills >= 5000);
    u('kills_10000', s.totalKills >= 10000);

    // Boss achievements
    u('boss_1', s.totalBossKills >= 1);
    u('boss_5', s.totalBossKills >= 5);
    u('boss_10', s.totalBossKills >= 10);
    u('boss_25', s.totalBossKills >= 25);
    u('boss_final', s.runsWon >= 1);

    // Run achievements
    u('runs_1', s.runsStarted >= 1);
    u('runs_5', s.runsStarted >= 5);
    u('runs_10', s.runsStarted >= 10);
    u('runs_25', s.runsStarted >= 25);

    // Level achievements
    u('level_10', s.highestLevel >= 10);
    u('level_20', s.highestLevel >= 20);
    u('level_30', s.highestLevel >= 30);
    u('level_40', s.highestLevel >= 40);
    u('level_50', s.highestLevel >= 50);

    // Evolution achievements
    u('evo_1', s.evolutionsMade >= 1);
    u('evo_3', s.evolutionsMade >= 3);
    u('evo_5', s.evolutionsMade >= 5);
    u('evo_10', s.evolutionsMade >= 10);

    // Overload achievements
    u('overload_1', s.overloadsUsed >= 1);
    u('overload_10', s.overloadsUsed >= 10);
    u('overload_25', s.overloadsUsed >= 25);

    // Credits achievements
    u('credits_500', this.data.lifetimeCredits >= 500);
    u('credits_2000', this.data.lifetimeCredits >= 2000);
    u('credits_5000', this.data.lifetimeCredits >= 5000);
    u('credits_10000', this.data.lifetimeCredits >= 10000);

    // Skilltree achievements
    const totalSkills = Object.values(this.data.skilltree).reduce((acc, v) => acc + v, 0);
    u('skills_5', totalSkills >= 5);
    u('skills_15', totalSkills >= 15);
    u('skills_30', totalSkills >= 30);

    // Ensure unlocks are up-to-date before checking map/mode achievements
    this.checkUnlockRewards();

    // Map & Mode unlock achievements
    u('map_matrix', this.data.unlockedMaps.includes('matrix'));
    u('map_reactor', this.data.unlockedMaps.includes('reactor'));
    u('mode_endless', this.data.unlockedModes.includes('endless'));
    u('mode_bossrush', this.data.unlockedModes.includes('bossrush'));
  }

  checkUnlockRewards() {
    const a = this.data.achievements;
    // Character unlocks
    if (a['kills_500']) this.unlockCharacter('valkyrie');
    if (a['boss_1']) this.unlockCharacter('colossus');
    if (a['evo_1']) this.unlockCharacter('tesla');
    if (a['overload_10']) this.unlockCharacter('nova');
    if (a['kills_2500']) this.unlockCharacter('havoc');
    if (a['skills_15']) this.unlockCharacter('specter');
    if (a['boss_final']) this.unlockCharacter('chronos');

    // Map unlocks
    if (a['kills_100']) this.unlockMap('matrix');
    if (a['boss_1']) this.unlockMap('abyss');
    if (a['level_20']) this.unlockMap('reactor');
    if (a['evo_3']) this.unlockMap('asteroids');
    if (a['boss_final']) this.unlockMap('glitch');

    // Mode unlocks
    if (a['boss_1']) this.unlockMode('endless');
    if (a['boss_5']) this.unlockMode('bossrush');
    if (a['level_30']) this.unlockMode('hardcore');
    if (a['boss_final']) this.unlockMode('chaos');
  }

  exportJson() {
    const json = JSON.stringify(this.data);
    const envelope = {
      v: 2,
      c: this.computeChecksum(json),
      p: this.encryptPayload(json)
    };
    return 'NEON-SAVE-V2:' + this.toB64(JSON.stringify(envelope));
  }

  importJson(str) {
    try {
      if (!str || typeof str !== 'string') return false;
      let jsonStr = null;
      const trimmed = str.trim();
      if (trimmed.startsWith('NEON-SAVE-V2:')) {
        const b64 = trimmed.slice(13).trim();
        const envelope = JSON.parse(this.fromB64(b64));
        if (envelope && envelope.v === 2 && envelope.c && envelope.p) {
          const decrypted = this.decryptPayload(envelope.p);
          if (this.computeChecksum(decrypted) === envelope.c) {
            jsonStr = decrypted;
          }
        }
      } else {
        // Legacy plain JSON import fallback
        const parsed = JSON.parse(trimmed);
        if (parsed && parsed.version) jsonStr = trimmed;
      }

      if (jsonStr) {
        const parsed = JSON.parse(jsonStr);
        this.data = this.mergeDeep(this.getDefaultSave(), parsed);
        this.save();
        return true;
      }
    } catch (e) {
      console.error('Import error:', e);
    }
    return false;
  }
}

window.SaveSystem = new SaveSystem();
