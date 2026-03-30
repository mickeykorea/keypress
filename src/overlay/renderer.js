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

  // Rawcode fallback — keycode 0 (VC_UNDEFINED) with a meaningful rawcode
  if (keycode === 0 && data.rawcode) {
    const rawLabel = RAWCODE_MAP[data.rawcode];
    if (rawLabel && MEDIA_ICONS[rawLabel]) {
      return [{ label: rawLabel, isModifier: false }];
    }
    return null; // Suppress unmapped keycode-0 events
  }

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

// Media key SVG icons — macOS function row (icon only, no label)
// Paths use currentColor to inherit keycap text color.
const MEDIA_ICONS = {
  'media-previous': {
    viewBox: '0 0 28.9746 14.9316',
    paths: [
      'M26.5332 13.5645L26.5332 1.34766C26.5332 0.429688 25.9961 0 25.3711 0C25.0879 0 24.8047 0.078125 24.5215 0.244141L14.2578 6.2207C13.5254 6.65039 13.2422 6.97266 13.2422 7.46094C13.2422 7.94922 13.5254 8.27148 14.2578 8.70117L24.5215 14.6777C24.8047 14.834 25.0879 14.9219 25.3711 14.9219C25.9961 14.9219 26.5332 14.4824 26.5332 13.5645ZM13.291 13.5645L13.291 1.34766C13.291 0.429688 12.7637 0 12.1289 0C11.8555 0 11.5625 0.078125 11.2793 0.244141L1.02539 6.2207C0.283203 6.65039 0 6.97266 0 7.46094C0 7.94922 0.283203 8.27148 1.02539 8.70117L11.2793 14.6777C11.5625 14.834 11.8555 14.9219 12.1289 14.9219C12.7637 14.9219 13.291 14.4824 13.291 13.5645Z',
    ],
  },
  'media-play': {
    viewBox: '0 0 28.8281 14.9316',
    paths: [
      'M0 13.5645C0 14.4824 0.527344 14.9219 1.16211 14.9219C1.43555 14.9219 1.72852 14.834 2.01172 14.6777L12.2656 8.70117C13.0078 8.27148 13.291 7.94922 13.291 7.46094C13.291 6.97266 13.0078 6.65039 12.2656 6.2207L2.01172 0.244141C1.72852 0.078125 1.43555 0 1.16211 0C0.527344 0 0 0.429688 0 1.34766ZM17.8516 14.8633L20.0684 14.8633C20.9277 14.8633 21.3672 14.4141 21.3672 13.5547L21.3672 1.35742C21.3672 0.458984 20.9277 0.0488281 20.0684 0.0488281L17.8516 0.0488281C16.9922 0.0488281 16.543 0.498047 16.543 1.35742L16.543 13.5547C16.543 14.4141 16.9922 14.8633 17.8516 14.8633ZM24.9414 14.8633L27.1582 14.8633C28.0176 14.8633 28.4668 14.4141 28.4668 13.5547L28.4668 1.35742C28.4668 0.458984 28.0176 0.0488281 27.1582 0.0488281L24.9414 0.0488281C24.082 0.0488281 23.6426 0.498047 23.6426 1.35742L23.6426 13.5547C23.6426 14.4141 24.082 14.8633 24.9414 14.8633Z',
    ],
  },
  'media-next': {
    viewBox: '0 0 28.252 14.9316',
    paths: [
      'M1.71875 13.5645C1.71875 14.4824 2.25586 14.9219 2.88086 14.9219C3.16406 14.9219 3.44727 14.834 3.73047 14.6777L13.9941 8.70117C14.7266 8.27148 15.0098 7.94922 15.0098 7.46094C15.0098 6.97266 14.7266 6.65039 13.9941 6.2207L3.73047 0.244141C3.44727 0.078125 3.16406 0 2.88086 0C2.25586 0 1.71875 0.429688 1.71875 1.34766ZM14.9609 13.5645C14.9609 14.4824 15.4883 14.9219 16.123 14.9219C16.3965 14.9219 16.6895 14.834 16.9727 14.6777L27.2266 8.70117C27.9688 8.27148 28.252 7.94922 28.252 7.46094C28.252 6.97266 27.9688 6.65039 27.2266 6.2207L16.9727 0.244141C16.6895 0.078125 16.3965 0 16.123 0C15.4883 0 14.9609 0.429688 14.9609 1.34766Z',
    ],
  },
  'volume-mute': {
    viewBox: '0 0 14.2578 17.2363',
    paths: [
      'M10.5273 17.2363C11.1719 17.2363 11.6309 16.7773 11.6309 16.1426L11.6309 1.16211C11.6309 0.527344 11.1719 0.00976562 10.5078 0.00976562C10.0586 0.00976562 9.74609 0.205078 9.24805 0.683594L5.08789 4.58984C5.01953 4.64844 4.94141 4.67773 4.84375 4.67773L2.04102 4.67773C0.722656 4.67773 0 5.41016 0 6.81641L0 10.4492C0 11.8652 0.722656 12.5879 2.04102 12.5879L4.84375 12.5879C4.94141 12.5879 5.01953 12.6172 5.08789 12.6758L9.24805 16.6211C9.69727 17.0508 10.0781 17.2363 10.5273 17.2363Z',
    ],
  },
  'volume-down': {
    viewBox: '0 0 17.7246 17.2363',
    paths: [
      'M15.1172 12.7734C15.4395 12.998 15.8984 12.9297 16.1621 12.5488C16.9141 11.5625 17.3633 10.1074 17.3633 8.61328C17.3633 7.11914 16.9141 5.67383 16.1621 4.67773C15.8984 4.29688 15.4395 4.21875 15.1172 4.45312C14.7168 4.72656 14.6582 5.21484 14.9609 5.61523C15.5273 6.39648 15.8496 7.48047 15.8496 8.61328C15.8496 9.74609 15.5176 10.8203 14.9609 11.6113C14.668 12.0215 14.7168 12.4902 15.1172 12.7734Z',
      'M10.5273 17.2363C11.1719 17.2363 11.6309 16.7773 11.6309 16.1426L11.6309 1.16211C11.6309 0.527344 11.1719 0.00976562 10.5078 0.00976562C10.0488 0.00976562 9.73633 0.205078 9.24805 0.683594L5.07812 4.58984C5.01953 4.64844 4.93164 4.67773 4.83398 4.67773L2.04102 4.67773C0.712891 4.67773 0 5.41016 0 6.81641L0 10.4492C0 11.8652 0.712891 12.5879 2.04102 12.5879L4.83398 12.5879C4.93164 12.5879 5.01953 12.6172 5.07812 12.6758L9.24805 16.6211C9.6875 17.0508 10.0684 17.2363 10.5273 17.2363Z',
    ],
  },
  'volume-up': {
    viewBox: '0 0 26.5723 18.8748',
    paths: [
      'M22.4023 18.7294C22.7344 18.9735 23.2129 18.8759 23.4766 18.4852C25.1855 16.0145 26.2109 12.8798 26.2109 9.4325C26.2109 5.97547 25.1562 2.86023 23.4766 0.379764C23.2129-0.020627 22.7344-0.108518 22.4023 0.135623C22.0312 0.389529 21.9824 0.848514 22.2461 1.2489C23.7598 3.48523 24.7168 6.29773 24.7168 9.4325C24.7168 12.5575 23.7598 15.3895 22.2461 17.6161C21.9824 18.0165 22.0312 18.4755 22.4023 18.7294Z',
      'M18.7402 16.1415C19.1016 16.3856 19.5508 16.2977 19.8145 15.9266C21.0645 14.2079 21.7969 11.8446 21.7969 9.4325C21.7969 7.02039 21.0742 4.63758 19.8145 2.93836C19.5508 2.56726 19.1016 2.47937 18.7402 2.72351C18.3789 2.96765 18.3203 3.42664 18.6035 3.82703C19.668 5.33094 20.2832 7.35242 20.2832 9.4325C20.2832 11.5126 19.6484 13.5145 18.6035 15.038C18.3301 15.4384 18.3789 15.8973 18.7402 16.1415Z',
      'M15.1172 13.5927C15.4395 13.8173 15.8984 13.7489 16.1621 13.368C16.9141 12.3817 17.3633 10.9266 17.3633 9.4325C17.3633 7.93836 16.9141 6.49304 16.1621 5.49695C15.8984 5.11609 15.4395 5.03797 15.1172 5.27234C14.7168 5.54578 14.6582 6.03406 14.9609 6.43445C15.5273 7.2157 15.8496 8.29969 15.8496 9.4325C15.8496 10.5653 15.5176 11.6395 14.9609 12.4305C14.668 12.8407 14.7168 13.3095 15.1172 13.5927Z',
      'M10.5273 18.0555C11.1719 18.0555 11.6309 17.5966 11.6309 16.9618L11.6309 1.98133C11.6309 1.34656 11.1719 0.828982 10.5078 0.828982C10.0488 0.828982 9.73633 1.02429 9.24805 1.50281L5.07812 5.40906C5.01953 5.46765 4.93164 5.49695 4.83398 5.49695L2.04102 5.49695C0.712891 5.49695 0 6.22937 0 7.63562L0 11.2684C0 12.6845 0.712891 13.4071 2.04102 13.4071L4.83398 13.4071C4.93164 13.4071 5.01953 13.4364 5.07812 13.495L9.24805 17.4403C9.6875 17.87 10.0684 18.0555 10.5273 18.0555Z',
    ],
  },
  'brightness-up': {
    viewBox: '0 0 21.4844 21.2012',
    paths: [
      'M10.5664 3.79883C11.0254 3.79883 11.4062 3.41797 11.4062 2.94922L11.4062 0.849609C11.4062 0.380859 11.0254 0 10.5664 0C10.0977 0 9.7168 0.380859 9.7168 0.849609L9.7168 2.94922C9.7168 3.41797 10.0977 3.79883 10.5664 3.79883ZM15.3516 5.80078C15.6836 6.12305 16.2207 6.13281 16.5527 5.80078L18.0469 4.30664C18.3691 3.98438 18.3691 3.4375 18.0469 3.10547C17.7246 2.7832 17.1777 2.7832 16.8555 3.10547L15.3516 4.60938C15.0293 4.93164 15.0293 5.47852 15.3516 5.80078ZM17.334 10.5957C17.334 11.0547 17.7246 11.4355 18.1836 11.4355L20.2832 11.4355C20.7422 11.4355 21.123 11.0547 21.123 10.5957C21.123 10.1367 20.7422 9.74609 20.2832 9.74609L18.1836 9.74609C17.7246 9.74609 17.334 10.1367 17.334 10.5957ZM15.3516 15.3906C15.0293 15.7227 15.0293 16.2598 15.3516 16.582L16.8555 18.0957C17.1777 18.418 17.7246 18.3984 18.0469 18.0859C18.3691 17.7539 18.3691 17.2168 18.0469 16.8945L16.543 15.3906C16.2207 15.0684 15.6836 15.0781 15.3516 15.3906ZM10.5664 17.3926C10.0977 17.3926 9.7168 17.7734 9.7168 18.2324L9.7168 20.3418C9.7168 20.8008 10.0977 21.1816 10.5664 21.1816C11.0254 21.1816 11.4062 20.8008 11.4062 20.3418L11.4062 18.2324C11.4062 17.7734 11.0254 17.3926 10.5664 17.3926ZM5.77148 15.3906C5.43945 15.0781 4.89258 15.0684 4.57031 15.3906L3.07617 16.8848C2.75391 17.207 2.75391 17.7441 3.06641 18.0762C3.38867 18.3887 3.94531 18.4082 4.26758 18.0859L5.76172 16.582C6.08398 16.2598 6.08398 15.7227 5.77148 15.3906ZM3.78906 10.5957C3.78906 10.1367 3.39844 9.74609 2.93945 9.74609L0.839844 9.74609C0.380859 9.74609 0 10.1367 0 10.5957C0 11.0547 0.380859 11.4355 0.839844 11.4355L2.93945 11.4355C3.39844 11.4355 3.78906 11.0547 3.78906 10.5957ZM5.76172 5.80078C6.08398 5.48828 6.08398 4.92188 5.77148 4.60938L4.27734 3.10547C3.96484 2.79297 3.4082 2.7832 3.08594 3.10547C2.76367 3.4375 2.76367 3.98438 3.07617 4.29688L4.57031 5.80078C4.89258 6.12305 5.42969 6.12305 5.76172 5.80078Z',
      'M10.5664 15.5664C13.3105 15.5664 15.5371 13.3398 15.5371 10.5957C15.5371 7.85156 13.3105 5.61523 10.5664 5.61523C7.82227 5.61523 5.58594 7.85156 5.58594 10.5957C5.58594 13.3398 7.82227 15.5664 10.5664 15.5664ZM10.5664 14.082C8.63281 14.082 7.07031 12.5293 7.07031 10.5957C7.07031 8.66211 8.63281 7.09961 10.5664 7.09961C12.5 7.09961 14.0527 8.66211 14.0527 10.5957C14.0527 12.5293 12.5 14.082 10.5664 14.082Z',
    ],
  },
  'brightness-down': {
    viewBox: '0 0 19.6875 19.3457',
    paths: [
      'M9.66797 2.03125C10.2246 2.03125 10.6836 1.58203 10.6836 1.01562C10.6836 0.449219 10.2246 0 9.66797 0C9.10156 0 8.65234 0.449219 8.65234 1.01562C8.65234 1.58203 9.10156 2.03125 9.66797 2.03125ZM15.791 4.56055C16.3477 4.56055 16.7969 4.11133 16.7969 3.54492C16.7969 2.97852 16.3477 2.5293 15.791 2.5293C15.2246 2.5293 14.7754 2.97852 14.7754 3.54492C14.7754 4.11133 15.2246 4.56055 15.791 4.56055ZM18.3203 10.6836C18.877 10.6836 19.3262 10.2344 19.3262 9.66797C19.3262 9.10156 18.877 8.65234 18.3203 8.65234C17.7539 8.65234 17.3047 9.10156 17.3047 9.66797C17.3047 10.2344 17.7539 10.6836 18.3203 10.6836ZM15.791 16.8066C16.3477 16.8066 16.7969 16.3574 16.7969 15.791C16.7969 15.2246 16.3477 14.7754 15.791 14.7754C15.2246 14.7754 14.7754 15.2246 14.7754 15.791C14.7754 16.3574 15.2246 16.8066 15.791 16.8066ZM9.66797 19.3359C10.2246 19.3359 10.6836 18.8867 10.6836 18.3203C10.6836 17.7539 10.2246 17.3047 9.66797 17.3047C9.10156 17.3047 8.65234 17.7539 8.65234 18.3203C8.65234 18.8867 9.10156 19.3359 9.66797 19.3359ZM3.54492 16.8066C4.11133 16.8066 4.56055 16.3574 4.56055 15.791C4.56055 15.2246 4.11133 14.7754 3.54492 14.7754C2.97852 14.7754 2.5293 15.2246 2.5293 15.791C2.5293 16.3574 2.97852 16.8066 3.54492 16.8066ZM1.01562 10.6836C1.58203 10.6836 2.03125 10.2344 2.03125 9.66797C2.03125 9.10156 1.58203 8.65234 1.01562 8.65234C0.449219 8.65234 0 9.10156 0 9.66797C0 10.2344 0.449219 10.6836 1.01562 10.6836ZM3.54492 4.56055C4.11133 4.56055 4.56055 4.11133 4.56055 3.54492C4.56055 2.97852 4.11133 2.5293 3.54492 2.5293C2.97852 2.5293 2.5293 2.97852 2.5293 3.54492C2.5293 4.11133 2.97852 4.56055 3.54492 4.56055Z',
      'M9.66797 14.6387C12.4121 14.6387 14.6387 12.4121 14.6387 9.66797C14.6387 6.92383 12.4121 4.6875 9.66797 4.6875C6.92383 4.6875 4.6875 6.92383 4.6875 9.66797C4.6875 12.4121 6.92383 14.6387 9.66797 14.6387ZM9.66797 13.1543C7.73438 13.1543 6.17188 11.6016 6.17188 9.66797C6.17188 7.73438 7.73438 6.17188 9.66797 6.17188C11.6016 6.17188 13.1543 7.73438 13.1543 9.66797C13.1543 11.6016 11.6016 13.1543 9.66797 13.1543Z',
    ],
  },
  'mission-control': {
    viewBox: '0 0 27.4316 17.7441',
    paths: [
      'M4.31641 17.7441L12.4902 17.7441C13.7988 17.7441 14.4531 17.0898 14.4531 15.752L14.4531 12.5195C14.4531 11.1719 13.7988 10.5176 12.4902 10.5176L4.31641 10.5176C3.00781 10.5176 2.35352 11.1719 2.35352 12.5195L2.35352 15.752C2.35352 17.0898 3.00781 17.7441 4.31641 17.7441Z',
      'M18.3301 16.4648L25.1074 16.4648C26.416 16.4648 27.0703 15.8105 27.0703 14.4629L27.0703 3.39844C27.0703 2.05078 26.416 1.39648 25.1074 1.39648L18.3301 1.39648C17.0215 1.39648 16.3672 2.05078 16.3672 3.39844L16.3672 14.4629C16.3672 15.8105 17.0215 16.4648 18.3301 16.4648Z',
      'M1.95312 8.48633L11.2988 8.48633C12.5977 8.48633 13.252 7.83203 13.252 6.48438L13.252 2.00195C13.252 0.654297 12.5977 0.00976562 11.2988 0.00976562L1.95312 0.00976562C0.654297 0.00976562 0 0.654297 0 2.00195L0 6.48438C0 7.83203 0.654297 8.48633 1.95312 8.48633Z',
    ],
  },
  'spotlight': {
    viewBox: '0 0 19.4434 19.2676',
    paths: [
      'M0 7.79297C0 12.0898 3.49609 15.5859 7.79297 15.5859C9.49219 15.5859 11.0449 15.0391 12.3242 14.1211L17.1289 18.9355C17.3535 19.1602 17.6465 19.2676 17.959 19.2676C18.623 19.2676 19.082 18.7695 19.082 18.1152C19.082 17.8027 18.9648 17.5195 18.7598 17.3145L13.9844 12.5098C14.9902 11.2012 15.5859 9.57031 15.5859 7.79297C15.5859 3.49609 12.0898 0 7.79297 0C3.49609 0 0 3.49609 0 7.79297ZM1.66992 7.79297C1.66992 4.41406 4.41406 1.66992 7.79297 1.66992C11.1719 1.66992 13.916 4.41406 13.916 7.79297C13.916 11.1719 11.1719 13.916 7.79297 13.916C4.41406 13.916 1.66992 11.1719 1.66992 7.79297Z',
    ],
  },
  'dictation': {
    viewBox: '0 0 14.3359 22.0996',
    paths: [
      'M6.99219 13.6035C8.93555 13.6035 10.2441 12.1484 10.2441 10.0684L10.2441 3.53516C10.2441 1.44531 8.93555 0 6.99219 0C5.03906 0 3.73047 1.44531 3.73047 3.53516L3.73047 10.0684C3.73047 12.1484 5.03906 13.6035 6.99219 13.6035ZM6.99219 17.0703C11.1426 17.0703 13.9746 14.2871 13.9746 10.2246L13.9746 8.24219C13.9746 7.83203 13.6523 7.50977 13.2422 7.50977C12.832 7.50977 12.5 7.83203 12.5 8.24219L12.5 10.166C12.5 13.4961 10.332 15.7031 6.99219 15.7031C3.64258 15.7031 1.47461 13.4961 1.47461 10.166L1.47461 8.24219C1.47461 7.83203 1.15234 7.50977 0.732422 7.50977C0.322266 7.50977 0 7.83203 0 8.24219L0 10.2246C0 14.2871 2.83203 17.0703 6.99219 17.0703ZM2.62695 20.8008L11.3477 20.8008C11.7578 20.8008 12.0898 20.4785 12.0898 20.0684C12.0898 19.6582 11.7578 19.3262 11.3477 19.3262L2.62695 19.3262C2.2168 19.3262 1.88477 19.6582 1.88477 20.0684C1.88477 20.4785 2.2168 20.8008 2.62695 20.8008ZM6.99219 20.4785C7.40234 20.4785 7.72461 20.1465 7.72461 19.7363L7.72461 16.7383C7.72461 16.3281 7.40234 15.9961 6.99219 15.9961C6.58203 15.9961 6.25 16.3281 6.25 16.7383L6.25 19.7363C6.25 20.1465 6.58203 20.4785 6.99219 20.4785Z',
    ],
  },
  'do-not-disturb': {
    viewBox: '0 0 19.9414 19.7349',
    paths: [
      'M10.2344 19.7161C14.4922 19.7161 17.9395 17.1477 19.4727 13.8762C19.8047 13.1926 19.3652 12.7336 18.7109 12.9387C17.9883 13.1829 16.7969 13.4172 15.6934 13.4172C9.83398 13.4172 6.47461 10.0579 6.47461 4.18873C6.47461 3.08521 6.71875 1.84498 7.07031 0.956304C7.35352 0.233648 6.85547-0.205805 6.16211 0.0969294C2.65625 1.62037 0 5.20435 0 9.48169C0 15.136 4.58984 19.7161 10.2344 19.7161Z',
    ],
  },
};

// Create an SVG element from icon definition (CSP-safe, no innerHTML)
function createSvgIcon(iconDef, label) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', iconDef.viewBox);
  svg.setAttribute('fill', 'currentColor');
  const size40 = ['brightness-up', 'brightness-down', 'media-previous', 'media-play', 'media-next'];
  if (label && label.startsWith('volume-')) {
    svg.style.cssText = 'height:35px;width:auto;min-height:35px;display:block;flex-shrink:0';
  } else if (size40.includes(label)) {
    svg.style.cssText = 'width:40px;height:40px;min-width:40px;min-height:40px;display:block;flex-shrink:0';
  } else {
    svg.style.cssText = 'width:35px;height:35px;min-width:35px;min-height:35px;display:block;flex-shrink:0';
  }
  for (const d of iconDef.paths) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
  }
  return svg;
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
  } else if (MEDIA_ICONS[part.label]) {
    keycap.className = 'keycap media-icon';
    keycap.appendChild(createSvgIcon(MEDIA_ICONS[part.label], part.label));
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
