// Command autotok uploads and schedules TikTok videos: the Go build of the autotok command line.
//
// It has the same commands and flags as the Python package's CLI and shares its saved accounts,
// in one binary with no Python or Node.js needed:
//
//	autotok login -n alice -p http://user:pass@host:8000
//	autotok upload -u alice -v clip.mp4 -t "Hello #fyp"
package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"log/slog"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"reflect"
	"regexp"
	"runtime"
	"slices"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/chromedp/chromedp"

	autotok "github.com/makiisthenes/TiktokAutoUploader/go"
)

var (
	stdin  io.Reader = os.Stdin
	stdout io.Writer = os.Stdout
	stderr io.Writer = os.Stderr
	// jsonOutput is set by --json: results and errors are printed as JSON on stdout.
	jsonOutput bool
)

// jsonCommands can answer in JSON (--json), for scripts and the PHP, Java and C# clients.
var jsonCommands = []string{"upload", "accounts"}

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	code := run(ctx, os.Args[1:])
	stop()
	os.Exit(code)
}

// usageError is a mistake on the command line (exit status 2).
type usageError struct{ msg string }

func (e *usageError) Error() string { return e.msg }

type command struct {
	name, help string
	run        func(ctx context.Context, args []string, store *autotok.AccountStore) error
}

var commands = []command{
	{"login", "log in to TikTok and save the session", cmdLogin},
	{"upload", "upload a video", cmdUpload},
	{"show", "list saved accounts or videos", cmdShow},
	{"accounts", "manage saved accounts (list, remove, check)", cmdAccounts},
	{"proxy", "set, clear or test proxies", cmdProxy},
	{"install-browser", "download Chrome for Testing, for machines without Chrome", cmdInstallBrowser},
	{"browser", "check the login/signing browser (local or cloud)", cmdBrowser},
	{"version", "print the version", cmdVersion},
}

func printUsage(w io.Writer) {
	fmt.Fprintf(w, `Usage: autotok [-q] [--debug] [--browser NAME] <command> [options]

Upload and schedule TikTok videos from the command line.

Commands:
`)
	for _, c := range commands {
		fmt.Fprintf(w, "  %-16s %s\n", c.name, c.help)
	}
	fmt.Fprintf(w, `
Options:
  -q, --quiet       only print errors
  --debug           verbose logging
  --json            print results and errors as JSON on stdout (upload and accounts)
  --browser NAME    where the login/signing browser runs: %s
                    (default: $AUTOTOK_BROWSER or local)
  --version         print the version

Run 'autotok <command> -h' for a command's options.
`, strings.Join(autotok.AvailableProviders(), ", "))
}

func run(ctx context.Context, args []string) int {
	autotok.LoadEnv() // .env in the current directory, then $AUTOTOK_HOME/.env

	global := flag.NewFlagSet("autotok", flag.ContinueOnError)
	global.SetOutput(io.Discard)
	var quiet, debug, version bool
	var browser string
	jsonOutput = false
	boolFlag(global, &quiet, "only print errors", "q", "quiet")
	boolFlag(global, &debug, "verbose logging", "debug")
	boolFlag(global, &jsonOutput, "print results and errors as JSON", "json")
	boolFlag(global, &version, "print the version", "version")
	global.StringVar(&browser, "browser", "", "browser provider")
	if err := global.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			printUsage(stdout)
			return 0
		}
		fmt.Fprintf(stderr, "error: %v\n", err)
		printUsage(stderr)
		return 2
	}
	if version {
		return exitCode(cmdVersion(ctx, nil, nil))
	}
	rest := global.Args()
	if len(rest) == 0 {
		printUsage(stderr)
		return 1
	}
	if browser != "" {
		if !slices.Contains(autotok.AvailableProviders(), strings.ToLower(browser)) {
			fmt.Fprintf(stderr, "error: --browser must be one of: %s\n", strings.Join(autotok.AvailableProviders(), ", "))
			return 2
		}
		os.Setenv("AUTOTOK_BROWSER", browser)
	}
	level := slog.LevelInfo
	if debug {
		level = slog.LevelDebug
	} else if quiet {
		level = slog.LevelError
	}
	logger := slog.New(autotok.NewTextHandler(stderr, level, ""))
	autotok.SetLogger(logger)
	slog.SetDefault(logger)

	name := rest[0]
	if jsonOutput && !slices.Contains(jsonCommands, name) {
		return exitCode(&usageError{"--json works with the upload and accounts commands"})
	}
	for _, c := range commands {
		if c.name == name {
			return exitCode(c.run(ctx, rest[1:], autotok.NewAccountStore("")))
		}
	}
	fmt.Fprintf(stderr, "error: unknown command '%s'\n\n", name)
	printUsage(stderr)
	return 2
}

