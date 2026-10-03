import * as THREE from 'three';
import { FONT, COLOR } from './canvas.js';
import { clamp, easeOutExpo, easeInCubic, easeOutCubic } from './util.js';

// 2D overlay composited inside the finishing pass (so grain and lens split
// apply to type too). All coordinates are in 1920x1080 design units.
export class Hud {
  constructor(W, H) {
    this.W = W; this.H = H;
    this.canvas = document.createElement('canvas');
    this.canvas.width = W; this.canvas.height = H;
    this.ctx = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.generateMipmaps = false;
    this.s = W / 1920;
  }

  begin() {
    const x = this.ctx;
    x.setTransform(1, 0, 0, 1, 0, 0);
    if (this.dirty !== false) x.clearRect(0, 0, this.W, this.H);
    x.setTransform(this.s, 0, 0, this.s, 0, 0);
    if ('letterSpacing' in x) x.letterSpacing = '0px';
    x.globalAlpha = 1;
    this.wasDirty = this.dirty !== false;
    this.dirty = false;
  }

  // Upload only when something was drawn now or last frame (an empty canvas
  // stays empty), which skips most uploads on frames without type.
  end() { if (this.dirty || this.wasDirty) this.texture.needsUpdate = true; }

  // The one orientation header per shot: words rise out of a mask, a two-tone
  // rule draws underneath, and cyan/magenta ghosts collapse into the white.
  header(text, t, tIn, tOut, { x = 112, y = 168, size = 74, align = 'left' } = {}) {
    if (t < tIn || t > tOut + 0.01) return;
    this.dirty = true;
    const ctx = this.ctx;
    const words = text.split(' ');
    ctx.save();
    ctx.font = `700 ${size}px ${FONT.display}`;
    ctx.textBaseline = 'alphabetic';
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${-size * 0.025}px`;
    const space = ctx.measureText(' ').width;
    const widths = words.map((w) => ctx.measureText(w).width);
    const total = widths.reduce((a, b) => a + b, 0) + space * (words.length - 1);
    let cx = align === 'center' ? x - total / 2 : x;
    const exit = easeInCubic(clamp((t - (tOut - 0.3)) / 0.3));
    words.forEach((w, i) => {
      const k = easeOutExpo(clamp((t - tIn - i * 0.07) / 0.55));
      const ke = clamp(exit * 1.4 - i * 0.12);
      const dy = (1 - k) * size * 1.1 - ke * size * 1.1;
      ctx.save();
      ctx.beginPath();
      ctx.rect(cx - 10, y - size * 1.0, widths[i] + 20, size * 1.3);
      ctx.clip();
      const ghost = (1 - easeOutCubic(clamp((t - tIn - i * 0.07) / 0.35))) * 10;
      if (ghost > 0.2) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = COLOR.cyan; ctx.fillText(w, cx - ghost, y + dy);
        ctx.fillStyle = COLOR.magenta; ctx.fillText(w, cx + ghost, y + dy);
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = 24;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(w, cx, y + dy);
      ctx.restore();
      cx += widths[i] + space;
    });
    // Rule
    const lk = easeOutExpo(clamp((t - tIn - 0.1) / 0.6)) * (1 - exit);
    const rx = align === 'center' ? x - total / 2 : x;
    const g = ctx.createLinearGradient(rx, 0, rx + 220, 0);
    g.addColorStop(0, COLOR.cyan); g.addColorStop(1, COLOR.magenta);
    ctx.fillStyle = g;
    ctx.fillRect(rx + 2, y + size * 0.32, 220 * lk, 6);
    ctx.restore();
  }

  text(str, x, y, { font = FONT.mono, weight = 500, size = 24, color = '#fff', alpha = 1, align = 'left', letter = 0, baseline = 'alphabetic', glow = 0 } = {}) {
    this.dirty = true;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `${weight} ${size}px ${font}`;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${letter}px`;
    if (glow) { ctx.shadowColor = color; ctx.shadowBlur = glow; }
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
    ctx.restore();
  }
}
