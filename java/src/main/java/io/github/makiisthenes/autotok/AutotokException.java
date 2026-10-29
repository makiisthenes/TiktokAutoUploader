package io.github.makiisthenes.autotok;

import java.util.Optional;

/**
 * An error from autotok, or from running it.
 *
 * <p>{@link #type()} is the name of autotok's error class: {@code ValidationError},
 * {@code AccountNotFoundError}, {@code NotLoggedInError}, {@code PublishError},
 * {@code PublishUncertainError}, {@code UploadError}, {@code SigningError}... or {@code Error} when
 * autotok couldn't be run or failed unexpectedly.
 *
 * <p>{@link #retryable()} is true only when nothing reached TikTok's publish step, so the same
 * upload can be tried again without posting twice. After a {@code PublishUncertainError} the post
 * may or may not exist: check the account on TikTok before trying again.
 */
public final class AutotokException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    private final String type;
    private final boolean retryable;
    private final Integer statusCode;
    private final String statusMsg;
    private final Integer httpStatus;
    private final Integer exitCode;
    private final String stderr;

    AutotokException(String message, String type, boolean retryable, Integer statusCode, String statusMsg,
            Integer httpStatus, Integer exitCode, String stderr) {
        super(message);
        this.type = type;
        this.retryable = retryable;
        this.statusCode = statusCode;
        this.statusMsg = statusMsg;
        this.httpStatus = httpStatus;
        this.exitCode = exitCode;
        this.stderr = stderr;
    }

    AutotokException(String message, String type) {
        this(message, type, false, null, null, null, null, "");
    }

    /** The name of autotok's error class, such as {@code PublishError}. */
    public String type() {
        return type;
    }

    /** Whether nothing reached TikTok's publish step, so trying again can't post twice. */
    public boolean retryable() {
        return retryable;
    }

    /** Whether the post may or may not exist (check TikTok before trying again). */
    public boolean isPublishUncertain() {
        return "PublishUncertainError".equals(type);
    }

    /** TikTok's status_code, for a {@code PublishError}. */
    public Optional<Integer> statusCode() {
        return Optional.ofNullable(statusCode);
    }

    /** TikTok's status_msg, for a {@code PublishError}. */
    public Optional<String> statusMsg() {
        return Optional.ofNullable(statusMsg);
    }

    /** The HTTP status of the failed request, for an {@code UploadError}. */
    public Optional<Integer> httpStatus() {
        return Optional.ofNullable(httpStatus);
    }

    /** autotok's exit status, or empty if it didn't run. */
    public Optional<Integer> exitCode() {
        return Optional.ofNullable(exitCode);
    }

    /** What autotok printed on stderr (its log), for debugging. */
    public String stderr() {
        return stderr;
    }
}
