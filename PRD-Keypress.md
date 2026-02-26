# Keypress — Product Requirements Document

**Platform**: macOS (Electron)
**Distribution**: Local `.dmg` for personal use
**Version**: 1.0

---

## Overview

**Keypress** is a lightweight macOS utility that captures keyboard input in real time and displays pressed keys as a floating overlay on screen. Purpose-built for screen recordings, live demos, and instructional content where viewers need to see exactly what the presenter is typing.

---

## Problem Statement

Keyboard shortcuts are essential for app demos, tutorials, and how-to videos. But audiences can't see what keys the presenter presses. This creates a gap between what's shown and what's explained — viewers lose track, rewind, or give up entirely.

---

## Target Users

- Educators & trainers recording screencasts or conducting live workshops
- Product marketers creating demo videos
- Developers & designers streaming workflows or making tutorials
- Anyone presenting while sharing their screen

---

## Design Principles

| Principle | Description |
|---|---|
| **Invisible until needed** | Stays out of the way. Only appears when a key is pressed. |
| **Native feel** | Looks like an Apple-made utility — SF Pro, smooth motion, respects light/dark mode. Settings UI matches Apple HIG controls. |
| **Zero config to start** | Works immediately after launch. Sensible defaults. |
| **Non-intrusive** | Never steals focus. Never blocks content. Fades in, fades out. |

---

## Core Features

### 1. Real-Time Keystroke Display

- Captures all keyboard input system-wide (requires macOS Accessibility / Input Monitoring permission)
- Displays each keystroke as a floating pill styled as a Mac keycap
- Modifier keys shown with standard Apple symbols (⌘ ⌥ ⇧ ⌃) with fixed-width keycap layout matching Apple Magic Keyboard
- Combinations displayed as grouped keycaps (e.g., `⌘ ⇧ S`)
- Regular keys shown individually with fixed-width `.char` class for consistent sizing
- Shift+symbol resolves to the typed character (e.g., Shift+/ → `?`, Shift+1 → `!`); only when Shift is the sole modifier

### 2. Visual Design

- **Floating overlay** — always on top, click-through, transparent background
- **Backdrop** — frosted glass / vibrancy effect (CSS `backdrop-filter: blur`)
- **Typography** — SF Pro or `-apple-system` font, medium weight
- **Shape** — keycap-styled pills with gradient, border, and shadow resembling physical Mac keys
- **Animation** — slide in on keypress (direction depends on position) → hold → fade out
- **Color themes**:
  - Light mode: white keycap gradient, dark text
  - Dark mode: dark keycap gradient, light text
  - Auto: follows system appearance via `nativeTheme`
  - Custom: user picks a base color; gradient, text, border, and shadow are auto-derived using WCAG luminance
- **Caps Lock LED** — green dot indicator on the Caps Lock keycap reflecting actual system state (read via `NSEvent.modifierFlags`)
- **App icon** — light and dark mode variants; macOS switches automatically based on system appearance
- **Position** — bottom-left of screen (configurable via 6 presets or custom drag-to-reposition)

### 3. Display Behavior

- **Stack mode** — new keystrokes push older ones; bottom positions anchor existing pills and prepend new ones above
- **Single mode** — only the latest keystroke is shown
- Rapid repeated keys show count badge (e.g., `×5`)
- Display duration: 1.5 seconds (configurable 0.5s–5s)
- Modifier-only presses are debounced (150ms) so combos don't flash the modifier before the full combo appears

### 4. Modifier Key Symbols

| Key | Symbol |
|---|---|
| Command | ⌘ |
| Option | ⌥ |
| Shift | ⇧ |
| Control | ⌃ |
| Caps Lock | ⇪ (with LED indicator) |

### 5. Settings Window

Accessible via **menu bar tray icon → Settings...** or **Keypress menu → Settings...** (⌘,). Tabbed window with three panels (Appearance, Display, Options). Draggable tab bar replaces titlebar. `vibrancy: sidebar`. All changes apply in real-time to the overlay. Settings persist across restarts via `electron-conf`.

**Appearance**
- **Theme** — Light / Dark / Auto / Custom — segmented control
- **Custom Color** — 10 preset color swatches + native macOS color picker via color well button (shown when Theme = Custom); auto-derives keycap styling
- **Size** — Small / Medium / Large — segmented control
- **Opacity** — 10%–100% — Apple HIG slider (4px track with blue fill, 20×16 capsule thumb)

**Display**
- **Position** — Preset (6-position 3×2 grid) or Custom (drag-to-reposition)
- **Monitor** — dropdown with display names (auto-detected via `Display.label`), duplicate numbering
- **Display Mode** — Single / Stack — segmented control
- **Show** — All Keys / Combos Only — segmented control
- **Duration** — 0.5s–5s — Apple HIG slider

**Options**
- **Show Keypress** — toggle (runtime on/off, synced with global shortcut and tray menu)
- **Show Modifier-Only Presses** — toggle
- **Show in Dock** — toggle (hides/shows Dock icon; app remains accessible via tray)
- **Launch at Login** — toggle

All toggles match Apple HIG design: 36×16 track, 21×13 capsule knob, `#0D6FFF` active color. Tab key navigation is blocked (matches native macOS System Settings behavior).

### 6. Global Toggle