func exitCode(err error) int {
	if err == nil {
		return 0
	}
	var usage *usageError
	var invalid *autotok.ValidationError
	var silent *silentError
	var uncertain *autotok.PublishUncertainError
	switch {
	case errors.Is(err, flag.ErrHelp):
		return 0
	case errors.As(err, &silent):
		return 1
	case jsonOutput:
		printJSONError(err)
		switch {
		case errors.As(err, &uncertain):
			return 1
		case errors.Is(err, context.Canceled):
			return 130
		case errors.As(err, &usage), errors.As(err, &invalid):
			return 2
		}
		return 1
	case errors.As(err, &uncertain):
		// Also when interrupted: the post may exist.
		fmt.Fprintf(stderr, "error: %s\n", err)
		return 1
	case errors.Is(err, context.Canceled):
		fmt.Fprintln(stderr, "\ncancelled")
		return 130
	case errors.As(err, &usage):
		fmt.Fprintf(stderr, "error: %s\n", usage.msg)
		return 2
	case errors.As(err, &invalid):
		fmt.Fprintf(stderr, "error: %s\n", err)
		return 2
	default:
		fmt.Fprintf(stderr, "error: %s\n", err)
		return 1
	}
}

// printJSON prints v as one line of JSON on stdout.
func printJSON(v any) {
	data, err := json.Marshal(v)
	if err != nil {
		panic(err) // only plain maps, slices and strings are printed
	}
	fmt.Fprintf(stdout, "%s\n", data)
}

// printJSONError prints err as {"error": {...}}: its type (the same names as the Python
// package's exceptions), message and whether running the same command again is safe.
func printJSONError(err error) {
	e := map[string]any{"type": "Error", "message": err.Error(), "retryable": autotok.IsRetryable(err)}
	var autotokErr autotok.Error
	var usage *usageError
	var publish *autotok.PublishError
	var upload *autotok.UploadError
	var uncertain *autotok.PublishUncertainError
	switch {
	case errors.As(err, &uncertain):
		e["type"] = "PublishUncertainError"
	case errors.Is(err, context.Canceled):
		e["type"], e["message"] = "Cancelled", "cancelled"
	case errors.As(err, &usage):
		e["type"] = "ValidationError"
	case errors.As(err, &autotokErr):
		e["type"] = reflect.TypeOf(autotokErr).Elem().Name()
	}
	if e["message"] == "" {
		e["message"] = e["type"]
	}
	if errors.As(err, &publish) {
		e["status_code"], e["status_msg"] = nil, publish.StatusMsg
		if publish.HasStatusCode {
			e["status_code"] = publish.StatusCode
		}
	} else if errors.As(err, &upload) {
		e["status"] = nil
		if upload.Status != 0 {
			e["status"] = upload.Status
		}
	}
	printJSON(map[string]any{"error": e})
}

// -- flags ----------------------------------------------------------------------

func newFlags(name, usage string) *flag.FlagSet {
	fs := flag.NewFlagSet(name, flag.ContinueOnError)
	fs.SetOutput(stderr)
	fs.Usage = func() { fmt.Fprint(stderr, usage) }
	return fs
}

func stringFlag(fs *flag.FlagSet, p *string, value, usage string, names ...string) {
	*p = value
	for _, n := range names {
		fs.StringVar(p, n, value, usage)
	}
}

func boolFlag(fs *flag.FlagSet, p *bool, usage string, names ...string) {
	for _, n := range names {
		fs.BoolVar(p, n, false, usage)
	}
}

