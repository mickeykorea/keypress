const { app, BrowserWindow, Menu, Tray, nativeImage, ipcMain, screen, systemPreferences, nativeTheme, dialog, shell } = require('electron');
const path = require('path');
const { execFile, execSync } = require('child_process');
const { uIOhook } = require('uiohook-napi');
const { Conf } = require('electron-conf/main');
const { autoUpdater } = require('electron-updater');

// Handle Squirrel events for Windows installer (Forge requirement)
if (require('electron-squirrel-startup')) app.quit();

const store = new Conf({
  defaults: {
    position: 'bottom-left',
    positionMode: 'preset',
    customX: 8,
    customY: 92,
    displayMode: 'single',
    displayFilter: 'all',
    duration: 1.5,
    size: 'large',
    theme: 'light',
    customColor: '#3B82F6',
    opacity: 80,
    showModifierOnly: true,
    monitor: 'primary',
    launchAtLogin: false,
    showInDock: true,
  },
});

let overlay = null;
let settingsWindow = null;
let aboutWindow = null;
let isEnabled = true;
let settings = store.store;
let lastSettingsBounds = null;
let lastAboutBounds = null;

function getTargetDisplay() {
  if (settings.monitor === 'primary') {
    return screen.getPrimaryDisplay();
  }
  const allDisplays = screen.getAllDisplays();
  const found = allDisplays.find((d) => String(d.id) === String(settings.monitor));
  return found || screen.getPrimaryDisplay();
}

function createOverlay() {
  const display = getTargetDisplay();
  const { x, y, width, height } = display.workArea;

  overlay = new BrowserWindow({
    width,
    height,
    x,
    y,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    hasShadow: false,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  overlay.setIgnoreMouseEvents(true);
  overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlay.setAlwaysOnTop(true, 'screen-saver');
  overlay.loadFile(path.join(__dirname, 'overlay', 'index.html'));
}

function repositionOverlay() {
  if (!overlay) return;
  const display = getTargetDisplay();
  const { x, y, width, height } = display.workArea;
  overlay.setBounds({ x, y, width, height });
}

function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 480,
    height: 420,
    ...(lastSettingsBounds ? { x: lastSettingsBounds.x, y: lastSettingsBounds.y } : {}),
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    title: 'Keypress Settings',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 13, y: 13 },
    vibrancy: 'sidebar',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  settingsWindow.loadFile(path.join(__dirname, 'settings', 'index.html'));

  settingsWindow.on('close', () => {
    lastSettingsBounds = settingsWindow.getBounds();
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
    if (colorPickerProcess) {
      colorPickerProcess.kill();
      colorPickerProcess = null;
      isPickingColor = false;
    }
  });
}

