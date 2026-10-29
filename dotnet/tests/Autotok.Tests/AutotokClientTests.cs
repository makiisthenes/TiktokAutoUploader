using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Xunit;

namespace Autotok.Tests;

public sealed class AutotokClientTests : IDisposable
{
    private readonly string _tmp = Directory.CreateTempSubdirectory("autotok-dotnet-").FullName;

    public void Dispose() => Directory.Delete(_tmp, recursive: true);

    private string ArgsFile => Path.Combine(_tmp, "args");

    /// <summary>A client whose autotok prints <paramref name="stdout"/> and exits with <paramref name="exit"/>.</summary>
    private AutotokClient Fake(string stdout, int exit = 0, string stderr = "", int sleepMs = 0)
    {
        var dotnet = Environment.GetEnvironmentVariable("DOTNET_HOST_PATH") ?? "dotnet";
        return new AutotokClient(
            [dotnet, Path.Combine(AppContext.BaseDirectory, "FakeAutotok.dll")],
            new Dictionary<string, string>
            {
                ["FAKE_AUTOTOK_ARGS"] = ArgsFile,
                ["FAKE_AUTOTOK_STDOUT"] = stdout,
                ["FAKE_AUTOTOK_STDERR"] = stderr,
                ["FAKE_AUTOTOK_EXIT"] = exit.ToString(),
                ["FAKE_AUTOTOK_SLEEP"] = sleepMs.ToString(),
            });
    }

    /// <summary>The arguments the fake autotok was run with, then "stdin:" and its input.</summary>
    private string[] Args() => File.ReadAllText(ArgsFile, Encoding.UTF8).Split('\0');

    [Fact]
    public async Task UploadWithTheDefaults()
    {
        var result = await Fake("Uploading...\n{\"video_id\": \"7301\", \"creation_id\": \"c1\", \"scheduled_for\": null}")
            .UploadAsync("alice", "clip.mp4", "Hello #fyp");
        Assert.Equal(new UploadResult("7301", "c1", null), result);
        Assert.Equal(
            ["--json", "upload", "--user=alice", "--video=clip.mp4", "--title-file=-",
             "--visibility=0", "--comment=1", "--duet=0", "--stitch=0", "--ailabel=0", "stdin:Hello #fyp"],
            Args());
    }

    [Fact]
    public async Task UploadWithEveryOption()
    {
        var caption = "-50% off 🎉\nsecond line \"quoted\" $HOME";
        var result = await Fake("{\"video_id\":\"7302\",\"creation_id\":\"c2\",\"scheduled_for\":\"2026-11-02T18:30:00Z\"}")
            .UploadAsync("-dash", "https://youtu.be/abc", caption, new UploadOptions
            {
                Schedule = DateTimeOffset.UtcNow.AddHours(2),
                Visibility = Visibility.Private,
                AllowComment = false,
                AllowDuet = true,
                AllowStitch = true,
                AiLabel = true,
                Proxy = "http://u:p@h.example:1",
                NoProxy = true,
            });
        Assert.Equal(new DateTimeOffset(2026, 11, 2, 18, 30, 0, TimeSpan.Zero), result.ScheduledFor);
        var args = Args();
        Assert.Equal(
            ["--json", "upload", "--user=-dash", "--youtube=https://youtu.be/abc", "--title-file=-",
             "--visibility=1", "--comment=0", "--duet=1", "--stitch=1", "--ailabel=1"],
            args[..10]);
        Assert.Matches("^--schedule=(7199|7200|7201)$", args[10]);
        Assert.Equal(["--proxy=http://u:p@h.example:1", "--no-proxy", "stdin:" + caption], args[11..]);
    }

    [Fact]
    public async Task AScheduleInThePastIsCaughtBeforeRunningAutotok()
    {
        var e = await Assert.ThrowsAsync<AutotokException>(() => Fake("{}")
            .UploadAsync("alice", "clip.mp4", "x", new UploadOptions { Schedule = DateTimeOffset.UtcNow.AddMinutes(-1) }));
        Assert.Equal("ValidationError", e.Type);
        Assert.Null(e.ExitCode);
        Assert.False(File.Exists(ArgsFile));
    }

    [Fact]
    public async Task ErrorsBecomeExceptions()
    {
        var e = await Assert.ThrowsAsync<AutotokException>(() => Fake(
                "{\"error\": {\"type\": \"PublishError\", \"message\": \"TikTok rejected the post\", \"retryable\": false,"
                + " \"status_code\": 7, \"status_msg\": \"guidelines\"}}", 1, "log line\n")
            .UploadAsync("alice", "clip.mp4", "x"));
        Assert.Equal("TikTok rejected the post", e.Message);
        Assert.Equal("PublishError", e.Type);
        Assert.False(e.Retryable);
        Assert.Equal(7, e.StatusCode);
        Assert.Equal("guidelines", e.StatusMsg);
        Assert.Equal(1, e.ExitCode);
        Assert.Equal("log line\n", e.Stderr);
        Assert.False(e.IsPublishUncertain);

        e = await Assert.ThrowsAsync<AutotokException>(() => Fake(
                "{\"error\": {\"type\": \"UploadError\", \"message\": \"HTTP 503\", \"retryable\": true, \"status\": 503}}", 1)
            .UploadAsync("alice", "clip.mp4", "x"));
        Assert.True(e.Retryable);
        Assert.Equal(503, e.HttpStatus);

        e = await Assert.ThrowsAsync<AutotokException>(() => Fake(
                "{\"error\": {\"type\": \"PublishUncertainError\", \"message\": \"lost\", \"retryable\": false}}", 1)
            .UploadAsync("alice", "clip.mp4", "x"));
        Assert.True(e.IsPublishUncertain);
    }

