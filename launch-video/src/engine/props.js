import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { makeCanvas, tex, noiseCanvas, FONT, COLOR, drawBarcode, roundRect } from './canvas.js';
import { rng, clamp } from './util.js';

export const PARCEL = { w: 0.9, h: 0.55, d: 0.62 };
export const BELT_Y = 0.9;
export const LANE_COLORS = [new THREE.Color(COLOR.cyan), new THREE.Color(COLOR.magenta), new THREE.Color(COLOR.amber)];

// ---------------------------------------------------------------- cardboard
let _kraft = null;
function kraftCanvas(w, h, seed) {
  const c = makeCanvas(w, h);
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#b48553'); g.addColorStop(1, '#a87a49');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  const r = rng(seed);
  // corrugation lines + fibres
  x.globalAlpha = 0.05;
  for (let i = 0; i < h; i += 7) { x.fillStyle = i % 14 ? '#000' : '#fff'; x.fillRect(0, i, w, 3); }
  x.globalAlpha = 0.18;
  for (let i = 0; i < 2600; i++) {
    x.strokeStyle = r() > 0.5 ? '#6e4a25' : '#d4a777';
    x.lineWidth = 0.6 + r();
    const px = r() * w, py = r() * h, a = (r() - 0.5) * 0.6, l = 4 + r() * 18;
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
  }
  // scuffs
  x.globalAlpha = 0.1;
  for (let i = 0; i < 40; i++) {
    const gg = x.createRadialGradient(0, 0, 0, 0, 0, 30 + r() * 60);
    gg.addColorStop(0, r() > 0.5 ? '#3d2812' : '#e8c79c'); gg.addColorStop(1, 'rgba(0,0,0,0)');
    x.save(); x.translate(r() * w, r() * h); x.fillStyle = gg; x.fillRect(-100, -100, 200, 200); x.restore();
  }
  x.globalAlpha = 1;
  return c;
}

function tape(x, X, Y, W, H) {
  const g = x.createLinearGradient(X, Y, X, Y + H);
  g.addColorStop(0, 'rgba(214,170,110,0.95)'); g.addColorStop(0.5, 'rgba(236,198,140,0.95)'); g.addColorStop(1, 'rgba(206,160,100,0.95)');
  x.fillStyle = g; x.fillRect(X, Y, W, H);
  x.globalAlpha = 0.25; x.fillStyle = '#fff';
  for (let i = 0; i < W; i += 38) x.fillRect(X + i, Y + 2, 14, 2);
  x.globalAlpha = 1;
}

function filmIcon(x, X, Y, S, color) {
  x.save();
  x.fillStyle = color;
  roundRect(x, X, Y, S, S * 0.72, S * 0.08); x.fill();
  x.fillStyle = '#f3efe6';
  for (let i = 0; i < 5; i++) {
    x.fillRect(X + S * 0.08 + i * S * 0.18, Y + S * 0.06, S * 0.09, S * 0.08);
    x.fillRect(X + S * 0.08 + i * S * 0.18, Y + S * 0.58, S * 0.09, S * 0.08);
  }
  x.beginPath(); x.moveTo(X + S * 0.4, Y + S * 0.22); x.lineTo(X + S * 0.64, Y + S * 0.36); x.lineTo(X + S * 0.4, Y + S * 0.5); x.closePath(); x.fill();
  x.restore();
}

