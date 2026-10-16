package autotok

// TikTok request signing (_signature and X-Bogus).
//
// TikTok's own obfuscated JavaScript computes the signatures, so it runs inside a headless
// Chrome page on the www.tiktok.com origin. The browser never touches the network itself: the
// page request is made from Go (through the account's proxy, if any) so TikTok's cookies land
// in the browser, Chrome is given a blank page on that origin, and every other request is
// blocked.
//
// A Signer can be reused for many signatures; starting it costs about two seconds. With a cloud
// browser (AUTOTOK_BROWSER=browserbase or steel) the page runs remotely; the page fetch and
// every other request still go through the interception, so TikTok traffic keeps using the
// account's proxy.

import (
	"context"
	"embed"
	"encoding/json"
	"errors"
	"fmt"
	"math/rand/v2"
	"net/url"
	"sync"
	"time"

	"github.com/chromedp/cdproto/cdp"
	"github.com/chromedp/cdproto/emulation"
	"github.com/chromedp/cdproto/fetch"
	"github.com/chromedp/cdproto/network"
	"github.com/chromedp/chromedp"
)

//go:embed signer_js/*.js
var signerJS embed.FS

var signerScripts = []string{"signer.js", "webmssdk.js", "xbogus.js"}

const (
	// SignerPageURL is the page the signing scripts run on.
	SignerPageURL = "https://www.tiktok.com/api/v1/web/project/post/"
	// VerifyFp is the verifyFp value signed URLs carry.
	VerifyFp = "verify_5b161567bda98b6a50c0414d99909d4b"
	stubHTML = "<!doctype html><html><head></head><body></body></html>"
)

// Signature is what signing a URL produces.
type Signature struct {
	Signature string
	XBogus    string
	VerifyFp  string
	SignedURL string
}

// URLSigner signs TikTok URLs. Pass your own to ClientOptions to reuse a Signer or stub signing.
type URLSigner interface {
	Sign(ctx context.Context, url string) (Signature, error)
}

// SignerOptions configure a Signer.
type SignerOptions struct {
	// Proxy is for the page fetch: the account's proxy string ("" for none).
	Proxy string
	// Timeout bounds the page load and the wait for TikTok's scripts (default 30s).
	Timeout time.Duration
	// Browser is the browser provider to use ("" for AUTOTOK_BROWSER's).
	Browser string
}

// Signer runs TikTok's signing scripts in a browser. It is safe for use by several goroutines.
type Signer struct {
	userAgent string
	proxy     *Proxy
	timeout   time.Duration
	browser   string

	mu     sync.Mutex
	handle *BrowserHandle
	page   context.Context
	http   *httpClient
}

// NewSigner returns a signer for requests made with userAgent. It starts its browser on first
// use (or on Start).
func NewSigner(userAgent string, opts *SignerOptions) (*Signer, error) {
	if opts == nil {
		opts = &SignerOptions{}
	}
	p, err := ParseProxy(opts.Proxy)
	if err != nil {
		return nil, err
	}
	return newSigner(userAgent, p, opts.Timeout, opts.Browser), nil
}

func newSigner(userAgent string, proxy *Proxy, timeout time.Duration, browser string) *Signer {
	if timeout <= 0 {
		timeout = 30 * time.Second
	}
	return &Signer{userAgent: userAgent, proxy: proxy, timeout: timeout, browser: browser}
}

// Start starts the browser and loads TikTok's scripts. Sign calls it when needed.
func (s *Signer) Start(ctx context.Context) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.start(ctx)
}

func (s *Signer) start(ctx context.Context) error {
	if s.page != nil {
		return nil
	}
	err := s.open(ctx)
	if err != nil {
		s.closeLocked()
		var known Error
		if errors.As(err, &known) || ctx.Err() != nil {
			return err
		}
		return newSigningError("could not start the signing browser: "+describe(err), err)
	}
	return nil
}

