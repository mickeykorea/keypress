const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('Keypress', {
  getVersion: () => ipcRenderer.invoke('get-version'),
  onKeyPressed: (callback) => {
    ipcRenderer.on('key-pressed', (_event, data) => callback(data));
  },
  onKeyReleased: (callback) => {
    ipcRenderer.on('key-released', (_event, data) => callback(data));
  },
  onSettingsChanged: (callback) => {
    ipcRenderer.on('settings-changed', (_event, data) => callback(data));
  },
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSettings: (settings) => ipcRenderer.invoke('set-settings', settings),
  getResolvedTheme: () => ipcRenderer.invoke('get-resolved-theme'),
  onThemeResolved: (callback) => {
    ipcRenderer.on('theme-resolved', (_event, theme) => callback(theme));
  },
  getDisplays: () => ipcRenderer.invoke('get-displays'),
  enterRepositionMode: () => ipcRenderer.invoke('enter-reposition-mode'),
  exitRepositionMode: (pos) => ipcRenderer.invoke('exit-reposition-mode', pos),
  onEnterRepositionMode: (callback) => {
    ipcRenderer.on('enter-reposition-mode', () => callback());
  },
  onFinishReposition: (callback) => {
    ipcRenderer.on('finish-reposition', () => callback());
  },
  onCapsLockState: (callback) => {
    ipcRenderer.on('caps-lock-state', (_event, isOn) => callback(isOn));
  },
  onToggleKeypress: (callback) => {
    ipcRenderer.on('toggle-keypress', (_event, enabled) => callback(enabled));
  },
  getEnabled: () => ipcRenderer.invoke('get-enabled'),
  setEnabled: (enabled) => ipcRenderer.invoke('set-enabled', enabled),
  pickColor: (currentHex) => ipcRenderer.invoke('pick-color', currentHex),
});
