// Shot 5: the publish request (an envelope) enters a glass booth. The door
// seals, the network cable is yanked out (the signing browser never touches
// the network), and two stamps land: _signature and X-Bogus.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { clamp, lerp, smooth, easeOutExpo, easeInOutCubic, easeOutCubic, easeInCubic, easeInOutQuint, spring, hit, hits, fbm1, rng, camPath } from '../engine/util.js';
import { makeCanvas, tex, FONT, COLOR, roundRect } from '../engine/canvas.js';
import { LANE_COLORS, makeConveyor, makeFloor, makeRacks, makeCeiling, makeShaft, floorLine, metal, Burst, v3 } from '../engine/props.js';

const B = { w: 2.3, h: 2.5, d: 2.0 };
const TABLE_Y = 0.92;
const ENV = { w: 0.66, h: 0.016, d: 0.44 };

function envelopeCanvas(TL) {
  const W = 1024, H = Math.round(1024 * ENV.d / ENV.w);
  const c = makeCanvas(W, H);
  const x = c.getContext('2d');
  x.fillStyle = '#f6f3ec'; x.fillRect(0, 0, W, H);
  // airmail border
  const bw = 26;
  x.save();
  x.beginPath(); x.rect(0, 0, W, H); x.rect(bw, bw, W - bw * 2, H - bw * 2); x.clip('evenodd');
  for (let i = -H; i < W + H; i += 60) {
    x.fillStyle = (Math.floor(i / 60) % 2) ? COLOR.cyan : COLOR.magenta;
    x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 30, 0); x.lineTo(i + 30 - H, H); x.lineTo(i - H, H); x.closePath(); x.fill();
  }
  x.restore();
  x.fillStyle = '#111'; x.font = `800 92px ${FONT.mono}`; x.textBaseline = 'alphabetic';
  x.fillText('POST', 70, 150);
  x.font = `500 30px ${FONT.mono}`; x.fillStyle = '#555';
  x.fillText('/tiktok/web/project/post/v1/', 72, 200);
  x.font = `600 58px ${FONT.ui}`; x.fillStyle = '#111';
  x.fillText('Hello #fyp', 72, 330);
  x.font = `700 40px ${FONT.mono}`; x.fillStyle = '#0a8f8a';
  x.fillText('clip.mp4  ·  @alice', 72, 400);
  // stamp boxes (empty until signed)
  x.strokeStyle = 'rgba(0,0,0,0.18)'; x.setLineDash([10, 8]); x.lineWidth = 3;
  roundRect(x, 640, 70, 320, 170, 14); x.stroke();
  roundRect(x, 640, 270, 320, 170, 14); x.stroke();
  x.setLineDash([]);
  return c;
}

function stampCanvas(name, value, color, seed) {
  const W = 640, H = 340;
  const c = makeCanvas(W, H);
  const x = c.getContext('2d');
  x.strokeStyle = color; x.fillStyle = color;
  x.lineWidth = 12; roundRect(x, 10, 10, W - 20, H - 20, 26); x.stroke();
  x.lineWidth = 4; roundRect(x, 30, 30, W - 60, H - 60, 16); x.stroke();
  x.font = `800 88px ${FONT.mono}`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(name, W / 2, 140);
  x.font = `600 34px ${FONT.mono}`;
  x.fillText(value, W / 2, 238);
  x.globalCompositeOperation = 'destination-out';
  const r = rng(seed);
  for (let k = 0; k < 1400; k++) { x.globalAlpha = r() * 0.7; x.beginPath(); x.arc(r() * W, r() * H, r() * 3, 0, 7); x.fill(); }
  return c;
}

