# Keypress — Update Log

## v1.0.0 — Initial Release

### Core Features

- Real-time keystroke overlay with Mac keyboard keycap styling
- Stack and single display modes
- 6 preset positions + custom drag-to-reposition
- Light / Dark / Auto / Custom color themes
- Adjustable size (small / medium / large), opacity, and duration
- "All keys" and "Combos only" display filters
- Multi-monitor support with display name detection
- Settings window with three tabs (Appearance, Display, Options) and live preview
- Launch at login option
- Persisted settings via electron-conf

### Keycap Design

- Mac keycap-styled pills with gradient, border, and shadow matching physical keys
- Single-character keys use fixed-width `.char` class
- Modifier and icon keys use fixed-width layouts matching Apple Magic Keyboard style
- Shift+symbol resolves to typed character (e.g., Shift+/ → `?`, Shift+1 → `!`)
  - Only when Shift is the sole modifier (shortcuts like ⌘⇧/ show all keycaps)
  - Shift+letter unchanged — still shows `⇧ A`

### Custom Color Theme

- User picks a base color from 10 preset swatches or opens the native macOS color picker via the color well button
- All keycap styles (gradient, text, border, shadow) auto-derived from base color
- Light/dark text adapts based on WCAG luminance calculation
- Color well button styled as Apple UIColorWell (rainbow ring with selected color center)
- Active swatch indicator: white border with subtle shadow

### Caps Lock LED Indicator

- Keycap shows a green LED dot reflecting actual system caps lock state
- Uses `NSEvent.modifierFlags` via osascript for accurate reading on macOS

### Global Toggle (⌘⇧K)

- Toggle overlay on/off from any app via uiohook global shortcut
- Shows brief "Keypress ON/OFF" toast in overlay center
- Synced across tray menu, app menu, and settings window

### Menu Bar Tray Icon

- Template image in the macOS menu bar (adapts to light/dark automatically)
- Full opacity when enabled, 35% dimmed when disabled
- Right-click context menu: Settings, Show Keypress toggle, Quit

### Show in Dock Toggle

- New "Show in Dock" toggle in Settings > Options
- Hides/shows Dock icon; app remains accessible via tray when hidden

### Drag-to-Reposition

- Enter reposition mode from Settings > Display > Position > Custom
- Drag overlay to desired position, press Escape to save
- Persists custom X/Y coordinates (as screen %) across restarts

### Apple HIG Settings Controls

- Toggle switches: 36×16 track, 21×13 capsule knob, `#0D6FFF` active blue
- Sliders: 4px track with blue fill progress, 20×16 capsule thumb
- Default cursor (no pointer hand) matching macOS System Settings behavior
- Monitor picker: custom dropdown with rotating chevron and solid popover menu
- Tab key navigation blocked (matches native macOS System Settings behavior)
- Dark mode support for all settings controls via `prefers-color-scheme`

### App Icon

- Light and dark mode variants — macOS switches automatically based on system appearance
- Built with Apple Icon Composer `~dark` naming convention in `.iconset`

### Animation & Stability

- Entry animation direction adapts to position (slide up from bottom, down from top)
- Pills snap out after fading instead of collapsing height — eliminates post-appearance jitter
- Modifier-only presses debounced (150ms) so combos don't flash the modifier separately
- Repeat tracking cleared immediately on fade-out start to prevent stale state

### Security

- Context isolation and sandbox enabled on all windows
- Strict CSP: `default-src 'self'; style-src 'self' 'unsafe-inline'`
- Electron Fuses hardened: RunAsNode off, NodeOptions off, ASAR integrity on
- IPC input validated through `validateSettings()` whitelist
- No eval(), no innerHTML, no dynamic code execution

### Default Settings (First Install)

- Position: bottom-left (preset mode)
- Display mode: single
- Size: large
- Theme: light
- Opacity: 80%
- Duration: 1.5s
- Show modifier-only: on
- Show in Dock: on
- Launch at login: off

### Known Issues

- Color picker (via color well) opens on top of the settings window — macOS does not allow repositioning the `choose color` panel from an external process

---

## Future Improvements / Roadmap

### Overlay Architecture

- Investigate switching from full-screen transparent overlay to a small floating window approach
- Current approach: full-screen transparent `BrowserWindow` with `setIgnoreMouseEvents(true)`, CSS handles all positioning
- Alternative: fixed-size positioned window anchored to the correct screen location, smaller compositing surface
- Key concerns: `setBounds()` flicker on macOS transparent windows, reposition mode UX, animation smoothness during window resize
