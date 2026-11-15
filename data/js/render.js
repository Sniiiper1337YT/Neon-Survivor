// ==========================================
// NEON SURVIVOR - HIGH-END CANVAS 2D RENDERER
// Neon Glow Shaders, 17 Enemies, 6 Bosses, 8 Ships,
// Map Themes & Hazards, Dynamic HUD, Overload Aura
// ==========================================
'use strict';

class RenderEngine {
  constructor() {
    this.cv = null;
    this.ctx = null;
    this.W = 0;
    this.H = 0;
    this.DPR = 1;
    this.vignette = null;
    this.glowCache = {};
    this.TAU = Math.PI * 2;
  }

  init(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const quality = window.SaveSystem ? window.SaveSystem.getSettings().quality : 'high';
    const maxDPR = quality === 'low' ? 1 : 2;
    this.DPR = Math.min(window.devicePixelRatio || 1, maxDPR);
    this.W = window.innerWidth;
    this.H = window.innerHeight;
    this.cv.width = this.W * this.DPR;
    this.cv.height = this.H * this.DPR;
    this.cv.style.width = this.W + 'px';
    this.cv.style.height = this.H + 'px';
    this.ctx.setTransform(this.DPR, 0, 0, this.DPR, 0, 0);

    // Vignette buffer
    this.vignette = document.createElement('canvas');
    this.vignette.width = this.W;
    this.vignette.height = this.H;
    const v = this.vignette.getContext('2d');
    const g = v.createRadialGradient(this.W / 2, this.H / 2, Math.min(this.W, this.H) * 0.35, this.W / 2, this.H / 2, Math.max(this.W, this.H) * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.75)');
    v.fillStyle = g;
    v.fillRect(0, 0, this.W, this.H);
  }

