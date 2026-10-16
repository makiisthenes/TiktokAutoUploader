package autotok_test

import (
	"context"
	"errors"
	"fmt"
	"log"
	"log/slog"
	"os"
	"time"

	autotok "github.com/makiisthenes/TiktokAutoUploader/go"
)

func Example() {
	ctx := context.Background()

	// Once per account: log in to TikTok in the browser window that opens.
	if _, err := autotok.Login(ctx, "my_account", nil); err != nil {
		log.Fatal(err)
	}

	result, err := autotok.UploadVideo(ctx, "my_account", "clip.mp4", "Hello #fyp", nil)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("posted video", result.VideoID)
}

func ExampleClient_Upload() {
	ctx := context.Background()
	client, err := autotok.NewClient("alice", nil) // uses alice's saved proxy
	if err != nil {
		log.Fatal(err)
	}
	result, err := client.Upload(ctx, "clip.mp4", "Going live tomorrow #fyp @friend", &autotok.UploadOptions{
		Schedule:   time.Now().Add(24 * time.Hour), // 15 minutes to 30 days ahead
		Visibility: autotok.Public,
		AllowDuet:  true,
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("scheduled for", result.ScheduledFor)
}

func ExampleIsRetryable() {
	client, err := autotok.NewClient("alice", nil)
	if err != nil {
		log.Fatal(err)
	}
	_, err = client.Upload(context.Background(), "clip.mp4", "caption", nil)
	var rejected *autotok.PublishError
	switch {
	case err == nil:
		fmt.Println("posted")
	case errors.As(err, &rejected):
		fmt.Println("TikTok said no:", rejected.StatusCode, rejected.StatusMsg)
	case autotok.IsRetryable(err):
		fmt.Println("nothing was posted; safe to try again:", err)
	default:
		fmt.Println("failed:", err)
	}
}

func ExampleLogin() {
	ctx := context.Background()
	acct, err := autotok.Login(ctx, "alice", &autotok.LoginOptions{
		Proxy:   "http://user:pass@gate.example.com:7000", // saved with the account
		Timeout: 10 * time.Minute,
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("logged in:", acct)
}

func ExampleImportSession() {
	// A sessionid cookie copied from your browser's developer tools; no browser needed.
	_, err := autotok.ImportSession("alice", "<sessionid>", autotok.SessionAccountOptions{
		Datacenter: "<tt-target-idc>",
	}, nil)
	if err != nil {
		log.Fatal(err)
	}
}

func ExampleClient_NewSigner() {
	// One signer for many uploads saves starting a browser for each one.
	ctx := context.Background()
	client, err := autotok.NewClient("alice", nil)
	if err != nil {
		log.Fatal(err)
	}
	signer := client.NewSigner()
	defer signer.Close()
	client.Signer = signer
	for _, video := range []string{"one.mp4", "two.mp4"} {
		if _, err := client.Upload(ctx, video, "Batch #fyp", nil); err != nil {
			log.Println(video, err)
		}
	}
}

func ExampleSetLogger() {
	// Show autotok's progress messages, not just its warnings.
	autotok.SetLogger(slog.New(autotok.NewTextHandler(os.Stderr, slog.LevelInfo, "autotok: ")))
}
