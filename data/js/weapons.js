// ==========================================
// NEON SURVIVOR - WEAPONS & EVOLUTIONS ENGINE
// Implementation of all 15 Weapons & 15 Evolutions
// ==========================================
'use strict';

class WeaponEngine {
  constructor() {
    this.orbitAng = 0;
    this.sawSpawnTimer = 0;
    this.laserAngle = 0;
  }

  update(dt, P, WL, PL) {
    const isOverload = window.GameState.isOverload;
    const chaosRate = window.GameState.activeChaosEvent === 'overdrive_weapons' ? 1.5 : 1.0;
    const rateMul = P.rateMul * (isOverload ? 2.0 : 1.0) * (P.overdriveTimer > 0 ? 1.5 : 1.0) * chaosRate;
    const dmgMul = P.dmgMul * (isOverload ? 1.8 : 1.0) * (P.doubleDamageTimer > 0 ? 2.0 : 1.0);
    const multi = P.multi + (isOverload ? 2 : 0);
    const aoeMult = 1 + (P.aoeBonus || 0);

    // 1. BLASTER / HYPER-GATLING
    let w = WL.blaster;
    if (w && w.lv > 0) {
      w.t -= dt;
      if (w.t <= 0) {
        const isEvo = w.evolved;
        const tg = window.Entities.grid.nearest(P.x, P.y, 750);
        if (tg) {
          const l = w.lv;
          const n = isEvo ? (6 + multi) : (1 + Math.floor(l / 3) + multi);
          const base = Math.atan2(tg.y - P.y, tg.x - P.x);
          const sp = isEvo ? 0.08 : 0.12;

          for (let i = 0; i < n; i++) {
            const a = base + (i - (n - 1) / 2) * sp;
            window.Entities.bullets.push({
              x: P.x, y: P.y,
              vx: Math.cos(a) * (isEvo ? 850 : 700),
              vy: Math.sin(a) * (isEvo ? 850 : 700),
              r: isEvo ? 7 : 5.5,
              dmg: (isEvo ? 65 + l * 10 : 16 + 8 * l) * dmgMul,
              pierce: isEvo ? 6 : (1 + Math.floor(l / 2)),
              life: 1.4,
              hit: new Set()
            });
          }
          if (window.SoundSystem) window.SoundSystem.sfx('shoot');
          w.t = (isEvo ? 0.14 : (0.46 * Math.pow(0.88, l - 1))) / rateMul;
        } else {
          w.t = 0.1;
        }
      }
    }

    // 2. ORBIT BLADES / SINGULARITY BLADES
    w = WL.orbit;
    if (w && w.lv > 0) {
      const isEvo = w.evolved;
      const l = w.lv;
      const n = isEvo ? 6 : (l + 1);
      const R = (isEvo ? 120 : (70 + 7 * l));
      this.orbitAng += dt * (isEvo ? 5.5 : (3.5 + 0.3 * l));

      for (let i = 0; i < n; i++) {
        const a = this.orbitAng + (i / n) * Math.PI * 2;
        const ox = P.x + Math.cos(a) * R;
        const oy = P.y + Math.sin(a) * R;

        window.Entities.grid.query(ox, oy, isEvo ? 26 : 16, e => {
          if (e.dead || e.oc > 0) return;
          const d2 = (e.x - ox) ** 2 + (e.y - oy) ** 2;
          if (d2 < (e.r + (isEvo ? 26 : 16)) ** 2) {
            e.oc = 0.22;
            window.Entities.hurtEnemy(e, (isEvo ? 45 + l * 8 : 10 + 6 * l) * dmgMul, (e.x - P.x) * 2.5, (e.y - P.y) * 2.5);
            window.Entities.spawnParticle(ox, oy, isEvo ? '#00e5ff' : '#b44dff', 4, 150, 2, 0.25);
          }
        });

        // Singularity blades deflect bullets!
        if (isEvo) {
          for (const eb of window.Entities.ebullets) {
            if ((eb.x - ox) ** 2 + (eb.y - oy) ** 2 < 28 ** 2) {
              eb.dead = true;
              window.Entities.spawnParticle(ox, oy, '#00e5ff', 4, 120, 2, 0.2);
            }
          }
        }
      }
    }

    // 3. NOVA PULSE / SUPERNOVA
    w = WL.nova;
    if (w && w.lv > 0) {
      w.t -= dt;
      if (w.t <= 0) {
        const isEvo = w.evolved;
        const l = w.lv;
        const rad = (isEvo ? 300 : (140 + 24 * l)) * aoeMult;
        w.t = (isEvo ? 1.8 : (2.8 - 0.22 * (l - 1))) / rateMul;

        window.Entities.grid.query(P.x, P.y, rad, e => {
          if (e.dead) return;
          const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy) || 1;
          if (d < rad + e.r) {
            window.Entities.hurtEnemy(e, (isEvo ? 95 + l * 16 : 28 + 14 * l) * dmgMul, (dx / d) * 650, (dy / d) * 650);
          }
        });

        window.Entities.fx.push({ type: 'ring', x: P.x, y: P.y, r0: P.r, r1: rad, life: 0.45, max: 0.45, col: isEvo ? '#ff0055' : '#ffd23f' });
        if (isEvo) {
          window.Entities.fx.push({ type: 'ring', x: P.x, y: P.y, r0: P.r, r1: rad * 0.6, life: 0.55, max: 0.55, col: '#ffffff' });
        }
        if (window.SoundSystem) window.SoundSystem.sfx('nova');
        window.GameState.shake = Math.max(window.GameState.shake, isEvo ? 7 : 3);
      }
    }

