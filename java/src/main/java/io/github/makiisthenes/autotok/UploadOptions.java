package io.github.makiisthenes.autotok;

import java.time.Duration;
import java.time.Instant;
import java.util.Objects;

/**
 * Post settings for {@link Autotok#upload(String, String, String, UploadOptions)}.
 *
 * <pre>{@code
 * new UploadOptions()
 *     .schedule(Instant.now().plus(Duration.ofDays(1)))
 *     .visibility(Visibility.PRIVATE)
 *     .allowDuet(true)
 * }</pre>
 */
public final class UploadOptions {
    Duration scheduleIn;
    Instant scheduleAt;
    Visibility visibility = Visibility.PUBLIC;
    boolean allowComment = true;
    boolean allowDuet;
    boolean allowStitch;
    boolean aiLabel;
    String proxy;
    boolean noProxy;

    /**
     * Publish this long from now: 15 minutes to 30 days (TikTok limits some accounts to 10 days).
     * By default the video is posted now.
     */
    public UploadOptions schedule(Duration fromNow) {
        this.scheduleIn = Objects.requireNonNull(fromNow);
        this.scheduleAt = null;
        return this;
    }

    /** Publish at this time: 15 minutes to 30 days ahead (some accounts only allow 10 days). */
    public UploadOptions schedule(Instant at) {
        this.scheduleAt = Objects.requireNonNull(at);
        this.scheduleIn = null;
        return this;
    }

    /** Public (the default) or private. */
    public UploadOptions visibility(Visibility visibility) {
        this.visibility = Objects.requireNonNull(visibility);
        return this;
    }

    /** Allow comments (default true). */
    public UploadOptions allowComment(boolean allow) {
        this.allowComment = allow;
        return this;
    }

    /** Allow duets (default false). */
    public UploadOptions allowDuet(boolean allow) {
        this.allowDuet = allow;
        return this;
    }

    /** Allow stitches (default false). */
    public UploadOptions allowStitch(boolean allow) {
        this.allowStitch = allow;
        return this;
    }

    /** Label the video as AI-generated (default false). */
    public UploadOptions aiLabel(boolean label) {
        this.aiLabel = label;
        return this;
    }

    /** Use this proxy for this upload instead of the account's saved one. */
    public UploadOptions proxy(String proxy) {
        this.proxy = Objects.requireNonNull(proxy);
        return this;
    }

    /** Connect directly, ignoring the account's saved proxy. */
    public UploadOptions noProxy() {
        this.noProxy = true;
        return this;
    }
}
