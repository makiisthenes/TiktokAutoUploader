package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"

	autotok "github.com/makiisthenes/TiktokAutoUploader/go"
)

// cli runs the command line in a fresh AUTOTOK_HOME and returns the exit status and output.
func cli(t *testing.T, args ...string) (int, string, string) {
	t.Helper()
	var out, errOut bytes.Buffer
	stdout, stderr = &out, &errOut
	t.Cleanup(func() { stdout, stderr = os.Stdout, os.Stderr })
	code := run(context.Background(), args)
	return code, out.String(), errOut.String()
}

func home(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	t.Setenv("AUTOTOK_HOME", dir)
	t.Setenv("AUTOTOK_VIDEOS_DIR", filepath.Join(dir, "videos"))
	t.Setenv("AUTOTOK_BROWSER", "")
	return dir
}

func TestVersionAndUsage(t *testing.T) {
	home(t)
	if code, out, _ := cli(t, "--version"); code != 0 || out != "autotok "+autotok.Version+" (Go)\n" {
		t.Errorf("%d %q", code, out)
	}
	if code, _, errOut := cli(t); code != 1 || !strings.Contains(errOut, "Commands:") {
		t.Errorf("%d %q", code, errOut)
	}
	if code, _, errOut := cli(t, "nope"); code != 2 || !strings.Contains(errOut, "unknown command 'nope'") {
		t.Errorf("%d %q", code, errOut)
	}
	if code, _, errOut := cli(t, "--browser", "firefox", "show", "-u"); code != 2 || !strings.Contains(errOut, "--browser must be one of") {
		t.Errorf("%d %q", code, errOut)
	}
}

func TestLoginWithASessionIDAndManageTheAccount(t *testing.T) {
	dir := home(t)
	code, out, _ := cli(t, "login", "-n", "alice", "--sessionid", "sess1", "-p", "h.example:8000:user:secret")
	if code != 0 || !strings.Contains(out, "Saved session for 'alice'.") || !strings.Contains(out, "--datacenter") {
		t.Fatalf("%d %q", code, out)
	}
	if _, err := os.Stat(filepath.Join(dir, "accounts", "alice.json")); err != nil {
		t.Fatal(err)
	}
	// Already saved: nothing to do without --force.
	if code, out, _ := cli(t, "login", "-n", "alice"); code != 0 || !strings.Contains(out, "already saved") {
		t.Errorf("%d %q", code, out)
	}
	if code, out, _ := cli(t, "accounts", "list"); code != 0 ||
		!strings.Contains(out, "alice") || !strings.Contains(out, "session: yes") || !strings.Contains(out, "http://user:****@h.example:8000") {
		t.Errorf("%d %q", code, out)
	}
	if code, out, _ := cli(t, "show", "-u"); code != 0 || out != "Saved accounts:\n  alice\n" {
		t.Errorf("%d %q", code, out)
	}
	if code, out, _ := cli(t, "proxy", "set", "alice", "socks5://u:pw@s.example:1080"); code != 0 || out != "Proxy for 'alice' set to socks5://u:****@s.example:1080\n" {
		t.Errorf("%d %q", code, out)
	}
	if code, out, _ := cli(t, "proxy", "clear", "alice"); code != 0 || out != "Proxy for 'alice' cleared.\n" {
		t.Errorf("%d %q", code, out)
	}
	if code, out, _ := cli(t, "accounts", "remove", "alice"); code != 0 || out != "Removed 'alice'.\n" {
		t.Errorf("%d %q", code, out)
	}
	if code, _, errOut := cli(t, "accounts", "remove", "alice"); code != 1 || errOut != "No saved account 'alice'.\n" {
		t.Errorf("%d %q", code, errOut)
	}
}

