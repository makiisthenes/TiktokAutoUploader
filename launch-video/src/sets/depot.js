// Shots 0-3: the terminal. You log in once (a phone scans the QR code), type
// one upload command, and the video tears out of the screen as a parcel that
// lands on a depot belt and rides away. Ends on a whip pan to the board.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {
  clamp, lerp, smooth, easeOutExpo, easeInOutCubic, easeOutCubic, easeInCubic,
  spring, hit, hits, typingTimes, typedCount, fbm1, rng,
} from '../engine/util.js';
import { makeCanvas, tex, FONT, COLOR, roundRect } from '../engine/canvas.js';
import {
  PARCEL, BELT_Y, LANE_COLORS, makeParcel, makeConveyor, makeFloor, makeRacks, makeCeiling, makeShaft,
  floorLine, metal, Burst, v3,
} from '../engine/props.js';
import { makePhoneBody, PHONE } from './phone.js';

const MON = { x: 0, y: 2.35, z: 0, w: 2.4, h: 1.35 };
const LANE_Z = [2.2, 4.8, 7.4];

// ---------------------------------------------------------------- terminal screen
const SW = 2048, SH = 1152;
const TERM_FONT = 52;
const LH = 84;

function cmdSpans(text) {
  // syntax colours: command white, subcommand cyan, flags grey, quoted caption amber
  const spans = [];
  const re = /("[^"]*"?)|(\s+)|(-\w+)|([^\s]+)/g;
  let m, idx = 0;
  while ((m = re.exec(text))) {
    const s = m[0];
    let color = '#e8edf5';
    if (m[1]) color = COLOR.amber;
    else if (m[3]) color = '#8892a6';
    else if (idx === 0) color = '#ffffff';
    else if (s === 'upload' || s === 'login' || s === 'install') color = COLOR.cyan;
    spans.push({ s, color, bold: idx === 0 && !m[2] });
    if (!m[2]) idx++;
  }
  return spans;
}

function drawSpans(x, spans, X, Y, maxChars = Infinity, hideToken = null) {
  let n = 0;
  let cx = X;
  for (const sp of spans) {
    if (n >= maxChars) break;
    const s = sp.s.slice(0, Math.max(0, maxChars - n));
    x.font = `${sp.bold ? 700 : 500} ${TERM_FONT}px ${FONT.mono}`;
    x.fillStyle = sp.color;
    if (!(hideToken && sp.s === hideToken)) x.fillText(s, cx, Y);
    cx += x.measureText(s).width;
    n += sp.s.length;
  }
  return cx;
}

// A QR-style code: three finder squares and seeded modules (not a real code).
function qrModules(n = 29, seed = 21) {
  const r = rng(seed);
  const m = [];
  const finder = (i, j) => {
    for (const [fi, fj] of [[0, 0], [0, n - 7], [n - 7, 0]]) {
      const a = i - fi, b = j - fj;
      if (a >= -1 && a <= 7 && b >= -1 && b <= 7) {
        if (a < 0 || a > 6 || b < 0 || b > 6) return 0;
        const ring = Math.max(Math.abs(a - 3), Math.abs(b - 3));
        return ring === 2 ? 0 : 1;
      }
    }
    return -1;
  };
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const f = finder(i, j);
    m.push(f >= 0 ? f : (r() < 0.48 ? 1 : 0));
  }
  return { n, m };
}

function drawQR(x, X, Y, S, qr, { reveal = 1, ink = '#0b0d12', paper = '#f2f4f7', glow = 0 } = {}) {
  const pad = S * 0.06;
  x.fillStyle = paper; roundRect(x, X, Y, S, S, S * 0.04); x.fill();
  const cell = (S - pad * 2) / qr.n;
  for (let i = 0; i < qr.n; i++) for (let j = 0; j < qr.n; j++) {
    if (!qr.m[i * qr.n + j]) continue;
    // modules draw in on a diagonal sweep
    if ((i + j) / (qr.n * 2) > reveal) continue;
    x.fillStyle = ink;
    x.fillRect(X + pad + j * cell, Y + pad + i * cell, cell + 0.6, cell + 0.6);
  }
  if (glow > 0) {
    x.save();
    x.globalAlpha = glow;
    x.strokeStyle = COLOR.cyan; x.lineWidth = S * 0.025;
    roundRect(x, X - S * 0.03, Y - S * 0.03, S * 1.06, S * 1.06, S * 0.06); x.stroke();
    x.restore();
  }
}

function checkMark(x, cx, cy, r, k) {
  // filled cyan disc, then the tick draws
  x.save();
  x.globalAlpha = clamp(k * 3);
  x.fillStyle = COLOR.cyan;
  x.beginPath(); x.arc(cx, cy, r * (0.6 + 0.4 * easeOutExpo(clamp(k * 2))), 0, Math.PI * 2); x.fill();
  const d = clamp((k - 0.15) / 0.5);
  x.strokeStyle = '#04201f'; x.lineWidth = r * 0.22; x.lineCap = 'round'; x.lineJoin = 'round';
  const p0 = [cx - r * 0.42, cy + r * 0.02], p1 = [cx - r * 0.1, cy + r * 0.34], p2 = [cx + r * 0.46, cy - r * 0.3];
  x.beginPath(); x.moveTo(...p0);
  const a = clamp(d * 2), b = clamp(d * 2 - 1);
  x.lineTo(lerp(p0[0], p1[0], a), lerp(p0[1], p1[1], a));
  if (b > 0) x.lineTo(lerp(p1[0], p2[0], b), lerp(p1[1], p2[1], b));
  x.stroke();
  x.restore();
}

