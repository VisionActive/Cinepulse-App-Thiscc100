// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cinepulse', {
  // Topbar actions
  closeApp: () => ipcRenderer.send('cinepulse:close-app'),
  reloadWeb: () => ipcRenderer.send('cinepulse:reload-web'),

  // Error page retry
  retryConfig: () => ipcRenderer.send('cinepulse:retry-config'),

  // Events from main → renderer
  onAppVersion: (cb) => ipcRenderer.on('app:version', (_e, v) => cb(v)),
  onConfigUrl: (cb) => ipcRenderer.on('config:url', (_e, url) => cb(url)),
  onReloadWebview: (cb) => ipcRenderer.on('webview:reload', cb),
  onErrorMessage: (cb) => ipcRenderer.on('error:message', (_e, msg) => cb(msg))
});
