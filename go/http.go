package autotok

// A small HTTP client: per-account proxy, a cookie jar, redirects and timeouts.
//
// The proxy is pinned on the client: HTTP(S)_PROXY environment variables are never consulted,
// so they can't send an account through another IP. Redirects are followed here rather than
// by net/http, so every hop's cookies are stored and sent like a browser would.

import (
	"bytes"
	"compress/flate"
	"compress/gzip"
	"compress/zlib"
	"context"
	"crypto/tls"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"slices"
	"strconv"
	"strings"
	"sync"
	"time"
)

const maxRedirects = 10

// networkError: a request failed before a response arrived (connection refused, reset,
// timeout...).
type networkError struct {
	msg   string
	cause error
}

func (e *networkError) Error() string { return e.msg }
func (e *networkError) Unwrap() error { return e.cause }

type httpResponse struct {
	status int
	header http.Header
	body   []byte
	url    string
}

func (r *httpResponse) text() string { return string(r.body) }

// json returns the parsed JSON body (numbers as json.Number), or nil if it isn't JSON.
func (r *httpResponse) json() any {
	dec := json.NewDecoder(bytes.NewReader(r.body))
	dec.UseNumber()
	var v any
	if err := dec.Decode(&v); err != nil {
		return nil
	}
	if dec.More() {
		return nil
	}
	return v
}

// storedCookie is one cookie in a cookieJar.
type storedCookie struct {
	name, value string
	// domain has no leading dot. Host-only cookies are sent to domain exactly; domain cookies
	// also to its subdomains.
	domain   string
	hostOnly bool
	path     string
	secure   bool
	expires  time.Time // zero for session cookies
}

func (c *storedCookie) expired(now time.Time) bool {
	return !c.expires.IsZero() && !c.expires.After(now)
}

// cookieJar is just enough of RFC 6265 for TikTok: domain/path matching, expiry, replacement.
type cookieJar struct {
	mu      sync.Mutex
	cookies []storedCookie
}

// set sets a cookie. A domain with a leading dot (".tiktok.com" when domain is "") covers
// subdomains.
func (j *cookieJar) set(name, value, domain, path string) {
	if domain == "" {
		domain = ".tiktok.com"
	}
	if path == "" {
		path = "/"
	}
	j.put(storedCookie{
		name: name, value: value, path: path,
		domain:   strings.ToLower(strings.TrimPrefix(domain, ".")),
		hostOnly: !strings.HasPrefix(domain, "."),
	})
}

// get returns the value of the most recently set cookie called name.
func (j *cookieJar) get(name string) string {
	j.mu.Lock()
	defer j.mu.Unlock()
	now := time.Now()
	for i := len(j.cookies) - 1; i >= 0; i-- {
		if c := j.cookies[i]; c.name == name && !c.expired(now) {
			return c.value
		}
	}
	return ""
}

func (j *cookieJar) all() []storedCookie {
	j.mu.Lock()
	defer j.mu.Unlock()
	now := time.Now()
	var out []storedCookie
	for _, c := range j.cookies {
		if !c.expired(now) {
			out = append(out, c)
		}
	}
	return out
}

// header is the Cookie header for a request to u ("" if no cookie applies).
func (j *cookieJar) header(u *url.URL) string {
	j.mu.Lock()
	defer j.mu.Unlock()
	host := strings.ToLower(u.Hostname())
	now := time.Now()
	var matched []storedCookie
	for _, c := range j.cookies {
		if !c.expired(now) && domainMatches(host, c) && pathMatches(requestPath(u), c.path) &&
			(!c.secure || u.Scheme == "https") {
			matched = append(matched, c)
		}
	}
	slices.SortStableFunc(matched, func(a, b storedCookie) int { return len(b.path) - len(a.path) })
	pairs := make([]string, len(matched))
	for i, c := range matched {
		pairs[i] = c.name + "=" + c.value
	}
	return strings.Join(pairs, "; ")
}

