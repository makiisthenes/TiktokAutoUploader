package autotok

// Chrome or Chromium on this machine (the default provider).

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/chromedp/cdproto/target"
	"github.com/chromedp/chromedp"
)

// LocalProvider runs Chrome or Chromium on this machine.
type LocalProvider struct{}

// Label implements BrowserProvider.
func (LocalProvider) Label() string { return "local Chrome" }

// blackholeProxy is an address nobody listens on: it makes an offline browser fail closed.
const blackholeProxy = "http://127.0.0.1:9"

// testBrowserFlags are added to every local browser's flags (tests use them to reach local
// servers).
var testBrowserFlags map[string]any

// playwrightSwitches are the switches Playwright starts Chromium with (playwright-core's
// chromiumSwitches), which the Python and TypeScript packages use, so all three run the browser
// alike. They also keep Chromium's experiments and background services out of the way: without
// --disable-field-trial-config, for example, a navigation soon after start-up is sometimes
// aborted.
var playwrightSwitches = []string{
	"--disable-field-trial-config",
	"--disable-background-networking",
	"--disable-background-timer-throttling",
	"--disable-backgrounding-occluded-windows",
	"--disable-back-forward-cache",
	"--disable-breakpad",
	"--disable-client-side-phishing-detection",
	"--disable-component-extensions-with-background-pages",
	"--disable-component-update",
	"--no-default-browser-check",
	"--disable-default-apps",
	"--disable-dev-shm-usage",
	"--disable-edgeupdater",
	"--disable-extensions",
	"--disable-features=" + strings.Join([]string{
		"AvoidUnnecessaryBeforeUnloadCheckSync", "DestroyProfileOnBrowserClose", "DialMediaRouteProvider",
		"GlobalMediaControls", "HttpsUpgrades", "LensOverlay", "MediaRouter", "PaintHolding",
		"ThirdPartyStoragePartitioning", "BlockOriginHeaderModificationOnRedirect",
		// Chromium 155 aborts some redirects with net::ERR_ABORTED while request interception is on.
		"AvoidCorsURLLoaderRestartOnRedirect",
		"Translate", "AutoDeElevate", "OptimizationHints", "NetworkTimeServiceQuerying", "AimEnabled",
		"msForceBrowserSignIn", "msEdgeUpdateLaunchServicesPreferredVersion",
	}, ","),
	"--allow-pre-commit-input",
	"--disable-hang-monitor",
	"--disable-ipc-flooding-protection",
	"--disable-popup-blocking",
	"--disable-prompt-on-repost",
	"--disable-renderer-backgrounding",
	"--disable-updater-scheduler",
	"--force-color-profile=srgb",
	"--metrics-recording-only",
	"--no-first-run",
	"--password-store=basic",
	"--use-mock-keychain",
	"--no-service-autorun",
	"--export-tagged-pdf",
	"--disable-search-engine-choice-screen",
	"--unsafely-disable-devtools-self-xss-warnings",
	"--edge-skip-compat-layer-relaunch",
	"--disable-infobars",
	"--disable-sync",
}

