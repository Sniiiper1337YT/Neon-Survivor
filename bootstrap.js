'use strict';
// ==========================================
// NEON SURVIVOR - Bootstrapper
// ------------------------------------------
// Entry point of the packaged game. On every launch it looks for a newer game
// package that the in-game auto-updater downloaded into
//   %APPDATA%\Neon Survivor\updates\app-<version>.asar
// and boots that one instead of the bundled resources\app.asar.
// No files inside the installation folder are ever modified, so updates work
// without admin rights, without file locks and without unpacking any ZIP.
// ==========================================
const { app } = require('electron');
const path = require('path');
const fs = require('fs');

let ofs = fs;
try { ofs = require('original-fs'); } catch (e) { /* plain Node fallback */ }

function parseSemver(v) {
  const parts = String(v || '').replace(/^v/i, '').trim().split('.').map(n => parseInt(n, 10) || 0);
  while (parts.length < 3) parts.push(0);
  return parts;
}

function compareSemver(a, b) {
  const x = parseSemver(a);
  const y = parseSemver(b);
  for (let i = 0; i < 3; i++) {
    if (x[i] > y[i]) return 1;
    if (x[i] < y[i]) return -1;
  }
  return 0;
}

function readBaseVersion() {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8')).version || '0.0.0';
  } catch (e) {
    return '0.0.0';
  }
}

function updatesDir() {
  return path.join(app.getPath('userData'), 'updates');
}

function log(msg) {
  try {
    const dir = updatesDir();
    ofs.mkdirSync(dir, { recursive: true });
    ofs.appendFileSync(path.join(dir, 'update.log'), `[${new Date().toISOString()}] [boot] ${msg}\n`);
  } catch (e) { /* ignore */ }
}

function readBlocked(dir) {
  try {
    const list = JSON.parse(ofs.readFileSync(path.join(dir, 'blocked.json'), 'utf8'));
    return Array.isArray(list) ? list.map(String) : [];
  } catch (e) {
    return [];
  }
}

function blockVersion(version) {
  try {
    const dir = updatesDir();
    const list = readBlocked(dir);
    if (!list.includes(version)) list.push(version);
    ofs.writeFileSync(path.join(dir, 'blocked.json'), JSON.stringify(list));
  } catch (e) { /* ignore */ }
}

function safeUnlink(file) {
  try { ofs.unlinkSync(file); } catch (e) { /* file may be in use - retried on next launch */ }
}

function findOverlays(baseVersion) {
  // Never override the source code while developing (npm start)
  if (!app.isPackaged) return [];
  if (process.argv.includes('--no-update-overlay')) return [];

  const dir = updatesDir();
  let entries;
  try { entries = ofs.readdirSync(dir); } catch (e) { return []; }

  const blocked = readBlocked(dir);
  const candidates = [];
  for (const name of entries) {
    const file = path.join(dir, name);
    if (/\.download$/i.test(name)) { safeUnlink(file); continue; } // interrupted download
    const m = /^app-(\d+\.\d+\.\d+)\.asar$/i.exec(name);
    if (!m) continue;
    const version = m[1];
    // Older or equal to the installed base game (e.g. user installed a newer full ZIP) -> obsolete
    if (compareSemver(version, baseVersion) <= 0 || blocked.includes(version)) {
      safeUnlink(file);
      continue;
    }
    candidates.push({ version, file });
  }
  // Newest first
  return candidates.sort((a, b) => compareSemver(b.version, a.version));
}

const baseVersion = readBaseVersion();
let overlays = [];
try { overlays = findOverlays(baseVersion); } catch (e) { overlays = []; }

let booted = false;
for (let i = 0; i < overlays.length && !booted; i++) {
  const overlay = overlays[i];
  try {
    global.__neonUpdate = { overlay: true, version: overlay.version, file: overlay.file, baseVersion, baseDir: __dirname };
    log(`Starting downloaded game package v${overlay.version} (base v${baseVersion})`);
    require(path.join(overlay.file, 'main.js'));
    booted = true;
    // Keep only the package that is running now
    for (const old of overlays.slice(i + 1)) safeUnlink(old.file);
  } catch (e) {
    // Broken package -> block it so it is never loaded or downloaded again, then try the next one
    log(`Failed to start v${overlay.version}: ${e && e.stack ? e.stack : e}`);
    blockVersion(overlay.version);
    global.__neonUpdate = null;
  }
}

if (!booted) {
  global.__neonUpdate = global.__neonUpdate || { overlay: false, version: baseVersion, baseVersion, baseDir: __dirname };
  require('./main.js');
}
