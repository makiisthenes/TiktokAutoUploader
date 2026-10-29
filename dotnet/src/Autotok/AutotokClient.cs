using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;

namespace Autotok;

/// <summary>
/// Uploads and schedules TikTok videos by running the autotok command line.
/// </summary>
/// <remarks>
/// <para>
/// autotok (the Python package, or the single Go binary) logs in, signs and uploads; this class
/// runs it with <c>--json</c> and turns its answers into .NET objects and exceptions. It uses the
/// accounts you logged in to with <c>autotok login</c>, and each account's saved proxy.
/// </para>
/// <code>
/// var autotok = new AutotokClient();
/// var result = await autotok.UploadAsync("alice", "clip.mp4", "Hello #fyp");
/// Console.WriteLine(result.VideoId);
/// </code>
/// <para>An AutotokClient holds no state, so one can be shared between threads.</para>
/// </remarks>
public sealed class AutotokClient
{
    private static readonly Regex Url = new("^https?://", RegexOptions.IgnoreCase);

    private readonly string[] _command;
    private readonly Dictionary<string, string> _env;

    /// <summary>Runs <c>autotok</c> from the PATH, or the command given.</summary>
    /// <param name="command">
    /// A command name or path, or a command with arguments such as
    /// <c>["python3", "-m", "autotok"]</c>. Default: <c>autotok</c> on the PATH.
    /// </param>
    /// <param name="env">
    /// Environment variables to set for autotok, such as <c>AUTOTOK_HOME</c> or
    /// <c>AUTOTOK_BROWSER</c>; the rest of the environment is passed on as it is.
    /// </param>
    public AutotokClient(IEnumerable<string>? command = null, IReadOnlyDictionary<string, string>? env = null)
    {
        _command = (command ?? ["autotok"]).ToArray();
        if (_command.Length == 0)
        {
            throw new ArgumentException("command must not be empty", nameof(command));
        }
        _env = env is null ? [] : new Dictionary<string, string>(env);
    }

    /// <summary>Uploads a video and posts it now, or schedules it.</summary>
    /// <remarks>
    /// Every upload is a real post. Uploads take a while (often a minute or more). Cancelling
    /// stops autotok, after which the post may or may not exist: check TikTok before trying again.
    /// </remarks>
    /// <param name="account">A saved account name (<c>autotok login -n NAME</c>).</param>
    /// <param name="video">
    /// A file path, the name of a file in autotok's videos folder, or a YouTube link to download
    /// and upload (needs yt-dlp).
    /// </param>
    /// <param name="caption">Up to 2200 characters; #hashtags and @mentions become clickable.</param>
    /// <param name="options">When to publish, who can see the post, and its other settings.</param>
    /// <param name="cancellationToken">Stops autotok.</param>
    /// <exception cref="AutotokException">autotok or TikTok reported an error.</exception>
    public async Task<UploadResult> UploadAsync(
        string account,
        string video,
        string caption,
        UploadOptions? options = null,
        CancellationToken cancellationToken = default)
    {
        options ??= new UploadOptions();
        var args = new List<string>
        {
            "upload",
            $"--user={account}",
            (Url.IsMatch(video) ? "--youtube=" : "--video=") + video,
            "--title-file=-",
            $"--visibility={(options.Visibility == Visibility.Private ? 1 : 0)}",
            $"--comment={Flag(options.AllowComment)}",
            $"--duet={Flag(options.AllowDuet)}",
            $"--stitch={Flag(options.AllowStitch)}",
            $"--ailabel={Flag(options.AiLabel)}",
        };
        if (options.Schedule is { } at)
        {
            // Round up, so a time exactly 15 minutes ahead isn't turned into slightly less.
            var seconds = (long)Math.Ceiling((at - DateTimeOffset.UtcNow).TotalSeconds);
            if (seconds <= 0)
            {
                throw new AutotokException("schedule is in the past", "ValidationError");
            }
            args.Add($"--schedule={seconds}");
        }
        if (options.Proxy is not null)
        {
            args.Add($"--proxy={options.Proxy}");
        }
        if (options.NoProxy)
        {
            args.Add("--no-proxy");
        }

        var data = await RunAsync(args, caption, cancellationToken).ConfigureAwait(false);
        var scheduled = data.TryGetProperty("scheduled_for", out var s) && s.ValueKind == JsonValueKind.String
            ? DateTimeOffset.Parse(s.GetString()!, System.Globalization.CultureInfo.InvariantCulture)
            : (DateTimeOffset?)null;
        return new UploadResult(Text(data, "video_id") ?? "", Text(data, "creation_id") ?? "", scheduled);
    }

    /// <summary>The saved accounts.</summary>
    /// <exception cref="AutotokException">autotok reported an error.</exception>
    public async Task<IReadOnlyList<Account>> GetAccountsAsync(CancellationToken cancellationToken = default)
    {
        var data = await RunAsync(["accounts", "list"], "", cancellationToken).ConfigureAwait(false);
        var accounts = new List<Account>();
        if (data.TryGetProperty("accounts", out var list) && list.ValueKind == JsonValueKind.Array)
        {
            foreach (var a in list.EnumerateArray())
            {
                accounts.Add(new Account(
                    Text(a, "name") ?? "",
                    a.TryGetProperty("session", out var session) && session.ValueKind == JsonValueKind.True,
                    Text(a, "proxy"),
                    Text(a, "error")));
            }
        }
        return accounts;
    }

