package autotok

import (
	"archive/zip"
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"slices"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/chromedp/chromedp"
)

func TestRedactURLs(t *testing.T) {
	got := redactURLs("connect ECONNREFUSED wss://connect.steel.dev/?sessionId=1&apiKey=sk_live (retrying)")
	if got != "connect ECONNREFUSED wss://connect.steel.dev/?**** (retrying)" {
		t.Error(got)
	}
	if redactURLs("no urls here") != "no urls here" {
		t.Error("changed plain text")
	}
}

func TestURLHelpers(t *testing.T) {
	if addQuery("ws://h/x", "a=1") != "ws://h/x?a=1" || addQuery("ws://h/x?b=2", "a=1") != "ws://h/x?b=2&a=1" {
		t.Error("addQuery")
	}
	cases := map[[2]string]string{
		{"ws://0.0.0.0:3000/s?x=1", "https://steel.example"}:      "wss://steel.example/s?x=1",
		{"http://0.0.0.0:3000/v1/debug", "http://localhost:3000"}: "http://localhost:3000/v1/debug",
		{"wss://real.example/s", "http://localhost:3000"}:         "wss://real.example/s",
	}
	for in, want := range cases {
		if got := reachable(in[0], in[1]); got != want {
			t.Errorf("reachable(%v) = %s, want %s", in, got, want)
		}
	}
	if compareVersions("141.0.7390.54", "141.0.7390.122") >= 0 || compareVersions("142.0.1.0", "141.9.9.9") <= 0 {
		t.Error("compareVersions")
	}
}

func TestProviderRegistry(t *testing.T) {
	var ce *ConfigurationError
	if _, err := GetProvider("nope"); !errors.As(err, &ce) || !strings.Contains(err.Error(), "browserbase, local, steel") {
		t.Error(err)
	}
	t.Setenv("AUTOTOK_BROWSER", "Steel")
	if p, _ := GetProvider(""); p.Label() != "Steel" || !isCloudProvider(p) {
		t.Error(p)
	}
	RegisterProvider("Mine", func() BrowserProvider { return LocalProvider{} })
	defer func() {
		providersMu.Lock()
		delete(providers, "mine")
		providersMu.Unlock()
	}()
	if p, err := GetProvider("mine"); err != nil || isCloudProvider(p) {
		t.Error(p, err)
	}
}

func TestFindBrowser(t *testing.T) {
	isolatedHome(t)
	var bn *BrowserNotInstalledError
	t.Setenv("AUTOTOK_BROWSER_PATH", filepath.Join(t.TempDir(), "missing"))
	if _, err := FindBrowser(); !errors.As(err, &bn) {
		t.Error(err)
	}
	fake := filepath.Join(t.TempDir(), "chrome")
	os.WriteFile(fake, nil, 0o755)
	t.Setenv("AUTOTOK_BROWSER_PATH", fake)
	if got, _ := FindBrowser(); got != fake {
		t.Error(got)
	}
	t.Setenv("AUTOTOK_BROWSER_PATH", "")
	t.Setenv("AUTOTOK_BROWSER_CHANNEL", "firefox")
	var ce *ConfigurationError
	if _, err := FindBrowser(); !errors.As(err, &ce) {
		t.Error(err)
	}
	t.Setenv("AUTOTOK_BROWSER_CHANNEL", "")

	// Playwright's modern builds win over its 2021 ones, despite the smaller numbers.
	pw := t.TempDir()
	t.Setenv("PLAYWRIGHT_BROWSERS_PATH", pw)
	var newest string
	for _, rev := range []string{"854489", "1248", "1187"} {
		path := executableIn(filepath.Join(pw, "chromium-"+rev))[0]
		os.MkdirAll(filepath.Dir(path), 0o755)
		os.WriteFile(path, nil, 0o755)
		if rev == "1248" {
			newest = path
		}
	}
	if got := playwrightChromium(); got != newest {
		t.Errorf("got %s, want %s", got, newest)
	}
}

