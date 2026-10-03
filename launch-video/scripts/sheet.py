"""Tile images (or frames sampled from a video) into a labelled contact sheet.

  python3 scripts/sheet.py out.jpg a.png b.png ...            # stills
  python3 scripts/sheet.py out.jpg --video v.mp4 --from 8 --to 16 --n 12 [--cols 4]
"""
import subprocess, sys, os, tempfile
from PIL import Image, ImageDraw, ImageFont

args = sys.argv[1:]
out = args.pop(0)
cols = 3
if '--cols' in args:
    i = args.index('--cols'); cols = int(args[i + 1]); del args[i:i + 2]
items = []
if '--video' in args:
    g = lambda k, d=None: args[args.index(k) + 1] if k in args else d
    video, a, b, n = g('--video'), float(g('--from')), float(g('--to')), int(g('--n', 12))
    tmp = tempfile.mkdtemp()
    for k in range(n):
        t = a + (b - a) * (k + 0.5) / n
        f = os.path.join(tmp, f'{k:03d}.png')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{t:.3f}', '-i', video, '-frames:v', '1', '-vf', 'scale=640:-1', f], check=True)
        items.append((f, f'{t:.2f}s'))
else:
    for f in args:
        items.append((f, os.path.basename(f).replace('.png', '')))
W = 640
ims = []
for f, lab in items:
    im = Image.open(f).convert('RGB')
    im = im.resize((W, int(im.height * W / im.width)))
    d = ImageDraw.Draw(im)
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 20)
    d.rectangle([0, 0, 110, 28], fill=(0, 0, 0))
    d.text((6, 3), lab, fill=(255, 255, 0), font=font)
    ims.append(im)
H = ims[0].height
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * W + (cols - 1) * 4, rows * H + (rows - 1) * 4), (40, 40, 40))
for i, im in enumerate(ims):
    sheet.paste(im, ((i % cols) * (W + 4), (i // cols) * (H + 4)))
sheet.save(out, quality=88)
print(out)
