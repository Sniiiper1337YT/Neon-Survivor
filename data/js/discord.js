// ==========================================
// NEON SURVIVOR - DISCORD RICH PRESENCE CLIENT
// Real-time integration with Discord Activity
// ==========================================
'use strict';

class DiscordPresence {
  constructor() {
    this.rpcUrl = 'http://127.0.0.1:39182/rpc';
    this.enabled = true;
    this.startTime = null;
    this.updateInterval = null;
    this.lastPayload = '';
    this.lastBeatTime = 0;
    this.bridgeStatus = 'unknown'; // 'connected', 'invalid_client_id', 'discord_offline', 'unknown'
  }

  init() {
    this.setMenu();
    if (!this.updateInterval) {
      this.updateInterval = setInterval(() => this.tick(), 4000);
    }
  }

  getClientId() {
    if (window.SaveSystem && window.SaveSystem.getSettings) {
      const id = window.SaveSystem.getSettings().discordClientId;
      if (id && id.trim() && id.trim() !== '1306300000000000000') return id.trim();
    }
    return undefined;
  }

  send(payload, force = false) {
    if (!this.enabled) return;
    const clientId = this.getClientId();
    const activityJson = JSON.stringify(payload);
    const now = Date.now();
    const isSame = activityJson === this.lastPayload;

    if (isSame && !force && (now - this.lastBeatTime) < 6000) return;

    this.lastPayload = activityJson;
    this.lastBeatTime = now;

    // Native Electron build: talk to the main process over secure IPC
    if (window.NeonNative && window.NeonNative.discordSetActivity) {
      if (isSame && !force && this.bridgeStatus === 'connected' && (now - this.lastBeatTime) < 8000) {
        return;
      }
      this.lastBeatTime = now;
      window.NeonNative.discordSetActivity(payload, clientId)
        .then(data => {
          if (data && data.discord) {
            this.bridgeStatus = data.discord;
            if (window.UI && window.UI.updateDiscordStatusBadge) {
              window.UI.updateDiscordStatusBadge(data.discord, data.clientId);
            }
          }
        })
        .catch(() => {
          this.bridgeStatus = 'discord_offline';
          if (window.UI && window.UI.updateDiscordStatusBadge) {
            window.UI.updateDiscordStatusBadge('discord_offline');
          }
        });
      return;
    }

    const envelope = isSame && !force
      ? JSON.stringify({ heartbeat: true, client_id: clientId })
      : JSON.stringify({ client_id: clientId, activity: payload });

    try {
      fetch(this.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: envelope
      })
        .then(res => (res.ok ? res.json() : null))
        .then(data => {
          if (data && data.discord) {
            this.bridgeStatus = data.discord;
            if (window.UI && window.UI.updateDiscordStatusBadge) {
              window.UI.updateDiscordStatusBadge(data.discord, data.clientId);
            }
          }
        })
        .catch(() => {
          this.bridgeStatus = 'no_bridge';
          if (window.UI && window.UI.updateDiscordStatusBadge) {
            window.UI.updateDiscordStatusBadge('no_bridge');
          }
        });
    } catch (e) { }
  }

  setMenu(state = 'Im Hauptmenü', details = 'Bereitet sich auf die nächste Runde vor') {
    this.startTime = null;
    this.send({
      state: state,
      details: details,
      assets: {
        large_image: 'discord_logo',
        large_text: 'Neon Survivor',
        small_image: 'ship_apex',
        small_text: 'Neon Survivor'
      }
    });
  }

  startRun(charKey, mapKey, modeKey) {
    this.startTime = Math.floor(Date.now() / 1000);
    this.updateInGame(charKey, mapKey, modeKey);
  }

  updateInGame(charKey, mapKey, modeKey) {
    const P = window.GameState ? window.GameState.player : null;
    const kills = window.GameState ? window.GameState.kills : 0;
    const boss = window.GameState ? window.GameState.currentBoss : null;
    const isOverload = window.GameState ? window.GameState.isOverload : false;

    const charDef = window.GAME_DATA.CHARACTERS[charKey] || { name: 'Apex-1' };
    const mapDef = window.GAME_DATA.MAPS[mapKey] || { name: { de: 'Cyber-Void' } };
    const modeDef = window.GAME_DATA.MODES[modeKey] || { name: { de: 'Klassisch' } };

    const mapName = mapDef.name.de || mapKey;
    const modeName = modeDef.name.de || modeKey;

    let details = `${modeName} · ☠ ${kills} Kills`;
    if (boss) {
      details = `⚠ WÄCHTER: ${boss.name}!`;
    } else if (isOverload) {
      details = `⚡ IM NEON-OVERLOAD! ⚡`;
    }

    let state = `${mapName} · Lv ${P ? P.lvl : 1} (${P ? Math.ceil(P.hp) : 0}/${P ? P.maxHp : 100} HP)`;

    const payload = {
      state: state,
      details: details,
      timestamps: this.startTime ? { start: this.startTime } : undefined,
      assets: {
        large_image: 'discord_logo',
        large_text: `Neon Survivor · ${modeName}`,
        small_image: `ship_${charKey}`,
        small_text: `${charDef.name} (${charDef.role ? (charDef.role.de || charDef.role) : 'Pilot'})`
      }
    };

    this.send(payload);
  }

  setGameOver(time, kills, score) {
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    this.send({
      state: `Game Over · ${m}m ${s}s überlebt`,
      details: `☠ ${kills} Kills · ${score.toLocaleString('de-DE')} Pkt`,
      assets: {
        large_image: 'discord_logo',
        large_text: 'Neon Survivor',
        small_image: 'game_over',
        small_text: 'Game Over'
      }
    });
  }

  setVictory(score) {
    this.send({
      state: `★ SIEG! Arch-Sentinel besiegt! ★`,
      details: `Endboss bezwungen · ${score.toLocaleString('de-DE')} Pkt`,
      assets: {
        large_image: 'discord_logo',
        large_text: 'Neon Survivor',
        small_image: 'crown',
        small_text: 'Siegreich!'
      }
    });
  }

  tick() {
    if (window.NeonNative && window.NeonNative.discordStatus) {
      window.NeonNative.discordStatus().then(data => {
        if (data && data.discord) {
          const oldStatus = this.bridgeStatus;
          this.bridgeStatus = data.discord;
          if (window.UI && window.UI.updateDiscordStatusBadge) {
            window.UI.updateDiscordStatusBadge(data.discord, data.clientId);
          }
          if (oldStatus !== 'connected' && data.discord === 'connected' && this.lastPayload) {
            try { this.send(JSON.parse(this.lastPayload), true); } catch (e) {}
          }
        }
      }).catch(() => {});
    }
    if (!window.GameState) return;
    if (window.GameState.state === 'play') {
      this.updateInGame(
        window.GameState.selectedCharacter,
        window.GameState.selectedMap,
        window.GameState.selectedMode
      );
    } else if (this.lastPayload) {
      const elapsed = Date.now() - this.lastBeatTime;
      if (elapsed >= 6000 || this.bridgeStatus !== 'connected') {
        try {
          this.send(JSON.parse(this.lastPayload));
        } catch (e) {
          this.setMenu();
        }
      }
    }
  }
}

window.DiscordRPC = new DiscordPresence();
