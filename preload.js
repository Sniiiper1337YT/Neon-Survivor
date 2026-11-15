'use strict';
// Secure bridge between the game (renderer) and the native Electron process.
const { contextBridge, ipcRenderer } = require('electron');

let appVersion = '1.3.0';
try {
  appVersion = ipcRenderer.sendSync('app:getVersionSync') || require('./package.json').version;
} catch (e) {
  try { appVersion = require('./package.json').version; } catch (e2) {}
}

contextBridge.exposeInMainWorld('NeonNative', {
  isNative: true,
  appVersion: appVersion || '1.3.0',
  discordSetActivity: (activity, clientId) => ipcRenderer.invoke('discord:setActivity', { activity, clientId }),
  discordStatus: () => ipcRenderer.invoke('discord:status'),
  discordReconnect: () => ipcRenderer.invoke('discord:reconnect'),
  checkForUpdates: () => ipcRenderer.invoke('app:checkUpdate'),
  openExternal: (url) => ipcRenderer.invoke('app:openExternal', url)
});