- **⌘⇧K** — toggle overlay on/off from any app (handled in main process via uiohook)
- Shows brief "Keypress ON" / "Keypress OFF" toast in overlay center
- Synced across: tray menu checkbox, app menu checkbox, settings window toggle

### 7. Menu Bar Tray Icon

- macOS template image (adapts to light/dark menu bar automatically)
- **Normal state** — full opacity when Keypress is enabled
- **Dimmed state** — 35% alpha when Keypress is disabled
- **Context menu**: Settings... | Show Keypress (checkbox) | Quit

### 8. App Menu & Dock

- App menu: Keypress (About, Settings ⌘,, Show Keypress ⌘⇧K, Quit ⌘Q) | Edit (standard clipboard items)
- Dock icon visibility controlled by "Show in Dock" setting
- When Dock is hidden, tray icon remains as the primary access point

### 9. Drag-to-Reposition

- Enter reposition mode from Settings → Display → Position → Custom → "Reposition on Screen"
- Overlay becomes mouse-interactive; drag to desired position
- Press Escape to confirm and save coordinates
- Custom X/Y persisted as percentage of screen dimensions across restarts

---

## Permissions

- **Input Monitoring / Accessibility** — required for global keyboard monitoring
- `uiohook-napi` uses `libuiohook` under the hood, which relies on macOS Accessibility API
- On first launch, prompt with clear explanation and button to open System Settings → Privacy & Security → Input Monitoring

---

## Technical Architecture

### Stack

| Layer | Technology |
|---|---|
| Runtime | Electron 39.5.0 |
| UI | HTML + CSS + vanilla JS |
| Keyboard capture | **`uiohook-napi`** 1.5.4 (N-API bindings for `libuiohook`) |
| Settings persistence | **`electron-conf`** 1.3.0 (CommonJS-compatible) |
| Packaging | Electron Forge 7.11.x → `.dmg` |

### Security

- **Context isolation** — enabled on all renderer windows
- **Sandbox** — enabled on all renderer windows
- **CSP** — `default-src 'self'; style-src 'self' 'unsafe-inline'` on all HTML pages
- **Electron Fuses** — RunAsNode disabled, NodeOptions disabled, CLI inspect disabled, ASAR integrity validation enabled, cookie encryption enabled
- **No eval()** — no dynamic code execution anywhere
- **No innerHTML** — all DOM mutations use `textContent` and `appendChild`
- **IPC validation** — all `set-settings` input passes through `validateSettings()` whitelist
- **Preload bridge** — only exposes specific IPC methods via `contextBridge.exposeInMainWorld()`

### Window Configuration

```javascript
const overlay = new BrowserWindow({
  transparent: true,
  frame: false,
  alwaysOnTop: true,
  skipTaskbar: true,
  focusable: false,
  hasShadow: false,
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,
    sandbox: true,
  },
});

overlay.setIgnoreMouseEvents(true);
overlay.setVisibleOnAllWorkspaces(true);
```

### Default Settings

| Setting | Default |
|---|---|
| Position | bottom-left |
| Position Mode | preset |
| Display Mode | single |
| Display Filter | all |
| Duration | 1.5s |
| Size | large |
| Theme | light |
| Custom Color | #3B82F6 (blue) |
| Opacity | 80% |
| Show Modifier-Only | true |
| Monitor | primary |
| Show in Dock | true |
| Launch at Login | false |

---

## DMG Packaging

```yaml
# electron-builder.yml
mac:
  category: public.app-category.utilities
  target: dmg
dmg:
  title: Keypress
  contents:
    - x: 130
      y: 220
    - x: 410
      y: 220
      type: link
      path: /Applications
```

No codesigning or notarization needed for personal use.

---

## Out of Scope (v1)

- Mouse click visualization
- Key remapping or macros
- Windows/Linux support
- Keystroke recording/replay
- App Store distribution

---

## Performance Targets

- Launch: < 1 second
- Keystroke display latency: < 30ms
- Memory: < 80MB (Electron baseline)
- CPU idle: < 1%

---

## File Structure

```
keypress/
├── package.json
├── forge.config.js
├── electron-builder.yml
├── src/
│   ├── main.js              # Electron main process + uiohook listener + tray + IPC
│   ├── preload.js            # Context bridge (IPC to renderer)
│   ├── keymap.js             # UiohookKey → display label mapping + shift map
│   ├── overlay/
│   │   ├── index.html        # Overlay window
│   │   ├── styles.css        # Keycap styling, animations, size/theme variants
│   │   └── renderer.js       # Keystroke display, repeat detection, reposition mode
│   ├── settings/
│   │   ├── index.html        # Settings window (3-tab layout)
│   │   ├── styles.css        # Apple HIG controls (toggles, sliders, segmented, dropdown)
│   │   └── renderer.js       # Settings binding, monitor dropdown, live sync
│   └── assets/
│       ├── icon.icns              # App icon with light/dark variants (macOS)
│       ├── keypressIcon-light.png  # Source icon — light mode (1024×1024)
│       ├── keypressIcon-dark.png   # Source icon — dark mode (1024×1024)
│       ├── trayTemplate.png       # Menu bar icon 18×18
│       └── trayTemplate@2x.png   # Menu bar icon 36×36 (Retina)
└── scripts/
    └── generate-tray-icon.js  # Pure Node.js tray icon generator
```

---

*Keypress — Every key, instantly visible.*
