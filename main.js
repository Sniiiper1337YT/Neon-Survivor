'use strict';
// ==========================================
// NEON SURVIVOR - Electron Main Process
// ==========================================
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const net = require('net');
const fs = require('fs');
const crypto = require('crypto');

const DEFAULT_CLIENT_ID = '1570824779005689919';

function isValidClientId(id) {
  return typeof id === 'string' && /^\d{10,25}$/.test(id) && id !== '1306300000000000000';
}

function loadClientId() {
  try {
    const cfgPath = path.join(__dirname, 'data', 'discord_config.json');
    if (fs.existsSync(cfgPath)) {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
      if (cfg && isValidClientId(String(cfg.client_id))) return String(cfg.client_id);
    }
  } catch (e) { /* ignore */ }
  return DEFAULT_CLIENT_ID;
}

// ==========================================
// DISCORD RICH PRESENCE (native IPC over named pipe)
// ==========================================
class DiscordIPC {
  constructor(clientId) {
    this.clientId = clientId;
    this.socket = null;
    this.ready = false;
    this.connecting = false;
    this.status = 'discord_offline'; // connected | connecting | discord_offline | invalid_client_id
    this.lastActivity = null;
    this.buffer = Buffer.alloc(0);
    this.watchdogTimer = null;
    this.destroyed = false;
  }

  start() {
    this.destroyed = false;
    this.connect();
    // Robuster Hintergrunddienst: Überwacht dauerhaft den Verbindungsstatus & wiederholt automatisch
    if (!this.watchdogTimer) {
      this.watchdogTimer = setInterval(() => this.watchdog(), 3000);
    }
  }

  watchdog() {
    if (this.destroyed) return;
    // 1. Wenn nicht verbunden und nicht gerade im Verbindungsaufbau: sofort versuchen zu verbinden!
    if (!this.socket && !this.connecting) {
      this.connect();
      return;
    }
    // 2. Wenn verbunden und bereit: periodischer Heartbeat / Refresh, damit Discord den Status nie verwirft
    if (this.socket && this.ready && this.lastActivity) {
      this.sendActivity(this.lastActivity);
    }
  }

  pipePaths(i) {
    if (process.platform === 'win32') {
      return [
        `\\\\.\\pipe\\discord-ipc-${i}`,
        `\\\\?\\pipe\\discord-ipc-${i}`
      ];
    }
    const base = process.env.XDG_RUNTIME_DIR || process.env.TMPDIR || process.env.TMP || process.env.TEMP || '/tmp';
    return [path.join(base, `discord-ipc-${i}`)];
  }

  // Versucht alle Pipes 0..9 mit Timeout nacheinander
  connect() {
    if (this.destroyed || this.connecting || this.socket) return;
    this.connecting = true;
    this.status = 'connecting';

    const pipesToTry = [];
    for (let i = 0; i < 10; i++) {
      for (const p of this.pipePaths(i)) {
        pipesToTry.push(p);
      }
    }

    let pipeIdx = 0;

    const tryNext = () => {
      if (this.destroyed) {
        this.connecting = false;
        return;
      }
      if (pipeIdx >= pipesToTry.length) {
        this.connecting = false;
        if (this.status !== 'invalid_client_id') {
          this.status = 'discord_offline';
        }
        return;
      }

      const currentPath = pipesToTry[pipeIdx++];
      let done = false;
      let timer = null;
      let sock = null;

      const cleanup = () => {
        if (timer) { clearTimeout(timer); timer = null; }
        if (sock) {
          sock.removeAllListeners();
          try { sock.destroy(); } catch (e) {}
        }
      };

      const fail = () => {
        if (done) return;
        done = true;
        cleanup();
        tryNext();
      };

      try {
        sock = net.createConnection(currentPath);
      } catch (e) {
        fail();
        return;
      }

      // 1200ms Timeout pro Pipe-Versuch (verhindert Hänger bei toten Pipes)
      timer = setTimeout(() => {
        fail();
      }, 1200);

      sock.once('error', () => {
        fail();
      });

      sock.once('connect', () => {
        if (done) {
          try { sock.destroy(); } catch (e) {}
          return;
        }
        done = true;
        if (timer) { clearTimeout(timer); timer = null; }
        sock.removeAllListeners('error');
        this.attach(sock);
        this.connecting = false;
      });
    };

    tryNext();
  }