// Side (front, +z) face: shipping label with the file name and sender.
export function parcelFrontCanvas(account = 'alice', seed = 11) {
  const W = 1024, H = Math.round(1024 * PARCEL.h / PARCEL.w);
  const c = kraftCanvas(W, H, seed);
  const x = c.getContext('2d');
  // label
  const lx = 300, ly = 70, lw = 560, lh = 360;
  x.save();
  x.shadowColor = 'rgba(0,0,0,0.25)'; x.shadowBlur = 12; x.shadowOffsetY = 3;
  x.fillStyle = COLOR.paper; roundRect(x, lx, ly, lw, lh, 10); x.fill();
  x.restore();
  x.fillStyle = '#111'; x.fillRect(lx, ly, lw, 70);
  x.font = `800 40px ${FONT.mono}`; x.fillStyle = COLOR.paper; x.textBaseline = 'middle';
  x.fillText('POST', lx + 24, ly + 37);
  x.font = `500 26px ${FONT.mono}`; x.fillStyle = COLOR.cyan; x.textAlign = 'right';
  x.fillText('PRIORITY', lx + lw - 22, ly + 37); x.textAlign = 'left';
  filmIcon(x, lx + 26, ly + 100, 92, '#111');
  x.fillStyle = '#111'; x.font = `800 64px ${FONT.mono}`;
  x.fillText('clip.mp4', lx + 140, ly + 136);
  x.font = `500 30px ${FONT.mono}`; x.fillStyle = '#444';
  x.fillText(`from  @${account}`, lx + 140, ly + 196);
  drawBarcode(x, lx + 26, ly + 250, lw - 52, 70, seed + 5, '#111');
  // fragile arrows
  x.strokeStyle = '#2a1a0a'; x.globalAlpha = 0.55; x.lineWidth = 7;
  for (const ax of [90, 170]) {
    x.beginPath(); x.moveTo(ax, 330); x.lineTo(ax, 160); x.moveTo(ax - 30, 200); x.lineTo(ax, 160); x.lineTo(ax + 30, 200); x.stroke();
  }
  x.globalAlpha = 1;
  return c;
}

export function parcelTopCanvas(seed = 12) {
  const W = 1024, H = Math.round(1024 * PARCEL.d / PARCEL.w);
  const c = kraftCanvas(W, H, seed);
  const x = c.getContext('2d');
  tape(x, 0, H / 2 - 70, W, 140);
  return c;
}

export function parcelSideCanvas(seed = 13) {
  const W = 1024, H = Math.round(1024 * PARCEL.h / PARCEL.d);
  const c = kraftCanvas(W, H, seed);
  const x = c.getContext('2d');
  tape(x, W / 2 - 70, 0, 140, H * 0.28);
  x.fillStyle = '#2a1a0a'; x.globalAlpha = 0.6; x.font = `700 70px ${FONT.stencil}`; x.textAlign = 'center';
  x.fillText('THIS SIDE UP', W / 2, H * 0.65);
  x.globalAlpha = 1;
  return c;
}

function cardboardMat(canvas, extra = {}) {
  const map = tex(canvas);
  return new THREE.MeshStandardMaterial({ map, roughness: 0.82, metalness: 0.0, bumpMap: map, bumpScale: 0.6, ...extra });
}

// Box with face order +x, -x, +y, -y, +z, -z.
export function makeParcel(account = 'alice', seed = 11) {
  const geo = new RoundedBoxGeometry(PARCEL.w, PARCEL.h, PARCEL.d, 3, 0.035);
  const side = cardboardMat(parcelSideCanvas(seed + 2));
  const mats = [
    side, side,
    cardboardMat(parcelTopCanvas(seed + 1)),
    side,
    cardboardMat(parcelFrontCanvas(account, seed)),
    cardboardMat(parcelFrontCanvas(account, seed + 7)),
  ];
  const mesh = new THREE.Mesh(geo, mats);
  mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}

// ---------------------------------------------------------------- metal & rubber
export function metal(color = 0x2a2e36, rough = 0.38, metalness = 0.85) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness });
}

let _beltTex = null;
export function beltTexture() {
  if (_beltTex) return _beltTex;
  const c = makeCanvas(256, 256);
  const x = c.getContext('2d');
  x.fillStyle = '#16181d'; x.fillRect(0, 0, 256, 256);
  x.fillStyle = '#20232a';
  for (let i = 0; i < 256; i += 32) x.fillRect(i, 0, 6, 256);
  const n = noiseCanvas(256, 256, 4, { base: 128, amp: 40, blobs: 0 });
  x.globalAlpha = 0.15; x.drawImage(n, 0, 0); x.globalAlpha = 1;
  _beltTex = tex(c, { repeat: true });
  return _beltTex;
}

