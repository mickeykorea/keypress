// Overlay renderer — displays keystroke pills
// KEY_MAP, MODIFIER_KEYCODES, and SPECIAL_KEYCODES are loaded via <script> from keymap.js

const container = document.getElementById('keystroke-container');

// ── Color derivation utilities for custom theme ──

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map((v) => {
    const clamped = Math.max(0, Math.min(255, Math.round(v)));
    return clamped.toString(16).padStart(2, '0');
  }).join('');
}

// Relative luminance per WCAG 2.0
function luminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Derive all keycap CSS variables from a single hex color
function deriveCustomTheme(hex) {
  const { r, g, b } = hexToRgb(hex);
  const lum = luminance(r, g, b);

  // Gradient: top is lightened, bottom is the base
  const topR = r + (255 - r) * 0.12;
  const topG = g + (255 - g) * 0.12;
  const topB = b + (255 - b) * 0.12;
  const bgTop = rgbToHex(topR, topG, topB);
  const bgBottom = hex;

  // Text: dark on light backgrounds, light on dark
  const isLight = lum > 0.35;
  const textColor = isLight ? 'rgba(0, 0, 0, 0.85)' : 'rgba(255, 255, 255, 0.9)';

  // Borders and shadows adapt based on luminance
  const borderColor = isLight ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.1)';
  const borderBottomColor = isLight ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.4)';
  const shadowTight = isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(0, 0, 0, 0.35)';
  const shadowSpread = isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(0, 0, 0, 0.25)';

  return { bgTop, bgBottom, textColor, borderColor, borderBottomColor, shadowTight, shadowSpread };
}

function applyCustomThemeColors(hex) {
  const root = document.documentElement;
  const d = deriveCustomTheme(hex);
  root.style.setProperty('--keycap-bg-top', d.bgTop);
  root.style.setProperty('--keycap-bg-bottom', d.bgBottom);
  root.style.setProperty('--keycap-text', d.textColor);
  root.style.setProperty('--keycap-border', d.borderColor);
  root.style.setProperty('--keycap-border-bottom', d.borderBottomColor);
  root.style.setProperty('--keycap-shadow-tight', d.shadowTight);
  root.style.setProperty('--keycap-shadow-spread', d.shadowSpread);
}

let currentSettings = {
  displayMode: 'single',
  displayFilter: 'all',
  duration: 1.5,
  showModifierOnly: true,
  position: 'bottom-left',
  size: 'large',
  theme: 'light',
  opacity: 80,
  monitor: 'primary',
};

// Track last pill for repeat detection
let lastPill = null;
let lastDisplayText = '';
let repeatCount = 1;

// Apply visual settings to the overlay DOM
function applyVisualSettings(s) {
  const root = document.documentElement;

  if (s.positionMode === 'custom') {
    root.setAttribute('data-position', 'custom');
    const x = s.customX !== undefined ? s.customX : 50;
    const y = s.customY !== undefined ? s.customY : 80;
    root.style.setProperty('--custom-x', x + '%');
    root.style.setProperty('--custom-y', y + '%');
    root.setAttribute('data-stack', y > 50 ? 'down' : 'up');
  } else if (s.position) {
    root.setAttribute('data-position', s.position);
    root.removeAttribute('data-stack');
  }

  if (s.size) {
    root.setAttribute('data-size', s.size);
  }
  if (s.opacity !== undefined) {
    root.style.setProperty('--pill-opacity', (s.opacity / 100).toFixed(2));
  }
}

// Apply resolved theme (light/dark/custom) to the DOM
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  if (theme === 'custom') {
    applyCustomThemeColors(currentSettings.customColor || '#3B82F6');
  }
}

// Load initial settings
window.Keypress.getSettings().then((s) => {
  currentSettings = { ...currentSettings, ...s };
  applyVisualSettings(s);
});

// Get resolved theme on startup
window.Keypress.getResolvedTheme().then((theme) => {
  applyTheme(theme);
});

// Listen for settings changes
window.Keypress.onSettingsChanged((s) => {
  currentSettings = { ...currentSettings, ...s };
  applyVisualSettings(s);

  // If theme changed, re-resolve
  if (s.theme !== undefined) {
    window.Keypress.getResolvedTheme().then((theme) => {
      applyTheme(theme);
    });
  }

  // If customColor changed while in custom mode, re-derive
  if (s.customColor !== undefined && currentSettings.theme === 'custom') {
    applyCustomThemeColors(s.customColor);
  }
});

