package main

import (
	"bytes"
	"context"
	"os"
	"path/filepath"
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
