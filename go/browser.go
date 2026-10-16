package autotok

// Where login and signing browsers run.
//
// A small registry picks the BrowserProvider that AUTOTOK_BROWSER names:
//
//   - local: Chrome or Chromium on this machine (default)
//   - browserbase: Browserbase cloud browsers (BROWSERBASE_API_KEY)
//   - steel: Steel Cloud, or a self-hosted steel-browser server (STEEL_BASE_URL)
//
// Add your own with RegisterProvider; a cloud service only needs a CloudBackend:
//
//	autotok.RegisterProvider("mycloud", func() autotok.BrowserProvider {
//		return autotok.CloudProvider{Backend: myBackend{}}
//	})   // then AUTOTOK_BROWSER=mycloud

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/chromedp/chromedp"
)

// OpenOptions say how to start a browser.
type OpenOptions struct {
	// Visible opens a window (for logging in); the default is headless.
	Visible bool
	// Proxy routes the browser's traffic through the account's proxy.
	Proxy *Proxy
	// Offline browsers only run page scripts (every request is answered by the caller, through
	// request interception), so they get no proxy and can't reach the network directly.
	Offline bool
	// Timeout is how long a cloud session may live (0: the provider's default).
	Timeout time.Duration
	// Flags are extra Chrome command line flags for local browsers, as chromedp.Flag takes them.
	Flags map[string]any
}

// BrowserProvider starts browsers for login and signing.
type BrowserProvider interface {
	// Label is a human-readable name used in messages.
	Label() string
	Open(ctx context.Context, opts OpenOptions) (*BrowserHandle, error)
}

// BrowserHandle is a running browser: local Chrome, or a cloud session. Drive it with chromedp,
// using the context from Page.
type BrowserHandle struct {
	// Provider is the label of the provider that started the browser.
	Provider string
	// Session is the cloud session, or nil for a local browser.
	Session CloudSession

	browserCtx context.Context
	pageCtx    context.Context
	cancel     func()
	closeOnce  sync.Once
}

// IsRemote reports whether the browser runs in a cloud session.
func (h *BrowserHandle) IsRemote() bool { return h.Session != nil }

// Page is a chromedp context for the browser's tab: the tab a local browser starts with, or a
// cloud session's first page. Use it with chromedp.Run; it ends when the handle closes.
func (h *BrowserHandle) Page() context.Context { return h.pageCtx }

// Browser is the chromedp context of the browser itself, for chromedp.CallBrowser and
// chromedp.Targets.
func (h *BrowserHandle) Browser() context.Context { return h.browserCtx }

// LiveViewURL is the link that lets a person watch and control a cloud browser ("" for a
// local one).
func (h *BrowserHandle) LiveViewURL(ctx context.Context) (string, error) {
	if h.Session == nil {
		return "", nil
	}
	return h.Session.LiveViewURL(ctx)
}

// Close stops the browser and ends the cloud session (which stops its billing).
func (h *BrowserHandle) Close() error {
	h.closeOnce.Do(func() {
		if h.cancel != nil {
			h.cancel()
		}
		if h.Session != nil {
			ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
			defer cancel()
			h.Session.Release(ctx)
		}
	})
	return nil
}

// Navigate loads url in the tab of page (a chromedp context, such as BrowserHandle.Page) and
// waits for it to load. Unlike chromedp.Navigate, it tries again when Chrome aborts the
// navigation (net::ERR_ABORTED), which Chrome sometimes does right after starting.
func Navigate(page context.Context, url string) error {
	return retryAborted(page, func() error { return chromedp.Do(page, chromedp.Navigate(url)) })
}

// startTab runs the first action on a chromedp context, which starts or attaches the browser.
// It mustn't run with a timeout (that would stop the browser later), so ctx can only cancel the
// start, by calling abort.
func startTab(ctx, tab context.Context, abort func()) error {
	stop := context.AfterFunc(ctx, abort)
	defer stop()
	err := chromedp.Do(tab)
	if err != nil && ctx.Err() != nil {
		return ctx.Err()
	}
	return err
}

var (
	providersMu sync.Mutex
	providers   = map[string]func() BrowserProvider{
		"local":       func() BrowserProvider { return LocalProvider{} },
		"browserbase": func() BrowserProvider { return CloudProvider{Backend: BrowserbaseBackend{}} },
		"steel":       func() BrowserProvider { return CloudProvider{Backend: SteelBackend{}} },
	}
)

// RegisterProvider makes factory available as AUTOTOK_BROWSER=<name>.
func RegisterProvider(name string, factory func() BrowserProvider) {
	providersMu.Lock()
	defer providersMu.Unlock()
	providers[strings.ToLower(strings.TrimSpace(name))] = factory
}

// AvailableProviders lists the provider names, sorted.
func AvailableProviders() []string {
	providersMu.Lock()
	defer providersMu.Unlock()
	names := make([]string, 0, len(providers))
	for name := range providers {
		names = append(names, name)
	}
	sort.Strings(names)
	return names
}

// GetProvider returns the provider called name, or the one AUTOTOK_BROWSER selects when name
// is "".
func GetProvider(name string) (BrowserProvider, error) {
	key := strings.ToLower(strings.TrimSpace(name))
	if key == "" {
		key = BrowserProviderName()
	}
	providersMu.Lock()
	factory := providers[key]
	providersMu.Unlock()
	if factory == nil {
		return nil, newConfigurationError(fmt.Sprintf("unknown browser provider '%s'; use one of: %s",
			key, strings.Join(AvailableProviders(), ", ")))
	}
	return factory(), nil
}

// OpenBrowser starts a browser from the provider called provider ("" for AUTOTOK_BROWSER's).
func OpenBrowser(ctx context.Context, provider string, opts OpenOptions) (*BrowserHandle, error) {
	p, err := GetProvider(provider)
	if err != nil {
		return nil, err
	}
	return p.Open(ctx, opts)
}

// isCloudProvider reports whether p runs browsers remotely.
func isCloudProvider(p BrowserProvider) bool {
	_, ok := p.(CloudProvider)
	return ok
}
