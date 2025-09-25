// main.js
const { app, BrowserWindow, ipcMain, dialog, net } = require('electron');
const path = require('path');
const { version } = require('./package.json');

// ⬇️ REMPLACE UNIQUEMENT CETTE LIGNE PAR L’URL DE TON FICHIER HÉBERGÉ
// Exemple recommandé: https://ton-domaine.com/cinepulse-config.json
const REMOTE_CONFIG_URL = 'https://raw.githubusercontent.com/VisionActive/Cinepulse-app/main/config.json';

let splashWin = null;
let mainWin   = null;

/** Ouvre la fenêtre Splash */
function createSplash() {
  splashWin = new BrowserWindow({
    width: 420,
    height: 420,
    resizable: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    show: true,
    backgroundColor: '#00000000',
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  splashWin.loadFile(path.join(__dirname, 'splash.html'));
  // Envoie la version à l’UI du splash
  splashWin.webContents.on('did-finish-load', () => {
    splashWin.webContents.send('app:version', version);
  });
}

/** Ouvre la fenêtre principale (UI + webview) */
function createMainWindow() {
  mainWin = new BrowserWindow({
    fullscreen: true,
    frame: false,
    backgroundColor: '#0b0b0c',
    autoHideMenuBar: true,
    show: false, // on montrera après
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true,          // <webview> activé
      nodeIntegration: false,
      devTools: false            // mets true si tu veux debugger
    }
  });

  // Bloque toute tentative d’ouvrir une nouvelle fenêtre/pop-up
  mainWin.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  mainWin.on('closed', () => { mainWin = null; });
  mainWin.loadFile(path.join(__dirname, 'ui.html'));
}

/** Télécharge le config.json distant et renvoie l’URL du site */
function fetchRemoteConfig() {
  return new Promise((resolve, reject) => {
    const request = net.request(REMOTE_CONFIG_URL);
    let data = '';
    request.on('response', (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      response.on('data', chunk => (data += chunk));
      response.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json && typeof json.cinepulse_url === 'string' && json.cinepulse_url.length > 0) {
            resolve(json.cinepulse_url);
          } else {
            reject(new Error('Config invalide: clé "cinepulse_url" manquante'));
          }
        } catch (e) {
          reject(new Error('JSON invalide'));
        }
      });
    });
    request.on('error', (err) => reject(err));
    request.end();
  });
}

/** Lance le flux de démarrage complet */
async function boot() {
  try {
    createSplash();
    createMainWindow();

    // Sécurité : si rien ne se passe en 7 secondes → on bascule sur error.html
    const safetyTimer = setTimeout(() => {
      if (mainWin && !mainWin.isDestroyed()) {
        mainWin.loadFile(path.join(__dirname, 'error.html'));
        mainWin.show();
        if (splashWin && !splashWin.isDestroyed()) splashWin.close();
      }
    }, 7000);

    const targetUrl = await fetchRemoteConfig();

    mainWin.webContents.on('did-finish-load', () => {
      mainWin.webContents.send('config:url', targetUrl);
    });

    mainWin.once('ready-to-show', () => {
  clearTimeout(safetyTimer);

  // On impose au moins 2 secondes de splash
  setTimeout(() => {
    if (splashWin && !splashWin.isDestroyed()) splashWin.close();
    mainWin.show();
  }, 2000);
});


  } catch (err) {
    if (!mainWin) createMainWindow();
    mainWin.loadFile(path.join(__dirname, 'error.html'));
    mainWin.once('ready-to-show', () => {
      if (splashWin && !splashWin.isDestroyed()) splashWin.close();
      mainWin.show();
    });
  }
}

app.whenReady().then(boot);

// ---- IPC ----
ipcMain.on('cinepulse:close-app', () => app.quit());

// Demande de rechargement de la page web (depuis la topbar)
ipcMain.on('cinepulse:reload-web', () => {
  if (mainWin) mainWin.webContents.send('webview:reload');
});

// Demande “Réessayer” depuis la page d’erreur
ipcMain.on('cinepulse:retry-config', async () => {
  try {
    const targetUrl = await fetchRemoteConfig();
    await mainWin.loadFile(path.join(__dirname, 'ui.html'));
    mainWin.webContents.on('did-finish-load', () => {
      mainWin.webContents.send('config:url', targetUrl);
    });
  } catch (e) {
    // Reste sur la page d’erreur si ça rate encore
    mainWin.webContents.send('error:message', 'Toujours impossible de récupérer la configuration distante.');
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
