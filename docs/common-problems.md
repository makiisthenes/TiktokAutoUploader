# Common Problems

See also the Troubleshooting table in the [README](README.md#troubleshooting).

---

## Saving a session (logging in)

The usual way is:

```bash
autotok login -n my_account                 # opens a browser window; log in to TikTok there
autotok login -n my_account -p <proxy>      # same, through the account's proxy
```

The window closes by itself once TikTok sets the session cookies. To see what is saved:

```bash
autotok accounts list
```

Upload with that exact name:

```bash
autotok upload -u my_account -v video.mp4 -t "My caption #fyp"
```

To log in again (for example after the session expires), add `--force`. You can check whether
TikTok still accepts a saved session with `autotok accounts check my_account`.

### Saving a session from your own browser

If the login window doesn't work for you (captcha loops, "too many attempts"), copy the cookies
from a browser where you are already logged in to tiktok.com:

1. Open TikTok in your browser, then the developer tools → Application/Storage → Cookies → `https://www.tiktok.com`.
2. Copy the values of `sessionid` and `tt-target-idc`.
3. Run:

```bash
autotok login -n my_account --sessionid <sessionid value> --datacenter <tt-target-idc value>
```

or from Python:

```python
import autotok
autotok.import_session("my_account", "<sessionid value>", datacenter="<tt-target-idc value>")
```

A session cookie gives full access to the account. Never share it or commit it to git.

---

## Using your installed Chrome

autotok uses Playwright's Chromium by default. To use Google Chrome instead (sometimes friendlier
with TikTok's login page):

```bash
AUTOTOK_BROWSER_CHANNEL=chrome autotok login -n my_account
```

---

## Sessions from TiktokAutoUploader 1.x

Sessions saved by 1.x live in `CookiesDir/tiktok_session-<name>.cookie`. Run autotok from the
folder that contains `CookiesDir/` and they are migrated to `~/.autotok/accounts/` the first time
you use them.
