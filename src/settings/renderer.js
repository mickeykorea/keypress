// Settings renderer — loads current settings, binds controls, saves changes in real-time

let currentSettings = {};

async function init() {
  currentSettings = await window.Keypress.getSettings();
  const enabled = await window.Keypress.getEnabled();
  document.getElementById('enableKeypress').checked = enabled;
  await populateMonitors();
  applySettingsToControls(currentSettings);
  bindControls();
  initTabs();
}

function initTabs() {
  const btns = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');

  btns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      btns.forEach((b) => b.classList.toggle('active', b === btn));
      panels.forEach((p) => p.classList.toggle('active', p.dataset.tab === tab));
    });
  });
}

let monitorOptions = []; // [{value, label}]

async function populateMonitors() {
  const displays = await window.Keypress.getDisplays();
  monitorOptions = [
    { value: 'primary', label: 'Primary Display' },
    ...displays.map((d) => ({ value: d.id, label: d.label })),
  ];
  buildMonitorMenu();
}

function buildMonitorMenu() {
  const menu = document.getElementById('monitor-menu');
  menu.textContent = '';
  monitorOptions.forEach((opt) => {
    const btn = document.createElement('button');
    btn.className = 'dropdown-item';
    btn.dataset.value = opt.value;
    btn.textContent = opt.label;
    btn.addEventListener('click', () => {
      selectMonitor(opt.value);
      closeMonitorDropdown();
    });
    menu.appendChild(btn);
  });
}

function selectMonitor(value) {
  document.getElementById('monitor-label').textContent =
    (monitorOptions.find((o) => o.value === value) || monitorOptions[0]).label;
  document.querySelectorAll('#monitor-menu .dropdown-item').forEach((item) => {
    item.classList.toggle('active', item.dataset.value === value);
  });
  updateSetting('monitor', value);
}

function syncMonitorToValue(value) {
  const opt = monitorOptions.find((o) => o.value === value) || monitorOptions[0];
  document.getElementById('monitor-label').textContent = opt.label;
  document.querySelectorAll('#monitor-menu .dropdown-item').forEach((item) => {
    item.classList.toggle('active', item.dataset.value === value);
  });
}

function closeMonitorDropdown() {
  document.getElementById('monitor-dropdown').classList.remove('open');
}

function applySettingsToControls(s) {
  // Segmented controls
  document.querySelectorAll('.segmented-control').forEach((control) => {
    const settingKey = control.dataset.setting;
    const value = s[settingKey];
    control.querySelectorAll('button').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.value === String(value));
    });
  });

  // Position grid
  const posGrid = document.querySelector('.position-grid');
  if (posGrid) {
    posGrid.querySelectorAll('button').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.value === s.position);
    });
  }

  // Position mode — show/hide preset grid vs custom button
  togglePositionMode(s.positionMode || 'preset');

  // Custom theme color row — show/hide based on theme
  toggleCustomColorRow(s.theme);
  if (s.customColor) {
    applyActiveColorSwatch(s.customColor);
    updateColorWell(s.customColor);
  }

  // Duration slider
  const durationSlider = document.getElementById('duration');
  durationSlider.value = s.duration;
  document.getElementById('duration-value').textContent = `${s.duration}s`;
  updateSliderProgress(durationSlider);

  // Opacity slider
  const opacitySlider = document.getElementById('opacity');
  opacitySlider.value = s.opacity;
  document.getElementById('opacity-value').textContent = `${s.opacity}%`;
  updateSliderProgress(opacitySlider);

  // Monitor stepper
  syncMonitorToValue(s.monitor);

  // Toggles
  document.getElementById('showModifierOnly').checked = s.showModifierOnly;
  document.getElementById('showInDock').checked = s.showInDock !== false;
  document.getElementById('launchAtLogin').checked = s.launchAtLogin;
}

