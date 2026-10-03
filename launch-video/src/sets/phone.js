// Shots 5-6: delivered. The capsule drops into alice's phone dock, the screen
// ignites with the post, and a fingertip taps #fyp, which lights as a link.
// Then the camera pulls back: two more docks, and the command floating above
// them; its -u name rolls to bob, then cara, and each phone receives its own
// post. Ends pushing into alice's screen (match cut into the grid).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { clamp, lerp, smooth, easeOutExpo, easeInOutCubic, easeOutCubic, easeInCubic, easeInExpo, spring, hit, hits, fbm1, camPath } from '../engine/util.js';
import { makeCanvas, tex, FONT, COLOR, roundRect } from '../engine/canvas.js';
import { LANE_COLORS, makeFloor, makeRacks, makeCeiling, makeShaft, metal, signMesh, v3 } from '../engine/props.js';

export const PHONE = { w: 0.5, h: 1.04, d: 0.05, sw: 0.46, sh: 1.0 };
const SW = 540, SH = 1174;

function heart(x, cx, cy, s) {
  x.beginPath();
  x.moveTo(cx, cy + s * 0.35);
  x.bezierCurveTo(cx - s * 0.9, cy - s * 0.2, cx - s * 0.45, cy - s * 0.85, cx, cy - s * 0.35);
  x.bezierCurveTo(cx + s * 0.45, cy - s * 0.85, cx + s * 0.9, cy - s * 0.2, cx, cy + s * 0.35);
  x.fill();
}