// Listen for system theme changes (only matters in Auto mode)
window.Keypress.onThemeResolved((theme) => {
  applyTheme(theme);
});

// Update caps lock LED when actual system state changes (on keyup)
window.Keypress.onCapsLockState((isOn) => {
  document.querySelectorAll('.caps-led').forEach((led) => {
    led.classList.toggle('on', isOn);
  });
});

// Bottom preset positions use column + flex-end with prepend (not column-reverse)
// so existing pills stay anchored when new ones appear above them.
function useBottomStack() {
  if (currentSettings.positionMode === 'custom') return false;
  const pos = currentSettings.position || 'bottom-center';
  return pos.startsWith('bottom');
}

// Modifier symbol → name mapping (Apple Magic Keyboard style)
const MOD_NAMES = {
  '⌃': 'control',
  '⌥': 'option',
  '⇧': 'shift',
  '⌘': 'command',
};

// Build an array of key part objects for a key event
function buildKeyParts(data) {
  const { keycode, altKey, ctrlKey, metaKey, shiftKey } = data;
  const isModifier = MODIFIER_KEYCODES.has(keycode);

  // If this is a modifier-only press, show modifier symbol + name (or skip)
  if (isModifier) {
    if (!currentSettings.showModifierOnly) return null;

    const modMap = {
      29: '⌃', 3613: '⌃',
      56: '⌥', 3640: '⌥',
      42: '⇧', 54: '⇧',
      3675: '⌘', 3676: '⌘',
    };
    const symbol = modMap[keycode];
    if (!symbol) return null;
    return [{ symbol, name: MOD_NAMES[symbol], isModifier: true }];
  }

  // Caps lock (keycode 58) — special keycap with LED indicator
  if (keycode === 58) {
    return [{ symbol: '⇪', name: 'caps lock', isModifier: true, capsLed: data.capsLockOn }];
  }

  // Non-modifier key — build modifier prefix + key label
  const modifiers = [];
  if (ctrlKey) modifiers.push('⌃');
  if (altKey) modifiers.push('⌥');
  if (shiftKey) modifiers.push('⇧');
  if (metaKey) modifiers.push('⌘');

  // Shift-only + symbol/number → show resolved character (e.g. ? instead of ⇧ /)
  const shiftOnly = shiftKey && !ctrlKey && !altKey && !metaKey;
  const shiftedLabel = shiftOnly ? SHIFT_MAP[keycode] : undefined;
  if (shiftedLabel) {
    return [{ label: shiftedLabel, isModifier: false }];
  }

  const hasModifier = modifiers.length > 0;
  const isSpecial = SPECIAL_KEYCODES.has(keycode);

  // "Combos only" filter — skip plain keys that aren't special and have no modifiers
  if (currentSettings.displayFilter === 'combos' && !hasModifier && !isSpecial) {
    return null;
  }

  const keyLabel = KEY_MAP[keycode] || `[${keycode}]`;
  const parts = modifiers.map((sym) => ({ symbol: sym, name: MOD_NAMES[sym], isModifier: true }));
  parts.push({ label: keyLabel, isModifier: false });
  return parts;
}

// Special key glyphs — text symbol + name (stacked layout like modifiers)
const KEY_ICONS = {
  'Esc':    { name: 'esc',    glyph: '⎋' },
  'Space':  { name: 'space',  glyph: '␣' },
  'Return': { name: 'return', glyph: '↩' },
  '⌫':     { name: 'delete', glyph: '⌫' },
  '⌦':     { name: 'delete', glyph: '⌦' },
  'Tab':    { name: 'tab',    glyph: '⇥' },
};

// Derive a comparable string from parts for repeat detection
function partsToString(parts) {
  return parts.map((p) => p.isModifier ? p.symbol : p.label).join(' ');
}

