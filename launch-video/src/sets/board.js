// Shot 4: a split-flap departures board. Post now, or schedule it: the post
// DEPARTS 18:00 and is SCHEDULED (TikTok-side scheduling runs from 15 minutes
// to 10 days ahead); the NOW clock races forward to 18:00, the status flips to
// BOARDING and only then does the @alice capsule launch. Each flap is a clack
// in the score. The parcel rides in and boards the capsule.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { clamp, lerp, smooth, easeOutExpo, easeInOutCubic, easeOutCubic, easeInCubic, easeInOutQuint, spring, hit, hits, fbm1, rng, boardFlips } from '../engine/util.js';
import { makeCanvas, tex, FONT, COLOR, roundRect } from '../engine/canvas.js';
import { PARCEL, LANE_COLORS, makeParcel, makeConveyor, makeFloor, makeCeiling, floorLine, metal, Burst, v3 } from '../engine/props.js';

const GLYPHS = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.:+-@';
const GW = 160, GH = 224, GCOLS = 8;
const CW = 0.3, CH = 0.44, GAP = 0.035;
const BOARD_Y = 2.75;

function atlas() {
  const rows = Math.ceil(GLYPHS.length / GCOLS);
  const c = makeCanvas(GW * GCOLS, GH * rows);
  const x = c.getContext('2d');
  for (let i = 0; i < GLYPHS.length; i++) {
    const gx = (i % GCOLS) * GW, gy = Math.floor(i / GCOLS) * GH;
    const g = x.createLinearGradient(0, gy, 0, gy + GH);
    g.addColorStop(0, '#202329'); g.addColorStop(0.49, '#16181d'); g.addColorStop(0.51, '#121418'); g.addColorStop(1, '#1b1e23');
    x.fillStyle = g; x.fillRect(gx, gy, GW, GH);
    x.font = `800 176px ${FONT.ui}`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = '#f2efe6';
    x.fillText(GLYPHS[i], gx + GW / 2, gy + GH / 2 + 8);
    x.fillStyle = 'rgba(0,0,0,0.85)'; x.fillRect(gx, gy + GH / 2 - 2, GW, 4);
  }
  const t = tex(c);
  t.generateMipmaps = true;
  return { t, rows };
}

