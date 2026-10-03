// Shots 8-9: pull up out of the phone into a field of phones that light in
// waves until, seen from above, the lit screens spell the name. Then the
// title card: wordmark, install command, disclosure.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { clamp, lerp, smooth, easeOutExpo, easeInOutCubic, easeOutCubic, easeInCubic, easeInOutQuint, easeInOutExpo, spring, hit, hits, fbm1, rng, typingTimes, typedCount } from '../engine/util.js';
import { makeCanvas, tex, FONT, COLOR, roundRect } from '../engine/canvas.js';
import { makeFloor, v3 } from '../engine/props.js';
import { drawPost } from './phone.js';

const COLS = 84, ROWS = 27;
const SX = 0.42, SZ = 0.78;
const PW = 0.3, PL = 0.64;

function wordMask() {
  const c = makeCanvas(COLS, ROWS);
  const x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, COLS, ROWS);
  const aspect = SX / SZ; // cell is taller than wide: squash glyphs vertically
  x.save();
  x.translate(COLS / 2, ROWS / 2 + 0.5);
  x.scale(1, aspect);
  x.font = `700 40px ${FONT.display}`;
  x.textAlign = 'center'; x.textBaseline = 'middle';
  const w = x.measureText('autotok').width;
  const s = (COLS - 8) / w;
  x.scale(s, s);
  x.fillStyle = '#fff';
  x.fillText('autotok', 0, 0);
  x.restore();
  const d = x.getImageData(0, 0, COLS, ROWS).data;
  const raw = new Uint8Array(COLS * ROWS);
  let r0 = ROWS, r1 = 0, c0 = COLS, c1 = 0;
  for (let i = 0; i < COLS * ROWS; i++) {
    raw[i] = d[i * 4] > 110 ? 1 : 0;
    if (raw[i]) { const rr = Math.floor(i / COLS), cc = i % COLS; r0 = Math.min(r0, rr); r1 = Math.max(r1, rr); c0 = Math.min(c0, cc); c1 = Math.max(c1, cc); }
  }
  // centre the lit pixels (lowercase sits low in its em box)
  const dr = Math.round((ROWS - 1 - r1 - r0) / 2), dc = Math.round((COLS - 1 - c1 - c0) / 2);
  const on = new Uint8Array(COLS * ROWS);
  for (let rr = 0; rr < ROWS; rr++) for (let cc = 0; cc < COLS; cc++) {
    const sr = rr - dr, sc = cc - dc;
    if (sr >= 0 && sr < ROWS && sc >= 0 && sc < COLS) on[rr * COLS + cc] = raw[sr * COLS + sc];
  }
  return on;
}

