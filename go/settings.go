package autotok

// Paths and environment-driven settings, shared with the Python and TypeScript packages.
//
// Everything is resolved at call time, so environment changes and tests always see the current
// values. All three packages read the same variables and the same account folder, so a session
// saved by one works in the others.
//
//   - AUTOTOK_HOME: data directory (default ~/.autotok)
//   - AUTOTOK_VIDEOS_DIR: where videos are looked up by name (default $AUTOTOK_HOME/videos)
//   - AUTOTOK_BROWSER_PATH: use this Chrome/Chromium binary
//   - AUTOTOK_BROWSER_CHANNEL: chrome, chromium or msedge, to use an installed browser
//   - AUTOTOK_BROWSER: where the login and signing browser runs: local (default), browserbase
//     or steel

import (
	"os"
	"path/filepath"
	"strings"
)

// TikTokLoginURL is the page the login browser opens.
const TikTokLoginURL = "https://www.tiktok.com/login"

// DefaultUserAgent is used when an account has no user agent recorded (e.g. sessions imported
// by hand). Accounts saved by Login store the real user agent of the browser that created the
// session.
const DefaultUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
	"(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"

// ExpandUser replaces a leading ~ with the home directory.
func ExpandUser(path string) string {
	if path == "~" || strings.HasPrefix(path, "~/") || strings.HasPrefix(path, `~\`) {
		home, err := os.UserHomeDir()
		if err != nil {
			return path
		}
		if path == "~" {
			return home
		}
		return filepath.Join(home, path[2:])
	}
	return path
}

// Home is the data directory: $AUTOTOK_HOME, or ~/.autotok.
func Home() string {
	if v := os.Getenv("AUTOTOK_HOME"); v != "" {
		return ExpandUser(v)
	}
	return ExpandUser("~/.autotok")
}

// AccountsDir is where saved sessions live.
func AccountsDir() string { return filepath.Join(Home(), "accounts") }

// VideosDir is where videos are looked up by name: $AUTOTOK_VIDEOS_DIR, or $AUTOTOK_HOME/videos.
func VideosDir() string {
	if v := os.Getenv("AUTOTOK_VIDEOS_DIR"); v != "" {
		return ExpandUser(v)
	}
	return filepath.Join(Home(), "videos")
}

// BrowserProviderName is the browser provider AUTOTOK_BROWSER selects (default "local").
func BrowserProviderName() string {
	v := strings.ToLower(strings.TrimSpace(os.Getenv("AUTOTOK_BROWSER")))
	if v == "" {
		return "local"
	}
	return v
}
