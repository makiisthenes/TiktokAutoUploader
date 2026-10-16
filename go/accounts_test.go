package autotok

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
	"testing"
)

// What the Python package writes for `autotok login` (AccountStore.save).
const pythonAccountFile = `{
  "name": "alice",
  "cookies": [
    {"name": "sessionid", "value": "sess-123", "domain": ".tiktok.com", "path": "/", "expires": 1799999999.5,
     "httpOnly": true, "secure": true, "sameSite": "None"},
    {"name": "tt-target-idc", "value": "useast5", "domain": ".tiktok.com", "path": "/"},
    {"name": "msToken", "value": "x", "domain": "www.tiktok.com", "path": "/"}
  ],
  "user_agent": "UA/1.0",
  "proxy": "http://bob:secret@proxy.example:8000",
  "created_at": "2026-10-01T10:00:00+00:00",
  "updated_at": "2026-10-02T10:00:00+00:00"
}`

func TestReadsAccountsSavedByThePythonPackage(t *testing.T) {
	home, _ := isolatedHome(t)
	os.MkdirAll(filepath.Join(home, "accounts"), 0o700)
	os.WriteFile(filepath.Join(home, "accounts", "alice.json"), []byte(pythonAccountFile), 0o600)
	store := NewAccountStore("")
	if names, _ := store.List(); fmt.Sprint(names) != "[alice]" {
		t.Errorf("list: %v", names)
	}
	a, err := store.Load("alice")
	if err != nil {
		t.Fatal(err)
	}
	p, _ := a.ParsedProxy()
	if a.SessionID() != "sess-123" || a.Datacenter() != "useast5" || a.UserAgent != "UA/1.0" || p.Password() != "secret" ||
		isoTime(a.CreatedAt) != "2026-10-01T10:00:00+00:00" {
		t.Errorf("%+v", a)
	}

	// Saving it again keeps every cookie field exactly as it was.
	if _, err := store.Save(a); err != nil {
		t.Fatal(err)
	}
	var saved struct {
		Cookies []map[string]any `json:"cookies"`
	}
	data, _ := os.ReadFile(filepath.Join(home, "accounts", "alice.json"))
	json.Unmarshal(data, &saved)
	if got := mustJSON(saved.Cookies[0]); got != `{"domain":".tiktok.com","expires":1799999999.5,"httpOnly":true,"name":"sessionid","path":"/","sameSite":"None","secure":true,"value":"sess-123"}` {
		t.Errorf("round trip: %s", got)
	}
}

func TestSavesInThePythonPackagesFormat(t *testing.T) {
	isolatedHome(t)
	store := NewAccountStore("")
	a, err := NewAccountFromSessionID("bob", " sess ", SessionAccountOptions{Datacenter: "useast5", Proxy: "h.example:1:u:p"})
	if err != nil {
		t.Fatal(err)
	}
	path, err := store.Save(a)
	if err != nil {
		t.Fatal(err)
	}
	data, _ := os.ReadFile(path)
	text := string(data)
	keys := regexp.MustCompile(`(?m)^  "([a-z_]+)":`).FindAllStringSubmatch(text, -1)
	var order []string
	for _, k := range keys {
		order = append(order, k[1])
	}
	if strings.Join(order, ",") != "name,cookies,user_agent,proxy,created_at,updated_at" {
		t.Errorf("key order: %v\n%s", order, text)
	}
	var f map[string]any
	json.Unmarshal(data, &f)
	if f["proxy"] != "http://u:p@h.example:1" || f["user_agent"] != nil {
		t.Errorf("%v", f)
	}
	if got := mustJSON(f["cookies"].([]any)[0]); got != `{"domain":".tiktok.com","name":"sessionid","path":"/","value":"sess"}` {
		t.Errorf("cookie: %s", got)
	}
	if !regexp.MustCompile(`^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\+00:00$`).MatchString(f["updated_at"].(string)) {
		t.Errorf("updated_at: %v", f["updated_at"])
	}
	if runtime.GOOS != "windows" {
		if info, _ := os.Stat(path); info.Mode().Perm() != 0o600 {
			t.Errorf("mode %v", info.Mode())
		}
	}
	if b, _ := store.Load("bob"); b.SessionID() != "sess" {
		t.Error(b)
	}
}

func TestMissingUnreadableAndInvalidAccounts(t *testing.T) {
	home, _ := isolatedHome(t)
	store := NewAccountStore("")
	var nf *AccountNotFoundError
	if _, err := store.Load("nobody"); !errors.As(err, &nf) {
		t.Error(err)
	}
	os.MkdirAll(filepath.Join(home, "accounts"), 0o700)
	os.WriteFile(filepath.Join(home, "accounts", "broken.json"), []byte("{not json"), 0o600)
	var ve *ValidationError
	if _, err := store.Load("broken"); !errors.As(err, &ve) {
		t.Error(err)
	}
	for _, bad := range []string{"..", ".", "a/b", `a\b`, "", strings.Repeat("x", 129)} {
		if _, err := store.Path(bad); !errors.As(err, &ve) {
			t.Errorf("%q: %v", bad, err)
		}
	}
}

func TestLegacySessionsPointToTheMigration(t *testing.T) {
	isolatedHome(t)
	t.Chdir(t.TempDir())
	os.MkdirAll("CookiesDir", 0o700)
	os.WriteFile(filepath.Join("CookiesDir", "tiktok_session-old.cookie"), []byte("pickle"), 0o600)
	_, err := NewAccountStore("").Load("old")
	var nf *AccountNotFoundError
	if !errors.As(err, &nf) || !strings.Contains(err.Error(), "1.x session") || !strings.Contains(err.Error(), "migrate") {
		t.Fatal(err)
	}
}

func TestSetProxyListDelete(t *testing.T) {
	isolatedHome(t)
	store := NewAccountStore("")
	if _, err := ImportSession("carol", "s1", SessionAccountOptions{}, store); err != nil {
		t.Fatal(err)
	}
	if a, _ := store.SetProxy("carol", "socks5://h.example:1080"); a.Proxy != "socks5://h.example:1080" {
		t.Error(a.Proxy)
	}
	if a, _ := store.SetProxy("carol", ""); a.Proxy != "" {
		t.Error(a.Proxy)
	}
	if names, _ := store.List(); fmt.Sprint(names) != "[carol]" {
		t.Error(names)
	}
	if ok, _ := store.Delete("carol"); !ok {
		t.Error("not deleted")
	}
	if ok, _ := store.Delete("carol"); ok {
		t.Error("deleted twice")
	}
	if names, _ := store.List(); len(names) != 0 {
		t.Error(names)
	}
}

func TestPrintingAnAccountHidesTheSessionAndProxyPassword(t *testing.T) {
	a, _ := NewAccountFromSessionID("dave", "topsession", SessionAccountOptions{Proxy: "http://u:topsecret@h.example:1"})
	for _, shown := range []string{fmt.Sprint(a), fmt.Sprintf("%+v", a), fmt.Sprintf("%#v", a)} {
		if strings.Contains(shown, "topsession") || strings.Contains(shown, "topsecret") {
			t.Errorf("leaked: %s", shown)
		}
	}
}
