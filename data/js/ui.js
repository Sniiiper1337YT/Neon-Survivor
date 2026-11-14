// ==========================================
// NEON SURVIVOR - UI & MENUS ENGINE
// Title, Character Select, Map Select, Mode Select,
// Skilltree Shop, 50 Achievements, Settings, Level-Up
// ==========================================
'use strict';

class UIEngine {
  constructor() {
    this.activeScreen = 'title';
    this.toastTimer = null;
    this.isSandboxOpen = false;
    this.sandboxActiveTab = 'weapons';
  }

  showScreen(id) {
    const screens = document.querySelectorAll('.ov');
    screens.forEach(s => s.classList.toggle('on', s.id === id));
    this.activeScreen = id;
    if (window.SoundSystem) window.SoundSystem.sfx('click');
  }

  applyLanguage(lang) {
    if (!lang) lang = (window.SaveSystem && window.SaveSystem.getSettings().lang) || 'de';
    if (!window.GAME_DATA || !window.GAME_DATA.UI_TEXTS) return;
    const t = window.GAME_DATA.UI_TEXTS[lang] || window.GAME_DATA.UI_TEXTS.de;

    document.documentElement.lang = lang;
    const sel = document.getElementById('selLang');
    if (sel && sel.value !== lang) sel.value = lang;

    const setT = (id, text) => { const el = document.getElementById(id); if (el) el.innerText = text; };

    // Title Screen
    const subEl = document.querySelector('#title .sub');
    if (subEl) subEl.innerText = t.subTitle;
    setT('btnPlay', t.play);
    setT('btnChars', t.ships);
    setT('btnMaps', t.maps);
    setT('btnModes', t.modes);
    setT('btnSkill', t.skills);
    setT('btnAchs', t.achs);
    setT('btnStats', t.stats);
    setT('btnSettings', t.settings);

    // Controls hint & dev footer in title
    const titleDivs = document.querySelectorAll('#title > div');
    if (titleDivs.length >= 2) {
      titleDivs[titleDivs.length - 2].innerHTML = t.controlsHint;
      const ver = (window.NeonNative && window.NeonNative.appVersion) || '1.0.1';
      titleDivs[titleDivs.length - 1].innerHTML = `Neon Survivor <span id="lblCurrentVer">v${ver}</span> &nbsp;·&nbsp; ${t.footerDev}`;
    }

    // Modal Titles
    const setModalH2 = (id, text) => { const el = document.querySelector(`#${id} h2`); if (el) el.innerText = text; };
    const setModalH1 = (id, text) => { const el = document.querySelector(`#${id} h1`); if (el) el.innerText = text; };
    setModalH2('charModal', t.charModalTitle);
    setModalH2('mapModal', t.mapModalTitle);
    setModalH2('modeModal', t.modeModalTitle);
    setModalH2('skillModal', t.skillModalTitle);
    setModalH2('achModal', t.achModalTitle);
    setModalH2('statsModal', t.statsModalTitle);
    setModalH2('settingsModal', t.settingsModalTitle);

    // Modal Done / Back buttons
    setT('btnCharBack', t.doneBtn);
    setT('btnMapBack', t.doneBtn);
    setT('btnModeBack', t.doneBtn);
    setT('btnSkillBack', t.doneBtn);
    setT('btnAchBack', t.doneBtn);
    setT('btnStatsBack', t.doneBtn);
    setT('btnSettingsBack', t.saveBackBtn);

    // Settings elements & options
    setT('btnFullscreen', t.fullscreenBtn);
    setT('btnExportSave', t.exportSaveBtn);
    setT('btnImportSave', t.importSaveBtn);
    setT('btnResetSave', t.resetSaveBtn);

    const selQ = document.getElementById('selQuality');
    if (selQ && selQ.options.length >= 3) {
      selQ.options[0].text = lang === 'en' ? 'High (Full Glow & Particles)' : 'Hoch (Voller Glow & Partikel)';
      selQ.options[1].text = lang === 'en' ? 'Medium' : 'Mittel';
      selQ.options[2].text = lang === 'en' ? 'Low (Best FPS)' : 'Niedrig (Beste FPS)';
    }
    const selF = document.getElementById('selFps');
    if (selF && selF.options.length >= 4) {
      selF.options[0].text = lang === 'en' ? 'Uncapped' : 'Unbegrenzt';
    }

    // In-Game Screens (Pause, GameOver, Victory, LevelUp)
    setModalH1('pause', t.pauseTitle);
    setT('btnResume', t.resumeBtn);
    setT('btnPauseSettings', t.pauseSettingsBtn);
    setT('btnQuit', t.quitBtn);

    setModalH1('over', t.gameOverTitle);
    setT('btnAgain', t.playAgainBtn);
    setT('btnOverMenu', t.overMenuBtn);

    setModalH1('victory', t.victoryTitle);
    setT('btnVicAgain', t.vicAgainBtn);

    setModalH1('levelup', t.levelUpTitle);
    const lvlSub = document.querySelector('#levelup > div');
    if (lvlSub) lvlSub.innerHTML = lang === 'en' ? 'Choose an upgrade &nbsp;(1 / 2 / 3 or Click)' : 'Wähle ein Upgrade &nbsp;(1 / 2 / 3 oder Klick)';
    setT('rerollBtn', t.rerollBtn);

    // Update banner
    setT('btnUpdateDownload', t.updateDlBtn);
    setT('btnUpdateDismiss', t.updateDismissBtn);

    // Refresh whichever modal is currently active
    if (this.activeScreen === 'charModal') this.renderCharacterSelect();
    else if (this.activeScreen === 'mapModal') this.renderMapSelect();
    else if (this.activeScreen === 'modeModal') this.renderModeSelect();
    else if (this.activeScreen === 'skillModal') this.renderSkilltree();
    else if (this.activeScreen === 'achModal') this.renderAchievements();
    else if (this.activeScreen === 'statsModal') this.renderStats();
    else if (this.activeScreen === 'settingsModal') this.renderKeybindings();
    else if (this.activeScreen === 'pause') this.renderPauseSummary();
  }

