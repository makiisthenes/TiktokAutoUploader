"""Encode the film as the autoplaying animated WebP shown at the top of the repository README.

  node scripts/render.mjs --w 960 --h 540 --fps 15 --grain 0 --fresh --out gif_source.mp4
  python3 scripts/preview.py renders/gif_source.mp4 ../docs/media/autotok-launch.webp [--w 800 --fps 12 --q 50]

GitHub can't autoplay a video file in a README, and a GIF of the whole film is 25 MB at 640 px, so the
preview is a lossy animated WebP, which GitHub and PyPI show like any image. Keep it under 5 MiB:
the image proxies that serve README images can refuse larger files.

Every frame is a keyframe (kmax=1). Between keyframes libwebp only redraws pixels that changed by
more than a quality-dependent threshold, which leaves stale blocks behind on the film's dark fades.
"""
import os
import subprocess
import sys

from PIL import Image

args = sys.argv[1:]
src, out = args[0], args[1]
opt = lambda k, d: type(d)(args[args.index(k) + 1]) if k in args else d
w, fps, q = opt('--w', 800), opt('--fps', 12), opt('--q', 50)
h = round(w * 9 / 16 / 2) * 2

ff = subprocess.Popen(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', src,
                       '-vf', f'fps={fps},scale={w}:{h}:flags=lanczos', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                      stdout=subprocess.PIPE)
frames = []
while len(buf := ff.stdout.read(w * h * 3)) == w * h * 3:
    frames.append(Image.frombytes('RGB', (w, h), buf))
if ff.wait() != 0 or not frames:
    sys.exit(f'ffmpeg could not read {src}')

frames[0].save(out, save_all=True, append_images=frames[1:], duration=round(1000 / fps), loop=0,
               lossless=False, quality=q, method=6, kmin=0, kmax=1)
size = os.path.getsize(out) / 2**20
print(f'{out}: {len(frames)} frames, {w}x{h} @ {fps} fps, q{q}, {size:.2f} MiB')
if size > 5:
    print('warning: over 5 MiB; lower --q, --w or --fps', file=sys.stderr)
