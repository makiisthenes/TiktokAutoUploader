package autotok

// Logging in to TikTok and saving the session.
//
// Login opens a real Chrome window on TikTok's login page, routed through the account's proxy,
// and waits until TikTok sets the sessionid cookie. The cookies and the browser's user agent
// are saved, so later uploads present the same browser identity that created the session.
//
// With a cloud browser (AUTOTOK_BROWSER=browserbase or steel) the browser runs remotely
// instead, and you log in through its live view link from your own browser.

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/chromedp/cdproto/network"
	cdppage "github.com/chromedp/cdproto/page"
	"github.com/chromedp/cdproto/storage"
	"github.com/chromedp/cdproto/target"
	"github.com/chromedp/chromedp"
)

// LoginOptions configure Login and OpenLoginSession.
type LoginOptions struct {
	// Proxy is the account's proxy string ("" for none). Login saves it with the account.
	Proxy string
	// Timeout is how long to wait for the login (default 10 minutes); negative waits until the
	// window is closed.
	Timeout time.Duration
	// OnLiveURL receives the link to log in through, with a cloud browser (default: logged as a
	// warning).
	OnLiveURL func(url string)
	// Store is where Login saves the account (default: AccountsDir()).
	Store *AccountStore
	// Browser is the browser provider to use ("" for AUTOTOK_BROWSER's).
	Browser string
}

// waitForSessionCookies polls getCookies until sessionid and tt-target-idc are set, and returns
// every TikTok cookie at that moment. It fails with a *LoginError on timeout, when ctx ends, or
// when the browser is closed. A negative timeout waits for ever.
func waitForSessionCookies(ctx context.Context, getCookies func(context.Context) ([]Cookie, error),
	pollInterval, timeout time.Duration) ([]Cookie, error) {
	start := time.Now()
	for {
		if ctx.Err() != nil {
			return nil, newLoginError("login cancelled", ctx.Err())
		}
		cookies, err := getCookies(ctx)
		if err != nil {
			if ctx.Err() != nil {
				return nil, newLoginError("login cancelled", ctx.Err())
			}
			return nil, newLoginError(fmt.Sprintf("the browser was closed before login finished (%s)", describe(err)), err)
		}
		have := map[string]bool{}
		for _, c := range cookies {
			if c.Value != "" {
				have[c.Name] = true
			}
		}
		if have[SessionCookie] && have[DatacenterCookie] {
			var out []Cookie
			for _, c := range cookies {
				if strings.Contains(c.Domain, "tiktok") {
					out = append(out, c)
				}
			}
			return out, nil
		}
		if timeout >= 0 && time.Since(start) > timeout {
			return nil, newLoginError(fmt.Sprintf("timed out after %ds waiting for TikTok login", int(timeout.Seconds())), nil)
		}
		select {
		case <-ctx.Done():
		case <-time.After(pollInterval):
		}
	}
}

// browserCookie converts a cookie Chrome reports to the saved form, with the fields Playwright
// saves (so the files match the other packages').
func browserCookie(c *network.Cookie) Cookie {
	raw := func(v any) json.RawMessage {
		b, _ := json.Marshal(v)
		return b
	}
	sameSite := string(c.SameSite)
	if sameSite == "" {
		sameSite = "Lax"
	}
	return Cookie{
		Name: c.Name, Value: c.Value, Domain: c.Domain, Path: c.Path,
		Extra: map[string]json.RawMessage{
			"expires":  raw(c.Expires),
			"httpOnly": raw(c.HTTPOnly),
			"secure":   raw(c.Secure),
			"sameSite": raw(sameSite),
		},
	}
}

// OpenLoginSession opens a browser for the user to log in, and returns the TikTok cookies and
// the browser's user agent once they have.
func OpenLoginSession(ctx context.Context, opts *LoginOptions) ([]Cookie, string, error) {
	if opts == nil {
		opts = &LoginOptions{}
	}
	p, err := ParseProxy(opts.Proxy)
	if err != nil {
		return nil, "", err
	}
	timeout := opts.Timeout
	if timeout == 0 {
		timeout = 10 * time.Minute
	}
	session := timeout
	if session < 0 {
		session = time.Hour
	}
	handle, err := OpenBrowser(ctx, opts.Browser, OpenOptions{Visible: true, Proxy: p, Timeout: session + 5*time.Minute})
	if err != nil {
		return nil, "", err
	}
	defer handle.Close()
	page := handle.Page()
	pageID := chromedp.FromContext(page).Target.TargetID

	loadCtx, cancel := context.WithTimeout(ctx, time.Minute)
	cctx, stop := withCaller(page, loadCtx)
	// TikTok's page keeps loading for a while; the login only needs the document, so this
	// doesn't wait for the load event.
	err = retryAborted(cctx, func() error {
		res, err := chromedp.Call(cctx, cdppage.Navigate, cdppage.NavigateParams{URL: TikTokLoginURL})
		if err == nil && res.ErrorText != "" {
			err = &chromedp.LoadError{ErrorText: res.ErrorText}
		}
		return err
	})
	var userAgent string
	if err == nil {
		userAgent, err = waitForDocument(cctx)
	}
	stop()
	cancel()
	if err != nil {
		if ctx.Err() != nil {
			return nil, "", newLoginError("login cancelled", ctx.Err())
		}
		hint := ""
		if p != nil {
			hint = " (check the proxy)"
		}
		return nil, "", newLoginError(fmt.Sprintf("could not open TikTok's login page%s: %s", hint, describe(err)), err)
	}

	if handle.IsRemote() {
		link, err := handle.LiveViewURL(ctx)
		if err != nil {
			return nil, "", err
		}
		if opts.OnLiveURL != nil {
			opts.OnLiveURL(link)
		} else {
			logWarn("Open this link in your browser and log in to TikTok there:\n  %s", link)
		}
	}

	browser := handle.Browser()
	getCookies := func(ctx context.Context) ([]Cookie, error) {
		bctx, stop := withCaller(browser, ctx)
		defer stop()
		if _, err := chromedp.CallBrowser(bctx, target.GetTargetInfo, target.GetTargetInfoParams{TargetID: pageID}); err != nil {
			return nil, errors.New("page closed")
		}
		if handle.IsRemote() {
			keepLoginTabInFront(bctx, pageID)
		}
		res, err := chromedp.CallBrowser(bctx, storage.GetCookies, storage.GetCookiesParams{})
		if err != nil {
			return nil, err
		}
		cookies := make([]Cookie, 0, len(res.Cookies))
		for _, c := range res.Cookies {
			cookies = append(cookies, browserCookie(c))
		}
		return cookies, nil
	}
	cookies, err := waitForSessionCookies(ctx, getCookies, time.Second, timeout)
	if err != nil {
		return nil, "", err
	}
	return cookies, userAgent, nil
}