  showToast(text, duration = 2500) {
    let t = document.getElementById('toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      t.className = 'toast';
      document.body.appendChild(t);
    }
    t.innerText = text;
    t.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => t.classList.remove('show'), duration);
  }

  showAchievementPopup(id) {
    const def = window.GAME_DATA.ACHIEVEMENTS[id];
    if (!def) return;
    const lang = window.SaveSystem.getSettings().lang || 'de';
    const title = def.title[lang] || def.title.de;
    const desc = def.desc[lang] || def.desc.de;

    const popup = document.createElement('div');
    popup.className = 'ach-popup';
    popup.innerHTML = `
      <div class="ach-icon">${def.icon}</div>
      <div class="ach-info">
        <div class="ach-badge">${lang === 'en' ? '★ ACHIEVEMENT UNLOCKED ★' : '★ ERFOLG FREIGESCHALTET ★'}</div>
        <div class="ach-name">${title}</div>
        <div class="ach-desc">${desc} (+150 💎)</div>
      </div>
    `;
    document.body.appendChild(popup);
    setTimeout(() => popup.classList.add('in'), 50);
    setTimeout(() => {
      popup.classList.remove('in');
      setTimeout(() => {
        if (popup.remove) popup.remove();
        else if (popup.parentNode) popup.parentNode.removeChild(popup);
      }, 400);
    }, 3800);
  }

  showBanner(text, col = '#3dfcff') {
    if (window.GameState) {
      window.GameState.banner = { text, t: 2.2, col };
    }
  }

  renderCharacterSelect() {
    const container = document.getElementById('charGrid');
    if (!container) return;
    container.innerHTML = '';
    const unlocked = window.SaveSystem.data.unlockedCharacters;
    const selected = window.SaveSystem.data.selectedCharacter;
    const lang = window.SaveSystem.getSettings().lang || 'de';

    for (const k in window.GAME_DATA.CHARACTERS) {
      const c = window.GAME_DATA.CHARACTERS[k];
      const isUnlocked = unlocked.includes(k);
      const isSel = selected === k;

      const card = document.createElement('div');
      card.className = `menu-card ${isSel ? 'sel' : ''} ${!isUnlocked ? 'locked' : ''}`;
      card.innerHTML = `
        <div class="card-icon" style="color:${c.col}">${c.name[0]}</div>
        <div class="card-title">${c.name}</div>
        <div class="card-tag" style="background:${c.col}44">${c.role[lang] || c.role.de}</div>
        <div class="card-desc">
          <b>Waffe:</b> ${window.GAME_DATA.WEAPONS[c.weapon].name[lang]}<br>
          <b>HP:</b> ${c.stats.hp} &nbsp;·&nbsp; <b>SPD:</b> ${c.stats.spd}
        </div>
        ${!isUnlocked ? `<div class="lock-req">🔒 ${c.unlock[lang] || c.unlock.de}</div>` : ''}
      `;

      if (isUnlocked) {
        card.onclick = () => {
          window.SaveSystem.data.selectedCharacter = k;
          window.SaveSystem.save();
          this.renderCharacterSelect();
          if (window.SoundSystem) window.SoundSystem.sfx('click');
        };
      }
      container.appendChild(card);
    }
  }

  renderMapSelect() {
    const container = document.getElementById('mapGrid');
    if (!container) return;
    container.innerHTML = '';
    const unlocked = window.SaveSystem.data.unlockedMaps;
    const selected = window.SaveSystem.data.selectedMap;
    const lang = window.SaveSystem.getSettings().lang || 'de';

    for (const k in window.GAME_DATA.MAPS) {
      const m = window.GAME_DATA.MAPS[k];
      const isUnlocked = unlocked.includes(k);
      const isSel = selected === k;

      const card = document.createElement('div');
      card.className = `menu-card ${isSel ? 'sel' : ''} ${!isUnlocked ? 'locked' : ''}`;
      card.innerHTML = `
        <div class="card-icon" style="color:${m.colTheme}">🗺️</div>
        <div class="card-title">${m.name[lang] || m.name.de}</div>
        <div class="card-desc">${m.desc[lang] || m.desc.de}</div>
        ${!isUnlocked ? `<div class="lock-req">🔒 ${m.unlock[lang] || m.unlock.de}</div>` : ''}
      `;

      if (isUnlocked) {
        card.onclick = () => {
          window.SaveSystem.data.selectedMap = k;
          window.SaveSystem.save();
          this.renderMapSelect();
          if (window.SoundSystem) window.SoundSystem.sfx('click');
        };
      }
      container.appendChild(card);
    }
  }

  renderModeSelect() {
    const container = document.getElementById('modeGrid');
    if (!container) return;
    container.innerHTML = '';
    const unlocked = window.SaveSystem.data.unlockedModes;
    const selected = window.SaveSystem.data.selectedMode;
    const lang = window.SaveSystem.getSettings().lang || 'de';

    for (const k in window.GAME_DATA.MODES) {
      const m = window.GAME_DATA.MODES[k];
      const isUnlocked = unlocked.includes(k);
      const isSel = selected === k;

      const card = document.createElement('div');
      card.className = `menu-card ${isSel ? 'sel' : ''} ${!isUnlocked ? 'locked' : ''}`;
      card.innerHTML = `
        <div class="card-icon">⚡</div>
        <div class="card-title">${m.name[lang] || m.name.de}</div>
        <div class="card-desc">${m.desc[lang] || m.desc.de}</div>
        ${!isUnlocked ? `<div class="lock-req">🔒 ${m.unlock[lang] || m.unlock.de}</div>` : ''}
      `;

      if (isUnlocked) {
        card.onclick = () => {
          window.SaveSystem.data.selectedMode = k;
          window.SaveSystem.save();
          this.renderModeSelect();
          if (window.SoundSystem) window.SoundSystem.sfx('click');
        };
      }
      container.appendChild(card);
    }
  }

  renderSkilltree() {
    const container = document.getElementById('skillGrid');
    if (!container) return;
    container.innerHTML = '';
    const lang = (window.SaveSystem && window.SaveSystem.getSettings().lang) || 'de';
    const t = window.GAME_DATA.UI_TEXTS[lang] || window.GAME_DATA.UI_TEXTS.de;
    const creditsEl = document.getElementById('skillCredits');
    if (creditsEl) creditsEl.innerText = window.SaveSystem.getCredits().toLocaleString(lang === 'en' ? 'en-US' : 'de-DE');

    const skillsDef = window.GAME_DATA.SKILLS;
    for (const skillId in skillsDef) {
      const s = skillsDef[skillId];
      const name = s.name[lang] || s.name.de;
      const desc = s.desc[lang] || s.desc.de;
      const info = window.SaveSystem.getSkillCosts(skillId);
      const isMax = !info;
      const card = document.createElement('div');
      card.className = `skill-card ${isMax ? 'maxed' : ''}`;
      card.innerHTML = `
        <div class="skill-head">
          <span class="skill-icon">${s.icon}</span>
          <span class="skill-title">${name}</span>
          <span class="skill-rank">${info ? info.currentRank : 'MAX'} / ${info ? info.maxRank : 'MAX'}</span>
        </div>
        <div class="skill-desc">${desc}</div>
        <div class="skill-meter">
          <div class="skill-fill" style="width:${info ? (info.currentRank / info.maxRank * 100) : 100}%"></div>
        </div>
        <button class="btn skill-btn ${isMax ? 'disabled' : ''}">
          ${isMax ? t.skillMaxed : `${t.skillUpgrade} (${info.cost} 💎)`}
        </button>
      `;

      if (!isMax) {
        card.querySelector('.skill-btn').onclick = () => {
          if (window.SaveSystem.upgradeSkill(skillId)) {
            if (window.SoundSystem) window.SoundSystem.sfx('level');
            this.renderSkilltree();
          } else {
            this.showToast(t.tooFewCredits);
          }
        };
      }
      container.appendChild(card);
    }
  }

  renderAchievements() {
    const container = document.getElementById('achGrid');
    if (!container) return;
    container.innerHTML = '';
    const unlocked = window.SaveSystem.data.achievements;
    const totalCount = Object.keys(window.GAME_DATA.ACHIEVEMENTS).length;
    const unlockedCount = Object.keys(unlocked).length;

    const countEl = document.getElementById('achCount');
    if (countEl) countEl.innerText = `${unlockedCount} / ${totalCount}`;

    const lang = window.SaveSystem.getSettings().lang || 'de';

    for (const id in window.GAME_DATA.ACHIEVEMENTS) {
      const def = window.GAME_DATA.ACHIEVEMENTS[id];
      const isUnlocked = !!unlocked[id];

      const item = document.createElement('div');
      item.className = `ach-item ${isUnlocked ? 'unlocked' : 'locked'}`;
      item.innerHTML = `
        <div class="ach-item-icon">${def.icon}</div>
        <div class="ach-item-body">
          <div class="ach-item-title">${def.title[lang] || def.title.de}</div>
          <div class="ach-item-desc">${def.desc[lang] || def.desc.de}</div>
        </div>
        <div class="ach-item-status">${isUnlocked ? '✔' : '🔒'}</div>
      `;
      container.appendChild(item);
    }
  }

  renderLevelUp(choices, canReroll, canBanish) {
    const box = document.getElementById('cards');
    if (!box) return;
    box.innerHTML = '';
    const lang = window.SaveSystem.getSettings().lang || 'de';

    choices.forEach((c, i) => {
      let icon, name, tag, tagCls, desc;
      const isEvolution = c.kind === 'evo';

      if (c.kind === 'w') {
        const def = window.GAME_DATA.WEAPONS[c.id];
        const l = window.GameState.weapons[c.id].lv;
        icon = def.icon;
        name = def.name[lang];
        tag = l === 0 ? 'NEUE WAFFE' : `Lv ${l} → ${l + 1}`;
        tagCls = l === 0 ? '' : 'up';
        desc = def.desc[lang](l + 1);
      } else if (c.kind === 'evo') {
        const evoDef = window.GAME_DATA.EVOLUTIONS[c.id];
        icon = evoDef.icon;
        name = '★ ' + evoDef.name[lang] + ' ★';
        tag = 'EVOLUTION!';
        tagCls = 'evo-tag';
        desc = evoDef.desc[lang];
      } else if (c.kind === 'p') {
        const def = window.GAME_DATA.PASSIVES[c.id];
        const l = window.GameState.passives[c.id];
        icon = def.icon;
        name = def.name[lang];
        tag = l === 0 ? 'NEU' : `Lv ${l} → ${l + 1}`;
        tagCls = l === 0 ? '' : 'up';
        desc = def.desc[lang];
      } else if (c.id === 'heal') {
        icon = '🔧';
        name = 'Reparatur';
        tag = 'BONUS';
        tagCls = 'up';
        desc = 'Heilt 50 HP';
      } else {
        icon = '💎';
        name = 'Neon Credits';
        tag = 'BONUS';
        tagCls = 'up';
        desc = '+100 Neon Credits für den Skilltree';
      }

      const d = document.createElement('div');
      d.className = `card ${isEvolution ? 'evo-card' : ''}`;
      d.innerHTML = `
        <div class="key">${i + 1}</div>
        <div class="ic">${icon}</div>
        <div class="nm">${name}</div>
        <div class="tg ${tagCls}">${tag}</div>
        <div class="ds">${desc}</div>
      `;
      d.onclick = () => window.GameState.chooseUpgrade(i);
      box.appendChild(d);
    });

    const rerollBtn = document.getElementById('rerollBtn');
    if (rerollBtn) {
      rerollBtn.innerText = `🎲 Neu auswürfeln (${window.GameState.rerollsLeft}x)`;
      rerollBtn.disabled = window.GameState.rerollsLeft <= 0;
    }
  }

  highlightLevelCard(idx) {
    const cards = document.querySelectorAll('#cards .card');
    cards.forEach((c, i) => c.classList.toggle('kb-focus', i === idx));
  }

  renderPauseSummary() {
    const el = document.getElementById('pauseSummary');
    if (!el || !window.GameState || !window.GameState.player) return;
    const gs = window.GameState;
    const P = gs.player;
    const m = Math.floor(gs.time / 60);
    const s = Math.floor(gs.time % 60);
    const timeStr = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    const lang = window.SaveSystem.getSettings().lang || 'de';

    const weaponChips = [];
    for (const k in gs.weapons) {
      const w = gs.weapons[k];
      if (!w || w.lv <= 0) continue;
      const def = window.GAME_DATA.WEAPONS[k];
      const evoDef = w.evolved && def.evolution ? window.GAME_DATA.EVOLUTIONS[def.evolution] : null;
      const label = evoDef ? `🌟 ${evoDef.name[lang] || evoDef.name.de} (EVO)` : `${def.icon} ${def.name[lang] || def.name.de} Lv.${w.lv}`;
      weaponChips.push(`<span class="sum-chip ${w.evolved ? 'evo' : ''}">${label}</span>`);
    }

    const passiveChips = [];
    for (const k in gs.passives) {
      const lv = gs.passives[k];
      if (!lv) continue;
      const def = window.GAME_DATA.PASSIVES[k];
      passiveChips.push(`<span class="sum-chip">${def.icon} ${def.name[lang] || def.name.de} Lv.${lv}</span>`);
    }

    el.innerHTML = `
      <div>Zeit: <b style="color:#3dfcff">${timeStr}</b> &nbsp;·&nbsp; Level: <b style="color:#ffd23f">${P.lvl}</b> &nbsp;·&nbsp; Kills: <b style="color:#ff3366">${gs.kills}</b></div>
      <div style="font-size:15px;opacity:0.9;">HP: <b>${Math.ceil(P.hp)}/${P.maxHp}</b> &nbsp;·&nbsp; DMG: <b>${Math.round(P.dmgMul * 100)}%</b> &nbsp;·&nbsp; Tempo: <b>${Math.round(P.rateMul * 100)}%</b></div>
      <div class="sum-row">${weaponChips.join('')}</div>
      ${passiveChips.length ? `<div class="sum-row">${passiveChips.join('')}</div>` : ''}
    `;
  }

  renderStats() {
    const container = document.getElementById('statsGrid');
    if (!container || !window.SaveSystem) return;
    const lang = (window.SaveSystem && window.SaveSystem.getSettings().lang) || 'de';
    const loc = lang === 'en' ? 'en-US' : 'de-DE';
    const st = window.SaveSystem.data.stats;
    const totalSec = Math.floor(st.totalTime || 0);
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const bestSec = Math.floor(st.bestSurvivalTime || 0);
    const bestStr = `${Math.floor(bestSec / 60)}m ${bestSec % 60}s`;
    const km = ((st.distanceTraveled || 0) / 1000).toFixed(1);

    const labels = {
      kills: { de: 'Feinde besiegt', en: 'Enemies Defeated' },
      bosses: { de: 'Bosse besiegt', en: 'Bosses Defeated' },
      time: { de: 'Gesamtspielzeit', en: 'Total Playtime' },
      best: { de: 'Beste Überlebenszeit', en: 'Best Survival Time' },
      level: { de: 'Höchstes Level', en: 'Highest Level' },
      score: { de: 'Highscore', en: 'High Score' },
      runs: { de: 'Runs gestartet / gewonnen', en: 'Runs Started / Won' },
      evos: { de: 'Waffen-Evolutionen', en: 'Weapon Evolutions' },
      overloads: { de: 'Neon Overloads genutzt', en: 'Neon Overloads Used' },
      pu: { de: 'Power-ups gesammelt', en: 'Power-ups Collected' },
      credits: { de: 'Credits gesamt verdient', en: 'Lifetime Credits Earned' },
      dist: { de: 'Flugdistanz', en: 'Flight Distance' }
    };

    const rows = [
      { icon: '☠️', label: labels.kills[lang] || labels.kills.de, val: (st.totalKills || 0).toLocaleString(loc) },
      { icon: '👑', label: labels.bosses[lang] || labels.bosses.de, val: (st.totalBossKills || 0).toLocaleString(loc) },
      { icon: '⏱️', label: labels.time[lang] || labels.time.de, val: `${hrs}h ${mins}m` },
      { icon: '⏳', label: labels.best[lang] || labels.best.de, val: bestStr },
      { icon: '⭐', label: labels.level[lang] || labels.level.de, val: st.highestLevel || 1 },
      { icon: '🏆', label: labels.score[lang] || labels.score.de, val: (st.highestScore || 0).toLocaleString(loc) },
      { icon: '🚀', label: labels.runs[lang] || labels.runs.de, val: `${st.runsStarted || 0} / ${st.runsWon || 0}` },
      { icon: '🧬', label: labels.evos[lang] || labels.evos.de, val: st.evolutionsMade || 0 },
      { icon: '⚡', label: labels.overloads[lang] || labels.overloads.de, val: st.overloadsUsed || 0 },
      { icon: '🎁', label: labels.pu[lang] || labels.pu.de, val: st.powerupsCollected || 0 },
      { icon: '💎', label: labels.credits[lang] || labels.credits.de, val: (window.SaveSystem.data.lifetimeCredits || 0).toLocaleString(loc) },
      { icon: '🛸', label: labels.dist[lang] || labels.dist.de, val: `${km}k ${lang === 'en' ? 'Units' : 'Einheiten'}` }
    ];

    container.innerHTML = rows.map(r => `
      <div class="stat-box">
        <div class="stat-icon">${r.icon}</div>
        <div class="stat-val">${r.val}</div>
        <div class="stat-label">${r.label}</div>
      </div>
    `).join('');
  }

  renderKeybindings() {
    const container = document.getElementById('keybindGrid');
    if (!container || !window.SaveSystem) return;
    const lang = (window.SaveSystem.getSettings().lang) || 'de';
    const keys = window.SaveSystem.getSettings().keys;
    const actions = [
      { id: 'up', label: { de: 'Hoch', en: 'Up' } },
      { id: 'down', label: { de: 'Runter', en: 'Down' } },
      { id: 'left', label: { de: 'Links', en: 'Left' } },
      { id: 'right', label: { de: 'Rechts', en: 'Right' } },
      { id: 'dash', label: { de: 'Dash', en: 'Dash' } },
      { id: 'overload', label: { de: 'Neon Overload', en: 'Neon Overload' } },
      { id: 'pause', label: { de: 'Pause', en: 'Pause' } }
    ];

    container.innerHTML = '';
    actions.forEach(a => {
      const current = (keys[a.id] && keys[a.id][0]) || '-';
      const labelText = a.label[lang] || a.label.de;
      const row = document.createElement('div');
      row.className = 'kb-row';
      row.innerHTML = `<span>${labelText}</span><button class="btn sec kb-btn" type="button">${current}</button>`;
      const btn = row.querySelector('.kb-btn');
      btn.onclick = () => {
        btn.innerText = lang === 'en' ? 'Press a key...' : 'Taste drücken...';
        btn.style.borderColor = '#ffd23f';
        const handler = ev => {
          ev.preventDefault();
          ev.stopPropagation();
          window.removeEventListener('keydown', handler, true);
          const s = window.SaveSystem.getSettings();
          const list = s.keys[a.id] ? [...s.keys[a.id]] : [];
          if (!list.includes(ev.code)) {
            list[0] = ev.code;
          }
          s.keys[a.id] = list;
          window.SaveSystem.saveSettings(s);
          this.renderKeybindings();
          this.showToast(`${labelText}: ${ev.code}`);
        };
        window.addEventListener('keydown', handler, true);
      };
      container.appendChild(row);
    });
  }

  updateDiscordStatusBadge(status, clientId) {
    const el = document.getElementById('discordStatusBadge');
    if (!el) return;
    if (status === 'connected') {
      el.style.color = '#5dff6a';
      el.innerText = '● Verbunden mit Discord';
    } else if (status === 'connecting') {
      el.style.color = '#3dfcff';
      el.innerText = '🔄 Verbinde mit Discord (Wiederholung aktiv)...';
    } else if (status === 'invalid_client_id') {
      el.style.color = '#ffd23f';
      el.innerText = '⚠ Client-ID ungültig (Wiederholt im Hintergrund...)';
    } else if (status === 'discord_offline') {
      el.style.color = '#ff9966';
      el.innerText = '○ Discord nicht aktiv (Wiederholt im Hintergrund alle 3s...)';
    } else {
      el.style.color = '#aaa';
      el.innerText = '○ Verbindung zum Discord-Dienst wird aufgebaut...';
    }
  }

  toggleSandboxPanel() {
    if (!window.GameState || window.GameState.selectedMode !== 'sandbox') {
      const p = document.getElementById('sandboxPanel');
      if (p) p.classList.remove('open');
      this.isSandboxOpen = false;
      return;
    }
    let p = document.getElementById('sandboxPanel');
    if (!p) {
      p = document.createElement('div');
      p.id = 'sandboxPanel';
      p.className = 'sandbox-panel';
      document.body.appendChild(p);
    }
    const isOpen = p.classList.toggle('open');
    this.isSandboxOpen = isOpen;
    if (isOpen) {
      this.renderSandboxContent();
      if (window.SoundSystem) window.SoundSystem.sfx('click');
    }
  }

  renderSandboxContent() {
    const p = document.getElementById('sandboxPanel');
    if (!p) return;
    const gs = window.GameState;
    if (!gs || gs.selectedMode !== 'sandbox') {
      p.classList.remove('open');
      this.isSandboxOpen = false;
      return;
    }
    const P = gs.player;
    if (!this.sandboxActiveTab) this.sandboxActiveTab = 'weapons';
    const tab = this.sandboxActiveTab;

    const tabs = [
      { id: 'weapons', label: '🗡️ Waffen (15)' },
      { id: 'passives', label: '🧬 Upgrades (10)' },
      { id: 'enemies', label: '👾 Gegner (17)' },
      { id: 'bosses', label: '👑 Bosse (6)' },
      { id: 'powerups', label: '🎁 Power-ups (15)' },
      { id: 'player', label: '⚡ Spieler & Cheats' }
    ];

    let tabContentHtml = '';

    if (tab === 'weapons') {
      tabContentHtml = `
        <div class="sb-btn-row">
          <button class="sb-btn act" id="sbMaxAllWeps">🌟 Alle Waffen Max & Evo</button>
          <button class="sb-btn" id="sbClearAllWeps" style="border-color:#ff2d95;color:#ff88aa;">🗑️ Alle Waffen entfernen</button>
        </div>
        <div class="sb-section-title">🗡️ WAFFEN VERWALTEN (STUFE & EVOLUTION)</div>
        <div id="sbWepList"></div>
      `;
    } else if (tab === 'passives') {
      tabContentHtml = `
        <div class="sb-btn-row">
          <button class="sb-btn act" id="sbMaxAllPassives">🌟 Alle Passives Max</button>
          <button class="sb-btn" id="sbClearAllPassives" style="border-color:#ff2d95;color:#ff88aa;">🗑️ Alle Passives auf 0</button>
        </div>
        <div class="sb-section-title">🧬 PASSIVE UPGRADES (RANG 0 - MAX)</div>
        <div id="sbPassiveList"></div>
      `;
    } else if (tab === 'enemies') {
      const pauseSpawns = Boolean(gs.sandboxPauseSpawns);
      tabContentHtml = `
        <div class="sb-btn-row">
          <button class="sb-btn ${pauseSpawns ? 'act' : ''}" id="sbSpawnsBtn">🛑 Auto-Spawns: ${pauseSpawns ? 'AUS (Nur manuell)' : 'AN'}</button>
          <button class="sb-btn" id="sbClearEnemiesBtn" style="border-color:#ff2d95;color:#ff88aa;">💥 Alle Mobs sofort löschen</button>
        </div>
        <div class="sb-section-title">👾 17 GEGNER-TYPEN SPAWNEN</div>
        <div id="sbEnemyList"></div>
      `;
    } else if (tab === 'bosses') {
      tabContentHtml = `
        <div class="sb-btn-row">
          <button class="sb-btn" id="sbClearBossBtn" style="border-color:#ff2d95;color:#ff88aa;">💥 Boss entfernen</button>
          <button class="sb-btn boss-btn" id="sbSpawnAllBosses">⚔️ Alle 6 Bosse gleichzeitig!</button>
        </div>
        <div class="sb-section-title">👑 6 WÄCHTER & TIMELINE BOSSE</div>
        <div id="sbBossList"></div>
      `;
    } else if (tab === 'powerups') {
      tabContentHtml = `
        <div class="sb-btn-row">
          <button class="sb-btn act" id="sbMagnetAll">🧲 Alle Powerups & Gems ansaugen</button>
        </div>
        <div class="sb-section-title">🎁 15 POWER-UPS (PLATZIEREN ODER DIREKT ZÜNDEN)</div>
        <div id="sbPowerupList"></div>
      `;
    } else if (tab === 'player') {
      const isGod = Boolean(gs.sandboxGodMode);
      const curLvl = P ? P.lvl : 1;
      const curXp = P ? P.xp : 0;
      const nextXp = P ? P.next : 5;
      tabContentHtml = `
        <div class="sb-section-title">⭐ LEVEL-STEUERUNG (AKTUELL: LV ${curLvl})</div>
        <div style="font-size:11px;color:#aaa;margin-bottom:8px;">XP: ${curXp} / ${nextXp}</div>
        <div class="sb-btn-row">
          <button class="sb-btn" id="sbLvlMinus1">➖ 1 Level</button>
          <button class="sb-btn" id="sbLvlPlus1">➕ 1 Level</button>
          <button class="sb-btn" id="sbLvlPlus5">⭐ +5 Level</button>
          <button class="sb-btn" id="sbLvlPlus10">🌟 +10 Level</button>
          <button class="sb-btn" id="sbLvlReset1">🔄 Auf LV 1</button>
          <button class="sb-btn act" id="sbLvlSet50">🚀 Sofort LV 50</button>
        </div>

        <div class="sb-section-title">🛡️ GOTT-MODUS & SPIELER-STATUS</div>
        <div class="sb-btn-row">
          <button class="sb-btn ${isGod ? 'act' : ''}" id="sbGodBtn">🛡️ Gott-Modus: ${isGod ? 'AN (Unverwundbar)' : 'AUS'}</button>
          <button class="sb-btn" id="sbHealBtn">❤️ Volle HP & 5x Schild</button>
          <button class="sb-btn" id="sbOverloadBtn">⚡ Neon Overload zünden</button>
          <button class="sb-btn" id="sbOverdriveBuff">⏩ +50% Tempo (15s)</button>
          <button class="sb-btn" id="sbClearEnemiesBtn2" style="border-color:#ff2d95;color:#ff88aa;">💥 Mobs löschen</button>
        </div>
      `;
    }

    p.innerHTML = `
      <div class="sb-header">
        <span style="font-weight:900;color:#ffd23f;display:flex;align-items:center;gap:6px;">
          🛠️ TEST-LABOR 
          <span style="font-size:10px;padding:2px 6px;border-radius:4px;background:rgba(61,252,255,0.2);color:#3dfcff;">SANDBOX</span>
        </span>
        <button class="sb-close" id="sbCloseBtn">✕ Schließen (TAB/ESC)</button>
      </div>
      <div class="sb-tab-bar">
        ${tabs.map(t => `<button class="sb-tab-btn ${t.id === tab ? 'active' : ''}" data-tab="${t.id}">${t.label}</button>`).join('')}
      </div>
      <div class="sb-body">
        ${tabContentHtml}
      </div>
    `;

    // Hook tab buttons
    p.querySelectorAll('.sb-tab-btn').forEach(btn => {
      btn.onclick = () => {
        this.sandboxActiveTab = btn.getAttribute('data-tab');
        this.renderSandboxContent();
        if (window.SoundSystem) window.SoundSystem.sfx('click');
      };
    });

    document.getElementById('sbCloseBtn').onclick = () => this.toggleSandboxPanel();

    // Populate Tab-specific contents
    if (tab === 'weapons') {
      document.getElementById('sbMaxAllWeps').onclick = () => {
        for (const wKey in window.GAME_DATA.WEAPONS) {
          gs.weapons[wKey].lv = window.GAME_DATA.WEAPONS[wKey].max;
          gs.weapons[wKey].evolved = true;
          gs.weapons[wKey].t = 0.1;
        }
        this.showToast('🌟 Alle 15 Waffen maximiert & evolviert!');
        if (window.SoundSystem) window.SoundSystem.sfx('evolution');
        this.renderSandboxContent();
      };
      document.getElementById('sbClearAllWeps').onclick = () => {
        for (const wKey in window.GAME_DATA.WEAPONS) {
          gs.weapons[wKey].lv = 0;
          gs.weapons[wKey].evolved = false;
        }
        this.showToast('🗑️ Alle Waffen entfernt (LV 0)');
        if (window.SoundSystem) window.SoundSystem.sfx('click');
        this.renderSandboxContent();
      };

      const wepList = document.getElementById('sbWepList');
      for (const wKey in window.GAME_DATA.WEAPONS) {
        const wDef = window.GAME_DATA.WEAPONS[wKey];
        const wState = gs.weapons[wKey] || { lv: 0, t: 0, evolved: false };
        const evoKey = wDef.evolution;
        const evoDef = evoKey ? window.GAME_DATA.EVOLUTIONS[evoKey] : null;
        const isEvo = Boolean(wState.evolved && evoDef);
        const name = isEvo ? (evoDef.name.de || evoDef.name) : (wDef.name.de || wDef.name);
        const icon = isEvo ? evoDef.icon : wDef.icon;
        const badgeClass = isEvo ? 'sb-badge evo' : (wState.lv > 0 ? 'sb-badge act' : 'sb-badge');
        const badgeText = isEvo ? '🌟 EVO MAX' : (wState.lv > 0 ? `LV ${wState.lv}/${wDef.max}` : 'Inaktiv (0)');

        const row = document.createElement('div');
        row.className = 'sb-item-row';
        row.innerHTML = `
          <div class="sb-item-info">
            <span style="font-size:16px;">${icon}</span>
            <div>
              <div class="sb-item-name">${name}</div>
              <div class="sb-item-sub">${wKey}${evoDef ? ' · Evo: ' + (evoDef.name.de || evoDef.name) : ''}</div>
            </div>
          </div>
          <div class="sb-btn-group">
            <span class="${badgeClass}">${badgeText}</span>
            <button class="sb-mini-btn" title="Level verringern" data-act="dec">➖</button>
            <button class="sb-mini-btn" title="Level erhöhen" data-act="inc">➕</button>
            <button class="sb-mini-btn" title="Auf Max Level" data-act="max">MAX</button>
            ${evoDef ? `<button class="sb-mini-btn evo-btn ${isEvo ? 'active' : ''}" title="Evolution umschalten" data-act="evo">EVO</button>` : ''}
            <button class="sb-mini-btn del" title="Waffe entfernen" data-act="del" style="color:#ff5577;">✕</button>
          </div>
        `;

        row.querySelector('[data-act="dec"]').onclick = () => {
          if (wState.evolved) {
            wState.evolved = false;
          } else if (wState.lv > 0) {
            wState.lv--;
            if (wState.lv === 0) wState.evolved = false;
          }
          this.renderSandboxContent();
        };
        row.querySelector('[data-act="inc"]').onclick = () => {
          if (wState.lv < wDef.max) {
            wState.lv++;
            if (wState.lv === 1) wState.t = 0.1;
          }
          this.renderSandboxContent();
        };
        row.querySelector('[data-act="max"]').onclick = () => {
          wState.lv = wDef.max;
          wState.t = 0.1;
          this.renderSandboxContent();
        };
        if (evoDef) {
          row.querySelector('[data-act="evo"]').onclick = () => {
            wState.evolved = !wState.evolved;
            if (wState.evolved) {
              wState.lv = wDef.max;
              wState.t = 0.1;
              if (window.SoundSystem) window.SoundSystem.sfx('evolution');
            }
            this.renderSandboxContent();
          };
        }
        row.querySelector('[data-act="del"]').onclick = () => {
          wState.lv = 0;
          wState.evolved = false;
          this.renderSandboxContent();
        };

        wepList.appendChild(row);
      }
    } else if (tab === 'passives') {
      document.getElementById('sbMaxAllPassives').onclick = () => {
        for (const pKey in window.GAME_DATA.PASSIVES) {
          gs.passives[pKey] = window.GAME_DATA.PASSIVES[pKey].max;
        }
        gs.recalcPlayerStats();
        this.showToast('🌟 Alle 10 Passives auf Maximum!');
        if (window.SoundSystem) window.SoundSystem.sfx('levelup');
        this.renderSandboxContent();
      };
      document.getElementById('sbClearAllPassives').onclick = () => {
        for (const pKey in window.GAME_DATA.PASSIVES) {
          gs.passives[pKey] = 0;
        }
        gs.recalcPlayerStats();
        this.showToast('🗑️ Alle Passives auf 0 zurückgesetzt');
        if (window.SoundSystem) window.SoundSystem.sfx('click');
        this.renderSandboxContent();
      };

      const passiveList = document.getElementById('sbPassiveList');
      for (const pKey in window.GAME_DATA.PASSIVES) {
        const pDef = window.GAME_DATA.PASSIVES[pKey];
        const curRank = gs.passives[pKey] || 0;
        const badgeClass = curRank >= pDef.max ? 'sb-badge act' : (curRank > 0 ? 'sb-badge act' : 'sb-badge');
        const badgeText = curRank > 0 ? `Rang ${curRank}/${pDef.max}` : 'Rang 0';
        const pDesc = typeof pDef.desc.de === 'function' ? pDef.desc.de(curRank) : (pDef.desc.de || pDef.desc);

        const row = document.createElement('div');
        row.className = 'sb-item-row';
        row.innerHTML = `
          <div class="sb-item-info">
            <span style="font-size:16px;">${pDef.icon}</span>
            <div>
              <div class="sb-item-name">${pDef.name.de || pDef.name}</div>
              <div class="sb-item-sub">${pDesc}</div>
            </div>
          </div>
          <div class="sb-btn-group">
            <span class="${badgeClass}">${badgeText}</span>
            <button class="sb-mini-btn" title="Rang verringern" data-act="dec">➖</button>
            <button class="sb-mini-btn" title="Rang erhöhen" data-act="inc">➕</button>
            <button class="sb-mini-btn" title="Auf Max Rang" data-act="max">MAX</button>
            <button class="sb-mini-btn del" title="Rang auf 0" data-act="del" style="color:#ff5577;">✕</button>
          </div>
        `;

        row.querySelector('[data-act="dec"]').onclick = () => {
          if ((gs.passives[pKey] || 0) > 0) {
            gs.passives[pKey]--;
            gs.recalcPlayerStats();
            this.renderSandboxContent();
          }
        };
        row.querySelector('[data-act="inc"]').onclick = () => {
          if ((gs.passives[pKey] || 0) < pDef.max) {
            gs.passives[pKey] = (gs.passives[pKey] || 0) + 1;
            gs.recalcPlayerStats();
            this.renderSandboxContent();
          }
        };
        row.querySelector('[data-act="max"]').onclick = () => {
          gs.passives[pKey] = pDef.max;
          gs.recalcPlayerStats();
          this.renderSandboxContent();
        };
        row.querySelector('[data-act="del"]').onclick = () => {
          gs.passives[pKey] = 0;
          gs.recalcPlayerStats();
          this.renderSandboxContent();
        };

        passiveList.appendChild(row);
      }
    } else if (tab === 'enemies') {
      document.getElementById('sbSpawnsBtn').onclick = () => {
        gs.sandboxPauseSpawns = !gs.sandboxPauseSpawns;
        this.showToast(gs.sandboxPauseSpawns ? '🛑 Auto-Spawns DEAKTIVIERT (Nur noch manuell)' : '▶️ Auto-Spawns AKTIVIERT');
        this.renderSandboxContent();
      };
      document.getElementById('sbClearEnemiesBtn').onclick = () => {
        for (const e of window.Entities.enemies) e.dead = true;
        window.Entities.enemies.length = 0;
        gs.currentBoss = null;
        this.showToast('💥 Alle Mobs sofort gelöscht!');
        if (window.SoundSystem) window.SoundSystem.sfx('nova');
      };

      const enemyList = document.getElementById('sbEnemyList');
      for (const eKey in window.GAME_DATA.ENEMIES) {
        const eDef = window.GAME_DATA.ENEMIES[eKey];
        const row = document.createElement('div');
        row.className = 'sb-item-row';
        row.innerHTML = `
          <div class="sb-item-info">
            <span style="color:${eDef.col};font-weight:900;font-size:16px;">■</span>
            <div>
              <div class="sb-item-name">${eKey}</div>
              <div class="sb-item-sub">HP: ${eDef.hp} · Spd: ${eDef.spd} · DMG: ${eDef.dmg || 10}</div>
            </div>
          </div>
          <div class="sb-btn-group">
            <button class="sb-mini-btn" data-cnt="1">+1</button>
            <button class="sb-mini-btn" data-cnt="5">+5</button>
            <button class="sb-mini-btn" data-cnt="20">+20</button>
          </div>
        `;

        const spawnMobs = (cnt) => {
          if (!gs.player) return;
          for (let i = 0; i < cnt; i++) {
            const a = Math.random() * Math.PI * 2;
            const d = 220 + Math.random() * 160;
            const e = window.Entities.createEnemy(eKey, gs.player.x + Math.cos(a) * d, gs.player.y + Math.sin(a) * d);
            window.Entities.enemies.push(e);
          }
          this.showToast(`+${cnt}x ${eKey} gespawnt!`);
          if (window.SoundSystem) window.SoundSystem.sfx('shoot');
        };

        row.querySelector('[data-cnt="1"]').onclick = () => spawnMobs(1);
        row.querySelector('[data-cnt="5"]').onclick = () => spawnMobs(5);
        row.querySelector('[data-cnt="20"]').onclick = () => spawnMobs(20);

        enemyList.appendChild(row);
      }
    } else if (tab === 'bosses') {
      document.getElementById('sbClearBossBtn').onclick = () => {
        window.Entities.enemies = window.Entities.enemies.filter(e => !e.isBoss);
        gs.currentBoss = null;
        this.showToast('💥 Aktuelle Bosse entfernt!');
        if (window.SoundSystem) window.SoundSystem.sfx('nova');
      };
      document.getElementById('sbSpawnAllBosses').onclick = () => {
        if (!gs.player) return;
        let idx = 0;
        const bossKeys = Object.keys(window.GAME_DATA.BOSSES);
        for (const bKey of bossKeys) {
          const a = (idx / bossKeys.length) * Math.PI * 2;
          const d = 340;
          window.Entities.createBoss(bKey, gs.player.x + Math.cos(a) * d, gs.player.y + Math.sin(a) * d);
          idx++;
        }
        this.showToast('⚔️ ALLE 6 BOSSE GLEICHZEITIG GESPAWNT!');
        if (window.SoundSystem) window.SoundSystem.sfx('nova');
      };

      const bossList = document.getElementById('sbBossList');
      for (const bKey in window.GAME_DATA.BOSSES) {
        const bDef = window.GAME_DATA.BOSSES[bKey];
        const row = document.createElement('div');
        row.className = 'sb-item-row';
        row.innerHTML = `
          <div class="sb-item-info">
            <span style="font-size:16px;">👑</span>
            <div>
              <div class="sb-item-name" style="color:#ffd23f;">${bDef.name}</div>
              <div class="sb-item-sub">HP: ${bDef.hp.toLocaleString('de-DE')} · ${bDef.title || 'Wächter'}</div>
            </div>
          </div>
          <div class="sb-btn-group">
            <button class="sb-btn boss-btn" data-act="spawn">👑 Boss spawnen</button>
          </div>
        `;

        row.querySelector('[data-act="spawn"]').onclick = () => {
          if (gs.player) {
            const a = Math.random() * Math.PI * 2;
            const d = 320;
            window.Entities.createBoss(bKey, gs.player.x + Math.cos(a) * d, gs.player.y + Math.sin(a) * d);
            this.showToast(`Boss gespawnt: ${bDef.name}!`);
            if (window.SoundSystem) window.SoundSystem.sfx('nova');
          }
        };

        bossList.appendChild(row);
      }
    } else if (tab === 'powerups') {
      document.getElementById('sbMagnetAll').onclick = () => {
        for (const g of window.Entities.gems) g.pull = true;
        for (const pu of window.Entities.powerups) {
          if (gs.player) {
            pu.x = gs.player.x;
            pu.y = gs.player.y;
          }
        }
        this.showToast('🧲 Alle Powerups & Gems sofort zum Spieler gezogen!');
        if (window.SoundSystem) window.SoundSystem.sfx('magnet');
      };

      const puList = document.getElementById('sbPowerupList');
      for (const puKey in window.GAME_DATA.POWERUPS) {
        const puDef = window.GAME_DATA.POWERUPS[puKey];
        const row = document.createElement('div');
        row.className = 'sb-item-row';
        row.innerHTML = `
          <div class="sb-item-info">
            <span style="font-size:16px;">${puDef.icon}</span>
            <div>
              <div class="sb-item-name">${puDef.name.de || puDef.name}</div>
              <div class="sb-item-sub">${puDef.desc.de || puDef.desc}</div>
            </div>
          </div>
          <div class="sb-btn-group">
            <button class="sb-mini-btn" data-act="drop">🎁 Vor Spieler</button>
            <button class="sb-mini-btn act" data-act="use" style="border-color:#3dfcff;">⚡ Zünden</button>
          </div>
        `;

        row.querySelector('[data-act="drop"]').onclick = () => {
          if (gs.player) {
            const a = Math.random() * Math.PI * 2;
            const d = 70 + Math.random() * 50;
            window.Entities.dropPowerup(gs.player.x + Math.cos(a) * d, gs.player.y + Math.sin(a) * d, puKey);
            this.showToast(`${puDef.name.de || puDef.name} platziert!`);
          }
        };
        row.querySelector('[data-act="use"]').onclick = () => {
          if (gs.player) {
            window.Entities.collectPowerup({ type: puKey, x: gs.player.x, y: gs.player.y });
            this.showToast(`⚡ ${puDef.name.de || puDef.name} sofort aktiviert!`);
          }
        };

        puList.appendChild(row);
      }
    } else if (tab === 'player') {
      const adjustLvl = (delta) => {
        if (!P) return;
        P.lvl = Math.max(1, P.lvl + delta);
        P.next = Math.floor(4 + P.lvl * 3.2 + Math.pow(P.lvl, 1.45) * 0.6);
        P.xp = 0;
        this.showToast(`Level geändert auf: LV ${P.lvl}`);
        if (window.SoundSystem) window.SoundSystem.sfx('levelup');
        this.renderSandboxContent();
      };

      document.getElementById('sbLvlMinus1').onclick = () => adjustLvl(-1);
      document.getElementById('sbLvlPlus1').onclick = () => adjustLvl(1);
      document.getElementById('sbLvlPlus5').onclick = () => adjustLvl(5);
      document.getElementById('sbLvlPlus10').onclick = () => adjustLvl(10);
      document.getElementById('sbLvlReset1').onclick = () => {
        if (!P) return;
        P.lvl = 1;
        P.xp = 0;
        P.next = 5;
        this.showToast('Level auf 1 zurückgesetzt');
        this.renderSandboxContent();
      };
      document.getElementById('sbLvlSet50').onclick = () => {
        if (!P) return;
        P.lvl = 50;
        P.xp = 0;
        P.next = Math.floor(4 + 50 * 3.2 + Math.pow(50, 1.45) * 0.6);
        this.showToast('Level auf 50 gesetzt!');
        this.renderSandboxContent();
      };

      document.getElementById('sbGodBtn').onclick = () => {
        gs.sandboxGodMode = !gs.sandboxGodMode;
        this.showToast(gs.sandboxGodMode ? '🛡️ Gott-Modus AKTIVIERT (0 Schaden)' : 'Gott-Modus DEAKTIVIERT');
        this.renderSandboxContent();
      };
      document.getElementById('sbHealBtn').onclick = () => {
        if (P) {
          P.hp = P.maxHp;
          P.shieldHits = 5;
          this.showToast('❤️ Vollständig geheilt + 5x Schild!');
          if (window.SoundSystem) window.SoundSystem.sfx('heal');
        }
      };
      document.getElementById('sbOverloadBtn').onclick = () => {
        if (P) {
          P.overloadGauge = 100;
          gs.activateOverload();
          this.showToast('⚡ Neon Overload gezündet!');
        }
      };
      document.getElementById('sbOverdriveBuff').onclick = () => {
        if (P) {
          P.overdriveTimer = 15;
          this.showToast('⏩ Overdrive Boost aktiv für 15 Sekunden!');
          if (window.SoundSystem) window.SoundSystem.sfx('overload');
        }
      };
      document.getElementById('sbClearEnemiesBtn2').onclick = () => {
        for (const e of window.Entities.enemies) e.dead = true;
        window.Entities.enemies.length = 0;
        gs.currentBoss = null;
        this.showToast('💥 Alle Mobs sofort gelöscht!');
        if (window.SoundSystem) window.SoundSystem.sfx('nova');
      };
    }
  }
}

window.UI = new UIEngine();
