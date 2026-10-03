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
- **Cloud browsers**: run the login and signing browser on [Browserbase](https://www.browserbase.com) or [Steel](https://github.com/steel-dev/steel-browser) (cloud or self-hosted) instead of your computer.
- **Docker image** for running the CLI on servers.
- **No Node.js**: TikTok's request signatures are computed in headless Chromium.

---

## Getting started

Setup takes about five minutes. You need **Python 3.10 or newer**; check with `python --version`
(Windows: `py --version`). Get Python from [python.org](https://www.python.org/downloads/) if needed.

### 1. Install autotok

Install it into its own virtual environment, so its packages don't clash with anything else on your
computer:

**Windows** (PowerShell or Command Prompt)

```bat
py -m venv autotok-env
autotok-env\Scripts\activate
pip install "autotok[youtube]"
```

**macOS / Linux**

```bash
python3 -m venv autotok-env
source autotok-env/bin/activate
pip install "autotok[youtube]"
```

Check it worked with `autotok --version`. Next time you open a terminal, run the `activate` line
again before using autotok.

- `[youtube]` adds YouTube-link support. Leave it out (`pip install autotok`) if you don't need it.
- To update later: `pip install -U "autotok[youtube]"`.
- Latest development version straight from GitHub:
  `pip install "autotok[youtube] @ git+https://github.com/makiisthenes/TiktokAutoUploader.git"`
- `autotok` "not recognized" or "command not found"? Activate the environment again, or use
  `python -m autotok ...` instead; it works the same way.

### 2. Choose where the browser runs

autotok uses a browser for the one-time login and to sign each upload. Pick one:

| Option | Best for | Setup |
|---|---|---|
| **Local** (default) | Your own computer | `autotok install-browser`, a one-time download of about 300 MB |
| **Cloud** ([Browserbase](https://www.browserbase.com) or [Steel](https://github.com/steel-dev/steel-browser)) | Servers, Docker, or keeping your computer free | Add an API key to a settings file. See [Cloud browsers](#cloud-browsers-browserbase-steel) |

For the local browser on a fresh Linux server, run `autotok install-browser --with-deps` as root, which
also installs Chromium's system libraries.

### 3. Log in to TikTok (once per account)

```bash
autotok login -n my_account
```

A browser window opens on TikTok's login page. Log in however you like; the QR code with the TikTok
app on your phone is quickest. The window closes by itself and the session is saved as `my_account`.
With a cloud browser you get a link to open instead.

```bash
autotok accounts check my_account     # confirms TikTok accepts the saved session
```

- Going to use a proxy for this account? Pass it now, so the login and later uploads share one IP:
  `autotok login -n my_account -p http://user:pass@host:port` (see [Proxies](#proxies)).
- Repeat with a different `-n` name for each account.
- Sessions are saved in `~/.autotok/accounts`. Treat them like passwords.

### 4. Upload

```bash
autotok upload -u my_account -v "C:\Videos\clip.mp4" -t "My caption #fyp"
```

That's it. More examples:

```bash
autotok upload -u my_account -v clip.mp4 -t "Just for me" -vi 1                 # private
autotok upload -u my_account -v clip.mp4 -t "Later #fyp" -sc 3600               # publish in 1 hour
autotok upload -u my_account -yt "https://www.youtube.com/shorts/xxxxxxxxxxx" -t "Caption"
```

`-v` takes a path to any video, or just a file name if the video is in `~/.autotok/videos`. See the
[CLI reference](#cli-reference) for every option.

### 5. Optional: save your settings in a file

Settings such as a cloud browser or its API key go in a `.env` file. autotok looks in the folder you
run it from, then in `~/.autotok/.env`; the second location suits a pip install. Copy
[`.env.example`](.env.example) (from this repository) or start with just what you need:

```bash
# ~/.autotok/.env   (Windows: C:\Users\<you>\.autotok\.env)
AUTOTOK_BROWSER=browserbase
BROWSERBASE_API_KEY=bb_live_...
```

### Where next?

| I want to... | See |
|---|---|
| Run several accounts, each with its own IP | [Proxies](#proxies) |
| Avoid running a browser on my computer | [Cloud browsers](#cloud-browsers-browserbase-steel) |
| Upload from Python code | [Python SDK](#python-sdk) |
| Run on a server or in a container | [Docker](#docker) |
| Use a web dashboard with a scheduler | [Web app](#web-app-self-hosted) |
| Fix an error | [Troubleshooting](#troubleshooting) |

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

## Cloud browsers (Browserbase, Steel)

autotok needs a browser in two places: the one-time **login**, and **signing** each upload (TikTok's
anti-bot signatures are computed in a browser page). By default that's Chromium on your machine.
Set `AUTOTOK_BROWSER` to run it in the cloud instead. Nothing then needs to be installed or opened
locally, which makes it a good fit for servers and Docker.

| `AUTOTOK_BROWSER` | Where the browser runs | Settings |
|---|---|---|
| `local` (default) | Chromium on this machine | `autotok install-browser` once |
| `browserbase` | [Browserbase](https://www.browserbase.com) | `BROWSERBASE_API_KEY` (optional `BROWSERBASE_PROJECT_ID`, `BROWSERBASE_REGION`) |
| `steel` | [Steel Cloud](https://steel.dev), or your own [steel-browser](https://github.com/steel-dev/steel-browser) server | Cloud: `STEEL_API_KEY`. Self-hosted: `STEEL_BASE_URL`, e.g. `http://localhost:3000` |

Put the settings in your `.env` file (copy [`.env.example`](.env.example)):

```bash
AUTOTOK_BROWSER=browserbase
BROWSERBASE_API_KEY=bb_live_...
```

Then use autotok as usual:

```bash
autotok browser check                 # starts a session and shows the IP it browses from
autotok login -n alice -p http://user:pass@gate.example.com:7000
autotok upload -u alice -v clip.mp4 -t "Hello #fyp"
```

Or pick per command: `autotok --browser steel login -n alice`.

**Logging in:** `autotok login` prints a live-view link and opens it in your normal browser. Log in to
TikTok in that page; the session is saved as soon as you're in and the cloud browser is closed.

**Self-hosted Steel** is free and open source:

```bash
docker run -p 3000:3000 -e DOMAIN=localhost:3000 ghcr.io/steel-dev/steel-browser
```

and in `.env`:

```bash
AUTOTOK_BROWSER=steel
STEEL_BASE_URL=http://localhost:3000
```

Set `DOMAIN` to the address you reach the server at. Without it, steel-browser tells browsers to
connect to `0.0.0.0` and its live view stays blank, so you can't log in. autotok warns when it sees
this. A self-hosted steel-browser runs one session at a time.

Good to know:

- **Use an account proxy with cloud logins.** The account's proxy is applied to the cloud login
  session, so TikTok sees the same IP at login and upload. Without one, TikTok sees the login come
  from the provider's IP and uploads come from yours.
- **"Verify it's really you"** after logging in means TikTok saw an unfamiliar device on a datacenter
  IP. You can complete it in the live view, but it's better to avoid it: use an account proxy, or on
  a paid Browserbase plan set `BROWSERBASE_PROXY_COUNTRY=GB` (your country) to log in through a home
  IP there. On the free plan, `BROWSERBASE_REGION` set to the region nearest you
  (e.g. `eu-central-1`) at least avoids a US login.
- The live view shows only the TikTok tab, so autotok closes popups such as "Continue with Google"
  during cloud logins. Use the QR code, email/username or phone instead.
- Browserbase only takes HTTP/HTTPS proxies, and custom proxies need its Developer plan or higher.
  Custom proxies on Steel Cloud may need a paid plan too.
- Only the browser runs in the cloud. The video file still goes from your machine (through the
  account proxy) straight to TikTok, so cloud usage stays small: one short session per login and
  per upload.
- Want another provider? Subclass `autotok.browsers.CloudProvider` and call
  `autotok.browsers.register_provider("name", YourProvider)`.

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
autotok browser check [-u NAME]       # test the local or cloud browser
autotok install-browser [--with-deps]
autotok shell                         # interactive prompt

autotok --browser {local,browserbase,steel} <command> ...   # choose where the browser runs
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

## Docker

The `Dockerfile` in the repository builds the CLI with Chromium included:

```bash
docker build -t autotok .

docker run --rm -it -v autotok-data:/data autotok accounts list
docker run --rm -it -v autotok-data:/data -v "$PWD/videos:/data/videos" \
  autotok upload -u alice -v clip.mp4 -t "Hello #fyp"
```

Saved accounts live in `/data`, so keep it in a volume. Containers have no screen, so log in with a
[cloud browser](#cloud-browsers-browserbase-steel) and open the link it prints:

```bash
docker run --rm -it -v autotok-data:/data \
  -e AUTOTOK_BROWSER=browserbase -e BROWSERBASE_API_KEY=bb_live_... \
  autotok login -n alice -p http://user:pass@gate.example.com:7000
```

You can also save a session cookie from your own browser with `login --sessionid ... --datacenter ...`.

Using a cloud browser for everything? Build without the local Chromium for a much smaller image:
`docker build --build-arg INSTALL_BROWSER=false -t autotok:slim .`

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

To sign uploads with a cloud browser, put `AUTOTOK_BROWSER` and its settings (see
[Cloud browsers](#cloud-browsers-browserbase-steel)) in a `.env` file next to `docker-compose.yml`.
Logging in through the web app still uses its built-in virtual browser.

Scripts that call the API directly must send the header `X-Requested-With: autotok` on
`POST`/`PATCH`/`DELETE` requests. This stops other web pages from using the local API.

> The web app has no login of its own and only listens on `127.0.0.1`. Don't expose it to the
> internet.

---

## Configuration

Everything is optional. Put settings in a `.env` file: copy [`.env.example`](.env.example) to `.env`
and fill in what you use. `autotok` reads `.env` from the folder you run it in, then
`~/.autotok/.env`. Variables already set in your environment take priority, and `docker compose`
reads the same file. `.env` holds API keys, so never commit it (it's in `.gitignore`).

| Variable | Purpose | Default |
|---|---|---|
| `AUTOTOK_HOME` | Saved accounts and settings | `~/.autotok` |
| `AUTOTOK_VIDEOS_DIR` | Videos folder and YouTube downloads | `$AUTOTOK_HOME/videos` |
| `AUTOTOK_BROWSER` | Where login/signing browsers run: `local`, `browserbase`, `steel` | `local` |
| `AUTOTOK_BROWSER_CHANNEL` | Use an installed browser, e.g. `chrome` | Playwright Chromium |
| `AUTOTOK_BROWSER_PATH` | Full path to a Chrome/Chromium binary | Playwright Chromium |
| `BROWSERBASE_API_KEY`, `BROWSERBASE_PROJECT_ID`, `BROWSERBASE_REGION`, `BROWSERBASE_PROXY_COUNTRY` | Browserbase settings | — |
| `STEEL_API_KEY`, `STEEL_BASE_URL`, `STEEL_CONNECT_URL` | Steel settings (`STEEL_BASE_URL` for self-hosted) | Steel Cloud |

Account files contain your TikTok session (equivalent to your password). They are saved with
owner-only permissions; keep them private.

---

## Upgrading from TiktokAutoUploader 1.x

- **Install:** follow [Getting started](#getting-started) (`pip install autotok`, then `autotok install-browser`). Node.js and `npm install` are no longer needed.
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
| `'autotok' is not recognized` / `command not found` | Activate your virtual environment again, or use `python -m autotok ...` (see [Getting started](#1-install-autotok)) |
| `Chromium for Playwright is not installed` | `autotok install-browser` (Linux servers: add `--with-deps`) |
| `TikTok rejected the session` / `session rejected` | `autotok login -n NAME --force` (check with `autotok accounts check NAME`) |
| `Invalid parameters (status_code=5)` | TikTok changed its upload API. Please [open an issue](https://github.com/makiisthenes/TiktokAutoUploader/issues) with the full error. |
| `potential violation of our Community Guidelines` | TikTok blocked that video's content; it isn't a tool error. |
| Login page refuses to log in / shows a captcha loop | Try your installed Chrome: add `AUTOTOK_BROWSER_CHANNEL=chrome` to your `.env`, or copy the `sessionid` cookie from your browser and use `autotok login -n NAME --sessionid ...` |
| "Verify it's really you" during a cloud login | TikTok doesn't recognise the cloud browser's IP. Complete it in the live view (choose Email), or avoid it with a proxy; see the notes under [Cloud browsers](#cloud-browsers-browserbase-steel) |
| Cloud login live view is blank (self-hosted Steel) | Restart steel-browser with `DOMAIN=localhost:3000` (its address) |
| `Browserbase ... (HTTP 402): Proxies are not included in the free plan` | Remove `BROWSERBASE_PROXY_COUNTRY`, or the account's proxy for cloud logins, or upgrade the Browserbase plan |
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