func intFlag(fs *flag.FlagSet, p *int, value int, usage string, names ...string) {
	*p = value
	for _, n := range names {
		fs.IntVar(p, n, value, usage)
	}
}

// parse parses flags that may come before, between or after positional arguments.
func parse(fs *flag.FlagSet, args []string) ([]string, error) {
	var positional []string
	for {
		if err := fs.Parse(args); err != nil {
			if errors.Is(err, flag.ErrHelp) {
				return nil, err
			}
			return nil, &usageError{err.Error()}
		}
		args = fs.Args()
		if len(args) == 0 {
			return positional, nil
		}
		positional = append(positional, args[0])
		args = args[1:]
	}
}

func set(fs *flag.FlagSet, names ...string) bool {
	found := false
	fs.Visit(func(f *flag.Flag) {
		if slices.Contains(names, f.Name) {
			found = true
		}
	})
	return found
}

func zeroOrOne(name string, v int) error {
	if v != 0 && v != 1 {
		return &usageError{fmt.Sprintf("%s must be 0 or 1", name)}
	}
	return nil
}

// -- commands -------------------------------------------------------------------

func cmdVersion(context.Context, []string, *autotok.AccountStore) error {
	fmt.Fprintf(stdout, "autotok %s (Go)\n", autotok.Version)
	return nil
}

const loginUsage = `Usage: autotok login -n NAME [options]

Log in to TikTok in a browser window and save the session.

  -n, --name NAME        name to save this account under (required)
  -p, --proxy PROXY      proxy for this account (used for login and every upload)
  --force                log in again even if a session is saved
  --sessionid ID         save this sessionid cookie instead of opening a browser
  --datacenter DC        tt-target-idc cookie value to save with --sessionid
  --timeout SECONDS      how long to wait for the login (default 600)
`

func cmdLogin(ctx context.Context, args []string, store *autotok.AccountStore) error {
	fs := newFlags("login", loginUsage)
	var name, proxy, sessionID, datacenter string
	var force bool
	var timeout int
	stringFlag(fs, &name, "", "", "n", "name")
	stringFlag(fs, &proxy, "", "", "p", "proxy")
	boolFlag(fs, &force, "", "force")
	stringFlag(fs, &sessionID, "", "", "sessionid")
	stringFlag(fs, &datacenter, "", "", "datacenter")
	intFlag(fs, &timeout, 600, "", "timeout")
	if _, err := parse(fs, args); err != nil {
		return err
	}
	if name == "" {
		return &usageError{"login needs -n/--name"}
	}
	if err := autotok.ValidateAccountName(name); err != nil {
		return err
	}

	var existing *autotok.Account
	if store.Exists(name) {
		var err error
		if existing, err = store.Load(name); err != nil {
			if !force && sessionID == "" {
				return err
			}
			// Replacing the session anyway: start from scratch.
			slog.Warn(fmt.Sprintf("ignoring the unreadable saved account: %s", err))
			existing = nil
		}
	}
	if existing != nil && !force && sessionID == "" {
		fmt.Fprintf(stdout, "A session for '%s' is already saved. Use --force to log in again.\n", name)
		return nil
	}
	// Logging in again keeps the account's saved proxy unless -p is given.
	if proxy == "" && existing != nil {
		proxy = existing.Proxy
	}
	if sessionID != "" {
		opts := autotok.SessionAccountOptions{Datacenter: datacenter, Proxy: proxy}
		if existing != nil {
			opts.UserAgent = existing.UserAgent
		}
		if _, err := autotok.ImportSession(name, sessionID, opts, store); err != nil {
			return err
		}
		fmt.Fprintf(stdout, "Saved session for '%s'.\n", name)
		if datacenter == "" {
			fmt.Fprintln(stdout, "Tip: also pass --datacenter <tt-target-idc cookie value> to avoid upload errors.")
		}
		return nil
	}

	provider, err := autotok.GetProvider("")
	if err != nil {
		return err
	}
	if _, cloud := provider.(autotok.CloudProvider); cloud {
		fmt.Fprintf(stdout, "Starting a %s cloud browser...\n", provider.Label())
	} else {
		fmt.Fprintln(stdout, "A browser window will open. Log in to TikTok there; it closes by itself when done.")
	}
	if proxy != "" {
		p, err := autotok.ParseProxy(proxy)
		if err != nil {
			return err
		}
		fmt.Fprintf(stdout, "Using proxy %s\n", p.Masked())
	}
	wait := time.Duration(timeout) * time.Second
	if timeout <= 0 {
		wait = -1
	}
	if _, err := autotok.Login(ctx, name, &autotok.LoginOptions{
		Proxy: proxy, Timeout: wait, Store: store, OnLiveURL: showLiveURL,
	}); err != nil {
		return err
	}
	fmt.Fprintf(stdout, "Account '%s' saved.\n", name)
	return nil
}

