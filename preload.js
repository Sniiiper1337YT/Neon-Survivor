'use strict';
// Secure bridge between the game (renderer) and the native Electron process.
const { contextBridge, ipcRenderer } = require('electron');

let appVersion = '0.0.0';
try {
  appVersion = ipcRenderer.sendSync('app:getVersionSync') || appVersion;
} catch (e) { /* ignore */ }

let updateInfo = { overlay: false, baseVersion: appVersion, canSelfUpdate: false };
try {
  updateInfo = ipcRenderer.sendSync('app:updateInfoSync') || updateInfo;
} catch (e) { /* ignore */ }

contextBridge.exposeInMainWorld('NeonNative', {
  isNative: true,
  appVersion,
  updateInfo,
  discordSetActivity: (activity, clientId) => ipcRenderer.invoke('discord:setActivity', { activity, clientId }),
  discordStatus: () => ipcRenderer.invoke('discord:status'),
  discordReconnect: () => ipcRenderer.invoke('discord:reconnect'),
  checkForUpdates: () => ipcRenderer.invoke('app:checkUpdate'),
  installUpdate: () => ipcRenderer.invoke('app:installUpdate'),
  restartForUpdate: () => ipcRenderer.invoke('app:restartForUpdate'),
  onUpdateProgress: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_e, data) => callback(data);
    ipcRenderer.on('app:updateProgress', listener);
    return () => ipcRenderer.removeListener('app:updateProgress', listener);
  },
  openExternal: (url) => ipcRenderer.invoke('app:openExternal', url)
});
