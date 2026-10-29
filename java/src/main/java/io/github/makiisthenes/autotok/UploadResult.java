package io.github.makiisthenes.autotok;

import java.time.Instant;
import java.util.Optional;

/**
 * What TikTok returned for a successful post.
 *
 * @param videoId the video's id on TikTok
 * @param creationId the id autotok gave the upload
 * @param scheduledFor when TikTok will publish the video, or empty if it was posted now
 */
public record UploadResult(String videoId, String creationId, Optional<Instant> scheduledFor) {}
