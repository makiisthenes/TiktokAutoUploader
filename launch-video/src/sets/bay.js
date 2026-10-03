// Shot 4: the parcel is laser-cut at the 5 MB boundaries, each crate gets a
// CRC32 seal, the crane loads them into storage, the manifest (the real
// "part:crc" finish list) checks off, and the lid shuts: commit.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { clamp, lerp, smooth, easeOutExpo, easeInOutCubic, easeOutCubic, easeInCubic, easeInOutQuint, easeOutBack, spring, hit, hits, fbm1, rng, camPath } from '../engine/util.js';
import { makeCanvas, tex, FONT, COLOR, roundRect, noiseCanvas } from '../engine/canvas.js';
import {
  PARCEL, BELT_Y, LANE_COLORS, makeParcel, makeConveyor, makeFloor, makeRacks, makeCeiling, makeShaft, floorLine, metal, Burst, signMesh, v3,
  parcelFrontCanvas, parcelTopCanvas, parcelSideCanvas,
} from '../engine/props.js';

const CAM_KEYS = [
  { t: 16.0, p: [2.9, 0.78, 3.1], l: [-1.6, 1.0, 0], fov: 34 },
  { t: 16.85, p: [1.75, 0.95, 2.55], l: [-0.1, 1.0, 0], fov: 33 },
  { t: 17.6, p: [0.95, 1.15, 1.95], l: [0.0, 1.03, 0], fov: 32 },
  { t: 18.4, p: [0.25, 1.24, 1.8], l: [0.0, 1.3, 0], fov: 32 },
  { t: 19.6, p: [-0.75, 1.2, 2.05], l: [0.05, 1.28, 0], fov: 33 },
  { t: 20.6, p: [-1.2, 2.95, 2.2], l: [0.1, 0.5, -1.3], fov: 35 },
  { t: 21.7, p: [-1.1, 3.7, 1.5], l: [0.3, 0.55, -2.4], fov: 36 },
  { t: 22.8, p: [0.3, 3.2, 0.5], l: [0.95, 0.9, -2.0], fov: 36 },
  { t: 23.6, p: [0.6, 3.05, 0.2], l: [1.0, 0.95, -2.0], fov: 36 },
  { t: 24.2, p: [0.7, 3.0, 0.1], l: [1.05, 0.95, -2.0], fov: 36 },
];
const CONT = { x: 0, z: -2.75, w: 2.5, h: 0.95, d: 1.35 };

function cutFaceCanvas(seed) {
  const W = 512, H = 320;
  const c = makeCanvas(W, H);
  const x = c.getContext('2d');
  x.fillStyle = '#c99a63'; x.fillRect(0, 0, W, H);
  // corrugated flutes between liners
  x.fillStyle = '#b7894f';
  x.fillRect(0, 0, W, 10); x.fillRect(0, H - 10, W, 10);
  x.strokeStyle = 'rgba(120,80,38,0.55)'; x.lineWidth = 2;
  for (let row = 0; row < 7; row++) {
    const y0 = 22 + row * 42;
    x.beginPath();
    for (let i = 0; i <= W; i += 3) x.lineTo(i, y0 + Math.sin(i / 6) * 8);
    x.stroke();
  }
  return c;
}

function stickerCanvas(i, TL) {
  const W = 512, H = 360;
  const c = makeCanvas(W, H);
  const x = c.getContext('2d');
  x.fillStyle = '#f4f1ea'; roundRect(x, 0, 0, W, H, 26); x.fill();
  x.fillStyle = '#e8173f'; roundRect(x, 0, 0, W, 96, 26); x.fill(); x.fillRect(0, 50, W, 46);
  x.fillStyle = '#fff'; x.font = `800 50px ${FONT.mono}`; x.textBaseline = 'middle';
  x.fillText(`PART ${i + 1}/3`, 28, 50);
  x.fillStyle = '#111'; x.font = `900 138px ${FONT.stencil}`; x.textAlign = 'left';
  x.fillText(`${TL.partsMB[i]} MB`, 26, 196);
  x.font = `700 34px ${FONT.mono}`; x.fillStyle = '#666';
  x.fillText('CRC32', 30, 292);
  x.font = `800 52px ${FONT.mono}`; x.fillStyle = '#111';
  x.fillText(TL.crc[i], 160, 294);
  // perforated tamper edge
  x.globalCompositeOperation = 'destination-out';
  for (let k = 12; k < W; k += 24) { x.beginPath(); x.arc(k, H, 7, 0, 7); x.fill(); }
  return c;
}