func (s *Signer) open(ctx context.Context) error {
	s.http = newHTTPClient(httpClientOptions{
		proxy:   s.proxy,
		jar:     &cookieJar{},
		timeout: s.timeout,
		headers: map[string]string{"user-agent": s.userAgent, "accept": "text/html,application/json,*/*"},
	})
	// Locally, the browser points at a closed port: anything that slips past the interception
	// (e.g. Chrome's preconnect) fails instead of reaching TikTok from the real IP.
	handle, err := OpenBrowser(ctx, s.browser, OpenOptions{Offline: true, Timeout: max(5*time.Minute, 4*s.timeout)})
	if err != nil {
		return err
	}
	s.handle = handle
	page := handle.Page()

	run := func(steps ...chromedp.Action[chromedp.Void]) error {
		cctx, cancel := withCaller(page, ctx)
		defer cancel()
		return chromedp.Do(cctx, steps...)
	}
	if !handle.IsRemote() {
		// Like the other packages: an iPhone-sized context with a randomised viewport, so pages
		// don't all look the same.
		err := run(chromedp.Func(func(ctx context.Context, t *chromedp.Target) error {
			if _, err := cdp.Call(ctx, t, emulation.SetUserAgentOverride, emulation.SetUserAgentOverrideParams{
				UserAgent: s.userAgent, AcceptLanguage: "en-US",
			}); err != nil {
				return err
			}
			if _, err := cdp.Call(ctx, t, emulation.SetLocaleOverride, emulation.SetLocaleOverrideParams{Locale: "en-US"}); err != nil {
				return err
			}
			if _, err := cdp.Call(ctx, t, emulation.SetDeviceMetricsOverride, emulation.SetDeviceMetricsOverrideParams{
				Width: int64(320 + rand.IntN(1601)), Height: int64(320 + rand.IntN(1601)),
				DeviceScaleFactor: float64(1 + rand.IntN(3)), Mobile: rand.Float64() > 0.5,
			}); err != nil {
				return err
			}
			_, err := cdp.Call(ctx, t, emulation.SetTouchEmulationEnabled, emulation.SetTouchEmulationEnabledParams{
				Enabled: rand.Float64() > 0.5, MaxTouchPoints: 5,
			})
			return err
		}))
		if err != nil {
			return err
		}
	}

	// Every request pauses here; the handler answers it. Handlers keep this client: Close may
	// replace the signer's while one runs.
	events := chromedp.Events(page, fetch.RequestPaused)
	client := s.http
	pagePaused := make(chan struct{}, 1)
	go func() {
		for ev, err := range events {
			if err != nil {
				return
			}
			if ev.ResourceType == network.ResourceTypeDocument {
				select {
				case pagePaused <- struct{}{}:
				default:
				}
			}
			go s.route(page, client, ev)
		}
	}()
	err = run(
		chromedp.Func(func(ctx context.Context, t *chromedp.Target) error {
			_, err := cdp.Call(ctx, t, fetch.Enable, fetch.EnableParams{Patterns: []*fetch.RequestPattern{{URLPattern: "*"}}})
			return err
		}),
	)
	if err != nil {
		return err
	}
	loadCtx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()
	cctx, stop := withCaller(page, loadCtx)
	defer stop()
	if err := loadSignerPage(cctx, pagePaused); err != nil {
		return err
	}
	var steps []chromedp.Action[chromedp.Void]
	for _, name := range signerScripts {
		code, err := signerJS.ReadFile("signer_js/" + name)
		if err != nil {
			return err
		}
		steps = append(steps, chromedp.Evaluate[chromedp.Void](addScriptTag(string(code))))
	}
	if err := chromedp.Do(cctx, steps...); err != nil {
		return err
	}
	if err := waitForSigner(cctx); err != nil {
		return err
	}
	s.page = page
	return nil
}

// errPageStuck: the browser never asked for the page.
var errPageStuck = errors.New("the browser did not request the page")

// loadSignerPage navigates to SignerPageURL, and again when Chrome aborts the navigation or never
// sends its request. Right after starting, Chrome sometimes cancels a navigation's request, and
// with request interception on, the navigation can then hang instead of failing.
func loadSignerPage(ctx context.Context, pagePaused chan struct{}) error {
	for attempt := 1; ; attempt++ {
		err := navigateWatched(ctx, pagePaused, 5*time.Second)
		var le *chromedp.LoadError
		aborted := errors.As(err, &le) && le.ErrorText == "net::ERR_ABORTED"
		if err == nil || attempt == 3 || ctx.Err() != nil || !(aborted || errors.Is(err, errPageStuck)) {
			return err
		}
		logDebug("signer page load failed (%v); trying again", err)
	}
}

// navigateWatched loads SignerPageURL, giving up with errPageStuck when its request doesn't
// arrive at the interception within grace.
func navigateWatched(ctx context.Context, pagePaused chan struct{}, grace time.Duration) error {
	select { // a signal from an earlier attempt
	case <-pagePaused:
	default:
	}
	actx, cancel := context.WithCancel(ctx)
	defer cancel()
	done := make(chan error, 1)
	go func() { done <- chromedp.Do(actx, chromedp.Navigate(SignerPageURL)) }()
	timer := time.NewTimer(grace)
	defer timer.Stop()
	paused := pagePaused
	for {
		select {
		case err := <-done:
			return err
		case <-paused:
			paused = nil // the request arrived; now wait for the page to load
		case <-timer.C:
			if paused != nil {
				cancel()
				<-done
				return errPageStuck
			}
		}
	}
}

// addScriptTag is JavaScript that runs code in a <script> element, like Playwright's
// addScriptTag.
func addScriptTag(code string) string {
	literal, _ := json.Marshal(code)
	return `(() => { const s = document.createElement("script"); s.textContent = ` + string(literal) +
		`; (document.head || document.documentElement).appendChild(s); })()`
}

