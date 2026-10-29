# autotok for .NET (C#)

Upload and schedule TikTok videos from C# and .NET, with a proxy per account.

This library runs the [autotok](https://github.com/makiisthenes/TiktokAutoUploader) command
line and turns its answers into .NET objects and exceptions. It uses the accounts you logged in to
with `autotok login`, and each account's saved proxy. No dependencies; .NET 8 or newer.

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

The library isn't on NuGet yet. Reference the project from a copy of this repository:

```bash
dotnet add reference path/to/TiktokAutoUploader/dotnet/src/Autotok/Autotok.csproj
```

or build a package with `dotnet pack dotnet/src/Autotok -o ./packages` and add that folder as a
NuGet source.

## Upload

```csharp
using Autotok;

var autotok = new AutotokClient();                       // runs `autotok` from your PATH

var result = await autotok.UploadAsync("alice", "clip.mp4", "Hello #fyp");
Console.WriteLine(result.VideoId);

await autotok.UploadAsync("alice", "clip.mp4", "Going live tomorrow #fyp @friend", new UploadOptions
{
    Schedule = DateTimeOffset.UtcNow.AddDays(1),
    Visibility = Visibility.Public,                      // or Private
    AllowComment = true,
    AllowDuet = false,
    AllowStitch = false,
    AiLabel = false,
    Proxy = "http://user:pass@host:port",                // instead of the account's saved proxy
});
```

- `video` is a file path, the name of a file in `~/.autotok/videos`, or a YouTube link to
  download and upload (needs [yt-dlp](https://github.com/yt-dlp/yt-dlp)).
- `Schedule` must be 15 minutes to 30 days ahead (TikTok limits some accounts to 10 days).
- `NoProxy = true` connects directly, ignoring the account's saved proxy.
- Every upload is a real post, and takes a while (often a minute or more). Every method takes a
  `CancellationToken`; cancelling stops autotok, after which the post may or may not exist.
- An `AutotokClient` holds no state and can be shared, for example as a singleton.

## Accounts

```csharp
foreach (var account in await autotok.GetAccountsAsync())
{
    Console.WriteLine($"{account.Name} {account.HasSession} {account.Proxy ?? "direct"}");
}
await autotok.CheckSessionAsync("alice");                // asks TikTok whether the session still works
await autotok.RemoveAccountAsync("alice");               // deletes the saved session
```

Proxies are shown with their password hidden. Log in with the CLI (`autotok login`), which opens
a browser window.

## Errors

Every error is an `AutotokException`:

```csharp
try
{
    await autotok.UploadAsync("alice", "clip.mp4", "Hello #fyp");
}
catch (AutotokException e)
{
    Console.WriteLine($"{e.Type}: {e.Message}");         // ValidationError, PublishError, ...
    if (e.Retryable)
    {
        // Nothing reached TikTok's publish step: trying again can't post twice.
    }
    else if (e.IsPublishUncertain)
    {
        // The post may or may not exist: check TikTok before trying again.
    }
    // PublishError: e.StatusCode, e.StatusMsg. UploadError: e.HttpStatus. e.Stderr has autotok's log.
}
```

## Settings

```csharp
new AutotokClient(["/usr/local/bin/autotok"]);                   // a path to autotok
new AutotokClient(["python3", "-m", "autotok"]);                 // or a command with arguments
new AutotokClient(["autotok"], new Dictionary<string, string>
{
    ["AUTOTOK_HOME"] = "/srv/autotok",
    ["AUTOTOK_BROWSER"] = "browserbase",
});
```

The dictionary sets environment variables for autotok, such as where accounts are saved
(`AUTOTOK_HOME`) or a [cloud browser](../README.md#cloud-browsers-browserbase-steel). autotok also
reads `~/.autotok/.env`.

## Development

```bash
cd dotnet
dotnet test
AUTOTOK_TEST_BIN=$(which autotok) dotnet test    # also test against a real autotok
```