// Open implements BrowserProvider.
func (LocalProvider) Open(ctx context.Context, o OpenOptions) (*BrowserHandle, error) {
	path, err := FindBrowser()
	if err != nil {
		return nil, err
	}
	if o.Visible && testBrowserFlags["headless"] != true && runtime.GOOS == "linux" &&
		os.Getenv("DISPLAY") == "" && os.Getenv("WAYLAND_DISPLAY") == "" {
		return nil, newConfigurationError("there is no display to open a browser window on. Log in on a machine with a " +
			"desktop, use a cloud browser (AUTOTOK_BROWSER=browserbase or steel), or import a session with --sessionid")
	}

	opts := []chromedp.ExecAllocatorOption{chromedp.ExecPath(path)}
	for _, flag := range playwrightSwitches {
		// chromedp.Flag takes the bare name and adds the dashes itself.
		name, value, hasValue := strings.Cut(strings.TrimPrefix(flag, "--"), "=")
		if hasValue {
			opts = append(opts, chromedp.Flag(name, value))
		} else {
			opts = append(opts, chromedp.Flag(name, true))
		}
	}
	// Hide the most obvious automation flag from the pages we open (Playwright leaves out
	// --enable-automation for the other packages too).
	opts = append(opts, chromedp.Flag("disable-blink-features", "AutomationControlled"))
	if o.Visible {
		opts = append(opts, chromedp.Flag("start-maximized", true))
	} else {
		opts = append(opts, chromedp.Headless)
	}
	if runtime.GOOS == "linux" {
		// Like Playwright (which the other packages use): Chrome refuses to run as root (e.g. in
		// a container) with its sandbox on, and recent Ubuntu releases block the sandbox of
		// downloaded builds.
		opts = append(opts, chromedp.NoSandbox)
	}
	var relay *proxyRelay
	switch {
	case o.Offline:
		opts = append(opts, chromedp.ProxyServer(blackholeProxy))
	case o.Proxy != nil:
		relay, err = startRelay(o.Proxy)
		if err != nil {
			return nil, err
		}
		opts = append(opts, chromedp.ProxyServer(relay.url()),
			// Stop WebRTC from revealing the real IP over UDP, around the proxy.
			chromedp.Flag("force-webrtc-ip-handling-policy", "disable_non_proxied_udp"))
	}
	for _, flags := range []map[string]any{o.Flags, testBrowserFlags} {
		for name, value := range flags {
			opts = append(opts, chromedp.Flag(name, value))
		}
	}

	allocCtx, cancelAlloc := chromedp.NewExecAllocator(context.Background(), opts...)
	tab, cancelTab := chromedp.NewContext(allocCtx)
	h := &BrowserHandle{Provider: LocalProvider{}.Label(), browserCtx: tab, pageCtx: tab}
	h.cancel = func() {
		cancelTab()
		cancelAlloc()
		if relay != nil {
			relay.Close()
		}
	}
	if err := startTab(ctx, tab, h.cancel); err != nil {
		h.Close()
		if ctx.Err() != nil {
			return nil, err
		}
		return nil, launchError(path, err)
	}
	if err := waitForInitialPage(ctx, tab); err != nil {
		h.Close()
		return nil, err
	}
	return h, nil
}

// waitForInitialPage waits until the browser's first tab has finished opening. chromedp attaches
// to it as soon as it exists, but until the browser reports its URL (as Puppeteer checks), the
// tab's own start-up navigation is still pending and would abort the first page we load.
func waitForInitialPage(ctx context.Context, tab context.Context) error {
	id := chromedp.FromContext(tab).Target.TargetID
	deadline := time.Now().Add(15 * time.Second)
	for {
		cctx, cancel := withCaller(tab, ctx)
		res, err := chromedp.CallBrowser(cctx, target.GetTargetInfo, target.GetTargetInfoParams{TargetID: id})
		cancel()
		if ctx.Err() != nil {
			return ctx.Err()
		}
		if err == nil && res.TargetInfo != nil && res.TargetInfo.URL != "" {
			return nil
		}
		if time.Now().After(deadline) {
			if err == nil {
				err = errors.New("its first tab never finished opening")
			}
			return fmt.Errorf("the browser did not start properly: %w", err)
		}
		time.Sleep(25 * time.Millisecond)
	}
}

func launchError(path string, err error) error {
	msg := err.Error()
	if strings.Contains(msg, "error while loading shared libraries") {
		return &BrowserNotInstalledError{baseError{msg: fmt.Sprintf("%s is missing system libraries (%s). Install your "+
			"distribution's chromium package, which brings them, or run: npx playwright install-deps chromium", path, msg), cause: err}}
	}
	return &BrowserNotInstalledError{baseError{msg: fmt.Sprintf("could not start %s: %s", path, msg), cause: err}}
}

