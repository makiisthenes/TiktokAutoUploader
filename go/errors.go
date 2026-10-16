package autotok

// Errors, the same kinds as the Python and TypeScript packages'.
//
// Every error autotok returns on purpose is one of the types below, so callers can use
// errors.As to pick out the ones they handle. Retryable tells automation (a scheduler, your own
// scripts) whether running the same upload again is safe: it is only true when the failure
// happened before anything was sent to TikTok's publish endpoint, so a retry cannot create a
// duplicate post.

import "errors"

// Error is implemented by every error autotok returns on purpose.
type Error interface {
	error
	// Retryable reports whether nothing reached TikTok's publish step, so running the same
	// upload again can't post twice.
	Retryable() bool
}

// IsRetryable reports whether err is an autotok error that is safe to retry.
func IsRetryable(err error) bool {
	var e Error
	return errors.As(err, &e) && e.Retryable()
}

type baseError struct {
	msg   string
	cause error
}

func (e *baseError) Error() string { return e.msg }
func (e *baseError) Unwrap() error { return e.cause }

// ValidationError: invalid input (caption too long, bad schedule, bad proxy string...).
type ValidationError struct{ baseError }

func (*ValidationError) Retryable() bool { return false }

// AccountNotFoundError: no saved session exists for the requested account name.
type AccountNotFoundError struct{ baseError }

func (*AccountNotFoundError) Retryable() bool { return false }

// NotLoggedInError: the saved account has no TikTok sessionid cookie, or TikTok rejected it.
type NotLoggedInError struct{ baseError }

func (*NotLoggedInError) Retryable() bool { return false }

// LoginError: the interactive login did not complete.
type LoginError struct{ baseError }

func (*LoginError) Retryable() bool { return false }

// BrowserNotInstalledError: no Chrome or Chromium was found. Run `autotok install-browser`.
type BrowserNotInstalledError struct{ baseError }

func (*BrowserNotInstalledError) Retryable() bool { return false }

// ConfigurationError: a setting is missing or invalid (e.g. BROWSERBASE_API_KEY is not set).
type ConfigurationError struct{ baseError }

func (*ConfigurationError) Retryable() bool { return false }

// RemoteBrowserError: a cloud browser (Browserbase, Steel) session could not be started or
// reached.
type RemoteBrowserError struct{ baseError }

func (*RemoteBrowserError) Retryable() bool { return true }

// SigningError: generating TikTok's request signatures failed (nothing was published).
type SigningError struct{ baseError }

func (*SigningError) Retryable() bool { return true }

// UploadError: the video could not be transferred to TikTok (nothing was published).
type UploadError struct {
	baseError
	// Status is the HTTP status of the failed request, or 0 if no response arrived.
	Status int
	// Body is the start of the response body, for debugging.
	Body string
}

func (*UploadError) Retryable() bool { return true }

// PublishError: TikTok rejected the post, e.g. invalid parameters or a guidelines block.
type PublishError struct {
	baseError
	// StatusCode is TikTok's status_code; HasStatusCode is false when the response had none
	// (e.g. an HTTP error).
	StatusCode    int64
	HasStatusCode bool
	// StatusMsg is TikTok's status_msg, or the start of the response body.
	StatusMsg string
	// Response is the full JSON response, when there was one.
	Response map[string]any
}

func (*PublishError) Retryable() bool { return false }

// PublishUncertainError: the publish request failed in transit, so the post may or may not
// exist. Check the account on TikTok before trying again.
type PublishUncertainError struct{ baseError }

func (*PublishUncertainError) Retryable() bool { return false }

func newValidationError(msg string) error { return &ValidationError{baseError{msg: msg}} }

func newConfigurationError(msg string) error { return &ConfigurationError{baseError{msg: msg}} }

func newLoginError(msg string, cause error) error {
	return &LoginError{baseError{msg: msg, cause: cause}}
}

func newRemoteBrowserError(msg string, cause error) error {
	return &RemoteBrowserError{baseError{msg: msg, cause: cause}}
}

func newSigningError(msg string, cause error) error {
	return &SigningError{baseError{msg: msg, cause: cause}}
}

func newUploadError(msg string, status int, body string, cause error) error {
	return &UploadError{baseError: baseError{msg: msg, cause: cause}, Status: status, Body: body}
}
