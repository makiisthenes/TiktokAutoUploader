# autotok launch video

A 38.5-second motion-graphics film that explains autotok to people who post TikTok videos: log in
once, then one command uploads a video to TikTok, now or scheduled, on any of your accounts. It is
rendered frame by frame from three.js in headless Chromium, with a score synthesized in numpy.
Nothing is hand-keyed in an editor: every frame and every sound is generated from the code and
`src/timeline.json`.

The direction (story, sources, analogy, shot list) is in [DIRECTION.md](DIRECTION.md).

## Commands

```bash
cd launch-video
npm install                      # three, esbuild, playwright-core, fonts
npm run install-browser          # Chromium for playwright-core (or point CHROME_PATH at a Chromium/Chrome)
pip install numpy scipy pillow   # score + verification

npm run build                    # bundle src/ -> build/bundle.js
node scripts/render.mjs --stills 9.9,19.4      # 1080p PNGs of any video times (renders/stills/)
node scripts/render.mjs --draft                # 960x540 @ 30 fps -> renders/draft_video.mp4
node scripts/render.mjs --master --workers 3   # 1920x1080 @ 60 fps -> renders/master_video.mp4
python3 audio/score.py                         # -> build/score.wav (normalised to -13 LUFS, <= -1.2 dBTP)
python3 audio/verify.py build/score.wav renders/spectrogram.png
scripts/mux.sh renders/master_video.mp4 build/score.wav renders/autotok-launch.mp4   # AAC 320k, <= -1 dBTP
python3 scripts/sheet.py renders/sheet.jpg --video renders/autotok-launch.mp4 --from 0 --to 8 --n 12
```

Thumbnail and key art are rendered stills (lossless, 1080p); `npm run preview` renders all three:

```bash
node scripts/render.mjs --stills 0.1     # thumbnail: the pre-roll frame (name, tagline, command and output)
node scripts/render.mjs --stills 25.45   # key art: three phones, one command, the -u name on cara
node scripts/render.mjs --stills 29.9    # key art: the field of phones spelling autotok from above
```

`render.mjs` uses the Chromium that Playwright installs (set `CHROME_PATH` to use another) with
SwiftShader, so it runs on a machine without a GPU. Frames are read back with `readPixels` and piped
to ffmpeg. The timeline is cut into 4-second chunks (`renders/<draft|master>_chunks/`) that
`--workers N` browsers pull from a queue; finished chunks are kept, so an interrupted render resumes
where it stopped, `--redo 3,4` re-renders only those chunks after a fix, and `--fresh` starts over.
The chunks are then joined without re-encoding. `--only depot,board` loads only some sets (for
stills). On a 4-core machine without a GPU a 1080p60 master takes about two hours.

`renders/` and `build/` are generated and ignored by git.

## The timing principle

`src/timeline.json` is the only place a time lives. The picture (`src/sets/*.js`) and the score
(`audio/score.py`) both read it, so hits land on hits by construction:

- cue times (`loginEnter`, `scan`, `enter`, `land`, `drop`, `rolls`, `drops`, `title`, ...) drive
  both the animation and the matching sound;
- the typing schedules (`loginTyping`, `typing`, `pipTyping`) are expanded by the same formula on
  both sides (`typingTimes` in `src/engine/util.js`, mirrored in `score.py`), one keystroke sound
  per glyph;
- the split-flap board's flips (`flips` + `flap`) use `flapFlipTimes`, mirrored in `score.py`, so
  every flap you see has its own clack;
- the pre-roll (`preroll`, 0.3 s) is the thumbnail hold: the score is rendered with the same offset.

Every frame is a pure function of time (particles are closed-form, every animation reads `t`), so
frames can be rendered in any order and in parallel.

The mix was checked by measurement, not by ear: `audio/verify.py` reports integrated loudness and
true peak (ffmpeg `ebur128`), the energy jump at every hit cue, and draws a spectrogram with the cues
marked. AAC encoding overshoots the score's true peak by up to about a decibel on the hardest hits,
so `scripts/mux.sh` measures the encoded file and trims the audio gain until it is under -1 dBTP
(the delivered film measures -13.7 LUFS integrated, -1.6 dBTP).

## Claims disclosure (keep this when editing)

Everything the film states comes from this repository; see the source table in DIRECTION.md.

- Log in once per account; the QR code with the TikTok app is the quickest login; the login window
  closes by itself: README "Log in to TikTok (once per account)". `Account 'alice' saved.` is the
  CLI's real output (`autotok/cli.py`).
- One command per upload, and `Published. Video id: ...` is the CLI's real output format
  (`autotok/cli.py`); the id is illustrative.
- TikTok-side scheduling from 15 minutes to 10 days: README "Features", `cli.py` `--schedule`.
- Clickable hashtags, and several accounts uploaded to by name: README "Features".
- The QR code is a pattern, not a working code. The login window, the phone camera and the post are
  generic rebuilds; TikTok's logo and UI are not used.
- The end card carries the README's warning: not affiliated with TikTok; automated uploading may
  break TikTok's terms and get accounts restricted or banned; AGPL-3.0.
- Do not add views, reach or growth claims, star or user counts, "undetectable" or "ban-proof"
  claims, or the Pro product's account limits: the repository does not back them.
