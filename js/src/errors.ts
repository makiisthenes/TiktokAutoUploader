/**
 * Error hierarchy, the same as the Python package's.
 *
 * Every error autotok throws on purpose extends {@link AutotokError}, so callers can catch one
 * type. `retryable` tells automation (a scheduler, your own scripts) whether running the same
 * upload again is safe: it is only `true` when the failure happened before anything was sent to
 * TikTok's publish endpoint, so a retry cannot create a duplicate post.
 */

/** Base class for all autotok errors. */
export class AutotokError extends Error {
  override name = "AutotokError";

  /** `true` only when nothing reached TikTok's publish step, so retrying can't post twice. */
  get retryable(): boolean {
    return false;
  }
}

/** Invalid input (caption too long, bad schedule, bad proxy string...). */
export class ValidationError extends AutotokError {
  override name = "ValidationError";
}

/** No saved session exists for the requested account name. */
export class AccountNotFoundError extends AutotokError {
  override name = "AccountNotFoundError";
}

/** The saved account has no TikTok `sessionid` cookie, or it expired. */
export class NotLoggedInError extends AutotokError {
  override name = "NotLoggedInError";
}

/** The interactive login did not complete. */
export class LoginError extends AutotokError {
  override name = "LoginError";
}

/** Playwright's Chromium is missing. Run `npx playwright install chromium`. */
export class BrowserNotInstalledError extends AutotokError {
  override name = "BrowserNotInstalledError";
}

/** A setting is missing or invalid (e.g. `BROWSERBASE_API_KEY` is not set). */
export class ConfigurationError extends AutotokError {
  override name = "ConfigurationError";
}

/** A cloud browser (Browserbase, Steel) session could not be started or reached. */
export class RemoteBrowserError extends AutotokError {
  override name = "RemoteBrowserError";
  override get retryable(): boolean {
    return true;
  }
}

/** Generating TikTok's request signatures failed (nothing was published). */
export class SigningError extends AutotokError {
  override name = "SigningError";
  override get retryable(): boolean {
    return true;
  }
}

/** The video could not be transferred to TikTok (nothing was published). */
export class UploadError extends AutotokError {
  override name = "UploadError";
  /** HTTP status of the failed request, if there was a response. */
  readonly status: number | null;
  /** Start of the response body, for debugging. */
  readonly body: string | null;

  constructor(message: string, options: ErrorOptions & { status?: number | null; body?: string | null } = {}) {
    super(message, options);
    this.status = options.status ?? null;
    this.body = options.body ?? null;
  }

  override get retryable(): boolean {
    return true;
  }
}

/** TikTok rejected the post, e.g. invalid parameters or a guidelines block. */
export class PublishError extends AutotokError {
  override name = "PublishError";
  /** TikTok's `status_code` (`null` when the response had none, e.g. an HTTP error). */
  readonly statusCode: number | null;
  /** TikTok's `status_msg`, or the start of the response body. */
  readonly statusMsg: string | null;
  /** The full JSON response, when there was one. */
  readonly response: Record<string, unknown>;

  constructor(
    message: string,
    options: ErrorOptions & {
      statusCode?: number | null;
      statusMsg?: string | null;
      response?: Record<string, unknown> | null;
    } = {},
  ) {
    super(message, options);
    this.statusCode = options.statusCode ?? null;
    this.statusMsg = options.statusMsg ?? null;
    this.response = options.response ?? {};
  }
}

/**
 * The publish request failed in transit, so the post may or may not exist.
 * Check the account on TikTok before trying again.
 */
export class PublishUncertainError extends AutotokError {
  override name = "PublishUncertainError";
}