func TestUnzipRefusesPathsOutsideTheFolder(t *testing.T) {
	dir := t.TempDir()
	write := func(name string, entries map[string]string) string {
		path := filepath.Join(dir, name)
		f, _ := os.Create(path)
		w := zip.NewWriter(f)
		for n, body := range entries {
			e, _ := w.Create(n)
			io.WriteString(e, body)
		}
		w.Close()
		f.Close()
		return path
	}
	good := write("good.zip", map[string]string{"chrome-linux64/chrome": "bin", "chrome-linux64/locales/en.pak": "x"})
	dest := filepath.Join(dir, "out")
	if err := unzip(good, dest); err != nil {
		t.Fatal(err)
	}
	if b, _ := os.ReadFile(filepath.Join(dest, "chrome-linux64", "locales", "en.pak")); string(b) != "x" {
		t.Error("not extracted")
	}
	evil := write("evil.zip", map[string]string{"../escape": "x"})
	if err := unzip(evil, filepath.Join(dir, "out2")); err == nil {
		t.Error("zip slip accepted")
	}
	if _, err := os.Stat(filepath.Join(dir, "escape")); err == nil {
		t.Error("file written outside the folder")
	}
}

func TestUnzipRefusesWritingThroughSymlinks(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("symlinks need extra rights on Windows; Chrome's Windows archive has none")
	}
	dir := t.TempDir()
	type entry struct {
		name, body string
		link       bool
	}
	write := func(name string, entries []entry) string {
		path := filepath.Join(dir, name)
		f, _ := os.Create(path)
		w := zip.NewWriter(f)
		for _, e := range entries {
			h := &zip.FileHeader{Name: e.name}
			if e.link {
				h.SetMode(os.ModeSymlink | 0o777)
			} else {
				h.SetMode(0o644)
			}
			fw, _ := w.CreateHeader(h)
			io.WriteString(fw, e.body)
		}
		w.Close()
		f.Close()
		return path
	}
	// s -> ., s/l -> .. (the parent of the folder, on disk), then a file through both.
	evil := write("chain.zip", []entry{{"s", ".", true}, {"s/l", "..", true}, {"s/l/evil", "x", false}})
	if err := unzip(evil, filepath.Join(dir, "out")); err == nil {
		t.Error("archive writing through its own symlinks was accepted")
	}
	if _, err := os.Stat(filepath.Join(dir, "evil")); err == nil {
		t.Error("file written outside the folder")
	}
	// A regular entry with the name of a link the archive made would be written through it.
	replaced := write("replace.zip", []entry{{"a", ".", true}, {"b", "a/../escaped", true}, {"b", "x", false}})
	if err := unzip(replaced, filepath.Join(dir, "out3")); err == nil {
		t.Error("archive replacing its own symlink was accepted")
	}
	if _, err := os.Stat(filepath.Join(dir, "escaped")); err == nil {
		t.Error("file written outside the folder")
	}
	// A macOS framework: links that point through other links are fine.
	bundle := write("bundle.zip", []entry{
		{"F.framework/Versions/155/F", "binary", false},
		{"F.framework/Versions/Current", "155", true},
		{"F.framework/F", "Versions/Current/F", true},
	})
	out := filepath.Join(dir, "bundle")
	if err := unzip(bundle, out); err != nil {
		t.Fatal(err)
	}
	if b, err := os.ReadFile(filepath.Join(out, "F.framework", "F")); err != nil || string(b) != "binary" {
		t.Errorf("%q %v", b, err)
	}
}