// The posted video, drawn live. Shared with the grid shot.
export function drawPost(x, t, TL, { tapAt = Infinity, ignite = 1, user = 'alice', seed = 0 } = {}) {
  const W = SW, H = SH;
  x.save();
  x.clearRect(0, 0, W, H);
  roundRect(x, 0, 0, W, H, 52); x.clip();
  x.fillStyle = '#05060a'; x.fillRect(0, 0, W, H);
  if (ignite <= 0) { x.restore(); return; }
  x.globalAlpha = ignite;
  // "clip.mp4": drifting colour fields and a beat-synced equaliser
  const beat = t * 2;
  const g = x.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#1b0b2e'); g.addColorStop(1, '#03161c');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.globalCompositeOperation = 'lighter';
  const blobs = [[COLOR.magenta, 0.3, 0.32, 0.7], [COLOR.cyan, 0.72, 0.55, 0.9], ['#7b5cff', 0.45, 0.78, 1.1]];
  for (const [c, bx, by, sp] of blobs) {
    const cx = W * (bx + 0.15 * Math.sin(t * sp + bx * 9 + seed)), cy = H * (by + 0.08 * Math.cos(t * sp * 1.3 + by * 7 + seed));
    const r = W * (0.55 + 0.08 * Math.sin(beat * Math.PI));
    const rg = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    rg.addColorStop(0, c + 'aa'); rg.addColorStop(1, c + '00');
    x.fillStyle = rg; x.fillRect(0, 0, W, H);
  }
  x.globalCompositeOperation = 'source-over';
  // equaliser
  const n = 14;
  for (let i = 0; i < n; i++) {
    const ph = (beat % 1);
    const hgt = 60 + 180 * Math.abs(Math.sin(i * 1.7 + Math.floor(beat) * 2.3)) * (1 - ph * 0.6);
    x.fillStyle = 'rgba(255,255,255,0.55)';
    roundRect(x, 70 + i * 28, H * 0.45 - hgt / 2, 12, hgt, 6); x.fill();
  }
  // right rail icons
  x.fillStyle = 'rgba(255,255,255,0.95)';
  heart(x, W - 58, H * 0.56, 46);
  x.beginPath(); x.ellipse(W - 58, H * 0.66, 30, 25, 0, 0, Math.PI * 2); x.fill();
  x.beginPath(); x.moveTo(W - 70, H * 0.66 + 18); x.lineTo(W - 80, H * 0.66 + 36); x.lineTo(W - 55, H * 0.66 + 22); x.fill();
  x.beginPath(); x.moveTo(W - 82, H * 0.77); x.lineTo(W - 46, H * 0.745); x.lineTo(W - 46, H * 0.795); x.closePath(); x.fill();
  x.beginPath(); x.arc(W - 58, H * 0.86, 26, 0, Math.PI * 2); x.fillStyle = '#1b1e25'; x.fill();
  x.strokeStyle = '#fff'; x.lineWidth = 5; x.stroke();
  // caption: @user, "Hello #fyp" with a live tag
  const shade = x.createLinearGradient(0, H * 0.72, 0, H);
  shade.addColorStop(0, 'rgba(0,0,0,0)'); shade.addColorStop(1, 'rgba(0,0,0,0.65)');
  x.fillStyle = shade; x.fillRect(0, H * 0.72, W, H * 0.28);
  x.font = `800 56px ${FONT.ui}`; x.fillStyle = '#fff'; x.textBaseline = 'alphabetic';
  x.fillText(`@${user}`, 34, H - 170);
  x.font = `500 60px ${FONT.ui}`;
  x.fillText('Hello ', 34, H - 96);
  const hw = x.measureText('Hello ').width;
  x.font = `800 60px ${FONT.ui}`;
  const tw = x.measureText('#fyp').width;
  const tk = easeOutExpo(clamp((t - tapAt) / 0.3));
  if (tk > 0) {
    x.fillStyle = `rgba(37,244,238,${0.92 * tk})`;
    roundRect(x, 34 + hw - 12, H - 96 - 58, tw + 24, 78, 16); x.fill();
  }
  x.fillStyle = tk > 0.5 ? '#012624' : '#ffffff';
  x.fillText('#fyp', 34 + hw, H - 96);
  if (tk < 0.5) x.fillRect(34 + hw, H - 86, tw, 5);
  // a fingertip presses the tag, then ripples
  const cx = 34 + hw + tw / 2, cy = H - 112;
  const pa = t - (tapAt - 0.35);
  if (pa > 0 && pa < 0.75) {
    const inK = easeOutCubic(clamp(pa / 0.3)), outK = clamp((pa - 0.45) / 0.3);
    const r = lerp(70, 44, inK) * (1 + outK * 0.3);
    x.save();
    x.globalAlpha = (1 - outK) * 0.85;
    x.shadowColor = 'rgba(0,0,0,0.5)'; x.shadowBlur = 30;
    x.fillStyle = 'rgba(255,255,255,0.55)';
    x.beginPath(); x.arc(cx, cy + (1 - inK) * 40, r, 0, 7); x.fill();
    x.restore();
  }
  const ta = t - tapAt;
  if (ta >= 0 && ta < 0.8) {
    for (const [d, w] of [[0, 8], [0.12, 5]]) {
      const a = ta - d;
      if (a < 0) continue;
      x.strokeStyle = `rgba(37,244,238,${1 - a / 0.68})`; x.lineWidth = w;
      x.beginPath(); x.arc(cx, cy, 30 + a * 380, 0, 7); x.stroke();
    }
  }
  // progress
  x.fillStyle = 'rgba(255,255,255,0.25)'; x.fillRect(0, H - 8, W, 8);
  x.fillStyle = '#fff'; x.fillRect(0, H - 8, W * ((t * 0.12 + seed * 0.3) % 1), 8);
  x.restore();
}

export function makePhoneBody() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(PHONE.w, PHONE.h, PHONE.d, 6, 0.055), new THREE.MeshStandardMaterial({ color: 0x23262c, roughness: 0.28, metalness: 0.9 }));
  body.castShadow = true;
  g.add(body);
  const glass = new THREE.Mesh(new RoundedBoxGeometry(PHONE.w - 0.012, PHONE.h - 0.012, 0.004, 4, 0.05), new THREE.MeshStandardMaterial({ color: 0x020203, roughness: 0.05, metalness: 0.3 }));
  glass.position.z = PHONE.d / 2;
  g.add(glass);
  return g;
}