// A straight conveyor along +x from x0 to x1 at lane z. Returns { group, setTravel(d), leds }.
export function makeConveyor(x0, x1, z, color, { width = 1.0, legs = true, ledCount = null } = {}) {
  const g = new THREE.Group();
  const L = x1 - x0;
  const frameMat = metal(0x23262d, 0.45, 0.8);
  const beltMap = beltTexture().clone();
  beltMap.needsUpdate = true;
  beltMap.repeat.set(L / 1.2, 1);
  const belt = new THREE.Mesh(new THREE.BoxGeometry(L, 0.06, width), new THREE.MeshStandardMaterial({ map: beltMap, roughness: 0.9, metalness: 0.05 }));
  belt.position.set((x0 + x1) / 2, BELT_Y - 0.03, z);
  belt.receiveShadow = true;
  g.add(belt);
  for (const s of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(L, 0.16, 0.08), frameMat);
    rail.position.set((x0 + x1) / 2, BELT_Y - 0.02, z + s * (width / 2 + 0.04));
    rail.castShadow = true; rail.receiveShadow = true;
    g.add(rail);
  }
  if (legs) {
    const legGeo = new THREE.BoxGeometry(0.07, BELT_Y - 0.1, 0.07);
    for (let x = x0 + 0.4; x < x1; x += 1.8) {
      for (const s of [-1, 1]) {
        const leg = new THREE.Mesh(legGeo, frameMat);
        leg.position.set(x, (BELT_Y - 0.1) / 2, z + s * (width / 2 + 0.02));
        leg.castShadow = true;
        g.add(leg);
      }
    }
  }
  // LED segments along both rails: per-instance colour, driven per frame.
  const n = ledCount ?? Math.max(4, Math.round(L / 0.25));
  const ledGeo = new THREE.BoxGeometry(L / n * 0.7, 0.025, 0.03);
  const ledMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const leds = new THREE.InstancedMesh(ledGeo, ledMat, n * 2);
  const m = new THREE.Matrix4();
  const xs = [];
  for (let i = 0; i < n; i++) {
    const x = x0 + (i + 0.5) * (L / n);
    xs.push(x);
    for (let s = 0; s < 2; s++) {
      m.makeTranslation(x, BELT_Y + 0.065, z + (s ? 1 : -1) * (width / 2 + 0.065));
      leds.setMatrixAt(i * 2 + s, m);
      leds.setColorAt(i * 2 + s, color);
    }
  }
  g.add(leds);
  const tmp = new THREE.Color();
  return {
    group: g, belt, leds, xs,
    setTravel(d) { beltMap.offset.x = -d / 1.2; },
    // fn(x) -> intensity multiplier
    light(fn) {
      for (let i = 0; i < n; i++) {
        const k = fn(xs[i]);
        tmp.copy(color).multiplyScalar(k);
        leds.setColorAt(i * 2, tmp); leds.setColorAt(i * 2 + 1, tmp);
      }
      leds.instanceColor.needsUpdate = true;
    },
  };
}

// ---------------------------------------------------------------- environment
export function makeFloor(size = 260, tint = 0x9aa0aa) {
  const c = makeCanvas(1024, 1024);
  const x = c.getContext('2d');
  x.fillStyle = '#16181d'; x.fillRect(0, 0, 1024, 1024);
  const n = noiseCanvas(1024, 1024, 21, { base: 128, amp: 12, blobs: 200, blobAmp: 6, blobR: 90 });
  x.globalAlpha = 0.3; x.globalCompositeOperation = 'overlay'; x.drawImage(n, 0, 0); x.globalCompositeOperation = 'source-over';
  // expansion joints
  x.globalAlpha = 0.6; x.fillStyle = '#0b0c0f';
  x.fillRect(0, 0, 1024, 3); x.fillRect(0, 0, 3, 1024);
  x.globalAlpha = 1;
  const map = tex(c, { repeat: true });
  map.repeat.set(size / 6, size / 6);
  const rough = tex(noiseCanvas(512, 512, 33, { base: 165, amp: 10, blobs: 120, blobAmp: 18, blobR: 60 }), { srgb: false, repeat: true });
  rough.repeat.set(size / 9, size / 9);
  const mat = new THREE.MeshStandardMaterial({ map, roughnessMap: rough, roughness: 0.75, metalness: 0.35, color: tint });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  return floor;
}