function createAboutWindow() {
  if (aboutWindow) {
    aboutWindow.focus();
    return;
  }

  aboutWindow = new BrowserWindow({
    width: 300,
    height: 400,
    ...(lastAboutBounds ? { x: lastAboutBounds.x, y: lastAboutBounds.y } : {}),
    show: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    title: 'About Keypress',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 13, y: 13 },
    vibrancy: 'sidebar',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  aboutWindow.loadFile(path.join(__dirname, 'about', 'index.html'));

  aboutWindow.webContents.on('did-finish-load', () => {
    aboutWindow.webContents
      .executeJavaScript('document.querySelector(".about").offsetHeight')
      .then((h) => {
        if (aboutWindow) {
          aboutWindow.setContentSize(300, h);
          aboutWindow.show();
        }
      });
  });

  aboutWindow.on('close', () => {
    lastAboutBounds = aboutWindow.getBounds();
  });

  aboutWindow.on('closed', () => {
    aboutWindow = null;
  });
}

function getResolvedTheme() {
  if (settings.theme === 'auto') {
    return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
  }
  return settings.theme;
}

// ── Settings validation ──────────────────────────────────────────
const VALID_POSITIONS = ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'];
const VALID_POSITION_MODES = ['preset', 'custom'];
const VALID_DISPLAY_MODES = ['stack', 'single'];
const VALID_DISPLAY_FILTERS = ['all', 'combos'];
const VALID_SIZES = ['small', 'medium', 'large'];
const VALID_THEMES = ['auto', 'light', 'dark', 'custom'];

function validateSettings(obj) {
  const clean = {};
  if (obj.position !== undefined && VALID_POSITIONS.includes(obj.position)) clean.position = obj.position;
  if (obj.positionMode !== undefined && VALID_POSITION_MODES.includes(obj.positionMode)) clean.positionMode = obj.positionMode;
  if (obj.customX !== undefined) { const n = Number(obj.customX); if (!isNaN(n)) clean.customX = Math.max(0, Math.min(100, Math.round(n))); }
  if (obj.customY !== undefined) { const n = Number(obj.customY); if (!isNaN(n)) clean.customY = Math.max(0, Math.min(100, Math.round(n))); }
  if (obj.displayMode !== undefined && VALID_DISPLAY_MODES.includes(obj.displayMode)) clean.displayMode = obj.displayMode;
  if (obj.displayFilter !== undefined && VALID_DISPLAY_FILTERS.includes(obj.displayFilter)) clean.displayFilter = obj.displayFilter;
  if (obj.duration !== undefined) { const n = Number(obj.duration); if (!isNaN(n)) clean.duration = Math.max(0.5, Math.min(5, Math.round(n * 10) / 10)); }
  if (obj.size !== undefined && VALID_SIZES.includes(obj.size)) clean.size = obj.size;
  if (obj.theme !== undefined && VALID_THEMES.includes(obj.theme)) clean.theme = obj.theme;
  if (obj.customColor !== undefined && /^#[0-9a-fA-F]{6}$/.test(obj.customColor)) clean.customColor = obj.customColor;
  if (obj.opacity !== undefined) { const n = Number(obj.opacity); if (!isNaN(n)) clean.opacity = Math.max(10, Math.min(100, Math.round(n))); }
  if (obj.showModifierOnly !== undefined) clean.showModifierOnly = Boolean(obj.showModifierOnly);
  if (obj.monitor !== undefined && typeof obj.monitor === 'string') clean.monitor = obj.monitor;
  if (obj.launchAtLogin !== undefined) clean.launchAtLogin = Boolean(obj.launchAtLogin);
  if (obj.showInDock !== undefined) clean.showInDock = Boolean(obj.showInDock);
  return clean;
}

// Modifier keycodes (duplicated from keymap.js for main-process filtering)
const MODIFIER_KEYCODES = new Set([29, 3613, 56, 3640, 42, 54, 3675, 3676]);
let capsLockOn = false;
let isRepositioning = false;
let isPickingColor = false;
let colorPickerProcess = null;
let toggleMenuItem = null;
let tray = null;
let trayIconOn = null;
let trayIconOff = null;

// Read actual caps lock state from macOS via NSEvent.modifierFlags
function getSystemCapsLockState() {
  if (process.platform !== 'darwin') return capsLockOn;
  try {
    const result = execSync(
      'osascript -l JavaScript -e "ObjC.import(\'AppKit\'); !!($.NSEvent.modifierFlags & (1 << 16))"',
      { encoding: 'utf8', timeout: 500 }
    ).trim();
    return result === 'true';
  } catch {
    return capsLockOn; // fallback to current state
  }
}

function buildTrayMenu() {
  if (!tray) return;
  const menu = Menu.buildFromTemplate([
    { label: 'Show Keypress', type: 'checkbox', checked: isEnabled, accelerator: 'Alt+CmdOrCtrl+K', click: () => toggleKeypress() },
    { type: 'separator' },
    { label: 'Settings...', click: () => createSettingsWindow() },
    { label: 'About Keypress', click: () => createAboutWindow() },
    { label: 'Check for Updates...', click: () => checkForUpdates() },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]);
  tray.setContextMenu(menu);
}

function setEnabled(enabled) {
  isEnabled = enabled;
  if (toggleMenuItem) toggleMenuItem.checked = isEnabled;
  if (tray) tray.setImage(isEnabled ? trayIconOn : trayIconOff);
  buildTrayMenu();
  if (overlay) overlay.webContents.send('toggle-keypress', isEnabled);
  if (settingsWindow) settingsWindow.webContents.send('toggle-keypress', isEnabled);
}

let lastToggleTime = 0;
function toggleKeypress() {
  const now = Date.now();
  if (now - lastToggleTime < 200) return;
  lastToggleTime = now;
  setEnabled(!isEnabled);
}

function startKeyListener() {
  uIOhook.on('keydown', (e) => {
    // Toggle shortcut ⌥⌘K — works even when overlay is disabled
    if (e.metaKey && e.altKey && e.keycode === 37) {
      toggleKeypress();
      return;
    }

    if (!isEnabled || !overlay) return;

    // During reposition mode: intercept Escape to finish, suppress all other keys
    if (isRepositioning) {
      if (e.keycode === 1) {
        overlay.webContents.send('finish-reposition');
      }
      return;
    }

    // Skip modifier-only key events when the setting is off
    if (MODIFIER_KEYCODES.has(e.keycode) && !settings.showModifierOnly) return;

    overlay.webContents.send('key-pressed', {
      keycode: e.keycode,
      altKey: e.altKey,
      ctrlKey: e.ctrlKey,
      metaKey: e.metaKey,
      shiftKey: e.shiftKey,
      capsLockOn,
    });
  });

  uIOhook.on('keyup', (e) => {
    // Update caps lock from actual system state on keyup (after macOS finalizes)
    if (e.keycode === 58) {
      capsLockOn = getSystemCapsLockState();
      if (overlay) overlay.webContents.send('caps-lock-state', capsLockOn);
    }

    if (!isEnabled || !overlay) return;
    if (isRepositioning) return;
    overlay.webContents.send('key-released', {
      keycode: e.keycode,
    });
  });

  uIOhook.start();
}

// ── Auto-updater ─────────────────────────────────────────────────
let manualUpdateCheck = false;

function setupAutoUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Available',
      message: `Keypress ${info.version} is available (you have ${app.getVersion()}).`,
      buttons: ['Download', 'Later'],
      defaultId: 0,
    }).then(({ response }) => {
      if (response === 0) autoUpdater.downloadUpdate();
    });
  });

  autoUpdater.on('update-not-available', () => {
    if (manualUpdateCheck) {
      dialog.showMessageBox({
        type: 'info',
        title: 'No Updates',
        message: 'You\'re running the latest version of Keypress.',
      });
      manualUpdateCheck = false;
    }
  });

  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Ready',
      message: 'Update downloaded. Keypress will restart to install it.',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
    }).then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall();
    });
  });

  autoUpdater.on('error', () => {
    if (manualUpdateCheck) {
      dialog.showMessageBox({
        type: 'error',
        title: 'Update Error',
        message: 'Could not check for updates. Please try again later.',
      });
      manualUpdateCheck = false;
    }
  });
}