  glowSprite(col) {
    if (this.glowCache[col]) return this.glowCache[col];
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, col);
    gr.addColorStop(0.35, col + '66');
    gr.addColorStop(1, col + '00');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    return this.glowCache[col] = c;
  }

  drawGlow(x, y, r, col, a = 0.7) {
    this.ctx.globalAlpha = a;
    this.ctx.drawImage(this.glowSprite(col), x - r, y - r, r * 2, r * 2);
    this.ctx.globalAlpha = 1;
  }

  poly(n, r, rot, inner = 0) {
    const ctx = this.ctx;
    ctx.beginPath();
    const tot = inner ? n * 2 : n;
    for (let i = 0; i < tot; i++) {
      const a = rot + (i / tot) * this.TAU;
      const rr = inner && i % 2 ? r * inner : r;
      i ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
  }

  rrect(x, y, w, h, r) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  drawMapBackground(ox, oy, mapDef) {
    const ctx = this.ctx;
    const W = this.W, H = this.H;
    const now = performance.now() / 1000;
    const mapKey = (window.GameState && window.GameState.selectedMap) || 'void';

    // Base background
    ctx.fillStyle = mapDef.bg || '#07020f';
    ctx.fillRect(0, 0, W, H);

    // ==========================================
    // MAP-SPEZIFISCHE ANIMIERTE HINTERGRÜNDE
    // ==========================================
    if (mapKey === 'matrix') {
      ctx.save();
      const cols = 28;
      const colWidth = W / cols;
      ctx.font = '13px monospace';
      for (let c = 0; c < cols; c++) {
        const speed = 70 + ((c * 47) % 80);
        const yHead = (((now * speed + c * 135) % (H + 300)) - 150);
        const xPos = c * colWidth + colWidth * 0.5;
        for (let row = 0; row < 12; row++) {
          const yGlyph = yHead - row * 18;
          if (yGlyph < 0 || yGlyph > H) continue;
          const alpha = Math.max(0, 1 - row / 12) * 0.35;
          ctx.fillStyle = row === 0 ? 'rgba(200, 255, 220, 0.9)' : `rgba(0, 255, 102, ${alpha})`;
          const charCode = 48 + ((c * 7 + row * 13 + Math.floor(now * 8)) % 74);
          ctx.fillText(String.fromCharCode(charCode), xPos, yGlyph);
        }
      }
      ctx.restore();
    } else if (mapKey === 'abyss') {
      ctx.save();
      const centerX = W / 2 + (ox % 80) * 0.2;
      const centerY = H / 2 + (oy % 80) * 0.2;
      ctx.translate(centerX, centerY);
      ctx.rotate(now * 0.15);
      for (let r = 0; r < 4; r++) {
        const rad = 140 + r * 90;
        ctx.strokeStyle = `rgba(180, 77, 255, ${0.12 - r * 0.02})`;
        ctx.lineWidth = 14 + r * 6;
        ctx.beginPath();
        ctx.arc(0, 0, rad, 0, Math.PI * 1.6);
        ctx.stroke();
        ctx.rotate(0.9);
      }
      ctx.restore();
    } else if (mapKey === 'reactor') {
      ctx.save();
      const rGrad = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, W * 0.7);
      const pulseHeat = 0.12 + Math.sin(now * 2) * 0.05;
      rGrad.addColorStop(0, `rgba(255, 60, 0, ${pulseHeat * 1.5})`);
      rGrad.addColorStop(1, 'rgba(20, 5, 2, 0)');
      ctx.fillStyle = rGrad;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    } else if (mapKey === 'asteroids') {
      ctx.save();
      for (let i = 0; i < 18; i++) {
        const px = (((i * 197 + ox * 0.15) % (W + 200)) + (W + 200)) % (W + 200) - 100;
        const py = (((i * 263 + oy * 0.15) % (H + 200)) + (H + 200)) % (H + 200) - 100;
        const size = 18 + (i % 5) * 8;
        ctx.fillStyle = 'rgba(0, 40, 70, 0.22)';
        ctx.beginPath();
        ctx.arc(px, py, size, 0, this.TAU);
        ctx.fill();
      }
      ctx.restore();
    } else if (mapKey === 'glitch') {
      ctx.save();
      if (Math.floor(now * 12) % 3 === 0) {
        const barY = (Math.sin(now * 7) * 0.5 + 0.5) * H;
        ctx.fillStyle = 'rgba(255, 0, 128, 0.08)';
        ctx.fillRect(0, barY, W, 18);
        ctx.fillStyle = 'rgba(0, 255, 255, 0.06)';
        ctx.fillRect(0, (barY + 35) % H, W, 8);
      }
      ctx.restore();
    } else {
      ctx.save();
      for (let i = 0; i < 45; i++) {
        const starSpeed = 0.08 + (i % 3) * 0.12;
        const sx = (((i * 137 + ox * starSpeed) % (W + 50)) + (W + 50)) % (W + 50) - 25;
        const sy = (((i * 223 + oy * starSpeed) % (H + 50)) + (H + 50)) % (H + 50) - 25;
        const twinkle = 0.3 + Math.sin(now * 3 + i) * 0.3;
        ctx.fillStyle = i % 2 === 0 ? `rgba(61, 252, 255, ${twinkle})` : `rgba(255, 255, 255, ${twinkle * 0.8})`;
        ctx.fillRect(sx, sy, (i % 3) + 1.2, (i % 3) + 1.2);
      }
      ctx.restore();
    }

    // Primary Grid
    const G = 64;
    ctx.lineWidth = 1;
    ctx.strokeStyle = mapDef.gridCol || 'rgba(140,70,255,0.12)';
    ctx.beginPath();
    for (let x = ((ox % G) + G) % G; x < this.W; x += G) {
      ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, this.H);
    }
    for (let y = ((oy % G) + G) % G; y < this.H; y += G) {
      ctx.moveTo(0, y + 0.5); ctx.lineTo(this.W, y + 0.5);
    }
    ctx.stroke();

    // Secondary Major Grid Lines
    const G2 = 256;
    ctx.lineWidth = 2;
    ctx.strokeStyle = (mapDef.colTheme || '#3dfcff') + '1a';
    ctx.beginPath();
    for (let x = ((ox % G2) + G2) % G2; x < this.W; x += G2) {
      ctx.moveTo(x, 0); ctx.lineTo(x, this.H);
    }
    for (let y = ((oy % G2) + G2) % G2; y < this.H; y += G2) {
      ctx.moveTo(0, y); ctx.lineTo(this.W, y);
    }
    ctx.stroke();
  }

  render(cam, P, entities, mapDef, isOverload, shake, hurtFlash, banner, dt) {
    const ctx = this.ctx;
    const now = performance.now() / 1000;

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    // Screen shake (respects settings.screenShake)
    const shakeEnabled = !window.SaveSystem || window.SaveSystem.getSettings().screenShake !== false;
    const effShake = shakeEnabled ? shake : 0;
    const sx = effShake > 0.2 ? (Math.random() * 2 - 1) * effShake : 0;
    const sy = effShake > 0.2 ? (Math.random() * 2 - 1) * effShake : 0;
    const ox = Math.round(this.W / 2 - cam.x + sx);
    const oy = Math.round(this.H / 2 - cam.y + sy);

    this.drawMapBackground(ox, oy, mapDef);

    if (window.GameState && window.GameState.state === 'title') {
      ctx.drawImage(this.vignette, 0, 0);
      return;
    }

    ctx.save();
    ctx.translate(ox, oy);

    const vx0 = cam.x - this.W / 2 - 120;
    const vx1 = cam.x + this.W / 2 + 120;
    const vy0 = cam.y - this.H / 2 - 120;
    const vy1 = cam.y + this.H / 2 + 120;
    const isVisible = (x, y) => x > vx0 && x < vx1 && y > vy0 && y < vy1;

    // 0. Map Hazards (behind entities)
    if (entities.hazards && entities.hazards.length) {
      for (const h of entities.hazards) {
        if (!isVisible(h.x, h.y)) continue;
        ctx.save();
        ctx.translate(h.x, h.y);
        if (h.kind === 'asteroid') {
          ctx.rotate(h.rot);
          ctx.beginPath();
          for (let i = 0; i < h.verts.length; i++) {
            const a = (i / h.verts.length) * this.TAU;
            const r = h.r * h.verts[i];
            i ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          ctx.closePath();
          ctx.fillStyle = 'rgba(0, 60, 90, 0.55)';
          ctx.fill();
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = '#00d5ff';
          ctx.stroke();
          if (h.hp < h.maxHp) {
            ctx.beginPath();
            ctx.moveTo(-h.r * 0.4, -h.r * 0.2);
            ctx.lineTo(0, h.r * 0.15);
            ctx.lineTo(h.r * 0.35, -h.r * 0.3);
            ctx.strokeStyle = '#a2ffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        } else if (h.kind === 'plasma_vent') {
          ctx.beginPath();
          ctx.arc(0, 0, h.r, 0, this.TAU);
          if (h.state === 'erupting') {
            ctx.fillStyle = 'rgba(255, 85, 0, 0.38)';
            ctx.strokeStyle = '#ffaa00';
            ctx.lineWidth = 3;
          } else if (h.state === 'warning') {
            const fillRatio = Math.max(0, Math.min(1, 1 - h.timer / 1.8));
            ctx.fillStyle = 'rgba(255, 50, 0, 0.18)';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(0, 0, h.r * fillRatio, 0, this.TAU);
            ctx.fillStyle = 'rgba(255, 100, 0, 0.28)';
            ctx.strokeStyle = '#ff5500';
            ctx.lineWidth = 2;
          } else {
            ctx.fillStyle = 'rgba(255, 85, 0, 0.06)';
            ctx.strokeStyle = 'rgba(255, 85, 0, 0.3)';
            ctx.lineWidth = 1.5;
          }
          ctx.fill();
          ctx.stroke();
        } else if (h.kind === 'vortex') {
          ctx.rotate(h.rot);
          ctx.strokeStyle = 'rgba(180, 77, 255, 0.45)';
          ctx.lineWidth = 2;
          for (let ring = 1; ring <= 3; ring++) {
            ctx.beginPath();
            ctx.arc(0, 0, (h.r * ring) / 3, 0, Math.PI * 1.4);
            ctx.stroke();
            ctx.rotate(1.1);
          }
        } else if (h.kind === 'data_stream') {
          ctx.fillStyle = 'rgba(0, 255, 102, 0.08)';
          ctx.strokeStyle = 'rgba(0, 255, 102, 0.4)';
          ctx.lineWidth = 1.5;
          ctx.fillRect(-h.w / 2, -h.h / 2, h.w, h.h);
          ctx.strokeRect(-h.w / 2, -h.h / 2, h.w, h.h);
          ctx.strokeStyle = 'rgba(0, 255, 102, 0.65)';
          const offset = ((now * 60 * h.dir) % 40 + 40) % 40;
          if (h.horizontal) {
            for (let x = -h.w / 2 + offset; x < h.w / 2 - 12; x += 40) {
              ctx.beginPath();
              ctx.moveTo(x, -12);
              ctx.lineTo(x + 12 * h.dir, 0);
              ctx.lineTo(x, 12);
              ctx.stroke();
            }
          } else {
            for (let y = -h.h / 2 + offset; y < h.h / 2 - 12; y += 40) {
              ctx.beginPath();
              ctx.moveTo(-12, y);
              ctx.lineTo(0, y + 12 * h.dir);
              ctx.lineTo(12, y);
              ctx.stroke();
            }
          }
        } else if (h.kind === 'glitch_warp') {
          const r = h.r + Math.sin(h.pulse) * 4;
          ctx.strokeStyle = h.cd > 0 ? 'rgba(255, 0, 85, 0.25)' : '#ff0055';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, this.TAU);
          ctx.stroke();
          ctx.strokeStyle = h.cd > 0 ? 'rgba(61, 252, 255, 0.2)' : '#3dfcff';
          ctx.beginPath();
          ctx.arc(Math.sin(now * 20) * 3, Math.cos(now * 20) * 3, r * 0.65, 0, this.TAU);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    // 1. Vortices & Ground FX (Additive)
    ctx.globalCompositeOperation = 'lighter';
    for (const v of entities.vortices) {
      this.drawGlow(v.x, v.y, v.rad * 1.5, '#651fff', 0.8);
      ctx.save();
      ctx.translate(v.x, v.y);
      ctx.rotate(v.rot);
      this.poly(6, v.rad, 0, 0.4);
      ctx.fillStyle = 'rgba(101,31,255,0.3)';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#d500f9';
      ctx.stroke();
      ctx.restore();
    }

    // 2. Rings & FX
    for (const f of entities.fx) {
      const a = Math.max(0, Math.min(1, f.life / f.max));
      if (f.type === 'ring') {
        const k = 1 - a;
        ctx.globalAlpha = a;
        ctx.strokeStyle = f.col;
        ctx.lineWidth = 8 * a + 1;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r0 + (f.r1 - f.r0) * (1 - Math.pow(1 - k, 3)), 0, this.TAU);
        ctx.stroke();
      } else if (f.type === 'bolt') {
        ctx.lineJoin = 'round';
        ctx.globalAlpha = a;
        ctx.strokeStyle = '#e0f4ff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        f.pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
        ctx.stroke();
      } else if (f.type === 'laser_beam') {
        ctx.globalAlpha = a;
        ctx.strokeStyle = f.col;
        ctx.lineWidth = f.width;
        ctx.beginPath();
        ctx.moveTo(f.x1, f.y1);
        ctx.lineTo(f.x2, f.y2);
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = f.width * 0.4;
        ctx.stroke();
      } else if (f.type === 'mortar_target') {
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = 'rgba(255,0,85,0.25)';
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r * (1 - f.life / f.max), 0, this.TAU);
        ctx.fill();
        ctx.strokeStyle = '#ff0055';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    // 3. Gems
    for (const g of entities.gems) {
      if (!isVisible(g.x, g.y)) continue;
      const s = g.val >= 10 ? 8 : g.val >= 5 ? 7 : g.val >= 3 ? 6 : 4.5;
      this.drawGlow(g.x, g.y, s * 3, g.col, 0.7);
      ctx.fillStyle = g.col;
      ctx.beginPath();
      ctx.moveTo(g.x, g.y - s * 1.3);
      ctx.lineTo(g.x + s, g.y);
      ctx.lineTo(g.x, g.y + s * 1.3);
      ctx.lineTo(g.x - s, g.y);
      ctx.closePath();
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';

    // 4. Power-ups
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '26px "Segoe UI Emoji"';
    for (const pu of entities.powerups) {
      if (!isVisible(pu.x, pu.y)) continue;
      const yy = pu.y + Math.sin(pu.b) * 5;
      const def = window.GAME_DATA.POWERUPS[pu.type] || { icon: '⭐', col: '#ffd23f' };
      ctx.globalCompositeOperation = 'lighter';
      this.drawGlow(pu.x, yy, 32, def.col, 0.7);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillText(def.icon, pu.x, yy);
    }

    // 5. Enemies (17 Types)
    for (const e of entities.enemies) {
      if (!isVisible(e.x, e.y)) continue;

      // Telegraph indicators (e.g. dasher / sniper)
      if (e.telegraph > 0) {
        ctx.strokeStyle = 'rgba(255,0,85,0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(P.x, P.y);
        ctx.stroke();
      }

      // Leech tether drain beam
      if (e.type === 'leech') {
        const ld = Math.hypot(P.x - e.x, P.y - e.y);
        if (ld < 300) {
          ctx.strokeStyle = '#f50057';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(e.x, e.y);
          const mx = (e.x + P.x) * 0.5 + Math.sin(now * 20) * 12;
          const my = (e.y + P.y) * 0.5 + Math.cos(now * 20) * 12;
          ctx.quadraticCurveTo(mx, my, P.x, P.y);
          ctx.stroke();
        }
      }

      // Repulsor magnetic deflection ring
      if (e.type === 'repulsor') {
        ctx.strokeStyle = 'rgba(0, 176, 255, 0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 115 + Math.sin(e.pulse || 0) * 5, 0, this.TAU);
        ctx.stroke();
      }

      ctx.globalCompositeOperation = 'lighter';
      this.drawGlow(e.x, e.y, e.r * 2.6, e.col, e.isBoss ? 0.85 : 0.45);
      ctx.globalCompositeOperation = 'source-over';

      ctx.save();
      ctx.translate(e.x, e.y);
      if (e.shape === 'tri') ctx.rotate(e.rot);

      this.drawEnemyPath(e);

      if (e.flash > 0) {
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      } else {
        ctx.globalAlpha = e.alpha !== undefined ? e.alpha : 0.28;
        ctx.fillStyle = e.col;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      ctx.lineWidth = e.isBoss ? 4.5 : 2.5;
      ctx.strokeStyle = e.col;
      ctx.stroke();

      // Boss special core
      if (e.isBoss) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 10 + Math.sin(now * 8) * 3, 0, this.TAU);
        ctx.fill();
      }

      // Overcharged Champion aura (crimson & cyan energetic double ring)
      if (e.isOvercharged && !e.isBoss) {
        ctx.save();
        ctx.strokeStyle = '#ff0055';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, e.r * 1.55 + Math.sin(now * 10) * 3, 0, this.TAU);
        ctx.stroke();
        ctx.strokeStyle = '#3dfcff';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(0, 0, e.r * 1.35 - Math.cos(now * 10) * 2, 0, this.TAU);
        ctx.stroke();
        ctx.restore();
      } else if (e.isElite && !e.isBoss) {
        ctx.save();
        ctx.strokeStyle = '#ffd23f';
        ctx.lineWidth = 2.0;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, e.r * 1.35 + Math.sin(now * 8) * 2, 0, this.TAU);
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();

      // Shielder frontal forcefield arc
      if (e.type === 'shielder') {
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r + 7, e.rot - 1.05, e.rot + 1.05);
        ctx.stroke();
      }

      // Frozen / Stunned overlays
      if (e.frozen > 0) {
        ctx.fillStyle = 'rgba(136, 238, 255, 0.35)';
        ctx.strokeStyle = '#88eeff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r + 3, 0, this.TAU);
        ctx.fill();
        ctx.stroke();
      }
      if (e.stunned > 0) {
        ctx.strokeStyle = '#ffd23f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r + 5, now * 12, now * 12 + Math.PI * 0.8);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r + 5, now * 12 + Math.PI, now * 12 + Math.PI * 1.8);
        ctx.stroke();
      }

      // Enemy health bar on tank / summoner / boss
      if (e.isBoss) {
        const ringCol = e.isSurging ? '#ffd23f' : (e.col || '#ff2d95');
        const pulse = Math.sin(now * 6) * 3;
        const rr = e.r + 16 + pulse;
        ctx.save();
        ctx.strokeStyle = ringCol;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.arc(e.x, e.y, rr, now * 1.6, now * 1.6 + this.TAU);
        ctx.stroke();
        ctx.setLineDash([]);

        // Corner target brackets around boss
        const bDist = e.r + 12 + pulse * 0.5;
        const bLen = 10;
        ctx.lineWidth = 3;
        for (let qx = -1; qx <= 1; qx += 2) {
          for (let qy = -1; qy <= 1; qy += 2) {
            const cx = e.x + qx * bDist;
            const cy = e.y + qy * bDist;
            ctx.beginPath();
            ctx.moveTo(cx - qx * bLen, cy);
            ctx.lineTo(cx, cy);
            ctx.lineTo(cx, cy - qy * bLen);
            ctx.stroke();
          }
        }

        // Local HP bar & floating boss marker label above boss
        const bw = Math.max(76, e.r * 2.6);
        const barY = e.y - e.r - 22;
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(e.x - bw / 2 - 1, barY - 1, bw + 2, 7);
        ctx.fillStyle = ringCol;
        ctx.fillRect(e.x - bw / 2, barY, bw * Math.max(0, Math.min(1, e.hp / e.maxHp)), 5);

        ctx.fillStyle = ringCol;
        ctx.beginPath();
        ctx.moveTo(e.x, barY - 4);
        ctx.lineTo(e.x - 6, barY - 13);
        ctx.lineTo(e.x + 6, barY - 13);
        ctx.closePath();
        ctx.fill();

        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.font = '900 12px Segoe UI';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(0,0,0,0.9)';
        const bossTag = '👑 ' + (e.name ? e.name.toUpperCase() : 'BOSS') + (e.isSurging ? ' ⚡' : '');
        ctx.strokeText(bossTag, e.x, barY - 15);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(bossTag, e.x, barY - 15);
        ctx.restore();
      } else if ((e.type === 'tank' || e.type === 'summoner' || e.type === 'shielder') && e.hp < e.maxHp) {
        const bw = e.r * 2.2;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(e.x - bw / 2, e.y - e.r - 12, bw, 4);
        ctx.fillStyle = e.col;
        ctx.fillRect(e.x - bw / 2, e.y - e.r - 12, bw * (e.hp / e.maxHp), 4);
      }
    }

    // 5b. Friendly Sentry Turrets
    if (entities.turrets && entities.turrets.length) {
      for (const t of entities.turrets) {
        if (!isVisible(t.x, t.y)) continue;
        ctx.save();
        ctx.translate(t.x, t.y);
        // Lifetime ring
        ctx.strokeStyle = 'rgba(0, 255, 170, 0.45)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, t.r + 6, -Math.PI / 2, -Math.PI / 2 + this.TAU * Math.max(0, t.life / t.maxLife));
        ctx.stroke();

        ctx.rotate(t.angle);
        ctx.fillStyle = '#092420';
        ctx.strokeStyle = '#00ffaa';
        ctx.lineWidth = 2;
        this.poly(6, t.r, 0, 0);
        ctx.fill();
        ctx.stroke();
        // Twin barrel
        ctx.fillStyle = '#ff9100';
        ctx.fillRect(4, -5, 14, 3);
        ctx.fillRect(4, 2, 14, 3);
        ctx.restore();
      }
    }

    // 5c. Interceptor Drones (Apex-1 Secondary)
    if (entities.drones && entities.drones.length) {
      for (const d of entities.drones) {
        ctx.save();
        ctx.translate(d.x, d.y);
        ctx.rotate(d.angle + Math.PI / 2);
        ctx.fillStyle = '#0a2233';
        ctx.strokeStyle = d.col;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(8, 0); ctx.lineTo(-6, -6); ctx.lineTo(-3, 0); ctx.lineTo(-6, 6); ctx.closePath();
        ctx.fill(); ctx.stroke();
        this.drawGlow(0, 0, 20, d.col, 0.5);
        ctx.restore();
      }
    }

    // 5d. Dimensional Portals (In-Run Minigame Events)
    if (entities.portals && entities.portals.length) {
      for (const port of entities.portals) {
        ctx.save();
        ctx.translate(port.x, port.y);
        ctx.rotate(port.pulse);
        ctx.strokeStyle = '#ff00ff';
        ctx.lineWidth = 3;
        for (let r = 1; r <= 3; r++) {
          ctx.beginPath();
          ctx.arc(0, 0, (port.r * r) / 3, 0, Math.PI * 1.5);
          ctx.stroke();
          ctx.rotate(0.8);
        }
        this.drawGlow(0, 0, 65, '#ff00ff', 0.6);
        ctx.restore();
      }
    }

    // 5e. Active Portal Challenge Zone & Cores
    if (entities.portalChallenge && entities.portalChallenge.active) {
      const pc = entities.portalChallenge;
      ctx.save();
      ctx.strokeStyle = '#00ffcc';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.arc(pc.x, pc.y, pc.r, 0, this.TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(0, 255, 204, 0.05)';
      ctx.fill();

      for (const c of pc.cores) {
        if (c.collected) continue;
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.pulse);
        ctx.fillStyle = '#00ffcc';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        this.poly(4, c.r, 0, 0);
        ctx.fill();
        ctx.stroke();
        this.drawGlow(0, 0, 24, '#00ffcc', 0.5);
        ctx.restore();
      }
      ctx.restore();
    }

    // 5f. Minigame Mode Dimension Cores
    if (entities.minigameCoresList && entities.minigameCoresList.length) {
      for (const c of entities.minigameCoresList) {
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.pulse);
        ctx.fillStyle = '#00ffcc';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        this.poly(4, c.r, 0, 0);
        ctx.fill();
        ctx.stroke();
        this.drawGlow(0, 0, 26, '#00ffcc', 0.6);
        ctx.restore();
      }
    }

    // 6. Player Ship (8 Character models)
    if (window.GameState && window.GameState.state !== 'over') {
      const charKey = window.GameState.selectedCharacter || 'apex';
      const charDef = window.GAME_DATA.CHARACTERS[charKey] || window.GAME_DATA.CHARACTERS.apex;

      if (P.slowAura > 0) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(P.x, P.y, 185, 0, this.TAU);
        ctx.stroke();
      }

      ctx.globalCompositeOperation = 'lighter';
      this.drawGlow(P.x, P.y, isOverload ? 80 : 50, isOverload ? '#ffd23f' : charDef.col, isOverload ? 0.9 : 0.6);
      if (P.shieldHits > 0) {
        this.drawGlow(P.x, P.y, 65, '#76ff03', 0.5);
      }
      ctx.globalCompositeOperation = 'source-over';

      ctx.save();
      ctx.translate(P.x, P.y);
      ctx.rotate(P.face);

      // Invulnerability blink
      if (P.inv > 0 && Math.floor(now * 25) % 2) ctx.globalAlpha = 0.35;

      this.drawPlayerHull(charDef.hull, charDef.col);

      ctx.restore();
      ctx.globalAlpha = 1;

      // Shield sphere
      if (P.shieldHits > 0) {
        ctx.strokeStyle = '#76ff03';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(P.x, P.y, P.r + 14, 0, this.TAU);
        ctx.stroke();
      }

      // Colossus Aegis Barrier
      if (P.barrierActive > 0) {
        ctx.save();
        ctx.translate(P.x, P.y);
        ctx.rotate(now * 3);
        ctx.strokeStyle = '#b44dff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * this.TAU;
          i ? ctx.lineTo(Math.cos(a) * 58, Math.sin(a) * 58) : ctx.moveTo(Math.cos(a) * 58, Math.sin(a) * 58);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(180, 77, 255, 0.18)';
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // Specter Phase Cloak Shimmer
      if (P.cloakActive > 0) {
        ctx.save();
        ctx.strokeStyle = '#651fff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(P.x, P.y, 34 + Math.sin(now * 12) * 5, 0, this.TAU);
        ctx.stroke();
        ctx.restore();
      }

      // Orbit blades
      const wOrbit = window.GameState.weapons.orbit;
      if (wOrbit && wOrbit.lv > 0) {
        const isEvo = wOrbit.evolved;
        const n = isEvo ? 6 : (wOrbit.lv + 1);
        const R = isEvo ? 120 : (70 + 7 * wOrbit.lv);
        for (let i = 0; i < n; i++) {
          const a = window.Weapons.orbitAng + (i / n) * this.TAU;
          const bx = P.x + Math.cos(a) * R;
          const by = P.y + Math.sin(a) * R;

          ctx.globalCompositeOperation = 'lighter';
          this.drawGlow(bx, by, isEvo ? 36 : 28, isEvo ? '#00e5ff' : '#b44dff', 0.85);
          ctx.globalCompositeOperation = 'source-over';

          ctx.save();
          ctx.translate(bx, by);
          ctx.rotate(a + now * 10);
          ctx.fillStyle = isEvo ? '#00e5ff' : '#e9c8ff';
          this.poly(4, isEvo ? 18 : 12, 0, 0.35);
          ctx.fill();
          ctx.restore();
        }
      }
    }

    // 7. Projectiles (Additive)
    ctx.globalCompositeOperation = 'lighter';

    // Player bullets
    for (const b of entities.bullets) {
      if (!isVisible(b.x, b.y) && !b.isStarScythe) continue;
      const bCol = b.col || (b.isCryo ? '#00e5ff' : '#3dfcff');
      if (b.isStarScythe) {
        ctx.strokeStyle = '#ff2d95';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(P.x, P.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      if (b.isBoomerang) {
        this.drawGlow(b.x, b.y, b.r * 2.5, bCol, 0.85);
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(now * 16);
        this.poly(4, b.r * 1.4, 0, 0.35);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = bCol;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
        continue;
      }
      this.drawGlow(b.x, b.y, 16, bCol, 0.8);
      ctx.strokeStyle = b.isCryo ? '#d0f8ff' : '#e8ffff';
      ctx.lineWidth = b.r > 6 ? 6 : 4.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
      ctx.stroke();
    }

    // Enemy bullets
    for (const b of entities.ebullets) {
      if (!isVisible(b.x, b.y)) continue;
      this.drawGlow(b.x, b.y, b.r * 3, '#ff2d95', 0.9);
      ctx.fillStyle = '#ffd0e8';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * 0.75, 0, this.TAU);
      ctx.fill();
    }

    // Missiles
    for (const m of entities.missiles) {
      this.drawGlow(m.x, m.y, 20, '#ff8a3d', 0.9);
      ctx.fillStyle = '#fff3d0';
      ctx.beginPath();
      ctx.arc(m.x, m.y, 4.5, 0, this.TAU);
      ctx.fill();
    }

    // Saws
    for (const s of entities.saws) {
      this.drawGlow(s.x, s.y, s.r * 1.5, '#ff0055', 0.85);
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      this.poly(8, s.r, 0, 0.5);
      ctx.fillStyle = '#ff80aa';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      ctx.restore();
    }

    // Mines
    for (const m of entities.mines) {
      this.drawGlow(m.x, m.y, 22, '#ff3d00', 0.7);
      ctx.fillStyle = '#ff3d00';
      ctx.beginPath();
      ctx.arc(m.x, m.y, 7 + Math.sin(m.pulse) * 2, 0, this.TAU);
      ctx.fill();
    }

    // Particles
    for (const p of entities.particles) {
      if (!isVisible(p.x, p.y)) continue;
      const a = p.life / p.max;
      if (p.isFlame) {
        // Glowing circular expanding plasma flame puffs
        ctx.globalAlpha = Math.min(1, a * 1.3);
        ctx.fillStyle = p.col;
        const progress = 1 - a;
        const rFlame = p.size * (0.6 + progress * 1.4);
        ctx.beginPath();
        ctx.arc(p.x, p.y, rFlame, 0, this.TAU);
        ctx.fill();
      } else {
        ctx.globalAlpha = a;
        ctx.fillStyle = p.col;
        const s = p.size * (0.4 + a * 0.6);
        ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
      }
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // 8. Damage Floating Texts
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of entities.texts) {
      ctx.globalAlpha = Math.min(1, t.life / 0.4);
      ctx.font = t.big ? '900 22px Segoe UI' : '700 14px Segoe UI';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      ctx.strokeText(t.txt, t.x, t.y);
      ctx.fillStyle = t.col;
      ctx.fillText(t.txt, t.x, t.y);
    }
    ctx.globalAlpha = 1;

    ctx.restore();

    // 9. Post-Process (Vignette, Overload rainbow, Hurt flash)
    ctx.drawImage(this.vignette, 0, 0);

    if (hurtFlash > 0) {
      ctx.fillStyle = `rgba(255,30,80,${hurtFlash * 0.5})`;
      ctx.fillRect(0, 0, this.W, this.H);
    }

    if (isOverload) {
      const hue = (now * 180) % 360;
      ctx.fillStyle = `hsla(${hue}, 100%, 50%, 0.08)`;
      ctx.fillRect(0, 0, this.W, this.H);
    }

    // 10. Modern HUD
    this.drawHUD(P, now, banner);
  }

  drawEnemyPath(e) {
    const ctx = this.ctx;
    switch (e.shape) {
      case 'tri':
        ctx.beginPath();
        ctx.moveTo(e.r * 1.25, 0);
        ctx.lineTo(-e.r * 0.8, -e.r * 0.85);
        ctx.lineTo(-e.r * 0.4, 0);
        ctx.lineTo(-e.r * 0.8, e.r * 0.85);
        ctx.closePath();
        break;
      case 'sq':
        this.poly(4, e.r * 1.15, e.rot, 0);
        break;
      case 'dia':
        ctx.beginPath();
        ctx.moveTo(0, -e.r * 1.3);
        ctx.lineTo(e.r * 0.85, 0);
        ctx.lineTo(0, e.r * 1.3);
        ctx.lineTo(-e.r * 0.85, 0);
        ctx.closePath();
        break;
      case 'hex':
        this.poly(6, e.r, e.rot, 0);
        break;
      case 'oct':
        this.poly(8, e.r, e.rot, 0);
        break;
      case 'star':
        this.poly(8, e.r * 1.2, e.rot, 0.6);
        break;
    }
  }

  drawPlayerHull(hull, col) {
    const ctx = this.ctx;
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = col;
    ctx.lineJoin = 'round';
    ctx.fillStyle = '#0b3340';

    ctx.beginPath();
    switch (hull) {
      case 'speed': // Valkyrie
        ctx.moveTo(24, 0);
        ctx.lineTo(-14, -14);
        ctx.lineTo(-8, -4);
        ctx.lineTo(-14, 0);
        ctx.lineTo(-8, 4);
        ctx.lineTo(-14, 14);
        break;
      case 'tank': // Colossus
        ctx.moveTo(18, -12);
        ctx.lineTo(22, 0);
        ctx.lineTo(18, 12);
        ctx.lineTo(-14, 15);
        ctx.lineTo(-10, 0);
        ctx.lineTo(-14, -15);
        break;
      case 'sharp': // Tesla-9
        ctx.moveTo(26, 0);
        ctx.lineTo(0, -10);
        ctx.lineTo(-12, -15);
        ctx.lineTo(-4, 0);
        ctx.lineTo(-12, 15);
        ctx.lineTo(0, 10);
        break;
      case 'ghost': // Specter
        ctx.moveTo(24, 0);
        ctx.lineTo(-4, -18);
        ctx.lineTo(-16, -12);
        ctx.lineTo(-8, 0);
        ctx.lineTo(-16, 12);
        ctx.lineTo(-4, 18);
        break;
      case 'heavy': // Havoc-X
        ctx.moveTo(20, -6);
        ctx.lineTo(24, 0);
        ctx.lineTo(20, 6);
        ctx.lineTo(6, 16);
        ctx.lineTo(-16, 16);
        ctx.lineTo(-12, 0);
        ctx.lineTo(-16, -16);
        ctx.lineTo(6, -16);
        break;
      case 'round': // Nova-Core
        ctx.arc(0, 0, 15, 0, this.TAU);
        break;
      case 'chrono': // Chronos-X
        ctx.moveTo(22, 0);
        ctx.lineTo(4, -14);
        ctx.lineTo(-16, -16);
        ctx.lineTo(-6, -4);
        ctx.lineTo(-6, 4);
        ctx.lineTo(-16, 16);
        ctx.lineTo(4, 14);
        break;
      default: // Apex-1 Standard
        ctx.moveTo(20, 0);
        ctx.lineTo(-12, -13);
        ctx.lineTo(-6, 0);
        ctx.lineTo(-12, 13);
        break;
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (hull === 'round') {
      ctx.beginPath();
      ctx.arc(0, 0, 21, 0, this.TAU);
      ctx.strokeStyle = '#ffd23f';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else if (hull === 'chrono') {
      ctx.beginPath();
      ctx.moveTo(-2, -9);
      ctx.lineTo(10, 0);
      ctx.lineTo(-2, 9);
      ctx.strokeStyle = '#3dfcff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Cockpit light
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(3, 0, 3.5, 0, this.TAU);
    ctx.fill();
  }

  drawHUD(P, now, banner) {
    const ctx = this.ctx;
    const W = this.W;
    const H = this.H;

    ctx.textBaseline = 'alphabetic';

    // Top XP Bar
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(0, 0, W, 8);
    const xg = ctx.createLinearGradient(0, 0, W, 0);
    xg.addColorStop(0, '#3dfcff');
    xg.addColorStop(1, '#b44dff');
    ctx.fillStyle = xg;
    ctx.fillRect(0, 0, W * Math.min(1, P.xp / P.next), 8);

    // HP Bar
    const hx = 22, hy = 22, hw = 240, hh = 16;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    this.rrect(hx - 2, hy - 2, hw + 4, hh + 4, 8);
    ctx.fill();

    const hg = ctx.createLinearGradient(hx, 0, hx + hw, 0);
    hg.addColorStop(0, '#ff2d95');
    hg.addColorStop(1, '#ff3366');
    ctx.fillStyle = hg;
    this.rrect(hx, hy, Math.max(hh, hw * Math.max(0, P.hp / P.maxHp)), hh, 6);
    if (P.hp > 0) ctx.fill();

    // HP text
    ctx.font = '700 12px Segoe UI';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.ceil(P.hp)} / ${P.maxHp} HP`, hx + hw / 2, hy + 12.5);

    // Row 2: Level Badge, Dash Meter, Secondary Ability
    ctx.textAlign = 'left';
    ctx.font = '900 16px Segoe UI';
    ctx.fillStyle = '#3dfcff';
    ctx.fillText('LV ' + P.lvl, hx, hy + 35);

    const lvWidth = ctx.measureText('LV ' + P.lvl).width;

    // Dash Meter
    const dr = 1 - Math.max(0, Math.min(1, P.dashCd / (P.dashMaxCd || 1.0)));
    const dx = hx + lvWidth + 12, dy = hy + 26;
    const dashBarW = 50;
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    this.rrect(dx, dy, dashBarW, 8, 4);
    ctx.fill();
    ctx.fillStyle = dr >= 1 ? '#3dfcff' : '#2a7f99';
    this.rrect(dx, dy, Math.max(8, dashBarW * dr), 8, 4);
    ctx.fill();
    ctx.font = '700 10px Segoe UI';
    ctx.fillStyle = dr >= 1 ? '#3dfcff' : '#888';
    ctx.fillText('DASH', dx + dashBarW + 5, dy + 7.5);

    // Secondary Skill Pill
    const charKey = (window.GameState && window.GameState.selectedCharacter) || 'apex';
    const charDef = window.GAME_DATA.CHARACTERS[charKey] || window.GAME_DATA.CHARACTERS.apex;
    const secDef = charDef.secondary;
    const secMaxCd = P.secondaryMaxCd || (secDef ? secDef.cd : 10);
    const secCd = Math.max(0, P.secondaryCd || 0);
    const secReady = secCd <= 0;
    const secPct = 1 - Math.min(1, secCd / secMaxCd);

    const dashTextW = ctx.measureText('DASH').width;
    const sx = dx + dashBarW + dashTextW + 14, sy = hy + 26;
    const secBarW = 55;
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    this.rrect(sx, sy, secBarW, 8, 4);
    ctx.fill();
    ctx.fillStyle = secReady ? '#ffd23f' : '#b38f24';
    this.rrect(sx, sy, Math.max(8, secBarW * secPct), 8, 4);
    ctx.fill();

    ctx.font = '700 10px Segoe UI';
    ctx.fillStyle = secReady ? '#ffd23f' : '#888';
    const secIcon = secDef ? secDef.icon : '⚡';
    const secLabel = secReady ? `${secIcon} [Q]` : `${secIcon} ${Math.ceil(secCd)}s`;
    ctx.fillText(secLabel, sx + secBarW + 5, sy + 7.5);

    // Row 3: NEON OVERLOAD Gauge (Special Skill)
    const ox = hx, oy = hy + 44;
    const overBarW = 125;
    const isOverActive = Boolean(window.GameState.isOverload);
    const onCooldown = (P.overloadCooldown || 0) > 0;

    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    this.rrect(ox, oy, overBarW, 9, 4.5);
    ctx.fill();

    if (isOverActive) {
      const remainPct = Math.max(0, Math.min(1, (window.GameState.overloadTimer || 0) / 8.5));
      const og = ctx.createLinearGradient(ox, 0, ox + overBarW, 0);
      og.addColorStop(0, '#3dfcff');
      og.addColorStop(1, '#ffd23f');
      ctx.fillStyle = og;
      this.rrect(ox, oy, Math.max(9, overBarW * remainPct), 9, 4.5);
      ctx.fill();

      ctx.font = '900 11px Segoe UI';
      ctx.fillStyle = '#3dfcff';
      ctx.fillText(`⚡ OVERLOAD (${Math.ceil(window.GameState.overloadTimer || 0)}s)`, ox + overBarW + 8, oy + 8);
    } else if (onCooldown) {
      const cdPct = 1 - Math.min(1, P.overloadCooldown / 15.0);
      ctx.fillStyle = 'rgba(100, 150, 255, 0.45)';
      this.rrect(ox, oy, Math.max(6, overBarW * cdPct), 9, 4.5);
      ctx.fill();

      const lang = (window.SaveSystem && window.SaveSystem.getSettings().lang) || 'de';
      ctx.font = '700 10px Segoe UI';
      ctx.fillStyle = '#6495ed';
      ctx.fillText(`❄ ${lang === 'en' ? 'COOLDOWN' : 'ABKLINGZEIT'} ${Math.ceil(P.overloadCooldown)}s`, ox + overBarW + 8, oy + 8);
    } else {
      const overPct = Math.min(1, (P.overloadGauge || 0) / 100);
      const isOverReady = overPct >= 1;
      const og = ctx.createLinearGradient(ox, 0, ox + overBarW, 0);
      og.addColorStop(0, '#ffd23f');
      og.addColorStop(1, '#ff0055');
      ctx.fillStyle = og;
      this.rrect(ox, oy, Math.max(9, overBarW * overPct), 9, 4.5);
      ctx.fill();

      ctx.font = '900 11px Segoe UI';
      ctx.fillStyle = isOverReady ? '#ffd23f' : '#aaa';
      ctx.fillText(isOverReady ? '⚡ OVERLOAD [E]!' : `⚡ OVERLOAD ${Math.floor(P.overloadGauge || 0)}%`, ox + overBarW + 8, oy + 8);
    }

    // Timer (Center)
    ctx.textAlign = 'center';
    ctx.font = '900 34px Segoe UI';
    ctx.fillStyle = '#ffffff';
    const isMinigameMode = window.GameState.selectedMode === 'minigame';
    let timeDisplay = window.GameState.time;
    if (isMinigameMode) {
      timeDisplay = Math.max(0, 180 - window.GameState.time);
    }
    const m = Math.floor(timeDisplay / 60);
    const s = Math.floor(timeDisplay % 60);
    const timeStr = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    ctx.fillText(timeStr, W / 2, 50);

    // Minigame-Modus Header
    if (isMinigameMode) {
      const lang = (window.SaveSystem && window.SaveSystem.getSettings().lang) || 'de';
      ctx.font = '900 13px Segoe UI';
      ctx.fillStyle = '#00ffcc';
      const coresCount = window.GameState.minigameCores || 0;
      const mgText = lang === 'en' ? `🎯 MINIGAME · CORES: ${coresCount}` : `🎯 MINISPIEL · KERNE: ${coresCount}`;
      ctx.fillText(mgText, W / 2, 22);
    } else if (window.GameState.selectedMode === 'endless') {
      const wave = window.GameState.endlessWave || 1;
      const wRemain = Math.ceil(window.GameState.endlessWaveTimer || 0);
      const wM = Math.floor(wRemain / 60);
      const wS = Math.floor(wRemain % 60);
      const wStr = `${String(wM).padStart(2, '0')}:${String(wS).padStart(2, '0')}`;
      const lang = (window.SaveSystem && window.SaveSystem.getSettings().lang) || 'de';
      ctx.font = '900 13px Segoe UI';
      ctx.fillStyle = '#3dfcff';
      const waveText = lang === 'en' ? `🌊 WAVE ${wave} · NEXT IN ${wStr}` : `🌊 WELLE ${wave} · NÄCHSTE IN ${wStr}`;
      ctx.fillText(waveText, W / 2, 22);
    }

    // In-Run Portal Challenge Bar
    const pc = window.Entities && window.Entities.portalChallenge;
    if (pc && pc.active) {
      const cw = 290, ch = 18, cx = (W - cw) / 2, cy = 84;
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      this.rrect(cx - 2, cy - 2, cw + 4, ch + 4, 8);
      ctx.fill();
      ctx.strokeStyle = '#00ffcc';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      const cPct = Math.min(1, pc.collected / pc.target);
      ctx.fillStyle = '#00ffcc';
      this.rrect(cx, cy, Math.max(10, cw * cPct), ch, 6);
      ctx.fill();

      ctx.textAlign = 'center';
      ctx.font = '900 12px Segoe UI';
      ctx.fillStyle = '#07020f';
      ctx.fillText(`🌀 DIMENSIONS-KERNE: ${pc.collected} / ${pc.target} (${Math.ceil(pc.timer)}s)`, W / 2, cy + 13.5);
    }

    // Nächster Boss Anzeige (unter dem Timer, wenn kein Boss aktiv im Kampf ist)
    if (!window.GameState.currentBoss && window.GameState.getNextBossInfo) {
      const nb = window.GameState.getNextBossInfo();
      if (nb && !nb.active && nb.name) {
        const nbM = Math.floor(nb.timeUntil / 60);
        const nbS = Math.floor(nb.timeUntil % 60);
        const nbTimeStr = `${String(nbM).padStart(2, '0')}:${String(nbS).padStart(2, '0')}`;
        const isImminent = nb.timeUntil <= 30;

        const lang = (window.SaveSystem && window.SaveSystem.getSettings().lang) || 'de';
        ctx.font = isImminent ? '900 13px Segoe UI' : '700 12px Segoe UI';
        const bossText = isImminent
          ? (lang === 'en' ? `⚠ BOSS APPROACHING IN ${nbTimeStr} (${nb.name.toUpperCase()})` : `⚠ BOSS NAHT IN ${nbTimeStr} (${nb.name.toUpperCase()})`)
          : (lang === 'en' ? `💀 NEXT BOSS IN ${nbTimeStr} · ${nb.name}` : `💀 NÄCHSTER BOSS IN ${nbTimeStr} · ${nb.name}`);
        const pillW = ctx.measureText(bossText).width + 24;
        const pillX = (W - pillW) / 2;
        const pillY = 58;

        ctx.fillStyle = isImminent
          ? (Math.floor(now * 4) % 2 === 0 ? 'rgba(255, 0, 85, 0.45)' : 'rgba(255, 50, 50, 0.25)')
          : 'rgba(0, 0, 0, 0.45)';
        this.rrect(pillX, pillY, pillW, 20, 10);
        ctx.fill();
        ctx.strokeStyle = isImminent ? '#ff0055' : 'rgba(255, 210, 63, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = isImminent ? '#ff3366' : '#ffd23f';
        ctx.fillText(bossText, W / 2, pillY + 14);
      }
    }

    // Kills & Credits (Right top)
    ctx.textAlign = 'right';
    ctx.font = '800 22px Segoe UI';
    ctx.fillStyle = '#ff3366';
    ctx.fillText('☠ ' + window.GameState.kills, W - 24, 42);

    ctx.font = '700 16px Segoe UI';
    ctx.fillStyle = '#00ffcc';
    ctx.fillText('💎 ' + (window.GameState.creditsEarned || 0), W - 24, 68);

    // Bottom Weapon & Evolution Rack
    let wx = 22;
    const wy = H - 64;
    const WL = window.GameState.weapons;
    for (const k in WL) {
      const w = WL[k];
      if (!w || !w.lv) continue;
      const def = window.GAME_DATA.WEAPONS[k];
      const isEvo = w.evolved;

      ctx.fillStyle = isEvo ? 'rgba(50,10,80,0.85)' : 'rgba(20,5,40,0.8)';
      this.rrect(wx, wy, 48, 48, 10);
      ctx.fill();
      ctx.strokeStyle = isEvo ? '#ffd23f' : 'rgba(61,252,255,0.5)';
      ctx.lineWidth = isEvo ? 2.5 : 1.5;
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.font = '24px "Segoe UI Emoji"';
      ctx.fillText(isEvo ? '🌟' : def.icon, wx + 24, wy + 32);

      ctx.font = '900 11px Segoe UI';
      ctx.fillStyle = isEvo ? '#ffd23f' : '#3dfcff';
      ctx.fillText(isEvo ? 'EVO' : `LV ${w.lv}`, wx + 24, wy + 60);
      wx += 56;
    }

    // Active Boss Bar
    const boss = window.GameState.currentBoss;
    if (boss) {
      const bw = Math.min(480, W - 260);
      const bx = (W - bw) / 2;
      const by = 76;
      const bossDistM = Math.round(Math.hypot(boss.x - P.x, boss.y - P.y) / 10);
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      this.rrect(bx - 2, by - 2, bw + 4, 16, 7);
      ctx.fill();

      ctx.fillStyle = boss.isSurging ? '#ffd23f' : (boss.col || '#ff2d95');
      this.rrect(bx, by, Math.max(12, bw * (boss.hp / boss.maxHp)), 12, 6);
      ctx.fill();

      ctx.textAlign = 'center';
      ctx.font = '900 14px Segoe UI';
      ctx.fillStyle = '#ffffff';
      const lang = (window.SaveSystem && window.SaveSystem.getSettings().lang) || 'de';
      const huntingSuffix = boss.isSurging ? (lang === 'en' ? ' · ⚡ HUNTING!' : ' · ⚡ JAGT!') : '';
      ctx.fillText('👑 ' + boss.name.toUpperCase() + ' · ' + bossDistM + 'm' + huntingSuffix, W / 2, by + 30);

      // Off-screen boss directional edge indicator
      const scrX = (boss.x - window.GameState.cam.x) + W / 2;
      const scrY = (boss.y - window.GameState.cam.y) + H / 2;
      if (scrX < 28 || scrX > W - 28 || scrY < 28 || scrY > H - 28) {
        const ang = Math.atan2(boss.y - window.GameState.cam.y, boss.x - window.GameState.cam.x);
        const pad = 54;
        const dxScr = scrX - W / 2;
        const dyScr = scrY - H / 2;
        const halfW = Math.max(40, W / 2 - pad);
        const halfH = Math.max(40, H / 2 - pad);
        const edgeScale = Math.min(halfW / (Math.abs(dxScr) || 1e-6), halfH / (Math.abs(dyScr) || 1e-6));
        const ix = W / 2 + dxScr * edgeScale;
        const iy = H / 2 + dyScr * edgeScale;
        const markerCol = boss.isSurging ? '#ffd23f' : (boss.col || '#ff2d95');

        ctx.save();
        // Faint dashed guide beam pointing toward edge marker
        ctx.strokeStyle = markerCol;
        ctx.globalAlpha = 0.55 + Math.sin(now * 8) * 0.25;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(ix - Math.cos(ang) * 56, iy - Math.sin(ang) * 56);
        ctx.lineTo(ix - Math.cos(ang) * 18, iy - Math.sin(ang) * 18);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;

        // Pulsing lock-on ring + directional arrow at screen edge
        ctx.save();
        ctx.translate(ix, iy);
        ctx.rotate(ang);
        ctx.strokeStyle = markerCol;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 21 + Math.sin(now * 9) * 3, 0, this.TAU);
        ctx.stroke();

        ctx.fillStyle = markerCol;
        ctx.beginPath();
        ctx.moveTo(16, 0);
        ctx.lineTo(-10, -11);
        ctx.lineTo(-5, 0);
        ctx.lineTo(-10, 11);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        // Distance pill badge tucked inward from edge
        const lx = Math.max(58, Math.min(W - 58, ix - Math.cos(ang) * 44));
        const ly = Math.max(24, Math.min(H - 24, iy - Math.sin(ang) * 44));
        const label = '👑 ' + bossDistM + 'm' + (boss.isSurging ? ' ⚡' : '');
        ctx.font = '900 12px Segoe UI';
        const tw = ctx.measureText(label).width + 14;
        ctx.fillStyle = 'rgba(10, 2, 24, 0.85)';
        this.rrect(lx - tw / 2, ly - 11, tw, 22, 6);
        ctx.fill();
        ctx.strokeStyle = markerCol;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, lx, ly);
        ctx.restore();
      }
    }

    // Active Chaos Modifier Badge
    if (window.GameState.activeChaosEvent) {
      ctx.textAlign = 'center';
      ctx.font = '900 13px Segoe UI';
      ctx.fillStyle = '#ff00aa';
      ctx.fillText('⚡ CHAOS AKTIV: ' + window.GameState.activeChaosEvent.toUpperCase().replace('_', ' '), W / 2, 118);
    } else if (window.GameState.selectedMode === 'sandbox') {
      ctx.textAlign = 'center';
      ctx.font = '900 13px Segoe UI';
      ctx.fillStyle = '#ffd23f';
      ctx.fillText('🛠️ TEST-LABOR AKTIV · [TAB] oder [F2] für Test-Menü · ' + (window.GameState.sandboxGodMode ? '🛡️ GOTT-MODUS AN' : ''), W / 2, 118);
    }

    // Corner Minimap (Bottom-Right Radar)
    this.drawMinimap(P, window.Entities, now);

    // In-game Banner
    if (banner && banner.t > 0) {
      const a = Math.max(0, Math.min(1, banner.t / 0.5));
      ctx.save();
      ctx.translate(W / 2, H * 0.32);
      ctx.globalAlpha = a;
      ctx.textAlign = 'center';
      ctx.font = '900 52px Segoe UI';
      ctx.fillStyle = banner.col || '#3dfcff';
      ctx.shadowColor = banner.col || '#3dfcff';
      ctx.shadowBlur = 25;
      ctx.fillText(banner.text, 0, 0);
      ctx.restore();
    }
  }

  drawMinimap(P, entities, now) {
    if (!P || !entities) return;
    const ctx = this.ctx;
    const W = this.W;
    const H = this.H;
    const r = Math.min(68, Math.max(48, Math.floor(Math.min(W, H) * 0.095)));
    const cx = W - r - 20;
    const cy = H - r - 20;
    const range = 1800;
    const rangeSq = range * range;
    const scale = r / range;

    ctx.save();

    // Radar header label
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.font = '900 10px Segoe UI';
    ctx.fillStyle = 'rgba(61,252,255,0.85)';
    ctx.fillText('RADAR', cx, cy - r - 5);

    // Clip into circular radar area
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, this.TAU);
    ctx.fillStyle = 'rgba(7, 2, 20, 0.82)';
    ctx.fill();
    ctx.save();
    ctx.clip();

    // Grid circles & crosshairs
    ctx.strokeStyle = 'rgba(61,252,255,0.16)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.35, 0, this.TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.7, 0, this.TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - r, cy);
    ctx.lineTo(cx + r, cy);
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx, cy + r);
    ctx.stroke();

    // Authentic clockwise radar sweep beam + trailing phosphor fan
    const sweepSpeed = 2.0; // Eine Umdrehung in ~3.1s
    const sweepFront = (now * sweepSpeed) % this.TAU;
    const sweepSpan = 0.85;
    const trailSteps = 5;
    for (let s = 0; s < trailSteps; s++) {
      const a0 = sweepFront - (sweepSpan * (s + 1)) / trailSteps;
      const a1 = sweepFront - (sweepSpan * s) / trailSteps;
      ctx.fillStyle = `rgba(61, 252, 255, ${(0.22 * (trailSteps - s)) / trailSteps})`;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, a0, a1);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(160, 255, 255, 0.9)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(sweepFront) * r, cy + Math.sin(sweepFront) * r);
    ctx.stroke();

    // Map Hazards
    if (entities.hazards && entities.hazards.length) {
      ctx.fillStyle = 'rgba(255, 112, 67, 0.45)';
      for (let i = 0; i < entities.hazards.length; i++) {
        const h = entities.hazards[i];
        const dx = h.x - P.x, dy = h.y - P.y;
        if (dx * dx + dy * dy > rangeSq) continue;
        const hx = cx + dx * scale, hy = cy + dy * scale;
        ctx.beginPath();
        ctx.arc(hx, hy, Math.max(2, (h.r || 30) * scale), 0, this.TAU);
        ctx.fill();
      }
    }

    // Power-ups (gold/cyan diamonds)
    if (entities.powerups && entities.powerups.length) {
      ctx.fillStyle = '#ffd23f';
      for (let i = 0; i < entities.powerups.length; i++) {
        const p = entities.powerups[i];
        const dx = p.x - P.x, dy = p.y - P.y;
        if (dx * dx + dy * dy > rangeSq) continue;
        const px = cx + dx * scale, py = cy + dy * scale;
        ctx.fillRect(px - 2, py - 2, 4, 4);
      }
    }

    // Allied Turrets
    if (entities.turrets && entities.turrets.length) {
      ctx.fillStyle = '#5dff6a';
      for (let i = 0; i < entities.turrets.length; i++) {
        const t = entities.turrets[i];
        const dx = t.x - P.x, dy = t.y - P.y;
        if (dx * dx + dy * dy > rangeSq) continue;
        ctx.fillRect(cx + dx * scale - 2, cy + dy * scale - 2, 4, 4);
      }
    }

    // Enemies (only visible when swept by radar beam, then linger with phosphor afterglow)
    const enemies = entities.enemies;
    const fadeDur = 2.4; // Bleibt jetzt 2.4s sichtbar statt 1.15s
    if (enemies && enemies.length) {
      for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (e.dead || e.isBoss) continue;
        const dx = e.x - P.x, dy = e.y - P.y;
        if (dx * dx + dy * dy <= rangeSq) {
          const ang = (Math.atan2(dy, dx) + this.TAU) % this.TAU;
          const behind = (sweepFront - ang + this.TAU) % this.TAU;
          if (behind <= 0.28) {
            e.radarPingTime = now;
            e.radarPingDx = dx;
            e.radarPingDy = dy;
          }
        }
        const pingAge = e.radarPingTime !== undefined ? (now - e.radarPingTime) : 999;
        if (pingAge >= 0 && pingAge < fadeDur) {
          const alpha = Math.max(0.18, Math.pow(1 - pingAge / fadeDur, 0.9));
          const isHeavy = e.type === 'tank' || e.type === 'summoner' || e.type === 'shielder';
          const fresh = pingAge < 0.22;
          const bx = cx + e.radarPingDx * scale;
          const by = cy + e.radarPingDy * scale;
          const sz = (isHeavy ? 3.8 : 2.5) + (fresh ? 1.5 : 0);
          ctx.globalAlpha = alpha;
          ctx.fillStyle = fresh ? '#ffffff' : (isHeavy ? '#ff9900' : '#ff3366');
          ctx.fillRect(bx - sz * 0.5, by - sz * 0.5, sz, sz);
        }
      }
      ctx.globalAlpha = 1;
    }

    // Center Player marker (rotated in move direction)
    const pAng = Math.atan2(P.my || 0, P.mx || 1);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(pAng);
    ctx.fillStyle = '#3dfcff';
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(-4, -4);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    ctx.restore(); // end clip

    // Radar outer neon bezel
    ctx.strokeStyle = 'rgba(61, 252, 255, 0.72)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, this.TAU);
    ctx.stroke();

    // Boss radar ping (clamped to radar rim if far away, fades between sweeps)
    const boss = window.GameState && window.GameState.currentBoss;
    if (boss && !boss.dead) {
      const dx = boss.x - P.x, dy = boss.y - P.y;
      const ang = (Math.atan2(dy, dx) + this.TAU) % this.TAU;
      const behind = (sweepFront - ang + this.TAU) % this.TAU;
      if (behind <= 0.32) {
        boss.radarPingTime = now;
        boss.radarPingDx = dx;
        boss.radarPingDy = dy;
      }
      const bossFadeDur = 2.8; // Bleibt jetzt 2.8s sichtbar
      const pingAge = boss.radarPingTime !== undefined ? (now - boss.radarPingTime) : 999;
      if (pingAge >= 0 && pingAge < bossFadeDur) {
        const pdx = boss.radarPingDx, pdy = boss.radarPingDy;
        const dist = Math.hypot(pdx, pdy) || 1;
        const clampedR = Math.min(r - 7, dist * scale);
        const pingAng = Math.atan2(pdy, pdx);
        const bx = cx + Math.cos(pingAng) * clampedR;
        const by = cy + Math.sin(pingAng) * clampedR;
        const bCol = boss.isSurging ? '#ffd23f' : '#ff2d95';
        const alpha = Math.max(0.25, Math.pow(1 - pingAge / bossFadeDur, 0.8));

        ctx.globalAlpha = alpha;
        ctx.strokeStyle = bCol;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(bx, by, 5 + (pingAge / bossFadeDur) * 9, 0, this.TAU);
        ctx.stroke();

        ctx.fillStyle = pingAge < 0.2 ? '#ffffff' : bCol;
        ctx.beginPath();
        ctx.arc(bx, by, 4.5, 0, this.TAU);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(bx, by, 2, 0, this.TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    ctx.restore();
  }
}

window.Renderer = new RenderEngine();