export default function createBoard(ctx) {
  const { TL } = ctx;
  const C = TL.cues;
  const FL = TL.flap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07080d);
  scene.fog = new THREE.FogExp2(0x07080d, 0.05);
  scene.environment = ctx.envTex;
  scene.environmentIntensity = 0.25;
  const camera = new THREE.PerspectiveCamera(34, ctx.aspect, 0.05, 100);

  scene.add(new THREE.HemisphereLight(0x3a4a6a, 0x050608, 0.5));
  const key = new THREE.DirectionalLight(0xe8eeff, 1.2);
  key.position.set(-3, 8, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 0.5, far: 30 });
  scene.add(key);
  const spots = [-2.2, 0, 2.2].map((x) => {
    const s = new THREE.SpotLight(0xffe2b8, 5, 8, 0.6, 0.6, 1.5);
    s.position.set(x, 0.9, 2.2);
    s.target.position.set(x, BOARD_Y, 0);
    scene.add(s, s.target);
    return s;
  });
  const rimC = new THREE.PointLight(LANE_COLORS[0], 12, 10, 1.4);
  rimC.position.set(-4.2, 3.2, 1.2);
  scene.add(rimC);
  const rimM = new THREE.PointLight(LANE_COLORS[1], 12, 10, 1.4);
  rimM.position.set(4.6, 2.2, 1.5);
  scene.add(rimM);

  scene.add(makeFloor(260, 0x6f757e));
  // back wall
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(60, 14), new THREE.MeshStandardMaterial({ color: 0x15181e, roughness: 0.85, metalness: 0.2 }));
  wall.position.set(0, 7, -0.6);
  wall.receiveShadow = true;
  scene.add(wall);
  scene.add(makeCeiling({ x0: -20, x1: 20, zs: [5.5], y: 7.5, spacing: 5 }));
  scene.add(floorLine(-20, 20, 2.2, 0.08));

  // ---------------- board housing + printed labels
  const BW = 6.3, BH = 3.15;
  const housing = new THREE.Mesh(new RoundedBoxGeometry(BW, BH, 0.3, 3, 0.05), new THREE.MeshStandardMaterial({ color: 0x0c0e12, roughness: 0.45, metalness: 0.6 }));
  housing.position.set(0, BOARD_Y, -0.2);
  housing.castShadow = housing.receiveShadow = true;
  scene.add(housing);
  for (const sx of [-1, 1]) {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 7.5 - BOARD_Y - BH / 2, 8), metal(0x8a8f98, 0.3, 0.9));
    rod.position.set(sx * (BW / 2 - 0.4), (7.5 + BOARD_Y + BH / 2) / 2, -0.2);
    scene.add(rod);
  }
  const LABEL_X = -BW / 2 + 0.35;
  const CELLS_X = -BW / 2 + 2.85;
  const NOW_X = BW / 2 - 0.35 - 5 * (CW + GAP) + GAP;
  const rowY = { title: 1.12, file: 0.58, departs: 0.0, status: -0.56, note: -1.1 };
  function printed(text, w, h, x, y, { size = 120, color = '#9aa6bb', weight = 700, font = FONT.mono, align = 'left', letter = 6 } = {}) {
    const cw = 2048, chh = Math.round(2048 * h / w);
    const c = makeCanvas(cw, chh);
    const xx = c.getContext('2d');
    xx.font = `${weight} ${size * 2}px ${font}`; xx.fillStyle = color; xx.textBaseline = 'middle'; xx.textAlign = align;
    if ('letterSpacing' in xx) xx.letterSpacing = `${letter}px`;
    xx.fillText(text, align === 'left' ? 6 : align === 'right' ? cw - 6 : cw / 2, chh / 2 + 4);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex(c), transparent: true, toneMapped: false, color: new THREE.Color(0.95, 0.95, 0.95) }));
    m.position.set(x + (align === 'left' ? w / 2 : align === 'right' ? -w / 2 : 0), BOARD_Y + y, -0.04);
    scene.add(m);
    return m;
  }
  printed('DEPARTURES', 3.0, 0.36, LABEL_X, rowY.title, { size: 128, color: '#ffb347', weight: 800, font: FONT.ui, letter: 10 });
  printed('NOW', 1.0, 0.4, NOW_X - 0.08, rowY.title, { size: 200, color: '#9aa6bb', align: 'right' });
  printed('clip.mp4  ·  @alice  ·  "Hello #fyp"', 5.4, 0.26, LABEL_X, rowY.file, { size: 42, color: '#d8e2f0', weight: 600, letter: 1 });
  printed('DEPARTS', 2.2, 0.3, LABEL_X, rowY.departs, { size: 120 });
  printed('STATUS', 2.2, 0.3, LABEL_X, rowY.status, { size: 120 });
  printed('SCHEDULE ANY TIME 15 MIN TO 10 DAYS AHEAD', 5.6, 0.2, LABEL_X, rowY.note, { size: 35, color: '#8a96ab', weight: 600, letter: 2 });
  // divider rules
  for (const y of [0.86, 0.3, -0.28, -0.84]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(BW - 0.5, 0.008), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.12, 0.13, 0.16) }));
    m.position.set(0, BOARD_Y + y, -0.045);
    scene.add(m);
  }

  // ---------------- flap cells
  const { t: atlasTex, rows: AROWS } = atlas();
  const flapMat = new THREE.MeshStandardMaterial({ map: atlasTex, emissiveMap: atlasTex, emissive: new THREE.Color(0.09, 0.09, 0.09), roughness: 0.5, metalness: 0.1, side: THREE.FrontSide });
  const gi = (ch) => Math.max(0, GLYPHS.indexOf(ch));
  const guv = (ch) => {
    const i = gi(ch);
    const u0 = (i % GCOLS) / GCOLS, u1 = u0 + 1 / GCOLS;
    const r = Math.floor(i / GCOLS);
    const v1 = 1 - r / AROWS, v0 = v1 - 1 / AROWS;
    return { u0, u1, v0, v1, vm: (v0 + v1) / 2 };
  };
  const setUV = (mesh, arr) => { const a = mesh.geometry.attributes.uv; a.array.set(arr); a.needsUpdate = true; };
  const topUV = (ch) => { const g = guv(ch); return [g.u0, g.v1, g.u1, g.v1, g.u0, g.vm, g.u1, g.vm]; };
  const botUV = (ch) => { const g = guv(ch); return [g.u0, g.vm, g.u1, g.vm, g.u0, g.v0, g.u1, g.v0]; };
  const backUV = (ch) => { const g = guv(ch); return [g.u1, g.v0, g.u0, g.v0, g.u1, g.vm, g.u0, g.vm]; };

  function makeCell(x, y) {
    const g = new THREE.Group();
    g.position.set(x, BOARD_Y + y, -0.03);
    const plane = () => new THREE.Mesh(new THREE.PlaneGeometry(CW, CH / 2 - 0.004), flapMat);
    const top = plane(); top.position.y = CH / 4 + 0.002;
    const bot = plane(); bot.position.y = -CH / 4 - 0.002;
    const pivot = new THREE.Group();
    const front = plane(); front.position.set(0, CH / 4 + 0.002, 0.004);
    const back = plane(); back.position.set(0, CH / 4 + 0.002, 0.003); back.rotation.y = Math.PI;
    pivot.add(front, back);
    pivot.position.z = 0.002;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(CW + 0.02, CH + 0.02, 0.02), new THREE.MeshStandardMaterial({ color: 0x050608, roughness: 0.6 }));
    frame.position.z = -0.012;
    g.add(frame, top, bot, pivot);
    scene.add(g);
    return { g, top, bot, pivot, front, back };
  }
  // Fields and their flips, resolved once (which cells change, when each change lands).
  const FIELDS = TL.boardFields;
  const flips = boardFlips(FIELDS, C.flips, FL);
  const fields = {};
  for (const [name, f] of Object.entries(FIELDS)) {
    const x0 = name === 'now' ? NOW_X : CELLS_X;
    const init = (f.init || '').padEnd(f.cells, ' ');
    fields[name] = Array.from({ length: f.cells }, (_, i) => ({ ...makeCell(x0 + CW / 2 + i * (CW + GAP), rowY[name === 'now' ? 'title' : name]), init: init[i], segs: [] }));
  }
  for (const fl of flips) {
    const r = rng(fl.t * 100);
    for (const i of fl.changed) {
      const seq = [fl.prev[i]];
      for (let k = 1; k < FL.cycles; k++) seq.push(GLYPHS[1 + Math.floor(r() * (GLYPHS.length - 1))]);
      seq.push(fl.next[i]);
      fields[fl.field][i].segs.push({ start: fl.t + i * FL.stagger, seq });
    }
  }
  const showChar = (cell, ch) => { setUV(cell.top, topUV(ch)); setUV(cell.bot, botUV(ch)); cell.pivot.visible = false; };
  function updateCell(cell, t) {
    let seg = null;
    for (const sg of cell.segs) if (t >= sg.start) seg = sg;
    if (!seg) { showChar(cell, cell.init); return; }
    const n = seg.seq.length - 1;
    const e = (t - seg.start) / FL.flipDur;
    if (e >= n) { showChar(cell, seg.seq[n]); return; }
    const k = Math.floor(e), ph = e - k;
    const A = seg.seq[k], Bc = seg.seq[k + 1];
    setUV(cell.top, topUV(Bc));
    setUV(cell.bot, botUV(A));
    setUV(cell.front, topUV(A));
    setUV(cell.back, backUV(Bc));
    cell.pivot.visible = true;
    cell.pivot.rotation.x = -Math.PI * easeInCubic(ph) * 0.999;
  }
  // status lamp: amber once scheduled, green once boarding
  const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.07, 24), new THREE.MeshBasicMaterial({ toneMapped: false, color: new THREE.Color(0.1, 0.1, 0.1) }));
  lamp.position.set(CELLS_X + FIELDS.status.cells * (CW + GAP) + 0.16, BOARD_Y + rowY.status, -0.03);
  scene.add(lamp);
  const statusFlips = flips.filter((f) => f.field === 'status');

  // foreground pillar: parallax as the camera trucks
  const pillar = new THREE.Mesh(new RoundedBoxGeometry(0.5, 9, 0.5, 2, 0.04), metal(0x14171c, 0.45, 0.7));
  pillar.position.set(-4.6, 4.5, 3.3);
  pillar.castShadow = true;
  scene.add(pillar);
  const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.9), new THREE.MeshStandardMaterial({ map: (() => { const c = makeCanvas(128, 256); const x = c.getContext('2d'); for (let i = -256; i < 256; i += 48) { x.fillStyle = '#c9a227'; x.beginPath(); x.moveTo(0, i); x.lineTo(128, i + 128); x.lineTo(128, i + 152); x.lineTo(0, i + 24); x.fill(); } return tex(c); })(), roughness: 0.8 }));
  stripe.position.set(-4.6, 1.0, 3.551);
  scene.add(stripe);

  // ---------------- pneumatic tube + capsule
  const TUBE_X = BW / 2 + 0.75;
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 9, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.14, roughness: 0.05, metalness: 0.1, side: THREE.DoubleSide, depthWrite: false }));
  tube.position.set(TUBE_X, 4.5 + 0.6, 0.35);
  scene.add(tube);
  for (const y of [0.7, 1.9, 3.1, 4.3, 5.5, 6.7]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.025, 10, 40), new THREE.MeshStandardMaterial({ color: 0xb8893a, roughness: 0.3, metalness: 1 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(TUBE_X, y, 0.35);
    scene.add(ring);
  }
  const capsule = new THREE.Group();
  const capBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.36, 8, 24), new THREE.MeshStandardMaterial({ color: 0x1c2733, roughness: 0.25, metalness: 0.8 }));
  capsule.add(capBody);
  const capBand = new THREE.Mesh(new THREE.CylinderGeometry(0.152, 0.152, 0.08, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 1.6, 1.6), toneMapped: false }));
  capsule.add(capBand);
  {
    const c = makeCanvas(256, 128);
    const x = c.getContext('2d');
    x.font = `800 64px ${FONT.mono}`; x.fillStyle = '#25f4ee'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('@alice', 128, 66);
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.13), new THREE.MeshBasicMaterial({ map: tex(c), transparent: true, toneMapped: false }));
    tag.position.set(0, 0.17, 0.155);
    capsule.add(tag);
  }
  capsule.position.set(TUBE_X, 0.95, 0.35);
  scene.add(capsule);
  const streak = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.02, 1, 16, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.35, 1.8, 1.8), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  scene.add(streak);
  const puff = new Burst(80, {
    color: new THREE.Color(0.7, 0.75, 0.8), size: 0.1, gravity: 0.3, drag: 3, additive: false, seed: 404, opacity: 0.4,
    spawn: (k, r) => { const a = r() * Math.PI * 2, sp = 0.8 + r() * 2; return { p0: v3(TUBE_X, 0.7, 0.35), v0: v3(Math.cos(a) * sp, 0.2 + r() * 0.6, Math.sin(a) * sp), life: 0.8 + r() * 0.6, fade: 2 }; },
  });
  scene.add(puff.points);

  // the parcel riding in on a belt and into the capsule
  const belt = makeConveyor(-9, TUBE_X - 0.3, 0.35, LANE_COLORS[0], { width: 0.6 });
  belt.group.position.y = -0.1;
  scene.add(belt.group);
  const MINI = 0.42;
  const parcel = makeParcel(TL.accounts[0], 11);
  parcel.scale.setScalar(MINI);
  scene.add(parcel);

  // ---------------- update
  const T0 = C.board;
  // when each cascade's last flap lands
  const flipEnds = flips.filter((f) => f.changed.length).map((f) => f.end);
  function update(t, fx, hud) {
    for (const f of Object.values(fields)) for (const c of f) updateCell(c, t);
    const sched = t >= statusFlips[0].end, boarding = t >= statusFlips[statusFlips.length - 1].end;
    if (boarding) lamp.material.color.setRGB(0.5, 4, 1.8);
    else if (sched) lamp.material.color.setRGB(3.2, 1.8, 0.3);
    else lamp.material.color.setRGB(0.08, 0.08, 0.08);

    // parcel: rides in, slides into the capsule
    const ex = lerp(-3.5, TUBE_X - 0.25, smooth(clamp((t - T0) / 4.45)));
    parcel.visible = t < C.tube - 0.15;
    parcel.position.set(ex, 0.8 + PARCEL.h * MINI / 2, 0.35);
    parcel.scale.setScalar(MINI);
    if (t > C.tube - 0.5) { const k = easeInCubic(clamp((t - (C.tube - 0.5)) / 0.35)); parcel.position.x = lerp(ex, TUBE_X, k); parcel.position.y += k * 0.15; parcel.scale.setScalar(MINI * (1 - k * 0.6)); }
    belt.setTravel(t * 1.2);
    belt.light((x) => 0.2 + 0.15 * Math.sin(x * 3 - t * 9));

    // capsule launch
    const la = t - C.tube;
    const capY = la < 0 ? 0.95 : 0.95 + 0.5 * 40 * la * la + 1.5 * la;
    capsule.position.y = capY;
    const lh = hit(t, C.tube, 0.3);
    capBand.material.color.setRGB(0.2 + lh * 1.2, 1.6 + lh * 1.6, 1.6 + lh * 1.6);
    streak.visible = la > 0 && la < 0.9;
    if (streak.visible) {
      const len = Math.min(capY - 0.7, 5);
      streak.scale.set(1, len, 1);
      streak.position.set(TUBE_X, capY - len / 2 - 0.2, 0.35);
      streak.material.opacity = 1 - clamp(la / 0.9);
    }
    puff.points.visible = la >= 0 && la < 1.5;
    if (puff.points.visible) puff.update(la);

    // camera: whip in, push toward each row as it flips, tilt up with the capsule
    const rows = [[T0, rowY.departs], ...flips.slice(1).map((f) => [f.t - 0.25, rowY[f.field === 'now' ? 'title' : f.field]])];
    let ly = rowY.departs;
    for (let i = 0; i < rows.length; i++) {
      if (t >= rows[i][0]) {
        const prev = i ? rows[i - 1][1] : rowY.departs + 0.3;
        ly = lerp(prev, rows[i][1], easeInOutCubic(clamp((t - rows[i][0]) / 0.6)));
      }
    }
    const push = smooth(clamp((t - T0) / 4.5));
    let p = v3(lerp(-2.5, -0.7, push), lerp(1.7, 2.05, push), lerp(7.4, 6.3, push));
    let l = v3(lerp(-1.1, 0.25, push), BOARD_Y + ly * 0.12 + 0.36, 0);
    let fov = 34;
    const board = easeInOutCubic(clamp((t - (C.tube - 0.45)) / 0.42));
    if (board > 0) {
      const bp = v3(TUBE_X - 2.1, 1.55, 3.0);
      p = p.lerp(bp, board);
      l = l.lerp(v3(TUBE_X - 0.3, 1.0, 0.35), board);
    }
    const up = easeInOutQuint(clamp((t - (C.tube - 0.05)) / 0.75));
    if (up > 0) {
      l = l.lerp(v3(TUBE_X, Math.min(capY, 4.5) + 0.6, 0.35), up);
      fov = lerp(34, 40, up);
    }
    p.x += fbm1(t * 0.5) * 0.03; p.y += fbm1(t * 0.4 + 2) * 0.02;
    camera.position.copy(p);
    camera.up.set(0, 1, 0);
    camera.lookAt(l);
    const win = 1 - clamp((t - T0) / 0.35);
    if (win > 0) camera.rotateY(easeInCubic(win) * 0.7);
    camera.rotateZ(-0.02 * (1 - push));
    camera.fov = fov;
    camera.updateProjectionMatrix();

    fx.bloom = { strength: 0.6, radius: 0.45, threshold: 0.85 };
    fx.dof = { focus: camera.position.distanceTo(v3(0.6, BOARD_Y + ly, 0)), aperture: 0.06, maxBlur: 10 };
    fx.ca = 1 + hits(t, flipEnds, 0.15) * 4 + hit(t, C.tube, 0.3) * 8;
    fx.shake = hit(t, C.tube, 0.35) * 1.0 + hits(t, flipEnds, 0.12) * 0.3;
    if (win > 0) fx.blur = [easeOutCubic(win) * 0.12, 0];
    if (la > 0) fx.blur = [0, -easeInCubic(clamp((t - (C.tube + 0.3)) / 0.7)) * 0.12];
    if (t > C.drop - 0.4) fx.blur = [0, -easeInCubic(clamp((t - (C.drop - 0.4)) / 0.4)) * 0.18];
    hud.header('Post now, or schedule it.', t, C.board + 0.9, C.tube - 0.5);
    return camera;
  }
  return { start: C.board, scene, update };
}
