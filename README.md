# autotok — TikTok Auto Uploader

<p align="center">
  <img src="https://user-images.githubusercontent.com/52138450/111885490-04ab6680-89c0-11eb-955a-f833577b4406.png" width="35%" alt="TiktokAutoUploader logo">
</p>

<p align="center">Upload and schedule TikTok videos from the command line or Python, with a proxy per account.</p>
<p align="center"><code>pip install autotok</code> · one login · one command per upload</p>

<p align="center">
  <a href="https://pypi.org/project/autotok/"><img alt="PyPI" src="https://img.shields.io/pypi/v/autotok"></a>
  <a href="https://github.com/makiisthenes/TiktokAutoUploader/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/makiisthenes/TiktokAutoUploader/actions/workflows/ci.yml/badge.svg"></a>
  <a href="LICENSE"><img alt="License: AGPL-3.0" src="https://img.shields.io/badge/license-AGPL--3.0-blue"></a>
  <a href="https://www.linkedin.com/in/michael-p-88b015200/"><img alt="LinkedIn" src="https://img.shields.io/badge/LinkedIn-0077B5?style=flat-square&logo=linkedin&logoColor=white"></a>
  <img alt="Stars" src="https://img.shields.io/github/stars/makiisthenes/TiktokAutoUploader">
  <img alt="Forks" src="https://img.shields.io/github/forks/makiisthenes/TiktokAutoUploader">
</p>

---

## Sponsors

<p align="center">
  <a href="https://www.swiftproxy.net/?ref=makiisthenes">
    <img src="https://github.com/user-attachments/assets/a1d0e915-e09a-4b36-ba72-788c4cc1e709" alt="Swiftproxy — 90M+ residential proxies" width="420">
  </a>
</p>