function bindControls() {
  // Segmented controls
  document.querySelectorAll('.segmented-control').forEach((control) => {
    const settingKey = control.dataset.setting;
    control.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        control.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        updateSetting(settingKey, btn.dataset.value);
        if (settingKey === 'positionMode') {
          togglePositionMode(btn.dataset.value);
        }
        if (settingKey === 'theme') {
          toggleCustomColorRow(btn.dataset.value);
        }
      });
    });
  });

  // Position grid
  const posGrid = document.querySelector('.position-grid');
  if (posGrid) {
    posGrid.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        posGrid.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        updateSetting('position', btn.dataset.value);
      });
    });
  }

  // Reposition button
  const repositionBtn = document.getElementById('reposition-btn');
  if (repositionBtn) {
    repositionBtn.addEventListener('click', () => {
      window.Keypress.enterRepositionMode();
    });
  }

  // Duration slider
  const durationSlider = document.getElementById('duration');
  durationSlider.addEventListener('input', () => {
    const val = parseFloat(durationSlider.value);
    document.getElementById('duration-value').textContent = `${val.toFixed(1)}s`;
    updateSliderProgress(durationSlider);
    updateSetting('duration', val);
  });

  // Opacity slider
  const opacitySlider = document.getElementById('opacity');
  opacitySlider.addEventListener('input', () => {
    const val = parseInt(opacitySlider.value, 10);
    document.getElementById('opacity-value').textContent = `${val}%`;
    updateSliderProgress(opacitySlider);
    updateSetting('opacity', val);
  });

  // Monitor dropdown
  document.getElementById('monitor-toggle').addEventListener('click', () => {
    document.getElementById('monitor-dropdown').classList.toggle('open');
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#monitor-dropdown')) closeMonitorDropdown();
  });

  // Toggle: showModifierOnly
  document.getElementById('showModifierOnly').addEventListener('change', (e) => {
    updateSetting('showModifierOnly', e.target.checked);
  });

  // Toggle: showInDock
  document.getElementById('showInDock').addEventListener('change', (e) => {
    updateSetting('showInDock', e.target.checked);
  });

  // Toggle: launchAtLogin
  document.getElementById('launchAtLogin').addEventListener('change', (e) => {
    updateSetting('launchAtLogin', e.target.checked);
  });

  // Toggle: enableKeypress (runtime on/off, not a persisted setting)
  document.getElementById('enableKeypress').addEventListener('change', (e) => {
    window.Keypress.setEnabled(e.target.checked);
  });

  // Color swatches (predefined)
  document.querySelectorAll('.color-swatch[data-color]').forEach((swatch) => {
    swatch.addEventListener('click', () => {
      updateSetting('customColor', swatch.dataset.color);
      applyActiveColorSwatch(swatch.dataset.color);
      updateColorWell(swatch.dataset.color);
    });
  });

  // Color well — opens native macOS color picker
  const colorWell = document.getElementById('color-well');
  if (colorWell) {
    colorWell.addEventListener('click', async () => {
      const hex = await window.Keypress.pickColor(currentSettings.customColor || '#3B82F6');
      if (hex) {
        updateSetting('customColor', hex);
        applyActiveColorSwatch(hex);
        updateColorWell(hex);
      }
    });
  }

}

function togglePositionMode(mode) {
  const presetRow = document.getElementById('position-preset-row');
  const customRow = document.getElementById('position-custom-row');
  if (presetRow) presetRow.style.display = mode === 'preset' ? '' : 'none';
  if (customRow) customRow.style.display = mode === 'custom' ? '' : 'none';
}

function toggleCustomColorRow(theme) {
  const colorRow = document.getElementById('custom-color-row');
  if (colorRow) colorRow.style.display = theme === 'custom' ? '' : 'none';
}

function updateSliderProgress(slider) {
  const min = parseFloat(slider.min);
  const max = parseFloat(slider.max);
  const val = parseFloat(slider.value);
  const pct = ((val - min) / (max - min)) * 100;
  slider.style.setProperty('--progress', `${pct}%`);
}

function updateColorWell(color) {
  const well = document.getElementById('color-well');
  if (well) well.style.setProperty('--well-color', color);
}

function applyActiveColorSwatch(color) {
  document.querySelectorAll('.color-swatch[data-color]').forEach((swatch) => {
    swatch.classList.toggle('active', swatch.dataset.color.toLowerCase() === color.toLowerCase());
  });
}

async function updateSetting(key, value) {
  currentSettings[key] = value;
  currentSettings = await window.Keypress.setSettings({ [key]: value });
}

// Keep in sync if settings change externally
window.Keypress.onSettingsChanged((s) => {
  currentSettings = s;
  applySettingsToControls(s);
});

// Keep enable toggle in sync when changed via global shortcut or tray menu
window.Keypress.onToggleKeypress((enabled) => {
  document.getElementById('enableKeypress').checked = enabled;
});

// Block Tab focus navigation (matches native macOS settings behavior)
document.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') e.preventDefault();
});

init();
