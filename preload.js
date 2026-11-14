'use strict';
// Secure bridge between the game (renderer) and the native Electron process.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('NeonNative', {
  isNative: true,
  appVersion: require('./package.json').version,
  discordSetActivity: (activity, clientId) => ipcRenderer.invoke('discord:setActivity', { activity, clientId }),
  discordStatus: () => ipcRenderer.invoke('discord:status'),
  checkForUpdates: () => ipcRenderer.invoke('app:checkUpdate'),
  openExternal: (url) => ipcRenderer.invoke('app:openExternal', url)
});
