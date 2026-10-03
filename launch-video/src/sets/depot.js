// Shots 0-3: the terminal, the parcel punching out of it, the belt, and the
// three proxy lanes with their postmarks and tunnels.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {
  clamp, lerp, smooth, smoother, easeOutExpo, easeInOutCubic, easeOutCubic, easeInCubic, easeInOutQuint,
  spring, hit, hits, typingTimes, typedCount, fbm1, rng,
} from '../engine/util.js';
import { makeCanvas, tex, FONT, COLOR, roundRect } from '../engine/canvas.js';
import {
  PARCEL, BELT_Y, LANE_COLORS, makeParcel, makeConveyor, makeFloor, makeRacks, makeCeiling, makeShaft,
  floorLine, metal, Burst, signMesh, v3,
} from '../engine/props.js';

const MON = { x: 0, y: 2.35, z: 0, w: 2.4, h: 1.35 };
const LANE_Z = [2.2, 4.8, 7.4];
const X_PM = 7.4; // postmark row
const X_TUN = 9.2; // tunnel mouths
const X_END = 37.5; // alice's tunnel exit
const TUN_R = 1.1;
const TUN_Y = 1.25;

// Parcel travel along the belt after landing (5.0 s). The belt runs at
// 1.6 m/s and the tunnel kicks it to 6 m/s between 11.5 s and 12.5 s.
function travel(t) {
  if (t <= 5) return 0;
  const w = t - 11.5;
  const R = w <= 0 ? 0 : w <= 1 ? w ** 3 - w ** 4 / 2 : 0.5 + (w - 1);
  return 1.6 * (t - 5) + 4.4 * R;
}
const xA = (t) => 1.0 + travel(t);
const laneX = (i, t) => (i === 0 ? xA(t) : X_PM + travel(t) - travel([9.0, 9.5, 10.0][i]));

// ---------------------------------------------------------------- terminal screen
const SW = 2048, SH = 1152;
const TERM_FONT = 52;
const LH = 84;

