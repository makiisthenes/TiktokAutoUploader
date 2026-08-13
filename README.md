# TiktokAutoUploader v2.0

<p align="center">
  <img src="https://user-images.githubusercontent.com/52138450/111885490-04ab6680-89c0-11eb-955a-f833577b4406.png" width="35%" alt="TiktokAutoUploader logo">
</p>

<p align="center">The <strong>Fastest</strong> Known <strong>TikTok Auto Video Uploader</strong> — using Requests, not <s>Selenium</s>.</p>
<p align="center">Automatically uploads to TikTok with 1 command and within 3 seconds.</p>

<p align="center">
  <a href="https://www.linkedin.com/in/michael-p-88b015200/"><img alt="LinkedIn" src="https://img.shields.io/badge/LinkedIn-0077B5?style=flat-square&logo=linkedin&logoColor=white"></a>
  <img alt="Forks" src="https://img.shields.io/github/forks/makiisthenes/TiktokAutoUploader">
  <img alt="Stars" src="https://img.shields.io/github/stars/makiisthenes/TiktokAutoUploader">
  <img alt="Watchers" src="https://img.shields.io/github/watchers/makiisthenes/TiktokAutoUploader">
  <a href="http://hits.dwyl.com/makiisthenes/TiktokAutoUploader"><img alt="HitCount" src="https://hits.dwyl.com/makiisthenes/TiktokAutoUploader.svg?style=flat"></a>
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
    <img src="termius-logo-1084-black.png" alt="Termius" width="240">
  </a>
</p>

