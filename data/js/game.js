// ==========================================
// NEON SURVIVOR - CORE GAME LOOP & CONTROLLER
// Pacing, Spawning, Neon Overload, Evolutions,
// 30-Min Finale, Victory & Payout System
// ==========================================
'use strict';

class GameController {
  constructor() {
    this.state = 'title';
    this.time = 0;
    this.kills = 0;
    this.bossKills = 0;
    this.creditsEarned = 0;
    this.bonusScore = 0;
    this.pendingLevels = 0;
    this.shake = 0;
    this.hurtFlash = 0;
    this.banner = { text: '', t: 0, col: '#3dfcff' };
    this.resumeWait = 0;
    this.rerollsLeft = 1;
    this.isOverload = false;
    this.overloadTimer = 0;

    this.selectedCharacter = 'apex';
    this.selectedMap = 'void';
    this.selectedMode = 'classic';
    this.isEndlessOvertime = false;
    this.currentBoss = null;
    this.sandboxGodMode = false;
    this.sandboxPauseSpawns = false;

    this.cam = { x: 0, y: 0 };
    this.player = null;
    this.weapons = {};
    this.passives = {};
    this.choices = [];

    this.nextBossIdx = 0;
    this.nextBossTime = 300;
    this.nextSwarmTime = 60;
    this.chaosTimer = 45;
    this.activeChaosEvent = null;
    this.chaosEventEndTime = 0;
    this.chaosSubTimer = 0;
    this.levelUpFocus = 0;
    this.dashHitSet = new Set();
    this.lastFrame = performance.now();
    this.lastRender = performance.now();
    this.initMenuControls();
  }

