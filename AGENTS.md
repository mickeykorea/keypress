# Agents

## Cursor Cloud specific instructions

### Overview

Keypress is a macOS Electron desktop app that shows a floating keystroke overlay. On Linux/Cloud VMs it runs with some caveats (see below).

### Running the app

- **Install:** `npm install` (triggers `patch-package` and `@electron/rebuild` for `uiohook-napi` native module via postinstall)
- **Start:** `DISPLAY=:1 npx electron . --no-sandbox`
- **Build (macOS .dmg):** `npm run build` (only succeeds on macOS)

### Key caveats on Linux / Cloud VMs

- `app.dock` is a macOS-only Electron API. On Linux it is `undefined`, causing a non-fatal `TypeError: Cannot read properties of undefined (reading 'show')` at startup (line 658 of `src/main.js`). This does **not** prevent the app from running.
- The `uiohook-napi` keyboard hook (`uIOhook.start()`) requires X11 input APIs. On Linux it needs `libxtst-dev`, `libxinerama-dev`, `libxrandr-dev`, and `libxkbcommon-x11-dev` system packages. These must be pre-installed before `npm install`.
- Electron must be launched with `--no-sandbox` on the Cloud VM.
- The Xfce desktop may not have a system tray plugin by default. To see the Keypress tray icon: right-click the panel → Panel → Add New Items → "Status Tray Plugin" → Add.
- The overlay window is transparent and invisible unless keystrokes are actively being pressed.
- There is no ESLint, Prettier, TypeScript, or test framework configured in this project. No lint or test commands exist.
- `npm run build` targets macOS only (`electron-builder` produces `.dmg` / `.zip`). It will not succeed on Linux.