func TestMistakesExitWithStatus2(t *testing.T) {
	home(t)
	cli(t, "login", "-n", "bob", "--sessionid", "s")
	cases := [][]string{
		{"login"},
		{"login", "-n", "bad/name", "--sessionid", "s"},
		{"upload", "-u", "bob", "-t", "x"},
		{"upload", "-u", "bob", "-v", "a.mp4", "-yt", "https://youtu.be/x", "-t", "x"},
		{"upload", "-u", "bob", "-v", "a.mp4", "-t", "x", "-vi", "2"},
		{"upload", "-u", "bob", "-v", "a.mp4", "-t", "x", "-p", "h:1", "--no-proxy"},
		{"upload", "-u", "bob", "-v", "missing.mp4", "-t", "x"},
		{"proxy", "set", "bob", "ftp://h:1"},
		{"accounts", "frobnicate"},
		{"upload", "--bogus"},
	}
	for _, args := range cases {
		if code, _, errOut := cli(t, args...); code != 2 || !strings.Contains(errOut, "error: ") && !strings.Contains(errOut, "flag provided but not defined") {
			t.Errorf("%v: %d %q", args, code, errOut)
		}
	}
}

func TestUploadValidatesTheScheduleBeforeSendingAnything(t *testing.T) {
	dir := home(t)
	cli(t, "login", "-n", "bob", "--sessionid", "s", "--datacenter", "useast5")
	video := filepath.Join(dir, "clip.mp4")
	os.WriteFile(video, []byte("video"), 0o644)
	code, _, errOut := cli(t, "upload", "-u", "bob", "-v", video, "-t", "x", "-sc", "60")
	if code != 2 || !strings.Contains(errOut, "15 minutes and 30 days") {
		t.Errorf("%d %q", code, errOut)
	}
	// Flags may come in any order, after positional arguments too.
	if code, _, errOut := cli(t, "proxy", "test", "-u", "nobody"); code != 1 || !strings.Contains(errOut, "no saved session for 'nobody'") {
		t.Errorf("%d %q", code, errOut)
	}
}

func TestShowWithoutAFlag(t *testing.T) {
	home(t)
	if code, out, errOut := cli(t, "show"); code != 1 || out != "Use -u to list accounts or -v to list videos.\n" || errOut != "" {
		t.Errorf("%d %q %q", code, out, errOut)
	}
}

// jsonOut decodes the one JSON document --json prints on stdout.
func jsonOut(t *testing.T, out string) map[string]any {
	t.Helper()
	var v map[string]any
	if strings.Count(out, "\n") != 1 || json.Unmarshal([]byte(out), &v) != nil {
		t.Fatalf("not one line of JSON: %q", out)
	}
	return v
}

func TestJSONOutput(t *testing.T) {
	dir := home(t)
	cli(t, "login", "-n", "alice", "--sessionid", "s", "-p", "h.example:8000:user:secret")
	os.WriteFile(filepath.Join(dir, "accounts", "broken.json"), []byte("{not json"), 0o600)

	code, out, _ := cli(t, "--json", "accounts", "list")
	accounts := jsonOut(t, out)["accounts"].([]any)
	if code != 0 || len(accounts) != 2 {
		t.Fatalf("%d %q", code, out)
	}
	alice, broken := accounts[0].(map[string]any), accounts[1].(map[string]any)
	if !reflect.DeepEqual(alice, map[string]any{"name": "alice", "session": true, "proxy": "http://user:****@h.example:8000"}) {
		t.Errorf("%v", alice)
	}
	if broken["name"] != "broken" || broken["session"] != false || broken["error"] == "" {
		t.Errorf("%v", broken)
	}

	video := filepath.Join(dir, "clip.mp4")
	os.WriteFile(video, []byte("video"), 0o644)
	for _, c := range []struct {
		args       []string
		code       int
		errType    string
		msgContain string
	}{
		{[]string{"upload", "-u", "alice", "-v", video, "-t", "x", "-sc", "60"}, 2, "ValidationError", "15 minutes"},
		{[]string{"upload", "-u", "alice", "-t", "x"}, 2, "ValidationError", "exactly one of"},
		{[]string{"upload", "-u", "ghost", "-v", video, "-t", "x"}, 1, "AccountNotFoundError", "autotok login -n ghost"},
		{[]string{"accounts", "check", "ghost"}, 1, "AccountNotFoundError", "ghost"},
		{[]string{"show", "-u"}, 2, "ValidationError", "--json works with the upload and accounts commands"},
	} {
		code, out, _ := cli(t, append([]string{"--json"}, c.args...)...)
		e, _ := jsonOut(t, out)["error"].(map[string]any)
		if code != c.code || e["type"] != c.errType || e["retryable"] != false || !strings.Contains(e["message"].(string), c.msgContain) {
			t.Errorf("%v: %d %q", c.args, code, out)
		}
	}

	if code, out, _ := cli(t, "--json", "accounts", "remove", "alice"); code != 0 || !reflect.DeepEqual(jsonOut(t, out), map[string]any{"name": "alice", "removed": true}) {
		t.Errorf("%d %q", code, out)
	}
	if code, out, errOut := cli(t, "--json", "accounts", "remove", "alice"); code != 1 || errOut != "" || !reflect.DeepEqual(jsonOut(t, out), map[string]any{"name": "alice", "removed": false}) {
		t.Errorf("%d %q %q", code, out, errOut)
	}
}

