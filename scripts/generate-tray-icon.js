#!/usr/bin/env node
// Generate macOS menu bar template icons for Keypress.
// Template images: black pixels on transparent background.
// macOS automatically applies light/dark colors.
//
// Design: keycap (rounded rect) with ⌘ symbol in upper-right,
// matching the app icon layout.
//
// Usage: node scripts/generate-tray-icon.js

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// ── PNG encoder (minimal, pure Node.js) ──────────────────────────

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([len, typeAndData, crc]);
}

function encodePNG(width, height, pixels) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 6;  // RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  // Build filtered scanlines (filter type 0 = None)
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0; // filter: none
    pixels.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdrData),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Drawing primitives ───────────────────────────────────────────

function createPixels(w, h) {
  return Buffer.alloc(w * h * 4); // RGBA, all transparent
}

function setPixel(buf, w, x, y, alpha) {
  if (x < 0 || x >= w || y < 0 || y >= w) return;
  const i = (y * w + x) * 4;
  buf[i] = 0;       // R (black)
  buf[i + 1] = 0;   // G
  buf[i + 2] = 0;   // B
  buf[i + 3] = Math.max(buf[i + 3], alpha); // A (don't reduce existing alpha)
}

function blendPixel(buf, w, x, y, alpha) {
  if (x < 0 || x >= w || y < 0 || y >= w) return;
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  setPixel(buf, w, ix, iy, alpha);
}

// Draw anti-aliased line (Xiaolin Wu)
function drawLineAA(buf, w, x0, y0, x1, y1, alpha) {
  const steep = Math.abs(y1 - y0) > Math.abs(x1 - x0);
  if (steep) { [x0, y0] = [y0, x0]; [x1, y1] = [y1, x1]; }
  if (x0 > x1) { [x0, x1] = [x1, x0]; [y0, y1] = [y1, y0]; }

  const dx = x1 - x0;
  const dy = y1 - y0;
  const gradient = dx === 0 ? 1 : dy / dx;

  let y = y0 + gradient;
  for (let x = Math.round(x0); x <= Math.round(x1); x++) {
    const iy = Math.floor(y);
    const frac = y - iy;
    if (steep) {
      setPixel(buf, w, iy, x, Math.round(alpha * (1 - frac)));
      setPixel(buf, w, iy + 1, x, Math.round(alpha * frac));
    } else {
      setPixel(buf, w, x, iy, Math.round(alpha * (1 - frac)));
      setPixel(buf, w, x, iy + 1, Math.round(alpha * frac));
    }
    y += gradient;
  }
}

// Draw rounded rectangle outline (anti-aliased)
function drawRoundedRect(buf, w, x, y, rw, rh, r, thickness, alpha) {
  const steps = 64;
  // Draw multiple offset lines for thickness
  for (let t = -thickness / 2; t <= thickness / 2; t += 0.5) {
    const corners = [
      { cx: x + rw - r, cy: y + r, startAngle: -Math.PI / 2, endAngle: 0 },           // top-right
      { cx: x + rw - r, cy: y + rh - r, startAngle: 0, endAngle: Math.PI / 2 },        // bottom-right
      { cx: x + r, cy: y + rh - r, startAngle: Math.PI / 2, endAngle: Math.PI },        // bottom-left
      { cx: x + r, cy: y + r, startAngle: Math.PI, endAngle: 3 * Math.PI / 2 },         // top-left
    ];

    let prevPx = null, prevPy = null;

    // Straight edges + corner arcs
    const points = [];
    for (const c of corners) {
      for (let i = 0; i <= steps / 4; i++) {
        const angle = c.startAngle + (c.endAngle - c.startAngle) * (i / (steps / 4));
        const px = c.cx + (r + t) * Math.cos(angle);
        const py = c.cy + (r + t) * Math.sin(angle);
        points.push([px, py]);
      }
    }
    points.push(points[0]); // close the shape

    for (let i = 1; i < points.length; i++) {
      drawLineAA(buf, w, points[i - 1][0], points[i - 1][1], points[i][0], points[i][1], alpha);
    }
  }
}

// Draw ⌘ symbol using a bitmap pattern
function drawCommandSymbol(buf, w, ox, oy, scale, alpha) {
  // ⌘ symbol bitmap at 9x9 base resolution
  // Each cell is `scale` pixels
  const bitmap = [
    '##.....##',
    '# #...# #',
    '## ### ##',
    '..#   #..',
    '..#   #..',
    '..#   #..',
    '## ### ##',
    '# #...# #',
    '##.....##',
  ];

  for (let by = 0; by < bitmap.length; by++) {
    for (let bx = 0; bx < bitmap[by].length; bx++) {
      if (bitmap[by][bx] === '#') {
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            setPixel(buf, w, ox + bx * scale + dx, oy + by * scale + dy, alpha);
          }
        }
      }
    }
  }
}

// ── Generate icons ───────────────────────────────────────────────

function generate2x() {
  const size = 36;
  const px = createPixels(size, size);

  // Keycap outline: rounded rect with 2px padding, 7px radius, ~1.5px stroke
  drawRoundedRect(px, size, 3, 3, 30, 30, 7, 1.5, 220);

  // ⌘ symbol in upper-right area, scale=1 (9x9 pixels)
  drawCommandSymbol(px, size, 20, 6, 1, 210);

  return encodePNG(size, size, px);
}

function generate1x() {
  const size = 18;
  const px = createPixels(size, size);

  // Keycap outline: smaller version
  drawRoundedRect(px, size, 1.5, 1.5, 15, 15, 3.5, 1, 220);

  // ⌘ symbol — use a simpler 5x5 version at this size
  const miniCmd = [
    '#.#.#',
    '.###.',
    '#.#.#',
    '.###.',
    '#.#.#',
  ];
  const ox = 10, oy = 3;
  for (let by = 0; by < miniCmd.length; by++) {
    for (let bx = 0; bx < miniCmd[by].length; bx++) {
      if (miniCmd[by][bx] === '#') {
        setPixel(px, size, ox + bx, oy + by, 210);
      }
    }
  }

  return encodePNG(size, size, px);
}

// ── Main ─────────────────────────────────────────────────────────

const outDir = path.join(__dirname, '..', 'src', 'assets');

const png2x = generate2x();
fs.writeFileSync(path.join(outDir, 'trayTemplate@2x.png'), png2x);
console.log(`wrote trayTemplate@2x.png (${png2x.length} bytes)`);

const png1x = generate1x();
fs.writeFileSync(path.join(outDir, 'trayTemplate.png'), png1x);
console.log(`wrote trayTemplate.png (${png1x.length} bytes)`);
