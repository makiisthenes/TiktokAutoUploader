import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import TL from './timeline.json';
import { Pipeline, defaultFx } from './engine/post.js';
import { Hud } from './engine/hud.js';
import { noise1 } from './engine/util.js';
import { FONT } from './engine/canvas.js';
import createDepot from './sets/depot.js';
import createBoard from './sets/board.js';
import createPhone from './sets/phone.js';
import createGrid from './sets/grid.js';

async function boot() {
  const q = new URLSearchParams(location.search);
  const W = +(q.get('w') || TL.width);
  const H = +(q.get('h') || TL.height);

  await Promise.all([
    `700 40px ${FONT.display}`, `500 40px ${FONT.display}`, `400 40px ${FONT.display}`,
    `400 40px ${FONT.mono}`, `500 40px ${FONT.mono}`, `700 40px ${FONT.mono}`, `800 40px ${FONT.mono}`,
    `400 40px ${FONT.ui}`, `600 40px ${FONT.ui}`, `800 40px ${FONT.ui}`, `900 40px ${FONT.ui}`,
    `700 40px ${FONT.stencil}`, `900 40px ${FONT.stencil}`,
  ].map((f) => document.fonts.load(f)));

  const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, alpha: false });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.NoToneMapping;
  document.body.appendChild(renderer.domElement);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const ctx = { renderer, TL, W, H, aspect: W / H, envTex };
  const only = q.get('only');
  const makers = { depot: createDepot, board: createBoard, phone: createPhone, grid: createGrid };
  const sets = [];
  for (const [name, make] of Object.entries(makers)) {
    if (only && !only.split(',').includes(name)) continue;
    const s = make(ctx);
    s.name = name;
    sets.push(s);
  }
  sets.sort((a, b) => a.start - b.start);

  const pipeline = new Pipeline(renderer, W, H, { samples: +(q.get('msaa') ?? 4) });
  const hud = new Hud(W, H);

  const pick = (t) => {
    let s = sets[0];
    for (const x of sets) if (t >= x.start) s = x;
    return s;
  };

  window.renderFrame = (videoT, frameIndex = 0) => {
    const t = videoT - TL.preroll;
    const set = pick(t);
    const fx = defaultFx();
    hud.begin();
    const camera = set.update(t, fx, hud);
    if (fx.shake > 0) {
      const k = fx.shake;
      camera.rotateX(noise1(t * 37.1) * 0.012 * k);
      camera.rotateY(noise1(t * 41.7 + 9) * 0.012 * k);
      camera.rotateZ(noise1(t * 29.3 + 3) * 0.008 * k);
    }
    hud.end();
    pipeline.render(set.scene, camera, fx, hud.texture, frameIndex);
  };

  // Warm every set once so shader compiles don't land inside a timed frame.
  for (const s of sets) window.renderFrame(s.start + TL.preroll + 0.01);
  window.ready = true;
}

boot().catch((e) => { window.bootError = String(e && e.stack || e); console.error(e); });
