# Changelog

## 2.0.0

First release on PyPI as **autotok** (`pip install autotok`).

### Added
- Installable package with an `autotok` command and a Python API (`autotok.Client`,
  `autotok.upload_video`, `autotok.login`, typed exceptions). `python cli.py` still works.
- Proxy support everywhere an account talks to TikTok: the login browser, signature generation and
  every upload request. Proxies are saved per account (`autotok proxy set|clear|test`,
  `autotok login -p`), accept the common provider formats (including `host:port:user:pass`) and
  SOCKS5, and are always shown with the password masked. The account proxy is pinned on every
  request, so `HTTP(S)_PROXY` environment variables can't redirect an account through another IP,
  and the signing browser can't make direct connections.
- Cloud browsers: `AUTOTOK_BROWSER=browserbase` or `steel` (Steel Cloud or a self-hosted
  steel-browser) runs the login and signing browser remotely instead of on your machine. Login
  happens through a live-view link; the account's proxy is applied to the cloud session. Providers
  plug into a small factory (`autotok.browsers.register_provider`).
- Settings can live in a `.env` file (`.env.example` is the template). The CLI reads `./.env`, then
  `~/.autotok/.env`, without overriding real environment variables; `autotok.load_env()` does the
  same from Python.
- `Dockerfile` for the CLI (with or without a local Chromium) and a CI job that builds it and the
  web app's compose stack.
- `autotok accounts list|check|remove`, `autotok browser check`, `autotok install-browser`,
  `autotok shell`, `--browser`, and `python -m autotok`.
- Sessions can be imported from a browser cookie (`autotok login --sessionid`).
- Web app: per-account proxy editing and testing, session check, video library (add, delete,
  schedule by name), immediate upload from the library, proxy field on browser login.
- Test suite and CI (Python 3.10–3.13, package build, web app build) and a PyPI publishing
  workflow using trusted publishing.

### Changed
- Request signing runs in Python Playwright; Node.js is no longer needed.
- Login uses Playwright Chromium (honours the account's proxy); undetected-chromedriver and Selenium
  are no longer dependencies.
- Sessions are stored as JSON in `~/.autotok/accounts` (owner-only permissions). 1.x pickle files in
  `CookiesDir/` are migrated automatically with a safe loader.
- Uploads reuse the user agent of the browser that logged in, instead of a random one per upload.
- `-sc/--schedule` schedules on TikTok's side again (15 minutes to 10 days).
- Licence: AGPL-3.0 with a commercial option (see README).

### Fixed
- Privacy, comment, duet and stitch settings were ignored: every post went out public with
  everything allowed.
- Hashtags weren't clickable (the caption markup was not sent), and emoji shifted hashtag offsets.
- Successful uploads were reported as failures by the API and scheduler, which then retried them,
  so a scheduled post could go out up to three times. The scheduler now only retries failures that
  happened before publishing, and never retries a job that was interrupted mid-upload.
- YouTube downloads always reused the same file name, so a second link re-posted the first video.
- A missing session made the library call `sys.exit`, killing the API or scheduler.
- Uploads could hang forever if signing failed; failures are now reported as errors.
- Web app: uploads over 1 MB were rejected by nginx; uploads blocked the API while running; login
  failures and timeouts were never shown; ticking an option checkbox could stop the form from
  submitting; `docker compose up --build` failed on a clean machine because the shared base image
  was not built first.
- Login callbacks from the virtual browser are now signed, so other local processes can't inject a
  session.

### Security
- The web app's API no longer allows cross-origin requests, and `POST`/`PATCH`/`DELETE` requests
  must send `X-Requested-With: autotok`, so other web pages can't drive the local API.
- Proxy passwords are never returned by the API or shown in logs and `repr()`.

### Removed
- `config.txt`, `setup.py` and the unused ImageMagick video-editing helpers.
- The `cli.py schedule list|cancel` commands (use the web app's Schedules page).