// Create a keycap element from a part object
function createKeycap(part) {
  const keycap = document.createElement('kbd');

  if (part.isModifier) {
    keycap.className = 'keycap modifier';

    const sym = document.createElement('span');
    sym.className = 'mod-symbol';
    sym.textContent = part.symbol;

    // Caps lock — LED and symbol on the same row
    if (part.capsLed !== undefined) {
      const row = document.createElement('span');
      row.className = 'caps-row';
      const led = document.createElement('span');
      led.className = 'caps-led' + (part.capsLed ? ' on' : '');
      row.appendChild(led);
      row.appendChild(sym);
      keycap.appendChild(row);
    } else {
      keycap.appendChild(sym);
    }

    const name = document.createElement('span');
    name.className = 'mod-name';
    name.textContent = part.name;
    keycap.appendChild(name);
  } else if (KEY_ICONS[part.label]) {
    const icon = KEY_ICONS[part.label];
    keycap.className = 'keycap icon-key';

    const sym = document.createElement('span');
    sym.className = 'mod-symbol';
    sym.textContent = icon.glyph;
    keycap.appendChild(sym);

    const name = document.createElement('span');
    name.className = 'mod-name';
    name.textContent = icon.name;
    keycap.appendChild(name);
  } else if ('↑↓←→'.includes(part.label)) {
    keycap.className = 'keycap arrow-key';
    keycap.textContent = part.label;
  } else {
    keycap.className = part.label.length === 1 ? 'keycap char' : 'keycap';
    keycap.textContent = part.label;
  }

  return keycap;
}

// Create and show a keystroke with individual keycaps
function showKeystroke(parts) {
  const displayText = partsToString(parts);

  // Repeat detection — same key pressed again while previous pill is still in DOM
  if (displayText === lastDisplayText && lastPill && lastPill.parentNode) {
    repeatCount++;
    const pill = lastPill;

    // If pill is mid-fade, cancel it and restore visibility
    if (pill.classList.contains('fade-out')) {
      pill.classList.remove('fade-out');
      pill.style.opacity = '';
      pill.style.transform = '';
    }

    // Update badge
    let badge = pill.querySelector('.repeat-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'repeat-badge';
      pill.appendChild(badge);
    }
    badge.textContent = `×${repeatCount}`;

    // Reset fade timer
    clearTimeout(pill._fadeTimer);
    pill._fadeTimer = setTimeout(() => fadeOut(pill), currentSettings.duration * 1000);
    return;
  }

  // New keystroke
  repeatCount = 1;

  // In single mode, remove previous pills immediately
  if (currentSettings.displayMode === 'single') {
    while (container.firstChild) {
      clearTimeout(container.firstChild._fadeTimer);
      container.firstChild.remove();
    }
  }

  const pill = document.createElement('div');
  pill.className = 'keystroke';

  // Create individual keycap for each key part
  for (const part of parts) {
    pill.appendChild(createKeycap(part));
  }

  // Bottom positions: append so newest is at bottom, older keys push upward.
  // Top/custom positions: prepend so newest is at top, older keys push downward.
  if (useBottomStack()) {
    container.appendChild(pill);
  } else {
    container.prepend(pill);
  }

  // In stack mode, limit to 4 visible pills — remove oldest
  if (currentSettings.displayMode === 'stack') {
    const fromEnd = useBottomStack();
    while (container.children.length > 4) {
      const oldest = fromEnd ? container.firstChild : container.lastChild;
      clearTimeout(oldest._fadeTimer);
      oldest.remove();
    }
  }

  // Schedule fade-out
  pill._fadeTimer = setTimeout(() => fadeOut(pill), currentSettings.duration * 1000);

  lastPill = pill;
  lastDisplayText = displayText;
}

function fadeOut(pill) {
  if (!pill.parentNode) return; // Already removed

  // Clear repeat tracking immediately so the next press creates a fresh pill
  if (pill === lastPill) {
    lastPill = null;
    lastDisplayText = '';
  }

  pill.classList.add('fade-out');

  const onFadeEnd = () => {
    pill.removeEventListener('animationend', onFadeEnd);
    pill.remove();
  };
  pill.addEventListener('animationend', onFadeEnd);

  // Safety: remove pill if animationend never fires
  setTimeout(() => { if (pill.parentNode) pill.remove(); }, 600);
}

// Debounce modifier-only presses so combos (e.g. ⌘+C) don't show
// the modifier as a separate keycap before the combo appears
let pendingModifier = null;
let pendingModifierTimer = null;
const MOD_DEBOUNCE_MS = 150;

// Listen for key events from main process
window.Keypress.onKeyPressed((data) => {
  const parts = buildKeyParts(data);
  if (!parts) return;

  // Is this a modifier-only press? (exclude caps lock — it's a discrete toggle)
  const isModifierOnly = parts.length === 1 && parts[0].isModifier && parts[0].capsLed === undefined;

  if (isModifierOnly) {
    // Replace any previous pending modifier and restart the timer
    clearTimeout(pendingModifierTimer);
    pendingModifier = parts;
    pendingModifierTimer = setTimeout(() => {
      if (pendingModifier) {
        showKeystroke(pendingModifier);
        pendingModifier = null;
      }
    }, MOD_DEBOUNCE_MS);
  } else {
    // Non-modifier key — cancel any pending modifier (it's part of this combo)
    clearTimeout(pendingModifierTimer);
    pendingModifier = null;
    showKeystroke(parts);
  }
});