// Painted floor stripe (hazard/lane line).
export function floorLine(x0, x1, z, w = 0.12, color = '#c9a227', dashed = false) {
  const c = makeCanvas(256, 16);
  const x = c.getContext('2d');
  x.fillStyle = color;
  if (dashed) { for (let i = 0; i < 256; i += 64) x.fillRect(i, 0, 36, 16); } else x.fillRect(0, 0, 256, 16);
  const map = tex(c, { repeat: true });
  map.repeat.set((x1 - x0) / 2, 1);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, w), new THREE.MeshStandardMaterial({ map, transparent: true, opacity: 0.55, roughness: 0.9, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.set((x0 + x1) / 2, 0.003, z);
  m.receiveShadow = true;
  return m;
}

// Storage racks with boxes and status LEDs: depth and parallax for the background.
export function makeRacks({ x0 = -30, x1 = 80, z = -10, rows = 1, height = 7, seed = 5, facing = 1 } = {}) {
  const g = new THREE.Group();
  const r = rng(seed);
  const postMat = metal(0x1c2028, 0.5, 0.7);
  const beamMat = new THREE.MeshStandardMaterial({ color: 0x8a5a1c, roughness: 0.55, metalness: 0.5 });
  const bays = Math.floor((x1 - x0) / 2.7);
  const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, height, 0.1), postMat, (bays + 1) * 2 * rows);
  const beams = new THREE.InstancedMesh(new THREE.BoxGeometry(2.7, 0.1, 0.08), beamMat, bays * 4 * 2 * rows);
  const boxGeo = new RoundedBoxGeometry(1, 1, 1, 1, 0.04);
  const boxMat = new THREE.MeshStandardMaterial({ color: 0xa8814f, roughness: 0.85 });
  const maxBoxes = bays * 4 * 3 * rows;
  const boxes = new THREE.InstancedMesh(boxGeo, boxMat, maxBoxes);
  const ledGeo = new THREE.BoxGeometry(0.05, 0.05, 0.02);
  const leds = new THREE.InstancedMesh(ledGeo, new THREE.MeshBasicMaterial({ toneMapped: false }), bays * 4 * rows);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  let pi = 0, bi = 0, xi = 0, li = 0;
  const col = new THREE.Color();
  for (let row = 0; row < rows; row++) {
    const zz = z + row * 3.4 * facing;
    for (let b = 0; b <= bays; b++) {
      for (const dz of [-0.5, 0.5]) {
        m.makeTranslation(x0 + b * 2.7, height / 2, zz + dz);
        posts.setMatrixAt(pi++, m);
      }
    }
    for (let b = 0; b < bays; b++) {
      const cx = x0 + b * 2.7 + 1.35;
      for (let lvl = 0; lvl < 4; lvl++) {
        const y = 0.3 + lvl * (height - 0.6) / 3.5;
        for (const dz of [-0.5, 0.5]) { m.makeTranslation(cx, y, zz + dz); beams.setMatrixAt(bi++, m); }
        let bx = cx - 1.2;
        for (let k = 0; k < 3; k++) {
          if (r() < 0.22) { bx += 0.8; continue; }
          const w = 0.5 + r() * 0.35, h = 0.35 + r() * 0.45, d = 0.6 + r() * 0.3;
          p.set(bx + w / 2, y + 0.05 + h / 2, zz + (r() - 0.5) * 0.15);
          q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (r() - 0.5) * 0.12);
          s.set(w, h, d);
          m.compose(p, q, s);
          if (xi < maxBoxes) {
            boxes.setMatrixAt(xi, m);
            col.setHSL(0.075 + r() * 0.03, 0.3 + r() * 0.15, 0.2 + r() * 0.12);
            boxes.setColorAt(xi, col);
            xi++;
          }
          bx += w + 0.12;
        }
        m.makeTranslation(cx + 1.2, y + 0.12, zz + 0.52 * facing);
        leds.setMatrixAt(li, m);
        const hue = r();
        leds.setColorAt(li++, hue > 0.85 ? new THREE.Color(3, 0.5, 0.3) : hue > 0.5 ? new THREE.Color(0.3, 2.5, 1.2) : new THREE.Color(0.25, 0.9, 2.4));
      }
    }
  }
  boxes.count = xi;
  for (const im of [posts, beams, boxes]) { im.castShadow = false; im.receiveShadow = true; }
  g.add(posts, beams, boxes, leds);
  return g;
}

// Overhead truss with hanging lamp panels.
export function makeCeiling({ x0 = -30, x1 = 90, zs = [-3, 6], y = 9, spacing = 7 } = {}) {
  const g = new THREE.Group();
  const trussMat = metal(0x15181e, 0.6, 0.6);
  for (const z of zs) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.35, 0.35), trussMat);
    beam.position.set((x0 + x1) / 2, y + 0.6, z);
    g.add(beam);
    for (let x = x0; x < x1; x += spacing) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.5), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.3, 2.6), toneMapped: false }));
      lamp.position.set(x, y, z);
      g.add(lamp);
      const housing = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.14, 0.62), trussMat);
      housing.position.set(x, y + 0.1, z);
      g.add(housing);
    }
  }
  return g;
}

