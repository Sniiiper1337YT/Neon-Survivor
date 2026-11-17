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
// GITHUB AUTO-UPDATER
// ------------------------------------------
// 1. On every start the game asks GitHub for the latest release.
// 2. If it is newer, the small game package (app.asar, ~1 MB) attached to the
//    release is downloaded straight into %APPDATA%\Neon Survivor\updates.
// 3. The package is verified (size, SHA-256, asar structure, version) and the
//    game restarts itself. bootstrap.js then boots the new version.
// The heavy Electron runtime stays untouched - no ZIP, no installer, no admin.
// ==========================================
const UPDATE_API = process.env.NEON_UPDATE_API || 'https://api.github.com/repos/Sniiiper1337YT/Neon-Survivor/releases/latest';
const RELEASES_PAGE = 'https://github.com/Sniiiper1337YT/Neon-Survivor/releases/latest';
const UPDATE_INFO = global.__neonUpdate || { overlay: false };

let ofs = fs;
try { ofs = require('original-fs'); } catch (e) { /* plain Node fallback */ }

function getAppVersion() {
  try {
    const pkgPath = path.join(__dirname, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg && pkg.version) return pkg.version;
    }
  } catch (e) {}
  return app.getVersion() || '0.0.0';
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

function cleanVersion(v) {
  const p = parseSemver(String(v || ''));
  return `${p[0]}.${p[1]}.${p[2]}`;
}

function updatesDir() {
  return path.join(app.getPath('userData'), 'updates');
}

function updateLog(msg) {
  try {
    const dir = updatesDir();
    ofs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'update.log');
    try { if (ofs.statSync(file).size > 256 * 1024) ofs.unlinkSync(file); } catch (e) {}
    ofs.appendFileSync(file, `[${new Date().toISOString()}] ${msg}\n`);
  } catch (e) { /* ignore */ }
}

function readBlockedVersions() {
  try {
    const list = JSON.parse(ofs.readFileSync(path.join(updatesDir(), 'blocked.json'), 'utf8'));
    return Array.isArray(list) ? list.map(String) : [];
  } catch (e) {
    return [];
  }
}

// Reads an asar archive header without Electron's asar fs patching
// Format: [uint32 4][uint32 headerPickleSize][uint32 payloadSize][uint32 jsonLen][json...]
function readAsarPackageJson(file) {
  const fd = ofs.openSync(file, 'r');
  try {
    const head = Buffer.alloc(16);
    if (ofs.readSync(fd, head, 0, 16, 0) !== 16) throw new Error('archive too small');
    if (head.readUInt32LE(0) !== 4) throw new Error('not an asar archive');
    const headerPickleSize = head.readUInt32LE(4);
    const jsonLen = head.readUInt32LE(12);
    if (jsonLen <= 0 || jsonLen > 16 * 1024 * 1024) throw new Error('invalid asar header');
    const jsonBuf = Buffer.alloc(jsonLen);
    ofs.readSync(fd, jsonBuf, 0, jsonLen, 16);
    const header = JSON.parse(jsonBuf.toString('utf8'));
    const files = header && header.files;
    if (!files || !files['main.js'] || !files['preload.js'] || !files['package.json'] || !files['data']) {
      throw new Error('archive is missing game files');
    }
    const entry = files['package.json'];
    const size = Number(entry.size);
    if (entry.unpacked || !Number.isFinite(size) || size <= 0 || size > 1024 * 1024) throw new Error('invalid package.json entry');
    const buf = Buffer.alloc(size);
    ofs.readSync(fd, buf, 0, size, 8 + headerPickleSize + Number(entry.offset));
    return JSON.parse(buf.toString('utf8'));
  } finally {
    ofs.closeSync(fd);
  }
}

let latestRelease = null;  // last result of the GitHub check (main process only - never trust renderer URLs)
let installJob = null;     // running download promise
let installedVersion = null;

function canSelfUpdate() {
  return app.isPackaged;
}

async function fetchLatestRelease() {
  const res = await fetch(UPDATE_API, {
    headers: { 'User-Agent': 'Neon-Survivor-Game', 'Accept': 'application/vnd.github+json' },
    signal: AbortSignal.timeout(15000)
  });
  if (!res.ok) throw new Error(`GitHub API HTTP ${res.status}`);
  const rel = await res.json();
  const version = cleanVersion(rel.tag_name || rel.name || '');
  const assets = Array.isArray(rel.assets) ? rel.assets : [];
  const zip = assets.find(a => a && /\.zip$/i.test(a.name || ''));
  const asar = assets.find(a => a && /\.asar$/i.test(a.name || '') && a.browser_download_url);
  return {
    version,
    title: rel.name || version,
    notes: rel.body ? String(rel.body).slice(0, 400) : '',
    pageUrl: rel.html_url || RELEASES_PAGE,
    zipUrl: zip && zip.browser_download_url ? zip.browser_download_url : (rel.html_url || RELEASES_PAGE),
    asar: asar ? {
      url: asar.browser_download_url,
      size: Number(asar.size) || 0,
      sha256: typeof asar.digest === 'string' && /^sha256:[0-9a-f]{64}$/i.test(asar.digest) ? asar.digest.slice(7).toLowerCase() : null
    } : null
  };
}

