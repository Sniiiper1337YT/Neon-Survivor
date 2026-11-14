'use strict';
// Secure bridge between the game (renderer) and the native Electron process.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('NeonNative', {
  isNative: true,
  discordSetActivity: (activity, clientId) => ipcRenderer.invoke('discord:setActivity', { activity, clientId }),
  discordStatus: () => ipcRenderer.invoke('discord:status')
});