    // 4. CHAIN LIGHTNING / THOR'S ARC
    w = WL.bolt;
    if (w && w.lv > 0) {
      w.t -= dt;
      if (w.t <= 0) {
        const isEvo = w.evolved;
        const l = w.lv;
        let cur = window.Entities.grid.nearest(P.x, P.y, isEvo ? 700 : 500);
        if (cur) {
          w.t = (isEvo ? 0.6 : (1.5 - 0.12 * (l - 1))) / rateMul;
          const hit = new Set(), pts = [[P.x, P.y]];
          const maxJumps = isEvo ? 14 : (l + 2);

          for (let j = 0; j < maxJumps && cur; j++) {
            hit.add(cur);
            pts.push([cur.x, cur.y]);
            window.Entities.hurtEnemy(cur, (isEvo ? 75 + l * 12 : 28 + 12 * l) * dmgMul, 0, 0, isEvo);
            window.Entities.spawnParticle(cur.x, cur.y, '#9fd8ff', 6, 180, 2, 0.3);
            cur = window.Entities.grid.nearest(cur.x, cur.y, 250, hit);
          }

          const jag = [];
          for (let i = 0; i < pts.length - 1; i++) {
            const [a, b] = [pts[i], pts[i + 1]];
            const segs = 6;
            for (let s = 0; s < segs; s++) {
              const k = s / segs;
              jag.push([
                a[0] + (b[0] - a[0]) * k + (s ? (Math.random() * 20 - 10) : 0),
                a[1] + (b[1] - a[1]) * k + (s ? (Math.random() * 20 - 10) : 0)
              ]);
            }
          }
          jag.push(pts[pts.length - 1]);
          window.Entities.fx.push({ type: 'bolt', pts: jag, life: 0.18, max: 0.18 });
          if (window.SoundSystem) window.SoundSystem.sfx('zap');
        } else {
          w.t = 0.15;
        }
      }
    }

    // 5. MISSILES / ARMAGEDDON
    w = WL.missile;
    if (w && w.lv > 0) {
      w.t -= dt;
      if (w.t <= 0) {
        const isEvo = w.evolved;
        const l = w.lv;
        if (window.Entities.enemies.length) {
          w.t = (isEvo ? 0.65 : (1.4 - 0.1 * (l - 1))) / rateMul;
          const n = isEvo ? (8 + multi) : (Math.ceil(l / 2) + 1 + multi);
          for (let i = 0; i < n; i++) {
            const a = P.face + Math.PI + (Math.random() * 2.4 - 1.2);
            window.Entities.missiles.push({
              x: P.x, y: P.y,
              vx: Math.cos(a) * 260,
              vy: Math.sin(a) * 260,
              spd: 260,
              life: 3.5,
              dmg: (isEvo ? 95 + l * 18 : 34 + 14 * l) * dmgMul,
              rad: (isEvo ? 145 : (80 + 10 * l)) * aoeMult,
              tg: null
            });
          }
          if (window.SoundSystem) window.SoundSystem.sfx('missile');
        } else {
          w.t = 0.2;
        }
      }
    }