func TestJSONErrorFields(t *testing.T) {
	var out bytes.Buffer
	stdout = &out
	t.Cleanup(func() { stdout = os.Stdout })
	for _, c := range []struct {
		err  error
		want string
	}{
		{&autotok.PublishError{StatusCode: 7, HasStatusCode: true, StatusMsg: "guidelines"},
			`{"error":{"message":"PublishError","retryable":false,"status_code":7,"status_msg":"guidelines","type":"PublishError"}}`},
		{&autotok.PublishError{StatusMsg: "HTTP 502"},
			`{"error":{"message":"PublishError","retryable":false,"status_code":null,"status_msg":"HTTP 502","type":"PublishError"}}`},
		{fmt.Errorf("upload: %w", &autotok.UploadError{Status: 503}),
			`{"error":{"message":"upload: ","retryable":true,"status":503,"type":"UploadError"}}`},
		{&autotok.PublishUncertainError{}, `{"error":{"message":"PublishUncertainError","retryable":false,"type":"PublishUncertainError"}}`},
		{&autotok.SigningError{}, `{"error":{"message":"SigningError","retryable":true,"type":"SigningError"}}`},
		{context.Canceled, `{"error":{"message":"cancelled","retryable":false,"type":"Cancelled"}}`},
		{errors.New("yt-dlp is missing"), `{"error":{"message":"yt-dlp is missing","retryable":false,"type":"Error"}}`},
	} {
		out.Reset()
		printJSONError(c.err)
		if got := strings.TrimSpace(out.String()); got != c.want {
			t.Errorf("%T:\n got %s\nwant %s", c.err, got, c.want)
		}
	}
}

func TestUploadReadsTheCaptionFromAFileOrStdin(t *testing.T) {
	dir := t.TempDir()
	caption := "-50% off \U0001f389\nsecond line"
	path := filepath.Join(dir, "caption.txt")
	os.WriteFile(path, []byte("\ufeff"+caption+"\r\n"), 0o644)
	if got, err := readCaption(path); err != nil || got != caption {
		t.Errorf("%q %v", got, err)
	}
	stdin = strings.NewReader(caption + "\n")
	t.Cleanup(func() { stdin = os.Stdin })
	if got, err := readCaption("-"); err != nil || got != caption {
		t.Errorf("%q %v", got, err)
	}

	os.WriteFile(path, []byte("caf\xe9"), 0o644)
	var usage *usageError
	if _, err := readCaption(path); !errors.As(err, &usage) || usage.msg != "the caption is not UTF-8 text" {
		t.Errorf("%v", err)
	}
	if _, err := readCaption(filepath.Join(dir, "missing.txt")); !errors.As(err, &usage) || !strings.HasPrefix(usage.msg, "cannot read the caption: ") {
		t.Errorf("%v", err)
	}

	home(t)
	cli(t, "login", "-n", "bob", "--sessionid", "s")
	for _, args := range [][]string{
		{"upload", "-u", "bob", "-v", "a.mp4", "-t", "x", "--title-file", "-"},
		{"upload", "-u", "bob", "-v", "a.mp4"},
	} {
		if code, _, errOut := cli(t, args...); code != 2 || !strings.Contains(errOut, "--title-file") {
			t.Errorf("%v: %d %q", args, code, errOut)
		}
	}
}
