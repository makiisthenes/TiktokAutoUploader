// Pure helpers. Everything on screen is a function of time, so a frame can be
// rendered in any order (and in parallel workers) and come out identical.

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const invlerp = (a, b, x) => clamp((x - a) / (b - a));
export const remap = (x, a, b, c, d) => lerp(c, d, invlerp(a, b, x));
export const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
export const smoother = (t) => { t = clamp(t); return t * t * t * (t * (t * 6 - 15) + 10); };
export const easeOutCubic = (t) => 1 - Math.pow(1 - clamp(t), 3);
export const easeInCubic = (t) => Math.pow(clamp(t), 3);
export const easeOutQuart = (t) => 1 - Math.pow(1 - clamp(t), 4);
export const easeInQuart = (t) => Math.pow(clamp(t), 4);
export const easeOutExpo = (t) => (clamp(t) >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(t)));
export const easeInExpo = (t) => (clamp(t) <= 0 ? 0 : Math.pow(2, 10 * clamp(t) - 10));
export const easeInOutCubic = (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const easeInOutQuint = (t) => { t = clamp(t); return t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2; };
export const easeInOutExpo = (t) => {
  t = clamp(t);
  if (t === 0 || t === 1) return t;
  return t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;
};
export const easeOutBack = (t, s = 1.70158) => { t = clamp(t) - 1; return t * t * ((s + 1) * t + s) + 1; };

// Damped spring step response: 0 -> 1 with overshoot.
export function spring(t, freq = 4.5, damp = 0.35) {
  if (t <= 0) return 0;
  const w = freq * 2 * Math.PI;
  return 1 - Math.exp(-damp * w * t) * Math.cos(w * Math.sqrt(1 - damp * damp) * t);
}

// Decaying envelope after an event at time `at`.
export function hit(t, at, decay = 0.25) {
  if (t < at) return 0;
  return Math.exp(-(t - at) / decay);
}
export function hits(t, ats, decay = 0.25) {
  let v = 0;
  for (const a of ats) v = Math.max(v, hit(t, a, decay));
  return v;
}

// Deterministic hash / value noise.
export function hash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}
export function noise1(x) {
  const i = Math.floor(x), f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash(i), hash(i + 1), u) * 2 - 1;
}
export function fbm1(x, oct = 3) {
  let v = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { v += a * noise1(x * f + i * 17.3); a *= 0.5; f *= 2; }
  return v;
}

export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

// The typing schedule shared with the score (audio/score.py mirrors this).
export function typingTimes(typing) {
  const times = [];
  let slot = 0;
  for (let i = 0; i < typing.text.length; i++) {
    times.push(typing.start + slot * typing.step);
    slot += 1;
    if (typing.text[i] === ' ' && typing.wordGap) slot += typing.wordGap;
  }
  return times;
}
export function typedCount(t, times) {
  let n = 0;
  while (n < times.length && times[n] <= t) n++;
  return n;
}

// Split-flap schedule shared with the score: cell i of a cascade starts
// `stagger` after cell i-1 and flips `cycles` times, `flipDur` each.
export function flapFlipTimes(flip, flap) {
  const out = [];
  for (let i = 0; i < flip.cells; i++) {
    for (let k = 0; k < flap.cycles; k++) out.push(flip.t + i * flap.stagger + (k + 1) * flap.flipDur);
  }
  return out;
}

// Camera path through keyframes {t, p:[x,y,z], l:[x,y,z], fov} with a
// Catmull-Rom spline, so the move never stops dead at a key.
function cr(p0, p1, p2, p3, u) {
  const u2 = u * u, u3 = u2 * u;
  return 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3);
}
export function camPath(t, keys) {
  if (t <= keys[0].t) return { p: keys[0].p.slice(), l: keys[0].l.slice(), fov: keys[0].fov ?? 35 };
  const n = keys.length;
  if (t >= keys[n - 1].t) return { p: keys[n - 1].p.slice(), l: keys[n - 1].l.slice(), fov: keys[n - 1].fov ?? 35 };
  let i = 0;
  while (keys[i + 1].t < t) i++;
  const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(n - 1, i + 2)];
  const u = (t - k1.t) / (k2.t - k1.t);
  const f = (a) => [0, 1, 2].map((j) => cr(k0[a][j], k1[a][j], k2[a][j], k3[a][j], u));
  return { p: f('p'), l: f('l'), fov: cr(k0.fov ?? 35, k1.fov ?? 35, k2.fov ?? 35, k3.fov ?? 35, u) };
}