func showLiveURL(url string) {
	fmt.Fprintln(stdout, "\nOpen this link in your browser and log in to TikTok there. The session is saved as soon as you're in:")
	fmt.Fprintf(stdout, "  %s\n\n", url)
	openInBrowser(url)
}

// openInBrowser tries to open url in the desktop browser (there may be none: servers, containers).
func openInBrowser(url string) {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	case "darwin":
		cmd = exec.Command("open", url)
	default:
		cmd = exec.Command("xdg-open", url)
	}
	if cmd.Start() == nil {
		go cmd.Wait()
	}
}

const uploadUsage = `Usage: autotok upload -u ACCOUNT (-v VIDEO | -yt URL) (-t CAPTION | --title-file FILE) [options]

Upload a video.

  -u, --user ACCOUNT     saved account name (required)
  -v, --video VIDEO      video file (path, or a name inside your videos folder)
  -yt, --youtube URL     YouTube URL to download (with yt-dlp) and upload
  -t, --title CAPTION    caption, up to 2200 characters
  --title-file FILE      read the caption from a UTF-8 text file, or from stdin if FILE is -
  -sc, --schedule SEC    publish this many seconds from now (900 to 2592000, TikTok-side
                         scheduling; some accounts only allow up to 864000)
  -vi, --visibility N    0 = public (default), 1 = private
  -ct, --comment N       allow comments (default 1)
  -d, --duet N           allow duets (default 0)
  -st, --stitch N        allow stitches (default 0)
  -ai, --ailabel N       label as AI-generated (default 0)
  -p, --proxy PROXY      proxy for this upload (default: the account's saved proxy)
  --no-proxy             ignore the account's saved proxy
`