// FindBrowser returns the Chrome or Chromium that autotok launches, the first of:
//
//  1. AUTOTOK_BROWSER_PATH
//  2. AUTOTOK_BROWSER_CHANNEL: an installed chrome, chromium or msedge
//  3. Chrome for Testing downloaded by `autotok install-browser` (InstallBrowser)
//  4. Playwright's Chromium, shared with the Python and TypeScript packages
//  5. an installed Google Chrome, Chromium or Microsoft Edge
func FindBrowser() (string, error) {
	if path := os.Getenv("AUTOTOK_BROWSER_PATH"); path != "" {
		path = ExpandUser(path)
		if !isFile(path) {
			return "", &BrowserNotInstalledError{baseError{msg: fmt.Sprintf("AUTOTOK_BROWSER_PATH points to %s, which doesn't exist", path)}}
		}
		return path, nil
	}
	if channel := strings.ToLower(strings.TrimSpace(os.Getenv("AUTOTOK_BROWSER_CHANNEL"))); channel != "" {
		candidates, ok := channelBrowsers()[channel]
		if !ok {
			return "", newConfigurationError(fmt.Sprintf("unsupported AUTOTOK_BROWSER_CHANNEL '%s' (use chrome, chromium or "+
				"msedge, or set AUTOTOK_BROWSER_PATH)", channel))
		}
		if path := firstFile(candidates); path != "" {
			return path, nil
		}
		return "", &BrowserNotInstalledError{baseError{msg: fmt.Sprintf("AUTOTOK_BROWSER_CHANNEL=%s, but it isn't installed", channel)}}
	}
	if path := installedChromeForTesting(); path != "" {
		return path, nil
	}
	if path := playwrightChromium(); path != "" {
		return path, nil
	}
	channels := channelBrowsers()
	for _, channel := range []string{"chrome", "chromium", "msedge"} {
		if path := firstFile(channels[channel]); path != "" {
			return path, nil
		}
	}
	return "", &BrowserNotInstalledError{baseError{msg: "no Chrome or Chromium found. Run: autotok install-browser " +
		"(or install Google Chrome, or set AUTOTOK_BROWSER_PATH)"}}
}

func isFile(path string) bool {
	info, err := os.Stat(path)
	return err == nil && !info.IsDir()
}

func firstFile(paths []string) string {
	for _, p := range paths {
		if p != "" && isFile(p) {
			return p
		}
	}
	return ""
}

// channelBrowsers lists where each installed browser usually lives.
func channelBrowsers() map[string][]string {
	switch runtime.GOOS {
	case "windows":
		var roots []string
		for _, env := range []string{"ProgramFiles", "ProgramFiles(x86)", "LocalAppData"} {
			if v := os.Getenv(env); v != "" {
				roots = append(roots, v)
			}
		}
		join := func(parts ...string) []string {
			var out []string
			for _, root := range roots {
				out = append(out, filepath.Join(append([]string{root}, parts...)...))
			}
			return out
		}
		return map[string][]string{
			"chrome":   join("Google", "Chrome", "Application", "chrome.exe"),
			"chromium": join("Chromium", "Application", "chrome.exe"),
			"msedge":   join("Microsoft", "Edge", "Application", "msedge.exe"),
		}
	case "darwin":
		home, _ := os.UserHomeDir()
		app := func(name, binary string) []string {
			return []string{
				filepath.Join("/Applications", name+".app", "Contents", "MacOS", binary),
				filepath.Join(home, "Applications", name+".app", "Contents", "MacOS", binary),
			}
		}
		return map[string][]string{
			"chrome":   app("Google Chrome", "Google Chrome"),
			"chromium": app("Chromium", "Chromium"),
			"msedge":   app("Microsoft Edge", "Microsoft Edge"),
		}
	default:
		look := func(names ...string) []string {
			var out []string
			for _, name := range names {
				if p, err := exec.LookPath(name); err == nil {
					out = append(out, p)
				}
			}
			return out
		}
		return map[string][]string{
			"chrome":   look("google-chrome", "google-chrome-stable"),
			"chromium": look("chromium", "chromium-browser"),
			"msedge":   look("microsoft-edge", "microsoft-edge-stable"),
		}
	}
}

