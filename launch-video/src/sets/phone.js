// Shot 7: delivered. The capsule drops into a phone dock, the screen ignites
// with the post, #fyp is a live tag, and the CLI's own output line lands
// beside it. Ends pushing into the screen (match cut into the grid).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { clamp, lerp, smooth, easeOutExpo, easeInOutCubic, easeOutCubic, easeInCubic, easeInOutQuint, easeInExpo, spring, hit, hits, fbm1, rng, camPath } from '../engine/util.js';
import { makeCanvas, tex, FONT, COLOR, roundRect } from '../engine/canvas.js';
import { LANE_COLORS, makeFloor, makeRacks, makeCeiling, makeShaft, metal, Burst, v3 } from '../engine/props.js';

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
export function drawPost(x, t, TL, { tapAt = Infinity, ignite = 1 } = {}) {
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
    const cx = W * (bx + 0.15 * Math.sin(t * sp + bx * 9)), cy = H * (by + 0.08 * Math.cos(t * sp * 1.3 + by * 7));
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
  // caption: @alice, "Hello #fyp" with a live tag
  const shade = x.createLinearGradient(0, H * 0.72, 0, H);
  shade.addColorStop(0, 'rgba(0,0,0,0)'); shade.addColorStop(1, 'rgba(0,0,0,0.65)');
  x.fillStyle = shade; x.fillRect(0, H * 0.72, W, H * 0.28);
  x.font = `800 56px ${FONT.ui}`; x.fillStyle = '#fff'; x.textBaseline = 'alphabetic';
  x.fillText('@alice', 34, H - 170);
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
  x.fillStyle = '#fff'; x.fillRect(0, H - 8, W * ((t * 0.12) % 1), 8);
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
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07080d);
  scene.fog = new THREE.FogExp2(0x07080d, 0.09);
  scene.environment = ctx.envTex;
  scene.environmentIntensity = 0.3;
  const camera = new THREE.PerspectiveCamera(34, ctx.aspect, 0.02, 100);

  const hemi = new THREE.HemisphereLight(0x3a4a6a, 0x050608, 0.4);
  scene.add(hemi);
  const key = new THREE.SpotLight(0xe8eeff, 30, 12, 0.35, 0.5, 1.2);
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
  const screenGlow = new THREE.PointLight(0x9ad8ff, 0, 4, 1.6);
  screenGlow.position.set(0, 1.25, 0.6);
  scene.add(screenGlow);

  scene.add(makeFloor(260, 0x6a707a));
  scene.add(makeRacks({ x0: -20, x1: 20, z: -8, seed: 31 }));
  scene.add(makeRacks({ x0: -20, x1: 20, z: 9, seed: 32, facing: -1 }));
  scene.add(makeCeiling({ x0: -20, x1: 20, zs: [-3, 5], y: 7.5, spacing: 5 }));
  { const s = makeShaft(0.3, 1.6, 7.4, 0xbcd0ff, 0.06); s.position.set(-0.2, 3.75, 0.2); scene.add(s); }

  // dock + phone
  const dock = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 0.7, 48), metal(0x1a1d23, 0.35, 0.85));
  dock.position.y = 0.35;
  dock.castShadow = dock.receiveShadow = true;
  scene.add(dock);
  const dockRing = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.012, 8, 64), new THREE.MeshBasicMaterial({ toneMapped: false, color: new THREE.Color(0.3, 2.5, 2.5) }));
  dockRing.rotation.x = Math.PI / 2; dockRing.position.y = 0.705;
  scene.add(dockRing);
  const phone = makePhoneBody();
  phone.position.set(0, 0.7 + PHONE.h / 2 + 0.02, 0);
  scene.add(phone);
  const sc = makeCanvas(SW, SH);
  const sx = sc.getContext('2d');
  const stex = tex(sc);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(PHONE.sw, PHONE.sh), new THREE.MeshBasicMaterial({ map: stex, transparent: true, toneMapped: false }));
  screen.position.z = PHONE.d / 2 + 0.0035;
  phone.add(screen);
  // tube from above into the dock, behind the phone
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 7, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.14, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false }));
  tube.position.set(0, 0.7 + 3.5, -0.32);
  scene.add(tube);
  const capsule = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.2, 8, 16), new THREE.MeshBasicMaterial({ toneMapped: false, color: new THREE.Color(0.6, 3, 3) }));
  scene.add(capsule);

  // floor light wave
  const wave = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 128), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 3, 3), transparent: true, toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending }));
  wave.rotation.x = -Math.PI / 2; wave.position.y = 0.01;
  scene.add(wave);
  const wave2 = wave.clone(); wave2.material = wave.material.clone(); wave2.material.color.setRGB(3, 0.3, 0.8);
  scene.add(wave2);

  // CLI output card
  const cc = makeCanvas(1400, 300); // CLI card
  {
    const x = cc.getContext('2d');
    x.fillStyle = 'rgba(8,11,16,0.92)'; roundRect(x, 0, 0, 1400, 300, 30); x.fill();
    x.strokeStyle = 'rgba(255,255,255,0.12)'; x.lineWidth = 3; roundRect(x, 2, 2, 1396, 296, 28); x.stroke();
    x.font = `500 40px ${FONT.mono}`; x.fillStyle = '#5d6b82'; x.textBaseline = 'middle';
    x.fillText('$ autotok upload -u alice -v clip.mp4 -t "Hello #fyp"', 50, 90);
    x.font = `700 50px ${FONT.mono}`; x.fillStyle = '#3dff9a';
    x.fillText('Published.', 50, 195);
    const pw = x.measureText('Published. ').width;
    x.fillStyle = '#e8edf5'; x.font = `500 50px ${FONT.mono}`;
    x.fillText('Video id: 7429183650274961408', 50 + pw, 195);
  }
  const card = new THREE.Mesh(new THREE.PlaneGeometry(0.98, 0.21), new THREE.MeshBasicMaterial({ map: tex(cc), transparent: true, toneMapped: false, color: new THREE.Color(0.95, 0.95, 0.95) }));
  scene.add(card);

  function update(t, fx, hud) {
    const ig = t < C.drop ? 0 : smooth(clamp((t - C.drop) / 0.12));
    drawPost(sx, t, TL, { tapAt: C.tap, ignite: ig });
    stex.needsUpdate = true;
    const flash = hit(t, C.drop, 0.25);
    screen.material.color.setScalar(0.82 + flash * 2.5);
    screenGlow.intensity = ig * (2.5 + flash * 15);
    dockRing.material.color.setRGB(0.3 + flash * 2, 2.5 + flash * 5, 2.5 + flash * 5);

    // capsule drop (arrives exactly on the drop)
    const ca = (C.drop - t) / 0.35;
    capsule.visible = ca > 0 && ca < 1;
    capsule.position.set(0, 0.75 + ca * ca * 6, -0.32);

    // waves
    const wa = t - C.drop;
    [wave, wave2].forEach((w, i) => {
      const a = wa - i * 0.12;
      w.visible = a > 0 && a < 1.6;
      if (w.visible) { const r = 0.6 + easeOutCubic(a / 1.6) * 22; w.scale.setScalar(r); w.material.opacity = (1 - a / 1.6) * 0.9; }
    });
    rimC.intensity = 6 + flash * 20; rimM.intensity = 6 + flash * 20;

    // card slides in on the output cue
    const ck = easeOutExpo(clamp((t - C.outputLine) / 0.5));
    card.visible = false;
    card.position.set(lerp(-1.4, -0.66, ck), 0.98, 0.36);
    card.rotation.set(0, 0.3, 0);
    card.material.opacity = ck;

    // camera: low 3/4, orbit to front, then push into the screen
    const k1 = easeOutCubic(clamp((t - C.drop) / 2.2));
    const cp = camPath(t, [
      { t: 38.0, p: [-0.95, 0.6, 0.95], l: [0, 1.5, 0], fov: 42 },
      { t: 38.6, p: [-0.55, 0.92, 1.4], l: [-0.12, 1.22, 0], fov: 38 },
      { t: 39.15, p: [-0.3, 0.9, 0.98], l: [-0.08, 0.93, 0], fov: 34 },
      { t: 40.0, p: [0.12, 1.12, 1.45], l: [-0.02, 1.08, 0], fov: 34 },
      { t: 41.1, p: [0.32, 1.28, 1.75], l: [0.0, 1.22, 0], fov: 34 },
    ]);
    let p = v3(...cp.p), l = v3(...cp.l);
    let fov = cp.fov;
    const push = easeInExpo(clamp((t - 41.1) / 0.9));
    if (push > 0) {
      p = p.lerp(v3(0, phone.position.y, PHONE.d / 2 + 0.42), push);
      l = l.lerp(v3(0, phone.position.y, 0), Math.min(1, push * 1.6));
      fov = lerp(fov, 34, push);
    }
    p.x += fbm1(t * 0.6) * 0.02; p.y += fbm1(t * 0.5 + 1) * 0.015;
    camera.position.copy(p);
    camera.up.set(0, 1, 0);
    camera.lookAt(l);
    camera.fov = fov;
    camera.updateProjectionMatrix();
    phone.rotation.y = (1 - k1) * 0.12;

    fx.bloom = { strength: 0.8 + flash * 0.8, radius: 0.5, threshold: 0.8 };
    fx.dof = { focus: camera.position.distanceTo(v3(0, 1.25, 0)), aperture: 0.1 * (1 - push), maxBlur: 12 };
    fx.ca = 1 + flash * 16 + hit(t, C.tap, 0.2) * 3;
    fx.shake = flash * 2.2;
    fx.zoom = push * 0.06;
    fx.flash = [1, 1, 1, 0.5 * (1 - easeOutCubic(clamp((t - C.drop) / 0.16)))];
    const vin = 1 - clamp((t - C.drop) / 0.2);
    if (vin > 0) fx.blur = [0, -easeOutCubic(vin) * 0.16];
    fx.exposure = 1 + flash * 0.4;
    hud.header('Posted. Tags clickable.', t, 38.3, 41.2);
    return camera;
  }
  return { start: C.drop, scene, update };
}
