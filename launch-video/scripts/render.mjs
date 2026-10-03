// Frame-by-frame renderer: headless Chromium draws each frame on demand
// (window.renderFrame(t)), we read the pixels back and pipe them to ffmpeg.
// Nothing depends on wall-clock time, so frames can be split across workers.
//
//   node scripts/render.mjs --draft                 960x540 @30, quick look
//   node scripts/render.mjs --master                1920x1080 @60
//   node scripts/render.mjs --stills 4.2,9.0 [--w 1920 --h 1080]
//   options: --from S --to S (video seconds), --workers N, --only depot,board, --grain 0
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TL = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/timeline.json'), 'utf8'));
const CHROME = process.env.CHROME_PATH
  || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium/chrome-linux/chrome'].find((p) => fs.existsSync(p));

const argv = process.argv.slice(2);
const opt = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  if (i < 0) return def;
  const v = argv[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
};
const master = !!opt('master', false);
const stills = opt('stills', null);
const W = +opt('w', master || stills ? 1920 : 960);
const H = +opt('h', master || stills ? 1080 : 540);
const FPS = +opt('fps', master ? TL.fps : 30);
const workers = +opt('workers', master ? 3 : 3);
const only = opt('only', null);
const total = TL.preroll + TL.duration;
const from = +opt('from', 0);
const to = Math.min(+opt('to', total), total);
const outDir = path.join(ROOT, 'renders');
fs.mkdirSync(outDir, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png' };
function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function openPage(port) {
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-vsync'],
  });
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(`[page ${m.type()}]`, m.text()); });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  const qs = new URLSearchParams({ w: W, h: H, ...(only ? { only } : {}), ...(opt('msaa') ? { msaa: opt('msaa') } : {}), ...(opt('grain') ? { grain: opt('grain') } : {}) });
  await page.goto(`http://127.0.0.1:${port}/index.html?${qs}`);
  await page.waitForFunction('window.ready || window.bootError', null, { timeout: 600000 });
  const err = await page.evaluate('window.bootError');
  if (err) throw new Error(err);
  await page.evaluate(() => {
    const gl = document.querySelector('canvas').getContext('webgl2');
    window.__grab = (t, i) => {
      window.renderFrame(t, i);
      const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
      const buf = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
      let s = '';
      const CH = 0x8000;
      for (let k = 0; k < buf.length; k += CH) s += String.fromCharCode.apply(null, buf.subarray(k, k + CH));
      return btoa(s);
    };
  });
  return { browser, page };
}

function ffmpeg(args) {
  const p = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: ['pipe', 'inherit', 'inherit'] });
  p.stdin.on('error', () => {}); // a broken pipe shows up as ffmpeg's exit code in `done`
  const done = new Promise((res, rej) => p.on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg exit ${c}`)))));
  return { p, done };
}
const rawIn = ['-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`];

async function renderStills(port) {
  const times = String(stills).split(',').map(Number);
  if (stills === true || times.some((t) => !Number.isFinite(t) || t < 0 || t > total)) {
    throw new Error(`--stills needs video times in seconds between 0 and ${total}, e.g. --stills 0.1,12.1`);
  }
  const { browser, page } = await openPage(port);
  try {
    const dir = path.join(outDir, 'stills');
    fs.mkdirSync(dir, { recursive: true });
    for (const t of times) {
      const b64 = await page.evaluate(([t]) => window.__grab(t, Math.round(t * 60)), [t]);
      const file = path.join(dir, `t${t.toFixed(2).padStart(6, '0')}.png`);
      const { p, done } = ffmpeg([...rawIn, '-i', '-', '-vf', 'vflip', '-frames:v', '1', file]);
      p.stdin.end(Buffer.from(b64, 'base64'));
      await done;
      console.log(file);
    }
  } finally {
    await browser.close();
  }
}

const enc = master
  ? ['-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-tune', 'film', '-g', String(FPS * 2)]
  : ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-g', String(FPS * 2)];