export default function createDepot(ctx) {
  const { TL } = ctx;
  const C = TL.cues;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07080d);
  scene.fog = new THREE.FogExp2(0x07080d, 0.032);
  scene.environment = ctx.envTex;
  scene.environmentIntensity = 0.22;

  const camera = new THREE.PerspectiveCamera(35, ctx.aspect, 0.05, 200);

  // ---------------- lights
  scene.add(new THREE.HemisphereLight(0x3a4a6a, 0x050608, 0.5));
  const key = new THREE.DirectionalLight(0xdfe8ff, 1.6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 0.5, far: 40 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  scene.add(key, key.target);
  const screenLight = new THREE.PointLight(0x8fd8ff, 0, 7, 1.6);
  screenLight.position.set(0, MON.y, 1.0);
  scene.add(screenLight);
  const fillCyan = new THREE.PointLight(LANE_COLORS[0], 3, 10, 1.5);
  fillCyan.position.set(-2.5, 1.6, 3.2);
  scene.add(fillCyan);
  const fillMag = new THREE.PointLight(LANE_COLORS[1], 4, 12, 1.5);
  fillMag.position.set(3.5, 3.5, -1.5);
  scene.add(fillMag);
  // coloured pools along alice's belt for the ride
  const beltLights = [[4.5, LANE_COLORS[0]], [8.5, LANE_COLORS[1]]].map(([x, c]) => {
    const l = new THREE.PointLight(c, 7, 7, 1.6);
    l.position.set(x, 2.6, LANE_Z[0] - 0.9);
    scene.add(l);
    return l;
  });
  // the phone's own glow on its holder, and a cyan rim so its edges read
  const phoneGlow = new THREE.PointLight(0x9ad8ff, 0, 2.2, 1.6);
  scene.add(phoneGlow);
  const phoneRim = new THREE.PointLight(LANE_COLORS[0], 0, 2.5, 1.5);
  scene.add(phoneRim);

  // ---------------- environment
  scene.add(makeFloor());
  scene.add(makeRacks({ x0: -24, x1: 60, z: -6.5, seed: 4 }));
  scene.add(makeRacks({ x0: -24, x1: 60, z: 13.5, seed: 9, facing: -1 }));
  scene.add(makeCeiling({ x0: -24, x1: 60, zs: [-2.5, 4.8, 12], y: 9.5 }));
  for (const [x, z] of [[-1, -2.5], [6, 4.8], [13, -2.5], [20, 12], [-8, 4.8], [27, 4.8]]) {
    const s = makeShaft(0.6, 2.8, 9.4, 0xbcd0ff, 0.045);
    s.position.set(x, 4.75, z);
    scene.add(s);
  }
  for (const z of LANE_Z) {
    scene.add(floorLine(-24, 60, z - 0.95, 0.08, '#c9a227'));
    scene.add(floorLine(-24, 60, z + 0.95, 0.08, '#c9a227'));
  }
  scene.add(floorLine(-24, 60, 0.6, 0.35, '#c9a227', true));

  // ---------------- monitor
  const mon = new THREE.Group();
  mon.position.set(MON.x, MON.y, MON.z);
  const bezel = new THREE.Mesh(new RoundedBoxGeometry(MON.w + 0.16, MON.h + 0.16, 0.12, 4, 0.04), metal(0x14161b, 0.35, 0.7));
  bezel.position.z = -0.065;
  bezel.castShadow = true;
  mon.add(bezel);
  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.16, MON.y - 0.1, 0.12), metal(0x1b1e24, 0.4, 0.8));
  stand.position.set(0, -(MON.y) / 2 - 0.05, -0.18);
  stand.castShadow = true;
  mon.add(stand);
  const base = new THREE.Mesh(new RoundedBoxGeometry(1.0, 0.06, 0.7, 2, 0.02), metal(0x1b1e24, 0.4, 0.8));
  base.position.set(0, -MON.y + 0.03, -0.18);
  mon.add(base);
  const ledStrip = new THREE.Mesh(new THREE.BoxGeometry(MON.w * 0.6, 0.012, 0.01), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.12, 0.75, 0.75), toneMapped: false }));
  ledStrip.position.set(0, -MON.h / 2 - 0.08, 0.002);
  mon.add(ledStrip);

  const screen = (() => {
    const canvas = makeCanvas(SW, SH);
    const x = canvas.getContext('2d');
    const texture = tex(canvas);
    return { canvas, x, texture };
  })();
  const screenMat = new THREE.MeshBasicMaterial({ map: screen.texture, color: new THREE.Color(0.8, 0.8, 0.8), toneMapped: false });
  const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(MON.w, MON.h), screenMat);
  screenMesh.position.z = 0.001;
  mon.add(screenMesh);
  // glass sheen
  const sheen = makeCanvas(512, 256);
  {
    const x = sheen.getContext('2d');
    const g = x.createLinearGradient(0, 0, 512, 256);
    g.addColorStop(0.0, 'rgba(255,255,255,0)');
    g.addColorStop(0.28, 'rgba(255,255,255,0.0)');
    g.addColorStop(0.36, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.42, 'rgba(255,255,255,0.1)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.3)');
    g.addColorStop(0.58, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 512, 256);
  }
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(MON.w, MON.h), new THREE.MeshBasicMaterial({
    map: tex(sheen), transparent: true, opacity: 0.035, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  }));
  glass.position.z = 0.006;
  mon.add(glass);
  scene.add(mon);

  // Terminal layout (fixed, so the clip.mp4 token has a known spot).
  const login = TL.loginTyping;
  const loginTimes = typingTimes(login);
  const loginSpans = cmdSpans(login.text);
  const typing = TL.typing;
  const times = typingTimes(typing);
  const spans = cmdSpans(typing.text);
  const MX = 120;
  const lineY = [430, 430 + LH, 430 + LH * 2 + 40];
  screen.x.font = `500 ${TERM_FONT}px ${FONT.mono}`;
  const promptW = screen.x.measureText(typing.prompt).width;
  const tokIdx = typing.text.indexOf('clip.mp4');
  const tokX0 = MX + promptW + screen.x.measureText(typing.text.slice(0, tokIdx)).width;
  const tokW = screen.x.measureText('clip.mp4').width;
  const tokCenter = { u: (tokX0 + tokW / 2) / SW, v: (lineY[2] - TERM_FONT * 0.35) / SH };
  const tokWorld = v3(MON.x + (tokCenter.u - 0.5) * MON.w, MON.y + (0.5 - tokCenter.v) * MON.h, MON.z + 0.02);
  const tokWorldW = tokW / SW * MON.w;

  const qr = qrModules();
  // the login window: pops on the login ENTER, closes itself after the scan
  const WIN = { x: 1080, y: 150, w: 820, h: 880 };
  const winOpen = (t) => easeOutExpo(clamp((t - C.loginEnter) / 0.3));
  const winClose = (t) => easeInCubic(clamp((t - (C.scan + 0.12)) / 0.24));

  const crackR = rng(77);
  const cracks = Array.from({ length: 14 }, () => {
    const a = crackR() * Math.PI * 2;
    const pts = [];
    let r = 40, ang = a;
    for (let k = 0; k < 6; k++) { r += 40 + crackR() * 120; ang += (crackR() - 0.5) * 0.5; pts.push([Math.cos(ang) * r, Math.sin(ang) * r * 0.9]); }
    return pts;
  });

  function cursor(x, X, Y) {
    x.fillStyle = 'rgba(232,237,245,0.9)';
    x.fillRect(X + 4, Y - TERM_FONT * 0.8, TERM_FONT * 0.58, TERM_FONT * 0.98);
  }

  function drawLoginWindow(x, t) {
    const o = winOpen(t), c = winClose(t);
    if (o <= 0 || c >= 1) return;
    const s = lerp(0.9, 1, o) * lerp(1, 0.9, c);
    x.save();
    x.globalAlpha = o * (1 - c);
    x.translate(WIN.x + WIN.w / 2, WIN.y + WIN.h / 2);
    x.scale(s, s);
    x.translate(-WIN.w / 2, -WIN.h / 2);
    x.shadowColor = 'rgba(0,0,0,0.6)'; x.shadowBlur = 60; x.shadowOffsetY = 20;
    x.fillStyle = '#121722'; roundRect(x, 0, 0, WIN.w, WIN.h, 22); x.fill();
    x.shadowColor = 'transparent';
    x.fillStyle = '#1b2230'; roundRect(x, 0, 0, WIN.w, 70, 22); x.fill(); x.fillRect(0, 40, WIN.w, 30);
    [['#ff5f57', 40], ['#febc2e', 80], ['#28c840', 120]].forEach(([col, cx]) => { x.fillStyle = col; x.beginPath(); x.arc(cx, 35, 11, 0, Math.PI * 2); x.fill(); });
    x.fillStyle = '#ffffff'; x.font = `700 64px ${FONT.display}`; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    x.fillText('Log in', WIN.w / 2, 170);
    const S = 470;
    const glow = hit(t, C.scan, 0.5);
    drawQR(x, (WIN.w - S) / 2, 220, S, qr, { reveal: easeOutCubic(clamp((t - C.loginEnter - 0.08) / 0.35)) * 1.05, glow });
    if (t >= C.scan) checkMark(x, WIN.w / 2, 220 + S / 2, 92, clamp((t - C.scan) / 0.3));
    x.fillStyle = '#c3cbd9'; x.font = `600 52px ${FONT.ui}`;
    x.fillText('Scan with your phone', WIN.w / 2, 800);
    x.restore();
  }

  // What each part of the command means, labelled as it is typed.
  const LABELS = [
    { token: 'alice', text: 'account', color: COLOR.cyan },
    { token: 'clip.mp4', text: 'your video', color: '#f2f4f7' },
    { token: '"Hello #fyp"', text: 'caption', color: COLOR.amber },
  ].map((l) => {
    const i0 = typing.text.indexOf(l.token, l.token === 'alice' ? typing.text.indexOf('-u') : 0);
    const x0 = MX + promptW + screen.x.measureText(typing.text.slice(0, i0)).width;
    const w = screen.x.measureText(l.token).width;
    return { ...l, x0, w, done: times[i0 + l.token.length - 1] };
  });
  function drawLabels(x, t) {
    const out = 1 - smooth(clamp((t - C.enter) / 0.15));
    for (const l of LABELS) {
      const a = smooth(clamp((t - l.done) / 0.15)) * out;
      if (a <= 0) continue;
      x.save();
      x.globalAlpha = a;
      x.strokeStyle = l.color; x.lineWidth = 4; x.lineCap = 'round';
      const by = lineY[2] + 22;
      x.beginPath(); x.moveTo(l.x0 + 4, by); x.lineTo(l.x0 + 4, by + 12); x.lineTo(l.x0 + l.w - 4, by + 12); x.lineTo(l.x0 + l.w - 4, by); x.stroke();
      x.fillStyle = l.color; x.font = `600 40px ${FONT.ui}`; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
      x.fillText(l.text, l.x0 + l.w / 2, by + 62 + (1 - a) * 10);
      x.restore();
    }
  }

  let screenKey = null;
  function drawScreen(t) {
    // The screen only changes until the hole has formed; after that one static frame.
    const key = t < C.enter + 0.25 ? Math.round(t * 240) : 'after';
    if (key === screenKey) return;
    screenKey = key;
    if (key === 'after') t = C.enter + 0.3;
    const x = screen.x;
    x.setTransform(1, 0, 0, 1, 0, 0);
    const g = x.createLinearGradient(0, 0, 0, SH);
    g.addColorStop(0, '#0d121c'); g.addColorStop(1, '#070a10');
    x.fillStyle = g; x.fillRect(0, 0, SW, SH);
    const rg = x.createRadialGradient(SW * 0.4, SH * 0.45, 50, SW * 0.5, SH * 0.5, SW * 0.7);
    rg.addColorStop(0, 'rgba(37,244,238,0.05)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = rg; x.fillRect(0, 0, SW, SH);
    // title bar
    x.fillStyle = '#121826'; x.fillRect(0, 0, SW, 86);
    [['#ff5f57', 60], ['#febc2e', 110], ['#28c840', 160]].forEach(([c, cx]) => { x.fillStyle = c; x.beginPath(); x.arc(cx, 43, 15, 0, Math.PI * 2); x.fill(); });
    x.font = `500 30px ${FONT.mono}`; x.fillStyle = '#6c7690'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('alice@laptop: ~', SW / 2, 44);
    x.textAlign = 'left'; x.textBaseline = 'alphabetic';

    const scroll = easeInOutCubic(clamp(t / 0.3)); // thumbnail -> opening
    if (scroll < 1) {
      // Thumbnail: name, tagline, the completed command and its output.
      x.save();
      x.translate(0, -scroll * SH);
      x.font = `700 300px ${FONT.display}`;
      if ('letterSpacing' in x) x.letterSpacing = '-12px';
      x.globalCompositeOperation = 'lighter';
      x.fillStyle = COLOR.cyan; x.fillText('autotok', MX - 8, 400);
      x.fillStyle = COLOR.magenta; x.fillText('autotok', MX + 8, 400);
      x.globalCompositeOperation = 'source-over';
      x.fillStyle = '#ffffff'; x.fillText('autotok', MX, 400);
      if ('letterSpacing' in x) x.letterSpacing = '0px';
      x.font = `500 58px ${FONT.ui}`; x.fillStyle = '#b7c0d3';
      x.fillText('Upload and schedule TikTok videos with one command.', MX + 6, 520);
      x.font = `500 ${TERM_FONT}px ${FONT.mono}`; x.fillStyle = COLOR.green;
      x.fillText(typing.prompt, MX, 760);
      drawSpans(x, spans, MX + promptW, 760);
      x.font = `500 ${TERM_FONT}px ${FONT.mono}`; x.fillStyle = '#e8edf5';
      x.fillText(TL.output, MX, 760 + LH);
      x.restore();
    }
    if (scroll > 0) {
      x.save();
      x.translate(0, (1 - scroll) * SH);
      const blink = Math.floor(t * 4) % 2 === 0;
      // line 0: the one-time login
      x.font = `500 ${TERM_FONT}px ${FONT.mono}`;
      x.globalAlpha = t < C.loginEnter + 1.5 ? 1 : lerp(1, 0.42, smooth(clamp((t - C.loginEnter - 1.5) / 0.6)));
      x.fillStyle = COLOR.green; x.fillText(login.prompt, MX, lineY[0]);
      const nl = typedCount(t, loginTimes);
      const endL = drawSpans(x, loginSpans, MX + promptW, lineY[0], nl);
      if (t < C.loginEnter && (blink || nl < loginTimes.length)) cursor(x, endL, lineY[0]);
      // line 1: its output, once the scan lands
      if (t >= C.saved) {
        x.font = `500 ${TERM_FONT}px ${FONT.mono}`; x.fillStyle = '#e8edf5';
        const ok = smooth(clamp((t - C.saved) / 0.08));
        x.globalAlpha *= ok;
        x.fillText(TL.loginOutput, MX, lineY[1]);
        x.globalAlpha = t < C.loginEnter + 1.5 ? 1 : lerp(1, 0.42, smooth(clamp((t - C.loginEnter - 1.5) / 0.6)));
      }
      // line 2: the upload
      x.globalAlpha = 1;
      if (t >= C.saved + 0.2) {
        x.font = `500 ${TERM_FONT}px ${FONT.mono}`;
        x.fillStyle = COLOR.green; x.fillText(typing.prompt, MX, lineY[2]);
        const n = typedCount(t, times);
        const end = drawSpans(x, spans, MX + promptW, lineY[2], n, t >= C.enter ? 'clip.mp4' : null);
        if (t < C.enter && (blink || n < times.length)) cursor(x, end, lineY[2]);
        drawLabels(x, t);
      }
      x.restore();
      drawLoginWindow(x, t);
    }
    // Hole + cracks where clip.mp4 tore out.
    if (t >= C.enter) {
      const k = easeOutExpo(clamp((t - C.enter) / 0.12));
      const cx = tokCenter.u * SW, cy = tokCenter.v * SH;
      x.save();
      x.translate(cx, cy);
      x.fillStyle = '#020305';
      x.beginPath();
      const hr = rng(5);
      for (let i = 0; i < 18; i++) {
        const a = i / 18 * Math.PI * 2;
        const rr = (1 + (hr() - 0.5) * 0.35) * k;
        x.lineTo(Math.cos(a) * (tokW * 0.62) * rr, Math.sin(a) * 70 * rr);
      }
      x.closePath(); x.fill();
      x.strokeStyle = 'rgba(200,240,255,0.55)';
      x.lineWidth = 3;
      for (const pts of cracks) {
        x.beginPath(); x.moveTo(0, 0);
        const m = Math.ceil(pts.length * k);
        for (let i = 0; i < m; i++) x.lineTo(pts[i][0] * (tokW / 300), pts[i][1]);
        x.stroke();
      }
      x.restore();
    }
    // scanlines
    x.globalAlpha = 0.06; x.fillStyle = '#000';
    for (let yy = 0; yy < SH; yy += 4) x.fillRect(0, yy, SW, 2);
    x.globalAlpha = 1;
    screen.texture.needsUpdate = true;
  }

  // ---------------- the phone that scans the code (foreground, over the shoulder)
  const PH_SCALE = 0.82;
  const phone = makePhoneBody();
  phone.scale.setScalar(PH_SCALE);
  scene.add(phone);
  const VW = 540, VH = 1174;
  const vf = makeCanvas(VW, VH);
  const vx = vf.getContext('2d');
  const vtex = tex(vf);
  const vScreen = new THREE.Mesh(new THREE.PlaneGeometry(PHONE.sw, PHONE.sh), new THREE.MeshBasicMaterial({ map: vtex, toneMapped: false }));
  vScreen.position.z = PHONE.d / 2 + 0.0035;
  phone.add(vScreen);
  const PH_REST = v3(-0.68, MON.y - 0.45, 1.25);
  const phoneIn = (t) => easeOutExpo(clamp((t - (C.loginEnter + 0.15)) / 0.55));
  const phoneOut = (t) => easeInCubic(clamp((t - (C.saved + 0.25)) / 0.45));

  function drawViewfinder(t) {
    const x = vx;
    x.save();
    x.clearRect(0, 0, VW, VH);
    roundRect(x, 0, 0, VW, VH, 52); x.clip();
    // the camera feed: the monitor, out of focus, with the code in the middle
    const g = x.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, '#0a1018'); g.addColorStop(1, '#05070b');
    x.fillStyle = g; x.fillRect(0, 0, VW, VH);
    x.fillStyle = 'rgba(70,110,140,0.18)'; roundRect(x, -60, 240, VW + 120, 700, 30); x.fill();
    const S = 300;
    x.save();
    x.translate(VW / 2, VH * 0.46);
    x.rotate(-0.06 + 0.02 * Math.sin(t * 3.1));
    drawQR(x, -S / 2, -S / 2, S, qr, { paper: '#d9dee6', ink: '#11141a' });
    x.restore();
    // scan brackets close in, then lock on the beat
    const lock = t >= C.scan;
    const close = easeOutExpo(clamp((t - (C.loginEnter + 0.35)) / 0.6));
    const snap = lock ? 1 - spring(t - C.scan, 2.4, 0.5) : 0;
    const half = lerp(250, 186, close) - snap * 12;
    const L = 60;
    x.strokeStyle = lock ? COLOR.cyan : 'rgba(255,255,255,0.92)';
    x.lineWidth = lock ? 12 : 9; x.lineCap = 'round';
    const cx = VW / 2, cy = VH * 0.46;
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      x.beginPath();
      x.moveTo(cx + sx * half, cy + sy * (half - L));
      x.lineTo(cx + sx * half, cy + sy * half);
      x.lineTo(cx + sx * (half - L), cy + sy * half);
      x.stroke();
    }
    // a scan line sweeps until it locks
    if (!lock && close > 0.2) {
      const yy = cy - half + ((t * 1.6) % 1) * half * 2;
      const sg = x.createLinearGradient(0, yy - 30, 0, yy + 30);
      sg.addColorStop(0, 'rgba(37,244,238,0)'); sg.addColorStop(0.5, 'rgba(37,244,238,0.85)'); sg.addColorStop(1, 'rgba(37,244,238,0)');
      x.fillStyle = sg; x.fillRect(cx - half + 10, yy - 30, half * 2 - 20, 60);
    }
    if (lock) {
      const k = clamp((t - C.scan) / 0.3);
      x.fillStyle = `rgba(37,244,238,${0.18 * (1 - k)})`; x.fillRect(0, 0, VW, VH);
      checkMark(x, cx, cy, 86, k);
    }
    // shutter-style hint along the bottom
    x.fillStyle = 'rgba(255,255,255,0.85)';
    x.beginPath(); x.arc(VW / 2, VH - 120, 46, 0, Math.PI * 2); x.fill();
    x.strokeStyle = 'rgba(255,255,255,0.5)'; x.lineWidth = 6;
    x.beginPath(); x.arc(VW / 2, VH - 120, 60, 0, Math.PI * 2); x.stroke();
    x.restore();
    vtex.needsUpdate = true;
  }

  // ---------------- conveyors (alice's belt + two more lanes for depth)
  const lanes = LANE_Z.map((z, i) => makeConveyor(i === 0 ? -2.5 : -24, 34, z, LANE_COLORS[i]));
  lanes.forEach((l) => scene.add(l.group));

  // ---------------- the parcel
  const parcel = makeParcel(TL.accounts[0], 11);
  scene.add(parcel);
  const travel = (t) => (t <= C.land ? 0 : 1.6 * (t - C.land));
  const xA = (t) => 1.0 + travel(t);

  // ---------------- particles: glass shards, glints, dust
  const shardR = rng(12);
  const SHARDS = 46;
  const shardGeo = new THREE.BufferGeometry();
  shardGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.5, 0, -0.4, -0.4, 0, 0.45, -0.3, 0.02], 3));
  shardGeo.computeVertexNormals();
  const shards = new THREE.InstancedMesh(shardGeo, new THREE.MeshPhysicalMaterial({ color: 0xcfefff, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.7, side: THREE.DoubleSide, envMapIntensity: 3, emissive: 0x1b3a44 }), SHARDS);
  shards.frustumCulled = false;
  const shardP = Array.from({ length: SHARDS }, () => {
    const a = shardR() * Math.PI * 2;
    const sp = 1.5 + shardR() * 4.5;
    return {
      off: v3(Math.cos(a) * tokWorldW * 0.4 * shardR(), Math.sin(a) * 0.06 * shardR(), 0),
      v: v3(Math.cos(a) * sp * 0.5, Math.sin(a) * sp * 0.4 + 1.0, 2.0 + shardR() * 4),
      s: 0.02 + shardR() * 0.06,
      rot: v3(shardR() * 20, shardR() * 20, shardR() * 20),
    };
  });
  scene.add(shards);
  const glints = new Burst(120, {
    color: new THREE.Color(2.5, 3.5, 4.0), size: 0.022, gravity: -5, seed: 3,
    spawn: (k, r) => {
      const a = r() * Math.PI * 2, sp = 1 + r() * 5;
      return { p0: tokWorld.clone().add(v3((r() - 0.5) * tokWorldW, (r() - 0.5) * 0.08, 0.02)), v0: v3(Math.cos(a) * sp * 0.6, Math.sin(a) * sp * 0.5 + 0.8, 1 + r() * 4), life: 0.4 + r() * 0.9 };
    },
  });
  scene.add(glints.points);
  const LAND = v3(1.0, BELT_Y, LANE_Z[0]);
  const dust = new Burst(60, {
    color: new THREE.Color(0.55, 0.5, 0.45), size: 0.12, gravity: 0.15, drag: 3.5, additive: false, seed: 8, opacity: 0.35,
    spawn: (k, r) => {
      const a = r() * Math.PI * 2, sp = 1.2 + r() * 2.5;
      return { p0: LAND.clone().add(v3(Math.cos(a) * 0.4, 0.02, Math.sin(a) * 0.3)), v0: v3(Math.cos(a) * sp, 0.25 + r() * 0.5, Math.sin(a) * sp * 0.7), life: 0.9 + r() * 0.8, fade: 2 };
    },
  });
  scene.add(dust.points);

  // ---------------- camera rig
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = v3(1, 1, 1);
  function poseLerp(a, b, k) {
    return { p: a.p.clone().lerp(b.p, k), l: a.l.clone().lerp(b.l, k), fov: lerp(a.fov ?? 35, b.fov ?? 35, k), roll: lerp(a.roll ?? 0, b.roll ?? 0, k) };
  }
  const drift = (t) => v3(fbm1(t * 0.3) * 0.02, fbm1(t * 0.25 + 4) * 0.015, 0);
  // thumbnail framing (the pre-roll), the wider login framing, the command-line close-up
  const P_THUMB = { p: v3(0.05, MON.y + 0.02, 2.38), l: v3(0, MON.y, 0), fov: 35, roll: -0.004 };
  const P_LOGIN = { p: v3(0.2, MON.y - 0.04, 3.05), l: v3(-0.06, MON.y - 0.12, 0), fov: 35, roll: 0.0 };
  const P_CMD = { p: v3(-0.04, MON.y - 0.03, 1.98), l: v3(-0.06, MON.y - 0.06, 0), fov: 35, roll: 0.012 };
  function cameraPose(t) {
    let pose;
    if (t < C.saved + 0.4) {
      pose = poseLerp(P_THUMB, P_LOGIN, easeInOutCubic(clamp((t - 0.3) / 2.0)));
    } else {
      pose = poseLerp(P_LOGIN, P_CMD, easeInOutCubic(clamp((t - (C.saved + 0.4)) / (C.enter - 0.1 - (C.saved + 0.4)))));
    }
    pose.p.add(drift(t));
    if (t < C.enter) return pose;
    // Pull back through the depot (speed ramp), then swing low behind the parcel.
    const rev = { p: v3(-3.2, 3.4, 9.2), l: v3(0.8, 1.4, 1.5), fov: 38, roll: 0.02 };
    const kOut = easeOutExpo(clamp((t - C.enter) / 1.15));
    const pre = poseLerp(pose, rev, kOut);
    pre.p.x += Math.sin(kOut * Math.PI) * 0.8;
    const xa = xA(t);
    const track = { p: v3(xa - 3.0, 1.95, LANE_Z[0] + 1.45), l: v3(xa + 2.5, 0.95, LANE_Z[0] - 0.15), fov: 36, roll: 0.03 };
    return poseLerp(pre, track, easeInOutCubic(clamp((t - (C.land + 0.35)) / 1.7)));
  }

  // ---------------- update
  function update(t, fx, hud) {
    drawScreen(t);

    // The scanning phone: rises in after the login ENTER, kicks on the lock, drops away.
    const pin = phoneIn(t), pout = phoneOut(t);
    phone.visible = pin > 0 && pout < 1;
    if (phone.visible) {
      drawViewfinder(t);
      const jolt = t >= C.scan ? (1 - spring(t - C.scan, 2.8, 0.35)) * 0.03 : 0;
      phone.position.set(PH_REST.x - (1 - pin) * 0.25, PH_REST.y - (1 - pin) * 1.3 - pout * 1.5 + jolt, PH_REST.z);
      phone.rotation.set(-0.06 + (1 - pin) * 0.35, 0.22 - (1 - pin) * 0.2, 0.05 * (1 - pin) - pout * 0.15);
      phoneGlow.position.set(phone.position.x, phone.position.y, phone.position.z + 0.4);
      phoneRim.position.set(phone.position.x - 0.55, phone.position.y + 0.5, phone.position.z - 0.35);
    }
    phoneGlow.intensity = phone.visible ? 1.5 + hit(t, C.scan, 0.4) * 3 : 0;
    phoneRim.intensity = phone.visible ? 5 : 0;
    vScreen.material.color.setScalar(0.85 + hit(t, C.scan, 0.25) * 0.3);

    // The parcel: hidden in the screen, then flight, then the belt.
    const pa = parcel;
    if (t < C.enter) {
      pa.visible = false;
    } else {
      pa.visible = true;
      const u = clamp((t - C.enter) / (C.land - C.enter));
      const landPos = v3(1.0, BELT_Y + PARCEL.h / 2, LANE_Z[0]);
      if (u < 1) {
        const grow = easeOutExpo(clamp((t - C.enter) / 0.22));
        const ext = easeOutCubic(clamp((t - C.enter) / 0.35));
        pa.scale.set(lerp(tokWorldW / PARCEL.w, 1, grow), lerp(0.06 / PARCEL.h, 1, grow), lerp(0.02, 1, ext));
        const ex = easeInOutCubic(u);
        pa.position.set(
          lerp(tokWorld.x, landPos.x, ex),
          lerp(tokWorld.y, landPos.y, easeInCubic(u)) + Math.sin(u * Math.PI) * 0.9,
          lerp(tokWorld.z + 0.1, landPos.z, easeOutCubic(Math.min(1, u * 1.4))),
        );
        pa.rotation.set(-Math.PI * 2 * easeInOutCubic(u), (1 - easeOutCubic(u)) * 0.6, (1 - u) * 0.3);
      } else {
        const sq = spring(t - C.land, 3.2, 0.28);
        const amt = (1 - sq) * 0.32;
        pa.scale.set(1 + amt * 0.5, 1 - amt, 1 + amt * 0.5);
        pa.position.set(xA(t), BELT_Y + PARCEL.h / 2 * pa.scale.y, LANE_Z[0]);
        pa.rotation.set(0, Math.sin((t - C.land) * 9) * 0.04 * Math.exp(-(t - C.land) * 3), 0);
      }
    }
    lanes.forEach((l, i) => l.setTravel(i === 0 ? xA(t) : 1.6 * Math.max(0, t - 6)));

    // Belt LEDs: dim idle, a shockwave out from the landing on alice's belt.
    lanes.forEach((l, i) => {
      l.light((x) => {
        let k = 0.18 + 0.08 * Math.sin(x * 2.2 - t * 9);
        if (i === 0 && t >= C.land) {
          const r = Math.abs(x - 1.0) - (t - C.land) * 14;
          k += Math.exp(-r * r * 0.8) * 3.0 * Math.exp(-(t - C.land) * 0.7);
          k += 0.35 * smooth(clamp((t - C.land) / 0.6));
        }
        return k;
      });
    });

    // Shards + glints from the screen.
    const age = t - C.enter;
    shards.visible = age >= 0 && age < 2;
    if (shards.visible) {
      shardP.forEach((s, k) => {
        const p = tokWorld.clone().add(s.off).addScaledVector(s.v, age);
        p.y += -0.5 * 9.8 * age * age;
        _e.set(s.rot.x * age, s.rot.y * age, s.rot.z * age);
        _q.setFromEuler(_e);
        _s.setScalar(s.s * (1 - clamp((age - 1.2) / 0.8)));
        _m.compose(p, _q, _s);
        shards.setMatrixAt(k, _m);
      });
      shards.instanceMatrix.needsUpdate = true;
    }
    glints.points.visible = age >= 0 && age < 1.5;
    if (glints.points.visible) glints.update(age);
    const dAge = t - C.land;
    dust.points.visible = dAge >= 0 && dAge < 2;
    if (dust.points.visible) dust.update(dAge);

    // Screen light: a flare on the punch-out, a cyan pulse on the scan.
    screenLight.intensity = 2 + hit(t, C.enter, 0.35) * 12 + hit(t, C.scan, 0.4) * 4;
    screenMat.color.setScalar(t < C.enter ? 0.8 : 0.8 - 0.3 * smooth(clamp(age / 1.5)));

    // Cull lights that contribute nothing to this stretch.
    screenLight.visible = t < C.enter + 4.5;
    fillCyan.visible = t < C.enter + 1.5;
    fillMag.visible = t < C.enter + 2.5;
    beltLights.forEach((l) => { l.visible = t > C.enter + 0.5; });

    // Shadow camera follows the action.
    const focusX = Math.max(0, xA(t));
    key.position.set(focusX - 4, 14, -6);
    key.target.position.set(focusX + 1, 0, 4);

    // Camera
    const pose = cameraPose(t);
    camera.position.copy(pose.p);
    camera.up.set(Math.sin(pose.roll), Math.cos(pose.roll), 0);
    camera.lookAt(pose.l);
    // whip pan out to the board
    const whip = easeInCubic(clamp((t - C.whipToBoard) / (C.board - C.whipToBoard)));
    if (whip > 0) camera.rotateY(-whip * 0.9);
    camera.fov = pose.fov;
    camera.updateProjectionMatrix();

    // Lens + post
    fx.bloom = { strength: 0.75, radius: 0.5, threshold: 0.82 };
    fx.ca = 1.0 + hit(t, C.enter, 0.3) * 9 + hit(t, C.land, 0.2) * 5 + hit(t, C.scan, 0.25) * 6;
    fx.shake = hit(t, C.enter, 0.3) * 1.6 + hit(t, C.land, 0.25) * 1.2 + hit(t, C.scan, 0.2) * 0.5;
    fx.zoom = t >= C.enter ? hit(t, C.enter + 0.05, 0.22) * 0.06 : hit(t, C.scan, 0.2) * 0.02;
    if (t < C.enter) {
      fx.vignette = 0.75;
      if (phone.visible) {
        // rack: phone sharp while it scans, then the screen for the "saved" line
        const toScreen = smooth(clamp((t - C.scan - 0.05) / 0.3));
        const dPhone = camera.position.distanceTo(phone.position);
        const dMon = camera.position.distanceTo(v3(0, MON.y, 0));
        fx.dof = { focus: lerp(dPhone, dMon, toScreen), aperture: 0.05, maxBlur: 8 };
      } else {
        fx.dof = null;
      }
    } else {
      fx.dof = { focus: camera.position.distanceTo(pa.position), aperture: 0.09, maxBlur: 12 };
    }
    if (whip > 0) fx.blur = [whip * 0.14, 0];

    hud.header('Log in once.', t, 0.6, C.saved + 0.65);
    hud.header('One command.', t, C.saved + 1.15, C.enter - 0.1);
    hud.header('On its way to TikTok.', t, C.land + 0.4, C.whipToBoard - 0.05);
    return camera;
  }

  return { start: -10, scene, update };
}
