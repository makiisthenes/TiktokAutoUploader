---
name: tiktok-upload
description: Upload, post or schedule videos to TikTok with the autotok command line, on the TikTok accounts logged in on this computer. Use when the user asks to post, upload, publish or schedule a video (a file or a YouTube link) to TikTok, to see which TikTok accounts are set up, or to log in a TikTok account for uploading.
argument-hint: "[video] [caption] [account] [when]"
allowed-tools: Bash(autotok --version), Bash(autotok --json accounts list), Bash(autotok accounts list), Bash(autotok show *)
---

# Upload to TikTok with autotok

autotok uploads videos to TikTok through TikTok's web upload API, using accounts the user logged
in to on this computer (saved in `~/.autotok/accounts`, each with its own proxy). Work through
the steps below. Request: $ARGUMENTS

**Every upload is a real post** on the user's TikTok account, public unless they say otherwise.
Never upload a video the user didn't ask for, and never post the same video twice by accident.

Run each command below on its own, exactly as written (don't chain commands with `;` or `&&`).
`autotok --version`, `autotok --json accounts list`, `autotok accounts list` and `autotok show ...`
are pre-approved, so they run without a permission prompt; everything else, uploads included,
asks the user first.

## 1. Check that autotok is installed

Run `autotok --version`. If the command isn't found, stop and tell the user how to install it
(don't install it without asking):

```bash
uv tool install "autotok[youtube]"     # or: pipx install "autotok[youtube]"
autotok install-browser                # one-time browser download, about 300 MB
```

Or the single `autotok` binary with no Python, from
https://github.com/makiisthenes/TiktokAutoUploader/releases (the `go/v...` releases).

## 2. Pick the account

Run `autotok --json accounts list`. It prints
`{"accounts": [{"name": "alice", "session": true, "proxy": "http://user:****@host:port"}]}`.
If it says `--json` is unknown, autotok is an older version: run `autotok accounts list` and read
the text instead.

- One account with a session: use it, and say which one in the summary (step 4).
- Several: use the one the user named; if they didn't, ask.
- None, the one they named is missing, or `"session": false`: the account needs a login (step 3).

## 3. Log in (only when needed)

Logging in opens a browser window on the user's computer, on TikTok's login page. They log in
there (the QR code with the TikTok app is quickest), and the window closes by itself.

- Ask for an account name to save it under, and whether to use a proxy. The account's uploads
  all go through that proxy, so it should be the one they'll keep using:
  `autotok login -n NAME -p http://user:pass@host:port`. Without a proxy: `autotok login -n NAME`.
- The command waits until the login finishes (up to 10 minutes). Run it with a 600000 ms timeout,
  and tell the user to switch to the browser window. Or ask them to run it themselves by typing
  `! autotok login -n NAME` in this chat.
- With a cloud browser (`AUTOTOK_BROWSER` set), autotok prints a link to open instead of a window;
  pass it on to the user.
- Never ask for or handle the user's TikTok password: they type it into TikTok's own page.

## 4. Gather the details and confirm

| Setting | Flag | Notes |
|---|---|---|
| Video | `-v PATH` or `-yt URL` | A file path, a file name in `~/.autotok/videos` (`autotok show -v` lists them), or a YouTube link (`-yt`, needs the `youtube` extra) |
| Caption | `--title-file -` | Up to 2200 characters. #hashtags and @mentions become clickable |
| When | `-sc SECONDS` | Leave out to post now. Scheduling: 900 to 2592000 seconds ahead (15 minutes to 30 days; TikTok limits some accounts to 10 days). Work out the seconds from the current time (`date`) and the user's time zone |
| Visibility | `-vi 1` | Private. Public is the default. Private videos can't be scheduled |
| Comments, duets, stitches | `-ct 0/1`, `-d 0/1`, `-st 0/1` | Defaults: comments on, duets and stitches off |
| AI-generated label | `-ai 1` | Use when the video is AI-generated |
| Proxy | `-p PROXY` or `--no-proxy` | Only to override the account's saved proxy for this upload |

If the user didn't give a caption, suggest one, but let them approve it. Then show a short
summary (account, video, caption, when, public or private) and ask the user to confirm before
uploading. Skip asking only when the request already spelled out the account, video, caption and
timing and clearly said to post.

## 5. Upload

Send the caption through stdin with a quoted heredoc, so quotes, `$`, newlines and emoji arrive
exactly as written. Uploads take a while, so use a 600000 ms timeout:

```bash
autotok --json upload -u alice -v "/path/to/clip.mp4" -sc 7200 --title-file - <<'CAPTION'
Going live tomorrow 🎉 #fyp @friend
CAPTION
```

Success prints one line: `{"video_id": "7301...", "creation_id": "...", "scheduled_for": null}`
(`scheduled_for` is an ISO time in UTC when scheduled). Tell the user it's posted, or when it
will be published, in their time zone.

Older autotok versions don't have `--json` or `--title-file` (the error says the option is
unknown). Then use `-t 'caption'` instead, in single quotes, with each `'` in the caption written
as `'\''`, and read the text it prints: `Published. Video id: ...`.

For several videos, upload them one at a time, and report each result before the next.

## 6. If it fails

With `--json`, errors print `{"error": {"type": "...", "message": "...", "retryable": ...}}`.

- `"retryable": true`: nothing reached TikTok's publish step, so the same upload can be run again
  without posting twice. Try once more if the message suggests a temporary problem (network,
  proxy, browser); otherwise report it.
- `PublishUncertainError`, or the command timed out or was interrupted during the upload: the
  post **may or may not exist**. Do not upload again. Ask the user to check the account on TikTok
  first.
- `NotLoggedInError` or `AccountNotFoundError`: the session expired or the account isn't saved.
  Log in again (step 3, with `--force` to replace an expired session).
- `ValidationError`: something in the request is wrong (caption too long, schedule out of range,
  video not found). Fix it with the user and try again.
- `PublishError`: TikTok rejected the post. Its `status_msg` says why; pass it on. Don't retry
  unchanged.
- `BrowserNotInstalledError`: run `autotok install-browser` (ask first: it downloads about
  300 MB).

Never print the contents of the account files in `~/.autotok/accounts`: they hold the TikTok
session, which works like a password. Proxies are shown with the password hidden; keep it that way.