// One browser per worker; workers pull fixed-length chunks from a shared
// queue. Finished chunks stay on disk, so a run can resume, and a fix only
// needs its chunks re-rendered (--redo 3,4).
async function worker(port, idx, queue, state) {
  const { browser, page } = await openPage(port);
  try {
    while (queue.length && !state.failed) {
      const { i, f0, f1, file } = queue.shift();
      const tmp = file.replace(/\.mp4$/, '.part.mp4');
      const { p, done } = ffmpeg([...rawIn, '-r', String(FPS), '-i', '-', '-vf', 'vflip', ...enc, '-r', String(FPS), '-f', 'mp4', tmp]);
      // ffmpeg closing before stdin.end() is a failure, even with exit code 0
      const exited = done.then(() => { throw new Error('ffmpeg exited before the chunk was complete'); });
      exited.catch(() => {});
      const t0 = Date.now();
      try {
        for (let f = f0; f < f1 && !state.failed; f++) {
          const b64 = await page.evaluate(([t, f]) => window.__grab(t, f), [f / FPS, f]);
          if (!p.stdin.write(Buffer.from(b64, 'base64'))) await Promise.race([new Promise((r) => p.stdin.once('drain', r)), exited]);
        }
        if (state.failed) throw new Error('aborted');
        p.stdin.end();
        await done;
      } catch (e) {
        // stop this chunk's encoder and drop its partial file
        p.stdin.destroy();
        p.kill('SIGKILL');
        await done.catch(() => {});
        fs.rmSync(tmp, { force: true });
        throw e;
      }
      fs.renameSync(tmp, file);
      const per = (Date.now() - t0) / 1000 / (f1 - f0);
      console.log(`[w${idx}] chunk ${i} (${(f0 / FPS).toFixed(1)}-${(f1 / FPS).toFixed(1)}s) ${per.toFixed(2)}s/f, ${queue.length} chunks queued`);
    }
  } catch (e) {
    state.failed = true; // the other workers stop at their next frame
    throw e;
  } finally {
    await browser.close();
  }
}

const server = await serve();
const port = server.address().port;
try {
  if (stills) {
    await renderStills(port);
  } else {
    const tag = master ? 'master' : 'draft';
    const dir = path.join(outDir, `${tag}_chunks`);
    if (opt('fresh', false)) fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const CH = Math.round(+opt('chunk', 4) * FPS);
    if (!Number.isFinite(CH) || CH < 1) throw new Error('--chunk must be a positive number of seconds (at least one frame)');
    // Chunks are only reused by a run with the same picture settings.
    const config = { w: W, h: H, fps: FPS, chunkFrames: CH, msaa: +(opt('msaa') || 4), only: only || null, encoder: enc.join(' '), ...(opt('grain') ? { grain: opt('grain') } : {}) };
    const cfgFile = path.join(dir, 'config.json');
    const existing = fs.readdirSync(dir).filter((f) => /^c\d+\.mp4$/.test(f));
    if (existing.length) {
      const prev = fs.existsSync(cfgFile) ? fs.readFileSync(cfgFile, 'utf8') : null;
      if (prev !== JSON.stringify(config)) {
        throw new Error(`${dir} holds chunks rendered with different settings (${prev || 'unknown'}); rerun with --fresh`);
      }
    }
    fs.writeFileSync(cfgFile, JSON.stringify(config));
    const F1 = Math.round(total * FPS);
    const chunks = [];
    for (let f = 0, i = 0; f < F1; f += CH, i++) chunks.push({ i, f0: f, f1: Math.min(F1, f + CH), file: path.join(dir, `c${String(i).padStart(3, '0')}.mp4`) });
    const redo = opt('redo', null);
    const lo = Math.round(from * FPS), hi = Math.round(to * FPS);
    const want = chunks.filter((c) => (redo ? String(redo).split(',').map(Number).includes(c.i) : !fs.existsSync(c.file)) && c.f1 > lo && c.f0 < hi);
    console.log(`${tag}: ${chunks.length} chunks of ${CH} frames, rendering ${want.length}`);
    const queue = [...want];
    const state = { failed: false };
    const nWorkers = want.length ? Math.max(1, Math.min(workers, want.length)) : 0; // all cached: just join
    const results = await Promise.allSettled(Array.from({ length: nWorkers }, (_, k) => worker(port, k, queue, state)));
    const failure = results.find((r) => r.status === 'rejected');
    if (failure) throw failure.reason;
    if (chunks.every((c) => fs.existsSync(c.file))) {
      const list = path.join(dir, 'list.txt');
      fs.writeFileSync(list, chunks.map((c) => `file '${c.file}'`).join('\n'));
      const out = path.join(outDir, opt('out', `${tag}_video.mp4`));
      await ffmpeg(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', out]).done;
      console.log(out);
    }
  }
} finally {
  server.close();
}
