# autotok for Node.js and TypeScript

Upload and schedule TikTok videos from Node.js, with a proxy per account. Typed, promise-based,
and no Python needed.

This is the npm package of [autotok](https://github.com/makiisthenes/TiktokAutoUploader). It uses
the same saved accounts as the Python package and its `autotok` CLI, so an account you log in to
with one works in the other.

## Install

```bash
npm install autotok
npx playwright install chromium     # one-time browser download, about 300 MB
```

Requires Node.js 22.12 or newer. The browser handles the one-time login and signs each upload.
Using a [cloud browser](#cloud-browsers) instead? Skip the download. On a fresh Linux server, add
`--with-deps` (as root) to also install Chromium's system libraries.

## Quick start

```ts
import { login, uploadVideo } from "autotok";

await login("alice");                                   // once: log in on the page that opens
const result = await uploadVideo("alice", "clip.mp4", "Hello #fyp");
console.log(result.videoId);
```

`login` opens a browser window on TikTok's login page; the QR code with the TikTok app is
quickest. The window closes by itself and the session is saved as `alice` in
`~/.autotok/accounts`. Treat those files like passwords.

## Uploading

```ts
import { Client } from "autotok";

const client = await Client.fromAccount("alice");       // uses alice's saved proxy
await client.upload("clip.mp4", "Going live tomorrow #fyp @friend", {
  schedule: new Date(Date.now() + 24 * 3_600_000),     // a Date, a timestamp in ms, or an ISO string
  visibility: "public",                                 // or "private"
  allowComment: true,
  allowDuet: false,
  allowStitch: false,
  aiLabel: false,
});
```

- The video can be a file path, a file name in `~/.autotok/videos`, a `file:` URL, or a
  `Uint8Array`/`Buffer` with the video's bytes.
- `schedule` must be 15 minutes to 30 days ahead (TikTok limits some accounts to 10 days). A
  number is a timestamp in milliseconds, like `Date.now() + 3_600_000`, not a delay.
- Hashtags and `@mentions` become clickable, like in TikTok's own uploader.
- Each upload starts a headless browser for about two seconds to sign the request. For many
  uploads in a row, keep one signer open (it must use the client's user agent and proxy):

  ```ts
  import { Client, Signer } from "autotok";

  const base = await Client.fromAccount("alice");
  const signer = await Signer.start(base.userAgent, { proxy: base.proxy });
  const client = new Client(base.account, { signer });
  // ... client.upload(...) as often as you like, then:
  await signer.close();
  ```

## Errors

Every error extends `AutotokError`. `error.retryable` is `true` only when nothing reached
TikTok's publish step, so running the same upload again can't post twice.

```ts
import { AutotokError, Client, PublishError, PublishUncertainError } from "autotok";

const client = await Client.fromAccount("alice");
try {
  await client.upload("clip.mp4", "caption");
} catch (error) {
  if (error instanceof PublishError) {
    console.log(error.statusCode, error.statusMsg);     // TikTok rejected the post, e.g. guidelines
  } else if (error instanceof PublishUncertainError) {
    // The connection dropped while publishing: check the account before trying again.
  } else if (error instanceof AutotokError && error.retryable) {
    // Safe to retry.
  }
}
```

## Proxies

Give every account its own proxy. It's used for the login browser, request signing and every
upload request. `HTTP_PROXY`/`HTTPS_PROXY` environment variables are ignored, so they can't send
an account through another IP.

```ts
import { AccountStore, checkProxy, login, uploadVideo } from "autotok";

await login("alice", { proxy: "http://user:pass@gate.example.com:7000" });   // set at login
await new AccountStore().setProxy("alice", "socks5://user:pass@gate.example.com:1080");
console.log(await checkProxy("gate.example.com:7000:user:pass"));            // the IP TikTok sees

await uploadVideo("alice", "clip.mp4", "hi", { proxy: "http://other:pass@host:8000" });  // one-off
await uploadVideo("alice", "clip.mp4", "hi", { proxy: false });                          // go direct
```

Accepted formats: `http://user:pass@host:port`, `https://...`, `socks5://...`, `host:port`,
`user:pass@host:port` and `host:port:user:pass`, the export format most providers use.
Passwords never appear in logs, `console.log` or `JSON.stringify`.

Chromium can't use SOCKS5 proxies that need a username and password, so for the login step use
your provider's HTTP endpoint (uploads work with either).

## Already have a session cookie?

Skip the login window by saving the `sessionid` cookie from your browser:

```ts
import { importSession } from "autotok";

await importSession("alice", "<sessionid value>", { datacenter: "<tt-target-idc value>" });
```

## Cloud browsers

Set `AUTOTOK_BROWSER` to run the login and signing browser on
[Browserbase](https://www.browserbase.com) or [Steel](https://github.com/steel-dev/steel-browser)
instead of this machine. That suits servers and containers.

| `AUTOTOK_BROWSER` | Settings |
|---|---|
| `local` (default) | `npx playwright install chromium` once |
| `browserbase` | `BROWSERBASE_API_KEY` (optional `BROWSERBASE_PROJECT_ID`, `BROWSERBASE_REGION`, `BROWSERBASE_PROXY_COUNTRY`) |
| `steel` | Cloud: `STEEL_API_KEY`. Self-hosted: `STEEL_BASE_URL`, e.g. `http://localhost:3000` |

With a cloud browser, `login` gives you a link to log in through:

```ts
import { login } from "autotok";

await login("alice", { onLiveUrl: (url) => console.log("Log in here:", url) });
```

Keep settings in a `.env` file and call `loadEnv()` at startup. It reads `./.env`, then
`~/.autotok/.env`, and never overrides variables that are already set.

Add another provider by extending `CloudProvider` and calling `registerProvider("name", () => new MyProvider())`.

## Configuration

| Variable | Purpose | Default |
|---|---|---|
| `AUTOTOK_HOME` | Saved accounts and settings | `~/.autotok` |
| `AUTOTOK_VIDEOS_DIR` | Where videos are found by name | `$AUTOTOK_HOME/videos` |
| `AUTOTOK_BROWSER` | `local`, `browserbase` or `steel` | `local` |
| `AUTOTOK_BROWSER_CHANNEL` | Use an installed browser, e.g. `chrome` | Playwright's Chromium |
| `AUTOTOK_BROWSER_PATH` | Full path to a Chrome/Chromium binary | Playwright's Chromium |

Warnings go to `console.warn`. Use `setLogger({ warn, info, debug })` to send them elsewhere, or
`setLogger(null)` to silence them.

## Module format

autotok is an ES module with TypeScript types included. From CommonJS, `require("autotok")`
works on Node.js 22.12 and newer. In TypeScript, use `"module": "nodenext"` (or `node20`), or
`bundler` resolution. The legacy `node16` setting can't import ES modules from CommonJS files.

## Compared with the Python package

The upload, login, proxy and cloud-browser features are the same, and so are the account files.
The Python package also has the `autotok` CLI, YouTube links, the MCP server and the self-hosted
web app. Install it with `uv tool install "autotok[youtube]"` if you need those.

## License

[AGPL-3.0](https://github.com/makiisthenes/TiktokAutoUploader/blob/main/LICENSE), with a commercial
license available; see the [main README](https://github.com/makiisthenes/TiktokAutoUploader#licensing).
The bundled signing scripts are third-party code, see `THIRD_PARTY_NOTICES.md`.

Not affiliated with TikTok. Automating uploads may break TikTok's terms of service and can get
accounts restricted or banned. Only upload content you have the rights to.