  attach(sock) {
    this.socket = sock;
    this.ready = false;
    this.buffer = Buffer.alloc(0);

    // Handshake Timeout: falls Discord nicht innerhalb von 4s mit READY antwortet
    let handshakeTimer = setTimeout(() => {
      if (!this.ready && this.socket === sock) {
        this.onClose();
      }
    }, 4000);

    sock.on('data', (chunk) => {
      this.onData(chunk);
      if (this.ready && handshakeTimer) {
        clearTimeout(handshakeTimer);
        handshakeTimer = null;
      }
    });

    sock.on('error', () => {
      if (handshakeTimer) { clearTimeout(handshakeTimer); handshakeTimer = null; }
      this.onClose();
    });

    sock.on('close', () => {
      if (handshakeTimer) { clearTimeout(handshakeTimer); handshakeTimer = null; }
      this.onClose();
    });

    this.writeFrame(0, { v: 1, client_id: this.clientId });
  }

  onClose() {
    if (this.socket) {
      try {
        this.socket.removeAllListeners();
        this.socket.destroy();
      } catch (e) {}
      this.socket = null;
    }
    this.ready = false;
    if (this.status === 'connected' || this.status === 'connecting') {
      this.status = 'discord_offline';
    }
    // Der Watchdog-Timer versucht automatisch innerhalb von 3s erneut zu verbinden!
  }

  onData(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (this.buffer.length >= 8) {
      const op = this.buffer.readInt32LE(0);
      const len = this.buffer.readInt32LE(4);
      if (this.buffer.length < 8 + len) break;
      const body = this.buffer.slice(8, 8 + len).toString('utf8');
      this.buffer = this.buffer.slice(8 + len);
      let msg = null;
      try { msg = JSON.parse(body); } catch (e) { /* ignore */ }
      this.handleMessage(op, msg);
    }
  }

  handleMessage(op, msg) {
    if (op === 1 && msg) {
      if (msg.cmd === 'DISPATCH' && msg.evt === 'READY') {
        this.ready = true;
        this.status = 'connected';
        if (this.lastActivity) {
          this.sendActivity(this.lastActivity);
        }
      }
    } else if (op === 2) {
      // CLOSE frame (z. B. ungültige Client-ID = Code 4000)
      if (msg && (msg.code === 4000 || /client id/i.test(String(msg.message || '')))) {
        this.status = 'invalid_client_id';
      }
      this.onClose();
    } else if (op === 3 && this.socket) {
      // PING -> PONG
      this.writeFrame(4, msg || {});
    }
  }

  writeFrame(op, obj) {
    if (!this.socket) return;
    try {
      const json = JSON.stringify(obj);
      const len = Buffer.byteLength(json);
      const buf = Buffer.alloc(8 + len);
      buf.writeInt32LE(op, 0);
      buf.writeInt32LE(len, 4);
      buf.write(json, 8);
      this.socket.write(buf);
    } catch (e) {
      this.onClose();
    }
  }

  sanitizeActivity(a) {
    if (!a || typeof a !== 'object') return null;
    const clip = (s, n = 128) => (typeof s === 'string' ? s.slice(0, n) : undefined);
    const out = {};
    if (a.state) out.state = clip(a.state);
    if (a.details) out.details = clip(a.details);
    if (a.timestamps && Number.isFinite(a.timestamps.start)) out.timestamps = { start: Math.floor(a.timestamps.start) };
    if (a.assets && typeof a.assets === 'object') {
      out.assets = {};
      for (const k of ['large_image', 'large_text', 'small_image', 'small_text']) {
        if (a.assets[k]) out.assets[k] = clip(String(a.assets[k]));
      }
    }
    out.instance = false;
    return out;
  }

  setActivity(activity) {
    const clean = this.sanitizeActivity(activity);
    if (!clean) return;
    this.lastActivity = clean;
    if (!this.socket || !this.ready) {
      if (!this.connecting) this.connect();
      return;
    }
    this.sendActivity(clean);
  }

  sendActivity(activity) {
    this.writeFrame(1, {
      cmd: 'SET_ACTIVITY',
      args: { pid: process.pid, activity },
      nonce: crypto.randomUUID()
    });
  }

  reconnect() {
    if (this.socket) {
      try { this.socket.destroy(); } catch (e) {}
      this.socket = null;
    }
    this.ready = false;
    this.connecting = false;
    this.status = 'connecting';
    this.connect();
  }

  setClientId(id) {
    if (!isValidClientId(id) || id === this.clientId) return;
    this.clientId = id;
    this.status = 'connecting';
    this.reconnect();
  }

  clear() {
    if (this.socket && this.ready) {
      this.writeFrame(1, { cmd: 'SET_ACTIVITY', args: { pid: process.pid }, nonce: crypto.randomUUID() });
    }
  }