func TestBrowserbaseSessions(t *testing.T) {
	var mu sync.Mutex
	var requests []string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		mu.Lock()
		requests = append(requests, fmt.Sprintf("%s %s %s %s", r.Method, r.URL.Path, r.Header.Get("X-Bb-Api-Key"), body))
		mu.Unlock()
		switch {
		case r.URL.Path == "/sessions" && r.Header.Get("X-Bb-Api-Key") == "bad":
			writeJSON(w, 401, map[string]any{"message": "invalid key"})
		case r.URL.Path == "/sessions":
			writeJSON(w, 201, map[string]any{"id": "bb1", "connectUrl": "wss://connect.example/?signingKey=x"})
		case r.URL.Path == "/sessions/bb1/debug":
			writeJSON(w, 200, map[string]any{"debuggerFullscreenUrl": "https://live.example/bb1"})
		default:
			writeJSON(w, 200, map[string]any{})
		}
	}))
	defer srv.Close()
	old := BrowserbaseAPIURL
	BrowserbaseAPIURL = srv.URL
	defer func() { BrowserbaseAPIURL = old }()

	var ce *ConfigurationError
	t.Setenv("BROWSERBASE_API_KEY", "")
	if _, err := (BrowserbaseBackend{}).CreateSession(context.Background(), CloudSessionOptions{}); !errors.As(err, &ce) {
		t.Fatal(err)
	}
	t.Setenv("BROWSERBASE_API_KEY", "bad")
	if _, err := (BrowserbaseBackend{}).CreateSession(context.Background(), CloudSessionOptions{}); !errors.As(err, &ce) || !strings.Contains(err.Error(), "invalid key") {
		t.Fatal(err)
	}
	t.Setenv("BROWSERBASE_API_KEY", "key1")
	t.Setenv("BROWSERBASE_REGION", "eu-central-1")
	p, _ := ParseProxy("http://u:p@h.example:8000")
	s, err := (BrowserbaseBackend{}).CreateSession(context.Background(), CloudSessionOptions{Proxy: p, Timeout: 10 * time.Second})
	if err != nil {
		t.Fatal(err)
	}
	if s.ID() != "bb1" || s.ConnectURL() != "wss://connect.example/?signingKey=x" {
		t.Error(s.ID(), s.ConnectURL())
	}
	if link, err := s.LiveViewURL(context.Background()); link != "https://live.example/bb1" || err != nil {
		t.Error(link, err)
	}
	s.Release(context.Background())
	mu.Lock()
	defer mu.Unlock()
	want := `POST /sessions key1 {"proxies":[{"password":"p","server":"http://h.example:8000","type":"external","username":"u"}],"region":"eu-central-1","timeout":60}`
	if requests[1] != want {
		t.Errorf("create: %s", requests[1])
	}
	if last := requests[len(requests)-1]; last != `POST /sessions/bb1 key1 {"status":"REQUEST_RELEASE"}` {
		t.Errorf("release: %s", last)
	}
	socks, _ := ParseProxy("socks5://h.example:1080")
	var ve *ValidationError
	if _, err := (BrowserbaseBackend{}).CreateSession(context.Background(), CloudSessionOptions{Proxy: socks}); !errors.As(err, &ve) {
		t.Error(err)
	}
}

func TestSteelSessions(t *testing.T) {
	var body map[string]any
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/v1/sessions" {
			json.NewDecoder(r.Body).Decode(&body)
			writeJSON(w, 200, map[string]any{"id": "st1", "websocketUrl": "ws://0.0.0.0:3000/", "debugUrl": "http://0.0.0.0:3000/v1/sessions/debug"})
			return
		}
		writeJSON(w, 200, map[string]any{})
	}))
	defer srv.Close()
	t.Setenv("STEEL_BASE_URL", "")
	t.Setenv("STEEL_API_KEY", "")
	var ce *ConfigurationError
	if _, err := (SteelBackend{}).CreateSession(context.Background(), CloudSessionOptions{}); !errors.As(err, &ce) {
		t.Fatal(err)
	}
	t.Setenv("STEEL_BASE_URL", srv.URL+"/")
	t.Setenv("STEEL_API_KEY", "sk1")
	p, _ := ParseProxy("socks5://u:p@h.example:1080")
	s, err := (SteelBackend{}).CreateSession(context.Background(), CloudSessionOptions{Proxy: p, Timeout: time.Second})
	if err != nil {
		t.Fatal(err)
	}
	host := strings.TrimPrefix(srv.URL, "http://")
	if s.ConnectURL() != "ws://"+host+"/?apiKey=sk1" {
		t.Error(s.ConnectURL())
	}
	if link, _ := s.LiveViewURL(context.Background()); link != srv.URL+"/v1/sessions/debug?interactive=true&showControls=true" {
		t.Error(link)
	}
	if body["proxyUrl"] != "socks5://u:p@h.example:1080" || body["timeout"] != float64(60000) {
		t.Error(body)
	}
}

type fakeBackend struct {
	connect  string
	released bool
}

