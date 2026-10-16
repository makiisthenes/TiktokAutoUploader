package autotok

// Cloud browsers: services that hand out a remote Chromium over CDP (Browserbase, Steel). A
// service only implements CloudBackend; CloudProvider connects to its sessions.

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/chromedp/chromedp"
	"github.com/chromedp/chromedp/remote"
)

// CloudSession is a remote browser session.
type CloudSession interface {
	// ID identifies the session with the provider.
	ID() string
	// ConnectURL is the CDP websocket endpoint.
	ConnectURL() string
	// LiveViewURL is a link that lets a person watch and control the browser.
	LiveViewURL(ctx context.Context) (string, error)
	// Release ends the session now (stops billing). It must not fail loudly.
	Release(ctx context.Context)
}

// CloudSessionOptions say how to start a cloud session.
type CloudSessionOptions struct {
	// Proxy is the account's proxy for the session's traffic, or nil.
	Proxy *Proxy
	// Timeout is how long the session may live (0: the provider's default).
	Timeout time.Duration
	// Offline sessions only run page scripts, so providers should skip any managed proxy.
	Offline bool
}

// CloudBackend starts remote browser sessions.
type CloudBackend interface {
	// Label is a human-readable name used in messages.
	Label() string
	CreateSession(ctx context.Context, opts CloudSessionOptions) (CloudSession, error)
}

// CloudProvider is a BrowserProvider for a CloudBackend.
type CloudProvider struct {
	Backend CloudBackend
}

// Label implements BrowserProvider.
func (p CloudProvider) Label() string { return p.Backend.Label() }

// Open implements BrowserProvider: it starts a session and connects to its first page.
func (p CloudProvider) Open(ctx context.Context, o OpenOptions) (*BrowserHandle, error) {
	proxy := o.Proxy
	if o.Offline {
		proxy = nil
	}
	session, err := p.Backend.CreateSession(ctx, CloudSessionOptions{Proxy: proxy, Timeout: o.Timeout, Offline: o.Offline})
	if err != nil {
		return nil, err
	}
	h, err := connectCloudSession(ctx, session, p.Label())
	if err != nil {
		rctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		session.Release(rctx)
		return nil, err
	}
	return h, nil
}

func connectCloudSession(ctx context.Context, session CloudSession, label string) (*BrowserHandle, error) {
	allocCtx, cancelAlloc := remote.NewAllocator(context.Background(), session.ConnectURL(), remote.NoModifyURL,
		remote.WithDialTimeout(30*time.Second))
	browserCtx, cancelBrowser := chromedp.NewContext(allocCtx)
	cancelAll := func() {
		cancelBrowser()
		cancelAlloc()
	}
	fail := func(err error) (*BrowserHandle, error) {
		cancelAll()
		if ctx.Err() != nil {
			return nil, ctx.Err()
		}
		// The CDP URL can carry an API key or a signed token (Steel, Browserbase), and the
		// connection error may quote it.
		return nil, newRemoteBrowserError(fmt.Sprintf("could not connect to the %s session: %s", label, redactURLs(err.Error())), nil)
	}

	stop := context.AfterFunc(ctx, cancelAll)
	defer stop()
	targets, err := chromedp.Targets(browserCtx)
	if err != nil {
		return fail(err)
	}
	var options []chromedp.ContextOption
	for _, t := range targets {
		if t.Type == "page" {
			options = append(options, chromedp.WithTargetID(t.TargetID))
			break
		}
	}
	page, cancelPage := chromedp.NewContext(browserCtx, options...)
	if err := chromedp.Do(page); err != nil {
		cancelPage()
		return fail(err)
	}
	return &BrowserHandle{
		Provider:   label,
		Session:    session,
		browserCtx: browserCtx,
		pageCtx:    page,
		cancel: func() {
			cancelPage()
			cancelAll()
		},
	}, nil
}

var urlQueryRE = regexp.MustCompile(`\b((?:wss?|https?)://[^\s?#'"]+)\?[^\s'"]*`)

// redactURLs hides the query string of every URL in text (API keys and tokens travel there).
func redactURLs(text string) string { return urlQueryRE.ReplaceAllString(text, "$1?****") }

// addQuery appends query (a=1&b=2) to rawURL.
func addQuery(rawURL, query string) string {
	if strings.Contains(rawURL, "?") {
		return rawURL + "&" + query
	}
	return rawURL + "?" + query
}

// reachable points rawURL at base's host when a server reported an unroutable address such as
// 0.0.0.0 (self-hosted defaults).
func reachable(rawURL, base string) string {
	u, err := url.Parse(rawURL)
	if err != nil {
		return rawURL
	}
	b, err := url.Parse(base)
	if err != nil {
		return rawURL
	}
	switch u.Hostname() {
	case "0.0.0.0", "::", "":
	default:
		return rawURL
	}
	scheme := u.Scheme
	switch scheme {
	case "ws", "wss":
		scheme = "ws"
		if b.Scheme == "https" {
			scheme = "wss"
		}
	case "http", "https":
		scheme = b.Scheme
	}
	out := scheme + "://" + b.Host + u.EscapedPath()
	if u.RawQuery != "" {
		out += "?" + u.RawQuery
	}
	if u.Fragment != "" {
		out += "#" + u.EscapedFragment()
	}
	return out
}

// errorDetail is short error text from an API response, for messages.
func errorDetail(r *httpResponse) string {
	cut := func(s string) string {
		if len(s) > 300 {
			return s[:300]
		}
		return s
	}
	data := r.json()
	if obj, ok := data.(map[string]any); ok {
		for _, key := range []string{"message", "error"} {
			if v, ok := obj[key]; ok && v != nil && v != "" {
				return cut(fmt.Sprint(v))
			}
		}
	}
	if data != nil {
		if b, err := json.Marshal(data); err == nil {
			return cut(string(b))
		}
	}
	return cut(r.text())
}

func cloudHTTP() *httpClient { return newHTTPClient(httpClientOptions{timeout: 30 * time.Second}) }

// NewRemoteBrowserError is the error a CloudBackend returns when a session can't be started
// or reached.
func NewRemoteBrowserError(msg string, cause error) error { return newRemoteBrowserError(msg, cause) }

// NewConfigurationError is the error a CloudBackend returns for a missing or invalid setting.
func NewConfigurationError(msg string) error { return newConfigurationError(msg) }
