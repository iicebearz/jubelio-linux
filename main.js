const { app, BrowserWindow, Menu, shell, session } = require('electron');
const path = require('path');

const APP_URL = 'https://chat.jubelio.com/chat';
const ORIGIN = 'https://chat.jubelio.com';
const ICON = path.join(__dirname, 'build', 'icon.png');
const EXTERNAL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

app.setName('Jubelio Chat');
app.setDesktopName('jubelio-chat.desktop');
// Render natively on Wayland, fall back to X11 otherwise.
app.commandLine.appendSwitch('ozone-platform-hint', 'auto');

function isJubelioUrl(url) {
  try {
    const { hostname, protocol } = new URL(url);
    return protocol === 'https:' && (hostname === 'jubelio.com' || hostname.endsWith('.jubelio.com'));
  } catch {
    return false;
  }
}

function openExternal(url) {
  try {
    if (!EXTERNAL_PROTOCOLS.has(new URL(url).protocol)) return;
    shell.openExternal(url).catch((err) => {
      console.error(`Failed to open ${url}:`, err.message);
    });
  } catch {
    // Ignore malformed URLs.
  }
}

function guardWebContents(contents) {
  contents.setWindowOpenHandler(({ url }) => {
    if (isJubelioUrl(url)) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          autoHideMenuBar: true,
          icon: ICON,
          backgroundColor: '#ffffff',
        },
      };
    }
    openExternal(url);
    return { action: 'deny' };
  });

  contents.on('will-navigate', (event, url) => {
    if (isJubelioUrl(url)) return;
    event.preventDefault();
    openExternal(url);
  });

  contents.on('context-menu', (event, params) => {
    const win = BrowserWindow.fromWebContents(contents);
    if (!win) return;
    const items = [];
    if (params.isEditable) {
      items.push({ role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { type: 'separator' });
    } else if (params.selectionText) {
      items.push({ role: 'copy' }, { type: 'separator' });
    }
    items.push({ role: 'selectAll' });
    Menu.buildFromTemplate(items).popup({ window: win });
  });
}

app.on('web-contents-created', (event, contents) => guardWebContents(contents));

let mainWindow = null;
// The web app always lands on /ai-credit after login; we want the chat inbox.
let onChat = false;

function followChatRoute(url) {
  let path;
  try {
    const u = new URL(url);
    if (u.origin !== ORIGIN) return;
    path = u.pathname.replace(/\/+$/, '') || '/';
  } catch {
    return;
  }
  if (path === '/chat') {
    onChat = true;
  } else if (path === '/login') {
    onChat = false; // re-arm after logout, so the next login lands on /chat
  } else if (!onChat && (path === '/' || path === '/ai-credit')) {
    onChat = true;
    mainWindow.loadURL(APP_URL).catch((err) => {
      console.error(`Failed to load ${APP_URL}:`, err.message);
    });
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 940,
    minHeight: 600,
    title: 'Jubelio Chat',
    icon: ICON,
    autoHideMenuBar: true,
    backgroundColor: '#ffffff',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
    },
  });

  mainWindow.loadURL(APP_URL).catch((err) => {
    console.error(`Failed to load ${APP_URL}:`, err.message);
  });

  mainWindow.webContents.on('did-navigate', (event, url) => followChatRoute(url));
  mainWindow.webContents.on('did-navigate-in-page', (event, url) => followChatRoute(url));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    session.defaultSession.setUserAgent(
      `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${process.versions.chrome} Safari/537.36`
    );
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
      callback(['notifications', 'media', 'fullscreen', 'clipboard-sanitized-write'].includes(permission));
    });

    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    app.quit();
  });
}