    // 6. LASER / PHOTONIC BEAM
    w = WL.laser;
    if (w && w.lv > 0) {
      const isEvo = w.evolved;
      const l = w.lv;
      if (isEvo) {
        this.laserAngle += dt * 3.0; // 360 rotation!
      } else {
        this.laserAngle = P.face;
      }
      const len = isEvo ? 800 : (450 + l * 40);
      const lx2 = P.x + Math.cos(this.laserAngle) * len;
      const ly2 = P.y + Math.sin(this.laserAngle) * len;

      window.Entities.fx.push({
        type: 'laser_beam',
        x1: P.x, y1: P.y,
        x2: lx2, y2: ly2,
        width: isEvo ? 20 : (6 + l * 2),
        col: isEvo ? '#00e5ff' : '#ff0077',
        life: 0.05, max: 0.05
      });

      // Damage enemies along laser line
      window.Entities.grid.query(P.x, P.y, len, e => {
        if (e.dead) return;
        const dx = lx2 - P.x, dy = ly2 - P.y;
        const dLine = Math.hypot(dx, dy) || 1;
        const u = Math.max(0, Math.min(1, ((e.x - P.x) * dx + (e.y - P.y) * dy) / (dLine * dLine)));
        const px = P.x + u * dx, py = P.y + u * dy;
        const distToLaser = Math.hypot(e.x - px, e.y - py);

        if (distToLaser < e.r + (isEvo ? 22 : 12)) {
          window.Entities.hurtEnemy(e, (isEvo ? 70 : 18 + l * 6) * dmgMul * dt * 5, dx / dLine * 50, dy / dLine * 50);
        }
      });
    }

    // 7. VORTEX / EVENT HORIZON
    w = WL.vortex;
    if (w && w.lv > 0) {
      w.t -= dt;
      if (w.t <= 0) {
        const isEvo = w.evolved;
        const l = w.lv;
        const tg = window.Entities.grid.nearest(P.x, P.y, 600);
        const vx = tg ? tg.x : P.x + Math.cos(P.face) * 300;
        const vy = tg ? tg.y : P.y + Math.sin(P.face) * 300;

        window.Entities.vortices.push({
          x: vx, y: vy,
          rad: (isEvo ? 240 : (100 + l * 18)) * aoeMult,
          dmg: (isEvo ? 75 : 20 + l * 8) * dmgMul,
          life: isEvo ? 8.0 : 4.0,
          max: isEvo ? 8.0 : 4.0,
          rot: 0
        });
        w.t = (isEvo ? 4.5 : (6.0 - l * 0.4)) / rateMul;
      }
    }

    // 8. DRONES / AEGIS SWARM
    w = WL.drones;
    if (w && w.lv > 0) {
      const isEvo = w.evolved;
      const l = w.lv;
      const droneCount = isEvo ? 6 : (1 + Math.floor(l / 2));
      w.t -= dt;
      if (w.t <= 0) {
        w.t = (isEvo ? 0.35 : 0.7) / rateMul;
        for (let i = 0; i < droneCount; i++) {
          const ang = this.orbitAng * 1.5 + (i / droneCount) * Math.PI * 2;
          const dx = P.x + Math.cos(ang) * 90;
          const dy = P.y + Math.sin(ang) * 90;
          const tg = window.Entities.grid.nearest(dx, dy, 450);
          if (tg) {
            const ta = Math.atan2(tg.y - dy, tg.x - dx);
            window.Entities.bullets.push({
              x: dx, y: dy,
              vx: Math.cos(ta) * 650, vy: Math.sin(ta) * 650,
              r: 4.5, dmg: (isEvo ? 35 : 12 + l * 4) * dmgMul,
              pierce: isEvo ? 2 : 1, life: 1.2, hit: new Set()
            });
          }
        }
      }
      // Aegis heal aura
      if (isEvo) {
        P.hp = Math.min(P.maxHp, P.hp + 0.6 * dt);
      }
    }

