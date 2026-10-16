// Package autotok uploads and schedules TikTok videos from Go, with a proxy per account.
//
//	ctx := context.Background()
//	if _, err := autotok.Login(ctx, "alice", nil); err != nil { // opens a browser once
//		log.Fatal(err)
//	}
//	result, err := autotok.UploadVideo(ctx, "alice", "clip.mp4", "Hello #fyp", nil)
//
// For more control, make a Client:
//
//	client, err := autotok.NewClient("alice", &autotok.ClientOptions{Proxy: "http://user:pass@host:8000"})
//	result, err := client.Upload(ctx, "clip.mp4", "Scheduled #fyp", &autotok.UploadOptions{
//		Schedule: time.Now().Add(time.Hour),
//	})
//
// Accounts live in ~/.autotok/accounts, shared with the Python and TypeScript packages and the
// autotok command line, so an account logged in with any of them works here too.
//
// Logging in and signing need Chrome or Chromium: autotok uses an installed Google Chrome,
// Chromium or Microsoft Edge, Playwright's Chromium, or one downloaded with InstallBrowser (the
// command line's `autotok install-browser`). It can also run them in Browserbase or Steel
// cloud browsers (AUTOTOK_BROWSER).
package autotok

// Version is the version of this package.
const Version = "0.1.0"
