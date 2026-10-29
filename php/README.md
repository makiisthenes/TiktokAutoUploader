# autotok for PHP

Upload and schedule TikTok videos from PHP, with a proxy per account.

This library runs the [autotok](https://github.com/makiisthenes/TiktokAutoUploader) command
line and turns its answers into PHP objects and exceptions. It uses the accounts you logged in to
with `autotok login`, and each account's saved proxy. No dependencies; PHP 8.1 or newer.

## Before you start

Install autotok and log in once per account (see [Getting started](../README.md#getting-started)):

```bash
uv tool install "autotok[youtube]"       # or the single Go binary, see the main README
autotok install-browser
autotok login -n alice
```

The library needs an autotok with `--json` and `--title-file`: the Python package after 2.1.0,
or the Go binary after 0.1.0. Until those are released, install autotok from this repository:

```bash
uv tool install "autotok[youtube] @ git+https://github.com/makiisthenes/TiktokAutoUploader"
```

## Install

The library isn't on Packagist yet. Point Composer at a copy of this folder:

```json
{
    "repositories": [{"type": "path", "url": "path/to/TiktokAutoUploader/php"}],
    "require": {"makiisthenes/autotok": "*"}
}
```

Or copy the four files in `src/` into your project; they only need PHP itself.

## Upload

```php
use Autotok\AutotokException;
use Autotok\Client;

$autotok = new Client();                                  // runs `autotok` from your PATH

$result = $autotok->upload('alice', 'clip.mp4', 'Hello #fyp');
echo $result->videoId;

$autotok->upload('alice', 'clip.mp4', 'Going live tomorrow #fyp @friend',
    schedule: new DateTimeImmutable('+1 day'),           // or seconds from now, e.g. 3600
    visibility: 'public',                                // or 'private'
    allowComment: true,
    allowDuet: false,
    allowStitch: false,
    aiLabel: false,
    proxy: 'http://user:pass@host:port',                 // instead of the account's saved proxy
);
```

- `video` is a file path, the name of a file in `~/.autotok/videos`, or a YouTube link to
  download and upload (needs [yt-dlp](https://github.com/yt-dlp/yt-dlp)).
- `schedule` must be 15 minutes to 30 days ahead (TikTok limits some accounts to 10 days).
- `noProxy: true` connects directly, ignoring the account's saved proxy.
- Every upload is a real post, and takes a while (often a minute or more). In a web request,
  allow for that in `max_execution_time`, or upload from a queue worker.

## Accounts

```php
foreach ($autotok->accounts() as $account) {
    echo $account->name, ' ', $account->hasSession ? 'logged in' : 'no session', ' ', $account->proxy ?? 'direct', "\n";
}
$autotok->checkSession('alice');                         // asks TikTok whether the session still works
$autotok->removeAccount('alice');                        // deletes the saved session
```

Proxies are shown with their password hidden. Log in with the CLI (`autotok login`), which opens
a browser window.

## Errors

Every error is an `Autotok\AutotokException`:

```php
try {
    $autotok->upload('alice', 'clip.mp4', 'Hello #fyp');
} catch (AutotokException $e) {
    echo $e->type;            // ValidationError, AccountNotFoundError, PublishError, ...
    echo $e->getMessage();
    if ($e->retryable) {
        // Nothing reached TikTok's publish step: trying again can't post twice.
    } elseif ($e->isPublishUncertain()) {
        // The post may or may not exist: check TikTok before trying again.
    }
    // PublishError: $e->statusCode, $e->statusMsg. UploadError: $e->httpStatus.
    // $e->stderr has autotok's log.
}
```

## Settings

```php
new Client('/usr/local/bin/autotok');                            // a path to autotok
new Client(['python3', '-m', 'autotok']);                        // or a command with arguments
new Client('autotok', ['AUTOTOK_HOME' => '/srv/autotok', 'AUTOTOK_BROWSER' => 'browserbase']);
```

The second argument sets environment variables for autotok, such as where accounts are saved
(`AUTOTOK_HOME`) or a [cloud browser](../README.md#cloud-browsers-browserbase-steel). autotok also
reads `~/.autotok/.env`.

## Development

```bash
composer install
vendor/bin/phpunit
AUTOTOK_TEST_BIN=$(which autotok) vendor/bin/phpunit    # also test against a real autotok
```