    // 9. MINES / THERMO MINES
    w = WL.mines;
    if (w && w.lv > 0) {
      w.t -= dt;
      if (w.t <= 0) {
        const isEvo = w.evolved;
        const l = w.lv;
        window.Entities.mines.push({
          x: P.x, y: P.y,
          rad: (isEvo ? 160 : (75 + l * 12)) * aoeMult,
          dmg: (isEvo ? 120 : 35 + l * 12) * dmgMul,
          life: 8.0, pulse: 0, dead: false
        });
        w.t = (isEvo ? 1.0 : (2.4 - l * 0.2)) / rateMul;
      }
    }

    // 10. FLAK / HELLSTORM FLAK
    w = WL.flak;
    if (w && w.lv > 0) {
      w.t -= dt;
      if (w.t <= 0) {
        const isEvo = w.evolved;
        const l = w.lv;
        const tg = window.Entities.grid.nearest(P.x, P.y, 450);
        const baseAng = tg ? Math.atan2(tg.y - P.y, tg.x - P.x) : P.face;
        const pellets = isEvo ? (18 + multi * 2) : (6 + l * 2 + multi);

        for (let i = 0; i < pellets; i++) {
          const a = baseAng + (Math.random() * 0.9 - 0.45);
          const spd = 500 + Math.random() * 260;
          window.Entities.bullets.push({
            x: P.x, y: P.y,
            vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
            r: isEvo ? 6.5 : 4.5, dmg: (isEvo ? 40 : 14 + l * 5) * dmgMul,
            pierce: isEvo ? 4 : (l >= 4 ? 2 : 1), life: 0.65, hit: new Set(),
            isHellstorm: isEvo, col: isEvo ? '#ff8a3d' : '#ffd23f'
          });
        }
        if (window.SoundSystem) window.SoundSystem.sfx('flak');
        w.t = (isEvo ? 0.45 : (1.2 - l * 0.08)) / rateMul;
      }
    }