    [Fact]
    public async Task AnAutotokWithoutJsonSupport()
    {
        var e = await Assert.ThrowsAsync<AutotokException>(() =>
            Fake("", 2, "usage: autotok ...\nautotok: error: unrecognized arguments: --json\n").GetAccountsAsync());
        Assert.StartsWith(
            "autotok failed with exit status 2: autotok: error: unrecognized arguments: --json (This client needs",
            e.Message);
    }

    [Fact]
    public async Task AMissingAutotok()
    {
        var e = await Assert.ThrowsAsync<AutotokException>(() =>
            new AutotokClient(["/nonexistent/autotok"]).GetAccountsAsync());
        Assert.StartsWith("could not run /nonexistent/autotok: is autotok installed?", e.Message);
    }

    [Fact]
    public async Task CancellingStopsAutotok()
    {
        using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(500));
        var watch = Stopwatch.StartNew();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            Fake("{\"video_id\": \"1\"}", sleepMs: 30_000).UploadAsync("alice", "clip.mp4", "x", cancellationToken: cts.Token));
        Assert.True(watch.Elapsed < TimeSpan.FromSeconds(20), watch.Elapsed.ToString());
    }

    [Fact]
    public async Task Accounts()
    {
        var accounts = await Fake("{\"accounts\": [{\"name\": \"alice\", \"session\": true, \"proxy\": \"http://u:****@h:1\"},"
            + " {\"name\": \"broken\", \"session\": false, \"proxy\": null, \"error\": \"unreadable\"}]}").GetAccountsAsync();
        Assert.Equal([new Account("alice", true, "http://u:****@h:1"), new Account("broken", false, null, "unreadable")], accounts);
        Assert.Equal(["--json", "accounts", "list", "stdin:"], Args());

        Assert.False(await Fake("{\"name\": \"alice\", \"session_ok\": false}", 1).CheckSessionAsync("alice"));
        Assert.Equal(["--json", "accounts", "check", "--", "alice", "stdin:"], Args());
        Assert.True(await Fake("{\"name\": \"alice\", \"session_ok\": true}").CheckSessionAsync("alice"));

        Assert.True(await Fake("{\"name\": \"-x\", \"removed\": true}").RemoveAccountAsync("-x"));
        Assert.Equal(["--json", "accounts", "remove", "--", "-x", "stdin:"], Args());
        Assert.False(await Fake("{\"name\": \"-x\", \"removed\": false}", 1).RemoveAccountAsync("-x"));
    }

    /// <summary>Against a real autotok binary, when AUTOTOK_TEST_BIN is set (CI builds the Go one).</summary>
    [Fact]
    public async Task WithTheRealAutotok()
    {
        var bin = Environment.GetEnvironmentVariable("AUTOTOK_TEST_BIN");
        if (string.IsNullOrEmpty(bin))
        {
            return; // set AUTOTOK_TEST_BIN to an autotok binary to run this
        }
        var env = new Dictionary<string, string>
        {
            ["AUTOTOK_HOME"] = _tmp,
            ["AUTOTOK_VIDEOS_DIR"] = Path.Combine(_tmp, "videos"),
        };
        var autotok = new AutotokClient([bin], env);
        Assert.Empty(await autotok.GetAccountsAsync());

        var login = new ProcessStartInfo(bin) { RedirectStandardOutput = true };
        foreach (var arg in new[] { "login", "-n", "alice", "--sessionid", "s1", "-p", "h.example:8000:user:secret" })
        {
            login.ArgumentList.Add(arg);
        }
        foreach (var (name, value) in env)
        {
            login.Environment[name] = value;
        }
        using (var p = Process.Start(login)!)
        {
            await p.StandardOutput.ReadToEndAsync();
            await p.WaitForExitAsync();
            Assert.Equal(0, p.ExitCode);
        }
        Assert.Equal([new Account("alice", true, "http://user:****@h.example:8000")], await autotok.GetAccountsAsync());

        var e = await Assert.ThrowsAsync<AutotokException>(() => autotok.UploadAsync("alice", "missing.mp4", "x"));
        Assert.Equal("ValidationError", e.Type);
        Assert.Equal(2, e.ExitCode);
        Directory.CreateDirectory(Path.Combine(_tmp, "videos"));
        File.WriteAllBytes(Path.Combine(_tmp, "videos", "clip.mp4"), new byte[2048]);
        // The caption reaches autotok (through stdin), which checks its length first.
        e = await Assert.ThrowsAsync<AutotokException>(() =>
            autotok.UploadAsync("alice", "clip.mp4", string.Concat(Enumerable.Repeat("🎉", 2201))));
        Assert.Equal("ValidationError", e.Type);
        Assert.Contains("2200", e.Message);
        e = await Assert.ThrowsAsync<AutotokException>(() => autotok.UploadAsync("ghost", "missing.mp4", "x"));
        Assert.Equal("AccountNotFoundError", e.Type);
        Assert.Contains("autotok login -n ghost", e.Message);
        Assert.True(await autotok.RemoveAccountAsync("alice"));
        Assert.False(await autotok.RemoveAccountAsync("alice"));
    }
}
