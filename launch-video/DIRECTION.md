# autotok launch video: direction

## The story (each line has a source)

| | Claim | Source |
|---|---|---|
| What it is | Upload and schedule TikTok videos from the command line or Python, with a proxy per account. `pip install autotok`. | `README.md` header |
| How it works | The file is read in **5 MB parts**, each sent with its **CRC32**; a finish call lists `part:crc` pairs; then a commit. | `autotok/uploader.py` `_transfer`, `CHUNK_SIZE` |
| | The publish URL is signed (`_signature`, `X-Bogus`) by TikTok's own JS in a **headless Chromium page that never touches the network**: the page fetch goes through `requests` (the account's proxy), every other request is blocked. | `autotok/signer.py` docstring, `_route` |
| | **One proxy per account**, used for login, the signature page fetch and every upload request. | README "Proxies" table, CHANGELOG 2.0.0 |
| | TikTok-side scheduling **15 minutes to 10 days** ahead. | `uploader.py` `MIN_SCHEDULE`/`MAX_SCHEDULE`, README |
| | CLI prints `Published. Video id: …` | `autotok/cli.py` `cmd_upload` |

Claims the repo cannot back, and so the video does not make: star or user counts, "undetectable",
"ban-proof", account limits (the 1000+ accounts line is the paid Pro product, not this repo).
The README says automating uploads may break TikTok's terms and get accounts banned, so the end
card carries that disclosure. TikTok's logo is never shown; the project is not affiliated.
The IPs on screen are RFC 5737 documentation addresses. The video id is illustrative.

## Concept: the night depot

Uploading is **posting**, so the world is a night-time parcel depot lit by two neon colours
(cyan `#25F4EE`, magenta `#FE2C55`). The video file is a cardboard parcel; the camera rides
the line with it from the terminal to a phone. Signature move: **the stamp**. Every station
ends in an object being physically marked on a beat (postmark, seal, signature), with an ink
burst, a camera kick and chromatic aberration.

| Mechanism | Depot analogy | Props |
|---|---|---|
| the video file | a parcel | cardboard, tape, shipping label |
| the account's proxy | a sealed tunnel with a postmark | postmark ring with the IP, glass tunnel, gate signs |
| 5 MB parts + CRC32 | cut into crates, each with a checksum seal | laser gantry, stencilled crates, seal stickers, magnet crane, manifest |
| finish + commit | manifest checked, hatch shut | clipboard hologram, hatch, green lamp |
| signing in a browser that makes no requests | a glass booth with its network cable pulled | glass booth, NETWORK port, two rubber stamps |
| TikTok-side schedule | departures board | split-flap display |
| published | delivered | pneumatic capsule, phone, a tap on the tag |

## Shot list (music time; 120 BPM, 1 beat = 0.5 s; all cues in `src/timeline.json`)

| # | Time | Shot · header | Camera | Proud moment |
|---|---|---|---|---|
| 0 | −0.3–0 | Pre-roll thumbnail: wordmark, tagline, the completed command and its output | locked | the frame feeds pick; it scrolls away like a terminal |
| 1 | 0–4 | **Command.** History shows the one-time `autotok login`; `autotok upload …` types on 32nd notes | push in on the glass toward the command line | ENTER on 4.0: `clip.mp4` tears off the line and extrudes into a parcel that punches through the screen |
| 2 | 4–8 | **Reveal.** Pull back into the depot; the parcel tumbles onto alice's belt | speed-ramped dolly back + crane, then swings low over the lanes behind the parcel | the landing on 5.0: squash, dust, the belt LEDs chase out from the impact |
| 3 | 8–16 | **"One account. One IP."** Three lanes, three postmark heads, three tunnels | crane up and over to top-down, sweep across to the tunnel mouths, dive into alice's tunnel | postmarks slam on 9, 9.5, 10 with each account's IP; tunnels ignite like fuses; gates LOGIN / SIGNING / UPLOAD all show the same IP |
| 4 | 16–24 | **"5 MB parts. Each checksummed."** Out of the tunnel mouth (match cut); laser gantry cuts 5/5/4 MB crates; CRC32 seal stickers; magnet crane into storage; the real `part:crc` manifest checks; lid slams (commit) | Catmull-Rom path: low arrival, push into the lasers, orbit to read the seals, crane up, settle on the manifest | two laser sheets slice exactly at the part boundaries; the label splits across the crates |
| 5 | 24–32 | **"Signed in a browser with no network."** The publish envelope enters a glass HEADLESS CHROMIUM booth; the door seals; the NETWORK cable is yanked (insert close-up); two stamps: `_signature`, `X-Bogus` | orbit, insert on the port, low close-up over the table with the browser behind, rack focus to the browser's readout after each stamp, dolly with the exit, whip | the plug rips out in sparks, the LED goes red and **the music goes muffled** until the door opens |
| 6 | 32–38 | **"Scheduled on TikTok's side."** Split-flap DEPARTURES: EARLIEST +15 MIN, LATEST +10 DAYS, STATUS SCHEDULED; the envelope boards an @alice capsule | whip in, truck past a foreground pillar, tilt down to the capsule, tilt up with the launch | every flap flip has its own clack in the score |
| 7 | 38–42 | **"Posted. Tags clickable."** The capsule drops into a phone dock; the post ignites; a fingertip taps `#fyp` and it lights as a link | low 3/4, push onto the caption for the tap, ease out, push into the screen | the drop: the screen ignites and two light rings wash across the floor |
| 8 | 42–48 | **"One login. One command per upload."** Out of the screen into a field of 2,268 phones lighting in waves | crane straight up, unwinding | seen from above, the lit phones spell `autotok` |
| 9 | 48–55 | Title: the dot-matrix word becomes the wordmark; `pip install autotok`; repo URL; disclosure | slow push, light sweep | the chromatic split snaps together on the hit |

Transitions carry the object: screen → depot (the parcel punches through), tunnel → bay (cut on the
tunnel mouth), bay → booth and booth → board (whip pans), tube up → tube down into the phone,
phone screen → field of phones (push in, pull out), dot-matrix word → wordmark.