func (b *fakeBackend) Label() string { return "Test cloud" }
func (b *fakeBackend) CreateSession(context.Context, CloudSessionOptions) (CloudSession, error) {
	return &fakeSession{b}, nil
}

type fakeSession struct{ b *fakeBackend }

func (s *fakeSession) ID() string         { return "s1" }
func (s *fakeSession) ConnectURL() string { return s.b.connect }
func (s *fakeSession) LiveViewURL(context.Context) (string, error) {
	return "https://live.example/s1", nil
}
func (s *fakeSession) Release(context.Context) { s.b.released = true }

func TestFailedCloudConnectionDoesntLeakTheAPIKey(t *testing.T) {
	b := &fakeBackend{connect: "ws://127.0.0.1:9/?sessionId=s1&apiKey=topsecret"}
	_, err := CloudProvider{Backend: b}.Open(context.Background(), OpenOptions{})
	var re *RemoteBrowserError
	if !errors.As(err, &re) || strings.Contains(err.Error(), "topsecret") {
		t.Fatalf("%v", err)
	}
	if !b.released {
		t.Error("session not released")
	}
}

// -- with a real browser --------------------------------------------------------

func needBrowser(t *testing.T) string {
	t.Helper()
	path, err := FindBrowser()
	if err != nil {
		t.Skipf("no Chrome or Chromium: %v", err)
	}
	return path
}

const signURL = "https://www.tiktok.com/api/v1/web/project/post/?app_name=tiktok_web&channel=tiktok_web&device_platform=web&aid=1988&msToken=abc"

func checkSignature(t *testing.T, sig Signature) {
	t.Helper()
	if !strings.HasPrefix(sig.Signature, "_02B4Z6wo00f01") || len(sig.XBogus) != 28 ||
		!strings.HasPrefix(sig.SignedURL, signURL+"&verifyFp=") || !strings.HasSuffix(sig.SignedURL, "&X-Bogus="+sig.XBogus) {
		t.Errorf("%+v", sig)
	}
}

func TestSignerInARealBrowser(t *testing.T) {
	needBrowser(t)
	// The page fetch goes to a proxy that doesn't exist, so the stub page is used and nothing
	// reaches TikTok.
	s, err := NewSigner(DefaultUserAgent, &SignerOptions{Proxy: "http://u:p@proxy.invalid:8000", Timeout: 20 * time.Second})
	if err != nil {
		t.Fatal(err)
	}
	defer s.Close()
	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	defer cancel()
	sig, err := s.Sign(ctx, signURL)
	if err != nil {
		t.Fatal(err)
	}
	checkSignature(t, sig)
	// Reusable, and restartable after Close.
	if _, err := s.Sign(ctx, signURL+"x"); err != nil {
		t.Fatal(err)
	}
	s.Close()
	if sig, err := s.Sign(ctx, signURL); err != nil {
		t.Fatal(err)
	} else {
		checkSignature(t, sig)
	}
}

// useHeadlessBrowsers makes local browsers headless and sends www.tiktok.com to addr.
func useHeadlessBrowsers(t *testing.T, flags map[string]any) {
	testBrowserFlags = map[string]any{"headless": true}
	for k, v := range flags {
		testBrowserFlags[k] = v
	}
	t.Cleanup(func() { testBrowserFlags = nil })
}

func fakeLoginSite(t *testing.T, setCookies bool) string {
	srv := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Host != "www.tiktok.com" {
			http.NotFound(w, r)
			return
		}
		if setCookies && r.URL.Path == "/login" {
			w.Header().Add("Set-Cookie", "sessionid=sess-from-login; Domain=.tiktok.com; Path=/; Secure; HttpOnly; SameSite=None; Max-Age=86400")
			w.Header().Add("Set-Cookie", "tt-target-idc=useast5; Domain=.tiktok.com; Path=/; Secure")
		}
		fmt.Fprint(w, "<!doctype html><title>Log in</title><p>log in")
	}))
	t.Cleanup(srv.Close)
	return srv.Listener.Addr().String()
}

