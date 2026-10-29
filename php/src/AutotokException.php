<?php

declare(strict_types=1);

namespace Autotok;

use RuntimeException;

/**
 * An error from autotok, or from running it.
 *
 * `$type` is the name of autotok's error class: ValidationError, AccountNotFoundError,
 * NotLoggedInError, PublishError, PublishUncertainError, UploadError, SigningError... or "Error"
 * when autotok couldn't be run or failed unexpectedly.
 *
 * `$retryable` is true only when nothing reached TikTok's publish step, so the same upload can
 * be tried again without posting twice. After a PublishUncertainError the post may or may not
 * exist: check the account on TikTok before trying again.
 */
final class AutotokException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly string $type = 'Error',
        public readonly bool $retryable = false,
        /** TikTok's status_code, for a PublishError. */
        public readonly ?int $statusCode = null,
        /** TikTok's status_msg, for a PublishError. */
        public readonly ?string $statusMsg = null,
        /** The HTTP status of the failed request, for an UploadError. */
        public readonly ?int $httpStatus = null,
        /** autotok's exit status, or null if it didn't run. */
        public readonly ?int $exitCode = null,
        /** What autotok printed on stderr (its log), for debugging. */
        public readonly string $stderr = '',
    ) {
        parent::__construct($message);
    }

    /** Whether the post may or may not exist (check TikTok before trying again). */
    public function isPublishUncertain(): bool
    {
        return $this->type === 'PublishUncertainError';
    }
}
