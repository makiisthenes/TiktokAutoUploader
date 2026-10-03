"""Synthesize the score from src/timeline.json, so every hit lands on its picture cue.

  python3 audio/score.py            -> build/score.wav (48 kHz stereo, includes the pre-roll)

Everything is generated here: drums, bass, pads, arps, and the foley that the
picture cues for (typing, the scan lock, the punch-out, flap clacks, the drops...).
"""
import json
import math
import os
import sys

import numpy as np
from scipy import signal
from scipy.io import wavfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TL = json.load(open(os.path.join(ROOT, 'src', 'timeline.json')))
C = TL['cues']
SR = 48000
PRE = TL['preroll']
DUR = TL['duration']
N = int(round((PRE + DUR) * SR))
BEAT = 60.0 / TL['bpm']
rng = np.random.default_rng(7)

music = np.zeros((2, N))
sfx = np.zeros((2, N))
verb = np.zeros((2, N))


def idx(t):
    return int(round((t + PRE) * SR))


def add(bus, sig, t, gain=1.0, pan=0.0, send=0.0):
    """Mix mono or stereo `sig` into `bus` at music time t (equal-power pan)."""
    if sig.ndim == 1:
        a = (pan + 1) * math.pi / 4
        sig = np.vstack([sig * math.cos(a), sig * math.sin(a)]) * math.sqrt(2)
    i0 = idx(t)
    if i0 >= N:
        return
    if i0 < 0:
        sig = sig[:, -i0:]
        i0 = 0
    n = min(sig.shape[1], N - i0)
    bus[:, i0:i0 + n] += sig[:, :n] * gain
    if send:
        verb[:, i0:i0 + n] += sig[:, :n] * gain * send


def mix2(*sigs):
    n = max(len(x) for x in sigs)
    return sum(np.pad(x, (0, n - len(x))) for x in sigs)


def tt(dur):
    return np.arange(int(dur * SR)) / SR


def env_exp(dur, decay, attack=0.002):
    t = tt(dur)
    e = np.exp(-t / decay)
    if attack > 0:
        e *= np.clip(t / attack, 0, 1)
    return e


def noise(dur):
    return rng.standard_normal(int(dur * SR))


def filt(x, f, btype='low', order=2):
    if isinstance(f, (list, tuple)):
        f = [min(v, SR / 2 * 0.95) for v in f]
    else:
        f = min(f, SR / 2 * 0.95)
    sos = signal.butter(order, f, btype=btype, fs=SR, output='sos')
    return signal.sosfilt(sos, x, axis=-1)


def sweep(x, f_of_t, btype='low', block=256, order=2, q=None):
    """Time-varying filter: redesign per block, carry state."""
    out = np.zeros_like(x)
    zi = None
    for s in range(0, x.shape[-1], block):
        tm = s / SR
        f = f_of_t(tm)
        if btype == 'band':
            lo, hi = max(20, f / (q or 2)), min(SR / 2 * 0.95, f * (q or 2))
            sos = signal.butter(order, [lo, hi], btype='band', fs=SR, output='sos')
        else:
            sos = signal.butter(order, min(max(f, 20), SR / 2 * 0.95), btype=btype, fs=SR, output='sos')
        if zi is None:
            zi = np.zeros((sos.shape[0], 2))
        out[s:s + block], zi = signal.sosfilt(sos, x[s:s + block], zi=zi)
    return out


def polyblep(p, dt):
    dt = np.broadcast_to(dt, p.shape)
    out = np.zeros_like(p)
    m = p < dt
    q = p[m] / dt[m]
    out[m] = q + q - q * q - 1
    m2 = p > 1 - dt
    q = (p[m2] - 1) / dt[m2]
    out[m2] = q * q + q + q + 1
    return out


def saw(freq, dur, phase=0.0):
    t = tt(dur)
    f = np.broadcast_to(freq, t.shape) if np.ndim(freq) else np.full_like(t, freq)
    ph = (phase + np.cumsum(f) / SR) % 1.0
    dt = f / SR
    return 2 * ph - 1 - polyblep(ph, dt)