function cmdSpans(text) {
  // syntax colours for: autotok upload -u alice -v clip.mp4 -t "Hello #fyp"
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
  const laneLights = LANE_COLORS.map((c, i) => {
    const l = new THREE.PointLight(c, 6, 6, 1.8);
    l.position.set(X_PM, 2.6, LANE_Z[i]);
    scene.add(l);
    return l;
  });
  const fillCyan = new THREE.PointLight(LANE_COLORS[0], 3, 10, 1.5);
  fillCyan.position.set(-2.5, 1.6, 3.2);
  scene.add(fillCyan);
  const fillMag = new THREE.PointLight(LANE_COLORS[1], 4, 12, 1.5);
  fillMag.position.set(3.5, 3.5, -1.5);
  scene.add(fillMag);

  // ---------------- environment
  scene.add(makeFloor());
  scene.add(makeRacks({ x0: -24, x1: 70, z: -6.5, seed: 4 }));
  scene.add(makeRacks({ x0: -24, x1: 70, z: 13.5, seed: 9, facing: -1 }));
  scene.add(makeCeiling({ x0: -24, x1: 80, zs: [-2.5, 4.8, 12], y: 9.5 }));
  for (const [x, z] of [[-1, -2.5], [6, 4.8], [13, -2.5], [20, 12], [-8, 4.8], [27, 4.8]]) {
    const s = makeShaft(0.6, 2.8, 9.4, 0xbcd0ff, 0.045);
    s.position.set(x, 4.75, z);
    scene.add(s);
  }
  for (const z of LANE_Z) {
    scene.add(floorLine(-24, 70, z - 0.95, 0.08, '#c9a227'));
    scene.add(floorLine(-24, 70, z + 0.95, 0.08, '#c9a227'));
  }
  scene.add(floorLine(-24, 70, 0.6, 0.35, '#c9a227', true));

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

  const crackR = rng(77);
  const cracks = Array.from({ length: 14 }, () => {
    const a = crackR() * Math.PI * 2;
    const pts = [];
    let r = 40, ang = a;
    for (let k = 0; k < 6; k++) { r += 40 + crackR() * 120; ang += (crackR() - 0.5) * 0.5; pts.push([Math.cos(ang) * r, Math.sin(ang) * r * 0.9]); }
    return pts;
  });

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
    // subtle vignette glow
    const rg = x.createRadialGradient(SW * 0.4, SH * 0.45, 50, SW * 0.5, SH * 0.5, SW * 0.7);
    rg.addColorStop(0, 'rgba(37,244,238,0.05)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = rg; x.fillRect(0, 0, SW, SH);
    // title bar
    x.fillStyle = '#121826'; x.fillRect(0, 0, SW, 86);
    [['#ff5f57', 60], ['#febc2e', 110], ['#28c840', 160]].forEach(([c, cx]) => { x.fillStyle = c; x.beginPath(); x.arc(cx, 43, 15, 0, Math.PI * 2); x.fill(); });
    x.font = `500 30px ${FONT.mono}`; x.fillStyle = '#6c7690'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('alice@depot: ~', SW / 2, 44);
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
      x.fillText('Upload and schedule TikTok videos from the command line.', MX + 6, 520);
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
      x.font = `500 ${TERM_FONT}px ${FONT.mono}`;
      x.globalAlpha = 0.42;
      x.fillStyle = COLOR.green; x.fillText(typing.prompt, MX, lineY[0]);
      drawSpans(x, cmdSpans('autotok login -n alice -p user:****@gate.example.com:7000'), MX + promptW, lineY[0]);
      x.font = `500 ${TERM_FONT}px ${FONT.mono}`; x.fillStyle = '#e8edf5';
      x.fillText("Account 'alice' saved.", MX, lineY[1]);
      x.globalAlpha = 1;
      x.fillStyle = COLOR.green; x.fillText(typing.prompt, MX, lineY[2]);
      const n = typedCount(t, times);
      const end = drawSpans(x, spans, MX + promptW, lineY[2], n, t >= C.enter ? 'clip.mp4' : null);
      // cursor: blinks on the beat until enter
      if (t < C.enter && (Math.floor(t * 4) % 2 === 0 || n < times.length)) {
        x.fillStyle = 'rgba(232,237,245,0.9)';
        x.fillRect(end + 4, lineY[2] - TERM_FONT * 0.8, TERM_FONT * 0.58, TERM_FONT * 0.98);
      }
      x.restore();
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

  // ---------------- conveyors
  const lanes = LANE_Z.map((z, i) => makeConveyor(i === 0 ? -2.5 : -24, X_TUN + (i === 0 ? 32 : 32), z, LANE_COLORS[i]));
  lanes.forEach((l) => scene.add(l.group));

  // ---------------- parcels
  const parcels = TL.accounts.map((a, i) => {
    const p = makeParcel(a, 11 + i * 10);
    scene.add(p);
    return p;
  });

  // ---------------- postmark stations
  function postmarkCanvas(i) {
    const c = makeCanvas(512, 512);
    const x = c.getContext('2d');
    const col = ['#1de9e3', '#ff3d6a', '#ffb347'][i];
    x.strokeStyle = col; x.fillStyle = col;
    x.lineWidth = 14; x.beginPath(); x.arc(256, 256, 220, 0, Math.PI * 2); x.stroke();
    x.lineWidth = 6; x.beginPath(); x.arc(256, 256, 190, 0, Math.PI * 2); x.stroke();
    x.font = `800 58px ${FONT.mono}`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(`@${TL.accounts[i]}`, 256, 170);
    x.font = `800 ${TL.postmarkIPs[i].length > 11 ? 44 : 50}px ${FONT.mono}`;
    x.fillText(TL.postmarkIPs[i], 256, 262);
    x.font = `700 34px ${FONT.mono}`;
    x.fillText('PROXY', 256, 345);
    // ink texture breakup
    x.globalCompositeOperation = 'destination-out';
    const r = rng(40 + i);
    for (let k = 0; k < 900; k++) { x.globalAlpha = r() * 0.6; x.beginPath(); x.arc(r() * 512, r() * 512, r() * 3.5, 0, 7); x.fill(); }
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    return c;
  }
  const decals = [];
  const heads = [];
  const displays = [];
  const inks = [];
  const pmMat = metal(0x22252c, 0.35, 0.85);
  LANE_Z.forEach((z, i) => {
    const g = new THREE.Group();
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.5, 0.14), pmMat);
      post.position.set(X_PM, 1.25, z + s * 0.78);
      post.castShadow = true;
      g.add(post);
    }
    const beam = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.3, 1.8, 2, 0.04), pmMat);
    beam.position.set(X_PM, 2.55, z);
    beam.castShadow = true;
    g.add(beam);
    const head = new THREE.Group();
    const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 16), metal(0xb8bcc4, 0.2, 1.0));
    piston.position.y = 0.6;
    head.add(piston);
    const die = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.14, 40), pmMat);
    head.add(die);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.012, 8, 48), new THREE.MeshBasicMaterial({ color: LANE_COLORS[i].clone().multiplyScalar(2.5), toneMapped: false }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.04;
    head.add(ring);
    head.position.set(X_PM, 2.0, z);
    head.traverse((o) => { o.castShadow = true; });
    g.add(head);
    heads.push(head);
    // display on the beam front (faces -z, toward camera side)
    const dc = makeCanvas(1024, 256);
    const dx = dc.getContext('2d');
    dx.fillStyle = '#05070b'; dx.fillRect(0, 0, 1024, 256);
    dx.font = `700 64px ${FONT.mono}`; dx.fillStyle = ['#25f4ee', '#fe2c55', '#ffb347'][i]; dx.textBaseline = 'middle';
    dx.fillText(`@${TL.accounts[i]}`, 40, 80);
    dx.font = `800 96px ${FONT.mono}`; dx.fillStyle = '#ffffff';
    dx.fillText(TL.postmarkIPs[i], 40, 178);
    const disp = signMesh(dc, 1.6, 0.4, { glow: 1.2, transparent: false });
    disp.position.set(X_PM - 0.255, 2.55, z);
    disp.rotation.y = -Math.PI / 2;
    g.add(disp);
    const tc = makeCanvas(1024, 256);
    const tx = tc.getContext('2d');
    tx.fillStyle = '#05070b'; roundRect(tx, 0, 0, 1024, 256, 28); tx.fill();
    tx.strokeStyle = ['#25f4ee', '#fe2c55', '#ffb347'][i]; tx.lineWidth = 8; roundRect(tx, 4, 4, 1016, 248, 26); tx.stroke();
    tx.font = `700 76px ${FONT.mono}`; tx.fillStyle = ['#25f4ee', '#fe2c55', '#ffb347'][i]; tx.textBaseline = 'middle';
    tx.fillText(`@${TL.accounts[i]}`, 50, 128);
    tx.font = `800 92px ${FONT.mono}`; tx.fillStyle = '#ffffff'; tx.textAlign = 'right';
    tx.fillText(TL.postmarkIPs[i], 980, 132);
    const top = signMesh(tc, 2.3, 0.575, { glow: 0.95, transparent: false });
    top.rotation.x = -Math.PI / 2 + 0.75;
    top.position.set(X_PM - 1.75, 0.62, z + 1.22);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 0.06), pmMat);
    foot.position.set(X_PM - 1.75, 0.3, z + 1.36);
    g.add(foot);
    g.add(top);
    disp.userData.top = top;
    top.userData.foot = foot;
    displays.push(disp);
    scene.add(g);
    // decal that rides on top of the parcel
    const dm = new THREE.Mesh(new THREE.PlaneGeometry(0.54, 0.54), new THREE.MeshBasicMaterial({ map: tex(postmarkCanvas(i)), transparent: true, depthWrite: false, color: new THREE.Color(0.9, 0.9, 0.9), toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    dm.rotation.x = -Math.PI / 2;
    dm.rotation.z = [0.25, -0.3, 0.12][i];
    parcels[i].add(dm);
    dm.position.set(0.05, PARCEL.h / 2 + 0.002, 0);
    decals.push(dm);
    const ink = new Burst(70, {
      color: LANE_COLORS[i].clone().multiplyScalar(3), size: 0.03, gravity: -6, seed: 90 + i,
      spawn: (k, r) => {
        const a = r() * Math.PI * 2, sp = 1.5 + r() * 3.5;
        return { p0: v3(0, 0, 0), v0: v3(Math.cos(a) * sp, 0.6 + r() * 2.2, Math.sin(a) * sp), life: 0.35 + r() * 0.5 };
      },
    });
    scene.add(ink.points);
    inks.push(ink);
  });

  // ---------------- tunnels
  const exitGlow = (() => {
    const c = makeCanvas(256, 256);
    const x = c.getContext('2d');
    const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(200,250,250,0.75)'); g.addColorStop(0.8, 'rgba(60,160,170,0.18)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    return tex(c, { srgb: false });
  })();
  const tunnels = LANE_Z.map((z, i) => {
    const g = new THREE.Group();
    const len = X_END - X_TUN;
    const tube = new THREE.Mesh(
      new THREE.CylinderGeometry(TUN_R, TUN_R, len, 48, 1, true),
      new THREE.MeshPhysicalMaterial({ color: LANE_COLORS[i].clone().lerp(new THREE.Color(1, 1, 1), 0.6), roughness: 0.05, metalness: 0, transparent: true, opacity: 0.05, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1.5, clearcoat: 1 }),
    );
    tube.rotation.z = Math.PI / 2;
    tube.position.set(X_TUN + len / 2, TUN_Y, z);
    g.add(tube);
    // ribs (instanced torus), lit by the fuse
    const n = Math.floor(len / 1.4);
    const ribs = new THREE.InstancedMesh(new THREE.TorusGeometry(TUN_R, 0.028, 8, 64), new THREE.MeshBasicMaterial({ toneMapped: false }), n);
    const m = new THREE.Matrix4();
    const xs = [];
    for (let k = 0; k < n; k++) {
      const x = X_TUN + 0.2 + k * 1.4;
      xs.push(x);
      m.makeRotationY(Math.PI / 2).setPosition(x, TUN_Y, z);
      ribs.setMatrixAt(k, m);
      ribs.setColorAt(k, LANE_COLORS[i]);
    }
    g.add(ribs);
    // mouth frame + sign
    const frame = new THREE.Mesh(new THREE.TorusGeometry(TUN_R + 0.1, 0.09, 16, 64), metal(0x2a2e36, 0.3, 0.9));
    frame.rotation.y = Math.PI / 2;
    frame.position.set(X_TUN, TUN_Y, z);
    g.add(frame);
    // exit glow
    const exit = new THREE.Mesh(new THREE.CircleGeometry(TUN_R, 48), new THREE.MeshBasicMaterial({ map: exitGlow, color: new THREE.Color(1.3, 1.6, 1.7), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    exit.rotation.y = -Math.PI / 2;
    exit.position.set(X_END, TUN_Y, z);
    g.add(exit);
    scene.add(g);
    return { g, ribs, xs, color: LANE_COLORS[i] };
  });

  // Gates inside alice's tunnel: the same IP at every checkpoint.
  const gateNames = ['LOGIN', 'SIGNING', 'UPLOAD'];
  const gates = C.rings.map((tt, k) => {
    const gx = xA(tt) + 0.5;
    const c = makeCanvas(1024, 192);
    const x = c.getContext('2d');
    x.fillStyle = 'rgba(4,8,12,0.88)'; roundRect(x, 4, 4, 1016, 184, 24); x.fill();
    x.strokeStyle = COLOR.cyan; x.lineWidth = 6; roundRect(x, 4, 4, 1016, 184, 24); x.stroke();
    x.font = `700 70px ${FONT.mono}`; x.textBaseline = 'middle'; x.fillStyle = '#8fa0b8';
    x.fillText(gateNames[k], 48, 98);
    x.textAlign = 'right'; x.fillStyle = '#ffffff'; x.font = `800 76px ${FONT.mono}`;
    x.fillText(TL.postmarkIPs[0], 980, 98);
    const sign = signMesh(c, 0.84, 0.16, { glow: 0.72 });
    sign.position.set(gx, TUN_Y + 0.16, LANE_Z[0] + 0.7);
    sign.rotation.y = -Math.PI / 2 - 0.85;
    scene.add(sign);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(TUN_R - 0.05, 0.05, 12, 64), new THREE.MeshBasicMaterial({ toneMapped: false, color: LANE_COLORS[0] }));
    ring.rotation.y = Math.PI / 2;
    ring.position.set(gx, TUN_Y, LANE_Z[0]);
    scene.add(ring);
    return { sign, ring, t: tt };
  });

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
  function cameraPose(t) {
    // Shot 1: the glass.
    const push = easeInOutCubic(clamp((t - 0.15) / 3.75));
    const p1 = {
      p: v3(lerp(0.05, -0.04, push) + fbm1(t * 0.3) * 0.02, lerp(MON.y + 0.02, MON.y - 0.03, push) + fbm1(t * 0.25 + 4) * 0.015, lerp(2.38, 1.98, push)),
      l: v3(lerp(0, -0.06, push), lerp(MON.y, MON.y - 0.06, push), 0), fov: 35, roll: lerp(-0.004, 0.012, push),
    };
    if (t < C.enter) return p1;
    // Shot 2: pull back through the depot (speed ramp), then swing low behind the parcel.
    const rev = { p: v3(-3.2, 3.4, 9.2), l: v3(0.8, 1.4, 1.5), fov: 38, roll: 0.02 };
    const kOut = easeOutExpo(clamp((t - C.enter) / 1.15));
    const pre = poseLerp(p1, rev, kOut);
    pre.p.x += Math.sin(kOut * Math.PI) * 0.8;
    const xa = xA(t);
    const track = { p: v3(xa - 3.0, 1.95, LANE_Z[0] + 1.45), l: v3(xa + 2.5, 0.95, LANE_Z[0] - 0.15), fov: 36, roll: 0.03 };
    if (t < C.craneUp) {
      const k = easeInOutCubic(clamp((t - 5.35) / 1.7));
      return poseLerp(pre, track, k);
    }
    // Shot 3: crane up to the postmark row, then look down the tunnels, then dive in.
    const high = { p: v3(X_PM + 0.5, 9.6, 10.4), l: v3(X_PM + 0.5, 0.9, 4.85), fov: 43, roll: 0 };
    high.p.y -= smooth(clamp((t - 9) / 1.5)) * 0.8;
    high.p.x += (t - 9) * 0.18;
    if (t < 10.0) {
      const k = easeInOutQuint(clamp((t - C.craneUp) / 1.05));
      const pz = poseLerp(track, high, k);
      pz.p.y += Math.sin(k * Math.PI) * 1.5;
      return pz;
    }
    const horizon = { p: v3(X_PM - 3.6, 4.4, -3.4), l: v3(X_PM + 24, 0.2, 4.2), fov: 40, roll: -0.04 };
    horizon.p.x += (t - 10) * 0.6;
    const follow = { p: v3(xa - 2.4, TUN_Y + 0.45, LANE_Z[0] - 0.12), l: v3(xa + 3.5, TUN_Y - 0.05, LANE_Z[0]), fov: 44, roll: 0 };
    if (t < C.tunnelDive) {
      const k = easeInOutQuint(clamp((t - 10.15) / 1.7));
      const pz = poseLerp(high, horizon, k);
      pz.p.y += Math.sin(k * Math.PI) * 2.5;
      return pz;
    }
    const k = easeInOutCubic(clamp((t - C.tunnelDive) / 1.05));
    const pz = poseLerp(horizon, follow, k);
    pz.roll = Math.sin(clamp((t - C.tunnelDive) / 1.05) * Math.PI) * 0.12 + (t > 13 ? Math.sin((t - 13) * 2.2) * 0.02 : 0);
    return pz;
  }

  // ---------------- update
  function update(t, fx, hud) {
    drawScreen(t);

    // Parcel A: hidden in the screen, then flight, then the belt.
    const pa = parcels[0];
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
    for (let i = 1; i < 3; i++) {
      const p = parcels[i];
      p.visible = t >= C.craneUp - 0.5;
      p.position.set(laneX(i, t), BELT_Y + PARCEL.h / 2, LANE_Z[i]);
      p.rotation.set(0, 0, 0);
      p.scale.set(1, 1, 1);
    }
    lanes.forEach((l, i) => l.setTravel(i === 0 ? xA(t) : laneX(i, t)));

    // Postmark heads + decals + ink.
    C.postmarks.forEach((pt, i) => {
      const down = t < pt ? easeInCubic(clamp((t - (pt - 0.09)) / 0.09)) : 1 - spring(t - pt, 2.6, 0.45);
      const restY = 2.05, hitY = BELT_Y + PARCEL.h + 0.07;
      heads[i].position.y = lerp(restY, hitY, clamp(down, -0.2, 1));
      heads[i].position.x = X_PM;
      const on = t >= pt;
      decals[i].visible = on;
      if (on) {
        const k = easeOutExpo(clamp((t - pt) / 0.18));
        decals[i].scale.setScalar(lerp(1.25, 1, k));
        decals[i].material.opacity = clamp((t - pt) / 0.04);
      }
      const age = t - pt;
      inks[i].points.visible = age >= 0 && age < 1.2;
      if (inks[i].points.visible) {
        inks[i].points.position.set(X_PM, BELT_Y + PARCEL.h + 0.02, LANE_Z[i]);
        inks[i].update(age);
      }
      const flash = hit(t, pt, 0.35);
      displays[i].material.color.setScalar(1.0 + flash * 2.5);
      displays[i].userData.top.material.color.setScalar(0.9 + flash * 1.6);
      laneLights[i].intensity = 5 + flash * 30;
    });

    // Belt LEDs: dim idle, shockwave from the landing, fuse into tunnels.
    lanes.forEach((l, i) => {
      l.light((x) => {
        let k = 0.18 + 0.08 * Math.sin(x * 2.2 - t * 9);
        if (i === 0 && t >= C.land) {
          const r = Math.abs(x - 1.0) - (t - C.land) * 14;
          k += Math.exp(-r * r * 0.8) * 3.0 * Math.exp(-(t - C.land) * 0.7);
        }
        if (t >= C.postmarks[i]) {
          const r2 = (x - X_PM) - (t - C.postmarks[i]) * 20;
          k += Math.exp(-r2 * r2 * 0.5) * 2.5 * (r2 > -40 ? 1 : 0);
          k += 0.5 * smooth(clamp((t - C.postmarks[i]) / 0.5));
        }
        return k;
      });
    });

    // Tunnel ribs: dark until the fuse runs mouth to horizon.
    tunnels.forEach((tn, i) => {
      const tf = C.fuse + i * 0.125;
      const col = new THREE.Color();
      tn.xs.forEach((x, k) => {
        const at = tf + (x - X_TUN) / 32;
        let v = 0.06;
        if (t >= at) v = 0.9 + 5 * Math.exp(-(t - at) / 0.18);
        // passing-parcel glow inside alice's tunnel
        if (i === 0 && t > C.tunnelDive) {
          const inside = smooth(clamp((t - C.tunnelDive - 0.4) / 0.6));
          v = lerp(v, 0.35, inside) + 0.9 * Math.exp(-Math.abs(x - xA(t) - 1.0) * 0.8) * inside;
        }
        col.copy(tn.color).multiplyScalar(v);
        tn.ribs.setColorAt(k, col);
      });
      tn.ribs.instanceColor.needsUpdate = true;
    });
    gates.forEach((g) => {
      const f = hit(t, g.t, 0.3);
      g.sign.material.color.setScalar(0.72 + f * 1.0);
      g.ring.material.color.copy(LANE_COLORS[0]).multiplyScalar(0.5 + f * 2.5);
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

    // Screen light flare at the punch-out.
    screenLight.intensity = 2 + hit(t, C.enter, 0.35) * 12;
    screenMat.color.setScalar(t < C.enter ? 0.8 : 0.8 - 0.3 * smooth(clamp(age / 1.5)));

    // The overhead signs only exist for the overhead shot.
    displays.forEach((d) => { d.userData.top.visible = t > 8.3 && t < 12.5; d.userData.top.userData.foot.visible = t > 8.3 && t < 12.5; });

    // Cull lights that contribute nothing to this stretch of the shot.
    screenLight.visible = t < 8.5;
    fillCyan.visible = t < 9.5;
    fillMag.visible = t < 10.5;
    laneLights.forEach((l) => { l.visible = t > 7.5 && t < 12.6; });

    // Shadow camera follows the action.
    const focusX = t < 9 ? Math.max(0, xA(t)) : t < 12 ? X_PM + 2 : xA(t);
    key.position.set(focusX - 4, 14, -6);
    key.target.position.set(focusX + 1, 0, 4);

    // Camera
    const pose = cameraPose(t);
    camera.position.copy(pose.p);
    camera.up.set(Math.sin(pose.roll), Math.cos(pose.roll), 0);
    camera.lookAt(pose.l);
    camera.fov = pose.fov;
    camera.updateProjectionMatrix();

    // Lens + post
    fx.bloom = { strength: 0.75, radius: 0.5, threshold: 0.82 };
    fx.ca = 1.0 + hit(t, C.enter, 0.3) * 9 + hits(t, C.postmarks, 0.2) * 6 + hit(t, C.land, 0.2) * 5;
    fx.shake = hit(t, C.enter, 0.3) * 1.6 + hit(t, C.land, 0.25) * 1.2 + hits(t, C.postmarks, 0.18) * 0.7;
    fx.zoom = t >= C.enter ? hit(t, C.enter + 0.05, 0.22) * 0.06 : 0;
    if (t < C.enter) {
      fx.dof = null;
      fx.vignette = 0.75;
    } else if (t < C.craneUp) {
      fx.dof = { focus: camera.position.distanceTo(pa.position), aperture: 0.09, maxBlur: 12 };
    } else if (t < C.tunnelDive) {
      fx.dof = { focus: camera.position.distanceTo(v3(X_PM, 1.2, 3.5)), aperture: 0.06, maxBlur: 10 };
    } else {
      // rack focus to whichever gate sign is coming up, else the parcel
      let focus = camera.position.distanceTo(pa.position);
      for (const g of gates) {
        const d = g.sign.position.x - camera.position.x;
        if (d > 0.5 && d < 7) { focus = lerp(focus, camera.position.distanceTo(g.sign.position), smooth(clamp((7 - d) / 2.5))); break; }
      }
      fx.dof = { focus, aperture: 0.08, maxBlur: 10 };
      fx.bloom = { strength: 0.45, radius: 0.4, threshold: 0.9 };
    }
    // whip into the dive
    const dive = clamp((t - C.tunnelDive) / 1.05);
    if (dive > 0 && dive < 1) fx.zoom = Math.sin(dive * Math.PI) * 0.05;
    if (t > 13) fx.zoom = 0.012;
    // exit flare into the bay
    const ex = smooth(clamp((t - 15.5) / 0.5));
    fx.exposure = 1.0 + ex * 0.25;
    if (t > 15.5) fx.zoom = 0.012 + easeInCubic(clamp((t - 15.5) / 0.5)) * 0.07;

    hud.header('One account. One IP.', t, C.header_proxy, 15.55);
    return camera;
  }

  return { start: -10, scene, update };
}