func cmdUpload(ctx context.Context, args []string, store *autotok.AccountStore) error {
	fs := newFlags("upload", uploadUsage)
	var user, video, youtube, title, titleFile, proxy string
	var schedule, visibility, comment, duet, stitch, ailabel, brandOrganic, brandContent int
	var noProxy bool
	stringFlag(fs, &user, "", "", "u", "user", "users")
	stringFlag(fs, &video, "", "", "v", "video")
	stringFlag(fs, &youtube, "", "", "yt", "youtube")
	stringFlag(fs, &title, "", "", "t", "title")
	stringFlag(fs, &titleFile, "", "", "title-file")
	intFlag(fs, &schedule, 0, "", "sc", "schedule")
	intFlag(fs, &visibility, 0, "", "vi", "visibility")
	intFlag(fs, &comment, 1, "", "ct", "comment")
	intFlag(fs, &duet, 0, "", "d", "duet")
	intFlag(fs, &stitch, 0, "", "st", "stitch")
	intFlag(fs, &ailabel, 0, "", "ai", "ailabel")
	stringFlag(fs, &proxy, "", "", "p", "proxy")
	boolFlag(fs, &noProxy, "", "no-proxy")
	// Accepted for compatibility with 1.x scripts; they were never sent to TikTok.
	intFlag(fs, &brandOrganic, 0, "", "bo", "brandorganic")
	intFlag(fs, &brandContent, 0, "", "bc", "brandcontent")
	if _, err := parse(fs, args); err != nil {
		return err
	}
	switch {
	case user == "":
		return &usageError{"upload needs -u/--user"}
	case title == "" && titleFile == "":
		return &usageError{"upload needs -t/--title or --title-file"}
	case title != "" && titleFile != "":
		return &usageError{"use either -t/--title or --title-file, not both"}
	case (video == "") == (youtube == ""):
		return &usageError{"upload needs exactly one of -v/--video or -yt/--youtube"}
	case proxy != "" && noProxy:
		return &usageError{"use either -p/--proxy or --no-proxy, not both"}
	}
	for _, f := range []struct {
		name string
		v    int
	}{{"--visibility", visibility}, {"--comment", comment}, {"--duet", duet}, {"--stitch", stitch}, {"--ailabel", ailabel}} {
		if err := zeroOrOne(f.name, f.v); err != nil {
			return err
		}
	}
	if brandOrganic != 0 || brandContent != 0 {
		slog.Warn("--brandorganic/--brandcontent are not supported and are ignored")
	}
	if titleFile != "" {
		var err error
		if title, err = readCaption(titleFile); err != nil {
			return err
		}
	}

	client, err := autotok.NewClient(user, &autotok.ClientOptions{Proxy: proxy, NoProxy: noProxy, Store: store})
	if err != nil {
		return err
	}
	if youtube != "" {
		if video, err = downloadYouTube(ctx, youtube); err != nil {
			return err
		}
		if jsonOutput {
			fmt.Fprintf(stderr, "Downloaded %s\n", video)
		} else {
			fmt.Fprintf(stdout, "Downloaded %s\n", video)
		}
	}
	opts := &autotok.UploadOptions{
		Visibility:      autotok.Visibility(visibility),
		DisableComments: comment == 0,
		AllowDuet:       duet == 1,
		AllowStitch:     stitch == 1,
		AILabel:         ailabel == 1,
	}
	if schedule != 0 {
		opts.Schedule = time.Now().Add(time.Duration(schedule) * time.Second)
	}
	result, err := client.Upload(ctx, video, title, opts)
	if err != nil {
		return err
	}
	if jsonOutput {
		var scheduled any
		if !result.ScheduledFor.IsZero() {
			scheduled = result.ScheduledFor.UTC().Format(time.RFC3339)
		}
		printJSON(map[string]any{"video_id": result.VideoID, "creation_id": result.CreationID, "scheduled_for": scheduled})
		return nil
	}
	when := ""
	if !result.ScheduledFor.IsZero() {
		when = fmt.Sprintf(" (scheduled for %s)", result.ScheduledFor.Local().Format("2006-01-02 15:04 MST"))
	}
	fmt.Fprintf(stdout, "Published%s. Video id: %s\n", when, result.VideoID)
	return nil
}

// readCaption returns the caption from --title-file: UTF-8 text from a file, or stdin for "-".
// Reading bytes (not a command-line argument in the system's encoding) keeps emoji intact whatever
// the locale, which is why the PHP, Java and C# clients send captions this way.
func readCaption(path string) (string, error) {
	var data []byte
	var err error
	if path == "-" {
		data, err = io.ReadAll(stdin)
	} else {
		data, err = os.ReadFile(path)
	}
	if err != nil {
		return "", &usageError{"cannot read the caption: " + err.Error()}
	}
	data = bytes.TrimPrefix(data, []byte("\ufeff"))
	if !utf8.Valid(data) {
		return "", &usageError{"the caption is not UTF-8 text"}
	}
	return strings.TrimRight(string(data), "\r\n"), nil
}

var youtubeRE = regexp.MustCompile(`(?i)^https?://(?:www\.|m\.)?(?:youtube\.com/(?:watch\?v=|shorts/|embed/)|youtu\.be/)[\w\-]+`)