function obfuscated(seed, lines) {
  const r = rng(seed);
  const id = () => '_0x' + Math.floor(r() * 0xffff).toString(16).padStart(4, '0');
  const out = [];
  for (let i = 0; i < lines; i++) {
    const kind = Math.floor(r() * 5);
    if (kind === 0) out.push(`function ${id()}(${id()},${id()}){var ${id()}=${id()}();`);
    else if (kind === 1) out.push(`  ${id()}[${id()}(0x${Math.floor(r() * 999).toString(16)})](${id()},${id()}>>>0x${Math.floor(r() * 32).toString(16)});`);
    else if (kind === 2) out.push(`  return ${id()}^${id()}&0x${Math.floor(r() * 0xffffff).toString(16)};}`);
    else if (kind === 3) out.push(`  ${id()}=${id()}['charCodeAt'](${id()}%0x${Math.floor(r() * 64).toString(16)});`);
    else out.push(`  for(var ${id()}=0x0;${id()}<${id()}['length'];${id()}++){`);
  }
  return out;
}

export default function createBooth(ctx) {
  const { TL } = ctx;
  const C = TL.cues;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07080d);
  scene.fog = new THREE.FogExp2(0x07080d, 0.06);
  scene.environment = ctx.envTex;
  scene.environmentIntensity = 0.25;
  const camera = new THREE.PerspectiveCamera(34, ctx.aspect, 0.05, 100);

  const hemi = new THREE.HemisphereLight(0x3a4a6a, 0x050608, 0.55);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xe8eeff, 1.5);
  key.position.set(-4, 9, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 0.5, far: 30 });
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  scene.add(key);
  const inner = new THREE.PointLight(0xdfe9ff, 1.4, 4, 1.4);
  inner.position.set(0, B.h - 0.3, 0.2);
  scene.add(inner);
  const rimC = new THREE.PointLight(LANE_COLORS[0], 10, 9, 1.4);
  rimC.position.set(-3, 2.4, -2);
  scene.add(rimC);
  const rimM = new THREE.PointLight(LANE_COLORS[1], 10, 9, 1.4);
  rimM.position.set(3.2, 2.0, -1.5);
  scene.add(rimM);

  scene.add(makeFloor(260, 0x70767f));
  scene.add(makeRacks({ x0: -22, x1: 22, z: -7, seed: 21 }));
  scene.add(makeCeiling({ x0: -22, x1: 22, zs: [-1.5, 5], y: 7.5, spacing: 5.5 }));
  { const s = makeShaft(0.5, 2.4, 7.4, 0xbcd0ff, 0.05); s.position.set(0, 3.75, -1.5); scene.add(s); }
  scene.add(floorLine(-22, 22, 1.4, 0.08));
  scene.add(floorLine(-22, 22, -1.4, 0.08));

  // ---------------- booth
  const booth = new THREE.Group();
  const frameMat = metal(0x1e2128, 0.3, 0.9);
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xbfe6ff, roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.6 });
  const plinth = new THREE.Mesh(new RoundedBoxGeometry(B.w + 0.3, 0.12, B.d + 0.3, 2, 0.03), frameMat);
  plinth.position.y = 0.06;
  plinth.receiveShadow = true;
  booth.add(plinth);
  const edge = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), frameMat); m.position.set(x, y, z); m.castShadow = true; booth.add(m); };
  const hw = B.w / 2, hd = B.d / 2;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) edge(0.07, B.h, 0.07, sx * hw, B.h / 2 + 0.12, sz * hd);
  for (const sz of [-1, 1]) { edge(B.w, 0.07, 0.07, 0, B.h + 0.12, sz * hd); }
  for (const sx of [-1, 1]) { edge(0.07, 0.07, B.d, sx * hw, B.h + 0.12, 0); }
  const pane = (w, h, x, y, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glassMat); m.position.set(x, y, z); m.rotation.y = ry; booth.add(m); return m; };
  pane(B.w, B.h, 0, B.h / 2 + 0.12, hd, 0);
  pane(B.w, B.h, 0, B.h / 2 + 0.12, -hd, 0);
  const roof = pane(B.w, B.d, 0, B.h + 0.12, 0, 0); roof.rotation.x = -Math.PI / 2;
  // side walls with door openings: upper glass + sliding doors
  const doors = [-1, 1].map((sx) => {
    pane(B.d, B.h - 1.35, sx * hw, B.h - (B.h - 1.35) / 2 + 0.12, 0, Math.PI / 2);
    pane(B.d * 0.3, 1.35, sx * hw, 0.12 + 1.35 / 2, -hd + B.d * 0.15, Math.PI / 2);
    pane(B.d * 0.3, 1.35, sx * hw, 0.12 + 1.35 / 2, hd - B.d * 0.15, Math.PI / 2);
    const door = new THREE.Mesh(new RoundedBoxGeometry(0.04, 1.3, B.d * 0.42, 2, 0.015), new THREE.MeshStandardMaterial({ color: 0x2a3340, roughness: 0.25, metalness: 0.8 }));
    door.position.set(sx * (hw + 0.04), 0.12 + 0.65, 0);
    door.castShadow = true;
    booth.add(door);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.01, 1.2, 0.02), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 3, 3), toneMapped: false }));
    strip.position.set(sx * 0.025, 0, B.d * 0.2);
    door.add(strip);
    door.userData.strip = strip;
    return door;
  });
  // fascia sign
  {
    const c = makeCanvas(2048, 160);
    const x = c.getContext('2d');
    x.fillStyle = '#0a0d12'; x.fillRect(0, 0, 2048, 160);
    x.font = `700 92px ${FONT.mono}`; x.fillStyle = '#d8e2f0'; x.textAlign = 'center'; x.textBaseline = 'middle';
    if ('letterSpacing' in x) x.letterSpacing = '18px';
    x.fillText('HEADLESS CHROMIUM', 1024, 84);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(B.w, B.w * 160 / 2048), new THREE.MeshBasicMaterial({ map: tex(c), toneMapped: false, color: new THREE.Color(0.9, 0.9, 0.9) }));
    m.position.set(0, B.h + 0.3, hd + 0.04);
    booth.add(m);
    const back = new THREE.Mesh(new THREE.BoxGeometry(B.w + 0.08, B.w * 160 / 2048 + 0.04, 0.06), frameMat);
    back.position.set(0, B.h + 0.3, hd);
    booth.add(back);
  }
  // table
  const table = new THREE.Mesh(new RoundedBoxGeometry(1.1, 0.06, 0.8, 2, 0.02), metal(0x5a606a, 0.25, 0.9));
  table.position.set(0, TABLE_Y - 0.03, 0);
  table.receiveShadow = table.castShadow = true;
  booth.add(table);
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, TABLE_Y - 0.12, 16), frameMat);
  leg.position.set(0, (TABLE_Y - 0.12) / 2 + 0.12, 0);
  booth.add(leg);
  scene.add(booth);

  // browser panel on the back glass
  const BW = 1600, BH = 1000;
  const bc = makeCanvas(BW, BH);
  const bx = bc.getContext('2d');
  const btex = tex(bc);
  const code = obfuscated(9, 60);
  function drawBrowser(t) {
    bx.clearRect(0, 0, BW, BH);
    bx.fillStyle = '#0b0f16'; roundRect(bx, 0, 0, BW, BH, 30); bx.fill();
    bx.fillStyle = '#161c27'; bx.fillRect(0, 0, BW, 150);
    [['#ff5f57', 50], ['#febc2e', 95], ['#28c840', 140]].forEach(([c, cx]) => { bx.fillStyle = c; bx.beginPath(); bx.arc(cx, 45, 14, 0, 7); bx.fill(); });
    bx.fillStyle = '#0b0f16'; roundRect(bx, 40, 80, BW - 80, 54, 27); bx.fill();
    bx.font = `500 30px ${FONT.mono}`; bx.fillStyle = '#9aa6bb'; bx.textBaseline = 'middle';
    bx.fillText('https://www.tiktok.com/api/v1/web/project/post/', 80, 108);
    const sealed = t >= C.cableYank;
    bx.fillStyle = sealed ? '#ff4d6d' : '#3dff9a';
    bx.beginPath(); bx.arc(BW - 80, 108, 10, 0, 7); bx.fill();
    bx.font = `600 22px ${FONT.mono}`; bx.textAlign = 'right';
    bx.fillText(sealed ? 'NETWORK: BLOCKED' : 'NETWORK', BW - 100, 108);
    bx.textAlign = 'left';
    // scrolling obfuscated signer code
    bx.save();
    bx.beginPath(); bx.rect(0, 160, BW, BH - 170); bx.clip();
    const speed = t < C.stamps[0] - 0.4 ? 60 : 220;
    const off = ((t - 24) * speed) % (code.length * 40);
    bx.font = `500 28px ${FONT.mono}`;
    for (let i = 0; i < 28; i++) {
      const li = Math.floor((off / 40) + i) % code.length;
      const y = 200 + i * 40 - (off % 40);
      bx.fillStyle = i % 7 === 3 ? '#25f4ee' : i % 5 === 1 ? '#fe7a95' : '#5d6b82';
      bx.fillText(code[li], 50, y);
    }
    bx.restore();
    // signature readout on stamps
    const sig = [['_signature', COLOR.cyan, C.stamps[0]], ['X-Bogus', COLOR.magenta, C.stamps[1]]];
    sig.forEach(([n, col, ts], k) => {
      const kk = easeOutExpo(clamp((t - ts) / 0.3));
      if (kk <= 0) return;
      bx.globalAlpha = kk;
      bx.fillStyle = 'rgba(5,8,12,0.92)'; roundRect(bx, 560, 600 + k * 150, 620, 120, 18); bx.fill();
      bx.strokeStyle = col; bx.lineWidth = 4; roundRect(bx, 560, 600 + k * 150, 620, 120, 18); bx.stroke();
      bx.fillStyle = col; bx.font = `800 52px ${FONT.mono}`;
      bx.fillText(`${n}  ✓`, 600, 660 + k * 150);
      bx.globalAlpha = 1;
    });
    btex.needsUpdate = true;
  }
  const browser = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.0), new THREE.MeshBasicMaterial({ map: btex, transparent: true, toneMapped: false, color: new THREE.Color(0.85, 0.85, 0.85) }));
  browser.position.set(0.0, 1.74, -hd + 0.06);
  browser.scale.setScalar(0.84);
  scene.add(browser);

  // ---------------- envelope + stamps
  const envMat = [
    new THREE.MeshStandardMaterial({ color: 0xeeeae2, roughness: 0.7 }),
    new THREE.MeshStandardMaterial({ color: 0xeeeae2, roughness: 0.7 }),
    new THREE.MeshStandardMaterial({ map: tex(envelopeCanvas(TL)), roughness: 0.65, color: 0xc8c8c8 }),
    new THREE.MeshStandardMaterial({ color: 0xe2ddd2, roughness: 0.7 }),
    new THREE.MeshStandardMaterial({ color: 0xeeeae2, roughness: 0.7 }),
    new THREE.MeshStandardMaterial({ color: 0xeeeae2, roughness: 0.7 }),
  ];
  const envelope = new THREE.Mesh(new THREE.BoxGeometry(ENV.w, ENV.h, ENV.d), envMat);
  envelope.castShadow = envelope.receiveShadow = true;
  scene.add(envelope);
  const stampDefs = [
    { name: '_signature', value: '_02B4Z6wo00f01…', color: '#06a19c', at: C.stamps[0], u: 0.78, v: 0.32 },
    { name: 'X-Bogus', value: 'DFSzswVOxkUANH…', color: '#d40f3c', at: C.stamps[1], u: 0.78, v: 0.77 },
  ];
  const decals = stampDefs.map((d, i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.106), new THREE.MeshBasicMaterial({ map: tex(stampCanvas(d.name, d.value, d.color, 50 + i)), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = [0.06, -0.08][i];
    m.position.set((d.u - 0.5) * ENV.w, ENV.h / 2 + 0.001, (d.v - 0.5) * ENV.d);
    envelope.add(m);
    return m;
  });
  const arms = stampDefs.map((d, i) => {
    const g = new THREE.Group();
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 16), metal(0xb8bcc4, 0.2, 1));
    rod.position.y = 0.7 + 0.12;
    g.add(rod);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.16, 24), new THREE.MeshStandardMaterial({ color: i ? 0x8a1b2e : 0x0f6e6b, roughness: 0.4, metalness: 0.3 }));
    handle.position.y = 0.12;
    g.add(handle);
    const block = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.07, 0.13, 2, 0.015), new THREE.MeshStandardMaterial({ color: 0x3a2a1f, roughness: 0.6 }));
    block.position.y = 0.035;
    g.add(block);
    const rubber = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.012, 0.11), new THREE.MeshBasicMaterial({ color: new THREE.Color(d.color).multiplyScalar(1.6), toneMapped: false }));
    rubber.position.y = 0.0;
    g.add(rubber);
    g.traverse((o) => { o.castShadow = true; });
    scene.add(g);
    return g;
  });
  const inks = stampDefs.map((d, i) => {
    const b = new Burst(60, {
      color: new THREE.Color(d.color).multiplyScalar(3), size: 0.02, gravity: -7, seed: 300 + i,
      spawn: (k, r) => { const a = r() * Math.PI * 2, sp = 0.6 + r() * 1.8; return { p0: v3(0, 0, 0), v0: v3(Math.cos(a) * sp, 0.5 + r() * 1.5, Math.sin(a) * sp), life: 0.3 + r() * 0.4 }; },
    });
    scene.add(b.points);
    return b;
  });

  // ---------------- network port + cable (verlet, re-simulated from 23.5 each frame)
  const PORT = v3(hw + 0.05, 0.62, -0.74);
  const JBOX = v3(hw + 1.55, 0.0, -1.35);
  const port = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.16, 0.14, 2, 0.02), metal(0x2a2e36, 0.3, 0.9));
  port.position.copy(PORT).add(v3(-0.04, 0, 0));
  scene.add(port);
  const portLed = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 8), new THREE.MeshBasicMaterial({ toneMapped: false, color: new THREE.Color(0.3, 4, 1.5) }));
  portLed.position.copy(PORT).add(v3(0.02, 0.06, 0.05));
  scene.add(portLed);
  {
    const c = makeCanvas(512, 160);
    const x = c.getContext('2d');
    x.fillStyle = '#0c0f14'; roundRect(x, 0, 0, 512, 160, 16); x.fill();
    x.font = `700 70px ${FONT.mono}`; x.fillStyle = '#d8e2f0'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('NETWORK', 256, 84);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.094), new THREE.MeshBasicMaterial({ map: tex(c), toneMapped: false, color: new THREE.Color(0.85, 0.85, 0.85) }));
    m.position.copy(PORT).add(v3(0.004, -0.15, 0));
    m.rotation.y = Math.PI / 2;
    scene.add(m);
  }
  const jbox = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.18, 0.3, 2, 0.03), metal(0x2a2e36, 0.4, 0.8));
  jbox.position.copy(JBOX).add(v3(0, 0.09, 0));
  scene.add(jbox);
  const N = 26, LEN = 2.25, SEG = LEN / (N - 1);
  const cableMat = new THREE.MeshStandardMaterial({ color: 0x1fb8ff, roughness: 0.45, metalness: 0.1, emissive: 0x062030 });
  let cableMesh = new THREE.Mesh(new THREE.BufferGeometry(), cableMat);
  cableMesh.castShadow = true;
  scene.add(cableMesh);
  const plug = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.06, 0.06, 2, 0.01), new THREE.MeshStandardMaterial({ color: 0xd8dde5, roughness: 0.3, metalness: 0.2 }));
  plug.castShadow = true;
  scene.add(plug);
  const sparks = new Burst(140, {
    color: new THREE.Color(4, 3, 1.6), size: 0.014, gravity: -9.8, seed: 77,
    spawn: (k, r) => { const a = r() * Math.PI * 2, sp = 1 + r() * 4; return { p0: PORT.clone(), v0: v3(1.5 + Math.abs(Math.cos(a)) * sp, Math.sin(a) * sp * 0.7 + 1.2, (r() - 0.5) * sp), life: 0.25 + r() * 0.6, floor: 0.01 }; },
  });
  scene.add(sparks.points);

  function simulate(t) {
    const pts = [], prev = [];
    for (let i = 0; i < N; i++) {
      const k = i / (N - 1);
      const p = JBOX.clone().lerp(PORT, k);
      p.y = lerp(JBOX.y + 0.18, PORT.y, k) - Math.sin(k * Math.PI) * 0.35;
      pts.push(p); prev.push(p.clone());
    }
    const dt = 1 / 240;
    const t0 = 23.5;
    const steps = Math.max(0, Math.floor((t - t0) / dt));
    const g = -9.8 * dt * dt;
    let released = false;
    for (let s = 0; s < steps; s++) {
      const time = t0 + s * dt;
      if (!released && time >= C.cableYank) {
        released = true;
        // yank: the plug end leaves with velocity out and up
        prev[N - 1].copy(pts[N - 1]).sub(v3(4.2 * dt, 3.6 * dt, -1.2 * dt));
        for (let i = N - 6; i < N - 1; i++) prev[i].copy(pts[i]).sub(v3(2.0 * dt * (i - N + 7) / 6, 1.5 * dt * (i - N + 7) / 6, 0));
      }
      for (let i = 1; i < N; i++) {
        const p = pts[i], q = prev[i];
        const vx = (p.x - q.x) * 0.992, vy = (p.y - q.y) * 0.992, vz = (p.z - q.z) * 0.992;
        q.copy(p);
        p.x += vx; p.y += vy + g; p.z += vz;
      }
      for (let it = 0; it < 10; it++) {
        pts[0].set(JBOX.x, JBOX.y + 0.18, JBOX.z);
        if (!released) { pts[N - 1].copy(PORT); pts[N - 2].copy(PORT).add(v3(SEG * 0.9, -0.02, 0)); }
        for (let i = 0; i < N - 1; i++) {
          const a = pts[i], b = pts[i + 1];
          const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
          const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
          const diff = (d - SEG) / d * 0.5;
          const wa = i === 0 ? 0 : 1, wb = (i + 1 === N - 1 && !released) ? 0 : 1;
          const sum = wa + wb || 1;
          a.x += dx * diff * 2 * wa / sum; a.y += dy * diff * 2 * wa / sum; a.z += dz * diff * 2 * wa / sum;
          b.x -= dx * diff * 2 * wb / sum; b.y -= dy * diff * 2 * wb / sum; b.z -= dz * diff * 2 * wb / sum;
        }
        for (let i = 1; i < N; i++) if (pts[i].y < 0.025) { pts[i].y = 0.025; prev[i].x = lerp(prev[i].x, pts[i].x, 0.3); prev[i].z = lerp(prev[i].z, pts[i].z, 0.3); }
      }
    }
    return pts;
  }

  // ---------------- motion
  const T0 = C.booth;
  function envX(t) {
    if (t < C.doorClose) return lerp(-3.2, 0, easeOutCubic(clamp((t - T0) / (C.doorClose - T0 - 0.05))));
    if (t < C.doorOpen + 0.15) return 0;
    return 4.2 * easeInCubic(clamp((t - C.doorOpen - 0.15) / 1.6)) + 1.6 * clamp(t - C.doorOpen - 1.75, 0, 9);
  }
  const inBelt = makeConveyor(-9, -hw - 0.05, 0, LANE_COLORS[0], { width: 0.7 });
  const outBelt = makeConveyor(hw + 0.05, 9, 0, LANE_COLORS[0], { width: 0.7 });
  scene.add(inBelt.group, outBelt.group);
  inBelt.group.position.y = TABLE_Y - 0.9;
  outBelt.group.position.y = TABLE_Y - 0.9;

  function update(t, fx, hud) {
    const ex = envX(t);
    envelope.position.set(ex, TABLE_Y + ENV.h / 2 + 0.002, 0);
    envelope.rotation.set(0, 0, 0);
    inBelt.setTravel(ex * 1.0 + t);
    outBelt.setTravel(t);
    const sealed = t >= C.doorClose && t < C.doorOpen;
    inBelt.light((x) => 0.25 + 0.15 * Math.sin(x * 3 - t * 9));
    outBelt.light((x) => 0.25 + 0.15 * Math.sin(x * 3 - t * 9) + (t > C.doorOpen ? 1.2 * Math.exp(-Math.pow(x - (hw + 0.05) - (t - C.doorOpen) * 6, 2)) : 0));

    // doors: left closes behind the envelope at doorClose; both open at doorOpen
    doors.forEach((d, i) => {
      const closeK = easeInCubic(clamp((t - (C.doorClose - 0.2)) / 0.2));
      const openK = easeOutCubic(clamp((t - C.doorOpen) / 0.35));
      const shut = clamp(closeK - openK);
      const bounce = t >= C.doorClose && t < C.doorOpen ? (1 - spring(t - C.doorClose, 5, 0.3)) * 0.04 : 0;
      d.position.z = (t < C.doorOpen ? lerp(B.d * 0.32, 0, shut) : lerp(0, -B.d * 0.32, openK)) + bounce;
      d.userData.strip.material.color.setRGB(sealed ? 3 : 0.2, sealed ? 0.6 : 3, sealed ? 0.5 : 3);
    });

    // stamps
    stampDefs.forEach((d, i) => {
      const a = arms[i];
      const tx = ex + (d.u - 0.5) * ENV.w, tz = (d.v - 0.5) * ENV.d;
      const down = t < d.at ? easeInCubic(clamp((t - (d.at - 0.12)) / 0.12)) : 1 - spring(t - d.at, 2.2, 0.5) * 1.0;
      const restY = B.h - 0.55, hitY = TABLE_Y + ENV.h + 0.004;
      a.position.set(tx, lerp(restY, hitY, clamp(down, -0.2, 1)), tz);
      a.rotation.y = [0.06, -0.08][i];
      a.visible = t < C.doorOpen + 0.2;
      const on = t >= d.at;
      decals[i].visible = on;
      if (on) decals[i].scale.setScalar(lerp(1.15, 1, easeOutExpo(clamp((t - d.at) / 0.15))));
      const age = t - d.at;
      inks[i].points.visible = age >= 0 && age < 0.8;
      if (inks[i].points.visible) { inks[i].points.position.set(tx, TABLE_Y + 0.03, tz); inks[i].update(age); }
    });

    // cable
    const pts = simulate(t);
    cableMesh.geometry.dispose();
    cableMesh.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.022, 8, false);
    const a = pts[N - 1], b = pts[N - 2];
    plug.position.copy(a);
    plug.lookAt(a.clone().add(a.clone().sub(b)));
    plug.rotateY(Math.PI / 2);
    const yanked = t >= C.cableYank;
    portLed.material.color.setRGB(yanked ? 4 : 0.3, yanked ? 0.3 : 4, yanked ? 0.5 : 1.5);
    const sa = t - C.cableYank;
    sparks.points.visible = sa >= 0 && sa < 1.0;
    if (sparks.points.visible) sparks.update(sa);

    drawBrowser(t);

    // sealed: the outside world dims, the booth glows
    const seal = smooth(clamp((t - C.cableYank) / 0.4)) * (1 - smooth(clamp((t - C.doorOpen) / 0.5)));
    hemi.intensity = lerp(0.55, 0.15, seal);
    key.intensity = lerp(1.5, 0.5, seal);
    rimC.intensity = lerp(10, 3, seal);
    rimM.intensity = lerp(10, 3, seal) * (1 - smooth(clamp((t - C.doorOpen) / 0.6)));
    inner.intensity = 1.4 + seal * 1.2 + hits(t, C.stamps, 0.2) * 4;
    inner.color.setRGB(1, lerp(1, 0.86, seal), lerp(1, 0.7, seal));

    // camera
    const orbit = (ang, r, h) => v3(Math.sin(ang) * r, h, Math.cos(ang) * r);
    let p, l = v3(ex * 0.6, 1.25, 0), fov = 34;
    if (t < 26.5) {
      const k = smooth(clamp((t - T0) / 2.5));
      p = orbit(lerp(0.78, 0.42, k), lerp(6.6, 5.9, k), lerp(2.3, 2.0, k));
      l = v3(lerp(-0.3, 0.35, k), 1.15, -0.1);
    } else if (t < C.doorOpen) {
      const k = easeInOutCubic(clamp((t - 26.5) / 0.6));
      const pa = orbit(0.42, 5.9, 2.0);
      // low over the front of the table: envelope in the foreground, the
      // browser on the back glass behind it
      const o = smooth(clamp((t - 26.5) / 2.5));
      const close = orbit(lerp(0.38, -0.02, o), 1.35, 1.38);
      p = pa.lerp(close, k);
      l = v3(lerp(0.35, -0.6, k), lerp(1.15, 1.27, k), lerp(-0.1, -0.35, k));
      fov = lerp(34, 39, k);
    } else {
      // out through the exit slot: a low 3/4 on the door, panning with the envelope
      // a low camera beside the out-belt, looking back at the exit slot: the
      // signed envelope slides out, rushes past the lens, and we whip after it
      const close = orbit(-0.02, 1.35, 1.38);
      const cp = camPath(t, [
        { t: C.doorOpen, p: close.toArray(), l: [0, 0, 0] },
        { t: C.doorOpen + 0.45, p: [1.5, 1.6, 2.35], l: [0, 0, 0] },
        { t: C.doorOpen + 0.9, p: [3.35, 1.42, 1.0], l: [0, 0, 0] },
        { t: C.doorOpen + 3, p: [3.35, 1.42, 1.0], l: [0, 0, 0] },
      ]);
      const k = easeInOutCubic(clamp((t - C.doorOpen) / 0.8));
      p = v3(...cp.p);
      l = v3(lerp(-0.6, Math.max(hw - 0.15, ex), k), lerp(1.27, 0.95, k), lerp(-0.35, 0, k));
      fov = lerp(39, 38, k);
    }
    // insert: close on the port as the plug rips out
    const insert = t >= C.cableYank - 0.14 && t < C.cableYank + 0.46;
    if (insert) {
      const k = (t - (C.cableYank - 0.14)) / 0.6;
      p = PORT.clone().add(v3(lerp(0.98, 0.84, k), lerp(0.24, 0.28, k), lerp(-0.62, -0.52, k)));
      l = PORT.clone().add(v3(0.3, -0.06, 0.12));
      fov = 34;
    }
    p.x += fbm1(t * 0.5) * 0.03; p.y += fbm1(t * 0.4 + 3) * 0.02;
    camera.position.copy(p);
    camera.up.set(0, 1, 0);
    camera.lookAt(l);
    // whip out to the board
    const wk = clamp((t - C.whipToBoard) / 0.5);
    if (wk > 0) camera.rotateY(-easeInCubic(wk) * 0.9);
    camera.fov = fov;
    camera.updateProjectionMatrix();

    fx.bloom = { strength: 0.7, radius: 0.45, threshold: 0.85 };
    let focusD = insert ? camera.position.distanceTo(PORT) : camera.position.distanceTo(envelope.position);
    if (t > 26.6 && t < C.doorOpen) {
      const dE = camera.position.distanceTo(envelope.position), dB = camera.position.distanceTo(browser.position);
      let w = 0;
      for (const ts of C.stamps) w = Math.max(w, smooth(clamp((t - ts - 0.25) / 0.3)) * (1 - smooth(clamp((t - ts - 0.8) / 0.15))));
      focusD = lerp(dE, dB, w);
    }
    fx.dof = { focus: focusD, aperture: insert ? 0.16 : t > 26.4 && t < C.doorOpen + 0.5 ? 0.13 : 0.07, maxBlur: 12 };
    fx.ca = 1 + hits(t, C.stamps, 0.2) * 10 + hit(t, C.cableYank, 0.25) * 8 + hit(t, C.doorClose, 0.2) * 3;
    fx.shake = hits(t, C.stamps, 0.2) * 1.2 + hit(t, C.cableYank, 0.3) * 0.9 + hit(t, C.doorClose, 0.15) * 0.5;
    fx.vignette = 0.55 + seal * 0.3;
    fx.sat = 1 - seal * 0.15;
    // whip in from the bay, whip out to the board
    const win = 1 - clamp((t - T0) / 0.3);
    if (win > 0) fx.blur = [easeOutCubic(win) * 0.1, 0];
    if (wk > 0) fx.blur = [easeInCubic(wk) * 0.14, 0];
    hud.header('Signed offline, in a browser.', t, C.header_sign, C.doorOpen + 0.6);
    return camera;
  }
  return { start: C.booth, scene, update };
}