// store saves the Set-Cookie headers of a response to u.
func (j *cookieJar) store(u *url.URL, setCookie []string) {
	for _, line := range setCookie {
		if c, ok := parseSetCookie(u, line); ok {
			j.put(c)
		}
	}
}

func (j *cookieJar) put(cookie storedCookie) {
	j.mu.Lock()
	defer j.mu.Unlock()
	kept := j.cookies[:0]
	for _, c := range j.cookies {
		if !(c.name == cookie.name && c.domain == cookie.domain && c.path == cookie.path) {
			kept = append(kept, c)
		}
	}
	j.cookies = kept
	if !cookie.expired(time.Now()) {
		j.cookies = append(j.cookies, cookie)
	}
}

func domainMatches(host string, c storedCookie) bool {
	if c.hostOnly {
		return host == c.domain
	}
	return host == c.domain || strings.HasSuffix(host, "."+c.domain)
}

func pathMatches(requestPath, cookiePath string) bool {
	if requestPath == cookiePath {
		return true
	}
	if !strings.HasPrefix(requestPath, cookiePath) {
		return false
	}
	return strings.HasSuffix(cookiePath, "/") || requestPath[len(cookiePath)] == '/'
}

func requestPath(u *url.URL) string {
	if p := u.EscapedPath(); p != "" {
		return p
	}
	return "/"
}

func defaultCookiePath(u *url.URL) string {
	path := requestPath(u)
	last := strings.LastIndex(path, "/")
	if !strings.HasPrefix(path, "/") || last == 0 {
		return "/"
	}
	return path[:last]
}

// isInteger matches /^-?\d+$/.
func isInteger(s string) bool {
	if s == "" {
		return false
	}
	if s[0] == '-' {
		s = s[1:]
	}
	if s == "" {
		return false
	}
	for i := 0; i < len(s); i++ {
		if s[i] < '0' || s[i] > '9' {
			return false
		}
	}
	return true
}

func parseSetCookie(u *url.URL, line string) (storedCookie, bool) {
	parts := strings.Split(line, ";")
	name, value, ok := strings.Cut(parts[0], "=")
	if !ok || strings.TrimSpace(name) == "" {
		return storedCookie{}, false
	}
	host := strings.ToLower(u.Hostname())
	c := storedCookie{
		name: strings.TrimSpace(name), value: strings.TrimSpace(value),
		domain: host, hostOnly: true, path: defaultCookiePath(u),
	}
	maxAge, hasMaxAge := 0, false
	for _, attribute := range parts[1:] {
		key, val, _ := strings.Cut(attribute, "=")
		key = strings.ToLower(strings.TrimSpace(key))
		val = strings.TrimSpace(val)
		switch {
		case key == "domain" && val != "":
			domain := strings.ToLower(strings.TrimPrefix(val, "."))
			// Ignore cookies for other sites, like a browser would.
			if host != domain && !strings.HasSuffix(host, "."+domain) {
				return storedCookie{}, false
			}
			c.domain = domain
			c.hostOnly = false
		case key == "path" && strings.HasPrefix(val, "/"):
			c.path = val
		case key == "secure":
			c.secure = true
		case key == "max-age" && isInteger(val):
			if n, err := strconv.Atoi(val); err == nil {
				maxAge, hasMaxAge = n, true
			}
		case key == "expires":
			if t, err := http.ParseTime(val); err == nil {
				c.expires = t
			} else if t, err := time.Parse("Mon, 02-Jan-2006 15:04:05 MST", val); err == nil {
				c.expires = t
			}
		}
	}
	if hasMaxAge {
		c.expires = time.Now().Add(time.Duration(maxAge) * time.Second)
		if maxAge <= 0 {
			c.expires = time.Unix(1, 0)
		}
	}
	return c, true
}

