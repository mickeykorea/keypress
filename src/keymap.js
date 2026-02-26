// UiohookKey numeric keycodes → display labels
// Loaded as <script> in overlay HTML (browser context)

const KEY_MAP = {
  // Control keys
  1: 'Esc',
  14: '⌫',
  15: 'Tab',
  28: 'Return',
  58: '⇪',
  57: 'Space',

  // Navigation
  3655: 'Home',
  3657: 'Page Up',
  3665: 'Page Down',
  3663: 'End',
  3666: 'Insert',
  3667: '⌦',

  // Arrows
  57416: '↑',
  57419: '←',
  57421: '→',
  57424: '↓',

  // Number row
  2: '1',
  3: '2',
  4: '3',
  5: '4',
  6: '5',
  7: '6',
  8: '7',
  9: '8',
  10: '9',
  11: '0',

  // Letters
  30: 'A', 48: 'B', 46: 'C', 32: 'D', 18: 'E',
  33: 'F', 34: 'G', 35: 'H', 23: 'I', 36: 'J',
  37: 'K', 38: 'L', 50: 'M', 49: 'N', 24: 'O',
  25: 'P', 16: 'Q', 19: 'R', 31: 'S', 20: 'T',
  22: 'U', 47: 'V', 17: 'W', 45: 'X', 21: 'Y',
  44: 'Z',

  // Symbols
  39: ';',
  13: '=',
  51: ',',
  12: '-',
  52: '.',
  53: '/',
  41: '`',
  26: '[',
  43: '\\',
  27: ']',
  40: "'",

  // Function keys
  59: 'F1', 60: 'F2', 61: 'F3', 62: 'F4',
  63: 'F5', 64: 'F6', 65: 'F7', 66: 'F8',
  67: 'F9', 68: 'F10', 87: 'F11', 88: 'F12',
  91: 'F13', 92: 'F14', 93: 'F15', 99: 'F16',
  100: 'F17', 101: 'F18', 102: 'F19', 103: 'F20',
  104: 'F21', 105: 'F22', 106: 'F23', 107: 'F24',

  // Numpad
  82: 'Num 0', 79: 'Num 1', 80: 'Num 2', 81: 'Num 3',
  75: 'Num 4', 76: 'Num 5', 77: 'Num 6',
  71: 'Num 7', 72: 'Num 8', 73: 'Num 9',
  55: 'Num *', 78: 'Num +', 74: 'Num -',
  83: 'Num .', 3637: 'Num /',

  // System
  69: 'Num Lock',
  70: 'Scroll Lock',
  3639: 'Print Screen',
};

// Shift + key → resolved symbol (US QWERTY). Only symbols/numbers, not letters.
const SHIFT_MAP = {
  // Number row
  2: '!', 3: '@', 4: '#', 5: '$', 6: '%',
  7: '^', 8: '&', 9: '*', 10: '(', 11: ')',
  // Symbols
  12: '_',   // -  → _
  13: '+',   // =  → +
  26: '{',   // [  → {
  27: '}',   // ]  → }
  43: '|',   // \  → |
  39: ':',   // ;  → :
  40: '"',   // '  → "
  51: '<',   // ,  → <
  52: '>',   // .  → >
  53: '?',   // /  → ?
  41: '~',   // `  → ~
};

// Modifier keycodes — these get special treatment
const MODIFIER_KEYCODES = new Set([
  29, 3613,   // Ctrl, CtrlRight
  56, 3640,   // Alt, AltRight
  42, 54,     // Shift, ShiftRight
  3675, 3676, // Meta, MetaRight
]);

// Special keycodes — shown in "combos only" mode even without modifiers
// Includes: Esc, Backspace, Tab, Return, CapsLock, Space, navigation, arrows, F-keys, Delete
const SPECIAL_KEYCODES = new Set([
  1,      // Esc
  14,     // Backspace
  15,     // Tab
  28,     // Return
  58,     // CapsLock
  57,     // Space
  3655,   // Home
  3657,   // Page Up
  3665,   // Page Down
  3663,   // End
  3666,   // Insert
  3667,   // Delete
  57416,  // Up
  57419,  // Left
  57421,  // Right
  57424,  // Down
  // F-keys
  59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 87, 88,
  91, 92, 93, 99, 100, 101, 102, 103, 104, 105, 106, 107,
]);
