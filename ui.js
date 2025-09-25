const zone = document.querySelector('.hover-zone');
const island = document.getElementById('island');
const view = document.getElementById('view');
const reloadB = document.getElementById('reload');
const closeB  = document.getElementById('close');

// Zone de détection → affiche / cache l’îlot
let inside = false; // pour savoir si la souris est dans la zone ou l’îlot

function showIsland() {
  island.classList.add('show');
}
function hideIsland() {
  if (!inside) island.classList.remove('show');
}

// Quand la souris entre dans la zone ou l’îlot → affiche
zone.addEventListener('mouseenter', () => {
  inside = true;
  showIsland();
});
island.addEventListener('mouseenter', () => {
  inside = true;
  showIsland();
});

// Quand la souris sort de la zone ou de l’îlot → cache si vraiment dehors
zone.addEventListener('mouseleave', () => {
  inside = false;
  setTimeout(hideIsland, 150); // petit délai pour éviter le clignotement
});
island.addEventListener('mouseleave', () => {
  inside = false;
  setTimeout(hideIsland, 150);
});


// Boutons ✕ et ↻
reloadB.addEventListener('click', () => window.cinepulse.reloadWeb());
closeB.addEventListener('click', () => window.cinepulse.closeApp());

// Rechargement demandé par main.js
window.cinepulse.onReloadWebview(() => {
  if (view && view.reload) view.reload();
});

// URL distante depuis main.js
window.cinepulse.onConfigUrl((url) => {
  view.src = url;
});

// Scrollbars modernes injectées DANS le site
const SCROLL_CSS = `
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.22);
    border-radius: 4px;
  }
  ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.38); }
  ::-webkit-scrollbar-track { background: transparent; }
`;

view.addEventListener('dom-ready', () => {
  view.setWindowOpenHandler && view.setWindowOpenHandler(() => ({ action: 'deny' }));
  view.insertCSS(SCROLL_CSS).catch(()=>{});
});

// Si la page échoue à charger → on redirige vers error.html
view.addEventListener('did-fail-load', () => {
  window.cinepulse.retryConfig();
});