// downloadYouTube downloads url into the videos folder with yt-dlp, like the Python CLI (not
// through the account's proxy: it isn't TikTok traffic), and returns the file's path.
func downloadYouTube(ctx context.Context, url string) (string, error) {
	if !youtubeRE.MatchString(strings.TrimSpace(url)) {
		return "", &usageError{"not a YouTube URL: " + url}
	}
	ytdlp, err := exec.LookPath("yt-dlp")
	if err != nil {
		return "", errors.New("YouTube downloads need yt-dlp (https://github.com/yt-dlp/yt-dlp) on your PATH, and ffmpeg")
	}
	dest := autotok.VideosDir()
	if err := os.MkdirAll(dest, 0o755); err != nil {
		return "", err
	}
	args := []string{
		"-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
		"--merge-output-format", "mp4", "--no-playlist", "--quiet", "--no-warnings",
		"-o", filepath.Join(dest, "youtube-%(id)s.%(ext)s"),
		"--print", "after_move:filepath",
	}
	slog.Info("Downloading " + url)
	cmd := exec.CommandContext(ctx, ytdlp, append(args, url)...)
	cmd.Stderr = stderr
	out, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("YouTube download failed: %w", err)
	}
	lines := strings.Split(strings.TrimSpace(string(out)), "\n")
	path := strings.TrimSpace(lines[len(lines)-1])
	if info, err := os.Stat(path); err != nil || !info.Mode().IsRegular() {
		return "", fmt.Errorf("YouTube download finished but %q is missing", path)
	}
	return path, nil
}

const showUsage = `Usage: autotok show [-u] [-v]

  -u, --users     list saved accounts
  -v, --videos    list videos in your videos folder
`

func cmdShow(_ context.Context, args []string, store *autotok.AccountStore) error {
	fs := newFlags("show", showUsage)
	var users, videos bool
	boolFlag(fs, &users, "", "u", "users")
	boolFlag(fs, &videos, "", "v", "videos")
	if _, err := parse(fs, args); err != nil {
		return err
	}
	if !users && !videos {
		fmt.Fprintln(stdout, "Use -u to list accounts or -v to list videos.")
		return &silentError{}
	}
	if users {
		names, err := store.List()
		if err != nil {
			return err
		}
		if len(names) == 0 {
			fmt.Fprintln(stdout, "No saved accounts. Run: autotok login -n <name>")
		} else {
			fmt.Fprintln(stdout, "Saved accounts:")
		}
		for _, n := range names {
			fmt.Fprintf(stdout, "  %s\n", n)
		}
	}
	if videos {
		dir := autotok.VideosDir()
		entries, _ := os.ReadDir(dir)
		var files []string
		for _, e := range entries {
			if e.Type().IsRegular() {
				files = append(files, e.Name())
			}
		}
		if len(files) == 0 {
			fmt.Fprintf(stdout, "No videos in %s\n", dir)
		} else {
			fmt.Fprintln(stdout, "Videos:")
		}
		for _, f := range files {
			fmt.Fprintf(stdout, "  %s  (%s)\n", f, dir)
		}
	}
	return nil
}

// silentError makes the command exit with status 1 after it printed why.
type silentError struct{}

func (*silentError) Error() string   { return "" }
func (*silentError) Retryable() bool { return false }

const accountsUsage = `Usage: autotok accounts <action>

  list            list accounts with their proxy
  remove NAME     delete a saved session
  check NAME      check that TikTok still accepts the saved session
`

