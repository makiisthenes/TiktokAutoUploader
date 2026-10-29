<?php

declare(strict_types=1);

namespace Autotok;

use DateTimeImmutable;

/** What TikTok returned for a successful post. */
final class UploadResult
{
    public function __construct(
        public readonly string $videoId,
        public readonly string $creationId,
        /** When TikTok will publish the video (UTC), or null if it was posted now. */
        public readonly ?DateTimeImmutable $scheduledFor = null,
    ) {
    }
}
