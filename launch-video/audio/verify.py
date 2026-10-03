"""Check the mix by measurement (no ears): loudness, true peak, a spectrogram
with every cue marked, and the onset jump at each hit cue.

  python3 audio/verify.py build/score.wav renders/spectrogram.png
"""
import json, os, subprocess, sys
import numpy as np
from scipy import signal
from scipy.io import wavfile
from PIL import Image, ImageDraw, ImageFont


def load_font(size):
    for name in ('DejaVuSans.ttf', 'Arial.ttf'):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TL = json.load(open(os.path.join(ROOT, 'src', 'timeline.json')))
C = TL['cues']
wav, out = sys.argv[1], sys.argv[2]

r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', wav, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True)
summ = r.stderr[r.stderr.rfind('Summary:'):]
print(' '.join(summ.split()))

sr, x = wavfile.read(wav)
x = x.astype(np.float64).mean(axis=1) / 32768
pre = TL['preroll']

hit_cues = {'enter': [C['enter']], 'land': [C['land']], 'postmarks': C['postmarks'], 'lasers': C['lasers'],
            'seals': C['seals'], 'lifts': C['lifts'], 'commit': [C['commit']], 'doorClose': [C['doorClose']],
            'cableYank': [C['cableYank']], 'stamps': C['stamps'], 'tube': [C['tube']], 'drop': [C['drop']],
            'tap': [C['tap']], 'wordForm': [C['wordForm']], 'title': [C['title']]}
print('\nonset check (dB jump, 60 ms after vs 60 ms before, 2-8 kHz band and full band):')
hp = signal.butter(4, [2000, 8000], btype='band', fs=sr, output='sos')
xb = signal.sosfilt(hp, x)
def rms(a):
    return 10 * np.log10(np.mean(a ** 2) + 1e-12)
for name, ts in hit_cues.items():
    vals = []
    for t in ts:
        i = int((t + pre) * sr)
        w = int(0.06 * sr)
        vals.append((rms(x[i:i + w]) - rms(x[i - w:i]), rms(xb[i:i + w]) - rms(xb[i - w:i])))
    print(f'  {name:10s} ' + '  '.join(f'@{t:5.2f}: {a:+5.1f} dB / {b:+5.1f} dB' for t, (a, b) in zip(ts, vals)))

# spectrogram with cue markers
f, tt, S = signal.spectrogram(x, sr, nperseg=2048, noverlap=1536)
S = 10 * np.log10(S + 1e-12)
keep = f < 12000
S = S[keep]; f = f[keep]
S = np.clip((S - (S.max() - 80)) / 80, 0, 1)
W, H = 2400, 700
img = (np.flipud(S) * 255).astype(np.uint8)
im = Image.fromarray(img).resize((W, H))
lut = np.zeros((256, 3), np.uint8)
for i in range(256):
    v = i / 255
    lut[i] = [int(255 * min(1, v * 1.8)), int(255 * max(0, min(1, v * 1.8 - 0.6))), min(255, int(255 * max(0, min(1, (v - 0.75) * 4)) + 60 * v))]
im = Image.fromarray(lut[np.array(im)])
d = ImageDraw.Draw(im)
font = load_font(13)
total = len(x) / sr
for name, ts in hit_cues.items():
    for t in ts:
        px = int((t + pre) / total * W)
        d.line([(px, 0), (px, H)], fill=(37, 244, 238), width=1)
        d.text((px + 2, 4 + (hash(name) % 5) * 15), name, fill=(255, 255, 255), font=font)
for s in TL['shots']:
    px = int((s['start'] + pre) / total * W)
    d.line([(px, H - 20), (px, H)], fill=(255, 255, 0), width=3)
im.save(out)
print('\n' + out)