export default function createPhone(ctx) {
  const { TL } = ctx;
  const C = TL.cues;
  const D = C.drop;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07080d);
  scene.fog = new THREE.FogExp2(0x07080d, 0.07);
  scene.environment = ctx.envTex;
  scene.environmentIntensity = 0.3;
  const camera = new THREE.PerspectiveCamera(34, ctx.aspect, 0.02, 100);

  const hemi = new THREE.HemisphereLight(0x3a4a6a, 0x050608, 0.4);
  scene.add(hemi);
  const key = new THREE.SpotLight(0xe8eeff, 30, 14, 0.5, 0.5, 1.2);
  key.position.set(-1.5, 6, 2.5);
  key.target.position.set(0, 1, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key, key.target);
  const rimC = new THREE.PointLight(LANE_COLORS[0], 6, 6, 1.4);
  rimC.position.set(-1.4, 1.8, -0.8);
  scene.add(rimC);
  const rimM = new THREE.PointLight(LANE_COLORS[1], 6, 6, 1.4);
  rimM.position.set(1.4, 1.2, -0.8);
  scene.add(rimM);

  scene.add(makeFloor(260, 0x6a707a));
  scene.add(makeRacks({ x0: -20, x1: 20, z: -8, seed: 31 }));
  scene.add(makeRacks({ x0: -20, x1: 20, z: 9, seed: 32, facing: -1 }));
  scene.add(makeCeiling({ x0: -20, x1: 20, zs: [-3, 5], y: 7.5, spacing: 5 }));
  { const s = makeShaft(0.3, 1.6, 7.4, 0xbcd0ff, 0.06); s.position.set(-0.2, 3.75, 0.2); scene.add(s); }

  // ---------------- three docks: alice (centre), bob (left), cara (right)
  const ACC = TL.accounts;
  const PH_Y = 0.7 + PHONE.h / 2 + 0.02;
  const slots = [
    { x: 0, z: 0, ry: 0, drop: C.drop, user: ACC[0], color: LANE_COLORS[0] },
    { x: -1.35, z: -0.3, ry: 0.28, drop: C.drops[0], user: ACC[1], color: LANE_COLORS[1] },
    { x: 1.35, z: -0.3, ry: -0.28, drop: C.drops[1], user: ACC[2], color: LANE_COLORS[2] },
  ];
  const ringRGB = (c, k) => [c.r * (2.5 + k * 5), c.g * (2.5 + k * 5), c.b * (2.5 + k * 5)];
  for (const [i, s] of slots.entries()) {
    const root = new THREE.Group();
    root.position.set(s.x, 0, s.z);
    root.rotation.y = s.ry;
    scene.add(root);
    const dock = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 0.7, 48), metal(0x1a1d23, 0.35, 0.85));
    dock.position.y = 0.35;
    dock.castShadow = dock.receiveShadow = true;
    root.add(dock);
    s.ring = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.012, 8, 64), new THREE.MeshBasicMaterial({ toneMapped: false, color: new THREE.Color(...ringRGB(s.color, 0)) }));
    s.ring.rotation.x = Math.PI / 2; s.ring.position.y = 0.705;
    root.add(s.ring);
    s.phone = makePhoneBody();
    s.phone.position.set(0, PH_Y, 0);
    root.add(s.phone);
    s.canvas = makeCanvas(SW, SH);
    s.cx = s.canvas.getContext('2d');
    s.tex = tex(s.canvas);
    s.screen = new THREE.Mesh(new THREE.PlaneGeometry(PHONE.sw, PHONE.sh), new THREE.MeshBasicMaterial({ map: s.tex, transparent: true, toneMapped: false }));
    s.screen.position.z = PHONE.d / 2 + 0.0035;
    s.phone.add(s.screen);
    // tube from above into the dock, behind the phone
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 7, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.14, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false }));
    tube.position.set(0, 0.7 + 3.5, -0.32);
    root.add(tube);
    s.capsule = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.2, 8, 16), new THREE.MeshBasicMaterial({ toneMapped: false, color: s.color.clone().multiplyScalar(3).addScalar(0.4) }));
    root.add(s.capsule);
    s.glow = new THREE.PointLight(0x9ad8ff, 0, 4, 1.6);
    s.glow.position.set(0, 1.25, 0.6);
    root.add(s.glow);
    // floor light rings
    s.waves = [0, 1].map((k) => {
      const w = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 128), new THREE.MeshBasicMaterial({ color: k ? new THREE.Color(3, 0.3, 0.8) : new THREE.Color(0.4, 3, 3), transparent: true, toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending }));
      w.rotation.x = -Math.PI / 2; w.position.y = 0.01 + k * 0.001;
      root.add(w);
      return w;
    });
    s.big = i === 0;
  }
  const hero = slots[0];

  // ---------------- the command, floating above the docks; its -u name rolls
  const CMD_W = 2400, CMD_H = 230;
  const cmdCanvas = makeCanvas(CMD_W, CMD_H);
  const cmdX = cmdCanvas.getContext('2d');
  const cmd = signMesh(cmdCanvas, 3.6, 3.6 * CMD_H / CMD_W, { glow: 1.0 });
  cmd.position.set(0, 2.3, -0.1);
  scene.add(cmd);
  const userAt = (t) => {
    // which name is showing and the roll progress into it
    let i = 0;
    for (let k = 0; k < C.rolls.length; k++) if (t >= C.rolls[k]) i = k + 1;
    const k = i > 0 ? easeOutExpo(clamp((t - C.rolls[i - 1]) / 0.28)) : 1;
    return { i, k };
  };
  function drawCommand(t) {
    const x = cmdX;
    x.clearRect(0, 0, CMD_W, CMD_H);
    x.fillStyle = 'rgba(8,11,17,0.88)'; roundRect(x, 4, 4, CMD_W - 8, CMD_H - 8, 40); x.fill();
    x.strokeStyle = 'rgba(255,255,255,0.16)'; x.lineWidth = 4; roundRect(x, 4, 4, CMD_W - 8, CMD_H - 8, 40); x.stroke();
    x.textBaseline = 'middle';
    const F = 68;
    const Y = CMD_H / 2 + 4;
    let cx = 70;
    const put = (s, color, weight = 500) => { x.font = `${weight} ${F}px ${FONT.mono}`; x.fillStyle = color; x.fillText(s, cx, Y); cx += x.measureText(s).width; };
    put('$ ', COLOR.green);
    put('autotok ', '#ffffff', 700);
    put('upload ', COLOR.cyan);
    put('-u ', '#8892a6');
    // the account name, in a slot that rolls
    const { i, k } = userAt(t);
    x.font = `700 ${F}px ${FONT.mono}`;
    const slotW = x.measureText('alice').width + 40;
    const sx = cx - 12;
    const col = slots[i].color;
    const css = `rgb(${Math.round(col.r * 255)},${Math.round(col.g * 255)},${Math.round(col.b * 255)})`;
    x.save();
    // a dark slot with the account's colour as its outline; the name stays bright
    x.fillStyle = '#05070b'; roundRect(x, sx, Y - F * 0.72, slotW, F * 1.4, 14); x.fill();
    x.strokeStyle = css; x.lineWidth = 5 + 6 * hit(t, i > 0 ? C.rolls[i - 1] : -9, 0.4);
    roundRect(x, sx, Y - F * 0.72, slotW, F * 1.4, 14); x.stroke();
    x.beginPath(); x.rect(sx, Y - F * 0.72, slotW, F * 1.4); x.clip();
    const name = (j) => slots[j].user;
    // the account colour lifted toward white so it reads on the dark slot
    const cssOf = (j) => { const c = slots[j].color.clone().lerp(new THREE.Color(1, 1, 1), 0.3); return `rgb(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)})`; };
    if (i > 0 && k < 1) {
      x.fillStyle = cssOf(i - 1); x.fillText(name(i - 1), sx + 20, Y - k * F * 1.4);
      x.fillStyle = cssOf(i); x.fillText(name(i), sx + 20, Y + (1 - k) * F * 1.4);
    } else {
      x.fillStyle = cssOf(i); x.fillText(name(i), sx + 20, Y);
    }
    x.restore();
    cx = sx + slotW + 12;
    put(' -v ', '#8892a6');
    put('clip.mp4 ', '#e8edf5');
    put('-t ', '#8892a6');
    put('"Hello #fyp"', COLOR.amber);
    cmd.material.map.needsUpdate = true;
  }

  function update(t, fx, hud) {
    // posts
    for (const s of slots) {
      const ig = t < s.drop ? 0 : smooth(clamp((t - s.drop) / 0.12));
      drawPost(s.cx, t, TL, { tapAt: s.big ? C.tap : Infinity, ignite: ig, user: s.user, seed: s.big ? 0 : s.x });
      s.tex.needsUpdate = true;
      const flash = hit(t, s.drop, 0.25);
      s.screen.material.color.setScalar((s.big ? 0.82 : 0.78) + flash * 2.5);
      s.glow.intensity = ig * (2.0 + flash * (s.big ? 15 : 8));
      s.ring.material.color.setRGB(...ringRGB(s.color, flash));
      // capsule drop (arrives exactly on the drop)
      const ca = (s.drop - t) / 0.35;
      s.capsule.visible = ca > 0 && ca < 1;
      s.capsule.position.set(0, 0.75 + ca * ca * 6, -0.32);
      const wa = t - s.drop;
      s.waves.forEach((w, i) => {
        const a = wa - i * 0.12;
        w.visible = a > 0 && a < 1.6;
        if (w.visible) { const r = 0.6 + easeOutCubic(a / 1.6) * (s.big ? 22 : 9); w.scale.setScalar(r); w.material.opacity = (1 - a / 1.6) * (s.big ? 0.9 : 0.7); }
      });
    }
    const flashA = hit(t, C.drop, 0.25);
    const flashB = hits(t, C.drops, 0.25);
    rimC.intensity = 6 + flashA * 20 + flashB * 6; rimM.intensity = 6 + flashA * 20 + flashB * 6;

    // the floating command: in with the pull-back
    // in once the pull-back has settled, a beat before the first roll
    const ck = smooth(clamp((t - (C.accounts + 0.95)) / 0.35));
    cmd.visible = ck > 0;
    if (cmd.visible) {
      drawCommand(t);
      cmd.material.opacity = ck;
      cmd.material.color.setScalar(0.95 + 0.6 * hits(t, C.rolls, 0.3));
      cmd.position.y = 2.3 + (1 - ck) * 0.15;
    }

    // camera: low 3/4, push onto the caption for the tap, pull back to all three, push into alice
    const k1 = easeOutCubic(clamp((t - D) / 2.2));
    const wide = { p: [0.0, 1.6, 4.5], l: [0, 1.5, 0], fov: 38 };
    const wide2 = { p: [0.05, 1.56, 4.2], l: [0, 1.48, 0], fov: 38 };
    const cp = camPath(t, [
      { t: D + 0.0, p: [-0.95, 0.6, 0.95], l: [0, 1.5, 0], fov: 42 },
      { t: D + 0.6, p: [-0.55, 0.92, 1.4], l: [-0.12, 1.22, 0], fov: 38 },
      { t: D + 1.15, p: [-0.3, 0.9, 0.98], l: [-0.08, 0.93, 0], fov: 34 },
      { t: D + 2.0, p: [0.12, 1.12, 1.45], l: [-0.02, 1.08, 0], fov: 34 },
      { t: C.accounts, p: [0.25, 1.25, 1.75], l: [0.0, 1.22, 0], fov: 34 },
      { t: C.accounts + 1.3, ...wide },
      { t: C.drops[1] + 0.9, ...wide2 },
    ]);
    let p = v3(...cp.p), l = v3(...cp.l);
    let fov = cp.fov;
    const pushStart = C.grid - 1.0;
    const push = easeInExpo(clamp((t - pushStart) / 1.0));
    if (push > 0) {
      p = p.lerp(v3(0, PH_Y, PHONE.d / 2 + 0.42), push);
      l = l.lerp(v3(0, PH_Y, 0), Math.min(1, push * 1.6));
      fov = lerp(fov, 34, push);
    }
    p.x += fbm1(t * 0.6) * 0.02; p.y += fbm1(t * 0.5 + 1) * 0.015;
    camera.position.copy(p);
    camera.up.set(0, 1, 0);
    camera.lookAt(l);
    camera.fov = fov;
    camera.updateProjectionMatrix();
    hero.phone.rotation.y = (1 - k1) * 0.12;

    const flash = flashA;
    fx.bloom = { strength: 0.8 + flash * 0.8, radius: 0.5, threshold: 0.8 };
    const wideK = smooth(clamp((t - C.accounts) / 1.3)) * (1 - push);
    const focusPt = v3(0, lerp(1.25, 1.5, wideK), 0);
    fx.dof = { focus: camera.position.distanceTo(focusPt), aperture: lerp(0.1, 0.05, wideK) * (1 - push), maxBlur: 12 };
    fx.ca = 1 + flash * 16 + hit(t, C.tap, 0.2) * 3 + flashB * 7 + hits(t, C.rolls, 0.2) * 2;
    fx.shake = flash * 2.2 + flashB * 0.9;
    fx.zoom = push * 0.06;
    fx.flash = [1, 1, 1, 0.5 * (1 - easeOutCubic(clamp((t - C.drop) / 0.16)))];
    const vin = 1 - clamp((t - C.drop) / 0.2);
    if (vin > 0) fx.blur = [0, -easeOutCubic(vin) * 0.16];
    fx.exposure = 1 + flash * 0.4 + flashB * 0.15;
    hud.header('Posted.', t, D + 0.3, C.accounts - 0.1);
    hud.header('Any account, by name.', t, C.accounts + 1.1, pushStart + 0.05);
    return camera;
  }
  return { start: C.drop, scene, update };
}
