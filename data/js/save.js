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

  load() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.data = this.mergeDeep(this.getDefaultSave(), parsed);
        if (!this.data.settings.discordClientId || this.data.settings.discordClientId === '1306300000000000000') {
          this.data.settings.discordClientId = '1570824779005689919';
        }
        if (!this.data.unlockedModes.includes('sandbox')) {
          this.data.unlockedModes.push('sandbox');
        }
      }
    } catch (e) {
      console.error('Failed to load savegame, using defaults:', e);
      this.data = this.getDefaultSave();
    }
  }

  save() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
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
    return JSON.stringify(this.data, null, 2);
  }

  importJson(str) {
    try {
      const parsed = JSON.parse(str);
      if (parsed.version) {
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