// ── Reposition mode ──────────────────────────────────────────────

window.Keypress.onEnterRepositionMode(() => {
  const root = document.documentElement;
  document.body.classList.add('reposition-mode');

  // Set to custom position mode immediately
  root.setAttribute('data-position', 'custom');
  const x = currentSettings.customX !== undefined ? currentSettings.customX : 50;
  const y = currentSettings.customY !== undefined ? currentSettings.customY : 80;
  root.style.setProperty('--custom-x', x + '%');
  root.style.setProperty('--custom-y', y + '%');
  root.setAttribute('data-stack', y > 50 ? 'up' : 'down');

  // Add scrim
  const scrim = document.createElement('div');
  scrim.className = 'reposition-scrim';
  document.body.appendChild(scrim);

  // Add preview pill so there's something visible to drag
  const preview = document.createElement('div');
  preview.className = 'keystroke';
  preview.style.opacity = 'var(--pill-opacity, 0.75)';
  preview.style.animation = 'none';

  const cmdCap = document.createElement('kbd');
  cmdCap.className = 'keycap modifier';
  const cmdSym = document.createElement('span');
  cmdSym.className = 'mod-symbol';
  cmdSym.textContent = '⌘';
  const cmdName = document.createElement('span');
  cmdName.className = 'mod-name';
  cmdName.textContent = 'command';
  cmdCap.appendChild(cmdSym);
  cmdCap.appendChild(cmdName);
  preview.appendChild(cmdCap);

  const cCap = document.createElement('kbd');
  cCap.className = 'keycap';
  cCap.textContent = 'C';
  preview.appendChild(cCap);

  container.appendChild(preview);

  // Add instructions
  const instructions = document.createElement('div');
  instructions.className = 'reposition-instructions';
  instructions.textContent = 'Drag to reposition · Press Escape to save';
  document.body.appendChild(instructions);

  // Drag state
  let isDragging = false;
  let startMouseX, startMouseY;
  let startContainerX, startContainerY;

  function getContainerPos() {
    const rect = container.getBoundingClientRect();
    // Container center X (since we use translateX(-50%))
    return {
      x: rect.left + rect.width / 2,
      y: rect.top,
    };
  }

  function onMouseDown(e) {
    isDragging = true;
    container.classList.add('dragging');
    const pos = getContainerPos();
    startMouseX = e.clientX;
    startMouseY = e.clientY;
    startContainerX = pos.x;
    startContainerY = pos.y;
    e.preventDefault();
  }

  function onMouseMove(e) {
    if (!isDragging) return;
    const dx = e.clientX - startMouseX;
    const dy = e.clientY - startMouseY;
    const newX = ((startContainerX + dx) / window.innerWidth) * 100;
    const newY = ((startContainerY + dy) / window.innerHeight) * 100;
    const clampedX = Math.max(2, Math.min(98, newX));
    const clampedY = Math.max(2, Math.min(98, newY));
    root.style.setProperty('--custom-x', clampedX + '%');
    root.style.setProperty('--custom-y', clampedY + '%');
    root.setAttribute('data-stack', clampedY > 50 ? 'up' : 'down');
  }

  function onMouseUp() {
    if (!isDragging) return;
    isDragging = false;
    container.classList.remove('dragging');
  }

  function cleanup() {
    // Calculate final position from CSS variables
    const finalX = parseFloat(root.style.getPropertyValue('--custom-x'));
    const finalY = parseFloat(root.style.getPropertyValue('--custom-y'));

    // Remove UI
    document.body.classList.remove('reposition-mode');
    scrim.remove();
    instructions.remove();
    preview.remove();

    // Remove listeners
    container.removeEventListener('mousedown', onMouseDown);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);

    // Save position and exit reposition mode
    window.Keypress.exitRepositionMode({ x: Math.round(finalX), y: Math.round(finalY) });
  }

  // Main process sends finish-reposition when Escape is pressed (via uiohook)
  window.Keypress.onFinishReposition(() => cleanup());

  container.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
});