  destroy() {
    this.destroyed = true;
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
    this.clear();
    if (this.socket) {
      try { this.socket.destroy(); } catch (e) {}
      this.socket = null;
    }
  }
}

const discord = new DiscordIPC(loadClientId());

ipcMain.handle('discord:setActivity', (_e, payload) => {
  if (payload && typeof payload === 'object') {
    if (payload.clientId) discord.setClientId(String(payload.clientId));
    if (payload.activity) discord.setActivity(payload.activity);
  }
  return { status: 'ok', discord: discord.status, ready: discord.ready, clientId: discord.clientId };
});

ipcMain.handle('discord:status', () => ({
  status: 'ok',
  discord: discord.status,
  ready: discord.ready,
  clientId: discord.clientId
}));

ipcMain.handle('discord:reconnect', () => {
  discord.reconnect();
  return { status: 'ok', discord: discord.status, ready: discord.ready, clientId: discord.clientId };
});

// ==========================================
// GITHUB AUTO-UPDATE CHECKER
// ==========================================
function getAppVersion() {
  try {
    const pkgPath = path.join(__dirname, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg && pkg.version) return pkg.version;
    }
  } catch (e) {}
  return app.getVersion() || '1.1.0';
}

ipcMain.on('app:getVersionSync', (event) => {
  event.returnValue = getAppVersion();
});

function parseSemver(v) {
  if (!v || typeof v !== 'string') return [0, 0, 0];
  const cleaned = v.replace(/^v/i, '').trim();
  const parts = cleaned.split('.').map(n => parseInt(n, 10) || 0);
  while (parts.length < 3) parts.push(0);
  return parts;
}

function compareSemver(remote, current) {
  const r = parseSemver(remote);
  const c = parseSemver(current);
  for (let i = 0; i < 3; i++) {
    if (r[i] > c[i]) return 1;
    if (r[i] < c[i]) return -1;
  }
  return 0;
}

ipcMain.handle('app:checkUpdate', async () => {
  try {
    const res = await fetch('https://api.github.com/repos/Sniiiper1337YT/Neon-Survivor/releases/latest', {
      headers: { 'User-Agent': 'Neon-Survivor-Game' }
    });
    if (!res.ok) return { updateAvailable: false };
    const rel = await res.json();
    const remoteVer = rel.tag_name || rel.name || '';
    const currentVer = getAppVersion();
    const isNewer = compareSemver(remoteVer, currentVer) > 0;
    let downloadUrl = rel.html_url;
    if (Array.isArray(rel.assets) && rel.assets.length > 0) {
      const zipAsset = rel.assets.find(a => a.name && a.name.endsWith('.zip')) || rel.assets[0];
      if (zipAsset && zipAsset.browser_download_url) {
        downloadUrl = zipAsset.browser_download_url;
      }
    }
    return {
      updateAvailable: isNewer,
      currentVersion: currentVer,
      latestVersion: remoteVer,
      downloadUrl,
      title: rel.name || remoteVer,
      notes: rel.body ? rel.body.slice(0, 200) : ''
    };
  } catch (e) {
    return { updateAvailable: false };
  }
});

ipcMain.handle('app:openExternal', (_e, url) => {
  if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
    shell.openExternal(url);
    return true;
  }
  return false;
});

// ==========================================
// ELECTRON GAME WINDOW
// ==========================================
let mainWindow = null;

// Only allow one running instance of the game
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();
    discord.start();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: 'Neon Survivor',
    backgroundColor: '#080216',
    autoHideMenuBar: true,
    fullscreenable: true,
    show: false,
    icon: path.join(__dirname, 'data', 'src', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      devTools: !app.isPackaged,
      backgroundThrottling: false,
      spellcheck: false
    }
  });

  mainWindow.removeMenu();
  mainWindow.loadFile(path.join(__dirname, 'data', 'neon_survivor.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());

  // F11 fullscreen toggle (window-local, does not hijack the key system-wide)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
      event.preventDefault();
    }
    // Block reload / devtools shortcuts in release builds
    if (app.isPackaged && input.type === 'keyDown') {
      const k = String(input.key).toLowerCase();
      if ((input.control || input.meta) && (k === 'r' || (input.shift && (k === 'i' || k === 'j' || k === 'c')))) event.preventDefault();
      if (k === 'f5' || k === 'f12') event.preventDefault();
    }
  });

  // Never navigate away from the game or open in-app popups; external links go to the system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://')) e.preventDefault();
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.on('before-quit', () => discord.destroy());

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