[**Termius**](https://termius.com/) provides a secure, reliable, and collaborative SSH client.

---

## Features

- Uses Requests not Selenium (super fast)
- Will not break when site layout changes (robust)
- Handle multiple accounts on local machine (multi-uploads)
- Schedule videos up to 10 days in the future
- Upload your own videos or use YouTube short links (auto-downloaded via [yt-dlp](https://github.com/yt-dlp/yt-dlp))

---

## Prerequisites

Before you begin, make sure you have the following installed on your system:

| Requirement | Minimum Version | Check Command | Install Link |
|---|---|---|---|
| **Python** | 3.9+ | `python3 --version` | [python.org](https://www.python.org/downloads/) |
| **Node.js** | 18+ | `node --version` | [nodejs.org](https://nodejs.org/en/download) |
| **npm** | 8+ | `npm --version` | Bundled with Node.js |
| **Google Chrome** | Any recent | `google-chrome --version` | [google.com/chrome](https://www.google.com/chrome/) |
| **pip** | Any recent | `pip --version` | Bundled with Python |

---

## Installation

### Option A: Automated setup (recommended)

```bash
git clone https://github.com/makiisthenes/TiktokAutoUploader.git
cd TiktokAutoUploader
chmod +x setup.sh
./setup.sh
```

The setup script handles everything automatically:

1. Installs Python dependencies
2. Installs Node.js packages for TikTok signature generation
3. Downloads the Playwright Chromium browser binary
4. Creates required directories (`CookiesDir/`, `VideosDirPath/`, `output/`)
5. Creates a `.env` file from the template if one doesn't exist

### Option B: Manual setup (step by step)

**1. Clone the repository**

```bash
git clone https://github.com/makiisthenes/TiktokAutoUploader.git
cd TiktokAutoUploader
```

**2. Install Python dependencies**

```bash
pip install -r requirements.txt
```

**3. Install Node.js packages**

```bash
cd tiktok_uploader/tiktok-signature
npm install
cd ../..
```

**4. Install Playwright browser**

```bash
npx --prefix tiktok_uploader/tiktok-signature playwright install chromium
```

**5. Create required directories**

```bash
mkdir -p CookiesDir VideosDirPath output
```

**6. Set up environment file**

```bash
cp .env.example .env
```

---

## Usage

### 1. Login to your TikTok account

Before uploading, you need to save your TikTok session. This opens a Chrome window where you log in manually, and the session cookies are stored locally.

```bash
python3 cli.py login -n my_username
```

- `-n` / `--name` : A label to save this account under (used later for uploads)

A Chrome browser window will open. Log into your TikTok account, and the session will be saved automatically once detected.

### 2. Upload a video

**From a local file:**

```bash
python3 cli.py upload --user my_username -v "video.mp4" -t "My video title"
```

Place your video files in the `VideosDirPath/` directory first.

**From a YouTube link (auto-download):**

```bash
python3 cli.py upload --user my_username -yt "https://www.youtube.com/shorts/xxxxx" -t "My video title"
```

The video is downloaded automatically using yt-dlp before uploading to TikTok.

### 3. Upload options

| Flag | Description | Default |
|---|---|---|
| `-u` / `--user` | Saved account name (from login) | *required* |
| `-v` / `--video` | Path to local video file | — |
| `-yt` / `--youtube` | YouTube URL to download from | — |
| `-t` / `--title` | Video title / caption (max 2200 chars) | *required* |
| `-sc` / `--schedule` | Schedule time in seconds from now (min 900, max 864000) | `0` (immediate) |
| `-vi` / `--visibility` | `0` = public, `1` = private | `0` |
| `-ct` / `--comment` | Allow comments: `0` = off, `1` = on | `1` |
| `-d` / `--duet` | Allow duets: `0` = off, `1` = on | `0` |
| `-st` / `--stitch` | Allow stitch: `0` = off, `1` = on | `0` |
| `-ai` / `--ailabel` | AI-generated label: `0` = off, `1` = on | `0` |
| `-p` / `--proxy` | HTTP proxy URL | — |

### 4. View saved data

```bash
# Show all logged-in accounts
python3 cli.py show -u

# Show all videos in VideosDirPath/
python3 cli.py show -v
```

### 5. Help

```bash
python3 cli.py -h
python3 cli.py login -h
python3 cli.py upload -h
python3 cli.py show -h
```

---

## Configuration

Settings are stored in `config.txt` at the project root:

| Setting | Description | Default |
|---|---|---|
| `COOKIES_DIR` | Directory for stored session cookies | `./CookiesDir` |
| `VIDEOS_DIR` | Directory for video files | `./VideosDirPath` |
| `POST_PROCESSING_VIDEO_PATH` | Output directory for processed videos | `./VideosDirPath` |
| `IMAGEMAGICK_FONT` | Font for video text overlays | `Arial` |
| `IMAGEMAGICK_FONT_SIZE` | Font size for text overlays | `80` |
| `IMAGEMAGICK_TEXT_FOREGROUND_COLOR` | Text colour | `white` |
| `IMAGEMAGICK_TEXT_BACKGROUND_COLOR` | Text background colour | `black` |
| `LANG` | Language preference | `en` |

The `.env` file stores the TikTok login URL and is created from `.env.example` during setup.

---

## Project Structure

```
TiktokAutoUploader/
├── cli.py                     # Main entry point (CLI)
├── config.txt                 # App configuration
├── setup.sh                   # Automated setup script
├── requirements.txt           # Python dependencies
├── .env.example               # Environment template
├── CookiesDir/                # Stored session cookies (auto-created)
├── VideosDirPath/             # Video files for upload (auto-created)
└── tiktok_uploader/
    ├── tiktok.py              # Upload & login logic
    ├── Video.py               # Video download & processing
    ├── Browser.py             # Chrome browser management
    ├── Config.py              # Configuration loader
    ├── cookies.py             # Cookie persistence
    ├── bot_utils.py           # Signature & request helpers
    ├── basics.py              # Utility functions
    └── tiktok-signature/      # TikTok signature generation (Node.js)
        ├── index.js
        ├── browser.js
        ├── utils.js
        └── package.json
```

---

## Troubleshooting

### ChromeDriver version mismatch

If you see an error like `This version of ChromeDriver only supports Chrome version X`, the app auto-detects your Chrome version. Make sure you have Google Chrome installed and accessible from your terminal:

```bash
google-chrome --version
```

### `Cannot find module 'playwright-chromium'`

Run the Playwright install step:

```bash
cd tiktok_uploader/tiktok-signature
npm install
npx playwright install chromium
```

### YouTube download issues

If yt-dlp warns about a missing JavaScript runtime, install [Deno](https://deno.land/) or Node.js >= 18. The download still works without it for most videos but some formats may be limited.

### `session not created` or login issues

Make sure Google Chrome is up to date. The app uses `undetected-chromedriver` which patches ChromeDriver to match your installed Chrome version.

---

## Demo

Video showcases main usage of the app, uploading a video to TikTok.

<p align="center">
  <video src="https://github.com/makiisthenes/TiktokAutoUploader/assets/52138450/3dc36fd4-b9f4-4059-bcb4-c2ddca2a285d" controls poster="poster.jpg" width="320" height="240">
  </video>
</p>

---

## Professional Software

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

## Support This Project

If you like the work provided, please consider supporting me through the available links for [Patreon](https://patreon.com/makiisthenes) and [Ko-Fi](https://ko-fi.com/makiperes).

Else if you have any requests or would like to contribute send a PR.

Alternatively consider starring the project, or giving me a follow ;)

- Thanks [@DelvinBa](https://github.com/DelvinBa) for updating to TikTok's new upload endpoint. (09/12/2024)

---

## Bugs and Issues

If you find any bugs or issues, please add to the issues tab, please do not email me relating to this, I will see on issues.

---

## Old Branch

If you would like to continue to use the library based uploader, please forward to old branch namely `old`.

This still relies on Selenium which is slow and unreliable.

---

## Notes and Terms

I am not responsible for any effects to your account, usage of such tools may ban your account. Please use at your own risk.

---

## Star History

[![Star History Chart](https://star-history.dera.page/svg?repos=makiisthenes/TiktokAutoUploader&type=Date)](https://star-history.dera.page/#makiisthenes/TiktokAutoUploader&Date)