// executableIn lists where the Chrome binary sits inside a Chrome for Testing or Playwright
// Chromium folder.
func executableIn(dir string) []string {
	switch runtime.GOOS {
	case "windows":
		return []string{
			filepath.Join(dir, "chrome-win64", "chrome.exe"),
			filepath.Join(dir, "chrome-win32", "chrome.exe"),
			filepath.Join(dir, "chrome-win", "chrome.exe"),
		}
	case "darwin":
		var out []string
		for _, sub := range []string{"chrome-mac-arm64", "chrome-mac-x64", "chrome-mac"} {
			out = append(out,
				filepath.Join(dir, sub, "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing"),
				filepath.Join(dir, sub, "Chromium.app", "Contents", "MacOS", "Chromium"))
		}
		return out
	default:
		return []string{
			filepath.Join(dir, "chrome-linux64", "chrome"),
			filepath.Join(dir, "chrome-linux", "chrome"),
		}
	}
}

// browsersDir is where InstallBrowser puts Chrome for Testing.
func browsersDir() string { return filepath.Join(Home(), "browsers") }

// installedChromeForTesting returns the newest Chrome that InstallBrowser downloaded.
func installedChromeForTesting() string {
	entries, err := os.ReadDir(browsersDir())
	if err != nil {
		return ""
	}
	var versions []string
	for _, e := range entries {
		if v, ok := strings.CutPrefix(e.Name(), "chrome-"); ok && e.IsDir() {
			versions = append(versions, v)
		}
	}
	sort.Slice(versions, func(i, j int) bool { return compareVersions(versions[i], versions[j]) > 0 })
	for _, v := range versions {
		if path := firstFile(executableIn(filepath.Join(browsersDir(), "chrome-"+v))); path != "" {
			return path
		}
	}
	return ""
}

// compareVersions compares dotted version numbers.
func compareVersions(a, b string) int {
	pa, pb := strings.Split(a, "."), strings.Split(b, ".")
	for i := 0; i < len(pa) || i < len(pb); i++ {
		var x, y int
		if i < len(pa) {
			x, _ = strconv.Atoi(pa[i])
		}
		if i < len(pb) {
			y, _ = strconv.Atoi(pb[i])
		}
		if x != y {
			return x - y
		}
	}
	return 0
}

// playwrightBrowsersDir is where Playwright keeps its browsers.
func playwrightBrowsersDir() string {
	if v := os.Getenv("PLAYWRIGHT_BROWSERS_PATH"); v != "" && v != "0" {
		return v
	}
	switch runtime.GOOS {
	case "windows":
		if v := os.Getenv("LOCALAPPDATA"); v != "" {
			return filepath.Join(v, "ms-playwright")
		}
	case "darwin":
		if home, err := os.UserHomeDir(); err == nil {
			return filepath.Join(home, "Library", "Caches", "ms-playwright")
		}
	default:
		if v := os.Getenv("XDG_CACHE_HOME"); v != "" {
			return filepath.Join(v, "ms-playwright")
		}
		if home, err := os.UserHomeDir(); err == nil {
			return filepath.Join(home, ".cache", "ms-playwright")
		}
	}
	return ""
}

// playwrightChromium returns the newest full Chromium Playwright installed (not its
// headless-only shell, which can't show a login window).
func playwrightChromium() string {
	root := playwrightBrowsersDir()
	if root == "" {
		return ""
	}
	entries, err := os.ReadDir(root)
	if err != nil {
		return ""
	}
	type build struct {
		rev int
		dir string
	}
	var builds []build
	for _, e := range entries {
		if rev, ok := strings.CutPrefix(e.Name(), "chromium-"); ok && e.IsDir() {
			if n, err := strconv.Atoi(rev); err == nil {
				builds = append(builds, build{n, filepath.Join(root, e.Name())})
			}
		}
	}
	// Playwright numbers its builds (chromium-1248); before 2021 it used Chromium revisions
	// (chromium-854489), which are older despite the bigger numbers.
	modern := func(b build) bool { return b.rev < 100_000 }
	sort.Slice(builds, func(i, j int) bool {
		if modern(builds[i]) != modern(builds[j]) {
			return modern(builds[i])
		}
		return builds[i].rev > builds[j].rev
	})
	for _, b := range builds {
		if path := firstFile(executableIn(b.dir)); path != "" {
			return path
		}
	}
	return ""
}

// errNoBrowser reports whether err means no browser could be found or started.
func errNoBrowser(err error) bool {
	var e *BrowserNotInstalledError
	return errors.As(err, &e)
}