// retryAborted runs navigate, again if Chrome aborted it: the first navigation of a new tab can
// race the tab's own start (net::ERR_ABORTED).
func retryAborted(ctx context.Context, navigate func() error) error {
	for attempt := 1; ; attempt++ {
		err := navigate()
		var le *chromedp.LoadError
		if attempt == 3 || !errors.As(err, &le) || le.ErrorText != "net::ERR_ABORTED" {
			return err
		}
		select {
		case <-ctx.Done():
			return err
		case <-time.After(200 * time.Millisecond):
		}
	}
}

// waitForDocument waits until the page has a document on TikTok, and returns the browser's user
// agent.
func waitForDocument(ctx context.Context) (string, error) {
	for {
		state, err := chromedp.Run(ctx, chromedp.Evaluate[[]string](
			`[location.hostname, document.readyState, navigator.userAgent]`))
		if err == nil && len(state) == 3 && strings.HasSuffix(state[0], "tiktok.com") && state[1] != "loading" {
			return state[2], nil
		}
		select {
		case <-ctx.Done():
			if err != nil {
				return "", err
			}
			return "", ctx.Err()
		case <-time.After(250 * time.Millisecond):
		}
	}
}

// keepLoginTabInFront closes popups in a cloud browser: live views show only the login tab, so
// a popup (e.g. "Continue with Google") would be invisible and steal focus from it.
func keepLoginTabInFront(ctx context.Context, loginID target.ID) {
	res, err := chromedp.CallBrowser(ctx, target.GetTargets, target.GetTargetsParams{})
	if err != nil {
		return
	}
	closed := false
	for _, t := range res.TargetInfos {
		if t.Type == "page" && t.TargetID != loginID {
			if _, err := chromedp.CallBrowser(ctx, target.CloseTarget, target.CloseTargetParams{TargetID: t.TargetID}); err == nil {
				closed = true
			}
		}
	}
	if closed {
		logWarn("Closed a popup window: popups (e.g. 'Continue with Google') can't be shown in the live view. " +
			"Log in with the QR code, email/username or phone instead.")
		chromedp.CallBrowser(ctx, target.ActivateTarget, target.ActivateTargetParams{TargetID: loginID})
	}
}

// Login opens a browser window, waits for the user to log in to TikTok, and saves the session
// as name.
//
//	acct, err := autotok.Login(ctx, "alice", &autotok.LoginOptions{Proxy: "http://user:pass@gate.example.com:7000"})
func Login(ctx context.Context, name string, opts *LoginOptions) (*Account, error) {
	if opts == nil {
		opts = &LoginOptions{}
	}
	if err := ValidateAccountName(name); err != nil {
		return nil, err
	}
	p, err := ParseProxy(opts.Proxy)
	if err != nil {
		return nil, err
	}
	cookies, userAgent, err := OpenLoginSession(ctx, opts)
	if err != nil {
		return nil, err
	}
	proxy := ""
	if p != nil {
		proxy = p.URL()
	}
	acct, err := NewAccount(name, cookies, userAgent, proxy)
	if err != nil {
		return nil, err
	}
	if _, err := opts.Store.Save(acct); err != nil {
		return nil, err
	}
	logInfo("Saved session for '%s'", name)
	return acct, nil
}

// ImportSession saves a sessionid cookie copied from a browser (no browser needed).
func ImportSession(name, sessionID string, opts SessionAccountOptions, store *AccountStore) (*Account, error) {
	acct, err := NewAccountFromSessionID(name, sessionID, opts)
	if err != nil {
		return nil, err
	}
	if _, err := store.Save(acct); err != nil {
		return nil, err
	}
	return acct, nil
}
