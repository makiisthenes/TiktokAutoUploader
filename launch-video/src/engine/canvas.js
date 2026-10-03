import * as THREE from 'three';
import { rng } from './util.js';

export const FONT = {
  display: '"Space Grotesk"',
  mono: '"JetBrains Mono"',
  stencil: '"Big Shoulders Stencil Display"',
  ui: '"Inter Tight"',
};

export const COLOR = {
  ink: '#07080d',
  cyan: '#25f4ee',
  magenta: '#fe2c55',
  paper: '#f3efe6',
  kraft: '#b98a57',
  amber: '#ffb347',
  green: '#3dff9a',
};

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

export function tex(canvas, { srgb = true, repeat = false, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.anisotropy = aniso;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

// A canvas + texture pair redrawn by `draw(ctx, w, h, ...args)` on demand.
export function liveTexture(w, h, draw, opts) {
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d');
  const texture = tex(canvas, opts);
  return {
    canvas, ctx, texture,
    redraw(...args) { ctx.clearRect(0, 0, w, h); draw(ctx, w, h, ...args); texture.needsUpdate = true; },
  };
}

// Speckled noise used for roughness/bump/color variation.
export function noiseCanvas(w, h, seed, { base = 128, amp = 60, blobs = 400, blobAmp = 25, blobR = 40 } = {}) {
  const c = makeCanvas(w, h);
  const x = c.getContext('2d');
  const r = rng(seed);
  const img = x.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    const v = base + (r() - 0.5) * amp;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  x.globalCompositeOperation = 'overlay';
  for (let i = 0; i < blobs; i++) {
    const g = x.createRadialGradient(0, 0, 0, 0, 0, blobR * (0.3 + r()));
    const v = Math.floor(128 + (r() - 0.5) * 2 * blobAmp);
    g.addColorStop(0, `rgba(${v},${v},${v},0.6)`);
    g.addColorStop(1, `rgba(${v},${v},${v},0)`);
    x.save(); x.translate(r() * w, r() * h); x.fillStyle = g; x.fillRect(-blobR * 2, -blobR * 2, blobR * 4, blobR * 4); x.restore();
  }
  x.globalCompositeOperation = 'source-over';
  return c;
}

// Text drawn to fit a box; returns the canvas.
export function textCanvas(text, { w = 1024, h = 256, font = FONT.display, weight = 700, size = 160, color = '#fff',
  bg = null, align = 'center', baseline = 'middle', letter = 0, pad = 0, glow = 0, glowColor = null } = {}) {
  const c = makeCanvas(w, h);
  const x = c.getContext('2d');
  if (bg) { x.fillStyle = bg; x.fillRect(0, 0, w, h); }
  x.font = `${weight} ${size}px ${font}`;
  x.textAlign = align; x.textBaseline = baseline;
  if ('letterSpacing' in x) x.letterSpacing = `${letter}px`;
  const px = align === 'center' ? w / 2 : align === 'left' ? pad : w - pad;
  if (glow) { x.shadowColor = glowColor || color; x.shadowBlur = glow; }
  x.fillStyle = color;
  x.fillText(text, px, h / 2);
  return c;
}

export function roundRect(x, X, Y, W, H, R) {
  x.beginPath();
  x.moveTo(X + R, Y);
  x.arcTo(X + W, Y, X + W, Y + H, R);
  x.arcTo(X + W, Y + H, X, Y + H, R);
  x.arcTo(X, Y + H, X, Y, R);
  x.arcTo(X, Y, X + W, Y, R);
  x.closePath();
}

// A barcode strip, deterministic.
export function drawBarcode(x, X, Y, W, H, seed = 3, color = '#111') {
  const r = rng(seed);
  let cx = X;
  x.fillStyle = color;
  while (cx < X + W) {
    const bw = 1 + Math.floor(r() * 4) * (W / 160);
    if (r() > 0.4) x.fillRect(cx, Y, bw, H);
    cx += bw + (W / 200) * (1 + Math.floor(r() * 2));
  }
}

// The clip itself: a beach at sunset, someone dancing by a palm tree. Drawn
// into the box (X, Y, W, H) at time t, so the phone plays it and the parcel
// label shows a frame of it.
export function drawClip(x, X, Y, W, H, t = 0) {
  x.save();
  x.beginPath(); x.rect(X, Y, W, H); x.clip();
  x.translate(X, Y);
  const hz = H * 0.6;
  const sky = x.createLinearGradient(0, 0, 0, hz);
  sky.addColorStop(0, '#2a0f4a'); sky.addColorStop(0.55, '#c23a78'); sky.addColorStop(1, '#ffa45c');
  x.fillStyle = sky; x.fillRect(0, 0, W, hz);
  // the sun, cut by retro bars
  const sr = W * 0.24, sx = W * 0.52, sy = hz - sr * 0.35;
  const sun = x.createLinearGradient(0, sy - sr, 0, sy + sr);
  sun.addColorStop(0, '#ffe58a'); sun.addColorStop(1, '#ff5f8f');
  x.fillStyle = sun; x.beginPath(); x.arc(sx, sy, sr, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#c23a78';
  for (let i = 0; i < 5; i++) { const by = sy + sr * (0.05 + i * 0.2); x.fillRect(sx - sr, by, sr * 2, sr * (0.03 + i * 0.025)); }
  // sea with drifting wave lines and the sun's reflection
  const sea = x.createLinearGradient(0, hz, 0, H);
  sea.addColorStop(0, '#2b1f63'); sea.addColorStop(1, '#0c0b26');
  x.fillStyle = sea; x.fillRect(0, hz, W, H - hz);
  for (let i = 0; i < 9; i++) {
    const wy = hz + (H - hz) * (0.06 + i * 0.1);
    const ww = W * (0.12 + 0.03 * i) * (1 + 0.15 * Math.sin(t * 2 + i));
    x.fillStyle = `rgba(255,190,140,${0.55 - i * 0.05})`;
    x.fillRect(sx - ww / 2 + Math.sin(t * 1.5 + i * 1.7) * W * 0.02, wy, ww, Math.max(1, H * 0.006));
    x.fillStyle = 'rgba(37,244,238,0.22)';
    x.fillRect(((i * 0.37 + t * 0.04) % 1) * W - W * 0.1, wy + H * 0.02, W * 0.2, Math.max(1, H * 0.004));
  }
  // sand
  x.fillStyle = '#120a1c';
  x.beginPath(); x.moveTo(0, H * 0.8);
  x.quadraticCurveTo(W * 0.5, H * 0.74, W, H * 0.79); x.lineTo(W, H); x.lineTo(0, H); x.closePath(); x.fill();
  // palm tree, swaying
  const sway = Math.sin(t * 1.3) * 0.05;
  x.strokeStyle = '#120a1c'; x.fillStyle = '#120a1c'; x.lineCap = 'round';
  x.lineWidth = W * 0.035;
  const tx = W * 0.2, ty = H * 0.79, top = [W * (0.13 + sway), H * 0.36];
  x.beginPath(); x.moveTo(tx, ty); x.quadraticCurveTo(W * 0.24, H * 0.55, top[0], top[1]); x.stroke();
  for (let k = 0; k < 6; k++) {
    const a = -Math.PI * 0.95 + k * (Math.PI * 0.95 / 5) + sway * 2;
    const L = W * 0.26;
    x.beginPath(); x.moveTo(top[0], top[1]);
    x.quadraticCurveTo(top[0] + Math.cos(a) * L * 0.6, top[1] + Math.sin(a) * L * 0.6 - H * 0.03, top[0] + Math.cos(a) * L, top[1] + Math.sin(a) * L * 0.5 + H * 0.05);
    x.lineWidth = W * 0.022; x.stroke();
  }
  // someone dancing on the sand, on the beat
  const b = Math.abs(Math.sin(t * Math.PI * 2));
  const px = W * 0.68, py = H * 0.8, s = H * 0.0012;
  x.lineWidth = W * 0.03;
  x.beginPath(); x.arc(px, py - 150 * s - b * 6 * s, 14 * s * 1.6, 0, Math.PI * 2); x.fill();
  x.beginPath(); x.moveTo(px, py - 128 * s - b * 6 * s); x.lineTo(px, py - 62 * s); x.stroke();
  x.beginPath(); x.moveTo(px, py - 62 * s); x.lineTo(px - 22 * s, py); x.moveTo(px, py - 62 * s); x.lineTo(px + 22 * s, py); x.stroke();
  x.beginPath();
  x.moveTo(px, py - 115 * s); x.lineTo(px - 40 * s, py - (115 + 30 + b * 40) * s);
  x.moveTo(px, py - 115 * s); x.lineTo(px + 40 * s, py - (115 + 30 + (1 - b) * 40) * s);
  x.stroke();
  x.restore();
}
