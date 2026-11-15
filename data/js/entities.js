// ==========================================
// NEON SURVIVOR - ENTITIES & COMBAT SYSTEM
// Spatial Grid, Particles, Projectiles, 17 Enemies,
// 6 Bosses, 15 Weapons, Evolutions, 15 Powerups
// ==========================================
'use strict';

class SpatialGrid {
  constructor(cellSize = 80) {
    this.cell = cellSize;
    this.map = new Map();
  }

  clear() {
    this.map.clear();
  }

  key(cx, cy) {
    return ((cx + 32768) << 16) | (cy + 32768);
  }

  insert(entity) {
    if (entity.dead) return;
    const cx = Math.floor(entity.x / this.cell);
    const cy = Math.floor(entity.y / this.cell);
    const k = this.key(cx, cy);
    let arr = this.map.get(k);
    if (!arr) {
      arr = [];
      this.map.set(k, arr);
    }
    arr.push(entity);
  }

  query(x, y, r, cb) {
    const x0 = Math.floor((x - r - 50) / this.cell);
    const x1 = Math.floor((x + r + 50) / this.cell);
    const y0 = Math.floor((y - r - 50) / this.cell);
    const y1 = Math.floor((y + r + 50) / this.cell);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const arr = this.map.get(this.key(cx, cy));
        if (arr) {
          for (let i = 0; i < arr.length; i++) {
            if (cb(arr[i]) === false) return;
          }
        }
      }
    }
  }

  nearest(x, y, maxD, exclude) {
    let best = null;
    let bd = maxD * maxD;
    this.query(x, y, maxD, e => {
      if (e.dead || (exclude && exclude.has(e))) return;
      const d = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d < bd) {
        bd = d;
        best = e;
      }
    });
    return best;
  }
}

class EntityManager {
  constructor() {
    this.grid = new SpatialGrid(80);
    this.enemies = [];
    this.bullets = [];
    this.ebullets = [];
    this.missiles = [];
    this.saws = [];
    this.mines = [];
    this.vortices = [];
    this.gems = [];
    this.powerups = [];
    this.particles = [];
    this.texts = [];
    this.fx = [];
    this.drones = [];
    this.hazards = [];
    this.turrets = [];
    this.portals = [];
    this.minigameCoresList = [];
    this.portalChallenge = null;
    this.hazardSpawnTimer = 0;
  }

  reset() {
    this.grid.clear();
    this.enemies.length = 0;
    this.bullets.length = 0;
    this.ebullets.length = 0;
    this.missiles.length = 0;
    this.saws.length = 0;
    this.mines.length = 0;
    this.vortices.length = 0;
    this.gems.length = 0;
    this.powerups.length = 0;
    this.particles.length = 0;
    this.texts.length = 0;
    this.fx.length = 0;
    this.drones.length = 0;
    this.hazards.length = 0;
    this.turrets.length = 0;
    this.portals.length = 0;
    this.minigameCoresList.length = 0;
    this.portalChallenge = null;
    this.hazardSpawnTimer = 0;
  }

