# autotok launch video: direction

## Audience and the one idea

The film is for people who post TikTok videos, not for engineers. It explains the main concept
only: **you make a video, autotok uploads it to TikTok for you.** Log in once, then one command per
upload, now or scheduled, on any of your accounts. How it works inside (proxies, chunked transfer,
request signing) stays out of the picture.

## The story (each line has a source)

| | Claim | Source |
|---|---|---|
| What it is | Upload and schedule TikTok videos with one command. `pip install autotok`. | `README.md` header ("one login · one command per upload"), `autotok/cli.py` description |
| Log in once | `autotok login -n <name>` opens a login page; scanning the QR code with the TikTok app on your phone is quickest; the window closes by itself and prints `Account '<name>' saved.` | README "Log in to TikTok (once per account)", `cli.py` `cmd_login` |
| One command | `autotok upload -u <name> -v clip.mp4 -t "caption"` uploads and prints `Published. Video id: …` | README "Upload", `cli.py` `cmd_upload` |
| Now or later | TikTok-side scheduling 15 minutes to 10 days ahead (`-sc`). | README "Features", `cli.py` `--schedule` help (900 to 864000 s) |
| Posted | Hashtags and @mentions in the caption are clickable. | README "Features" |
| Any account | Log in once per account and upload by name. | README "Features" |

Claims the repo cannot back, and so the video does not make: views, reach or growth, star or user
counts, "undetectable", "ban-proof", account limits (the 1000+ accounts line is the paid Pro
product). The README says automating uploads may break TikTok's terms and get accounts banned, so
the end card carries that disclosure. TikTok's logo and UI are never shown; the login page, the
phone app and the post are generic rebuilds. The video id is illustrative.

## Concept: posting a parcel

Uploading a video is *posting* it, so the video is a cardboard parcel that leaves your computer and
is delivered to a phone, lit by two neon colours (cyan `#25F4EE`, magenta `#FE2C55`). Everyone knows
how a parcel gets sent: you write the address once, hand it over, pick a departure, and it arrives.
Signature move: **the delivery hit**. Every step lands on a beat with a physical arrival (the scan
locks, the parcel punches out, the capsule drops) with a flash, a camera kick and a chromatic split.

| What autotok does | Parcel analogy | Props |
|---|---|---|
| your video file | a parcel | cardboard, tape, a label with a frame of the clip |
| one-time login | registering at the counter | a QR code on screen, a phone that scans it, "saved" |
| one upload command | handing it over | the command typed in a terminal; the file tears out of the screen |
| upload in progress | on the belt, on its way | a depot conveyor |
| now or scheduled | the departures board | split-flap display: DEPARTS NOW, then 18:00; a NOW clock that flips forward; STATUS SCHEDULED, then BOARDING; a printed line for the 15 min to 10 days range |
| posted | delivered | pneumatic capsule into a phone dock; the post lights up; a tap on the tag |
| any account | another address on the label | the command's `-u` name rolls to bob, then cara; each phone receives |

## Shot list (music time; 120 BPM, 1 beat = 0.5 s; all cues in `src/timeline.json`)

| # | Time | Shot · header | Camera | Proud moment |
|---|---|---|---|---|
| 0 | −0.3–0 | Pre-roll thumbnail: wordmark, tagline, the completed command and its output | locked | scrolls away like a terminal into the opening |
| 1 | 0–4 | **"Log in once."** `autotok login -n alice` types; a login window with a QR code pops; a phone rises into the foreground and scans it | eases back to let the phone in, rack focus phone ↔ screen | on 3.0 the scan brackets snap onto the code, the window closes itself, and on 3.5 `Account 'alice' saved.` prints |
| 2 | 4–8 | **"One command."** `autotok upload -u alice -v clip.mp4 -t "Hello #fyp"` types on 32nd notes; *account*, *your video* and *caption* label the parts as they land | slow push into the command line | ENTER on 8.0: `clip.mp4` tears off the line and extrudes into a parcel that punches through the glass |
| 3 | 8–12 | **"On its way to TikTok."** Pull back into the depot; the parcel lands on alice's belt and rides | speed-ramped dolly back, swing low behind the parcel, whip pan | the landing on 9.0: squash, dust, the belt LEDs chase out from the impact |
| 4 | 12–18 | **"Post now, or schedule it."** Split-flap DEPARTURES: DEPARTS flips to NOW, then to 18:00; STATUS SCHEDULED; the NOW clock flips 17:00 → 18:00; STATUS BOARDING; the parcel boards an @alice capsule and launches | whip in, truck past a foreground pillar, tilt down to the capsule, tilt up with the launch | every flap that changes has its own clack in the score; the launch waits for the clock |
| 5 | 18–20.5 | **"Posted."** The capsule drops into a phone dock; the clip (a beach at sunset, someone dancing) plays with the caption; a fingertip taps `#fyp` and it lights as a link | low 3/4, push onto the caption for the tap | the drop: the screen ignites and two light rings wash across the floor |
| 6 | 20.5–26 | **"Any of your accounts."** Pull back: two more docks, and the command floating above them; its `-u alice` rolls to `bob`, then `cara`, and each phone receives its own post | dolly back and up, then push into alice's screen | each roll lands and a capsule drops on the next downbeat |
| 7 | 26–30.5 | **"One login. One command per upload."** Out of the screen into a field of phones lighting in waves | crane straight up, unwinding | seen from above, the lit phones spell `autotok` |
| 8 | 30.5–38.5 | Title: the dot-matrix word becomes the wordmark and fades out behind it; "Upload and schedule TikTok videos from your computer."; `pip install autotok`; repo URL; the disclosure, held about 4.5 s | slow push, light sweep | the chromatic split snaps together on the hit |

Transitions carry the object: screen → depot (the parcel punches through), depot → board (whip
pan), tube up → tube down into the phone, phone screen → field of phones (push in, pull out),
dot-matrix word → wordmark.