ipcMain.handle('app:checkUpdate', async () => {
  const currentVer = getAppVersion();
  try {
    const rel = await fetchLatestRelease();
    latestRelease = rel;
    const isNewer = compareSemver(rel.version, currentVer) > 0;
    const blocked = readBlockedVersions().includes(rel.version);
    const autoUpdate = isNewer && canSelfUpdate() && !!rel.asar && !blocked;
    if (isNewer) updateLog(`Update found: v${currentVer} -> v${rel.version} (auto: ${autoUpdate})`);
    return {
      updateAvailable: isNewer,
      autoUpdate,
      readyToRestart: isNewer && installedVersion === rel.version,
      currentVersion: currentVer,
      latestVersion: rel.version,
      downloadUrl: rel.zipUrl,
      pageUrl: rel.pageUrl,
      downloadSize: rel.asar ? rel.asar.size : 0,
      title: rel.title,
      notes: rel.notes
    };
  } catch (e) {
    return { updateAvailable: false, currentVersion: currentVer, error: String(e && e.message || e) };
  }
});

async function downloadAndInstall(rel, sender) {
  const dir = updatesDir();
  ofs.mkdirSync(dir, { recursive: true });
  const finalFile = path.join(dir, `app-${rel.version}.asar`);
  const tmpFile = finalFile + '.download';
  const expected = rel.asar.size;

  let lastSent = 0;
  const progress = (transferred, total, force) => {
    const now = Date.now();
    if (!force && now - lastSent < 80) return;
    lastSent = now;
    if (sender && !sender.isDestroyed()) {
      sender.send('app:updateProgress', {
        version: rel.version,
        transferred,
        total,
        percent: total > 0 ? Math.min(100, Math.round((transferred / total) * 100)) : 0
      });
    }
  };

  updateLog(`Downloading v${rel.version} from ${rel.asar.url} (${expected} bytes)`);
  const controller = new AbortController();
  let idleTimer = null;
  const armIdle = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => controller.abort(new Error('download stalled')), 30000);
  };
  armIdle();

  let out = null;
  try {
    const res = await fetch(rel.asar.url, {
      headers: { 'User-Agent': 'Neon-Survivor-Game', 'Accept': 'application/octet-stream' },
      redirect: 'follow',
      signal: controller.signal
    });
    if (!res.ok || !res.body) throw new Error(`download HTTP ${res.status}`);
    const total = expected || Number(res.headers.get('content-length')) || 0;

    const hash = crypto.createHash('sha256');
    out = ofs.openSync(tmpFile, 'w');
    let transferred = 0;
    progress(0, total, true);
    const reader = res.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      armIdle();
      const chunk = Buffer.from(value);
      ofs.writeSync(out, chunk);
      hash.update(chunk);
      transferred += chunk.length;
      if (transferred > 64 * 1024 * 1024) throw new Error('download too large');
      progress(transferred, total, false);
    }
    ofs.closeSync(out);
    out = null;
    progress(transferred, total, true);

    // --- Verification ---
    if (expected && transferred !== expected) throw new Error(`size mismatch (${transferred}/${expected})`);
    const digest = hash.digest('hex');
    if (rel.asar.sha256 && digest !== rel.asar.sha256) throw new Error('checksum mismatch');
    const pkg = readAsarPackageJson(tmpFile);
    if (cleanVersion(pkg.version) !== rel.version) throw new Error(`package version ${pkg.version} != ${rel.version}`);
    if (pkg.minElectron && compareSemver(process.versions.electron, String(pkg.minElectron)) < 0) {
      throw new Error(`requires Electron ${pkg.minElectron}`);
    }
    // Lets a future release demand a newer base game (e.g. bootstrapper changes)
    if (pkg.minBaseVersion && compareSemver(UPDATE_INFO.baseVersion || getAppVersion(), String(pkg.minBaseVersion)) < 0) {
      throw new Error(`requires base game ${pkg.minBaseVersion}`);
    }

    // --- Activate: the bootstrapper picks the newest app-<ver>.asar on next start ---
    try { ofs.unlinkSync(finalFile); } catch (e) {}
    ofs.renameSync(tmpFile, finalFile);
    installedVersion = rel.version;
    updateLog(`Installed v${rel.version} (sha256 ${digest})`);
    return { ok: true, version: rel.version };
  } catch (e) {
    if (out !== null) { try { ofs.closeSync(out); } catch (e2) {} }
    try { ofs.unlinkSync(tmpFile); } catch (e2) {}
    const reason = (controller.signal.aborted && controller.signal.reason && controller.signal.reason.message) || (e && e.message) || String(e);
    updateLog(`Update v${rel.version} failed: ${reason}`);
    const needsFullDownload = /requires (Electron|base game)/.test(reason);
    return { ok: false, error: reason, needsFullDownload, downloadUrl: rel.zipUrl };
  } finally {
    clearTimeout(idleTimer);
  }
}