type httpClientOptions struct {
	proxy *Proxy
	// headers are sent with every request unless a request sets the same header.
	headers map[string]string
	// jar collects and sends cookies; nil sends none.
	jar     *cookieJar
	timeout time.Duration
}

type httpClient struct {
	jar     *cookieJar
	timeout time.Duration
	headers map[string]string
	client  *http.Client
}

// Tests replace these to reach local servers instead of TikTok.
var (
	testDialHook  dialFunc
	testTLSConfig *tls.Config
)

func newHTTPTransport(proxy *Proxy) *http.Transport {
	t := &http.Transport{
		DialContext:           directDialer.DialContext,
		TLSHandshakeTimeout:   20 * time.Second,
		MaxIdleConnsPerHost:   4,
		IdleConnTimeout:       90 * time.Second,
		ExpectContinueTimeout: time.Second,
		// Responses are decoded by httpClient, which asks for the same encodings as the other
		// packages.
		DisableCompression: true,
	}
	switch {
	case testDialHook != nil:
		t.DialContext = testDialHook
		t.TLSClientConfig = testTLSConfig
	case proxy == nil:
	case proxy.Scheme == "http" || proxy.Scheme == "https":
		u := &url.URL{Scheme: proxy.Scheme, Host: proxy.hostPort()}
		if proxy.Username != "" {
			u.User = url.UserPassword(proxy.Username, proxy.password)
		}
		t.Proxy = http.ProxyURL(u)
	default:
		t.DialContext = proxyDialer(proxy)
	}
	return t
}

func newHTTPClient(o httpClientOptions) *httpClient {
	if o.timeout <= 0 {
		o.timeout = 60 * time.Second
	}
	headers := map[string]string{}
	for k, v := range o.headers {
		headers[strings.ToLower(k)] = v
	}
	return &httpClient{
		jar:     o.jar,
		timeout: o.timeout,
		headers: headers,
		client: &http.Client{
			Transport: newHTTPTransport(o.proxy),
			CheckRedirect: func(*http.Request, []*http.Request) error {
				return http.ErrUseLastResponse
			},
		},
	}
}

type requestOptions struct {
	headers map[string]string
	body    []byte
	hasBody bool
	timeout time.Duration
}

var redirectStatuses = map[int]bool{301: true, 302: true, 303: true, 307: true, 308: true}

// do sends a request, following redirects. It returns a *networkError when no response arrives.
func (c *httpClient) do(ctx context.Context, method, rawURL string, o requestOptions) (*httpResponse, error) {
	method = strings.ToUpper(method)
	timeout := c.timeout
	if o.timeout > 0 {
		timeout = o.timeout
	}
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	headers := map[string]string{}
	for k, v := range c.headers {
		headers[k] = v
	}
	for k, v := range o.headers {
		headers[strings.ToLower(k)] = v
	}
	body, hasBody := o.body, o.hasBody
	current, err := url.Parse(rawURL)
	if err != nil {
		return nil, &networkError{msg: fmt.Sprintf("%s %s: bad URL: %v", method, rawURL, err), cause: err}
	}

	for hop := 0; ; hop++ {
		var reader io.Reader
		if hasBody {
			reader = bytes.NewReader(body)
		}
		req, err := http.NewRequestWithContext(ctx, method, current.String(), reader)
		if err != nil {
			return nil, &networkError{msg: fmt.Sprintf("%s %s: %v", method, origin(current), err), cause: err}
		}
		for k, v := range headers {
			req.Header.Set(k, v)
		}
		if _, ok := headers["accept-encoding"]; !ok {
			req.Header.Set("Accept-Encoding", "gzip, deflate")
		}
		if c.jar != nil {
			if cookie := c.jar.header(current); cookie != "" {
				req.Header.Set("Cookie", cookie)
			}
		}

		resp, err := c.client.Do(req)
		var raw []byte
		if err == nil {
			raw, err = io.ReadAll(resp.Body)
			resp.Body.Close()
		}
		if err != nil {
			reason := describe(err)
			if errors.Is(ctx.Err(), context.DeadlineExceeded) {
				reason = fmt.Sprintf("timed out after %s", timeout)
			}
			return nil, &networkError{msg: fmt.Sprintf("%s %s: %s", method, origin(current), reason), cause: err}
		}
		if c.jar != nil {
			c.jar.store(current, resp.Header.Values("Set-Cookie"))
		}

		location := resp.Header.Get("Location")
		if redirectStatuses[resp.StatusCode] && location != "" && hop < maxRedirects {
			next, err := current.Parse(location)
			if err == nil {
				if (resp.StatusCode == 303 && method != "HEAD") ||
					((resp.StatusCode == 301 || resp.StatusCode == 302) && method == "POST") {
					method = "GET"
					body, hasBody = nil, false
					delete(headers, "content-type")
					delete(headers, "content-length")
				}
				if originOf(next) != originOf(current) {
					delete(headers, "authorization")
				}
				current = next
				continue
			}
		}
		return &httpResponse{
			status: resp.StatusCode,
			header: resp.Header,
			body:   decodeBody(raw, resp.Header.Get("Content-Encoding")),
			url:    current.String(),
		}, nil
	}
}