  initMenuControls() {
    window.addEventListener('keydown', e => {
      if ((e.code === 'Tab' || e.code === 'F2') && this.state === 'play') {
        if (this.selectedMode === 'sandbox') {
          e.preventDefault();
          if (window.UI && window.UI.toggleSandboxPanel) {
            window.UI.toggleSandboxPanel();
          }
        }
        return;
      }
      if (e.code === 'Escape' && window.UI && window.UI.isSandboxOpen) {
        e.preventDefault();
        window.UI.toggleSandboxPanel();
        return;
      }
      if (this.state === 'pause') {
        const tag = e.target && e.target.tagName;
        const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
        const isPauseKey = e.code === 'Escape' || (!isTyping && window.Input && window.Input.isActionCode && window.Input.isActionCode(e.code, 'pause'));
        if (isPauseKey) {
          e.preventDefault();
          if (window.Input) window.Input.pausePressed = false;
          if (window.UI && window.UI.activeScreen === 'settingsModal') {
            const backBtn = document.getElementById('btnSettingsBack');
            if (backBtn) backBtn.click();
            else {
              if (window.UI.renderPauseSummary) window.UI.renderPauseSummary();
              window.UI.showScreen('pause');
            }
          } else {
            this.resumeGame();
          }
          return;
        }
      }
      if (this.state !== 'levelup') return;
      if (e.code === 'Digit1' || e.code === 'Numpad1') this.chooseUpgrade(0);
      else if (e.code === 'Digit2' || e.code === 'Numpad2') this.chooseUpgrade(1);
      else if (e.code === 'Digit3' || e.code === 'Numpad3') this.chooseUpgrade(2);
      else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        this.levelUpFocus = (this.levelUpFocus + Math.max(1, this.choices.length) - 1) % Math.max(1, this.choices.length);
        if (window.UI && window.UI.highlightLevelCard) window.UI.highlightLevelCard(this.levelUpFocus);
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        this.levelUpFocus = (this.levelUpFocus + 1) % Math.max(1, this.choices.length);
        if (window.UI && window.UI.highlightLevelCard) window.UI.highlightLevelCard(this.levelUpFocus);
      } else if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        this.chooseUpgrade(this.levelUpFocus || 0);
      } else if (e.code === 'KeyR') {
        this.rerollChoices();
      }
    });
  }

  init() {
    this.selectedCharacter = window.SaveSystem.data.selectedCharacter || 'apex';
    this.selectedMap = window.SaveSystem.data.selectedMap || 'void';
    this.selectedMode = window.SaveSystem.data.selectedMode || 'classic';
    this.resetGame();
    if (window.DiscordRPC) window.DiscordRPC.init();
    this.loop();
  }

  resetGame() {
    const charDef = window.GAME_DATA.CHARACTERS[this.selectedCharacter] || window.GAME_DATA.CHARACTERS.apex;
    const skillMods = window.SaveSystem.getSkillModifiers();

    const maxHp = (charDef.stats.hp + skillMods.hp);
    this.player = {
      x: 0, y: 0, r: 14,
      hp: maxHp,
      maxHp: maxHp,
      speed: (charDef.stats.spd * skillMods.speed),
      speedModifier: 1,
      xp: 0, lvl: 1, next: 5,
      xpMul: skillMods.xp || 1,
      magnet: (115 * skillMods.magnet),
      dmgMul: (charDef.stats.dmg * skillMods.dmg),
      rateMul: (1.0 * skillMods.rate),
      armor: (charDef.stats.armor + skillMods.armor),
      regen: (charDef.stats.regen + skillMods.regen),
      crit: (charDef.stats.crit + skillMods.crit),
      multi: 0,
      dashCd: 0, dashMaxCd: charDef.stats.dashBonus ? 0.65 : 1.0,
      dashBonus: !!charDef.stats.dashBonus,
      phasedDash: !!charDef.stats.phasedDash,
      secondary: charDef.secondary ? charDef.secondary.id : 'drones',
      secondaryDef: charDef.secondary || null,
      secondaryCd: 0,
      secondaryMaxCd: charDef.secondary ? charDef.secondary.cd : 10,
      secondaryActive: 0,
      barrierActive: 0,
      cloakActive: 0,
      aoeBonus: charDef.stats.aoeBonus || 0,
      slowAura: charDef.stats.slowAura || 0,
      dashT: 0, dvx: 0, dvy: 0, inv: 0,
      face: -Math.PI / 2, mx: 0, my: -1, moving: false,
      overloadGauge: 0,
      overloadCooldown: 0,
      overloadChargeRate: (skillMods.overloadRate || 1) * (charDef.stats.overloadRate || 1),
      overloadDurMul: 1.0,
      shieldHits: 0,
      overdriveTimer: 0,
      doubleDamageTimer: 0,
      xpMultiplierTimer: 0
    };

    if (this.selectedMode === 'hardcore') {
      this.player.hp = 1;
      this.player.maxHp = 1;
    }

    this.time = 0;
    this.isEndlessOvertime = false;
    this.endlessWave = 1;
    this.endlessWaveTimer = 60.0;
    this.portalSpawnTimer = 180.0;
    this.kills = 0;
    this.bossKills = 0;
    this.creditsEarned = 0;
    this.bonusScore = 0;
    this.pendingLevels = 0;
    this.shake = 0;
    this.hurtFlash = 0;
    this.banner = { text: '', t: 0, col: '#3dfcff' };
    this.resumeWait = 0;
    this.rerollsLeft = 1 + skillMods.rerolls;
    this.isOverload = false;
    this.overloadTimer = 0;
    this.nextBossIdx = 0;
    this.nextBossTime = this.selectedMode === 'bossrush' ? 60 : 300;
    this.nextSwarmTime = 60;
    this.chaosTimer = 35;
    this.activeChaosEvent = null;
    this.chaosEventEndTime = 0;
    this.chaosSubTimer = 0;
    this.currentBoss = null;
    this.cam.x = 0;
    this.cam.y = 0;
    this.afkPos = { x: 0, y: 0 };
    this.afkTimer = 0;
    this.lastAfkSurge = 0;
    this.minigameCores = 0;
    this.minigameCoreTimer = 1.0;

    // Reset weapons & passives
    this.weapons = {};
    for (const k in window.GAME_DATA.WEAPONS) {
      this.weapons[k] = { lv: 0, t: 0.3, evolved: false };
    }
    // Starting weapon of character
    this.weapons[charDef.weapon].lv = 1;

    this.passives = {};
    for (const k in window.GAME_DATA.PASSIVES) {
      this.passives[k] = 0;
    }

    // Active Curse & Blessing Modules (Fluch & Segen)
    this.activeModules = {};

    window.Entities.reset();
    const selComp = (window.SaveSystem && window.SaveSystem.data && window.SaveSystem.data.selectedCompanion) || 'scout';
    window.Entities.initCompanion(selComp);
  }

  startRun() {
    this.selectedCharacter = window.SaveSystem.data.selectedCharacter;
    this.selectedMap = window.SaveSystem.data.selectedMap;
    this.selectedMode = window.SaveSystem.data.selectedMode;

    // Test lab: freeze the real savegame. Normal run: make sure no test data is active.
    if (this.selectedMode === 'sandbox') window.SaveSystem.beginTestSession();
    else window.SaveSystem.endTestSession();

    this.resetGame();
    this.state = 'play';
    window.UI.showScreen(null);
    const lang = (window.SaveSystem && window.SaveSystem.getSettings().lang) || 'de';
    if (this.selectedMode === 'sandbox') {
      this.sandboxPauseSpawns = true;
      window.UI.showBanner(lang === 'en' ? 'TEST LAB (PRESS TAB / F2)' : 'TEST-LABOR (TAB / F2 DRÜCKEN)', '#ffd23f');
    } else {
      this.sandboxGodMode = false;
      this.sandboxPauseSpawns = false;
      if (window.UI) {
        window.UI.isSandboxOpen = false;
        const p = document.getElementById('sandboxPanel');
        if (p) p.classList.remove('open');
      }
      window.UI.showBanner(lang === 'en' ? 'SURVIVE!' : 'ÜBERLEBE!', '#3dfcff');
      window.SaveSystem.data.stats.runsStarted++;
      window.SaveSystem.save();
      window.SaveSystem.checkAchievements();
    }
    if (window.SoundSystem) {
      window.SoundSystem.init();
      window.SoundSystem.setMap(this.selectedMap);
      window.SoundSystem.sfx('click');
      window.SoundSystem.setTheme('normal');
    }

    if (window.DiscordRPC) window.DiscordRPC.startRun(this.selectedCharacter, this.selectedMap, this.selectedMode);
  }

  damagePlayer(dmg) {
    if (this.sandboxGodMode) return;
    if (this.player.inv > 0 || this.state !== 'play' || this.isOverload) return;

    // Shield barrier absorption
    if (this.player.shieldHits > 0) {
      this.player.shieldHits--;
      this.player.inv = 0.5;
      this.shake = Math.max(this.shake, 6);
      if (window.SoundSystem) window.SoundSystem.sfx('shield_break');
      window.Entities.addText(this.player.x, this.player.y - 20, 'SCHILD BLOCK', '#76ff03', true);
      return;
    }

    const finalDmg = Math.max(1, dmg - this.player.armor);
    this.player.hp -= finalDmg;
    this.player.inv = 0.6;
    this.shake = Math.max(this.shake, 12);
    this.hurtFlash = 0.35;
    if (window.SoundSystem) window.SoundSystem.sfx('hurt');
    if (window.Input) window.Input.vibrate(200, 0.6, 0.8);

    window.Entities.addText(this.player.x, this.player.y - 20, '-' + Math.round(finalDmg), '#ff3366', true);
    window.Entities.spawnParticle(this.player.x, this.player.y, '#ff3366', 16, 250, 3, 0.5);

    if (this.player.hp <= 0) {
      this.player.hp = 0;
      this.gameOver();
    }
  }

  gainXp(v) {
    const mult = (this.player.xpMultiplierTimer > 0 ? 2 : 1) * (this.player.xpMul || 1) * (this.activeChaosEvent === 'turbo_horde' ? 1.3 : 1);
    this.player.xp += v * mult;
    if (this.selectedMode !== 'sandbox') {
      window.SaveSystem.data.stats.totalGemsCollected += v;
    }

    while (this.player.xp >= this.player.next) {
      this.player.xp -= this.player.next;
      this.player.lvl++;
      this.player.next = Math.floor(4 + this.player.lvl * 3.2 + Math.pow(this.player.lvl, 1.45) * 0.6);
      if (this.selectedMode !== 'sandbox') {
        this.pendingLevels++;
        window.SaveSystem.data.stats.highestLevel = Math.max(window.SaveSystem.data.stats.highestLevel, this.player.lvl);
      }
    }
  }

  activateOverload() {
    if (this.isOverload || (this.player.overloadCooldown || 0) > 0 || this.player.overloadGauge < 100) return;
    this.isOverload = true;
    this.player.overloadGauge = 0;
    this.overloadTimer = 8.5 * (this.player.overloadDurMul || 1);
    this.shake = 15;

    if (window.SoundSystem) {
      window.SoundSystem.sfx('overload');
      window.SoundSystem.setTheme('overload');
    }
    if (window.UI) window.UI.showBanner('⚡ NEON OVERLOAD! ⚡', '#ffd23f');
    if (window.Input) window.Input.vibrate(300, 0.8, 1.0);

    if (this.selectedMode !== 'sandbox') {
      window.SaveSystem.data.stats.overloadsUsed++;
      window.SaveSystem.checkAchievements();
    }
  }

  activateSecondary() {
    const P = this.player;
    if (!P || P.secondaryCd > 0 || this.state !== 'play') return;
    P.secondaryCd = P.secondaryMaxCd || 10;
    if (window.SaveSystem && window.SaveSystem.data && window.SaveSystem.data.stats) {
      window.SaveSystem.data.stats.secondariesUsed = (window.SaveSystem.data.stats.secondariesUsed || 0) + 1;
      window.SaveSystem.checkAchievements();
    }
    if (window.Entities) window.Entities.triggerSecondary(P.secondary, P);
  }

  completeEndlessWave() {
    if (this.state !== 'play') return;
    const P = this.player;
    const lang = (window.SaveSystem && window.SaveSystem.getSettings().lang) || 'de';

    const waveCredits = 150 + this.endlessWave * 25;
    const gotCr = window.SaveSystem ? window.SaveSystem.addCredits(waveCredits) : waveCredits;
    this.creditsEarned = (this.creditsEarned || 0) + gotCr;
    this.bonusScore += 5000 * this.endlessWave;

    if (P) {
      P.hp = Math.min(P.maxHp, P.hp + P.maxHp * 0.35);
      if (window.Entities) {
        for (let g = 0; g < 5; g++) {
          window.Entities.dropGem(P.x + (Math.random() * 40 - 20), P.y + (Math.random() * 40 - 20), 5);
        }
        window.Entities.dropPowerup(P.x + 30, P.y + 30);
      }
    }

    if (window.SaveSystem && window.SaveSystem.data && window.SaveSystem.data.stats) {
      window.SaveSystem.data.stats.bestEndlessWave = Math.max(window.SaveSystem.data.stats.bestEndlessWave || 1, this.endlessWave);
      window.SaveSystem.data.stats.bestEndlessTime = Math.max(window.SaveSystem.data.stats.bestEndlessTime || 0, this.time);
      window.SaveSystem.save();
    }

    const clearedWave = this.endlessWave;
    this.endlessWave++;
    this.endlessWaveTimer = 60.0;

    const bannerMsg = lang === 'en'
      ? `🌊 WAVE ${clearedWave} CLEARED! +${gotCr} 💎 & HEAL`
      : `🌊 WELLE ${clearedWave} GEMEISTERT! +${gotCr} 💎 & HEILUNG`;
    this.banner = { text: bannerMsg, t: 4.0, col: '#ffd23f' };
    if (window.SoundSystem) window.SoundSystem.sfx('portal_win');
    this.shake = Math.max(this.shake, 10);
  }

  triggerAntiAfkPressure() {
    if (this.selectedMode === 'sandbox') return;
    const P = this.player;
    if (!P) return;

    const lang = (window.SaveSystem && window.SaveSystem.getSettings().lang) || 'de';
    if (window.UI) window.UI.showBanner(lang === 'en' ? '⚠ MOVE! SWARM INCOMING!' : '⚠ BEWEGUNG ERFORDERLICH! HORDE FORMIERT SICH!', '#ff0055');
    if (window.SoundSystem) window.SoundSystem.sfx('nova');

    // Spawne 4-6 Eliten & Hetzer, die direkt auf die AFK-Position zustürmen
    const types = ['dasher', 'kamikaze', 'runner', 'teleporter', 'tank'];
    const count = 4 + Math.floor(Math.random() * 3);
    const R = Math.hypot(window.Renderer.W, window.Renderer.H) / 2 + 50;

    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + (Math.random() * 0.4 - 0.2);
      const ex = P.x + Math.cos(a) * R;
      const ey = P.y + Math.sin(a) * R;
      const chosenType = types[Math.floor(Math.random() * types.length)];
      const e = window.Entities.createEnemy(chosenType, ex, ey, true);
      e.spd *= 1.30;
      window.Entities.enemies.push(e);
    }
  }

  getNextBossInfo() {
    if (this.selectedMode === 'sandbox' || this.selectedMode === 'minigame') return null;
    if (this.currentBoss) return { active: true, name: this.currentBoss.name };

    const bossSchedule = ['scorpio', 'leviathan', 'titan', 'vortex_eye', 'chronos', 'arch_sentinel'];

    if (this.selectedMode === 'bossrush' || this.selectedMode === 'endless') {
      const nextKey = bossSchedule[this.nextBossIdx % bossSchedule.length];
      const bossDef = window.GAME_DATA.BOSSES[nextKey] || { name: 'Wächter-Boss' };
      const timeUntil = Math.max(0, this.nextBossTime - this.time);
      return { active: false, name: bossDef.name, timeUntil };
    }

    if (this.nextBossIdx < bossSchedule.length) {
      const nextKey = bossSchedule[this.nextBossIdx];
      const bossDef = window.GAME_DATA.BOSSES[nextKey];
      if (bossDef) {
        const timeUntil = Math.max(0, bossDef.time - this.time);
        return { active: false, name: bossDef.name, timeUntil };
      }
    }

    return { active: false, name: null, timeUntil: 0, allCleared: true };
  }

  update(dt) {
    if (this.resumeWait > 0) {
      this.resumeWait -= dt;
      return;
    }

    this.time += dt;
    if (this.selectedMode !== 'sandbox') {
      window.SaveSystem.data.stats.totalTime += dt;
    }

    const P = this.player;

    // Buff timers
    if (P.overdriveTimer > 0) P.overdriveTimer -= dt;
    if (P.doubleDamageTimer > 0) P.doubleDamageTimer -= dt;
    if (P.xpMultiplierTimer > 0) P.xpMultiplierTimer -= dt;

    // Overload Timer
    if (this.isOverload) {
      this.overloadTimer -= dt;
      // Overload pulls all gems globally
      for (const g of window.Entities.gems) g.pull = true;
      if (this.overloadTimer <= 0) {
        this.isOverload = false;
        P.overloadCooldown = 15.0; // 15 Sekunden Erholungsphase
        P.overloadGauge = 0;
        if (window.SoundSystem) window.SoundSystem.setTheme(this.currentBoss ? 'boss' : 'normal');
      }
    } else if ((P.overloadCooldown || 0) > 0) {
      P.overloadCooldown = Math.max(0, P.overloadCooldown - dt);
    }

    // Endless mode wave timer & Overtime
    if (this.selectedMode === 'endless' || this.isEndlessOvertime) {
      this.endlessWaveTimer -= dt;
      if (this.endlessWaveTimer <= 0) {
        this.completeEndlessWave();
      }
    }

    // Minigame Mode (Dimensions-Rallye): Spawn Dimension Cores & fast-paced arcade timer
    if (this.selectedMode === 'minigame') {
      this.minigameCoreTimer -= dt;
      if (this.minigameCoreTimer <= 0) {
        this.minigameCoreTimer = 3.5;
        if (window.Entities && (!window.Entities.minigameCoresList || window.Entities.minigameCoresList.length < 12)) {
          const ang = Math.random() * Math.PI * 2;
          const dist = 140 + Math.random() * 320;
          window.Entities.spawnMinigameCore(P.x + Math.cos(ang) * dist, P.y + Math.sin(ang) * dist);
        }
      }
      if (this.time >= 180) {
        this.triggerVictory();
        return;
      }
    }

    // Periodic Portal Spawn Timer
    this.portalSpawnTimer -= dt;
    if (this.portalSpawnTimer <= 0) {
      this.portalSpawnTimer = 210.0;
      const pAng = Math.random() * Math.PI * 2;
      if (window.Entities) window.Entities.spawnPortal(P.x + Math.cos(pAng) * 320, P.y + Math.sin(pAng) * 320);
    }

    // Check if Sandbox Menu is open: freeze player movement
    const sbOpen = Boolean(window.UI && window.UI.isSandboxOpen);
    if (sbOpen && window.Input) {
      window.Input.dashPressed = false;
      window.Input.secondaryPressed = false;
      window.Input.overloadPressed = false;
    }

    // Check Secondary Ability Input
    if (window.Input && window.Input.secondaryPressed) {
      window.Input.secondaryPressed = false;
      if (!sbOpen) this.activateSecondary();
    }

    // Check Overload Key Input
    if (window.Input && window.Input.overloadPressed) {
      window.Input.overloadPressed = false;
      if (!sbOpen) this.activateOverload();
    }

    // Movement & Dash
    const mov = sbOpen ? { x: 0, y: 0, moving: false } : window.Input.getMovementVector(P.x, P.y, this.cam.x, this.cam.y, window.Renderer.W, window.Renderer.H);
    const frameSpeedMod = P.speedModifier || 1;
    P.speedModifier = 1; // Reset for next frame's hazard/leech evaluation
    P.dashCd -= dt;
    P.secondaryCd -= dt;
    P.inv -= dt;

    if (window.Input.dashPressed) {
      window.Input.dashPressed = false;
      if (!sbOpen && P.dashCd <= 0) {
        P.dvx = P.mx * 1100;
        P.dvy = P.my * 1100;
        P.dashT = 0.17;
        P.inv = Math.max(P.inv, 0.35);
        P.dashCd = P.dashMaxCd || 1.0;
        this.dashHitSet.clear();
        if (window.SaveSystem && window.SaveSystem.data && window.SaveSystem.data.stats) {
          window.SaveSystem.data.stats.dashesUsed = (window.SaveSystem.data.stats.dashesUsed || 0) + 1;
          window.SaveSystem.checkAchievements();
        }
        if (window.SoundSystem) window.SoundSystem.sfx('dash');
        if (window.Input) window.Input.vibrate(100, 0.4, 0.6);
      }
    }

    const oldPx = P.x, oldPy = P.y;
    if (P.dashT > 0 && !sbOpen) {
      P.dashT -= dt;
      P.x += P.dvx * dt;
      P.y += P.dvy * dt;
      window.Entities.spawnParticle(P.x, P.y, P.phasedDash ? '#d500f9' : '#3dfcff', 2, 80, 8, 0.25);

      // Specter phasedDash damages enemies dashed through
      if (P.phasedDash) {
        window.Entities.grid.query(P.x, P.y, P.r + 28, e => {
          if (!e.dead && !this.dashHitSet.has(e) && Math.hypot(e.x - P.x, e.y - P.y) < P.r + e.r + 20) {
            this.dashHitSet.add(e);
            window.Entities.hurtEnemy(e, 45 * P.dmgMul, P.dvx * 0.2, P.dvy * 0.2, true);
          }
        });
      }
    } else {
      if (sbOpen) {
        P.moving = false;
      } else {
        const chaosSpd = this.activeChaosEvent === 'hyper_speed' ? 1.4 : 1.0;
        const spdTotal = P.speed * (P.overdriveTimer > 0 ? 1.5 : 1.0) * frameSpeedMod * chaosSpd;
        P.x += mov.x * spdTotal * dt;
        P.y += mov.y * spdTotal * dt;
        if (mov.moving) {
          P.mx = mov.x; P.my = mov.y;
          P.moving = true;
        } else {
          P.moving = false;
        }
      }
    }
    const stepDist = Math.hypot(P.x - oldPx, P.y - oldPy);
    if (this.selectedMode !== 'sandbox') {
      window.SaveSystem.data.stats.distanceTraveled = (window.SaveSystem.data.stats.distanceTraveled || 0) + stepDist;

      // Anti-AFK Schutz: Verhindert tatenloses Herumstehen in der Mitte bei hochgezüchteten EVOs
      if (!this.afkPos) this.afkPos = { x: P.x, y: P.y };
      const distFromAnchor = Math.hypot(P.x - this.afkPos.x, P.y - this.afkPos.y);
      if (distFromAnchor < 45) {
        this.afkTimer = (this.afkTimer || 0) + dt;
        if (this.afkTimer >= 4.5 && (this.time - (this.lastAfkSurge || 0)) >= 4.0) {
          this.lastAfkSurge = this.time;
          this.triggerAntiAfkPressure();
        }
      } else {
        this.afkPos = { x: P.x, y: P.y };
        this.afkTimer = 0;
      }
    }

    // Chronos-X slow aura
    if (P.slowAura > 0) {
      window.Entities.grid.query(P.x, P.y, 185, e => {
        if (!e.dead && Math.hypot(e.x - P.x, e.y - P.y) < 185) {
          e.frozen = Math.max(e.frozen || 0, 0.2);
        }
      });
    }

    // Face rotation
    if (P.moving || P.dashT > 0) {
      const ta = Math.atan2(P.my, P.mx);
      let da = ((ta - P.face + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      P.face += da * Math.min(1, dt * 14);
      if (Math.random() < 0.6) {
        window.Entities.spawnParticle(
          P.x - Math.cos(P.face) * 12, P.y - Math.sin(P.face) * 12,
          this.isOverload ? '#ffd23f' : '#ff2d95', 1, 100, 3, 0.25
        );
      }
    }

    // Passive Regen
    if (P.regen > 0) P.hp = Math.min(P.maxHp, P.hp + P.regen * dt);

    // Smooth Camera Follow
    this.cam.x += (P.x - this.cam.x) * Math.min(1, dt * 7);
    this.cam.y += (P.y - this.cam.y) * Math.min(1, dt * 7);

    // Hardcore 10-minute achievement check
    if (this.selectedMode === 'hardcore' && this.time >= 600) {
      window.SaveSystem.unlockAchievement('hardcore_win');
    }

    // Chaos mode random events every 45 seconds
    if (this.selectedMode === 'chaos') {
      this.updateChaosMode(dt, P);
    }

    // Timeline Boss Scheduling (Every 5 minutes, or every 60s in Boss Rush)
    this.checkBossTimeline();

    // Swarm scheduling
    if (this.time >= this.nextSwarmTime) {
      this.nextSwarmTime += 50;
      this.spawnSwarm();
    }

    // Spawning Mobs
    this.updateSpawning(dt);

    // Update Entities & Weapons
    window.Weapons.update(dt, P, this.weapons, this.passives);
    window.Entities.update(dt);

    this.shake = Math.max(0, this.shake - dt * 35);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    if (this.banner.t > 0) this.banner.t -= dt;

    // Check Pause
    if (window.Input.pausePressed) {
      window.Input.pausePressed = false;
      if (window.UI && window.UI.isSandboxOpen) {
        window.UI.toggleSandboxPanel();
      } else {
        this.pauseGame();
      }
    }

    // Level-up trigger (Suppressed in Sandbox Mode)
    if (this.pendingLevels > 0 && this.state === 'play') {
      if (this.selectedMode !== 'sandbox') {
        this.openLevelUp();
      } else {
        this.pendingLevels = 0;
      }
    }
  }

  updateChaosMode(dt, P) {
    if (this.activeChaosEvent && this.time >= this.chaosEventEndTime) {
      this.activeChaosEvent = null;
    }
    this.chaosTimer -= dt;
    if (this.chaosTimer <= 0) {
      this.chaosTimer = 45;
      const events = [
        { id: 'turbo_horde', label: 'CHAOS: TURBO-HORDE (+30% XP)' },
        { id: 'overdrive_weapons', label: 'CHAOS: WAFFEN-ÜBERLADUNG (+50% TEMPORATE)' },
        { id: 'meteor_shower', label: 'CHAOS: PLASMA-METEORITEN' },
        { id: 'hyper_speed', label: 'CHAOS: HYPER-GESCHWINDIGKEIT' },
        { id: 'jackpot_rain', label: 'CHAOS: JACKPOT-REGEN' }
      ];
      const ev = events[Math.floor(Math.random() * events.length)];
      this.activeChaosEvent = ev.id;
      this.chaosEventEndTime = this.time + 25;
      this.chaosSubTimer = 0.5;
      if (window.UI) window.UI.showBanner('⚡ ' + ev.label, '#ff00aa');
      if (window.SoundSystem) window.SoundSystem.sfx('overload');
    }

    if (this.activeChaosEvent === 'meteor_shower') {
      this.chaosSubTimer -= dt;
      if (this.chaosSubTimer <= 0) {
        this.chaosSubTimer = 0.7;
        const ang = Math.random() * Math.PI * 2;
        const dist = 80 + Math.random() * 340;
        const mx = P.x + Math.cos(ang) * dist;
        const my = P.y + Math.sin(ang) * dist;
        window.Entities.grid.query(mx, my, 120, e => {
          if (!e.dead) window.Entities.hurtEnemy(e, 95 * P.dmgMul, (e.x - mx) * 2, (e.y - my) * 2, true);
        });
        window.Entities.fx.push({ type: 'ring', x: mx, y: my, r0: 10, r1: 120, life: 0.4, max: 0.4, col: '#ff00aa' });
        window.Entities.spawnParticle(mx, my, '#ff00aa', 18, 240, 4, 0.5);
        if (window.SoundSystem) window.SoundSystem.sfx('boom');
      }
    } else if (this.activeChaosEvent === 'jackpot_rain') {
      this.chaosSubTimer -= dt;
      if (this.chaosSubTimer <= 0) {
        this.chaosSubTimer = 3.5;
        const ang = Math.random() * Math.PI * 2;
        const dist = 140 + Math.random() * 180;
        window.Entities.dropPowerup(P.x + Math.cos(ang) * dist, P.y + Math.sin(ang) * dist, Math.random() < 0.5 ? 'credit_cache' : null);
      }
    }
  }

  checkBossTimeline() {
    if (this.selectedMode === 'sandbox' || this.selectedMode === 'minigame') return;
    const bossSchedule = ['scorpio', 'leviathan', 'titan', 'vortex_eye', 'chronos', 'arch_sentinel'];
    if (this.selectedMode === 'bossrush') {
      if (this.time >= this.nextBossTime) {
        const nextKey = bossSchedule[this.nextBossIdx % bossSchedule.length];
        this.nextBossIdx++;
        this.nextBossTime += 60;
        const a = Math.random() * Math.PI * 2;
        const d = Math.hypot(window.Renderer.W, window.Renderer.H) / 2 + 80;
        window.Entities.createBoss(nextKey, this.player.x + Math.cos(a) * d, this.player.y + Math.sin(a) * d);
      }
      return;
    }

    if (this.selectedMode === 'endless' || this.isEndlessOvertime) {
      if (this.time >= this.nextBossTime) {
        const nextKey = bossSchedule[this.nextBossIdx % bossSchedule.length];
        this.nextBossIdx++;
        this.nextBossTime += 180;
        const a = Math.random() * Math.PI * 2;
        const d = Math.hypot(window.Renderer.W, window.Renderer.H) / 2 + 80;
        window.Entities.createBoss(nextKey, this.player.x + Math.cos(a) * d, this.player.y + Math.sin(a) * d);
      }
      return;
    }

    if (this.nextBossIdx < bossSchedule.length) {
      const nextKey = bossSchedule[this.nextBossIdx];
      const bossDef = window.GAME_DATA.BOSSES[nextKey];
      if (this.time >= bossDef.time) {
        this.nextBossIdx++;
        const a = Math.random() * Math.PI * 2;
        const d = Math.hypot(window.Renderer.W, window.Renderer.H) / 2 + 80;
        window.Entities.createBoss(nextKey, this.player.x + Math.cos(a) * d, this.player.y + Math.sin(a) * d);
      }
    }
  }

  spawnSwarm() {
    if (this.selectedMode === 'sandbox') return;
    const powerScore = (window.Entities && window.Entities.getPlayerPowerScore) ? window.Entities.getPlayerPowerScore() : 0;
    const n = Math.min(38, 12 + Math.floor(this.time / 40) + Math.floor(powerScore * 1.5));
    const R = Math.hypot(window.Renderer.W, window.Renderer.H) / 2 + 50;
    const type = (this.time > 120 || powerScore >= 4) ? 'runner' : 'grunt';
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const e = window.Entities.createEnemy(type, this.player.x + Math.cos(a) * R, this.player.y + Math.sin(a) * R);
      window.Entities.enemies.push(e);
    }
    const lang = (window.SaveSystem && window.SaveSystem.getSettings().lang) || 'de';
    window.UI.showBanner(lang === 'en' ? '⚡ SWARM INCOMING! ⚡' : '⚡ SCHWARM NAHT! ⚡', '#ffd23f');
    if (window.SoundSystem) window.SoundSystem.sfx('nova');
  }

  updateSpawning(dt) {
    if (this.selectedMode === 'sandbox' || this.sandboxPauseSpawns) return;
    const powerScore = (window.Entities && window.Entities.getPlayerPowerScore) ? window.Entities.getPlayerPowerScore() : 0;
    const m = this.time / 60;
    // Dynamisches Gegnerlimit: 110 früh -> 180-210 spät bei starkem Build (kein 300er-Klumpen)
    const maxEnemies = Math.min(210, 110 + Math.floor(m * 4) + Math.floor(powerScore * 3));
    if (window.Entities.enemies.length >= maxEnemies) return;
    const chaosMul = this.activeChaosEvent === 'turbo_horde' ? 1.7 : 1.0;
    const glitchMul = this.selectedMap === 'glitch' ? 1.2 : 1.0;
    const powerSpawnMul = 1.0 + Math.min(0.45, powerScore * 0.05);
    const spawnRate = (1.1 + m * 0.50 + Math.min(m * 0.12, 1.8)) * chaosMul * glitchMul * powerSpawnMul * dt;
    if (Math.random() < spawnRate) {
      const type = this.pickSpawnType();
      const a = Math.random() * Math.PI * 2;
      const d = Math.hypot(window.Renderer.W, window.Renderer.H) / 2 + 60 + Math.random() * 80;
      const e = window.Entities.createEnemy(type, this.player.x + Math.cos(a) * d, this.player.y + Math.sin(a) * d);
      window.Entities.enemies.push(e);
    }
  }

  pickSpawnType() {
    const powerScore = (window.Entities && window.Entities.getPlayerPowerScore) ? window.Entities.getPlayerPowerScore() : 0;
    const t = this.time + (this.selectedMap === 'glitch' ? 120 : 0) + (powerScore * 18);
    const pool = [['grunt', 10]];
    if (t > 30) pool.push(['runner', 4]);
    if (t > 70) pool.push(['dasher', 3]);
    if (t > 100) pool.push(['tank', 2.5]);
    if (t > 130) pool.push(['shooter', 2.5]);
    if (t > 160) pool.push(['splitter', 2.5]);
    if (t > 200) pool.push(['shielder', 2]);
    if (t > 210) pool.push(['repulsor', 2]);
    if (t > 240) pool.push(['teleporter', 2]);
    if (t > 280) pool.push(['summoner', 1.8]);
    if (t > 320) pool.push(['sniper', 1.8]);
    if (t > 360) pool.push(['mortar', 1.6]);
    if (t > 400) pool.push(['kamikaze', 2]);
    if (t > 450) pool.push(['orbiter', 2]);
    if (t > 500) pool.push(['phantom', 1.8]);
    if (t > 550) pool.push(['leech', 1.8]);

    let sum = 0;
    for (const p of pool) sum += p[1];
    let r = Math.random() * sum;
    for (const p of pool) {
      r -= p[1];
      if (r <= 0) return p[0];
    }
    return 'grunt';
  }

  buildChoices() {
    const pool = [];

    // 1. Check for possible Weapon Evolutions!
    for (const wKey in this.weapons) {
      const w = this.weapons[wKey];
      const def = window.GAME_DATA.WEAPONS[wKey];
      if (w.lv >= def.max && !w.evolved && def.requiredPassive) {
        if (this.passives[def.requiredPassive] > 0) {
          pool.push({ kind: 'evo', id: def.evolution, baseWeapon: wKey, wgt: 10 }); // High priority
        }
      }
    }

    // 2. Regular Weapon upgrades
    for (const wKey in window.GAME_DATA.WEAPONS) {
      const w = this.weapons[wKey];
      const def = window.GAME_DATA.WEAPONS[wKey];
      if (w.lv < def.max) {
        pool.push({ kind: 'w', id: wKey, wgt: w.lv === 0 ? 1.4 : 1.1 });
      }
    }

    // 3. Passive upgrades
    for (const pKey in window.GAME_DATA.PASSIVES) {
      const def = window.GAME_DATA.PASSIVES[pKey];
      if (this.passives[pKey] < def.max) {
        pool.push({ kind: 'p', id: pKey, wgt: 1.0 });
      }
    }

    // 4. Risk-Reward Modules (Fluch & Segen, 15% Chance ab Level 5)
    if (this.player && this.player.lvl >= 5 && window.GAME_DATA.MODULES) {
      for (const mKey in window.GAME_DATA.MODULES) {
        if (!this.activeModules || !this.activeModules[mKey]) {
          pool.push({ kind: 'm', id: mKey, wgt: 0.35 });
        }
      }
    }

    const out = [];
    while (out.length < 3 && pool.length) {
      let sum = 0;
      for (const p of pool) sum += p.wgt;
      let r = Math.random() * sum, idx = 0;
      for (; idx < pool.length; idx++) {
        r -= pool[idx].wgt;
        if (r <= 0) break;
      }
      idx = Math.min(idx, pool.length - 1);
      out.push(pool.splice(idx, 1)[0]);
    }

    if (out.length < 3) out.push({ kind: 'x', id: 'heal' });
    if (out.length < 3) out.push({ kind: 'x', id: 'credits' });
    if (out.length < 3) out.push({ kind: 'x', id: 'overload' });
    return out;
  }

  openLevelUp() {
    this.pendingLevels--;
    this.state = 'levelup';
    this.levelUpFocus = 0;
    this.choices = this.buildChoices();
    window.UI.renderLevelUp(this.choices, this.rerollsLeft > 0);
    if (window.UI.highlightLevelCard) window.UI.highlightLevelCard(this.levelUpFocus);
    window.UI.showScreen('levelup');
    if (window.SoundSystem) window.SoundSystem.sfx('level');
  }

  rerollChoices() {
    if (this.state !== 'levelup' || this.rerollsLeft <= 0) return;
    this.rerollsLeft--;
    this.levelUpFocus = 0;
    this.choices = this.buildChoices();
    window.UI.renderLevelUp(this.choices, this.rerollsLeft > 0);
    if (window.UI.highlightLevelCard) window.UI.highlightLevelCard(this.levelUpFocus);
    if (window.SoundSystem) window.SoundSystem.sfx('nova');
  }

  chooseUpgrade(idx) {
    if (this.state !== 'levelup' || !this.choices[idx]) return;
    const c = this.choices[idx];
    const P = this.player;

    if (c.kind === 'evo') {
      this.weapons[c.baseWeapon].evolved = true;
      if (window.SoundSystem) window.SoundSystem.sfx('evolution');
      if (this.selectedMode !== 'sandbox') {
        window.SaveSystem.data.stats.evolutionsMade++;
        const evoAchMap = {
          hyper_gatling: 'blaster_max',
          photonic_beam: 'laser_max',
          event_horizon: 'vortex_max',
          hellfire_dragon: 'flame_max',
          chronos_matrix: 'emp_max'
        };
        if (evoAchMap[c.id]) window.SaveSystem.unlockAchievement(evoAchMap[c.id]);
        window.SaveSystem.checkAchievements();
      }
    } else if (c.kind === 'w') {
      this.weapons[c.id].lv++;
      this.weapons[c.id].t = Math.min(this.weapons[c.id].t, 0.2);
    } else if (c.kind === 'p') {
      this.passives[c.id]++;
      this.applyPassiveEffect(c.id);
    } else if (c.kind === 'm') {
      if (!this.activeModules) this.activeModules = {};
      this.activeModules[c.id] = true;
      this.applyModuleEffect(c.id);
      if (window.SoundSystem) window.SoundSystem.sfx('overload');
    } else if (c.id === 'heal') {
      P.hp = Math.min(P.maxHp, P.hp + 50);
    } else if (c.id === 'overload') {
      P.overloadGauge = Math.min(100, (P.overloadGauge || 0) + 50);
      P.shieldHits = Math.max(P.shieldHits || 0, 2);
    } else {
      this.creditsEarned += window.SaveSystem.addCredits(100) || 0;
    }

    if (window.SoundSystem) window.SoundSystem.sfx('click');
    P.inv = Math.max(P.inv, 1.4);

    if (this.pendingLevels > 0) {
      this.openLevelUp();
    } else {
      this.state = 'play';
      window.UI.showScreen(null);
      this.resumeWait = 0.9;
    }
  }

  applyPassiveEffect(pKey) {
    const P = this.player;
    switch (pKey) {
      case 'dmg': P.dmgMul += 0.22; break;
      case 'rate': P.rateMul += 0.15; break;
      case 'speed': P.speed *= 1.12; break;
      case 'hp':
        if (this.selectedMode !== 'hardcore') {
          P.maxHp += 35;
          P.hp = Math.min(P.maxHp, P.hp + 35);
        }
        break;
      case 'magnet': P.magnet *= 1.45; break;
      case 'armor': P.armor += 3.0; break;
      case 'regen': P.regen += 0.8; break;
      case 'crit': P.crit += 0.10; break;
      case 'multi': P.multi += 1; break;
      case 'overload_boost':
        P.overloadChargeRate *= 1.2;
        P.overloadDurMul = (P.overloadDurMul || 1) + 0.2;
        break;
    }
  }

  applyModuleEffect(modId) {
    const P = this.player;
    if (!P) return;
    switch (modId) {
      case 'glass_cannon':
        P.dmgMul += 0.20;
        if (this.selectedMode !== 'hardcore') {
          P.maxHp = Math.max(10, Math.round(P.maxHp * 0.85));
          P.hp = Math.min(P.maxHp, P.hp);
        }
        break;
      case 'hyper_drive':
        P.speed *= 1.18;
        P.magnet *= 1.10;
        P.armor = Math.max(0, P.armor - 2);
        break;
      case 'blood_converter':
        P.rateMul += 0.15;
        P.regen = Math.max(0, P.regen - 0.3);
        break;
      case 'greed_reactor':
        P.xpMul = (P.xpMul || 1) * 1.25;
        break;
    }
  }

  recalcPlayerStats() {
    if (!this.player) return;
    const charDef = window.GAME_DATA.CHARACTERS[this.selectedCharacter] || window.GAME_DATA.CHARACTERS.striker;
    const skillMods = window.SaveSystem.getSkillModifiers();
    const P = this.player;

    const baseMaxHp = (charDef.stats.hp + (skillMods.hp || 0));
    const hpRank = this.passives.hp || 0;
    const newMaxHp = (this.selectedMode === 'hardcore') ? 1 : (baseMaxHp + hpRank * 35);
    const hpRatio = P.maxHp > 0 ? (P.hp / P.maxHp) : 1;
    P.maxHp = newMaxHp;
    P.hp = Math.min(P.maxHp, Math.max(1, Math.round(newMaxHp * hpRatio)));

    P.speed = (charDef.stats.spd * (skillMods.speed || 1)) * Math.pow(1.12, this.passives.speed || 0);
    P.dmgMul = (charDef.stats.dmg * (skillMods.dmg || 1)) + (this.passives.dmg || 0) * 0.22;
    P.rateMul = (1.0 * (skillMods.rate || 1)) + (this.passives.rate || 0) * 0.15;
    P.magnet = (115 * (skillMods.magnet || 1)) * Math.pow(1.45, this.passives.magnet || 0);
    P.armor = (charDef.stats.armor + (skillMods.armor || 0)) + (this.passives.armor || 0) * 3.0;
    P.regen = (charDef.stats.regen + (skillMods.regen || 0)) + (this.passives.regen || 0) * 0.8;
    P.crit = (charDef.stats.crit + (skillMods.crit || 0)) + (this.passives.crit || 0) * 0.10;
    P.multi = (this.passives.multi || 0);
    P.overloadChargeRate = (skillMods.overloadRate || 1) * (charDef.stats.overloadRate || 1) * Math.pow(1.2, this.passives.overload_boost || 0);
    P.overloadDurMul = 1.0 + (this.passives.overload_boost || 0) * 0.2;
  }

  pauseGame() {
    if (this.state !== 'play') return;
    this.state = 'pause';
    if (window.Input) {
      for (const k in window.Input.K) window.Input.K[k] = false;
      window.Input.mouse.down = false;
      window.Input.mouse.rightDown = false;
      window.Input.pausePressed = false;
      window.Input.dashPressed = false;
      window.Input.overloadPressed = false;
    }
    if (window.UI && window.UI.renderPauseSummary) window.UI.renderPauseSummary();
    window.UI.showScreen('pause');
  }

  resumeGame() {
    if (this.state !== 'pause') return;
    if (window.Input) window.Input.pausePressed = false;
    this.state = 'play';
    window.UI.showScreen(null);
    this.resumeWait = 0.8;
  }

  gameOver() {
    this.state = 'over';
    if (window.SoundSystem) {
      window.SoundSystem.sfx('over');
      window.SoundSystem.setTheme('normal');
    }

    const lang = (window.SaveSystem && window.SaveSystem.getSettings().lang) || 'de';
    const loc = lang === 'en' ? 'en-US' : 'de-DE';

    if (this.selectedMode === 'sandbox') {
      const overStatsEl = document.getElementById('ostats');
      if (overStatsEl) {
        overStatsEl.innerHTML = `
          ${lang === 'en' ? 'Mode' : 'Modus'}: <b style="color:#ffd23f;">${lang === 'en' ? 'TEST LAB (SANDBOX)' : 'TEST-LABOR (SANDBOX)'}</b><br>
          ${lang === 'en' ? 'Survived' : 'Überlebt'}: <b>${Math.floor(this.time / 60)}m ${Math.floor(this.time % 60)}s</b><br>
          Kills: <b>${this.kills}</b> &nbsp;·&nbsp; ${lang === 'en' ? 'Bosses' : 'Wächter'}: <b>${this.bossKills}</b><br>
          <span style="font-size:13px;color:#aaa;">${lang === 'en' ? '(Test Lab: No credits, statistics, or achievements are saved)' : '(Test-Labor: Es werden keine Credits, Statistiken oder Erfolge gespeichert)'}</span>
        `;
      }
      window.SaveSystem.endTestSession();
      if (window.DiscordRPC) window.DiscordRPC.setMenu();
      setTimeout(() => window.UI.showScreen('over'), 1000);
      return;
    }

    // In-run credits were already credited on pickup; only the survival bonus is added here
    const finalCredits = (this.creditsEarned || 0) + (window.SaveSystem.addCredits(Math.floor(this.time / 5)) || 0);
    const score = Math.floor(this.time) * 10 + this.kills * 10 + this.bossKills * 2500 + this.bonusScore;
    window.SaveSystem.data.stats.highestScore = Math.max(window.SaveSystem.data.stats.highestScore, score);
    window.SaveSystem.data.stats.bestSurvivalTime = Math.max(window.SaveSystem.data.stats.bestSurvivalTime || 0, this.time);
    if (this.selectedMode === 'endless' || this.isEndlessOvertime) {
      window.SaveSystem.data.stats.bestEndlessWave = Math.max(window.SaveSystem.data.stats.bestEndlessWave || 1, this.endlessWave || 1);
      window.SaveSystem.data.stats.bestEndlessTime = Math.max(window.SaveSystem.data.stats.bestEndlessTime || 0, this.time);
    }
    window.SaveSystem.save();
    window.SaveSystem.checkAchievements();
    if (window.DiscordRPC) window.DiscordRPC.setGameOver(this.time, this.kills, score);

    const overStatsEl = document.getElementById('ostats');
    if (overStatsEl) {
      overStatsEl.innerHTML = `
        ${this.isEndlessOvertime ? `<div style="color:#ffd23f;font-weight:900;font-size:16px;margin-bottom:6px;">★ ${lang === 'en' ? 'VICTORY OVERTIME RECAP' : 'SIEG-OVERTIME ABRECHNUNG'} ★</div>` : ''}
        ${lang === 'en' ? 'Survived' : 'Überlebt'}: <b>${Math.floor(this.time / 60)}m ${Math.floor(this.time % 60)}s</b><br>
        ${(this.selectedMode === 'endless' || this.isEndlessOvertime) ? `${lang === 'en' ? 'Endless Wave Reached' : 'Erreichte Endlos-Welle'}: <b style="color:#3dfcff;font-size:20px;">🌊 ${this.endlessWave || 1}</b><br>` : ''}
        ${this.selectedMode === 'minigame' ? `${lang === 'en' ? 'Dimension Cores Collected' : 'Gesammelte Dimensions-Kerne'}: <b style="color:#ffd23f;font-size:20px;">🎯 ${this.minigameCores || 0}</b><br>` : ''}
        Kills: <b>${this.kills}</b> &nbsp;·&nbsp; ${lang === 'en' ? 'Bosses' : 'Wächter'}: <b>${this.bossKills}</b><br>
        ${lang === 'en' ? 'Neon Credits earned' : 'Neon Credits verdient'}: <b style="color:#00ffcc;font-size:24px">+${finalCredits} 💎</b><br>
        ${lang === 'en' ? 'Score' : 'Punkte'}: <b style="color:#ffd23f;font-size:28px">${score.toLocaleString(loc)}</b>
      `;
    }
    setTimeout(() => window.UI.showScreen('over'), 1000);
  }

  triggerVictory() {
    if (this.selectedMode === 'sandbox') return; // Victory is NEVER awarded in test/sandbox mode!
    this.state = 'victory';
    if (window.SoundSystem) {
      window.SoundSystem.sfx('victory');
      window.SoundSystem.setTheme('victory');
    }
    const lang = (window.SaveSystem && window.SaveSystem.getSettings().lang) || 'de';
    const vicStats = document.getElementById('vstats');

    if (this.selectedMode === 'minigame') {
      window.SaveSystem.data.stats.minigamesWon = (window.SaveSystem.data.stats.minigamesWon || 0) + 1;
      window.SaveSystem.data.stats.bestSurvivalTime = Math.max(window.SaveSystem.data.stats.bestSurvivalTime || 0, this.time);
      const coreCredits = (this.minigameCores || 0) * 35;
      const totalBonus = 800 + coreCredits;
      const bonusCredits = window.SaveSystem.addCredits(totalBonus) || totalBonus;
      window.SaveSystem.save();
      window.SaveSystem.checkAchievements();
      if (window.DiscordRPC) window.DiscordRPC.setVictory(bonusCredits);

      if (vicStats) {
        vicStats.innerHTML = lang === 'en' ? `
          Dimensions-Rallye Completed! You survived the 3-minute arcade gauntlet!<br><br>
          Collected Dimension Cores: <b style="color:#ffd23f;font-size:24px">${this.minigameCores || 0}</b><br>
          Victory Reward: <b style="color:#00ffcc;font-size:26px">+${bonusCredits} 💎 Neon Credits</b>
        ` : `
          Dimensions-Rallye abgeschlossen! Du hast den 3-Minuten-Arcade-Parcours gemeistert!<br><br>
          Gesammelte Dimensions-Kerne: <b style="color:#ffd23f;font-size:24px">${this.minigameCores || 0}</b><br>
          Sieg-Belohnung: <b style="color:#00ffcc;font-size:26px">+${bonusCredits} 💎 Neon Credits</b>
        `;
      }
      window.UI.showScreen('victory');
      return;
    }

    window.SaveSystem.data.stats.runsWon++;
    window.SaveSystem.data.stats.bestSurvivalTime = Math.max(window.SaveSystem.data.stats.bestSurvivalTime || 0, this.time);
    const bonusCredits = window.SaveSystem.addCredits(1000) || 0;
    window.SaveSystem.save();
    window.SaveSystem.checkAchievements();
    if (window.DiscordRPC) window.DiscordRPC.setVictory(bonusCredits);

    if (vicStats) {
      vicStats.innerHTML = lang === 'en' ? `
        You have defeated the Arch-Sentinel and liberated the Neon Matrix!<br><br>
        Victory Reward: <b style="color:#00ffcc;font-size:26px">+${bonusCredits} 💎 Neon Credits</b><br>
        Glitch-Wasteland Map & Chronos Ship unlocked!
      ` : `
        Du hast den Arch-Sentinel bezwungen und die Neon-Matrix befreit!<br><br>
        Sieg-Belohnung: <b style="color:#00ffcc;font-size:26px">+${bonusCredits} 💎 Neon Credits</b><br>
        Glitch-Wasteland Map & Chronos-Schiff freigeschaltet!
      `;
    }
    window.UI.showScreen('victory');
  }

  continueEndlessOvertime() {
    this.isEndlessOvertime = true;
    this.state = 'play';
    this.endlessWave = this.endlessWave || 1;
    this.endlessWaveTimer = 60.0;
    if (this.nextBossTime <= this.time) {
      this.nextBossTime = this.time + 120;
    }
    if (window.UI) {
      window.UI.showScreen(null);
      const lang = (window.SaveSystem && window.SaveSystem.getSettings().lang) || 'de';
      const msg = lang === 'en'
        ? '♾️ ENDLESS OVERTIME ACTIVATED! HOW LONG CAN YOU SURVIVE?'
        : '♾️ ENDLOS-OVERTIME AKTIVIERT! WIE LANGE HÄLTST DU DURCH?';
      window.UI.showBanner(msg, '#ffd23f');
    }
    if (window.SoundSystem) {
      window.SoundSystem.sfx('overload');
      window.SoundSystem.setTheme('boss');
    }
  }

  loop() {
    const now = performance.now();
    const fpsLimit = (window.SaveSystem && window.SaveSystem.getSettings().fpsLimit) || 0;
    if (fpsLimit > 0 && (now - this.lastRender) < (1000 / fpsLimit) - 1.5) {
      requestAnimationFrame(() => this.loop());
      return;
    }
    this.lastRender = now;

    const dt = Math.min((now - this.lastFrame) / 1000, 1 / 30);
    this.lastFrame = now;

    if (this.state === 'levelup' && window.Input) {
      const gp = window.Input.pollGamepad();
      if (gp) {
        if (gp.dpadLeft) {
          this.levelUpFocus = (this.levelUpFocus + Math.max(1, this.choices.length) - 1) % Math.max(1, this.choices.length);
          if (window.UI && window.UI.highlightLevelCard) window.UI.highlightLevelCard(this.levelUpFocus);
        } else if (gp.dpadRight) {
          this.levelUpFocus = (this.levelUpFocus + 1) % Math.max(1, this.choices.length);
          if (window.UI && window.UI.highlightLevelCard) window.UI.highlightLevelCard(this.levelUpFocus);
        } else if (gp.btnA) {
          this.chooseUpgrade(this.levelUpFocus || 0);
        } else if (gp.btnY) {
          this.rerollChoices();
        }
      }
    }

    if (this.state === 'play') {
      this.update(dt);
    } else if (window.Input) {
      window.Input.pausePressed = false;
    }

    const mapDef = window.GAME_DATA.MAPS[this.selectedMap] || window.GAME_DATA.MAPS.void;
    window.Renderer.render(
      this.cam, this.player, window.Entities, mapDef,
      this.isOverload, this.shake, this.hurtFlash, this.banner, dt
    );

    requestAnimationFrame(() => this.loop());
  }
}

window.GameState = new GameController();