[**Swiftproxy**](https://www.swiftproxy.net/?ref=makiisthenes) provides 90M+ clean residential and static residential proxies designed for social media automation, multi-account management, and web automation workflows. With stable connections, global IP coverage, and reliable proxy infrastructure, Swiftproxy helps users manage multiple accounts securely, reduce IP-related restrictions, and scale their automation tasks. Residential proxy traffic never expires until used, and free testing is available.

> **Get 10% off** with code `PROXY90` — [Get proxies from Swiftproxy →](https://www.swiftproxy.net/?ref=makiisthenes)

<p align="center">
  <a href="https://termius.com/">
    <img src="https://raw.githubusercontent.com/makiisthenes/TiktokAutoUploader/main/termius-logo-1084-black.png" alt="Termius" width="240">
  </a>
</p>

[**Termius**](https://termius.com/) provides a secure, reliable, and collaborative SSH client.

---

## Features

- **One-command uploads** through TikTok's web upload API. No clicking through the TikTok website.
- **Proxy per account**: login, request signing and every upload go through the same proxy, so each account always appears from one IP. HTTP(S) and SOCKS5 are supported.
- **Multiple accounts**: log in once per account and upload by name.
- **Scheduling**: TikTok-side scheduling from 15 minutes to 10 days ahead. The self-hosted web app adds a scheduler with no time limit.
- **Post settings**: public or private, and comments, duets, stitches and the AI-generated label on or off.
- **Clickable hashtags and @mentions**, emoji-safe.
- **YouTube links** download automatically with [yt-dlp](https://github.com/yt-dlp/yt-dlp).
- **Python SDK, CLI, and an optional web app** (Docker) with a browser-based login.
- **No Node.js**: TikTok's request signatures are computed locally in headless Chromium.

---

## Install

Requires Python 3.10+.

```bash
pip install autotok                # add [youtube] for YouTube links: pip install "autotok[youtube]"
autotok install-browser            # one-time download of the Chromium build autotok uses
```

On a fresh Linux server, use `autotok install-browser --with-deps` (as root) to also install Chromium's system libraries.

---

## Quick start

```bash
# 1. Log in once. A browser window opens; log in to TikTok and it closes by itself.
autotok login -n my_account

#    ...or log in through a proxy (saved and reused for every upload from this account)
autotok login -n my_account -p http://user:pass@proxy.example.com:8000

# 2. Upload
autotok upload -u my_account -v video.mp4 -t "My caption #fyp"

# Schedule for one hour from now, with comments turned off
autotok upload -u my_account -v video.mp4 -t "Later #fyp" -sc 3600 -ct 0

# Upload a YouTube Short
autotok upload -u my_account -yt "https://www.youtube.com/shorts/xxxxxxxxxxx" -t "Caption"
```

`-v` accepts a path, or just a file name inside your videos folder (`~/.autotok/videos`, or
`VideosDirPath/` when you run from a TiktokAutoUploader checkout).

---

## Proxies

Running several accounts from one IP is the quickest way to get them flagged. autotok lets you give
every account its own proxy, and uses it **everywhere** that account talks to TikTok:

| Step | Goes through the account's proxy |
|---|---|
| Login browser (`autotok login`, web app login) | ✅ |
| Signature page fetch | ✅ (the signing browser itself makes no network requests) |
| Upload API calls and video transfer | ✅ |
| YouTube downloads | ❌ (not TikTok traffic; saves proxy bandwidth) |

**Set, change and test proxies**

```bash
autotok login -n alice -p http://user:pass@gate.example.com:7000   # set at login
autotok proxy set alice socks5://user:pass@gate.example.com:1080     # set or change later
autotok proxy test -u alice                                          # shows the IP TikTok will see
autotok proxy clear alice                                            # go direct
autotok accounts list                                                # every account and its proxy (passwords hidden)

autotok upload -u alice -v clip.mp4 -t "hi" -p http://other:pass@host:8000   # one-off override
autotok upload -u alice -v clip.mp4 -t "hi" --no-proxy                       # ignore the saved proxy once
```

**Accepted formats** (scheme defaults to `http`)

```
http://user:pass@host:port      https://user:pass@host:port
socks5://user:pass@host:port    host:port
user:pass@host:port             host:port:user:pass      ← the export format most providers use
```

**Tips**

- Use **residential or mobile** proxies, one per account, with a **sticky session** (same IP for
  hours). A proxy that rotates the IP on every request makes a logged-in session look hijacked.
- Log in **through the proxy** you will upload with (`autotok login -p ...`). Logging in from home and
  uploading from a proxy is a mismatch TikTok can see.
- Chromium can't use SOCKS5 proxies that need a username and password. For the login step, use your
  provider's HTTP endpoint (uploads work with either).
- Passwords are never printed: the CLI and web app show `http://user:****@host:port`.

Need proxies? See our [sponsors](#sponsors).

---

## Python SDK

```python
import autotok

autotok.login("alice", proxy="http://user:pass@gate.example.com:7000")   # once; opens a browser

result = autotok.upload_video("alice", "clip.mp4", "Hello #fyp")
print(result.video_id)

# More control: reuse a client, set post options, schedule
from datetime import datetime, timedelta, timezone

client = autotok.Client.from_account("alice")          # uses alice's saved proxy
client.upload(
    "clip.mp4",
    "Going live tomorrow #fyp @friend",
    schedule=datetime.now(timezone.utc) + timedelta(days=1),   # or seconds, or a timedelta
    visibility="public",            # or "private"
    allow_comment=True,
    allow_duet=False,
    allow_stitch=False,
    ai_label=False,
)

# Errors are typed; `retryable` is True only when nothing reached TikTok's publish step.
try:
    client.upload("clip.mp4", "caption")
except autotok.PublishError as e:          # TikTok rejected the post (e.g. guidelines)
    print(e.status_code, e.status_msg)
except autotok.AutotokError as e:
    print("failed:", e, "safe to retry:", e.retryable)
```

Already have a `sessionid` cookie from your browser? Skip the login window:

```python
autotok.import_session("alice", "<sessionid value>", datacenter="<tt-target-idc value>")
```

---

## CLI reference

```
autotok login     -n NAME [-p PROXY] [--force] [--sessionid ID --datacenter DC]
autotok upload    -u NAME (-v FILE | -yt URL) -t CAPTION [options]
autotok accounts  list | check NAME | remove NAME
autotok proxy     set NAME PROXY | clear NAME | test [PROXY | -u NAME]
autotok show      -u (accounts) | -v (videos)
autotok install-browser [--with-deps]
autotok shell                         # interactive prompt
```

Upload options:

| Flag | Description | Default |
|---|---|---|
| `-u` / `--user` | Saved account name | *required* |
| `-v` / `--video` | Video file (path or name in your videos folder) | — |
| `-yt` / `--youtube` | YouTube URL to download and upload | — |
| `-t` / `--title` | Caption, up to 2200 characters | *required* |
| `-sc` / `--schedule` | Publish this many seconds from now (900–864000) | now |
| `-vi` / `--visibility` | `0` public, `1` private | `0` |
| `-ct` / `--comment` | Allow comments (`0`/`1`) | `1` |
| `-d` / `--duet` | Allow duets (`0`/`1`) | `0` |
| `-st` / `--stitch` | Allow stitches (`0`/`1`) | `0` |
| `-ai` / `--ailabel` | Label as AI-generated (`0`/`1`) | `0` |
| `-p` / `--proxy` | Proxy for this upload only | account's proxy |
| `--no-proxy` | Ignore the account's saved proxy | — |

`python cli.py ...` in this repository still works and is the same as `autotok ...`.

---

## Web app (self-hosted)

A local control panel with accounts, proxies, a video library, uploads and a scheduler, plus a
virtual browser for logging in. Requires Docker.

```bash
git clone https://github.com/makiisthenes/TiktokAutoUploader.git
cd TiktokAutoUploader
docker compose up --build
```

Open <http://localhost:3000>. The API docs are at <http://localhost:8000/docs>.

- **Accounts**: add accounts by logging in through the built-in virtual browser (with an optional
  proxy), then set, change or test each account's proxy and check its session.
- **Upload**: drop a file, pick one from the library, or paste a YouTube link. Publish now or
  schedule for any time.
- **Schedules**: the scheduler retries only failures that happened before anything reached TikTok,
  so a job can't post twice.

Data lives in `./data`. To use an account you logged in to with the CLI, copy its file into the
app's store and click **Import from disk** on the Accounts page:

```bash
mkdir -p data/autotok/accounts && cp ~/.autotok/accounts/my_account.json data/autotok/accounts/
```

(Files the containers write are owned by root on Linux, so use the web app's own login for
accounts you manage there.)

Scripts that call the API directly must send the header `X-Requested-With: autotok` on
`POST`/`PATCH`/`DELETE` requests. This stops other web pages from using the local API.

> The web app has no login of its own and only listens on `127.0.0.1`. Don't expose it to the
> internet.

---

## Configuration

Everything is optional and set through environment variables:

| Variable | Purpose | Default |
|---|---|---|
| `AUTOTOK_HOME` | Saved accounts and settings | `~/.autotok` |
| `AUTOTOK_VIDEOS_DIR` | Videos folder and YouTube downloads | `$AUTOTOK_HOME/videos` |
| `AUTOTOK_BROWSER_CHANNEL` | Use an installed browser, e.g. `chrome` | Playwright Chromium |
| `AUTOTOK_BROWSER_PATH` | Full path to a Chrome/Chromium binary | Playwright Chromium |

Account files contain your TikTok session (equivalent to your password). They are saved with
owner-only permissions; keep them private.

---

## Upgrading from TiktokAutoUploader 1.x

- **Install:** `pip install autotok && autotok install-browser`. Node.js and `npm install` are no longer needed.
- **Sessions:** saved sessions in `CookiesDir/` are migrated automatically the first time you use
  them from the repository folder. The flags are the same, and `python cli.py` still works.
- **Scheduling:** `-sc` schedules on TikTok's side again (15 minutes to 10 days). The 1.x local
  queue (`cli.py schedule list|cancel`) now lives in the web app's Schedules page.
- **Bug fixes:** privacy, comment, duet and stitch settings are now actually applied. Earlier
  versions always posted publicly with everything allowed. Hashtags are clickable again.
- **Removed:** `config.txt` and the unused ImageMagick video-editing helpers.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `Chromium for Playwright is not installed` | `autotok install-browser` (Linux servers: add `--with-deps`) |
| `TikTok rejected the session` / `session rejected` | `autotok login -n NAME --force` (check with `autotok accounts check NAME`) |
| `Invalid parameters (status_code=5)` | TikTok changed its upload API. Please [open an issue](https://github.com/makiisthenes/TiktokAutoUploader/issues) with the full error. |
| `potential violation of our Community Guidelines` | TikTok blocked that video's content; it isn't a tool error. |
| Login page refuses to log in / shows a captcha loop | Try your installed Chrome: `AUTOTOK_BROWSER_CHANNEL=chrome autotok login -n NAME`, or copy the `sessionid` cookie from your browser and use `autotok login -n NAME --sessionid ...` |
| `No TikTok datacenter cookie saved` warning | Log in again with `autotok login`, or pass `--datacenter` with `--sessionid` |
| `may or may not have been posted` | The connection dropped while publishing. Check the account before retrying, to avoid a duplicate. |

See also [Common Problems](Common%20Problems%20Help%20Readme.md).

---

## Demo

Video showcases main usage of the app, uploading a video to TikTok.

<p align="center">
  <video src="https://github.com/makiisthenes/TiktokAutoUploader/assets/52138450/3dc36fd4-b9f4-4059-bcb4-c2ddca2a285d" controls width="320" height="240">
  </video>
</p>

---

## Professional Software (autotok Pro)

Fill waiting list form: https://forms.gle/M4KpdfruqCukQvj99

If you are looking for something more, which can get you faster to your goal, I offer software which can:

- Handle more than 1000 accounts
- Upload identical videos to multiple accounts automatically
- Schedule videos for multiple accounts, 20 days to 2 years in advance
- Automatically source videos from YouTube, X, Reddit, TikTok
- Setup uploading pipelines, from source to uploading schedule
- Metrics for viewing current performance of these different accounts
- Personalised support from me for any issues you may face for up to 3 months
- Proxy support, clean and modern UI

Available for purchase, if interested please email me at `michaelperes562@gmail.com` with subject line `Tiktok Bot Software` or else I might miss the email.

---

## Licensing

autotok is **dual-licensed**:

- **Open source:** [GNU AGPL v3.0](LICENSE). Use, modify and share it freely. If you distribute a
  modified version, or run one as a service for others, you must publish your source code under the
  same licence.
- **Commercial:** to build autotok into closed-source products or paid services without the AGPL
  obligations, or to use autotok Pro, contact `michaelperes562@gmail.com`.

Copyright © 2021–2026 Michael Peres. Releases before 2.0.0 remain under the licence they were
published with. The bundled signing scripts are third-party code, see
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Contributions are welcome under the terms in
[CONTRIBUTING.md](CONTRIBUTING.md).

---

## Support This Project

If you like the work provided, please consider supporting me through [Patreon](https://patreon.com/makiisthenes) or [Ko-Fi](https://ko-fi.com/makiperes), or star the project.

- Thanks [@DelvinBa](https://github.com/DelvinBa) for updating to TikTok's new upload endpoint. (09/12/2024)

## Bugs and Issues

Please report bugs in the [issues tab](https://github.com/makiisthenes/TiktokAutoUploader/issues) rather than by email.

## Notes and Terms

This project is not affiliated with TikTok. Automating uploads may break TikTok's terms of service
and can get accounts restricted or banned. Only upload content you have the rights to. Use at your
own risk.

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=makiisthenes/TiktokAutoUploader&type=Date)](https://star-history.com/#makiisthenes/TiktokAutoUploader&Date)
