using System;

namespace Autotok;

/// <summary>Who can see a post.</summary>
public enum Visibility
{
    /// <summary>Everyone.</summary>
    Public,

    /// <summary>Only the account.</summary>
    Private,
}

/// <summary>Post settings for <see cref="AutotokClient.UploadAsync"/>.</summary>
public sealed record UploadOptions
{
    /// <summary>
    /// When TikTok should publish the video: 15 minutes to 30 days ahead (TikTok limits some
    /// accounts to 10 days). Null (the default) posts now.
    /// </summary>
    public DateTimeOffset? Schedule { get; init; }

    /// <summary>Public (the default) or private.</summary>
    public Visibility Visibility { get; init; } = Visibility.Public;

    /// <summary>Allow comments (default true).</summary>
    public bool AllowComment { get; init; } = true;

    /// <summary>Allow duets (default false).</summary>
    public bool AllowDuet { get; init; }

    /// <summary>Allow stitches (default false).</summary>
    public bool AllowStitch { get; init; }

    /// <summary>Label the video as AI-generated (default false).</summary>
    public bool AiLabel { get; init; }

    /// <summary>A proxy for this upload instead of the account's saved one.</summary>
    public string? Proxy { get; init; }

    /// <summary>Connect directly, ignoring the account's saved proxy.</summary>
    public bool NoProxy { get; init; }
}

/// <summary>What TikTok returned for a successful post.</summary>
/// <param name="VideoId">The video's id on TikTok.</param>
/// <param name="CreationId">The id autotok gave the upload.</param>
/// <param name="ScheduledFor">When TikTok will publish the video, or null if it was posted now.</param>
public sealed record UploadResult(string VideoId, string CreationId, DateTimeOffset? ScheduledFor);

/// <summary>A saved account, as <c>autotok accounts list</c> shows it.</summary>
/// <param name="Name">The account's name.</param>
/// <param name="HasSession">
/// Whether a TikTok session is saved (<see cref="AutotokClient.CheckSessionAsync"/> asks TikTok
/// whether it still works).
/// </param>
/// <param name="Proxy">The account's proxy with its password hidden, or null for a direct connection.</param>
/// <param name="Error">Why the account file couldn't be read, if it couldn't.</param>
public sealed record Account(string Name, bool HasSession, string? Proxy = null, string? Error = null);

/// <summary>An error from autotok, or from running it.</summary>
/// <remarks>
/// <para>
/// <see cref="Type"/> is the name of autotok's error class: <c>ValidationError</c>,
/// <c>AccountNotFoundError</c>, <c>NotLoggedInError</c>, <c>PublishError</c>,
/// <c>PublishUncertainError</c>, <c>UploadError</c>, <c>SigningError</c>... or <c>Error</c> when
/// autotok couldn't be run or failed unexpectedly.
/// </para>
/// <para>
/// <see cref="Retryable"/> is true only when nothing reached TikTok's publish step, so the same
/// upload can be tried again without posting twice. After a <c>PublishUncertainError</c> the post
/// may or may not exist: check the account on TikTok before trying again.
/// </para>
/// </remarks>
public sealed class AutotokException : Exception
{
    /// <summary>Creates an exception.</summary>
    public AutotokException(string message, string type = "Error")
        : base(message)
    {
        Type = type;
    }

    /// <summary>The name of autotok's error class, such as <c>PublishError</c>.</summary>
    public string Type { get; }

    /// <summary>Whether nothing reached TikTok's publish step, so trying again can't post twice.</summary>
    public bool Retryable { get; init; }

    /// <summary>Whether the post may or may not exist (check TikTok before trying again).</summary>
    public bool IsPublishUncertain => Type == "PublishUncertainError";

    /// <summary>TikTok's status_code, for a <c>PublishError</c>.</summary>
    public long? StatusCode { get; init; }

    /// <summary>TikTok's status_msg, for a <c>PublishError</c>.</summary>
    public string? StatusMsg { get; init; }

    /// <summary>The HTTP status of the failed request, for an <c>UploadError</c>.</summary>
    public int? HttpStatus { get; init; }

    /// <summary>autotok's exit status, or null if it didn't run.</summary>
    public int? ExitCode { get; init; }

    /// <summary>What autotok printed on stderr (its log), for debugging.</summary>
    public string Stderr { get; init; } = "";
}
