# autotok for Go

[![Go Reference](https://pkg.go.dev/badge/github.com/makiisthenes/TiktokAutoUploader/go.svg)](https://pkg.go.dev/github.com/makiisthenes/TiktokAutoUploader/go)

Upload and schedule TikTok videos from Go, with a proxy per account. It's also a **single
`autotok` binary** with no Python or Node.js needed.

It's the Go build of [autotok](https://github.com/makiisthenes/TiktokAutoUploader), and it shares
everything with the Python and TypeScript packages: the same `~/.autotok/accounts` files, the same
settings and the same command line. An account you log in to with any of them works with all three.

## Install

**Command line:** download the binary for your system from the
[releases](https://github.com/makiisthenes/TiktokAutoUploader/releases) (the `go/v...` ones), or
build it with Go 1.26+:

```bash
go install github.com/makiisthenes/TiktokAutoUploader/go/cmd/autotok@latest
```

**Library:**

```bash
go get github.com/makiisthenes/TiktokAutoUploader/go
```

**A browser for logging in.** autotok needs Chrome or Chromium to log in and to compute TikTok's
request signatures. It finds the first of these:

1. `AUTOTOK_BROWSER_PATH`, if you set it.
2. `AUTOTOK_BROWSER_CHANNEL=chrome`, `chromium` or `msedge`, if you set it.
3. Chrome for Testing downloaded by `autotok install-browser` (about 200 MB, once).
4. Playwright's Chromium, if the Python or TypeScript package already installed it.
5. An installed Google Chrome, Chromium or Microsoft Edge.

So with Chrome already on your computer, there's nothing to download. You can also run the
browser in the cloud instead: see [Cloud browsers](#cloud-browsers).

## Command line

The same commands and flags as the Python CLI:

```bash
autotok login -n my_account                          # log in on the page that opens
autotok login -n alice -p http://user:pass@host:8000 # an account with its own proxy
autotok upload -u my_account -v clip.mp4 -t "Hello #fyp"
autotok upload -u my_account -v clip.mp4 -t "Later #fyp" -sc 3600   # publish in an hour
autotok accounts list
autotok proxy test -u alice                          # the IP TikTok will see
autotok browser check                                # start the browser and show its IP
autotok install-browser                              # only on machines without Chrome
```

Run `autotok <command> -h` for each command's options. `-yt <YouTube URL>` works when
[yt-dlp](https://github.com/yt-dlp/yt-dlp) (and ffmpeg) are installed. The setup wizard, the
interactive shell and the MCP server are only in the Python package.

## Library

```go
import autotok "github.com/makiisthenes/TiktokAutoUploader/go"

ctx := context.Background()

// Once per account: log in in the browser window that opens.
if _, err := autotok.Login(ctx, "alice", &autotok.LoginOptions{
	Proxy: "http://user:pass@gate.example.com:7000", // saved with the account
}); err != nil {
	log.Fatal(err)
}

// One call:
result, err := autotok.UploadVideo(ctx, "alice", "clip.mp4", "Hello #fyp", nil)

// More control: reuse a client, set post options, schedule.
client, err := autotok.NewClient("alice", nil) // uses alice's saved proxy
result, err = client.Upload(ctx, "clip.mp4", "Going live tomorrow #fyp @friend", &autotok.UploadOptions{
	Schedule:   time.Now().Add(24 * time.Hour), // 15 minutes to 30 days ahead
	Visibility: autotok.Public,                 // or autotok.Private
	AllowDuet:  true,
})
if err != nil {
	log.Fatal(err)
}
fmt.Println("posted", result.VideoID)
```

- **Videos** can be a path, a file name in `~/.autotok/videos`, bytes (`client.UploadBytes`) or a
  reader (`client.UploadReader`).
- **Post options.** The zero `UploadOptions` publishes now and publicly, with comments on and duets,
  stitches and the AI-generated label off: the same defaults as the other packages.
- **Hashtags and @mentions** become clickable, with emoji-safe offsets.
- **Cancellation.** Every call takes a `context.Context`, so you can cancel an upload or give it a
  deadline.
- **Many uploads?** Start the signing browser once instead of for each upload:
  `signer := client.NewSigner(); defer signer.Close(); client.Signer = signer`.
- **Already have a `sessionid` cookie?** Use
  `autotok.ImportSession("alice", "<sessionid>", autotok.SessionAccountOptions{Datacenter: "<tt-target-idc>"}, nil)`.

### Errors

Every error autotok returns on purpose has its own type, so you can check for it with
`errors.As`. `autotok.IsRetryable(err)` is true only when nothing reached TikTok's publish step, so
trying again can't post the video twice.

```go
_, err := client.Upload(ctx, "clip.mp4", "caption", nil)
var rejected *autotok.PublishError
var uncertain *autotok.PublishUncertainError
switch {
case errors.As(err, &rejected):
	log.Println("TikTok rejected the post:", rejected.StatusCode, rejected.StatusMsg)
case errors.As(err, &uncertain):
	log.Println("the connection dropped while publishing; check TikTok before retrying")
case autotok.IsRetryable(err):
	log.Println("nothing was posted; safe to try again:", err)
}
```

The types are `ValidationError`, `AccountNotFoundError`, `NotLoggedInError`, `LoginError`,
`BrowserNotInstalledError`, `ConfigurationError`, `RemoteBrowserError`, `SigningError`,
`UploadError`, `PublishError` and `PublishUncertainError`.

## Proxies

One proxy per account is used for everything: the login browser, the signature fetch and every
upload request. The formats are the same as the other packages':
`http://user:pass@host:port`, `socks5://user:pass@host:port`, `host:port`, `user:pass@host:port`
and `host:port:user:pass`.

Environment variables like `HTTPS_PROXY` are never used for TikTok traffic, so an account can't
slip out through another IP. SOCKS proxies resolve hostnames themselves, so DNS lookups don't
reveal your real IP either. Unlike the Python and TypeScript packages, the login browser also
works with SOCKS5 proxies that need a username and password: autotok gives the browser a local
relay on `127.0.0.1` that adds the credentials.

## Cloud browsers

Set `AUTOTOK_BROWSER=browserbase` (with `BROWSERBASE_API_KEY`) or `AUTOTOK_BROWSER=steel` (with
`STEEL_API_KEY`, or `STEEL_BASE_URL` for your own steel-browser server) to run the login and
signing browser in [Browserbase](https://www.browserbase.com) or
[Steel](https://github.com/steel-dev/steel-browser) instead of on your computer. Logging in then
prints a link to log in through. `autotok.LoadEnv()` (the command line calls it for you) reads
these from `./.env` and `~/.autotok/.env`. To add your own provider, implement `CloudBackend`
and register it with `RegisterProvider`.

## Settings

| Variable | What it does |
|---|---|
| `AUTOTOK_HOME` | Data folder (default `~/.autotok`) |
| `AUTOTOK_VIDEOS_DIR` | Where videos are found by name (default `$AUTOTOK_HOME/videos`) |
| `AUTOTOK_BROWSER` | `local` (default), `browserbase` or `steel` |
| `AUTOTOK_BROWSER_PATH` | The Chrome or Chromium to use |
| `AUTOTOK_BROWSER_CHANNEL` | `chrome`, `chromium` or `msedge`: use that installed browser |

Logging: warnings go to standard error. To route autotok's messages elsewhere, pass a
`*slog.Logger` to `autotok.SetLogger`; `nil` silences them.

## License

[AGPL-3.0](https://github.com/makiisthenes/TiktokAutoUploader/blob/main/LICENSE). TikTok's signing
scripts in `signer_js/` are third-party code: see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
