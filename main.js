const { app, BrowserWindow, globalShortcut } = require('electron');
const path = require('path');
const http = require('http');
const net = require('net');
const fs = require('fs');

let mainWindow = null;
let discordSocket = null;
let discordClientId = '1570824779005689919';

// Load configured Discord Client ID if available
try {
  const cfgPath = path.join(__dirname, 'data', 'discord_config.json');
  if (fs.existsSync(cfgPath)) {
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    if (cfg && cfg.client_id) discordClientId = cfg.client_id;
  }
} catch (e) {}

// ==========================================
// BUILT-IN DISCORD RPC PIPE BRIDGE (Node.js)
// ==========================================
function connectDiscordPipe() {
  if (discordSocket) return;
  for (let i = 0; i < 10; i++) {
    try {
      const pipePath = `\\\\.\\pipe\\discord-ipc-${i}`;
      const sock = net.connect(pipePath, () => {
        discordSocket = sock;
        // Handshake Opcode 0
        const handshake = JSON.stringify({ v: 1, client_id: discordClientId });
        const buf = Buffer.alloc(8 + Buffer.byteLength(handshake));
        buf.writeInt32LE(0, 0); // Opcode 0 = HANDSHAKE
        buf.writeInt32LE(Buffer.byteLength(handshake), 4);
        buf.write(handshake, 8);
        sock.write(buf);
      });

      sock.on('error', () => {
        discordSocket = null;
      });
      sock.on('close', () => {
        discordSocket = null;
      });
      if (discordSocket) break;
    } catch (e) {}
  }
}

function sendDiscordFrame(opcode, jsonStr) {
  if (!discordSocket) connectDiscordPipe();
  if (!discordSocket) return;
  try {
    const payloadLen = Buffer.byteLength(jsonStr);
    const buf = Buffer.alloc(8 + payloadLen);
    buf.writeInt32LE(opcode, 0);
    buf.writeInt32LE(payloadLen, 4);
    buf.write(jsonStr, 8);
    discordSocket.write(buf);
  } catch (e) {
    discordSocket = null;
  }
}

// Local RPC Server listening on port 39182 for game activity updates
const rpcServer = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        if (parsed.set_client_id) {
          discordClientId = parsed.set_client_id;
          if (discordSocket) {
            try { discordSocket.destroy(); } catch (e) {}
            discordSocket = null;
          }
          connectDiscordPipe();
        } else if (parsed.activity) {
          const frame = JSON.stringify({
            cmd: 'SET_ACTIVITY',
            args: { pid: process.pid, activity: parsed.activity },
            nonce: Math.random().toString(36).substring(2)
          });
          sendDiscordFrame(1, frame); // Opcode 1 = FRAME
        }
      } catch (e) {}
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{"status":"ok"}');
    });
  } else {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end('{"status":"running","discord_connected":' + Boolean(discordSocket) + '}');
  }
});

rpcServer.listen(39182, '127.0.0.1', () => {
  connectDiscordPipe();
});

// ==========================================
// ELECTRON GAME WINDOW (Native Standalone)
// ==========================================
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
    icon: path.join(__dirname, 'data', 'src', 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      devTools: false // DevTools disabled so players cannot inspect or cheat
    }
  });

  mainWindow.removeMenu();
  mainWindow.loadFile(path.join(__dirname, 'data', 'neon_survivor.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  // Fullscreen shortcut F11
  globalShortcut.register('F11', () => {
    if (mainWindow) {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