def sine(freq, dur, phase=0.0):
    t = tt(dur)
    f = np.broadcast_to(freq, t.shape) if np.ndim(freq) else np.full_like(t, freq)
    return np.sin(2 * np.pi * (phase + np.cumsum(f) / SR))


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


# ---------------------------------------------------------------------- instruments
def kick(gain=1.0, heavy=False):
    d = 0.6 if heavy else 0.45
    t = tt(d)
    f = 45 + 110 * np.exp(-t / 0.035) + (20 if heavy else 0) * np.exp(-t / 0.2)
    body = sine(f, d) * env_exp(d, 0.22 if heavy else 0.16, 0.001)
    click = filt(noise(0.01), 3000, 'high') * env_exp(0.01, 0.002)
    out = body + 0.3 * np.pad(click, (0, len(body) - len(click)))
    return np.tanh(out * 1.6) * gain


def clap():
    d = 0.35
    x = np.zeros(int(d * SR))
    n = filt(noise(d), [900, 5000], 'band')
    for k, off in enumerate([0, 0.011, 0.022]):
        i = int(off * SR)
        e = env_exp(d - off, 0.012 if k < 2 else 0.12)
        m = min(len(e), len(x) - i)
        x[i:i + m] += n[i:i + m] * e[:m]
    return x * 0.8


def hat(open_=False):
    d = 0.25 if open_ else 0.05
    x = filt(noise(d), 7000, 'high', 2) * env_exp(d, 0.09 if open_ else 0.014, 0.0005)
    return x * (0.5 if open_ else 0.45)


def snare():
    d = 0.3
    tone = sine(190, d) * env_exp(d, 0.05)
    n = filt(noise(d), [1500, 9000], 'band') * env_exp(d, 0.09)
    return (0.5 * tone + n) * 0.8


def pluck(m, d=0.22, bright=6000, gain=1.0):
    f = mtof(m)
    x = 0.6 * saw(f, d) + 0.4 * saw(f * 1.005, d, 0.3)
    x = sweep(x, lambda tm: 300 + bright * math.exp(-tm / 0.06))
    return x * env_exp(d, 0.09, 0.002) * gain


def supersaw(notes, d, cutoff=3000, attack=0.4, release=0.8, voices=5, detune=0.18, gain=1.0):
    t = tt(d)
    L = np.zeros(len(t)); R = np.zeros(len(t))
    for m in notes:
        for v in range(voices):
            det = (v - (voices - 1) / 2) / ((voices - 1) / 2) * detune
            f = mtof(m + det)
            s = saw(f, d, rng.random())
            pan = (v - (voices - 1) / 2) / ((voices - 1) / 2) * 0.8
            a = (pan + 1) * math.pi / 4
            L += s * math.cos(a); R += s * math.sin(a)
    e = np.clip(t / attack, 0, 1) * np.clip((d - t) / release, 0, 1)
    out = np.vstack([L, R]) * e / (len(notes) * voices) ** 0.6
    if callable(cutoff):
        out = np.vstack([sweep(out[0], cutoff), sweep(out[1], cutoff)])
    else:
        out = filt(out, cutoff)
    return out * gain


def bass_note(m, d, cutoff=900):
    f = mtof(m)
    x = 0.7 * saw(f, d) + 0.5 * sine(f / 2, d)
    x = sweep(x, lambda tm: 160 + cutoff * math.exp(-tm / 0.08))
    e = np.clip(tt(d) / 0.004, 0, 1) * np.clip((d - tt(d)) / 0.03, 0, 1)
    return np.tanh(x * e * 1.3) * 0.8


def riser(d, f0=300, f1=6000, gain=1.0, tone=True):
    t = tt(d)
    k = t / d
    n = sweep(noise(d), lambda tm: f0 * (f1 / f0) ** (tm / d), 'band', q=1.6)
    x = n * k ** 2
    if tone:
        x += 0.25 * sine(200 * 2 ** (3 * k), d) * k ** 3
    return x * gain