    // 11. CRYO / ABSOLUTE ZERO
    w = WL.cryo;
    if (w && w.lv > 0) {
      w.t -= dt;
      if (w.t <= 0) {
        const isEvo = w.evolved;
        const l = w.lv;
        const n = isEvo ? 8 : (3 + Math.floor(l / 2));
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          window.Entities.bullets.push({
            x: P.x, y: P.y,
            vx: Math.cos(a) * 450, vy: Math.sin(a) * 450,
            r: 5, dmg: (isEvo ? 45 : 15 + l * 5) * dmgMul,
            pierce: 2, life: 1.0, hit: new Set(),
            isCryo: true, isEvoCryo: isEvo
          });
        }
        if (window.SoundSystem) window.SoundSystem.sfx('freeze');
        w.t = (isEvo ? 1.0 : (2.0 - l * 0.15)) / rateMul;
      }
    }

    // 12. SAW / PLASMA REAPER
    w = WL.saw;
    if (w && w.lv > 0) {
      const isEvo = w.evolved;
      const l = w.lv;
      const targetCount = isEvo ? 4 : Math.min(3, 1 + Math.floor(l / 3));

      while (window.Entities.saws.length < targetCount) {
        const a = Math.random() * Math.PI * 2;
        window.Entities.saws.push({
          x: P.x, y: P.y,
          vx: Math.cos(a) * (isEvo ? 450 : 320),
          vy: Math.sin(a) * (isEvo ? 450 : 320),
          r: isEvo ? 28 : (14 + l * 2),
          dmg: (isEvo ? 65 : 22 + l * 6) * dmgMul,
          rot: 0,
          life: 9999
        });
      }
    }

    // 13. FLAMETHROWER / HELLFIRE DRAGON
    w = WL.flamethrower;
    if (w && w.lv > 0) {
      const isEvo = w.evolved;
      const l = w.lv;
      const flameRad = (isEvo ? 340 : (180 + l * 26)) * aoeMult;
      const coneHalfAngle = isEvo ? 0.65 : (0.42 + l * 0.03);
      const count = isEvo ? 6 : (3 + Math.floor(l / 2));

      for (let i = 0; i < count; i++) {
        const spread = (Math.random() * 2 - 1) * coneHalfAngle;
        const a = P.face + spread;
        const spd = (isEvo ? 620 : (380 + l * 30)) * (0.85 + Math.random() * 0.35);
        const life = 0.42 + Math.random() * 0.18;
        const cols = isEvo
          ? ['#00e5ff', '#3dfcff', '#b44dff', '#ffffff']
          : ['#ff3d00', '#ff9100', '#ffd23f', '#ff1744'];
        const col = cols[Math.floor(Math.random() * cols.length)];

        window.Entities.particles.push({
          x: P.x + Math.cos(P.face) * 18,
          y: P.y + Math.sin(P.face) * 18,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          life: life,
          max: life,
          col: col,
          size: (isEvo ? 14 : 9 + l * 1.5) * (0.8 + Math.random() * 0.6),
          isFlame: true,
          dmg: (isEvo ? 65 : 22 + l * 6) * dmgMul
        });
      }

      // Damage query for flames across the actual cone reach
      window.Entities.grid.query(P.x, P.y, flameRad, e => {
        if (e.dead) return;
        const dx = e.x - P.x, dy = e.y - P.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d <= flameRad) {
          const toAng = Math.atan2(dy, dx);
          const diff = Math.abs(((toAng - P.face + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
          if (diff <= coneHalfAngle + 0.12) {
            window.Entities.hurtEnemy(e, (isEvo ? 68 : 24 + l * 7) * dmgMul * dt * 4.5, dx * 0.25, dy * 0.25);
          }
        }
      });
    }

    // 14. RADIANT GLAIVE / STAR SCYTHE
    w = WL.radiant_glaive;
    if (w && w.lv > 0) {
      w.t -= dt;
      if (w.t <= 0) {
        const isEvo = w.evolved;
        const l = w.lv;
        const n = isEvo ? 4 : (1 + Math.floor(l / 3));
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + P.face;
          window.Entities.bullets.push({
            x: P.x, y: P.y,
            vx: Math.cos(a) * 480, vy: Math.sin(a) * 480,
            r: isEvo ? 14 : 9,
            dmg: (isEvo ? 85 : 30 + l * 10) * dmgMul,
            pierce: 999, life: 1.6, hit: new Set(),
            isBoomerang: true, isStarScythe: isEvo,
            col: isEvo ? '#ff2d95' : '#ffd23f',
            originX: P.x, originY: P.y
          });
        }
        w.t = (isEvo ? 1.2 : 2.2) / rateMul;
      }
    }

    // 15. EMP / CHRONOS MATRIX
    w = WL.emp;
    if (w && w.lv > 0) {
      w.t -= dt;
      if (w.t <= 0) {
        const isEvo = w.evolved;
        const l = w.lv;
        const rad = (isEvo ? 500 : (220 + l * 30)) * aoeMult;
        w.t = (isEvo ? 4.0 : 7.0) / rateMul;

        // Clear all bullets in radius
        for (const eb of window.Entities.ebullets) {
          if (Math.hypot(eb.x - P.x, eb.y - P.y) < rad) eb.dead = true;
        }

        // Stun enemies
        window.Entities.grid.query(P.x, P.y, rad, e => {
          if (e.dead) return;
          e.stunned = Math.max(e.stunned || 0, e.isBoss ? (isEvo ? 1.0 : 0.4) : (isEvo ? 4.0 : 2.0));
          window.Entities.hurtEnemy(e, (isEvo ? 60 : 20 + l * 5) * dmgMul, 0, 0);
        });

        window.Entities.fx.push({ type: 'ring', x: P.x, y: P.y, r0: 20, r1: rad, life: 0.6, max: 0.6, col: '#00e5ff' });
        if (window.SoundSystem) window.SoundSystem.sfx('zap');
      }
    }
  }
}

window.Weapons = new WeaponEngine();
