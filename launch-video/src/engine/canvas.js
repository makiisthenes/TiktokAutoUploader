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