  spawnParticle(x, y, col, n = 1, spd = 200, size = 3, life = 0.5) {
    const quality = window.SaveSystem ? window.SaveSystem.getSettings().quality : 'high';
    const limit = quality === 'low' ? 400 : quality === 'med' ? 900 : 1800;
    const count = quality === 'low' ? Math.max(1, Math.floor(n * 0.4)) : n;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= limit) break;
      const a = Math.random() * Math.PI * 2;
      const s = Math.random() * spd;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: life * (0.5 + Math.random() * 0.5),
        max: life,
        col,
        size: size * (0.6 + Math.random() * 0.7)
      });
    }
  }

  addText(x, y, txt, col = '#ffffff', big = false) {
    const settings = window.SaveSystem ? window.SaveSystem.getSettings() : { damageNumbers: true };
    if (!settings.damageNumbers && typeof txt === 'number') return;
    if (this.texts.length > 120) this.texts.shift();
    this.texts.push({
      x: x + (Math.random() * 16 - 8),
      y,
      txt: String(txt),
      col,
      big,
      life: 0.75
    });
  }

  dropGem(x, y, val = 1) {
    if (this.gems.length > 500) {
      this.gems[Math.floor(Math.random() * this.gems.length)].val += val;
      return;
    }
    const col = val >= 10 ? '#ffd23f' : val >= 5 ? '#ff3df0' : val >= 3 ? '#5dff6a' : '#3dfcff';
    this.gems.push({
      x, y, val, v: 0, pull: false, col, b: Math.random() * Math.PI * 2
    });
  }

  dropPowerup(x, y, type = null) {
    if (!type) {
      const keys = Object.keys(window.GAME_DATA.POWERUPS);
      type = keys[Math.floor(Math.random() * keys.length)];
    }
    this.powerups.push({
      type, x, y, b: Math.random() * Math.PI * 2, dead: false
    });
    this.spawnParticle(x, y, '#ffd23f', 16, 180, 4, 0.6);
  }

  hurtEnemy(e, dmg, kx = 0, ky = 0, isCrit = false) {
    if (e.dead) return;
    const P = window.GameState.player;
    if (isCrit || Math.random() < P.crit) {
      dmg *= 2;
      isCrit = true;
    }

    e.hp -= dmg;
    e.flash = 0.08;

    const kb = e.isBoss ? 0.04 : (e.isOvercharged ? 0.18 : (e.isElite ? 0.35 : 1.0)) * (12 / e.r);
    e.kx += (kx || 0) * kb;
    e.ky += (ky || 0) * kb;

    this.addText(e.x, e.y - e.r, Math.round(dmg), isCrit ? '#ffd23f' : '#ffffff', isCrit);
    if (window.SoundSystem) window.SoundSystem.sfx(isCrit ? 'crit' : 'hit');

    // Stats
    if (window.GameState && window.GameState.selectedMode !== 'sandbox') {
      window.SaveSystem.data.stats.totalDamage += Math.round(dmg);
    }

    if (e.hp <= 0) {
      this.killEnemy(e);
    }
  }

  killEnemy(e) {
    if (e.dead) return;
    e.dead = true;
    const P = window.GameState.player;
    window.GameState.kills++;
    if (window.GameState.selectedMode !== 'sandbox') {
      window.SaveSystem.data.stats.totalKills++;
    }

    // Overload gauge charging (gesperrt während aktiver Überladung & während der 15s Abklingzeit)
    if (!window.GameState.isOverload && (P.overloadCooldown || 0) <= 0 && (P.overloadGauge || 0) < 100) {
      const boost = P.overloadChargeRate || 1;
      const chargeAmount = (e.isBoss ? 25 : (e.isElite ? 1.5 : 0.35)) * boost;
      P.overloadGauge = Math.min(100, (P.overloadGauge || 0) + chargeAmount);
    }

    if (e.isBoss) {
      this.onBossKilled(e);
      return;
    }

    this.spawnParticle(e.x, e.y, e.col, 14, 250, 3.5, 0.6);
    if (window.SoundSystem) window.SoundSystem.sfx('kill');

    // Drop gems
    this.dropGem(e.x, e.y, e.xp);

    // Random powerup chance (1.8%)
    if (Math.random() < 0.018) {
      this.dropPowerup(e.x, e.y);
    }

    // Splitter enemy logic
    if (e.type === 'splitter') {
      for (let i = 0; i < 2; i++) {
        const mini = this.createEnemy('mini', e.x + (Math.random() * 24 - 12), e.y + (Math.random() * 24 - 12));
        this.enemies.push(mini);
      }
    }

    // Absolute Zero evolution: frozen enemies shatter into piercing ice shards
    if (e.frozen > 0 && window.GameState.weapons.cryo && window.GameState.weapons.cryo.evolved) {
      const dmg = 35 * P.dmgMul;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        this.bullets.push({
          x: e.x, y: e.y,
          vx: Math.cos(a) * 520, vy: Math.sin(a) * 520,
          r: 5, dmg, pierce: 2, life: 0.7, hit: new Set([e]), isCryo: true, isEvoCryo: true
        });
      }
      this.fx.push({ type: 'ring', x: e.x, y: e.y, r0: 6, r1: 70, life: 0.3, max: 0.3, col: '#00e5ff' });
    }
  }

  onBossKilled(boss) {
    window.GameState.bossKills++;
    if (window.GameState.selectedMode !== 'sandbox') {
      window.SaveSystem.data.stats.totalBossKills++;
    }
    window.GameState.currentBoss = null;

    // Massive drops
    for (let i = 0; i < 30; i++) {
      this.dropGem(boss.x + (Math.random() * 160 - 80), boss.y + (Math.random() * 160 - 80), 5);
    }
    this.dropPowerup(boss.x - 30, boss.y, 'super_heart');
    this.dropPowerup(boss.x + 30, boss.y, 'credit_vault');
    this.dropPowerup(boss.x, boss.y - 30, 'hyper_gem');
    this.dropPowerup(boss.x, boss.y + 30, 'magnet');

    this.spawnParticle(boss.x, boss.y, boss.col, 150, 600, 5, 1.2);
    this.spawnParticle(boss.x, boss.y, '#ffffff', 80, 350, 4, 0.9);
    this.fx.push({ type: 'ring', x: boss.x, y: boss.y, r0: 20, r1: 500, life: 1.0, max: 1.0, col: boss.col });

    window.GameState.shake = 30;
    if (window.SoundSystem) {
      window.SoundSystem.sfx('boom');
      window.SoundSystem.sfx('evolution');
      window.SoundSystem.setTheme('normal');
    }
    if (window.UI) {
      const lang = (window.SaveSystem && window.SaveSystem.getSettings().lang) || 'de';
      window.UI.showBanner('👑 ' + boss.name.toUpperCase() + (lang === 'en' ? ' DEFEATED!' : ' BESIEGT!'), '#ffd23f');
    }
    if (window.GameState.selectedMode !== 'sandbox') {
      window.SaveSystem.checkAchievements();
    }

    // Victory check for 30m Arch-Sentinel (or 6th boss in Boss Rush) in finite modes (NEVER in sandbox/test mode)
    if (boss.id === 'arch_sentinel' && window.GameState.selectedMode !== 'endless' && window.GameState.selectedMode !== 'sandbox') {
      window.GameState.triggerVictory();
    }
  }

  getPlayerPowerScore() {
    if (!window.GameState) return 0;
    const P = window.GameState.player;
    let weaponLevels = 0;
    let evoCount = 0;
    if (window.GameState.weapons) {
      for (const k in window.GameState.weapons) {
        const w = window.GameState.weapons[k];
        if (w && w.lv > 0) {
          weaponLevels += w.lv;
          if (w.evolved) evoCount++;
        }
      }
    }
    let passiveLevels = 0;
    if (window.GameState.passives) {
      for (const k in window.GameState.passives) {
        passiveLevels += (window.GameState.passives[k] || 0);
      }
    }
    const pLvl = P ? P.lvl : 1;
    const pDmg = P ? (P.dmgMul || 1.0) : 1.0;
    const pRate = P ? (P.rateMul || 1.0) : 1.0;

    // Power Score: bildet das tatsächliche Zerstörungspotenzial des Spielers ab
    return Math.max(0,
      (pLvl - 1) * 0.04 +
      weaponLevels * 0.05 +
      passiveLevels * 0.04 +
      evoCount * 1.35 +
      (pDmg - 1.0) * 1.5 +
      (pRate - 1.0) * 1.0
    );
  }

  createEnemy(type, x, y, forceElite = false) {
    const def = window.GAME_DATA.ENEMIES[type] || window.GAME_DATA.ENEMIES.grunt;
    const m = (window.GameState ? window.GameState.time : 0) / 60;
    const powerScore = this.getPlayerPowerScore();

    // Dynamische Skalierung basierend auf Spieler-Stärke:
    // Wenn der Spieler viele Waffen, EVOs und Buffs hat, skalieren HP und Tempo progressiv mit,
    // damit Gegner nicht schon off-screen verpuffen und der Spieler immer packende Kämpfe hat.
    const adaptiveHpMul = 1.0 + Math.pow(powerScore, 1.35) * 0.65;
    const adaptiveSpdMul = 1.0 + Math.min(0.65, Math.pow(powerScore, 0.75) * 0.08);
    const adaptiveDmgMul = 1.0 + Math.min(2.5, powerScore * 0.09);

    // Zeitbasierte Pacing-Skalierung
    const baseHpMul = 0.90 + m * 0.55 + Math.pow(m, 2.05) * 0.08;
    const baseSpdMul = 1.0 + Math.min(m * 0.035, 0.55);

    const hpMul = baseHpMul * adaptiveHpMul;
    const spdMul = baseSpdMul * adaptiveSpdMul;

    // Elite & Overcharged Champion Chance:
    // Steigt mit Spielzeit und Spieler-Stärke deutlich an
    const eliteChance = Math.min(0.40, 0.04 + m * 0.015 + (powerScore * 0.02));
    const isElite = forceElite || (m >= 1.5 && Math.random() < eliteChance && type !== 'mini');

    // Wenn der Spieler besonders stark ist (PowerScore >= 6), können Eliten zu Overcharged Champions mutieren
    const isOvercharged = isElite && (powerScore >= 6.0) && (Math.random() < Math.min(0.55, (powerScore - 5.0) * 0.08));

    const finalHpMul = hpMul * (isOvercharged ? 6.0 : (isElite ? 3.5 : 1.0));
    const finalSpdMul = spdMul * (isOvercharged ? 1.35 : (isElite ? 1.25 : 1.0));
    const finalR = isOvercharged ? def.r * 1.5 : (isElite ? def.r * 1.35 : def.r);
    const finalCol = isOvercharged ? '#ff0055' : (isElite ? '#ffd23f' : def.col);

    return {
      type,
      x, y,
      r: finalR,
      hp: def.hp * finalHpMul,
      maxHp: def.hp * finalHpMul,
      spd: def.spd * finalSpdMul * (0.92 + Math.random() * 0.16),
      dmg: def.dmg * (1 + m * 0.08) * adaptiveDmgMul * (isOvercharged ? 1.8 : (isElite ? 1.4 : 1.0)),
      xp: def.xp * (isOvercharged ? 6 : (isElite ? 3 : 1)),
      col: finalCol,
      shape: def.shape,
      flash: 0,
      kx: 0, ky: 0,
      rot: Math.random() * Math.PI * 2,
      dead: false,
      st: 1 + Math.random() * 2,
      telegraph: 0,
      oc: 0, frozen: 0, stunned: 0,
      isBoss: false,
      isElite: !!isElite,
      isOvercharged: !!isOvercharged,
      powerScore
    };
  }

  createBoss(bossKey, x, y) {
    const def = window.GAME_DATA.BOSSES[bossKey];
    if (!def) return null;
    const m = window.GameState.time / 60;
    const powerScore = this.getPlayerPowerScore();
    const bossPowerHp = 1.0 + Math.pow(powerScore, 1.2) * 0.35;
    const hp = def.hp * (1 + m * 0.08) * bossPowerHp;

    const b = {
      id: bossKey,
      name: def.name,
      type: 'boss',
      isBoss: true,
      x, y,
      r: def.r,
      hp: hp,
      maxHp: hp,
      spd: def.spd,
      dmg: def.dmg,
      col: def.col,
      shape: 'star',
      phases: def.phases,
      phase: 1,
      flash: 0,
      kx: 0, ky: 0,
      rot: 0,
      dead: false,
      st: 2.0,
      pat: 0,
      telegraph: 0
    };

    window.GameState.currentBoss = b;
    this.enemies.push(b);
    window.GameState.shake = 20;
    if (window.SoundSystem) {
      window.SoundSystem.sfx('boss');
      window.SoundSystem.setTheme('boss');
    }
    if (window.UI) {
      window.UI.showBanner('⚠ ' + def.name.toUpperCase() + ' NAHT ⚠', def.col);
    }
    return b;
  }

  update(dt) {
    const P = window.GameState.player;
    this.grid.clear();

    // 0. Map Hazards, Turrets, Drones, Active Skills, Portals & Challenge
    this.updateHazards(dt, P);
    this.updateTurrets(dt, P);
    this.updateDrones(dt, P);
    this.updateActiveSkills(dt, P);
    this.updatePortals(dt, P);
    this.updatePortalChallenge(dt, P);
    this.updateMinigameCores(dt, P);

    // 1. Insert active enemies into grid
    for (let i = 0; i < this.enemies.length; i++) {
      this.grid.insert(this.enemies[i]);
    }

    // 2. Update Enemies AI
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (e.dead) continue;
      this.updateEnemyAI(e, dt, P);
    }

    // 3. Update Bullets (Player)
    for (let i = 0; i < this.bullets.length; i++) {
      const b = this.bullets[i];

      // Radiant Glaive / Star Scythe boomerang return
      if (b.isBoomerang && b.life < 0.95) {
        const ang = Math.atan2(P.y - b.y, P.x - b.x);
        b.vx += Math.cos(ang) * 1900 * dt;
        b.vy += Math.sin(ang) * 1900 * dt;
        const spd = Math.hypot(b.vx, b.vy);
        if (spd > 680) {
          b.vx = (b.vx / spd) * 680;
          b.vy = (b.vy / spd) * 680;
        }
      }

      // Star Scythe laser tripwire slices enemies between player and scythe
      if (b.isStarScythe && !b.dead) {
        const mx = (P.x + b.x) * 0.5, my = (P.y + b.y) * 0.5;
        const halfD = Math.hypot(b.x - P.x, b.y - P.y) * 0.5 + 20;
        const ldx = b.x - P.x, ldy = b.y - P.y, len2 = ldx * ldx + ldy * ldy || 1;
        this.grid.query(mx, my, halfD, e => {
          if (e.dead) return;
          const u = Math.max(0, Math.min(1, ((e.x - P.x) * ldx + (e.y - P.y) * ldy) / len2));
          const px = P.x + u * ldx, py = P.y + u * ldy;
          if (Math.hypot(e.x - px, e.y - py) < e.r + 8) {
            this.hurtEnemy(e, b.dmg * 0.45 * dt * 4, 0, 0);
          }
        });
      }

      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0) { b.dead = true; continue; }

      // Asteroid hazard collision
      for (let hIdx = 0; hIdx < this.hazards.length && !b.dead; hIdx++) {
        const h = this.hazards[hIdx];
        if (h.kind !== 'asteroid' || h.dead) continue;
        if ((b.x - h.x) ** 2 + (b.y - h.y) ** 2 < (h.r + b.r) ** 2) {
          h.hp -= b.dmg;
          this.spawnParticle(b.x, b.y, '#00d5ff', 4, 150, 2.5, 0.25);
          if (b.pierce-- <= 0) b.dead = true;
          if (h.hp <= 0) {
            h.dead = true;
            this.spawnParticle(h.x, h.y, '#00d5ff', 22, 240, 4, 0.6);
            this.fx.push({ type: 'ring', x: h.x, y: h.y, r0: h.r * 0.5, r1: h.r * 2.1, life: 0.35, max: 0.35, col: '#00d5ff' });
            for (let g = 0; g < 3; g++) this.dropGem(h.x + (Math.random() * 26 - 13), h.y + (Math.random() * 26 - 13), 3);
            const gotCr = window.SaveSystem.addCredits(5);
            window.GameState.creditsEarned += gotCr;
            if (gotCr) this.addText(h.x, h.y, `+${gotCr} 💎`, '#00ffcc', false);
            if (window.SoundSystem) window.SoundSystem.sfx('boom');
          }
        }
      }
      if (b.dead) continue;

      this.grid.query(b.x, b.y, b.r, e => {
        if (b.dead || e.dead || b.hit.has(e)) return;
        // Shielder block check
        if (e.type === 'shielder') {
          const toBx = b.x - e.x, toBy = b.y - e.y;
          const facingX = Math.cos(e.rot), facingY = Math.sin(e.rot);
          if (toBx * facingX + toBy * facingY > 0) {
            // Frontal shield block!
            b.dead = true;
            this.spawnParticle(b.x, b.y, '#00e5ff', 8, 160, 2, 0.25);
            if (window.SoundSystem) window.SoundSystem.sfx('shield_break');
            return;
          }
        }

        const d2 = (e.x - b.x) ** 2 + (e.y - b.y) ** 2;
        if (d2 < (e.r + b.r) ** 2) {
          b.hit.add(e);
          if (b.isCryo) {
            e.frozen = Math.max(e.frozen || 0, b.isEvoCryo ? 4.0 : 2.5);
          }
          if (b.isHellstorm) {
            for (let s = 0; s < 3; s++) {
              const sa = Math.random() * Math.PI * 2;
              this.spawnParticle(e.x, e.y, '#ff8a3d', 3, 240, 2.5, 0.25);
              this.bullets.push({
                x: e.x, y: e.y, vx: Math.cos(sa) * 420, vy: Math.sin(sa) * 420,
                r: 3, dmg: b.dmg * 0.35, pierce: 0, life: 0.22, hit: new Set([e])
              });
            }
          }
          this.hurtEnemy(e, b.dmg, b.vx * 0.25, b.vy * 0.25);
          this.spawnParticle(b.x, b.y, b.col || '#3dfcff', 4, 150, 2, 0.2);
          if (b.pierce-- <= 0) b.dead = true;
        }
      });
    }

    // 4. Update Enemy Bullets
    for (let i = 0; i < this.ebullets.length; i++) {
      const b = this.ebullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0) { b.dead = true; continue; }

      const d2 = (b.x - P.x) ** 2 + (b.y - P.y) ** 2;
      if (d2 < (b.r + P.r - 2) ** 2) {
        b.dead = true;
        window.GameState.damagePlayer(b.dmg);
      }
    }

    // 5. Update Missiles (Homing)
    for (let i = 0; i < this.missiles.length; i++) {
      const m = this.missiles[i];
      m.life -= dt;
      if (!m.tg || m.tg.dead) m.tg = this.grid.nearest(m.x, m.y, 650);
      let ang = Math.atan2(m.vy, m.vx);
      if (m.tg) {
        const ta = Math.atan2(m.tg.y - m.y, m.tg.x - m.x);
        const da = ((ta - ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        ang += Math.max(-8 * dt, Math.min(8 * dt, da));
      }
      m.spd = Math.min(m.spd + 850 * dt, 640);
      m.vx = Math.cos(ang) * m.spd;
      m.vy = Math.sin(ang) * m.spd;
      m.x += m.vx * dt;
      m.y += m.vy * dt;

      this.spawnParticle(m.x, m.y, '#ff8a3d', 1, 30, 3, 0.3);

      let explode = false;
      this.grid.query(m.x, m.y, 8, e => {
        if (!explode && !e.dead && (e.x - m.x) ** 2 + (e.y - m.y) ** 2 < (e.r + 8) ** 2) {
          explode = true;
        }
      });
      if (explode || m.life <= 0) {
        this.explodeMissile(m);
      }
    }

    // 6. Update Saws (Bouncing Plasma Saws)
    for (let i = 0; i < this.saws.length; i++) {
      const s = this.saws[i];
      s.life -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.rot += dt * 14;

      // Bounce at arena bounds if active
      if (Math.abs(s.x - P.x) > 900) s.vx *= -1;
      if (Math.abs(s.y - P.y) > 600) s.vy *= -1;

      this.grid.query(s.x, s.y, s.r, e => {
        if (e.dead) return;
        if ((e.x - s.x) ** 2 + (e.y - s.y) ** 2 < (e.r + s.r) ** 2) {
          this.hurtEnemy(e, s.dmg * dt, (e.x - s.x) * 3, (e.y - s.y) * 3);
          this.spawnParticle(s.x, s.y, '#ff0055', 2, 120, 2, 0.2);
        }
      });
    }

    // 7. Update Mines
    for (let i = 0; i < this.mines.length; i++) {
      const m = this.mines[i];
      m.life -= dt;
      m.pulse = (m.pulse || 0) + dt * 6;
      let triggered = false;
      this.grid.query(m.x, m.y, m.rad, e => {
        if (!triggered && !e.dead) triggered = true;
      });
      if (triggered || m.life <= 0) {
        m.dead = true;
        this.explodeMine(m);
      }
    }

    // 8. Update Vortices (Black holes)
    for (let i = 0; i < this.vortices.length; i++) {
      const v = this.vortices[i];
      v.life -= dt;
      v.rot += dt * 4;
      this.grid.query(v.x, v.y, v.rad, e => {
        if (e.dead) return;
        const dx = v.x - e.x, dy = v.y - e.y, d = Math.hypot(dx, dy) || 1;
        e.kx += (dx / d) * 350 * dt;
        e.ky += (dy / d) * 350 * dt;
        this.hurtEnemy(e, v.dmg * dt, 0, 0);
      });
      // Sucks gems too
      for (const g of this.gems) {
        const d = Math.hypot(v.x - g.x, v.y - g.y);
        if (d < v.rad) { g.pull = true; g.x += (v.x - g.x) * 0.08; g.y += (v.y - g.y) * 0.08; }
      }
    }

    // 9. Update Gems
    for (let i = 0; i < this.gems.length; i++) {
      const g = this.gems[i];
      const dx = P.x - g.x, dy = P.y - g.y, d = Math.hypot(dx, dy) || 1;
      if (g.pull || d < P.magnet) {
        g.pull = true;
        g.v = Math.min(g.v + 1800 * dt, 1200);
        g.x += (dx / d) * g.v * dt;
        g.y += (dy / d) * g.v * dt;
      }
      if (d < P.r + 12) {
        g.dead = true;
        window.GameState.gainXp(g.val);
        if (window.SoundSystem) window.SoundSystem.sfx('gem');
      }
    }

    // 10. Update Powerups
    for (let i = 0; i < this.powerups.length; i++) {
      const pu = this.powerups[i];
      pu.b += dt * 3;
      const dx = P.x - pu.x, dy = P.y - pu.y, d = Math.hypot(dx, dy) || 1;
      if (d < P.magnet * 0.7) {
        pu.x += (dx / d) * 340 * dt;
        pu.y += (dy / d) * 340 * dt;
      }
      if (d < P.r + 16) {
        pu.dead = true;
        this.collectPowerup(pu);
      }
    }

    // 11. Particles, Texts & FX
    for (const p of this.particles) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 0.94; p.vy *= 0.94;
      p.life -= dt;
    }
    for (const t of this.texts) {
      t.y -= 45 * dt;
      t.life -= dt;
    }
    for (const f of this.fx) {
      f.life -= dt;
      if (f.life <= 0 && f.type === 'mortar_target') {
        this.fx.push({ type: 'ring', x: f.x, y: f.y, r0: 8, r1: f.r, life: 0.35, max: 0.35, col: '#ffaa00' });
        this.spawnParticle(f.x, f.y, '#ff5500', 18, 220, 4, 0.45);
        if (window.SoundSystem) window.SoundSystem.sfx('boom');
        if (Math.hypot(P.x - f.x, P.y - f.y) < f.r + P.r) {
          window.GameState.damagePlayer(f.dmg || 22);
        }
      }
    }

    // 12. Cleanup dead entities
    this.enemies = this.enemies.filter(e => !e.dead);
    this.bullets = this.bullets.filter(b => !b.dead);
    this.ebullets = this.ebullets.filter(b => !b.dead);
    this.missiles = this.missiles.filter(m => !m.dead);
    this.saws = this.saws.filter(s => s.life > 0);
    this.mines = this.mines.filter(m => !m.dead);
    this.vortices = this.vortices.filter(v => v.life > 0);
    this.gems = this.gems.filter(g => !g.dead);
    this.powerups = this.powerups.filter(p => !p.dead);
    this.particles = this.particles.filter(p => p.life > 0);
    this.texts = this.texts.filter(t => t.life > 0);
    this.fx = this.fx.filter(f => f.life > 0);
    this.hazards = this.hazards.filter(h => !h.dead);
    this.turrets = this.turrets.filter(t => t.life > 0);
    this.drones = this.drones.filter(d => d.life > 0);
    this.portals = this.portals.filter(p => !p.dead);
  }

  updateTurrets(dt, P) {
    for (const t of this.turrets) {
      t.life -= dt;
      t.cd -= dt;
      const tg = this.grid.nearest(t.x, t.y, 460);
      if (tg) {
        t.angle = Math.atan2(tg.y - t.y, tg.x - t.x);
        if (t.cd <= 0) {
          t.cd = t.maxCd;
          this.bullets.push({
            x: t.x + Math.cos(t.angle) * 14,
            y: t.y + Math.sin(t.angle) * 14,
            vx: Math.cos(t.angle) * 720,
            vy: Math.sin(t.angle) * 720,
            r: 5,
            dmg: 24 * P.dmgMul,
            pierce: 2,
            life: 1.1,
            col: '#00ffaa',
            hit: new Set()
          });
          if (window.SoundSystem) window.SoundSystem.sfx('shoot');
        }
      } else {
        t.angle += dt * 1.2;
      }
    }
  }

  updateHazards(dt, P) {
    const mapKey = window.GameState ? window.GameState.selectedMap : 'void';
    const mapDef = window.GAME_DATA.MAPS[mapKey];
    const hType = mapDef ? mapDef.hazard : 'none';
    if (!hType || hType === 'none') return;

    // Cull hazards far away from player
    for (const h of this.hazards) {
      if (Math.hypot(h.x - P.x, h.y - P.y) > 1500) h.dead = true;
    }

    // Maintain up to 7 active hazards around the player
    this.hazardSpawnTimer -= dt;
    if (this.hazards.length < 7 && this.hazardSpawnTimer <= 0) {
      this.hazardSpawnTimer = this.hazards.length < 4 ? 0.25 : 2.5;
      const ang = Math.random() * Math.PI * 2;
      const dist = 360 + Math.random() * 520;
      const hx = P.x + Math.cos(ang) * dist;
      const hy = P.y + Math.sin(ang) * dist;

      if (hType === 'asteroids') {
        const r = 28 + Math.random() * 18;
        const verts = [];
        for (let i = 0; i < 8; i++) verts.push(0.72 + Math.random() * 0.42);
        this.hazards.push({ kind: 'asteroid', x: hx, y: hy, r, hp: 90, maxHp: 90, rot: Math.random() * 6, vrot: (Math.random() - 0.5) * 0.6, verts, dead: false });
      } else if (hType === 'plasma_vents') {
        this.hazards.push({ kind: 'plasma_vent', x: hx, y: hy, r: 65, timer: 1.5 + Math.random() * 2.5, state: 'idle', dmgCd: 0, dead: false });
      } else if (hType === 'vortices') {
        this.hazards.push({ kind: 'vortex', x: hx, y: hy, r: 110, rot: 0, dead: false });
      } else if (hType === 'data_streams') {
        const horizontal = Math.random() < 0.5;
        this.hazards.push({ kind: 'data_stream', x: hx, y: hy, w: horizontal ? 240 : 60, h: horizontal ? 60 : 240, horizontal, dir: Math.random() < 0.5 ? 1 : -1, phase: 0, dead: false });
      } else if (hType === 'glitch_warps') {
        this.hazards.push({ kind: 'glitch_warp', x: hx, y: hy, r: 52, cd: 0, pulse: Math.random() * 6, dead: false });
      }
    }

    // Update each hazard
    for (const h of this.hazards) {
      if (h.dead) continue;
      if (h.kind === 'asteroid') {
        h.rot += h.vrot * dt;
        const dx = P.x - h.x, dy = P.y - h.y, d = Math.hypot(dx, dy) || 1;
        if (d < h.r + P.r) {
          const push = (h.r + P.r - d);
          P.x += (dx / d) * push;
          P.y += (dy / d) * push;
        }
      } else if (h.kind === 'plasma_vent') {
        h.timer -= dt;
        if (h.dmgCd > 0) h.dmgCd -= dt;
        if (h.state === 'idle' && h.timer <= 0) {
          h.state = 'warning';
          h.timer = 1.8;
        } else if (h.state === 'warning' && h.timer <= 0) {
          h.state = 'erupting';
          h.timer = 1.1;
          this.fx.push({ type: 'ring', x: h.x, y: h.y, r0: 10, r1: h.r * 1.15, life: 0.4, max: 0.4, col: '#ff5500' });
          this.spawnParticle(h.x, h.y, '#ff5500', 18, 220, 4, 0.5);
          if (window.SoundSystem) window.SoundSystem.sfx('fire');
        } else if (h.state === 'erupting') {
          if (Math.random() < 0.5) this.spawnParticle(h.x, h.y, '#ff9100', 1, 140, 3.5, 0.3);
          this.grid.query(h.x, h.y, h.r, e => {
            if (!e.dead && Math.hypot(e.x - h.x, e.y - h.y) < h.r + e.r) {
              this.hurtEnemy(e, 45 * dt, 0, 0);
            }
          });
          if (h.dmgCd <= 0 && Math.hypot(P.x - h.x, P.y - h.y) < h.r) {
            h.dmgCd = 0.45;
            window.GameState.damagePlayer(12);
          }
          if (h.timer <= 0) {
            h.state = 'idle';
            h.timer = 3.2;
          }
        }
      } else if (h.kind === 'vortex') {
        h.rot += dt * 2.5;
        const pdx = h.x - P.x, pdy = h.y - P.y, pd = Math.hypot(pdx, pdy) || 1;
        if (pd < h.r * 1.4 && pd > 16) {
          const pull = (1 - pd / (h.r * 1.4)) * 75 * dt;
          P.x += (pdx / pd) * pull;
          P.y += (pdy / pd) * pull;
        }
        this.grid.query(h.x, h.y, h.r * 1.3, e => {
          if (e.dead || e.isBoss) return;
          const edx = h.x - e.x, edy = h.y - e.y, ed = Math.hypot(edx, edy) || 1;
          if (ed > 12) {
            e.kx += (edx / ed) * 190 * dt;
            e.ky += (edy / ed) * 190 * dt;
          }
        });
      } else if (h.kind === 'data_stream') {
        h.phase += dt * 4;
        const inside = Math.abs(P.x - h.x) < h.w / 2 && Math.abs(P.y - h.y) < h.h / 2;
        if (inside) {
          P.speedModifier = Math.max(P.speedModifier || 1, 1.45);
        }
        for (const b of this.bullets) {
          if (!b.streamBoosted && Math.abs(b.x - h.x) < h.w / 2 && Math.abs(b.y - h.y) < h.h / 2) {
            b.streamBoosted = true;
            b.vx *= 1.35;
            b.vy *= 1.35;
          }
        }
      } else if (h.kind === 'glitch_warp') {
        h.pulse += dt * 5;
        if (h.cd > 0) h.cd -= dt;
        if (h.cd <= 0 && Math.hypot(P.x - h.x, P.y - h.y) < h.r + P.r) {
          h.cd = 3.5;
          const ang = Math.random() * Math.PI * 2;
          this.spawnParticle(P.x, P.y, '#ff0055', 16, 220, 3.5, 0.4);
          P.x += Math.cos(ang) * 190;
          P.y += Math.sin(ang) * 190;
          P.inv = Math.max(P.inv, 0.4);
          this.spawnParticle(P.x, P.y, '#3dfcff', 16, 220, 3.5, 0.4);
          this.fx.push({ type: 'ring', x: P.x, y: P.y, r0: 15, r1: 180, life: 0.35, max: 0.35, col: '#ff0055' });
          this.grid.query(P.x, P.y, 180, e => {
            if (!e.dead) this.hurtEnemy(e, 45 * P.dmgMul, (e.x - P.x) * 3, (e.y - P.y) * 3);
          });
          if (window.SoundSystem) window.SoundSystem.sfx('zap');
        }
      }
    }
  }

  updateEnemyAI(e, dt, P) {
    e.flash -= dt;
    if (e.oc > 0) e.oc -= dt;
    if (e.stunned > 0) {
      e.stunned -= dt;
      const dampS = Math.max(0, 1 - dt * 7);
      e.kx *= dampS;
      e.ky *= dampS;
      e.x += e.kx * dt;
      e.y += e.ky * dt;
      return;
    }

    let freezeSlow = 1;
    if (e.frozen > 0) {
      e.frozen -= dt;
      freezeSlow = (window.GameState.weapons.cryo && window.GameState.weapons.cryo.evolved) ? 0.25 : 0.35;
    }

    const dx = P.x - e.x, dy = P.y - e.y, d = Math.hypot(dx, dy) || 1;
    let mvx = dx / d, mvy = dy / d;
    let currentSpd = e.spd * freezeSlow;

    // Boss special AI + distance catch-up speed
    if (e.isBoss) {
      if (d > 720) {
        e.isSurging = true;
        const playerSpd = (P && P.speed) ? P.speed : 200;
        const minCatchupSpd = Math.max(currentSpd * 3.2, playerSpd * 1.45 + (d - 720) * 0.65);
        currentSpd = Math.min(1300, Math.max(currentSpd, minCatchupSpd));
        if (Math.random() < dt * 16) {
          this.spawnParticle(e.x, e.y, e.col || '#ff2d95', 1, 70, 4.5, 0.3);
        }
      } else if (d > 420) {
        e.isSurging = false;
        const ramp = (d - 420) / 300;
        currentSpd *= (1 + ramp * 2.2);
      } else {
        e.isSurging = false;
      }
      this.updateBossAI(e, dt, P, mvx, mvy, d);
    } else {
      // 12 Advanced Enemy Archetypes:
      switch (e.type) {
        case 'shooter':
          if (d < 260) { mvx *= -0.6; mvy *= -0.6; }
          else if (d < 340) { mvx *= 0.1; mvy *= 0.1; }
          e.st -= dt;
          if (e.st <= 0 && d < 550) {
            e.st = 2.4;
            this.ebullets.push({ x: e.x, y: e.y, vx: mvx * 260, vy: mvy * 260, r: 6, dmg: e.dmg, life: 4 });
            if (window.SoundSystem) window.SoundSystem.sfx('shoot');
          }
          break;

        case 'dasher':
          e.st -= dt;
          if (e.st <= 0.6) {
            e.telegraph = e.st;
            currentSpd = 10; // Pause before burst
          }
          if (e.st <= 0) {
            e.st = 3.0;
            e.kx = mvx * 480;
            e.ky = mvy * 480;
            this.spawnParticle(e.x, e.y, '#ff0055', 8, 180, 3, 0.4);
            if (window.SoundSystem) window.SoundSystem.sfx('dash');
          }
          break;

        case 'shielder':
          e.rot = Math.atan2(dy, dx);
          break;

        case 'teleporter':
          e.st -= dt;
          if (e.st <= 0) {
            e.st = 3.5;
            this.spawnParticle(e.x, e.y, '#d500f9', 16, 200, 3, 0.4);
            const a = Math.random() * Math.PI * 2;
            e.x = P.x + Math.cos(a) * 220;
            e.y = P.y + Math.sin(a) * 220;
            this.spawnParticle(e.x, e.y, '#d500f9', 16, 200, 3, 0.4);
            if (window.SoundSystem) window.SoundSystem.sfx('zap');
          }
          break;

        case 'summoner':
          if (d < 380) { mvx *= -0.8; mvy *= -0.8; }
          e.st -= dt;
          if (e.st <= 0 && this.enemies.length < 240) {
            e.st = 4.0;
            const r = this.createEnemy('runner', e.x, e.y);
            this.enemies.push(r);
            this.spawnParticle(e.x, e.y, '#ff6d00', 8, 140, 3, 0.3);
          }
          break;

        case 'sniper':
          if (d < 350) { mvx *= -0.5; mvy *= -0.5; }
          e.st -= dt;
          if (e.st <= 0.8) e.telegraph = e.st;
          if (e.st <= 0 && d < 700) {
            e.st = 3.8;
            this.ebullets.push({ x: e.x, y: e.y, vx: mvx * 680, vy: mvy * 680, r: 5, dmg: e.dmg, life: 2.5 });
            if (window.SoundSystem) window.SoundSystem.sfx('laser');
          }
          break;

        case 'mortar':
          if (d < 320) { mvx *= -0.6; mvy *= -0.6; }
          e.st -= dt;
          if (e.st <= 0 && d < 650) {
            e.st = 4.2;
            const tx = P.x + (Math.random() * 80 - 40);
            const ty = P.y + (Math.random() * 80 - 40);
            this.fx.push({ type: 'mortar_target', x: tx, y: ty, r: 60, life: 1.5, max: 1.5, dmg: e.dmg });
            if (window.SoundSystem) window.SoundSystem.sfx('missile');
          }
          break;

        case 'orbiter':
          const orbAng = Math.atan2(dy, dx) + Math.PI / 2;
          mvx = Math.cos(orbAng) * 0.8 + (dx / d) * 0.2;
          mvy = Math.sin(orbAng) * 0.8 + (dy / d) * 0.2;
          break;

        case 'phantom':
          e.alpha = d < 200 ? 1 : 0.18;
          break;

        case 'leech':
          if (d < 300) {
            // Drain beam
            window.GameState.damagePlayer(e.dmg * dt * 0.4);
            P.speedModifier = 0.75;
          }
          break;

        case 'kamikaze':
          if (d < 140) {
            e.telegraph = 1;
            e.st -= dt;
            if (e.st <= 0) {
              e.dead = true;
              this.explodeKamikaze(e);
            }
          }
          break;

        case 'repulsor':
          if (d < 180) { mvx *= -0.7; mvy *= -0.7; }
          else if (d < 250) { mvx *= 0.2; mvy *= 0.2; }
          e.pulse = (e.pulse || 0) + dt * 4;
          // Deflect nearby player bullets outward
          for (let bi = 0; bi < this.bullets.length; bi++) {
            const b = this.bullets[bi];
            if (b.dead || b.isBoomerang) continue;
            const bdx = b.x - e.x, bdy = b.y - e.y;
            const bd2 = bdx * bdx + bdy * bdy;
            if (bd2 < 115 * 115 && bd2 > 1) {
              const bd = Math.sqrt(bd2);
              b.vx += (bdx / bd) * 900 * dt;
              b.vy += (bdy / bd) * 900 * dt;
            }
          }
          // Shove nearby allies forward
          this.grid.query(e.x, e.y, 130, o => {
            if (o !== e && !o.dead && !o.isBoss) {
              o.kx += mvx * 70 * dt;
              o.ky += mvy * 70 * dt;
            }
          });
          break;
      }
    }

    // Soft crowd separation
    let sx = 0, sy = 0;
    this.grid.query(e.x, e.y, e.r, o => {
      if (o === e || o.dead) return;
      const ox = e.x - o.x, oy = e.y - o.y, dd = ox * ox + oy * oy;
      const mm = e.r + o.r + 6;
      if (dd < mm * mm && dd > 0.01) {
        const q = Math.sqrt(dd);
        const force = o.isBoss ? 7.5 : (e.isBoss ? 0.3 : 2.2);
        const f = ((mm - q) / mm) * force;
        sx += (ox / q) * f;
        sy += (oy / q) * f;
      }
    });

    // Knockback decay
    const damp = Math.max(0, 1 - dt * 7);
    e.kx *= damp;
    e.ky *= damp;

    e.x += (mvx * currentSpd + sx * 180 + e.kx) * dt;
    e.y += (mvy * currentSpd + sy * 180 + e.ky) * dt;

    if (e.shape === 'tri') e.rot = Math.atan2(dy, dx);
    else e.rot += dt * 1.5;

    // Contact damage to player
    if (d < e.r + P.r - 2) {
      window.GameState.damagePlayer(e.dmg);
    }
  }

  updateBossAI(b, dt, P, nx, ny, d) {
    b.st -= dt;
    const isEnraged = b.hp < b.maxHp * 0.4;
    const cooldown = isEnraged ? 1.4 : 2.2;

    if (b.st <= 0) {
      b.st = cooldown;
      b.pat = (b.pat + 1) % 4;

      switch (b.id) {
        case 'scorpio':
          if (b.pat === 0) {
            // Nova blast
            const n = isEnraged ? 28 : 20;
            for (let i = 0; i < n; i++) {
              const a = (i / n) * Math.PI * 2;
              this.ebullets.push({ x: b.x, y: b.y, vx: Math.cos(a) * 230, vy: Math.sin(a) * 230, r: 7, dmg: b.dmg * 0.6, life: 5 });
            }
            if (window.SoundSystem) window.SoundSystem.sfx('nova');
          } else if (b.pat === 1) {
            // Stinger laser spread
            for (let i = -2; i <= 2; i++) {
              const a = Math.atan2(ny, nx) + i * 0.16;
              this.ebullets.push({ x: b.x, y: b.y, vx: Math.cos(a) * 340, vy: Math.sin(a) * 340, r: 8, dmg: b.dmg * 0.7, life: 4 });
            }
            if (window.SoundSystem) window.SoundSystem.sfx('laser');
          } else {
            // Dash charge
            b.kx = nx * 500;
            b.ky = ny * 500;
          }
          break;

        case 'leviathan':
          // Giant spiral bullet spray
          for (let i = 0; i < 16; i++) {
            const a = (i / 16) * Math.PI * 2 + window.GameState.time * 2;
            this.ebullets.push({ x: b.x, y: b.y, vx: Math.cos(a) * 210, vy: Math.sin(a) * 210, r: 7, dmg: b.dmg * 0.6, life: 5 });
          }
          break;

        case 'titan':
          // Laser ring & missile barrage
          for (let i = 0; i < 4; i++) {
            const a = Math.random() * Math.PI * 2;
            this.ebullets.push({ x: b.x, y: b.y, vx: Math.cos(a) * 280, vy: Math.sin(a) * 280, r: 9, dmg: b.dmg * 0.8, life: 4.5 });
          }
          this.fx.push({ type: 'ring', x: b.x, y: b.y, r0: 20, r1: 300, life: 0.6, max: 0.6, col: b.col });
          break;

        case 'vortex_eye':
          // Gravity pull + bullet rings
          if (d > 60) {
            P.x += -nx * 32;
            P.y += -ny * 32;
          }
          const vrCount = isEnraged ? 18 : 12;
          for (let i = 0; i < vrCount; i++) {
            const a = (i / vrCount) * Math.PI * 2 + b.pat * 0.3;
            this.ebullets.push({ x: b.x, y: b.y, vx: Math.cos(a) * 195, vy: Math.sin(a) * 195, r: 7, dmg: b.dmg * 0.65, life: 4.5 });
          }
          this.fx.push({ type: 'ring', x: b.x, y: b.y, r0: 15, r1: 280, life: 0.6, max: 0.6, col: '#651fff' });
          break;

        case 'chronos':
          // Time warp shockwave + blink teleport + clockwork shots
          this.fx.push({ type: 'ring', x: b.x, y: b.y, r0: 10, r1: 450, life: 0.8, max: 0.8, col: '#ffd23f' });
          if (b.pat % 2 === 0) {
            const ba = Math.random() * Math.PI * 2;
            b.x = P.x + Math.cos(ba) * 280;
            b.y = P.y + Math.sin(ba) * 280;
            this.spawnParticle(b.x, b.y, '#ffd23f', 20, 220, 4, 0.5);
          }
          for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2;
            this.ebullets.push({ x: b.x, y: b.y, vx: Math.cos(a) * 240, vy: Math.sin(a) * 240, r: 7, dmg: b.dmg * 0.7, life: 4 });
          }
          if (window.SoundSystem) window.SoundSystem.sfx('zap');
          break;

        case 'arch_sentinel':
          // 4-Phase Grand Finale
          const count = isEnraged ? 36 : 24;
          for (let i = 0; i < count; i++) {
            const a = (i / count) * Math.PI * 2;
            this.ebullets.push({ x: b.x, y: b.y, vx: Math.cos(a) * 250, vy: Math.sin(a) * 250, r: 8, dmg: b.dmg * 0.7, life: 5 });
          }
          if (window.SoundSystem) window.SoundSystem.sfx('overload');
          break;
      }
    }
  }

  explodeMissile(m) {
    m.dead = true;
    this.grid.query(m.x, m.y, m.rad, e => {
      if (e.dead) return;
      const dx = e.x - m.x, dy = e.y - m.y, d = Math.hypot(dx, dy) || 1;
      if (d < m.rad + e.r) {
        this.hurtEnemy(e, m.dmg, (dx / d) * 260, (dy / d) * 260);
      }
    });
    if (m.isCluster) {
      for (let c = 0; c < 4; c++) {
        const ca = Math.random() * Math.PI * 2;
        const cspd = 180 + Math.random() * 140;
        this.bullets.push({
          x: m.x, y: m.y,
          vx: Math.cos(ca) * cspd,
          vy: Math.sin(ca) * cspd,
          r: 5,
          dmg: m.dmg * 0.45,
          pierce: 1,
          life: 0.4,
          col: '#ffaa00',
          hit: new Set()
        });
      }
    }
    this.fx.push({ type: 'ring', x: m.x, y: m.y, r0: 10, r1: m.rad, life: 0.35, max: 0.35, col: '#ff8a3d' });
    this.spawnParticle(m.x, m.y, '#ff8a3d', 20, 260, 4, 0.45);
    this.spawnParticle(m.x, m.y, '#ffd23f', 10, 160, 3, 0.3);
    window.GameState.shake = Math.max(window.GameState.shake, 6);
    if (window.SoundSystem) window.SoundSystem.sfx('boom');
  }

  explodeMine(m) {
    this.grid.query(m.x, m.y, m.rad, e => {
      if (e.dead) return;
      this.hurtEnemy(e, m.dmg, (e.x - m.x) * 2, (e.y - m.y) * 2);
    });
    this.fx.push({ type: 'ring', x: m.x, y: m.y, r0: 15, r1: m.rad, life: 0.45, max: 0.45, col: '#ff3d00' });
    this.spawnParticle(m.x, m.y, '#ff3d00', 30, 300, 4, 0.6);
    if (window.SoundSystem) window.SoundSystem.sfx('boom');
  }

  explodeKamikaze(e) {
    const P = window.GameState.player;
    const d = Math.hypot(P.x - e.x, P.y - e.y);
    if (d < 160) {
      window.GameState.damagePlayer(e.dmg * 1.5);
    }
    this.fx.push({ type: 'ring', x: e.x, y: e.y, r0: 10, r1: 180, life: 0.4, max: 0.4, col: '#ff3d00' });
    this.spawnParticle(e.x, e.y, '#ff3d00', 35, 350, 4, 0.6);
    if (window.SoundSystem) window.SoundSystem.sfx('boom');
  }

  collectPowerup(pu) {
    const P = window.GameState.player;
    if (window.SoundSystem) window.SoundSystem.sfx('pickup');
    if (window.SaveSystem && window.SaveSystem.data.stats && (!window.GameState || window.GameState.selectedMode !== 'sandbox')) {
      window.SaveSystem.data.stats.powerupsCollected = (window.SaveSystem.data.stats.powerupsCollected || 0) + 1;
    }

    switch (pu.type) {
      case 'heart':
        P.hp = Math.min(P.maxHp, P.hp + 40);
        this.addText(P.x, P.y - 20, '+40 HP', '#5dff6a', true);
        break;
      case 'super_heart':
        P.hp = P.maxHp;
        P.shieldHits = (P.shieldHits || 0) + 2;
        this.addText(P.x, P.y - 20, 'FULL HP + SHIELD', '#ff0077', true);
        break;
      case 'magnet':
        for (const g of this.gems) g.pull = true;
        this.addText(P.x, P.y - 20, 'GIGA MAGNET!', '#3dfcff', true);
        break;
      case 'nuke':
        for (const e of this.enemies) {
          if (!e.isBoss) this.killEnemy(e);
        }
        this.fx.push({ type: 'ring', x: P.x, y: P.y, r0: 10, r1: 900, life: 0.8, max: 0.8, col: '#ffffff' });
        window.GameState.shake = 35;
        if (window.SoundSystem) window.SoundSystem.sfx('nuke');
        this.addText(P.x, P.y - 20, '☢ NEON NUKE!', '#ffff00', true);
        window.SaveSystem.unlockAchievement('nuke_used');
        break;
      case 'freeze':
        for (const e of this.enemies) {
          e.frozen = Math.max(e.frozen || 0, 6.0);
        }
        if (window.SoundSystem) window.SoundSystem.sfx('freeze');
        this.addText(P.x, P.y - 20, '❄ CRYO STASIS!', '#00e5ff', true);
        window.SaveSystem.unlockAchievement('freeze_used');
        break;
      case 'shield':
        P.shieldHits = 3;
        if (window.SoundSystem) window.SoundSystem.sfx('shield');
        this.addText(P.x, P.y - 20, '🛡 SHIELD (3)', '#76ff03', true);
        window.SaveSystem.unlockAchievement('shield_used');
        break;
      case 'overdrive':
        P.overdriveTimer = 10.0;
        this.addText(P.x, P.y - 20, '⚡ OVERDRIVE!', '#ffd23f', true);
        window.SaveSystem.unlockAchievement('overdrive_used');
        break;
      case 'credit_cache': {
        const got = window.SaveSystem.addCredits(50);
        window.GameState.creditsEarned += got;
        this.addText(P.x, P.y - 20, got ? `+${got} CREDITS` : 'CREDITS (TEST)', '#00ffcc', true);
        break;
      }
      case 'credit_vault': {
        const got = window.SaveSystem.addCredits(200);
        window.GameState.creditsEarned += got;
        this.addText(P.x, P.y - 20, got ? `👑 +${got} CREDITS!` : '👑 VAULT (TEST)', '#ffd700', true);
        window.SaveSystem.unlockAchievement('vault_found');
        break;
      }
      case 'xp_boost':
        P.xpMultiplierTimer = 15.0;
        this.addText(P.x, P.y - 20, '2x XP BOOST!', '#b44dff', true);
        break;
      case 'hyper_gem':
        window.GameState.gainXp(P.next);
        this.addText(P.x, P.y - 20, '★ LEVEL UP! ★', '#ff2d95', true);
        break;
      case 'overload_cell':
        if ((P.overloadCooldown || 0) > 0) P.overloadCooldown = Math.max(0, P.overloadCooldown - 8);
        P.overloadGauge = Math.min(100, (P.overloadGauge || 0) + 35);
        this.addText(P.x, P.y - 20, '+35% OVERLOAD', '#3dfcff', true);
        break;
      case 'double_damage':
        P.doubleDamageTimer = 12.0;
        this.addText(P.x, P.y - 20, '⚔ 2x DAMAGE!', '#ff0055', true);
        break;
      case 'turret':
        this.turrets.push({
          x: P.x, y: P.y,
          life: 20.0, maxLife: 20.0,
          cd: 0.1, maxCd: 0.35,
          r: 15, angle: P.face || 0
        });
        this.fx.push({ type: 'ring', x: P.x, y: P.y, r0: 12, r1: 90, life: 0.35, max: 0.35, col: '#00ffaa' });
        this.addText(P.x, P.y - 20, '🤖 SENTRY TURRET!', '#ff9100', true);
        break;
      case 'bomb': {
        const blastR = 400 * (P.aoeBonus || 1);
        this.grid.query(pu.x, pu.y, blastR, e => {
          if (e.dead) return;
          const dx = e.x - pu.x, dy = e.y - pu.y, d = Math.hypot(dx, dy) || 1;
          if (d < blastR + e.r) {
            this.hurtEnemy(e, 350 * P.dmgMul, (dx / d) * 450, (dy / d) * 450, true);
          }
        });
        this.fx.push({ type: 'ring', x: pu.x, y: pu.y, r0: 15, r1: blastR, life: 0.45, max: 0.45, col: '#ff1744' });
        this.fx.push({ type: 'ring', x: pu.x, y: pu.y, r0: 10, r1: blastR * 0.65, life: 0.35, max: 0.35, col: '#ffd23f' });
        this.spawnParticle(pu.x, pu.y, '#ff1744', 35, 340, 4.5, 0.65);
        window.GameState.shake = Math.max(window.GameState.shake, 16);
        if (window.SoundSystem) window.SoundSystem.sfx('nuke');
        this.addText(pu.x, pu.y - 20, '💣 PLASMA BLAST!', '#ff1744', true);
        break;
      }
      default:
        P.hp = Math.min(P.maxHp, P.hp + 25);
        break;
    }
  }

  // ==========================================
  // SEKUNDÄRFÄHIGKEITEN (8 EINZIGARTIGE SKILLS)
  // ==========================================
  triggerSecondary(type, P) {
    if (!type) return;
    const lang = (window.SaveSystem && window.SaveSystem.getSettings().lang) || 'de';

    switch (type) {
      case 'drones': {
        for (let i = 0; i < 3; i++) {
          const angle = (Math.PI * 2 / 3) * i;
          this.drones.push({
            x: P.x + Math.cos(angle) * 35,
            y: P.y + Math.sin(angle) * 35,
            angle,
            orbitDist: 48 + i * 8,
            orbitSpeed: 2.8 + i * 0.4,
            life: 7.0,
            shootCd: 0.15 + i * 0.1,
            col: '#3dfcff'
          });
        }
        this.addText(P.x, P.y - 32, lang === 'en' ? '🛸 DRONES DEPLOYED!' : '🛸 DROHNEN GESTARTET!', '#3dfcff', true);
        if (window.SoundSystem) window.SoundSystem.sfx('secondary_apex');
        break;
      }

      case 'warp': {
        const dir = Math.hypot(P.mx, P.my) > 0.1 ? Math.atan2(P.my, P.mx) : P.face;
        const warpDist = 320;
        const wx = P.x + Math.cos(dir) * warpDist;
        const wy = P.y + Math.sin(dir) * warpDist;

        for (let step = 0; step <= 8; step++) {
          const frac = step / 8;
          this.spawnParticle(P.x + (wx - P.x) * frac, P.y + (wy - P.y) * frac, '#ffd23f', 3, 70, 4, 0.4);
        }
        P.x = wx;
        P.y = wy;
        P.inv = Math.max(P.inv || 0, 0.6);

        this.fx.push({ type: 'ring', x: P.x, y: P.y, r0: 10, r1: 170, life: 0.35, max: 0.35, col: '#ffd23f' });
        this.grid.query(P.x, P.y, 170, e => {
          if (e.dead) return;
          const kx = (e.x - P.x) * 4;
          const ky = (e.y - P.y) * 4;
          this.hurtEnemy(e, 75 * P.dmgMul, kx, ky, true);
        });
        this.addText(P.x, P.y - 32, lang === 'en' ? '⚡ WARP THRUST!' : '⚡ WARP-SPRUNG!', '#ffd23f', true);
        if (window.SoundSystem) window.SoundSystem.sfx('secondary_valkyrie');
        break;
      }

      case 'barrier': {
        P.barrierActive = 4.5;
        this.fx.push({ type: 'ring', x: P.x, y: P.y, r0: 20, r1: 90, life: 0.4, max: 0.4, col: '#b44dff' });
        this.spawnParticle(P.x, P.y, '#b44dff', 24, 260, 5, 0.5);
        this.addText(P.x, P.y - 32, lang === 'en' ? '🛡️ AEGIS ACTIVE!' : '🛡️ AEGIS AKTIV!', '#b44dff', true);
        if (window.SoundSystem) window.SoundSystem.sfx('secondary_colossus');
        break;
      }

      case 'storm': {
        let lastTarget = P;
        const hitSet = new Set();
        let chainCount = 0;
        for (let step = 0; step < 10; step++) {
          const next = this.grid.nearest(lastTarget.x, lastTarget.y, 480, hitSet);
          if (!next) break;
          hitSet.add(next);
          this.fx.push({
            type: 'lightning',
            x0: lastTarget.x, y0: lastTarget.y,
            x1: next.x, y1: next.y,
            life: 0.3, max: 0.3,
            col: '#00e5ff'
          });
          next.frozen = Math.max(next.frozen || 0, 2.2);
          this.hurtEnemy(next, 70 * P.dmgMul, 0, 0, true);
          this.spawnParticle(next.x, next.y, '#00e5ff', 8, 180, 3, 0.3);
          lastTarget = next;
          chainCount++;
        }
        this.addText(P.x, P.y - 32, `🌩️ ${chainCount}x BLITZ-KETTE!`, '#00e5ff', true);
        if (window.SoundSystem) window.SoundSystem.sfx('secondary_tesla');
        break;
      }

      case 'cloak': {
        P.cloakActive = 3.5;
        P.inv = Math.max(P.inv || 0, 3.5);
        P.speedModifier = Math.max(P.speedModifier || 1, 1.6);
        this.spawnParticle(P.x, P.y, '#651fff', 30, 200, 5, 0.6);
        this.addText(P.x, P.y - 32, lang === 'en' ? '👻 PHASE CLOAK!' : '👻 PHASEN-TARNUNG!', '#651fff', true);
        if (window.SoundSystem) window.SoundSystem.sfx('secondary_specter');
        break;
      }

      case 'mortar': {
        const baseAng = Math.hypot(P.mx, P.my) > 0.1 ? Math.atan2(P.my, P.mx) : P.face;
        const spreads = [-0.35, -0.18, 0, 0.18, 0.35];
        for (const sp of spreads) {
          const a = baseAng + sp;
          this.missiles.push({
            x: P.x + Math.cos(a) * 16,
            y: P.y + Math.sin(a) * 16,
            vx: Math.cos(a) * 420,
            vy: Math.sin(a) * 420,
            spd: 420,
            rad: 130,
            dmg: 55 * P.dmgMul,
            life: 1.2,
            isCluster: true,
            col: '#ff3d00'
          });
        }
        this.addText(P.x, P.y - 32, lang === 'en' ? '💣 CLUSTER BARRAGE!' : '💣 CLUSTER-SPERRFEUER!', '#ff3d00', true);
        if (window.SoundSystem) window.SoundSystem.sfx('secondary_havoc');
        break;
      }

      case 'nova_burst': {
        this.fx.push({ type: 'ring', x: P.x, y: P.y, r0: 20, r1: 400, life: 0.45, max: 0.45, col: '#ff0077' });
        this.spawnParticle(P.x, P.y, '#ff0077', 36, 320, 6, 0.6);
        for (const eb of this.ebullets) {
          if (Math.hypot(eb.x - P.x, eb.y - P.y) < 450) {
            eb.dead = true;
            this.spawnParticle(eb.x, eb.y, '#ff0077', 4, 120, 2, 0.2);
          }
        }
        this.grid.query(P.x, P.y, 400, e => {
          if (e.dead) return;
          const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy) || 1;
          const force = (1 - d / 400) * 14;
          this.hurtEnemy(e, 90 * P.dmgMul, (dx / d) * force, (dy / d) * force, true);
        });
        P.overloadGauge = Math.min(100, (P.overloadGauge || 0) + 15);
        this.addText(P.x, P.y - 32, lang === 'en' ? '💥 FUSION PULSE (+15% OVERLOAD)!' : '💥 FUSIONS-SCHOCKWELLE (+15% OVERLOAD)!', '#ff0077', true);
        if (window.SoundSystem) window.SoundSystem.sfx('secondary_nova');
        break;
      }

      case 'stasis': {
        this.fx.push({ type: 'ring', x: P.x, y: P.y, r0: 40, r1: 680, life: 0.6, max: 0.6, col: '#ffffff' });
        this.spawnParticle(P.x, P.y, '#ffffff', 40, 360, 4, 0.7);
        for (const e of this.enemies) {
          if (!e.dead) {
            e.frozen = Math.max(e.frozen || 0, 3.5);
            this.spawnParticle(e.x, e.y, '#ffffff', 3, 80, 2, 0.3);
          }
        }
        for (const eb of this.ebullets) {
          eb.life += 3.5;
          eb.frozen = 3.5;
        }
        this.addText(P.x, P.y - 32, lang === 'en' ? '⏳ CHRONOSTASIS (3.5s)!' : '⏳ CHRONOSTASE (3.5s)!', '#ffffff', true);
        if (window.SoundSystem) window.SoundSystem.sfx('secondary_chronos');
        break;
      }
    }
  }

  updateActiveSkills(dt, P) {
    if (P.barrierActive > 0) {
      P.barrierActive -= dt;
      for (const eb of this.ebullets) {
        if (!eb.dead && Math.hypot(eb.x - P.x, eb.y - P.y) < 68) {
          eb.dead = true;
          this.spawnParticle(eb.x, eb.y, '#b44dff', 4, 140, 2.5, 0.2);
          if (window.SoundSystem) window.SoundSystem.sfx('shield_break');
        }
      }
      this.grid.query(P.x, P.y, 72, e => {
        if (e.dead) return;
        const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy) || 1;
        this.hurtEnemy(e, 85 * dt * P.dmgMul, (dx / d) * 14, (dy / d) * 14);
        this.spawnParticle(e.x, e.y, '#b44dff', 1, 100, 2, 0.15);
      });
      const a = Math.random() * Math.PI * 2;
      this.spawnParticle(P.x + Math.cos(a) * 48, P.y + Math.sin(a) * 48, '#b44dff', 1, 40, 3, 0.25);
    }

    if (P.cloakActive > 0) {
      P.cloakActive -= dt;
      if (Math.random() < 0.45) {
        this.particles.push({
          x: P.x, y: P.y,
          vx: (Math.random() - 0.5) * 30,
          vy: (Math.random() - 0.5) * 30,
          life: 0.8, max: 0.8,
          col: '#651fff',
          size: 7
        });
      }
      this.grid.query(P.x, P.y, 38, e => {
        if (e.dead) return;
        this.hurtEnemy(e, 40 * dt * P.dmgMul, 0, 0);
      });
    }
  }

  updateDrones(dt, P) {
    for (const d of this.drones) {
      d.life -= dt;
      d.angle += d.orbitSpeed * dt;
      const targetX = P.x + Math.cos(d.angle) * d.orbitDist;
      const targetY = P.y + Math.sin(d.angle) * d.orbitDist;
      d.x += (targetX - d.x) * 0.18;
      d.y += (targetY - d.y) * 0.18;

      d.shootCd -= dt;
      if (d.shootCd <= 0) {
        d.shootCd = 0.35;
        const tg = this.grid.nearest(d.x, d.y, 450);
        if (tg) {
          const ang = Math.atan2(tg.y - d.y, tg.x - d.x);
          this.bullets.push({
            x: d.x + Math.cos(ang) * 12,
            y: d.y + Math.sin(ang) * 12,
            vx: Math.cos(ang) * 850,
            vy: Math.sin(ang) * 850,
            r: 4,
            dmg: 24 * P.dmgMul,
            pierce: 1,
            life: 0.9,
            col: d.col,
            hit: new Set()
          });
          this.spawnParticle(d.x, d.y, d.col, 2, 80, 2, 0.2);
          if (window.SoundSystem) window.SoundSystem.sfx('shoot');
        }
      }
    }
  }

  // ==========================================
  // IN-RUN DIMENSIONS-PORTAL & EVENT-CHALLENGE
  // ==========================================
  spawnPortal(x, y) {
    this.portals.push({
      x, y,
      r: 45,
      pulse: 0,
      life: 80,
      dead: false
    });
    this.fx.push({ type: 'ring', x, y, r0: 10, r1: 180, life: 0.6, max: 0.6, col: '#ff00ff' });
    this.spawnParticle(x, y, '#ff00ff', 40, 280, 5, 0.8);
    const lang = (window.SaveSystem && window.SaveSystem.getSettings().lang) || 'de';
    if (window.GameState) {
      window.GameState.banner = {
        text: lang === 'en' ? '🌀 DIMENSION PORTAL NEARBY!' : '🌀 DIMENSIONS-PORTAL IN DER NÄHE!',
        t: 3.5,
        col: '#ff00ff'
      };
    }
    if (window.SoundSystem) window.SoundSystem.sfx('portal_open');
  }

  updatePortals(dt, P) {
    for (const port of this.portals) {
      port.pulse += dt * 3;
      port.life -= dt;
      if (port.life <= 0) { port.dead = true; continue; }

      if (Math.random() < 0.6) {
        const a = Math.random() * Math.PI * 2;
        const dist = 30 + Math.random() * 25;
        this.particles.push({
          x: port.x + Math.cos(a) * dist,
          y: port.y + Math.sin(a) * dist,
          vx: -Math.cos(a) * 45,
          vy: -Math.sin(a) * 45,
          life: 0.45, max: 0.45,
          col: Math.random() < 0.5 ? '#ff00ff' : '#00ffff',
          size: 3
        });
      }

      if (Math.hypot(P.x - port.x, P.y - port.y) < port.r + P.r) {
        port.dead = true;
        this.startPortalChallenge(port.x, port.y, P);
      }
    }
  }

  startPortalChallenge(x, y, P) {
    const lang = (window.SaveSystem && window.SaveSystem.getSettings().lang) || 'de';
    const cores = [];
    for (let i = 0; i < 12; i++) {
      const a = (Math.PI * 2 / 12) * i + (Math.random() - 0.5) * 0.3;
      const d = 110 + Math.random() * 110;
      cores.push({
        x: x + Math.cos(a) * d,
        y: y + Math.sin(a) * d,
        r: 14,
        pulse: Math.random() * 6,
        collected: false
      });
    }

    this.portalChallenge = {
      active: true,
      x, y,
      r: 250,
      timer: 25.0,
      maxTime: 25.0,
      cores,
      collected: 0,
      target: 10
    };

    if (window.GameState) {
      window.GameState.banner = {
        text: lang === 'en' ? '🌀 PORTAL CHALLENGE: COLLECT 10 CORES IN 25s!' : '🌀 PORTAL-HERAUSFORDERUNG: SAMMLE 10 KERNE IN 25s!',
        t: 4.0,
        col: '#00ffcc'
      };
    }
    if (window.SoundSystem) window.SoundSystem.sfx('portal_enter');
  }

  updatePortalChallenge(dt, P) {
    const pc = this.portalChallenge;
    if (!pc || !pc.active) return;

    pc.timer -= dt;

    for (const c of pc.cores) {
      if (c.collected) continue;
      c.pulse += dt * 4;
      if (Math.hypot(P.x - c.x, P.y - c.y) < P.r + c.r + 10) {
        c.collected = true;
        pc.collected++;
        this.spawnParticle(c.x, c.y, '#00ffcc', 16, 200, 4, 0.45);
        this.addText(c.x, c.y, `+1 KERN (${pc.collected}/${pc.target})`, '#00ffcc', true);
        if (window.SoundSystem) window.SoundSystem.sfx('minigame_hit');

        if (pc.collected >= pc.target) {
          this.completePortalChallenge(true);
          return;
        }
      }
    }

    if (pc.timer <= 0) {
      this.completePortalChallenge(false);
    }
  }

  completePortalChallenge(success) {
    const pc = this.portalChallenge;
    const lang = (window.SaveSystem && window.SaveSystem.getSettings().lang) || 'de';
    if (!pc) return;
    pc.active = false;

    if (success) {
      const bonusCr = window.SaveSystem ? window.SaveSystem.addCredits(350) : 350;
      if (window.GameState) {
        window.GameState.creditsEarned = (window.GameState.creditsEarned || 0) + bonusCr;
        window.GameState.banner = {
          text: lang === 'en' ? '🎉 PORTAL MASTERED! +350 CREDITS & REPAIR!' : '🎉 PORTAL GEMEISTERT! +350 CREDITS & REPARATUR!',
          t: 4.5,
          col: '#ffd23f'
        };
        const P = window.GameState.player;
        if (P) {
          P.hp = P.maxHp;
          P.overloadGauge = 100;
        }
      }
      if (window.SaveSystem && window.SaveSystem.data && window.SaveSystem.data.stats) {
        window.SaveSystem.data.stats.portalsMastered = (window.SaveSystem.data.stats.portalsMastered || 0) + 1;
        window.SaveSystem.save();
      }
      this.fx.push({ type: 'ring', x: pc.x, y: pc.y, r0: 20, r1: 350, life: 0.5, max: 0.5, col: '#ffd23f' });
      this.spawnParticle(pc.x, pc.y, '#ffd23f', 50, 350, 6, 0.75);
      if (window.SoundSystem) window.SoundSystem.sfx('portal_win');
    } else {
      if (window.GameState) {
        window.GameState.banner = {
          text: lang === 'en' ? '❌ PORTAL CHALLENGE FAILED!' : '❌ PORTAL-HERAUSFORDERUNG VERFEHLT!',
          t: 3.0,
          col: '#ff3366'
        };
      }
    }
    this.portalChallenge = null;
  }

  // ==========================================
  // MINIGAME-MODUS (DIMENSIONS-RALLYE)
  // ==========================================
  spawnMinigameCore(x, y) {
    this.minigameCoresList.push({
      x, y,
      r: 16,
      pulse: Math.random() * 6,
      life: 35.0,
      dead: false
    });
    this.spawnParticle(x, y, '#00ffcc', 14, 180, 3.5, 0.45);
    this.fx.push({ type: 'ring', x, y, r0: 6, r1: 65, life: 0.3, max: 0.3, col: '#00ffcc' });
  }

  updateMinigameCores(dt, P) {
    if (!this.minigameCoresList || !this.minigameCoresList.length) return;
    for (const c of this.minigameCoresList) {
      c.pulse += dt * 4;
      c.life -= dt;
      if (c.life <= 0) { c.dead = true; continue; }

      const d = Math.hypot(P.x - c.x, P.y - c.y);
      if (d < P.r + c.r + 14) {
        c.dead = true;
        if (window.GameState) {
          window.GameState.minigameCores = (window.GameState.minigameCores || 0) + 1;
          window.GameState.bonusScore = (window.GameState.bonusScore || 0) + 500;
          P.overloadGauge = Math.min(100, (P.overloadGauge || 0) + 12);
        }
        this.spawnParticle(c.x, c.y, '#00ffcc', 24, 240, 4.5, 0.5);
        this.addText(c.x, c.y, `+1 KERN (+500 ⭐)`, '#00ffcc', true);
        this.fx.push({ type: 'ring', x: c.x, y: c.y, r0: 10, r1: 140, life: 0.32, max: 0.32, col: '#00ffcc' });
        this.grid.query(c.x, c.y, 140, e => {
          if (e.dead) return;
          this.hurtEnemy(e, 45 * P.dmgMul, (e.x - c.x) * 3, (e.y - c.y) * 3);
        });
        if (window.SoundSystem) window.SoundSystem.sfx('minigame_combo');
      }
    }
    this.minigameCoresList = this.minigameCoresList.filter(c => !c.dead);
  }
}

window.Entities = new EntityManager();