func TestLoginInARealBrowser(t *testing.T) {
	needBrowser(t)
	isolatedHome(t)
	addr := fakeLoginSite(t, true)
	useHeadlessBrowsers(t, map[string]any{
		"host-resolver-rules":       "MAP www.tiktok.com " + addr,
		"ignore-certificate-errors": true,
	})
	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	defer cancel()
	acct, err := Login(ctx, "erin", &LoginOptions{Timeout: 30 * time.Second})
	if err != nil {
		t.Fatal(err)
	}
	if acct.SessionID() != "sess-from-login" || acct.Datacenter() != "useast5" || !strings.Contains(acct.UserAgent, "Chrome/") {
		t.Errorf("%+v %q", acct, acct.UserAgent)
	}
	saved, err := NewAccountStore("").Load("erin")
	if err != nil {
		t.Fatal(err)
	}
	var session Cookie
	for _, c := range saved.Cookies {
		if c.Name == SessionCookie {
			session = c
		}
	}
	b, _ := json.Marshal(session)
	// The fields Playwright saves, so the other packages read the same thing.
	if !regexp.MustCompile(`^\{"name":"sessionid","value":"sess-from-login","domain":"\.tiktok\.com","path":"/","expires":[0-9.e+]+,"httpOnly":true,"sameSite":"None","secure":true\}$`).Match(b) {
		t.Errorf("cookie: %s", b)
	}
}

func TestLoginTimesOut(t *testing.T) {
	needBrowser(t)
	isolatedHome(t)
	addr := fakeLoginSite(t, false)
	useHeadlessBrowsers(t, map[string]any{
		"host-resolver-rules":       "MAP www.tiktok.com " + addr,
		"ignore-certificate-errors": true,
	})
	_, err := Login(context.Background(), "frank", &LoginOptions{Timeout: 2 * time.Second})
	var le *LoginError
	if !errors.As(err, &le) || !strings.Contains(err.Error(), "timed out") {
		t.Fatalf("%v", err)
	}
	if NewAccountStore("").Exists("frank") {
		t.Error("account saved")
	}
}

func TestLocalBrowserUsesTheAccountProxy(t *testing.T) {
	needBrowser(t)
	target := echoServer(t)
	proxyAddr, seen := connectProxy(t)
	p, _ := ParseProxy("http://user:pa%3Ass@" + proxyAddr)
	// Chrome sends even 127.0.0.1 through the proxy with this.
	useHeadlessBrowsers(t, map[string]any{"proxy-bypass-list": "<-loopback>"})
	h, err := LocalProvider{}.Open(context.Background(), OpenOptions{Proxy: p})
	if err != nil {
		t.Fatal(err)
	}
	defer h.Close()
	ctx, cancel := context.WithTimeout(h.Page(), 30*time.Second)
	defer cancel()
	if err := Navigate(ctx, target.URL+"/through-proxy"); err != nil {
		t.Fatal(err)
	}
	text, err := chromedp.Run(ctx, chromedp.Evaluate[string](`document.body.innerText`))
	if err != nil || text != "GET /through-proxy" {
		t.Fatalf("%q %v", text, err)
	}
	// Chrome's own background requests go through the proxy too; the page's is among them.
	host := strings.TrimPrefix(target.URL, "http://")
	if got := seen(); !slices.Contains(got, "GET "+host) {
		t.Errorf("proxy saw %v", got)
	}
}

func TestLocalBrowserGetsPlaywrightsSwitches(t *testing.T) {
	needBrowser(t)
	useHeadlessBrowsers(t, nil)
	h, err := LocalProvider{}.Open(context.Background(), OpenOptions{})
	if err != nil {
		t.Fatal(err)
	}
	defer h.Close()
	ctx, cancel := context.WithTimeout(h.Page(), 30*time.Second)
	defer cancel()
	if err := Navigate(ctx, "chrome://version"); err != nil {
		t.Fatal(err)
	}
	line, err := chromedp.Run(ctx, chromedp.Evaluate[string](`document.getElementById("command_line").innerText`))
	if err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{"--no-first-run", "--disable-field-trial-config", "--disable-features=AvoidUnnecessaryBeforeUnloadCheckSync,",
		"--disable-blink-features=AutomationControlled"} {
		if !strings.Contains(line, want) {
			t.Errorf("missing %s in %s", want, line)
		}
	}
	if strings.Contains(line, "---") || strings.Contains(line, "--enable-automation") {
		t.Errorf("command line: %s", line)
	}
}