def whoosh(d, f0=400, f1=3000, gain=1.0):
    t = tt(d)
    k = t / d
    n = sweep(noise(d), lambda tm: f0 * (f1 / f0) ** (tm / d), 'band', q=2.5)
    return n * np.sin(np.pi * k) ** 1.5 * gain


def impact(size=1.0):
    d = 2.6 * size
    t = tt(d)
    sub = sine(55 * np.exp(-t / 0.7) + 28, d) * env_exp(d, 0.55 * size, 0.001)
    crack = filt(noise(d), 2500, 'high') * env_exp(d, 0.05, 0.0005)
    body = filt(noise(d), [150, 1800], 'band') * env_exp(d, 0.25 * size, 0.001)
    return np.tanh((sub * 1.2 + crack * 0.6 + body * 0.7) * 1.4) * size


def reverse_cymbal(d=1.0):
    x = filt(noise(d), 5000, 'high') * (tt(d) / d) ** 3
    return x * 0.5


def click(freq=2400, d=0.03, gain=1.0):
    n = filt(noise(d), [freq * 0.6, freq * 1.6], 'band') * env_exp(d, 0.004, 0.0003)
    p = sine(freq, d) * env_exp(d, 0.006)
    return (n + 0.3 * p) * gain


def keystroke(seed):
    r = np.random.default_rng(seed)
    f = 1800 + r.random() * 1600
    d = 0.06
    x = click(f, d, 0.8)
    thock = sine(180 + r.random() * 60, d) * env_exp(d, 0.012)
    return x + 0.5 * thock


def stamp(gain=1.0):
    d = 0.5
    t = tt(d)
    thump = sine(95 * np.exp(-t / 0.05) + 48, d) * env_exp(d, 0.09, 0.0008)
    clack = filt(noise(d), [600, 4000], 'band') * env_exp(d, 0.025, 0.0005)
    paper = filt(noise(d), 3000, 'high') * env_exp(d, 0.012)
    return np.tanh((thump * 1.3 + clack * 0.9 + paper * 0.4) * 1.5) * gain


def metal_clank(base=180, d=0.9, gain=1.0):
    t = tt(d)
    x = np.zeros(len(t))
    for k, (r, a) in enumerate([(1, 1), (2.76, 0.6), (5.4, 0.4), (8.93, 0.3), (13.3, 0.2)]):
        x += a * np.sin(2 * np.pi * base * r * t + k) * np.exp(-t / (0.35 / (1 + k * 0.6)))
    x += 0.6 * filt(noise(d), [300, 3000], 'band') * env_exp(d, 0.02)
    return x * gain * 0.6


def laser(gain=1.0):
    d = 0.35
    t = tt(d)
    f = 200 + 3200 * np.exp(-t / 0.05)
    z = 0.5 * saw(f, d) + 0.5 * sine(f * 1.5, d)
    z = filt(z, 6000) * env_exp(d, 0.12, 0.001)
    sizzle = filt(noise(d), 4000, 'high') * env_exp(d, 0.2) * 0.4
    return (z + sizzle) * gain


def blip(f0=1100, f1=1700, d=0.12, gain=1.0):
    t = tt(d)
    f = f0 + (f1 - f0) * np.clip(t / 0.03, 0, 1)
    return sine(f, d) * env_exp(d, 0.05, 0.002) * gain


def hiss(d=0.5, gain=1.0):
    return filt(noise(d), 4500, 'high') * env_exp(d, d / 3, 0.01) * gain


def crackle(d=0.8, gain=1.0, seed=5):
    r = np.random.default_rng(seed)
    x = np.zeros(int(d * SR))
    for _ in range(90):
        i = int(r.random() ** 2 * (len(x) - 400))
        c = filt(r.standard_normal(200), 2000, 'high') * np.exp(-np.arange(200) / 30)
        x[i:i + 200] += c * (0.4 + r.random())
    x += filt(noise(d), [2000, 9000], 'band') * env_exp(d, 0.08) * 1.5
    return x * gain