ipcMain.handle('app:installUpdate', async (event) => {
  if (!canSelfUpdate()) return { ok: false, error: 'not packaged' };
  if (installJob) return installJob;
  installJob = (async () => {
    try {
      const rel = latestRelease || await fetchLatestRelease();
      latestRelease = rel;
      if (compareSemver(rel.version, getAppVersion()) <= 0) return { ok: false, error: 'already up to date' };
      if (installedVersion === rel.version) return { ok: true, version: rel.version };
      if (!rel.asar) return { ok: false, error: 'no update package', needsFullDownload: true, downloadUrl: rel.zipUrl };
      return await downloadAndInstall(rel, event.sender);
    } catch (e) {
      return { ok: false, error: String(e && e.message || e) };
    } finally {
      installJob = null;
    }
  })();
  return installJob;
});

ipcMain.handle('app:restartForUpdate', () => {
  if (!installedVersion) return false;
  updateLog(`Restarting into v${installedVersion}`);
  setTimeout(() => {
    app.relaunch();
    app.quit();
  }, 150);
  return true;
});

ipcMain.on('app:updateInfoSync', (event) => {
  event.returnValue = {
    overlay: !!UPDATE_INFO.overlay,
    baseVersion: UPDATE_INFO.baseVersion || getAppVersion(),
    canSelfUpdate: canSelfUpdate()
  };
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
  mainWindow.once('ready-to-show', () => {
    if (!process.argv.includes('--capture-screenshots')) mainWindow.show();
  });

  if (process.argv.includes('--capture-screenshots')) {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const outDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    mainWindow.webContents.once('did-finish-load', async () => {
      try {
        await sleep(1500);

        // 1. Minigame screenshot
        await mainWindow.webContents.executeJavaScript(`
          if (window.ArcadeMinigame) {
            window.ArcadeMinigame.open();
            window.ArcadeMinigame.startRound();
          }
        `);
        await sleep(1000);
        let img = await mainWindow.webContents.capturePage();
        fs.writeFileSync(path.join(outDir, 'screenshot_arcade_minigame.png'), img.toPNG());

        // 2. Skilltree
        await mainWindow.webContents.executeJavaScript(`
          if (window.ArcadeMinigame) window.ArcadeMinigame.close();
          window.UI.renderSkilltree();
          window.UI.showScreen('skillModal');
        `);
        await sleep(700);
        img = await mainWindow.webContents.capturePage();
        fs.writeFileSync(path.join(outDir, 'screenshot_skilltree.png'), img.toPNG());

        // 3. Gameplay Action (Void map with secondary drones & weapons)
        const err3 = await mainWindow.webContents.executeJavaScript(`
          (() => {
            try {
              window.UI.showScreen(null);
              window.GameState.selectedMap = 'void';
              window.GameState.startRun();
              const P = window.GameState.player;
              for (let i = 0; i < 25; i++) {
                const a = (i / 25) * Math.PI * 2;
                const e = window.Entities.createEnemy('dasher', P.x + Math.cos(a) * 240, P.y + Math.sin(a) * 240);
                window.Entities.enemies.push(e);
              }
              window.Entities.triggerSecondary('drones', P);
              return null;
            } catch (e) {
              return e.stack || String(e);
            }
          })()
        `);
        if (err3) fs.writeFileSync(path.join(outDir, 'err3.txt'), err3);
        await sleep(1500);
        let imgAction = await mainWindow.webContents.capturePage();
        fs.writeFileSync(path.join(outDir, 'screenshot_gameplay_action.png'), imgAction.toPNG());

        // 4. Boss Battle
        const err4 = await mainWindow.webContents.executeJavaScript(`
          (() => {
            try {
              const P = window.GameState.player;
              window.Entities.createBoss('guardian', P.x + 220, P.y - 120);
              window.Entities.triggerSecondary('storm', P);
              return null;
            } catch (e) {
              return e.stack || String(e);
            }
          })()
        `);
        if (err4) fs.writeFileSync(path.join(outDir, 'err4.txt'), err4);
        await sleep(1200);
        let imgBoss = await mainWindow.webContents.capturePage();
        fs.writeFileSync(path.join(outDir, 'screenshot_boss_battle.png'), imgBoss.toPNG());

        console.log('Screenshots successfully generated!');
      } catch (err) {
        fs.writeFileSync(path.join(outDir, 'capture_log.txt'), String(err && err.stack ? err.stack : err));
        console.error('Screenshot capture failed:', err);
      } finally {
        app.quit();
      }
    });
  }

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
