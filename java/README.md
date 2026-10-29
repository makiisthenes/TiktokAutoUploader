# autotok for Java

Upload and schedule TikTok videos from Java, with a proxy per account.

This library runs the [autotok](https://github.com/makiisthenes/TiktokAutoUploader) command
line and turns its answers into Java objects and exceptions. It uses the accounts you logged in to
with `autotok login`, and each account's saved proxy. No dependencies; Java 17 or newer.

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

The library isn't on Maven Central yet. Install it into your local Maven repository:

```bash
cd TiktokAutoUploader/java
mvn install
```

and add it to your `pom.xml`:

```xml
<dependency>
  <groupId>io.github.makiisthenes</groupId>
  <artifactId>autotok</artifactId>
  <version>0.1.0</version>
</dependency>
```

With Gradle, add `mavenLocal()` to your repositories and
`implementation("io.github.makiisthenes:autotok:0.1.0")`.

## Upload

```java
import io.github.makiisthenes.autotok.*;
import java.time.Duration;
import java.time.Instant;

Autotok autotok = new Autotok();                          // runs `autotok` from your PATH

UploadResult result = autotok.upload("alice", "clip.mp4", "Hello #fyp");
System.out.println(result.videoId());

autotok.upload("alice", "clip.mp4", "Going live tomorrow #fyp @friend", new UploadOptions()
        .schedule(Instant.now().plus(Duration.ofDays(1)))   // or .schedule(Duration.ofHours(1))
        .visibility(Visibility.PUBLIC)                      // or PRIVATE
        .allowComment(true)
        .allowDuet(false)
        .allowStitch(false)
        .aiLabel(false)
        .proxy("http://user:pass@host:port"));              // instead of the account's saved proxy
```

- `video` is a file path, the name of a file in `~/.autotok/videos`, or a YouTube link to
  download and upload (needs [yt-dlp](https://github.com/yt-dlp/yt-dlp)).
- `schedule` must be 15 minutes to 30 days ahead (TikTok limits some accounts to 10 days).
- `.noProxy()` connects directly, ignoring the account's saved proxy.
- Every upload is a real post. `upload` blocks until TikTok has it, often a minute or more; run it
  on a background thread or executor. Interrupting the thread stops autotok, after which the post
  may or may not exist.
- An `Autotok` object holds no state and can be shared between threads.

## Accounts

```java
for (Account account : autotok.accounts()) {
    System.out.println(account.name() + " " + account.hasSession() + " " + account.proxy().orElse("direct"));
}
autotok.checkSession("alice");                           // asks TikTok whether the session still works
autotok.removeAccount("alice");                          // deletes the saved session
```

Proxies are shown with their password hidden. Log in with the CLI (`autotok login`), which opens
a browser window.

## Errors

Every error is an `AutotokException` (unchecked):

```java
try {
    autotok.upload("alice", "clip.mp4", "Hello #fyp");
} catch (AutotokException e) {
    System.out.println(e.type() + ": " + e.getMessage());   // ValidationError, PublishError, ...
    if (e.retryable()) {
        // Nothing reached TikTok's publish step: trying again can't post twice.
    } else if (e.isPublishUncertain()) {
        // The post may or may not exist: check TikTok before trying again.
    }
    // PublishError: e.statusCode(), e.statusMsg(). UploadError: e.httpStatus().
    // e.stderr() has autotok's log.
}
```

## Settings

```java
new Autotok(List.of("/usr/local/bin/autotok"));                  // a path to autotok
new Autotok(List.of("python3", "-m", "autotok"));                // or a command with arguments
new Autotok(List.of("autotok"), Map.of("AUTOTOK_HOME", "/srv/autotok", "AUTOTOK_BROWSER", "browserbase"));
```

The map sets environment variables for autotok, such as where accounts are saved
(`AUTOTOK_HOME`) or a [cloud browser](../README.md#cloud-browsers-browserbase-steel). autotok also
reads `~/.autotok/.env`.

Captions are sent to autotok through stdin as UTF-8, so emoji arrive intact even where Java can't
pass them as command-line arguments (a container with no UTF-8 locale, for example).

## Development

```bash
mvn test
AUTOTOK_TEST_BIN=$(which autotok) mvn test    # also test against a real autotok
```