// Soft additive light shaft (fake volumetric).
let _shaftTex = null;
export function makeShaft(radiusTop = 0.4, radiusBottom = 2.2, height = 9, color = 0xbfd6ff, opacity = 0.06) {
  if (!_shaftTex) {
    const c = makeCanvas(64, 256);
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 256);
    _shaftTex = tex(c, { srgb: false });
  }
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 48, 1, true),
    new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: opacity } },
      vertexShader: `varying vec3 vN; varying vec3 vV; varying float vY;
        void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vY = uv.y; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform vec3 uColor; uniform float uOpacity; varying vec3 vN; varying vec3 vV; varying float vY;
        void main(){ float f = abs(dot(normalize(vN), normalize(vV))); float a = pow(f, 3.0) * pow(vY, 1.6) * uOpacity; gl_FragColor = vec4(uColor * a, a); }`,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    }),
  );
  return m;
}

// ---------------------------------------------------------------- particles
// Deterministic ballistic particles. spawn(i, r) -> {p0, v0, life, size}
let _dotTex = null;
export function dotTexture() {
  if (_dotTex) return _dotTex;
  const c = makeCanvas(64, 64);
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  _dotTex = tex(c, { srgb: false });
  return _dotTex;
}

export class Burst {
  constructor(count, { color = new THREE.Color(4, 3, 2), size = 0.05, gravity = -9.8, drag = 0.0, additive = true, seed = 1, spawn, opacity = 1 } = {}) {
    this.count = count; this.gravity = gravity; this.drag = drag;
    this.geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(count * 3);
    this.alpha = new Float32Array(count);
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: color }, uSize: { value: size }, uMap: { value: dotTexture() }, uOpacity: { value: opacity }, uScale: { value: 1 } },
      vertexShader: `attribute float alpha; varying float vA; uniform float uSize; uniform float uScale;
        void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); float d = -mv.z; vA = alpha * smoothstep(0.35, 0.9, d); gl_PointSize = min(uSize * uScale * 900.0 / max(d, 0.05), 28.0 * uScale); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform vec3 uColor; uniform sampler2D uMap; uniform float uOpacity; varying float vA;
        void main(){ vec4 t = texture2D(uMap, gl_PointCoord); gl_FragColor = vec4(uColor * t.rgb, t.a * vA * uOpacity); }`,
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
    const r = rng(seed);
    this.ps = [];
    for (let i = 0; i < count; i++) this.ps.push(spawn(i, r));
  }
  update(age) {
    for (let i = 0; i < this.count; i++) {
      const P = this.ps[i];
      const a = age - (P.delay || 0);
      if (a < 0 || a > P.life) { this.alpha[i] = 0; this.pos[i * 3 + 1] = -999; continue; }
      const k = this.drag > 0 ? (1 - Math.exp(-this.drag * a)) / this.drag : a;
      this.pos[i * 3] = P.p0.x + P.v0.x * k;
      this.pos[i * 3 + 1] = P.p0.y + P.v0.y * k + 0.5 * this.gravity * a * a * (P.g ?? 1);
      this.pos[i * 3 + 2] = P.p0.z + P.v0.z * k;
      if (P.floor !== undefined && this.pos[i * 3 + 1] < P.floor) this.pos[i * 3 + 1] = P.floor;
      this.alpha[i] = Math.pow(1 - a / P.life, P.fade ?? 1.5);
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.alpha.needsUpdate = true;
  }
}

// Text on a plane (sign/display). Returns mesh; material emissive if glow.
export function signMesh(canvas, w, h, { glow = 1.0, basic = true, transparent = true } = {}) {
  const map = tex(canvas);
  const mat = basic
    ? new THREE.MeshBasicMaterial({ map, transparent, color: new THREE.Color(glow, glow, glow), toneMapped: false, depthWrite: !transparent })
    : new THREE.MeshStandardMaterial({ map, transparent, roughness: 0.6 });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  return m;
}

export const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
export { clamp };