export default function createGrid(ctx) {
  const { TL } = ctx;
  const C = TL.cues;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);
  scene.fog = new THREE.FogExp2(0x05060a, 0.012);
  scene.environment = ctx.envTex;
  scene.environmentIntensity = 0.2;
  const camera = new THREE.PerspectiveCamera(34, ctx.aspect, 0.05, 300);

  scene.add(new THREE.HemisphereLight(0x3a4a6a, 0x050608, 0.35));
  const key = new THREE.DirectionalLight(0xdfe8ff, 0.6);
  key.position.set(-10, 20, 8);
  scene.add(key);
  scene.add(makeFloor(400, 0x4a4f58));

  const on = wordMask();
  const N = COLS * ROWS;
  const bodyGeo = new RoundedBoxGeometry(PW, 0.022, PL, 2, 0.01);
  const bodies = new THREE.InstancedMesh(bodyGeo, new THREE.MeshStandardMaterial({ color: 0x23262c, roughness: 0.3, metalness: 0.85 }), N);
  const scrGeo = new THREE.PlaneGeometry(PW * 0.92, PL * 0.94);
  scrGeo.rotateX(-Math.PI / 2);
  // a static frame of the post for the crowd; the hero phone runs it live
  // The crowd's screens: the post, softened and pulled toward cyan-white, so
  // the field reads as clean light from 40 m up rather than colour noise.
  const full = makeCanvas(540, 1174);
  drawPost(full.getContext('2d'), 40.3, TL, { ignite: 1, tapAt: 39 });
  const still = makeCanvas(48, 104);
  {
    const x = still.getContext('2d');
    x.imageSmoothingQuality = 'high';
    x.drawImage(full, 0, 0, 48, 104);
    x.globalCompositeOperation = 'screen';
    x.fillStyle = 'rgba(150,235,235,0.55)';
    x.fillRect(0, 0, 48, 104);
  }
  const stillTex = tex(still);
  const screens = new THREE.InstancedMesh(scrGeo, new THREE.MeshBasicMaterial({ map: stillTex, toneMapped: false }), N);
  const r = rng(99);
  const cells = [];
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
  const heroC = 41, heroR = 15;
  let heroIndex = 0;
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const i = row * COLS + col;
      const x = (col - (COLS - 1) / 2) * SX;
      const z = (row - (ROWS - 1) / 2) * SZ;
      const jitter = (r() - 0.5) * 0.06;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), jitter);
      p.set(x, 0.011, z);
      m.compose(p, q, sc);
      bodies.setMatrixAt(i, m);
      p.y = 0.0235;
      m.compose(p, q, sc);
      screens.setMatrixAt(i, m);
      screens.setColorAt(i, new THREE.Color(0.03, 0.03, 0.03));
      if (col === heroC && row === heroR) heroIndex = i;
      cells.push({ x, z, word: on[i], lightAt: 42.5 + r() * 2.1, d: Math.hypot(x - (heroC - (COLS - 1) / 2) * SX, z - (heroR - (ROWS - 1) / 2) * SZ) });
    }
  }
  scene.add(bodies, screens);
  const hero = cells[heroIndex];
  // hero phone screen: live post
  const hc = makeCanvas(540, 1174);
  const hx = hc.getContext('2d');
  const htex = tex(hc);
  const heroScreen = new THREE.Mesh(scrGeo, new THREE.MeshBasicMaterial({ map: htex, toneMapped: false }));
  heroScreen.position.set(hero.x, 0.025, hero.z);
  scene.add(heroScreen);

  const col = new THREE.Color();
  const pulses = [];
  for (let b = 42.5; b < 44.6; b += 0.5) pulses.push(b);
  const pip = TL.pipTyping;
  const pipTimes = typingTimes({ ...pip, wordGap: 0 });

  function update(t, fx, hud) {
    drawPost(hx, t, TL, { ignite: 1, tapAt: C.tap });
    htex.needsUpdate = true;

    // screen intensities
    const wordK = smooth(clamp((t - (C.wordForm - 0.5)) / 0.5));
    for (let i = 0; i < N; i++) {
      const c = cells[i];
      let v = 0.03;
      if (t >= c.lightAt) v = 0.55 + 0.9 * Math.exp(-(t - c.lightAt) / 0.25);
      for (const tp of pulses) {
        if (t < tp) break;
        const rr = c.d - (t - tp) * 16;
        v += 1.4 * Math.exp(-rr * rr * 0.6) * Math.exp(-(t - tp) * 0.8);
      }
      if (c.word) v = lerp(v, 1.9 + 0.8 * hit(t, C.wordForm, 0.4) + 0.4 * hits(t, [45.5, 46, 46.5, 47, 47.5], 0.2), wordK);
      else v = lerp(v, 0.018, wordK);
      if (t >= C.title) v *= c.word ? lerp(1, 0.55, smooth(clamp((t - C.title) / 0.6))) : 1;
      col.setRGB(v, v, v);
      screens.setColorAt(i, col);
    }
    screens.instanceColor.needsUpdate = true;
    heroScreen.material.color.setScalar(t < C.wordForm - 0.5 ? 1 : cells[heroIndex].word ? 1.25 : lerp(1, 0.025, wordK));

    // camera: straight up out of the hero screen, unwinding, then hold the word
    const up = easeInOutExpo(clamp((t - C.grid) / 2.6));
    const h = lerp(1.05, 40, up);
    const cx = lerp(hero.x, 0, smooth(clamp((t - C.grid - 0.6) / 2.8)));
    const cz = lerp(hero.z, 0, smooth(clamp((t - C.grid - 0.6) / 2.8)));
    let yaw = lerp(0.5, 0, easeInOutCubic(clamp((t - C.grid) / 3.4)));
    let height = h;
    if (t > 44.6) height = lerp(40, 35.5, smooth(clamp((t - 44.6) / 3.4)));
    if (t > C.title) height = lerp(35.5, 33, smooth(clamp((t - C.title) / 7)));
    camera.position.set(cx, height, cz + 0.001);
    camera.up.set(Math.sin(yaw), 0, -Math.cos(yaw));
    camera.lookAt(cx, 0, cz);
    camera.fov = 34;
    camera.updateProjectionMatrix();

    fx.bloom = { strength: 0.9, radius: 0.55, threshold: 0.7 };
    fx.dof = t < C.title ? null : { focus: height, aperture: 0.6 * smooth(clamp((t - C.title) / 0.6)), maxBlur: 16 };
    fx.zoom = (1 - clamp((t - C.grid) / 0.4)) * 0.06 + (up > 0 && up < 1 ? Math.sin(up * Math.PI) * 0.025 : 0);
    fx.ca = 0.4 + hit(t, C.wordForm, 0.3) * 8 + hit(t, C.title, 0.4) * 5;
    fx.shake = hit(t, C.wordForm, 0.3) * 0.8;
    fx.exposure = t < C.title ? 1 : lerp(1, 0.45, smooth(clamp((t - C.title) / 0.8)));
    fx.flash = [1, 1, 1, 0.12 * hit(t, C.title, 0.15)];
    fx.vignette = 0.7;
    fx.fade = smooth(clamp((t - 54.2) / 0.8));
    hud.header('One login. One command per upload.', t, 42.7, 44.85);

    if (t >= C.title) drawTitle(hud, t);
    return camera;
  }

  function drawTitle(hud, t) {
    hud.dirty = true;
    const x = hud.ctx;
    const a = t - C.title;
    // wordmark: cyan/magenta split snaps together on the hit
    const k = spring(a, 2.2, 0.4);
    const split = (1 - k) * 34 + 3;
    const mk = easeInOutCubic(clamp(a / 1.0));
    const scale = lerp(1.8, 1, mk) * (1 + 0.035 * smooth(clamp((a - 1) / 6)));
    x.save();
    x.translate(960, lerp(505, 450, mk));
    x.scale(scale, scale);
    x.font = `700 250px ${FONT.display}`;
    x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    if ('letterSpacing' in x) x.letterSpacing = '-10px';
    x.globalAlpha = clamp(a / 0.08);
    x.globalCompositeOperation = 'lighter';
    x.fillStyle = COLOR.cyan; x.fillText('autotok', -split, 80);
    x.fillStyle = COLOR.magenta; x.fillText('autotok', split, 80);
    x.globalCompositeOperation = 'source-over';
    x.shadowColor = 'rgba(0,0,0,0.6)'; x.shadowBlur = 30;
    x.fillStyle = '#ffffff'; x.fillText('autotok', 0, 80);
    // a light sweep across the letters
    const sw = (a - 1.0) / 0.9;
    if (sw > 0 && sw < 1) {
      x.shadowBlur = 0;
      x.globalCompositeOperation = 'source-atop';
      const gx = lerp(-700, 700, sw);
      const g = x.createLinearGradient(gx - 160, 0, gx + 160, 0);
      g.addColorStop(0, 'rgba(37,244,238,0)'); g.addColorStop(0.5, 'rgba(190,255,252,0.95)'); g.addColorStop(1, 'rgba(37,244,238,0)');
      x.fillStyle = g; x.fillRect(-700, -200, 1400, 320);
    }
    x.restore();

    // install command, typed on 32nd notes
    const pa = t - (pip.start - 0.35);
    if (pa > 0) {
      const ek = easeOutExpo(clamp(pa / 0.4));
      const n = typedCount(t, pipTimes);
      const W = 640, H = 92, X = 960 - W / 2, Y = 600 + (1 - ek) * 30;
      x.save();
      x.globalAlpha = ek;
      x.fillStyle = 'rgba(10,13,19,0.92)'; roundRect(x, X, Y, W, H, 46); x.fill();
      x.strokeStyle = 'rgba(255,255,255,0.14)'; x.lineWidth = 2; roundRect(x, X, Y, W, H, 46); x.stroke();
      x.font = `500 40px ${FONT.mono}`; x.textBaseline = 'middle';
      x.fillStyle = COLOR.green; x.fillText('$', X + 44, Y + H / 2 + 2);
      x.fillStyle = '#e8edf5';
      const s = pip.text.slice(0, n);
      x.fillText(s, X + 84, Y + H / 2 + 2);
      const cw = x.measureText(s).width;
      if (n < pip.text.length || Math.floor(t * 4) % 2 === 0) { x.fillStyle = 'rgba(232,237,245,0.85)'; x.fillRect(X + 88 + cw, Y + 24, 22, 44); }
      x.restore();
    }
    // where to get it
    const ua = smooth(clamp((t - (pip.start + 1.4)) / 0.5));
    if (ua > 0) hud.text('github.com/makiisthenes/TiktokAutoUploader', 960, 770, { size: 32, color: '#b7c0d3', alpha: ua, align: 'center', font: FONT.mono, weight: 500 });
    // disclosure
    const da = smooth(clamp((t - C.disclosure) / 0.6));
    if (da > 0) {
      hud.text('Not affiliated with TikTok. Automated uploading may break TikTok\u2019s terms of service and can get accounts restricted or banned.',
        960, 958, { size: 27, color: '#9aa6bb', alpha: da, align: 'center', font: FONT.ui, weight: 500 });
      hud.text('Use at your own risk.  \u00b7  AGPL-3.0  \u00b7  IPs shown are RFC 5737 examples; the video id is illustrative.',
        960, 1000, { size: 25, color: '#7a859b', alpha: da, align: 'center', font: FONT.ui, weight: 500 });
    }
  }

  return { start: C.grid, scene, update };
}