func waitForSigner(ctx context.Context) error {
	const check = `typeof window.byted_acrawler?.sign === "function" && typeof window.generateBogus === "function"`
	for {
		ok, err := chromedp.Run(ctx, chromedp.Evaluate[bool](check))
		if err != nil {
			return err
		}
		if ok {
			return nil
		}
		select {
		case <-ctx.Done():
			return fmt.Errorf("TikTok's signing scripts did not load: %w", ctx.Err())
		case <-time.After(100 * time.Millisecond):
		}
	}
}

// route answers a paused request: the page itself is fetched from Go and replaced by a stub on
// the same origin; everything else is blocked.
func (s *Signer) route(page context.Context, client *httpClient, ev fetch.EventRequestPaused) {
	t := chromedp.FromContext(page).Target
	ctx, cancel := context.WithTimeout(page, s.timeout+5*time.Second)
	defer cancel()
	if ev.ResourceType != network.ResourceTypeDocument {
		cdp.Call(ctx, t, fetch.FailRequest, fetch.FailRequestParams{RequestID: ev.RequestID, ErrorReason: network.ErrorReasonAborted})
		return
	}
	if r := ev.Request; r != nil {
		// Half the page load's time at most, so a slow TikTok still leaves time for the stub.
		if _, err := client.do(ctx, "GET", r.URL, requestOptions{timeout: s.timeout / 2}); err != nil {
			// The signature code runs locally; a stub page on the right origin is enough.
			logDebug("signer page fetch failed (%s); using stub page", describe(err))
		} else if cookies := client.jar.all(); len(cookies) > 0 {
			params := make([]*network.CookieParam, len(cookies))
			for i, c := range cookies {
				domain := c.domain
				if !c.hostOnly {
					domain = "." + domain
				}
				params[i] = &network.CookieParam{Name: c.name, Value: c.value, Domain: domain, Path: c.path, Secure: c.secure}
			}
			cdp.Call(ctx, t, network.SetCookies, network.SetCookiesParams{Cookies: params})
		}
	}
	cdp.Call(ctx, t, fetch.FulfillRequest, fetch.FulfillRequestParams{
		RequestID:       ev.RequestID,
		ResponseCode:    200,
		ResponseHeaders: []*fetch.HeaderEntry{{Name: "Content-Type", Value: "text/html"}},
		Body:            []byte(stubHTML),
	})
}

// Sign signs url (a TikTok API URL) and returns the signature, X-Bogus and the signed URL.
func (s *Signer) Sign(ctx context.Context, rawURL string) (Signature, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if err := s.start(ctx); err != nil {
		return Signature{}, err
	}
	u, err := url.Parse(rawURL)
	if err != nil {
		return Signature{}, newValidationError(fmt.Sprintf("invalid URL to sign: %v", err))
	}
	sep := "?"
	if u.RawQuery != "" {
		sep = "&"
	}
	urlFp := rawURL + sep + "verifyFp=" + VerifyFp
	cctx, cancel := withCaller(s.page, ctx)
	defer cancel()
	js := func(v string) string {
		b, _ := json.Marshal(v)
		return string(b)
	}
	token, err := chromedp.Run(cctx, chromedp.Evaluate[string](`window.byted_acrawler.sign({url: `+js(urlFp)+`})`))
	if err != nil {
		return Signature{}, newSigningError("signature generation failed: "+describe(err), err)
	}
	signed := urlFp + "&_signature=" + token
	query, err := chromedp.Run(cctx, chromedp.Evaluate[string](`new URL(`+js(signed)+`).searchParams.toString()`))
	if err != nil {
		return Signature{}, newSigningError("signature generation failed: "+describe(err), err)
	}
	bogus, err := chromedp.Run(cctx, chromedp.Evaluate[string](`window.generateBogus(`+js(query)+`, `+js(s.userAgent)+`)`))
	if err != nil {
		return Signature{}, newSigningError("signature generation failed: "+describe(err), err)
	}
	if token == "" || bogus == "" {
		return Signature{}, newSigningError("signature generation returned an empty value", nil)
	}
	return Signature{Signature: token, XBogus: bogus, VerifyFp: VerifyFp, SignedURL: signed + "&X-Bogus=" + bogus}, nil
}

// Close stops the browser. The signer can be started again.
func (s *Signer) Close() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.closeLocked()
	return nil
}

func (s *Signer) closeLocked() {
	if s.handle != nil {
		s.handle.Close()
	}
	if s.http != nil {
		s.http.close()
	}
	s.handle, s.page, s.http = nil, nil, nil
}

// withCaller derives a context from a chromedp context (so actions run in its tab) that also
// ends when caller does. Use it to apply a caller's cancellation or deadline to one action
// without stopping the browser.
func withCaller(chromedpCtx, caller context.Context) (context.Context, context.CancelFunc) {
	ctx, cancel := context.WithCancel(chromedpCtx)
	if d, ok := caller.Deadline(); ok {
		var cancelDeadline context.CancelFunc
		ctx, cancelDeadline = context.WithDeadline(ctx, d)
		prev := cancel
		cancel = func() { cancelDeadline(); prev() }
	}
	stop := context.AfterFunc(caller, cancel)
	return ctx, func() {
		stop()
		cancel()
	}
}