def flap_clack(seed):
    r = np.random.default_rng(seed)
    d = 0.04
    x = filt(noise(d), [2000 + r.random() * 1500, 7000], 'band') * env_exp(d, 0.003, 0.0002)
    th = sine(900 + r.random() * 400, d) * env_exp(d, 0.004)
    return (x + 0.25 * th) * (0.6 + 0.3 * r.random())


def glass(gain=1.0):
    d = 1.4
    t = tt(d)
    x = np.zeros(len(t))
    r = np.random.default_rng(3)
    for k in range(26):
        f = 2500 + r.random() * 7000
        t0 = r.random() ** 2 * 0.5
        e = np.where(t > t0, np.exp(-(t - t0) / (0.05 + r.random() * 0.2)), 0)
        x += np.sin(2 * np.pi * f * t) * e * (0.2 + r.random() * 0.3)
    x += filt(noise(d), 3500, 'high') * env_exp(d, 0.08)
    return x * gain * 0.5


# ---------------------------------------------------------------------- arrangement
# A minor: Am - F - C - G, one chord per bar (2 s).
PROG = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
ROOTS = [45, 41, 48, 43]


def chord_at(t):
    return int((t // (BEAT * 4)) % 4)


kicks = []


def type_keys(spec, seed0, gain=0.42):
    """One keystroke per glyph, on the same schedule the terminal types it."""
    slot = 0
    for i, ch in enumerate(spec['text']):
        tk = spec['start'] + slot * spec['step']
        slot += 1
        if ch == ' ' and spec.get('wordGap'):
            slot += spec['wordGap']
        add(sfx, keystroke(seed0 + i), tk, gain if ch != ' ' else gain + 0.13, pan=(rng.random() - 0.5) * 0.3, send=0.08)


def drums(t0, t1, clap_on=True, hats='off', heavy=False, kick_gain=1.0):
    b = t0
    while b < t1 - 1e-6:
        add(music, kick(kick_gain, heavy), b, 0.95)
        kicks.append(b)
        bi = round((b - t0) / BEAT)
        if clap_on and bi % 2 == 1:
            add(music, clap(), b, 0.55, pan=-0.05, send=0.25)
        if hats in ('off', '16'):
            add(music, hat(True), b + BEAT / 2, 0.55, pan=0.25)
        if hats == '16':
            for s in (0.25, 0.75):
                add(music, hat(), b + BEAT * s, 0.4, pan=-0.2)
        b += BEAT


def bassline(t0, t1, gain=0.65, cutoff=900):
    b = t0
    while b < t1 - 1e-6:
        root = ROOTS[chord_at(b)]
        for k in range(2):
            tn = b + k * BEAT / 2
            add(music, bass_note(root + (12 if k else 0), BEAT / 2 * 0.9, cutoff), tn, gain)
        b += BEAT


def pads(t0, t1, gain=0.3, cutoff=2400):
    b = t0
    while b < t1 - 1e-6:
        ch = PROG[chord_at(b)]
        d = min(BEAT * 4, t1 - b)
        add(music, supersaw(ch, d + 0.4, cutoff=cutoff, attack=0.05, release=0.4, gain=gain), b, send=0.35)
        b += BEAT * 4


def arps(t0, t1, gain=0.22, octave=12, bright=5000):
    b = t0
    k = 0
    while b < t1 - 1e-6:
        ch = PROG[chord_at(b)]
        m = ch[[0, 1, 2, 1][k % 4]] + octave + (12 if k % 8 >= 6 else 0)
        add(music, pluck(m, 0.2, bright), b, gain, pan=0.35 * math.sin(k * 0.7), send=0.3)
        b += BEAT / 4
        k += 1


# 0-4: log in once. Pad, the login typed, the window pops, the phone rises,
# the scan locks on 3.0, "saved" confirms.
add(music, supersaw([57, 64, 72], 4.4, cutoff=lambda tm: 400 + 900 * tm / 4.4, attack=1.5, release=0.6, gain=0.35), -0.2, send=0.4)
add(music, filt(sine(mtof(33), 4.2) * 0.25, 120), 0.0)
type_keys(TL['loginTyping'], 0)
add(sfx, keystroke(998) * 1.3, C['loginEnter'] - 0.004, 0.7)
add(sfx, kick(0.6), C['loginEnter'], 0.55)
add(sfx, impact(0.4), C['loginEnter'], 0.45, pan=0.3, send=0.3)
add(sfx, whoosh(0.35, 800, 3200, 0.45), C['loginEnter'] + 0.02, pan=0.35)
add(sfx, blip(700, 1100, 0.1, 0.5), C['loginEnter'] + 0.02, pan=0.35, send=0.3)
add(sfx, whoosh(0.55, 250, 1600, 0.4), C['loginEnter'] + 0.15, pan=-0.45)
for b in np.arange(2.0, 4.0, BEAT / 2):
    add(music, hat(), b, 0.3, pan=0.3)
add(sfx, riser(0.8, 600, 5000, 0.25, tone=False), C['scan'] - 0.9, pan=-0.3)
add(sfx, mix2(blip(1800, 2400, 0.08, 0.55), np.pad(blip(2400, 3300, 0.12, 0.5), (int(0.08 * SR), 0))), C['scan'], pan=-0.3, send=0.35)
add(sfx, impact(0.7), C['scan'], 0.75, send=0.3)
add(sfx, mix2(blip(900, 1350, 0.16, 0.6), click(2200, 0.04, 0.7)), C['saved'], pan=-0.2, send=0.3)

# 4-8: one command. The kick comes in under the typing; a riser into the ENTER.
drums(4.0, 8.0, clap_on=False)
bassline(4.0, 12.0)
pads(4.0, 12.0, 0.22, 1800)
type_keys(TL['typing'], 100)
add(music, riser(1.5, 300, 7000, 0.55), C['enter'] - 1.5)
add(sfx, reverse_cymbal(1.0), C['enter'] - 1.0, 0.6)
add(sfx, keystroke(999) * 1.4, C['enter'] - 0.004, 0.8)

# 8-12: the punch-out, the landing, the ride; a whip into the board.
add(sfx, impact(1.0), C['enter'], 0.9, send=0.35)
add(sfx, glass(1.0), C['enter'], 0.7, pan=0.1, send=0.3)
add(sfx, whoosh(1.0, 3000, 300, 0.7), C['enter'] + 0.02)
add(sfx, stamp(0.9), C['land'], 0.9, send=0.2)
add(sfx, filt(noise(0.6), 900) * env_exp(0.6, 0.15), C['land'], 0.6)
drums(8.0, 12.0, clap_on=True)
arps(8.0, 12.0, 0.2)
add(sfx, riser(1.0, 800, 7000, 0.35, tone=False), C['whipToBoard'] - 0.6)
add(sfx, whoosh(0.55, 500, 4500, 0.7), C['whipToBoard'])

# 12-18: departures. Flap clacks follow the board's flip schedule exactly.
drums(C['board'], C['boarding'], clap_on=True, hats='16')
bassline(C['board'], C['drop'] - 0.25)
pads(C['board'], C['drop'] - 0.25, 0.22, 2600)
arps(C['board'], C['drop'] - 0.25, 0.15, 24, 7000)
flap = TL['flap']
for f in C['flips']:
    for i in range(f['cells']):
        for k in range(flap['cycles']):
            t = f['t'] + i * flap['stagger'] + (k + 1) * flap['flipDur']
            add(sfx, flap_clack(int(t * 1000)), t, 0.55, pan=-0.4 + 0.8 * i / max(1, f['cells'] - 1))
# snare roll accelerating into the drop
t = C['boarding']
step = BEAT / 2
while t < C['drop'] - 0.25:
    add(music, snare(), t, 0.3 + 0.5 * (t - C['boarding']) / (C['drop'] - 0.25 - C['boarding']), pan=0.05)
    t += step
    step = max(BEAT / 8, step * 0.82)
for k in (0.0, 0.5, 1.0):
    add(music, kick(1.0), C['boarding'] + k, 0.9)
    kicks.append(C['boarding'] + k)
add(music, riser(2.0, 300, 9000, 0.7), C['boarding'])
add(sfx, mix2(metal_clank(70, 0.6, 0.9), stamp(1.0), whoosh(0.6, 200, 3000, 0.8)), C['tube'], 1.0, send=0.2)
add(sfx, whoosh(0.9, 400, 6000, 0.6), C['tube'] + 0.1)

# 18: the drop. Posted; the tap; then the other accounts on the downbeats.
add(sfx, impact(1.4), C['drop'], 1.0, send=0.45)
add(sfx, filt(noise(2.5), 6000, 'high') * env_exp(2.5, 0.7), C['drop'], 0.25, send=0.5)
drums(C['drop'], C['title'], clap_on=True, hats='off', heavy=True, kick_gain=1.05)
bassline(C['drop'], C['title'], 0.7, 1300)
for b in np.arange(C['drop'], C['title'], BEAT * 4):
    ch = PROG[chord_at(b)]
    add(music, supersaw(ch + [ch[0] + 12], BEAT * 4 + 0.3, cutoff=4200, attack=0.01, release=0.3, voices=7, gain=0.4), b, send=0.35)
arps(C['accounts'], C['title'], 0.18, 24, 8000)
add(sfx, click(2600, 0.06, 0.9), C['tap'], 0.7, pan=-0.1)
add(sfx, mix2(blip(1500, 2300, 0.14, 0.7), np.pad(blip(2300, 3000, 0.12, 0.5), (int(0.07 * SR), 0))), C['tap'], 0.9, pan=-0.1, send=0.35)
add(sfx, whoosh(0.8, 300, 2500, 0.45), C['accounts'])
for i, t in enumerate(C['rolls']):
    # the name rolls: a fast ratchet, then a lock
    for k in range(6):
        add(sfx, click(3200 - k * 200, 0.02, 0.5), t + k * 0.04, 0.5, pan=-0.2)
    add(sfx, blip(1200 + 300 * i, 1800 + 300 * i, 0.1, 0.4), t + 0.26, pan=-0.2, send=0.3)
for i, t in enumerate(C['drops']):
    add(sfx, mix2(impact(0.7), stamp(0.6)), t, 0.8, pan=[-0.45, 0.45][i], send=0.35)
add(sfx, riser(0.9, 500, 7000, 0.45), C['grid'] - 0.9)
add(sfx, whoosh(0.8, 300, 5000, 0.5), C['grid'])

# 26-32: the field of phones; the word forms on 29.
add(sfx, impact(0.7), C['wordForm'], 0.6, send=0.5)
add(music, supersaw([69, 72, 76, 81], 1.8, cutoff=6000, attack=0.005, release=1.2, voices=7, gain=0.35), C['wordForm'], send=0.6)
add(music, riser(1.5, 400, 9000, 0.6), C['title'] - 1.5)
add(sfx, reverse_cymbal(1.0), C['title'] - 1.0, 0.6)

# 32: title. Everything stops but a ringing chord.
add(sfx, impact(1.6), C['title'], 1.0, send=0.6)
add(music, supersaw([45, 57, 64, 69, 72, 76], 7.0, cutoff=lambda tm: 5000 * math.exp(-tm / 2.5) + 400, attack=0.005, release=3.5, voices=7, gain=0.55), C['title'], send=0.7)
add(music, filt(sine(mtof(33), 6.5) * env_exp(6.5, 2.5), 150) * 0.6, C['title'])
pip = TL['pipTyping']
for i, ch in enumerate(pip['text']):
    add(sfx, keystroke(500 + i), pip['start'] + i * pip['step'], 0.4, pan=(rng.random() - 0.5) * 0.3, send=0.15)

# ---------------------------------------------------------------------- mix
# Sidechain: everything melodic ducks under the kick.
duck = np.ones(N)
tk = np.arange(int(0.35 * SR)) / SR
shape = 1 - 0.55 * np.exp(-tk / 0.09) * np.clip(tk / 0.004, 0, 1)
for k in kicks:
    i0 = idx(k)
    n = min(len(shape), N - i0)
    if n > 0:
        duck[i0:i0 + n] = np.minimum(duck[i0:i0 + n], shape[:n])
music *= duck

t_axis = np.arange(N) / SR - PRE

# Reverb: synthetic stereo IR.
ir_d = 2.2
irt = np.arange(int(ir_d * SR)) / SR
ir = np.vstack([filt(rng.standard_normal(len(irt)), 6000) * np.exp(-irt / 0.55) for _ in range(2)])
ir[:, :int(0.012 * SR)] = 0
wet = np.vstack([signal.fftconvolve(verb[c] + music[c] * 0.12, ir[c])[:N] for c in range(2)]) * 0.05

mix = music * 0.9 + sfx * 0.85 + wet
# a breath before the drop: everything but the tail of the launch drops out
gap = 1 - 0.85 * np.clip((t_axis - (C['drop'] - 0.2)) / 0.03, 0, 1) * (1 - np.clip((t_axis - C['drop'] + 0.004) / 0.004, 0, 1))
mix *= gap
mix = filt(mix, 28, 'high', 2)

# fade out
fade = np.clip((DUR - 0.3 - t_axis) / 0.8, 0, 1)
mix *= fade


def master(x, gain):
    y = x * gain
    # soft knee limiter: tanh above the threshold, ceiling ~ -1 dBFS
    thr = 0.7
    a = np.abs(y)
    over = a > thr
    y[over] = np.sign(y[over]) * (thr + (0.8 - thr) * np.tanh((a[over] - thr) / (0.8 - thr)))
    # keep the true (inter-sample) peak under -1.2 dBTP
    tp = np.abs(signal.resample_poly(y, 4, 1, axis=1)).max()
    lim = 10 ** (-1.2 / 20)
    if tp > lim:
        y *= lim / tp
    return y


os.makedirs(os.path.join(ROOT, 'build'), exist_ok=True)
target = float(os.environ.get('LUFS', '-13'))
out_path = os.path.join(ROOT, 'build', 'score.wav')


def write(g):
    y = master(mix.copy(), g)
    wavfile.write(out_path, SR, (np.clip(y.T, -1, 1) * 32767).astype(np.int16))


def lufs():
    import subprocess
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', out_path, '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                       capture_output=True, text=True, check=False)
    if r.returncode != 0 or 'Summary:' not in r.stderr:
        raise RuntimeError(f'ffmpeg loudness measurement failed:\n{r.stderr[-2000:]}')
    txt = r.stderr
    sec = txt[txt.rfind('Summary:'):]
    I = float(sec.split('I:')[1].split('LUFS')[0])
    peak = float(sec.split('Peak:')[1].split('dBFS')[0])
    return I, peak


g = 1.0 / max(1e-9, np.abs(mix).max()) * 0.6
converged = False
for _ in range(6):
    write(g)
    loud, peak = lufs()
    if abs(loud - target) < 0.3:
        converged = True
        break
    g_next = g * 10 ** ((target - loud) / 20)
    if _ < 5:
        g = g_next
print(f'wrote {out_path}  integrated {loud:.1f} LUFS  true peak {peak:.1f} dBFS  gain {g:.3f}')
if not converged:
    sys.exit(f'loudness did not converge to {target} LUFS (got {loud:.1f}); the limiter is capping the level')