func cmdAccounts(ctx context.Context, args []string, store *autotok.AccountStore) error {
	fs := newFlags("accounts", accountsUsage)
	pos, err := parse(fs, args)
	if err != nil {
		return err
	}
	if len(pos) == 0 {
		return &usageError{"accounts needs an action: list, remove or check"}
	}
	switch action := pos[0]; {
	case action == "list" && len(pos) == 1 && jsonOutput:
		names, err := store.List()
		if err != nil {
			return err
		}
		accounts := []map[string]any{}
		for _, n := range names {
			acct, err := store.Load(n)
			if err != nil {
				accounts = append(accounts, map[string]any{"name": n, "session": false, "proxy": nil, "error": err.Error()})
				continue
			}
			var proxy any
			if p, err := acct.ParsedProxy(); err == nil && p != nil {
				proxy = p.Masked()
			}
			accounts = append(accounts, map[string]any{"name": n, "session": acct.HasSession(), "proxy": proxy})
		}
		printJSON(map[string]any{"accounts": accounts})
		return nil
	case action == "list" && len(pos) == 1:
		names, err := store.List()
		if err != nil {
			return err
		}
		if len(names) == 0 {
			fmt.Fprintln(stdout, "No saved accounts. Run: autotok login -n <name>")
		}
		for _, n := range names {
			acct, err := store.Load(n)
			if err != nil {
				fmt.Fprintf(stdout, "  %-24s unreadable: %s\n", n, err)
				continue
			}
			session, proxy := "NO", "-"
			if acct.HasSession() {
				session = "yes"
			}
			if p, err := acct.ParsedProxy(); err == nil && p != nil {
				proxy = p.Masked()
			}
			fmt.Fprintf(stdout, "  %-24s session: %-4s proxy: %s\n", n, session, proxy)
		}
		return nil
	case action == "remove" && len(pos) == 2:
		removed, err := store.Delete(pos[1])
		if err != nil {
			return err
		}
		if jsonOutput {
			printJSON(map[string]any{"name": pos[1], "removed": removed})
			if !removed {
				return &silentError{}
			}
			return nil
		}
		if !removed {
			fmt.Fprintf(stderr, "No saved account '%s'.\n", pos[1])
			return &silentError{}
		}
		fmt.Fprintf(stdout, "Removed '%s'.\n", pos[1])
		return nil
	case action == "check" && len(pos) == 2:
		client, err := autotok.NewClient(pos[1], &autotok.ClientOptions{Store: store})
		if err != nil {
			return err
		}
		ok, err := client.CheckSession(ctx)
		if err != nil {
			return err
		}
		if jsonOutput {
			printJSON(map[string]any{"name": pos[1], "session_ok": ok})
			if !ok {
				return &silentError{}
			}
			return nil
		}
		if !ok {
			fmt.Fprintf(stdout, "'%s': session rejected, log in again with --force\n", pos[1])
			return &silentError{}
		}
		fmt.Fprintf(stdout, "'%s': session OK\n", pos[1])
		return nil
	}
	fs.Usage()
	return &usageError{"unknown accounts action: " + strings.Join(pos, " ")}
}

const proxyUsage = `Usage: autotok proxy <action>

  set NAME PROXY        save a proxy for an account
  clear NAME            remove an account's proxy
  test [PROXY] [-u NAME]  show the IP TikTok will see
`

func cmdProxy(ctx context.Context, args []string, store *autotok.AccountStore) error {
	fs := newFlags("proxy", proxyUsage)
	var user string
	stringFlag(fs, &user, "", "", "u", "user")
	pos, err := parse(fs, args)
	if err != nil {
		return err
	}
	if len(pos) == 0 {
		return &usageError{"proxy needs an action: set, clear or test"}
	}
	switch action := pos[0]; {
	case action == "set" && len(pos) == 3:
		acct, err := store.SetProxy(pos[1], pos[2])
		if err != nil {
			return err
		}
		p, _ := acct.ParsedProxy()
		masked := "-"
		if p != nil {
			masked = p.Masked()
		}
		fmt.Fprintf(stdout, "Proxy for '%s' set to %s\n", pos[1], masked)
		return nil
	case action == "clear" && len(pos) == 2:
		if _, err := store.SetProxy(pos[1], ""); err != nil {
			return err
		}
		fmt.Fprintf(stdout, "Proxy for '%s' cleared.\n", pos[1])
		return nil
	case action == "test" && len(pos) <= 2:
		var p *autotok.Proxy
		if user != "" {
			acct, err := store.Load(user)
			if err != nil {
				return err
			}
			if p, err = acct.ParsedProxy(); err != nil {
				return err
			}
			if p == nil {
				fmt.Fprintf(stdout, "'%s' has no proxy saved; testing your direct connection.\n", user)
			}
		} else if len(pos) == 2 {
			if p, err = autotok.ParseProxy(pos[1]); err != nil {
				return err
			}
		}
		label, raw := "direct connection", ""
		if p != nil {
			label, raw = p.Masked(), p.URL()
		}
		ip, err := autotok.CheckProxy(ctx, raw)
		if err != nil {
			return err
		}
		fmt.Fprintf(stdout, "%s -> public IP %s\n", label, ip)
		return nil
	}
	fs.Usage()
	return &usageError{"unknown proxy action: " + strings.Join(pos, " ")}
}

const installUsage = `Usage: autotok install-browser

Download Chrome for Testing (about 200 MB, once) into $AUTOTOK_HOME/browsers. Not needed if
Google Chrome, Chromium or Microsoft Edge is installed.
`

