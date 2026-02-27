# Keypress

A lightweight macOS utility that displays keyboard input as a floating overlay. Built for screen recordings, live demos, and tutorials where viewers need to see exactly what keys are being pressed.

<!-- TODO: Add a hero screenshot or GIF here -->
<!-- ![Keypress Demo](assets/demo.gif) -->

## Features

- **Real-time keystroke overlay** — keycaps styled to match the Apple Magic Keyboard
- **Modifier symbols** — ⌘ ⌥ ⇧ ⌃ with proper Apple iconography
- **Light / Dark / Auto / Custom themes** — follows system appearance or pick your own color
- **Stack & Single display modes** — show keystroke history or just the latest key
- **6 preset positions + drag-to-reposition** — place the overlay anywhere on screen
- **Multi-monitor support** — choose which display to show the overlay on
- **Adjustable size, opacity, and duration** — fine-tune the overlay to your needs
- **Global toggle** — ⌘⇧K to show/hide from any app
- **Menu bar tray icon** — quick access without a Dock icon
- **Apple HIG settings UI** — native-feeling controls that match macOS System Settings

<!-- TODO: Add a screenshot of the settings window -->
<!-- ![Settings](assets/settings.png) -->

## Installation

### From Source

```bash
git clone https://github.com/mickeykorea/keypress.git
cd keypress
npm install
npm start
```

### DMG (Coming Soon)

Pre-built `.dmg` releases will be available on the [Releases](https://github.com/mickeykorea/keypress/releases) page once code signing is set up.

## Requirements

- macOS 13 Ventura or later
- **Input Monitoring permission** — required for global keyboard capture. On first launch, grant access in System Settings > Privacy & Security > Input Monitoring.

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Electron 39 |
| UI | HTML + CSS + vanilla JS |
| Keyboard capture | uiohook-napi |
| Settings persistence | electron-conf |
| Packaging | Electron Forge / electron-builder |

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| ⌘⇧K | Toggle overlay on/off |
| ⌘, | Open Settings |
| ⌘Q | Quit |

## License

[GPL-3.0](LICENSE)

## Author

**Mickey Oh** — [mickey@protopie.io](mailto:mickey@protopie.io)