export default function createBay(ctx) {
  const { TL } = ctx;
  const C = TL.cues;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07080d);
  scene.fog = new THREE.FogExp2(0x07080d, 0.05);
  scene.environment = ctx.envTex;
  scene.environmentIntensity = 0.25;
  const camera = new THREE.PerspectiveCamera(32, ctx.aspect, 0.05, 120);

  scene.add(new THREE.HemisphereLight(0x3a4a6a, 0x050608, 0.55));
  const key = new THREE.DirectionalLight(0xe8eeff, 1.9);
  key.position.set(-3, 9, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 0.5, far: 30 });
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  key.target.position.set(0, 0, -1);
  scene.add(key, key.target);
  const laserLight = new THREE.PointLight(0xff2244, 0, 5, 1.5);
  laserLight.position.set(0, 2.1, 0.1);
  scene.add(laserLight);
  const rim = new THREE.PointLight(LANE_COLORS[0], 5, 9, 1.4);
  rim.position.set(2.5, 2.2, -1.5);
  scene.add(rim);
  const rim2 = new THREE.PointLight(LANE_COLORS[1], 6, 9, 1.4);
  rim2.position.set(-3, 1.6, -2.5);
  scene.add(rim2);
  const contLamp = new THREE.PointLight(0x3dff9a, 0, 4, 1.5);
  contLamp.position.set(0, 1.4, CONT.z + 0.9);
  scene.add(contLamp);

  scene.add(makeFloor(260, 0x6a707a));
  scene.add(makeRacks({ x0: -20, x1: 20, z: -8, seed: 14 }));
  scene.add(makeRacks({ x0: -20, x1: 20, z: 9, seed: 15, facing: -1 }));
  scene.add(makeCeiling({ x0: -20, x1: 20, zs: [2, -4], y: 7.5, spacing: 5 }));
  for (const [sx, sz] of [[0, 2], [5, -4], [-5, -4]]) { const s = makeShaft(0.6, 2.6, 7.4, 0xbcd0ff, 0.04); s.position.set(sx, 3.75, sz); scene.add(s); }
  scene.add(floorLine(-20, 20, -0.95, 0.08));
  scene.add(floorLine(-20, 20, 0.95, 0.08));
  // hazard zone under the gantry
  {
    const c = makeCanvas(512, 512);
    const x = c.getContext('2d');
    x.fillStyle = '#c9a227';
    for (let i = -512; i < 1024; i += 64) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 32, 0); x.lineTo(i + 32 + 512, 512); x.lineTo(i + 512, 512); x.closePath(); x.fill(); }
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), new THREE.MeshStandardMaterial({ map: tex(c), transparent: true, opacity: 0.35, roughness: 0.9, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(0, 0.004, 1.5);
    scene.add(m);
  }

  const belt = makeConveyor(-14, 6, 0, LANE_COLORS[0]);
  scene.add(belt.group);
  // the end of alice's proxy tunnel: the cut from the depot matches on it
  const TUN_END = -2.3;
  const tunnel = new THREE.Group();
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 12, 48, 1, true), new THREE.MeshStandardMaterial({ color: 0xbff8f6, roughness: 0.05, transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false }));
  tube.rotation.z = Math.PI / 2;
  tube.position.set(TUN_END - 6, 1.25, 0);
  tunnel.add(tube);
  const ribs = new THREE.InstancedMesh(new THREE.TorusGeometry(1.1, 0.028, 8, 64), new THREE.MeshBasicMaterial({ toneMapped: false }), 9);
  for (let k = 0; k < 9; k++) {
    const m = new THREE.Matrix4().makeRotationY(Math.PI / 2).setPosition(TUN_END - k * 1.4, 1.25, 0);
    ribs.setMatrixAt(k, m);
    ribs.setColorAt(k, LANE_COLORS[0].clone().multiplyScalar(0.9));
  }
  tunnel.add(ribs);
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.09, 16, 64), metal(0x2a2e36, 0.3, 0.9));
  mouth.rotation.y = Math.PI / 2;
  mouth.position.set(TUN_END, 1.25, 0);
  tunnel.add(mouth);
  scene.add(tunnel);

  // ---------------- parcel and its three parts
  const whole = makeParcel('alice', 11);
  scene.add(whole);
  const total = TL.partsMB.reduce((a, b) => a + b, 0);
  const widths = TL.partsMB.map((mb) => PARCEL.w * mb / total);
  const bounds = [];
  { let a = -PARCEL.w / 2; for (const w of widths) { bounds.push([a, a + w]); a += w; } }
  const cutXs = [bounds[0][1], bounds[1][1]];
  const srcFront = parcelFrontCanvas('alice', 11), srcBack = parcelFrontCanvas('alice', 18), srcTop = parcelTopCanvas(12), srcSide = parcelSideCanvas(13);
  const cutMat = new THREE.MeshStandardMaterial({ map: tex(cutFaceCanvas(1)), roughness: 0.9 });
  const sideMat = new THREE.MeshStandardMaterial({ map: tex(srcSide), roughness: 0.82, bumpMap: tex(srcSide), bumpScale: 0.6 });
  function sub(canvas, u0, u1, flip = false) {
    const t = tex(canvas);
    t.repeat.set(u1 - u0, 1);
    t.offset.set(flip ? 1 - u1 : u0, 0);
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.82, bumpMap: t, bumpScale: 0.6 });
  }
  const parts = bounds.map(([a, b], i) => {
    const u0 = (a + PARCEL.w / 2) / PARCEL.w, u1 = (b + PARCEL.w / 2) / PARCEL.w;
    const geo = new RoundedBoxGeometry(b - a, PARCEL.h, PARCEL.d, 2, 0.018);
    const mats = [
      i === 2 ? sideMat : cutMat,
      i === 0 ? sideMat : cutMat,
      sub(srcTop, u0, u1),
      sideMat,
      sub(srcFront, u0, u1),
      sub(srcBack, u0, u1, true),
    ];
    const m = new THREE.Mesh(geo, mats);
    m.castShadow = m.receiveShadow = true;
    m.userData.cx = (a + b) / 2;
    scene.add(m);
    // seal sticker on the camera-facing (-z) side
    const st = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(0.25, (b - a) * 0.86), Math.min(0.25, (b - a) * 0.86) * 0.7),
      new THREE.MeshStandardMaterial({ map: tex(stickerCanvas(i, TL)), transparent: true, roughness: 0.45, polygonOffset: true, polygonOffsetFactor: -2 }));
    st.position.set(0, 0.03, PARCEL.d / 2 + 0.003);
    m.add(st);
    m.userData.sticker = st;
    return m;
  });

  // ---------------- laser gantry
  const gMat = metal(0x24272e, 0.35, 0.85);
  const gantry = new THREE.Group();
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.5, 0.16), gMat);
    post.position.set(s * 1.5, 1.25, -0.75);
    post.castShadow = true;
    gantry.add(post);
  }
  const beam = new THREE.Mesh(new RoundedBoxGeometry(3.2, 0.22, 0.24, 2, 0.04), gMat);
  beam.position.set(0, 2.45, -0.75);
  gantry.add(beam);
  const arm = new THREE.Mesh(new RoundedBoxGeometry(0.9, 0.12, 0.9, 2, 0.03), gMat);
  arm.position.set(0.03, 2.3, -0.3);
  arm.castShadow = true;
  gantry.add(arm);
  const heads = cutXs.map((cx) => {
    const h = new THREE.Group();
    const body = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.22, 0.3, 2, 0.03), metal(0x3a3f48, 0.3, 0.9));
    h.add(body);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.3, 0.5), toneMapped: false }));
    lens.position.y = -0.115;
    h.add(lens);
    h.position.set(cx, 2.12, 0);
    gantry.add(h);
    h.userData.lens = lens;
    return h;
  });
  scene.add(gantry);
  const sheetGeo = new THREE.PlaneGeometry(1, 1);
  sheetGeo.translate(0, -0.5, 0);
  const sheets = cutXs.map((cx) => {
    const c = makeCanvas(64, 256);
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 64, 0);
    g.addColorStop(0, 'rgba(255,40,80,0)'); g.addColorStop(0.5, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,40,80,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 256);
    const m = new THREE.Mesh(sheetGeo, new THREE.MeshBasicMaterial({ map: tex(c, { srgb: false }), color: new THREE.Color(2.0, 0.25, 0.5), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    m.rotation.y = Math.PI / 2;
    m.position.set(cx, 2.0, 0);
    scene.add(m);
    return m;
  });
  const seams = cutXs.map((cx) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.012, PARCEL.h + 0.012, PARCEL.d + 0.012), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 0.35, 0.6), toneMapped: false, transparent: true }));
    m.position.set(cx, BELT_Y + PARCEL.h / 2, 0);
    scene.add(m);
    return m;
  });
  const sparks = C.lasers.map((tc, i) => {
    const b = new Burst(160, {
      color: new THREE.Color(5, 2.2, 1.0), size: 0.016, gravity: -9.8, seed: 200 + i,
      spawn: (k, r) => {
        const y = BELT_Y + r() * PARCEL.h;
        const a = Math.PI + (r() - 0.5) * 1.6;
        const sp = 1.5 + r() * 4;
        return { p0: v3(cutXs[i], y, PARCEL.d / 2), v0: v3((r() - 0.5) * 2.5, r() * 2.0, -Math.sin(a) * sp * 0.4 + 1.2 * r()), life: 0.3 + r() * 0.6, delay: (BELT_Y + PARCEL.h - y) / PARCEL.h * 0.1, floor: 0.01 };
      },
    });
    scene.add(b.points);
    return b;
  });

  // ---------------- storage container, crane, manifest
  const cont = new THREE.Group();
  const corr = makeCanvas(512, 256);
  {
    const x = corr.getContext('2d');
    for (let i = 0; i < 512; i += 16) {
      const g = x.createLinearGradient(i, 0, i + 16, 0);
      g.addColorStop(0, '#3a3a3a'); g.addColorStop(0.5, '#d8d8d8'); g.addColorStop(1, '#3a3a3a');
      x.fillStyle = g; x.fillRect(i, 0, 16, 256);
    }
  }
  const corrTex = tex(corr, { srgb: false, repeat: true });
  corrTex.repeat.set(2, 1);
  const paint = noiseCanvas(512, 256, 61, { base: 128, amp: 3, blobs: 80, blobAmp: 40, blobR: 50 });
  const paintTex = tex(paint, { srgb: false, repeat: true });
  const cMat = new THREE.MeshStandardMaterial({ color: 0x245a6e, roughness: 0.55, metalness: 0.65, bumpMap: corrTex, bumpScale: 1.2, roughnessMap: paintTex });
  const wall = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.02), cMat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; cont.add(m); return m; };
  wall(CONT.w, 0.08, CONT.d, 0, 0.04, 0);
  wall(CONT.w, CONT.h, 0.08, 0, CONT.h / 2, -CONT.d / 2);
  wall(CONT.w, CONT.h, 0.08, 0, CONT.h / 2, CONT.d / 2);
  wall(0.08, CONT.h, CONT.d, -CONT.w / 2, CONT.h / 2, 0);
  wall(0.08, CONT.h, CONT.d, CONT.w / 2, CONT.h / 2, 0);
  {
    const c = makeCanvas(1024, 256);
    const x = c.getContext('2d');
    x.font = `900 170px ${FONT.stencil}`; x.fillStyle = 'rgba(230,236,245,0.85)'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('STORAGE', 512, 135);
    const s = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.45), new THREE.MeshStandardMaterial({ map: tex(c), transparent: true, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 }));
    s.position.set(0, CONT.h * 0.52, CONT.d / 2 + 0.045);
    cont.add(s);
  }
  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, CONT.h, -CONT.d / 2);
  const lid = new THREE.Mesh(new RoundedBoxGeometry(CONT.w + 0.04, 0.08, CONT.d + 0.04, 2, 0.02), cMat);
  lid.position.set(0, 0.04, CONT.d / 2);
  lid.castShadow = true;
  lidPivot.add(lid);
  cont.add(lidPivot);
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 0.2, 0.2), toneMapped: false }));
  lamp.position.set(CONT.w / 2 - 0.2, CONT.h + 0.06, CONT.d / 2 - 0.06);
  cont.add(lamp);
  cont.position.set(CONT.x, 0, CONT.z);
  scene.add(cont);
  // overhead crane rail
  const rail = new THREE.Mesh(new THREE.BoxGeometry(6, 0.18, 0.18), gMat);
  rail.position.set(0, 3.4, -1.4);
  scene.add(rail);
  const claws = parts.map(() => {
    const g = new THREE.Group();
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1, 6), metal(0x888c94, 0.4, 0.9));
    cable.geometry.translate(0, 0.5, 0);
    g.add(cable);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.07, 32), metal(0x2b2f36, 0.35, 0.9));
    head.position.y = 0.035;
    g.add(head);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.112, 0.112, 0.02, 32), new THREE.MeshStandardMaterial({ color: 0xffb347, roughness: 0.4, metalness: 0.3, emissive: 0x2a1600 }));
    band.position.y = 0.05;
    g.add(band);
    g.userData.cable = cable;
    scene.add(g);
    return g;
  });
  const slotX = [-0.75, 0, 0.75];

  // Manifest: the literal finish payload, one line per part.
  const manifest = (() => {
    const W = 1024, H = 640;
    const c = makeCanvas(W, H);
    const x = c.getContext('2d');
    const t = tex(c);
    return {
      canvas: c, x, t, draw(tt) {
        x.clearRect(0, 0, W, H);
        x.fillStyle = 'rgba(6,12,18,0.9)'; roundRect(x, 0, 0, W, H, 36); x.fill();
        x.strokeStyle = 'rgba(37,244,238,0.9)'; x.lineWidth = 6; roundRect(x, 3, 3, W - 6, H - 6, 34); x.stroke();
        x.font = `700 46px ${FONT.mono}`; x.fillStyle = '#8fa0b8'; x.textBaseline = 'middle';
        x.fillText('MANIFEST', 56, 80);
        C.manifest.forEach((mt, i) => {
          const y = 190 + i * 104;
          const on = tt >= mt;
          const k = easeOutExpo(clamp((tt - mt) / 0.25));
          x.font = `800 64px ${FONT.mono}`;
          x.fillStyle = on ? '#ffffff' : '#3b4556';
          x.fillText(`${i + 1}:${TL.crc[i]}`, 56, y);
          if (on) {
            x.save(); x.translate(860, y); x.scale(k, k);
            x.fillStyle = COLOR.green; x.beginPath(); x.arc(0, 0, 34, 0, 7); x.fill();
            x.strokeStyle = '#06210f'; x.lineWidth = 10; x.lineCap = 'round';
            x.beginPath(); x.moveTo(-15, 1); x.lineTo(-4, 13); x.lineTo(17, -12); x.stroke();
            x.restore();
          }
        });
        const ck = easeOutExpo(clamp((tt - C.commit) / 0.3));
        if (ck > 0) {
          x.save(); x.globalAlpha = ck;
          x.fillStyle = COLOR.green; roundRect(x, 56, 520, W - 112, 84, 20); x.fill();
          x.fillStyle = '#04150a'; x.font = `800 52px ${FONT.mono}`; x.textAlign = 'center';
          x.fillText('COMMIT  ✓', W / 2, 564);
          x.restore();
        }
        t.needsUpdate = true;
      },
    };
  })();
  const manMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.0), new THREE.MeshBasicMaterial({ map: manifest.t, transparent: true, toneMapped: false, color: new THREE.Color(0.95, 0.95, 0.95) }));
  manMesh.position.set(1.95, 1.45, -1.55);
  manMesh.lookAt(-0.4, 4.6, 1.2);
  scene.add(manMesh);
  const manPost = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.1, 0.06), gMat);
  manPost.position.set(1.98, 0.55, -1.6);
  scene.add(manPost);

  // ---------------- motion
  const T0 = C.bay;
  const arrive = (t) => -5.0 * (1 - easeOutCubic(clamp((t - T0) / 0.85)));
  function partPose(i, t) {
    const p = parts[i];
    const sep = t < C.separate ? 0 : spring(t - C.separate, 2.4, 0.42);
    const spread = [-0.2, 0, 0.2][i];
    const pos = v3(p.userData.cx + spread * sep, BELT_Y + PARCEL.h / 2, [0.14, 0, -0.14][i] * sep);
    const rot = new THREE.Euler(0, [0.12, 0, -0.12][i] * sep, 0);
    // crane: depart, arc up and over, land in its slot on C.lifts[i]
    const land = C.lifts[i], dep = land - 0.5;
    if (t > dep) {
      const u = clamp((t - dep) / (land - dep));
      const e = easeInOutCubic(u);
      const target = v3(CONT.x + slotX[i], 0.08 + PARCEL.h / 2, CONT.z);
      const from = pos.clone();
      pos.lerpVectors(from, target, e);
      pos.y += Math.sin(u * Math.PI) * 0.6;
      rot.y = lerp(rot.y, 0, e);
      rot.z = Math.sin(u * Math.PI) * 0.15 * (i - 1);
      if (u >= 1) {
        const b = 1 - spring(t - land, 3.5, 0.3);
        pos.y -= b * 0.05;
      }
    }
    return { pos, rot };
  }

  function update(t, fx, hud) {
    const ax = arrive(t);
    for (let k = 0; k < 9; k++) {
      const rx = TUN_END - k * 1.4;
      ribs.setColorAt(k, LANE_COLORS[0].clone().multiplyScalar(0.7 + 3 * Math.exp(-Math.abs(rx - ax) * 1.2)));
    }
    ribs.instanceColor.needsUpdate = true;
    belt.setTravel(20 + ax);
    belt.light((x) => 0.25 + 0.1 * Math.sin(x * 2.2 - t * 9));
    const cut = t >= C.lasers[0];
    whole.visible = !cut;
    whole.position.set(ax, BELT_Y + PARCEL.h / 2, 0);
    whole.rotation.set(0, 0, 0);
    parts.forEach((p, i) => {
      p.visible = cut;
      const { pos, rot } = partPose(i, t);
      p.position.copy(pos);
      p.rotation.copy(rot);
      const st = p.userData.sticker;
      const ts = C.seals[i];
      st.visible = t >= ts;
      if (st.visible) {
        const k = easeOutExpo(clamp((t - ts) / 0.16));
        st.scale.setScalar(lerp(1.6, 1, k));
        st.position.z = PARCEL.d / 2 + 0.003 + (1 - k) * 0.12;
        st.rotation.z = (1 - spring(t - ts, 3, 0.35)) * 0.25 * (i % 2 ? -1 : 1);
      }
      // claws follow from just before departure until release
      const cl = claws[i];
      const land = C.lifts[i], dep = land - 0.5;
      const down = easeOutCubic(clamp((t - (dep - 0.35)) / 0.3));
      const release = t > land + 0.12 ? easeInCubic(clamp((t - land - 0.12) / 0.35)) : 0;
      cl.visible = t > dep - 0.4;
      const top = pos.clone(); top.y += PARCEL.h / 2 + 0.04;
      const restY = 3.3;
      const yHead = t < dep ? lerp(restY, top.y, down) : lerp(top.y, restY, release);
      cl.position.set(top.x, yHead, top.z);
      cl.userData.cable.scale.y = Math.max(0.01, 3.4 - yHead);
    });
    // lasers
    C.lasers.forEach((tc, i) => {
      const s = sheets[i];
      const a = t - tc;
      const on = a > -0.1 && a < 0.4;
      s.visible = on;
      if (on) {
        const drop = easeInCubic(clamp((a + 0.1) / 0.12));
        s.scale.set(PARCEL.d + 0.25, 1.15 * drop + 0.001, 1);
        s.material.opacity = a < 0.1 ? 1 : 1 - clamp((a - 0.1) / 0.3);
      }
      heads[i].userData.lens.material.color.setRGB(3 + hit(t, tc, 0.3) * 8, 0.3, 0.5);
      seams[i].visible = cut && t < C.separate + 0.1 && t >= tc;
      if (seams[i].visible) {
        seams[i].material.opacity = Math.max(0.15, hit(t, tc, 0.35));
        seams[i].position.x = cutXs[i];
      }
      const sa = t - tc;
      sparks[i].points.visible = sa >= 0 && sa < 1.2;
      if (sparks[i].points.visible) sparks[i].update(sa);
    });
    laserLight.intensity = hits(t, C.lasers, 0.25) * 2.5;
    laserLight.visible = t > C.lasers[0] - 0.1 && t < C.lasers[1] + 1.5;
    // lid + lamp
    const close = t < C.commit ? 0 : 1;
    const lidK = t < C.commit - 0.3 ? 0 : easeInCubic(clamp((t - (C.commit - 0.3)) / 0.3));
    lidPivot.rotation.x = lerp(-1.85, 0, lidK) + (close ? (1 - spring(t - C.commit, 4, 0.25)) * -0.06 : 0);
    gantry.position.y = easeInOutCubic(clamp((t - 19.6) / 0.7)) * 3.2;
    heads.forEach((h) => { h.visible = gantry.position.y < 2.5; });
    const green = t >= C.commit ? 1 : 0;
    lamp.material.color.setRGB(green ? 0.6 : 0.05, green ? 5 : 0.06, green ? 2 : 0.05);
    contLamp.intensity = green * (1.2 + hit(t, C.commit, 0.4) * 6);
    contLamp.visible = green > 0;
    manifest.draw(t);
    manMesh.visible = t > 21.4;
    if (manMesh.visible) manMesh.material.opacity = smooth(clamp((t - 21.4) / 0.3));

    // camera: low arrival, push into the lasers, orbit to read the seals,
    // crane up with the crates, settle on the manifest.
    const cp = camPath(t, CAM_KEYS);
    let p = v3(...cp.p), l = v3(...cp.l), fov = cp.fov;
    p.x += fbm1(t * 0.4) * 0.03; p.y += fbm1(t * 0.35 + 7) * 0.02;
    camera.position.copy(p);
    camera.up.set(0, 1, 0);
    camera.lookAt(l);
    camera.fov = fov;
    camera.updateProjectionMatrix();

    fx.bloom = { strength: 0.7, radius: 0.45, threshold: 0.85 };
    const focusTarget = t < 17 ? v3(ax, 1.0, 0.3) : t < 20.2 ? v3(0, 1.0, 0.3) : t < 22.3 ? v3(0.3, 0.6, -2.5) : v3(1.6, 1.2, -1.7);
    fx.dof = { focus: camera.position.distanceTo(focusTarget), aperture: t < 20 ? 0.11 : 0.07, maxBlur: 12 };
    fx.ca = 1 + hits(t, C.lasers, 0.2) * 9 + hits(t, C.seals, 0.12) * 3 + hit(t, C.commit, 0.3) * 8;
    fx.shake = hits(t, C.lasers, 0.2) * 0.8 + hit(t, C.commit, 0.25) * 1.4 + hits(t, C.lifts, 0.15) * 0.4;
    // white-out arrival from the tunnel
    fx.flash = [1, 1, 1, 0.85 * (1 - easeOutCubic(clamp((t - T0) / 0.45)))];
    fx.exposure = 1 + 1.5 * (1 - easeOutCubic(clamp((t - T0) / 0.6)));
    // whip out to the booth
    const wk = clamp((t - 23.72) / 0.28);
    if (wk > 0) fx.blur = [easeInCubic(wk) * 0.12, 0];
    hud.header('5 MB parts. Each checksummed.', t, C.header_parts, 19.95);
    return camera;
  }
  return { start: C.bay, scene, update };
}