func cmdInstallBrowser(ctx context.Context, args []string, _ *autotok.AccountStore) error {
	fs := newFlags("install-browser", installUsage)
	var withDeps bool
	boolFlag(fs, &withDeps, "", "with-deps")
	if _, err := parse(fs, args); err != nil {
		return err
	}
	if withDeps {
		slog.Warn("--with-deps is not supported by the Go build; install your distribution's chromium package for its libraries")
	}
	provider, err := autotok.GetProvider("")
	if err != nil {
		return err
	}
	if _, cloud := provider.(autotok.CloudProvider); cloud {
		fmt.Fprintf(stdout, "Not needed: browsers run on %s (AUTOTOK_BROWSER). Use --browser local to install Chrome for local mode.\n",
			provider.Label())
		return nil
	}
	last := -1
	path, err := autotok.InstallBrowser(ctx, autotok.InstallOptions{Progress: func(done, total int64) {
		if total <= 0 {
			return
		}
		if pct := int(done * 100 / total); pct/10 != last/10 {
			last = pct
			fmt.Fprintf(stderr, "  %3d%% of %d MB\n", pct, total>>20)
		}
	}})
	if err != nil {
		return err
	}
	fmt.Fprintf(stdout, "Chrome is ready: %s\n", path)
	return nil
}

const browserUsage = `Usage: autotok browser check [-u NAME]

Start the login/signing browser and show the IP it browses from.

  -u, --user NAME    use this account's proxy
`

func cmdBrowser(ctx context.Context, args []string, store *autotok.AccountStore) error {
	fs := newFlags("browser", browserUsage)
	var user string
	stringFlag(fs, &user, "", "", "u", "user")
	pos, err := parse(fs, args)
	if err != nil {
		return err
	}
	if len(pos) != 1 || pos[0] != "check" {
		fs.Usage()
		return &usageError{"browser needs the action: check"}
	}
	provider, err := autotok.GetProvider("")
	if err != nil {
		return err
	}
	var p *autotok.Proxy
	if user != "" {
		acct, err := store.Load(user)
		if err != nil {
			return err
		}
		if p, err = acct.ParsedProxy(); err != nil {
			return err
		}
	}
	via := ""
	if p != nil {
		via = " via proxy " + p.Masked()
	}
	fmt.Fprintf(stdout, "Provider: %s%s\n", provider.Label(), via)
	if _, cloud := provider.(autotok.CloudProvider); !cloud {
		path, err := autotok.FindBrowser()
		if err != nil {
			return err
		}
		fmt.Fprintf(stdout, "Browser: %s\n", path)
	}
	handle, err := provider.Open(ctx, autotok.OpenOptions{Proxy: p, Timeout: 2 * time.Minute})
	if err != nil {
		return err
	}
	defer handle.Close()
	if handle.Session != nil {
		fmt.Fprintf(stdout, "Session: %s\n", handle.Session.ID())
	}
	page := handle.Page()
	ua, err := chromedp.Run(page, chromedp.Evaluate[string](`navigator.userAgent`))
	if err != nil {
		return err
	}
	fmt.Fprintf(stdout, "User agent: %s\n", ua)
	loadCtx, cancel := context.WithTimeout(page, 30*time.Second)
	defer cancel()
	stopOnCancel := context.AfterFunc(ctx, cancel)
	defer stopOnCancel()
	err = autotok.Navigate(loadCtx, autotok.IPEchoURL)
	var text string
	if err == nil {
		text, err = chromedp.Run(loadCtx, chromedp.Evaluate[string](`document.body.innerText`))
	}
	if err != nil {
		fmt.Fprintf(stderr, "Could not load a page (%s); check the proxy.\n", err)
		return &silentError{}
	}
	fmt.Fprintf(stdout, "Browsing from IP: %s\n", ipFrom(text))
	fmt.Fprintln(stdout, "Browser OK.")
	return nil
}

var ipFieldRE = regexp.MustCompile(`"ip"\s*:\s*"([^"]+)"`)

func ipFrom(text string) string {
	if m := ipFieldRE.FindStringSubmatch(text); m != nil {
		return m[1]
	}
	return strings.TrimSpace(text)
}