func (c *httpClient) close() { c.client.CloseIdleConnections() }

func origin(u *url.URL) string { return u.Scheme + "://" + u.Host + u.EscapedPath() }

func originOf(u *url.URL) string { return strings.ToLower(u.Scheme + "://" + u.Host) }

func decodeBody(body []byte, encoding string) []byte {
	if len(body) == 0 || encoding == "" {
		return body
	}
	var r io.ReadCloser
	var err error
	switch strings.ToLower(strings.TrimSpace(encoding)) {
	case "gzip", "x-gzip":
		r, err = gzip.NewReader(bytes.NewReader(body))
	case "deflate":
		r, err = zlib.NewReader(bytes.NewReader(body))
		if err != nil {
			r, err = flate.NewReader(bytes.NewReader(body)), nil
		}
	default:
		return body
	}
	if err != nil {
		return body
	}
	defer r.Close()
	out, err := io.ReadAll(r)
	if err != nil {
		return body
	}
	return out
}

// describe is a short description of an error for messages.
func describe(err error) string {
	var ue *url.Error
	if errors.As(err, &ue) {
		err = ue.Err
	}
	var oe *net.OpError
	if errors.As(err, &oe) && oe.Err != nil {
		return oe.Op + ": " + oe.Err.Error()
	}
	return err.Error()
}

// CheckProxy makes a request through proxy (a proxy string; "" for a direct connection) and
// returns the public IP TikTok will see.
func CheckProxy(ctx context.Context, proxy string) (string, error) {
	p, err := ParseProxy(proxy)
	if err != nil {
		return "", err
	}
	return checkProxy(ctx, p)
}

func checkProxy(ctx context.Context, p *Proxy) (string, error) {
	label := "direct connection"
	if p != nil {
		label = p.Masked()
	}
	client := newHTTPClient(httpClientOptions{proxy: p, timeout: 15 * time.Second})
	defer client.close()
	r, err := client.do(ctx, "GET", IPEchoURL, requestOptions{headers: map[string]string{"accept": "application/json"}})
	if err == nil && r.status != 200 {
		err = fmt.Errorf("HTTP %d", r.status)
	}
	var ip string
	if err == nil {
		if data, ok := r.json().(map[string]any); ok {
			ip, _ = data["ip"].(string)
		}
		if ip == "" {
			err = fmt.Errorf("unexpected response")
		}
	}
	if err != nil {
		return "", &baseAutotokError{baseError{msg: fmt.Sprintf("proxy check failed for %s: %s", label, describe(err)), cause: err}}
	}
	return ip, nil
}

// baseAutotokError is a plain autotok error (the Python package's AutotokError).
type baseAutotokError struct{ baseError }

func (*baseAutotokError) Retryable() bool { return false }