function checkForUpdates() {
  manualUpdateCheck = true;
  autoUpdater.checkForUpdates();
}

// App lifecycle
app.whenReady().then(() => {
  // IPC handlers
  ipcMain.handle('get-version', () => app.getVersion());
  ipcMain.handle('get-settings', () => settings);
  ipcMain.handle('set-settings', (_event, rawSettings) => {
    const newSettings = validateSettings(rawSettings);
    settings = { ...settings, ...newSettings };
    store.set(settings);

    // Broadcast to overlay
    if (overlay) {
      overlay.webContents.send('settings-changed', settings);
    }
    // Broadcast to settings window
    if (settingsWindow) {
      settingsWindow.webContents.send('settings-changed', settings);
    }

    // Push resolved theme when theme setting changes
    if (newSettings.theme !== undefined && overlay) {
      overlay.webContents.send('theme-resolved', getResolvedTheme());
    }

    // Reposition overlay when monitor or positionMode changes
    if (newSettings.monitor !== undefined) {
      repositionOverlay();
    }

    // Handle launchAtLogin side-effect (fails silently in dev — unsigned app)
    if (newSettings.launchAtLogin !== undefined) {
      try { app.setLoginItemSettings({ openAtLogin: settings.launchAtLogin }); } catch {}
    }

    // Handle showInDock side-effect
    if (newSettings.showInDock !== undefined) {
      if (settings.showInDock) {
        app.dock.show();
      } else {
        app.dock.hide();
      }
    }

    return settings;
  });

  ipcMain.handle('get-resolved-theme', () => getResolvedTheme());
  ipcMain.handle('get-enabled', () => isEnabled);
  ipcMain.handle('set-enabled', (_event, enabled) => { setEnabled(Boolean(enabled)); });

  ipcMain.handle('enter-reposition-mode', () => {
    if (overlay) {
      isRepositioning = true;
      overlay.setIgnoreMouseEvents(false);
      overlay.webContents.send('enter-reposition-mode');
    }
  });

  ipcMain.handle('exit-reposition-mode', (_event, pos) => {
    isRepositioning = false;
    if (overlay) {
      overlay.setIgnoreMouseEvents(true);
    }
    if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
      const cx = Math.max(0, Math.min(100, Math.round(pos.x)));
      const cy = Math.max(0, Math.min(100, Math.round(pos.y)));
      settings = { ...settings, positionMode: 'custom', customX: cx, customY: cy };
      store.set(settings);
      if (overlay) overlay.webContents.send('settings-changed', settings);
      if (settingsWindow) settingsWindow.webContents.send('settings-changed', settings);
    }
  });

  ipcMain.handle('get-displays', () => {
    const allDisplays = screen.getAllDisplays();
    const primary = screen.getPrimaryDisplay();

    // Count duplicate display names to add numbering like "(1)", "(2)"
    const nameCounts = {};
    allDisplays.forEach((d) => {
      const name = d.label || `${d.size.width}×${d.size.height}`;
      nameCounts[name] = (nameCounts[name] || 0) + 1;
    });
    const nameIndex = {};

    return allDisplays.map((d) => {
      const baseName = d.label || `${d.size.width}×${d.size.height}`;
      let displayName = baseName;
      if (nameCounts[baseName] > 1) {
        nameIndex[baseName] = (nameIndex[baseName] || 0) + 1;
        displayName = `${baseName} (${nameIndex[baseName]})`;
      }
      return {
        id: String(d.id),
        label: displayName,
        isPrimary: d.id === primary.id,
      };
    });
  });

  ipcMain.handle('pick-color', async (_event, currentHex) => {
    if (isPickingColor) return null;
    isPickingColor = true;

    // Convert hex to 0–65535 range for AppleScript choose color
    const r = parseInt(currentHex.slice(1, 3), 16) * 257;
    const g = parseInt(currentHex.slice(3, 5), 16) * 257;
    const b = parseInt(currentHex.slice(5, 7), 16) * 257;

    return new Promise((resolve) => {
      colorPickerProcess = execFile('osascript', ['-e', `choose color default color {${r}, ${g}, ${b}}`], (error, stdout) => {
        isPickingColor = false;
        colorPickerProcess = null;
        if (error) { resolve(null); return; }
        const match = stdout.trim().match(/(\d+),\s*(\d+),\s*(\d+)/);
        if (!match) { resolve(null); return; }
        const hex = '#' + [match[1], match[2], match[3]]
          .map(v => Math.round(parseInt(v) / 257).toString(16).padStart(2, '0'))
          .join('');
        resolve(hex);
      });
    });
  });

  // Push system theme changes to overlay when in auto mode
  nativeTheme.on('updated', () => {
    if (settings.theme === 'auto' && overlay) {
      overlay.webContents.send('theme-resolved', getResolvedTheme());
    }
  });

  // Reposition overlay when displays change
  screen.on('display-added', () => repositionOverlay());
  screen.on('display-removed', () => repositionOverlay());
  screen.on('display-metrics-changed', () => repositionOverlay());

  // Set up app menu
  const appMenu = Menu.buildFromTemplate([
    {
      label: 'Keypress',
      submenu: [
        {
          label: 'About Keypress',
          click: () => createAboutWindow(),
        },
        {
          label: 'Check for Updates...',
          click: () => checkForUpdates(),
        },
        { type: 'separator' },
        {
          label: 'Show Keypress',
          type: 'checkbox',
          checked: isEnabled,
          accelerator: 'Alt+CmdOrCtrl+K',
          registerAccelerator: false, // uiohook handles global shortcut
          click: () => toggleKeypress(),
        },
        { type: 'separator' },
        {
          label: 'Settings...',
          accelerator: 'CmdOrCtrl+,',
          click: () => createSettingsWindow(),
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
  ]);
  Menu.setApplicationMenu(appMenu);
  toggleMenuItem = appMenu.items[0].submenu.items[3]; // "Show Keypress" checkbox

  // Tray icon (menu bar) — build normal + dimmed variants
  trayIconOn = nativeImage.createFromPath(path.join(__dirname, 'assets', 'trayTemplate.png'));
  trayIconOn.setTemplateImage(true);

  // Create dimmed icon by reducing alpha to ~35% (use @2x bitmap for retina crispness)
  const logicalSize = trayIconOn.getSize();
  const bitmap2x = trayIconOn.toBitmap({ scaleFactor: 2.0 });
  const dimmed = Buffer.from(bitmap2x);
  for (let i = 3; i < dimmed.length; i += 4) {
    dimmed[i] = Math.round(dimmed[i] * 0.35);
  }
  trayIconOff = nativeImage.createFromBitmap(dimmed, {
    width: logicalSize.width * 2,
    height: logicalSize.height * 2,
    scaleFactor: 2.0,
  });
  trayIconOff.setTemplateImage(true);

  tray = new Tray(trayIconOn);
  tray.setToolTip('Keypress');
  buildTrayMenu();

  // Auto-updater: set up event handlers and check silently on launch
  setupAutoUpdater();
  setTimeout(() => autoUpdater.checkForUpdates(), 3000);

  // Apply initial dock visibility from persisted setting
  if (settings.showInDock) {
    app.dock.show();
  } else {
    app.dock.hide();
  }

  // Sync login item with persisted setting (fails silently in dev — unsigned app)
  try { app.setLoginItemSettings({ openAtLogin: settings.launchAtLogin }); } catch {}

  createOverlay();

  // Check Accessibility permission before starting key listener
  const isTrusted = systemPreferences.isTrustedAccessibilityClient(false);
  if (isTrusted) {
    startKeyListener();
    capsLockOn = getSystemCapsLockState();
  } else {
    // Prompt for permission — opens System Settings > Privacy > Input Monitoring
    systemPreferences.isTrustedAccessibilityClient(true);
    // Poll for permission grant
    const checkInterval = setInterval(() => {
      if (systemPreferences.isTrustedAccessibilityClient(false)) {
        clearInterval(checkInterval);
        startKeyListener();
        capsLockOn = getSystemCapsLockState();
      }
    }, 2000);
  }
});

app.on('will-quit', () => {
  uIOhook.stop();
});

app.on('window-all-closed', (e) => {
  e.preventDefault(); // Keep running as background app
});