// startDebuggableChrome runs Chrome with a DevTools websocket, standing in for a cloud browser.
func startDebuggableChrome(t *testing.T, path string) string {
	args := []string{"--headless", "--remote-debugging-port=0", "--user-data-dir=" + t.TempDir(),
		"--no-first-run", "--no-default-browser-check", "--proxy-server=" + blackholeProxy, "about:blank"}
	if runtime.GOOS == "linux" {
		args = append(args, "--no-sandbox")
	}
	cmd := exec.Command(path, args...)
	stderr, _ := cmd.StderrPipe()
	if err := cmd.Start(); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		cmd.Process.Kill()
		cmd.Wait()
	})
	found := make(chan string, 1)
	go func() {
		sc := bufio.NewScanner(stderr)
		for sc.Scan() {
			if ws, ok := strings.CutPrefix(sc.Text(), "DevTools listening on "); ok {
				found <- ws
			}
		}
	}()
	select {
	case ws := <-found:
		return ws
	case <-time.After(30 * time.Second):
		t.Fatal("Chrome did not start")
		return ""
	}
}

func TestCloudBrowsersAttachToTheSessionsPage(t *testing.T) {
	path := needBrowser(t)
	ws := startDebuggableChrome(t, path)
	backend := &fakeBackend{connect: ws}
	RegisterProvider("testcloud", func() BrowserProvider { return CloudProvider{Backend: backend} })
	defer func() {
		providersMu.Lock()
		delete(providers, "testcloud")
		providersMu.Unlock()
	}()

	h, err := OpenBrowser(context.Background(), "testcloud", OpenOptions{})
	if err != nil {
		t.Fatal(err)
	}
	if !h.IsRemote() || h.Session.ID() != "s1" {
		t.Error(h)
	}
	if link, _ := h.LiveViewURL(context.Background()); link != "https://live.example/s1" {
		t.Error(link)
	}
	n, err := chromedp.Run(h.Page(), chromedp.Evaluate[int](`1 + 1`))
	if err != nil || n != 2 {
		t.Fatal(n, err)
	}
	h.Close()
	if !backend.released {
		t.Error("not released")
	}

	// Signing in a cloud browser (a fresh one, like each cloud session), with its requests
	// answered from here.
	backend.connect = startDebuggableChrome(t, path)
	backend.released = false
	s, _ := NewSigner(DefaultUserAgent, &SignerOptions{Browser: "testcloud", Proxy: "http://u:p@proxy.invalid:8000", Timeout: 20 * time.Second})
	defer s.Close()
	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	defer cancel()
	sig, err := s.Sign(ctx, signURL)
	if err != nil {
		t.Fatal(err)
	}
	checkSignature(t, sig)
	s.Close()
	if !backend.released {
		t.Error("signer session not released")
	}
}

func TestWaitForSessionCookies(t *testing.T) {
	polls := 0
	get := func(context.Context) ([]Cookie, error) {
		polls++
		cookies := []Cookie{{Name: "other", Value: "1", Domain: ".example.com"}, {Name: SessionCookie, Value: "s", Domain: ".tiktok.com"}}
		if polls >= 3 {
			cookies = append(cookies, Cookie{Name: DatacenterCookie, Value: "dc", Domain: ".tiktok.com"})
		}
		return cookies, nil
	}
	cookies, err := waitForSessionCookies(context.Background(), get, time.Millisecond, time.Second)
	if err != nil || polls != 3 || len(cookies) != 2 {
		t.Fatalf("%v %d %v", cookies, polls, err)
	}
	var le *LoginError
	closed := func(context.Context) ([]Cookie, error) { return nil, errors.New("page closed") }
	if _, err := waitForSessionCookies(context.Background(), closed, time.Millisecond, time.Second); !errors.As(err, &le) ||
		!strings.Contains(err.Error(), "closed before login finished") {
		t.Error(err)
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	never := func(context.Context) ([]Cookie, error) { return nil, nil }
	if _, err := waitForSessionCookies(ctx, never, time.Millisecond, -1); !errors.As(err, &le) || !errors.Is(err, context.Canceled) {
		t.Error(err)
	}
}