    /// <summary>Asks TikTok whether the account's saved session still works.</summary>
    /// <exception cref="AutotokException">autotok reported an error, such as an unknown account.</exception>
    public async Task<bool> CheckSessionAsync(string account, CancellationToken cancellationToken = default)
    {
        var data = await RunAsync(["accounts", "check", "--", account], "", cancellationToken).ConfigureAwait(false);
        return data.TryGetProperty("session_ok", out var ok) && ok.ValueKind == JsonValueKind.True;
    }

    /// <summary>Deletes a saved account. Returns false if there was none.</summary>
    /// <exception cref="AutotokException">autotok reported an error.</exception>
    public async Task<bool> RemoveAccountAsync(string account, CancellationToken cancellationToken = default)
    {
        var data = await RunAsync(["accounts", "remove", "--", account], "", cancellationToken).ConfigureAwait(false);
        return data.TryGetProperty("removed", out var removed) && removed.ValueKind == JsonValueKind.True;
    }

    private static int Flag(bool b) => b ? 1 : 0;

    private static string? Text(JsonElement e, string name) =>
        e.TryGetProperty(name, out var v) && v.ValueKind != JsonValueKind.Null ? v.ToString() : null;

    private static int? Int(JsonElement e, string name) =>
        e.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.Number && v.TryGetInt32(out var i) ? i : null;

    private static long? Long(JsonElement e, string name) =>
        e.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.Number && v.TryGetInt64(out var l) ? l : null;

    /// <summary>
    /// Runs <c>autotok --json ARGS</c> with <paramref name="input"/> on its stdin, and returns the
    /// JSON object it printed. Captions go through stdin as UTF-8, so emoji arrive intact on every
    /// system.
    /// </summary>
    private async Task<JsonElement> RunAsync(IEnumerable<string> args, string input, CancellationToken cancellationToken)
    {
        var info = new ProcessStartInfo(_command[0])
        {
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            StandardInputEncoding = new UTF8Encoding(false),
            StandardOutputEncoding = Encoding.UTF8,
            StandardErrorEncoding = Encoding.UTF8,
        };
        foreach (var arg in _command.Skip(1).Append("--json").Concat(args))
        {
            info.ArgumentList.Add(arg);
        }
        foreach (var (name, value) in _env)
        {
            info.Environment[name] = value;
        }

        using var process = new Process { StartInfo = info };
        try
        {
            process.Start();
        }
        catch (Win32Exception e)
        {
            throw new AutotokException(NotFound(_command[0], e.Message));
        }

        var stdoutTask = process.StandardOutput.ReadToEndAsync();
        var stderrTask = process.StandardError.ReadToEndAsync();
        // Write on another thread: a write autotok doesn't read must not hold up cancelling.
        var stdinTask = Task.Run(() => WriteInputAsync(process, input));
        try
        {
            await process.WaitForExitAsync(cancellationToken).ConfigureAwait(false);
        }
        catch (OperationCanceledException)
        {
            try
            {
                process.Kill(entireProcessTree: true);
            }
            catch (InvalidOperationException)
            {
                // It had already exited.
            }
            throw;
        }
        var stdout = await stdoutTask.ConfigureAwait(false);
        var stderr = await stderrTask.ConfigureAwait(false);
        await stdinTask.ConfigureAwait(false);
        var exitCode = process.ExitCode;

        var lastLine = stdout.Trim().Split('\n').Last().Trim();
        JsonElement? data = null;
        try
        {
            using var doc = JsonDocument.Parse(lastLine);
            if (doc.RootElement.ValueKind == JsonValueKind.Object)
            {
                data = doc.RootElement.Clone();
            }
        }
        catch (JsonException)
        {
        }
        if (data is { } d)
        {
            if (d.TryGetProperty("error", out var e) && e.ValueKind == JsonValueKind.Object)
            {
                throw new AutotokException(Text(e, "message") ?? "autotok failed", Text(e, "type") ?? "Error")
                {
                    Retryable = e.TryGetProperty("retryable", out var r) && r.ValueKind == JsonValueKind.True,
                    StatusCode = Long(e, "status_code"),
                    StatusMsg = Text(e, "status_msg"),
                    HttpStatus = Int(e, "status"),
                    ExitCode = exitCode,
                    Stderr = stderr,
                };
            }
            return d;
        }

        // No JSON: autotok didn't start, or is a version without --json.
        string message;
        if (exitCode == 127)
        {
            message = NotFound(_command[0], stderr);
        }
        else
        {
            var last = stderr.Trim().Split('\n').Last().Trim();
            message = $"autotok failed with exit status {exitCode}: {(last.Length == 0 ? "no output" : last)}";
            if (stderr.Contains("json", StringComparison.Ordinal))
            {
                message += " (This client needs an autotok version with the --json option: upgrade autotok.)";
            }
        }
        throw new AutotokException(message) { ExitCode = exitCode, Stderr = stderr };
    }

    private static async Task WriteInputAsync(Process process, string input)
    {
        try
        {
            await process.StandardInput.WriteAsync(input).ConfigureAwait(false);
            process.StandardInput.Close();
        }
        catch (Exception e) when (e is IOException or ObjectDisposedException or InvalidOperationException)
        {
            // autotok exited (or was stopped) without reading it; its output says why.
        }
    }

    private static string NotFound(string program, string detail)
    {
        var message = $"could not run {program}: is autotok installed? Install it (see "
            + "https://github.com/makiisthenes/TiktokAutoUploader#install) or pass its path to new AutotokClient().";
        return string.IsNullOrWhiteSpace(detail) ? message : $"{message} ({detail.Trim()})";
    }
}
