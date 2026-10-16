package autotok

// Proxy parsing and helpers.
//
// One proxy is applied to everything autotok does for an account: the login browser, the
// signature fetch and every upload request. That keeps TikTok seeing a single IP per account.
//
// Accepted formats (the scheme defaults to http):
//
//	http://user:pass@host:port
//	socks5://user:pass@host:port
//	host:port
//	user:pass@host:port
//	host:port:user:pass          // the export format most proxy providers use
//
// Parsing follows the Python package exactly, so a proxy string saved by any of the packages
// means the same thing to all of them.

import (
	"errors"
	"fmt"
	"net/url"
	"regexp"
	"slices"
	"strconv"
	"strings"
)

// SupportedProxySchemes are the proxy types autotok understands.
var SupportedProxySchemes = []string{"http", "https", "socks5", "socks5h", "socks4"}

// IPEchoURL is what CheckProxy asks for the exit IP.
const IPEchoURL = "https://api.ipify.org?format=json"

// Proxy is a parsed proxy. Its password is unexported, so it never shows up when the proxy is
// printed (String and GoString mask it) or encoded as JSON.
type Proxy struct {
	Scheme   string
	Host     string
	Port     int
	Username string
	password string
}

// NewProxy builds a proxy from its parts.
func NewProxy(scheme, host string, port int, username, password string) (*Proxy, error) {
	return buildProxy(scheme, host, strconv.Itoa(port), username, password, host)
}

// ParseProxy parses a proxy string in any accepted format. An empty or blank string gives nil
// and no error: no proxy.
func ParseProxy(value string) (*Proxy, error) {
	raw := strings.TrimSpace(value)
	if raw == "" {
		return nil, nil
	}
	if !strings.Contains(raw, "://") {
		parts := strings.Split(raw, ":")
		// host:port:user:pass (no '@'). Passwords containing ':' are kept intact.
		if !strings.Contains(raw, "@") && len(parts) >= 4 {
			return buildProxy("http", parts[0], parts[1], parts[2], strings.Join(parts[3:], ":"), raw)
		}
		raw = "http://" + raw
	}
	split, err := urlsplit(raw)
	if err != nil {
		return nil, newValidationError(fmt.Sprintf("invalid proxy '%s': %s", MaskProxyString(value), err))
	}
	scheme := split.scheme
	if scheme == "" {
		scheme = "http"
	}
	return buildProxy(scheme, split.hostname, split.port, split.username, split.password, value)
}

// Password returns the proxy password ("" for none).
func (p *Proxy) Password() string { return p.password }

// URL is the full URL including credentials, e.g. http://user:pass@host:8080.
func (p *Proxy) URL() string { return p.Scheme + "://" + p.auth(false) + p.hostPort() }

// Masked is the URL with the password replaced by ****, safe for logs and UIs.
func (p *Proxy) Masked() string { return p.Scheme + "://" + p.auth(true) + p.hostPort() }

// String is the masked URL, so printing a proxy never leaks its password.
func (p *Proxy) String() string { return p.Masked() }

// GoString keeps %#v from printing the password.
func (p *Proxy) GoString() string { return fmt.Sprintf("autotok.Proxy(%q)", p.Masked()) }

// MarshalText encodes the masked URL.
func (p *Proxy) MarshalText() ([]byte, error) { return []byte(p.Masked()), nil }

// address is host:port, with brackets around IPv6 hosts.
func (p *Proxy) hostPort() string {
	if strings.Contains(p.Host, ":") {
		return "[" + p.Host + "]:" + strconv.Itoa(p.Port)
	}
	return p.Host + ":" + strconv.Itoa(p.Port)
}

func (p *Proxy) auth(mask bool) string {
	if p.Username == "" {
		return ""
	}
	user := quote(p.Username)
	if p.password == "" {
		return user + "@"
	}
	if mask {
		return user + ":****@"
	}
	return user + ":" + quote(p.password) + "@"
}

// chromeServer is the --proxy-server value for Chromium (which takes no credentials).
func (p *Proxy) chromeServer() string {
	scheme := p.Scheme
	if scheme == "socks5h" {
		scheme = "socks5"
	}
	return scheme + "://" + p.hostPort()
}

func buildProxy(scheme, host, port, username, password, original string) (*Proxy, error) {
	if !slices.Contains(SupportedProxySchemes, scheme) {
		return nil, newValidationError(fmt.Sprintf("unsupported proxy scheme '%s' (use one of: %s)",
			scheme, strings.Join(SupportedProxySchemes, ", ")))
	}
	if host == "" {
		return nil, newValidationError(fmt.Sprintf("invalid proxy '%s': missing host", MaskProxyString(original)))
	}
	n, err := parsePort(port)
	if err != nil {
		return nil, newValidationError(fmt.Sprintf("invalid proxy '%s': missing or bad port", MaskProxyString(original)))
	}
	if n <= 0 || n >= 65536 {
		return nil, newValidationError(fmt.Sprintf("invalid proxy '%s': port out of range", MaskProxyString(original)))
	}
	return &Proxy{Scheme: scheme, Host: host, Port: n, Username: username, password: password}, nil
}

var portRE = regexp.MustCompile(`^\s*[+-]?\d+\s*$`)

// parsePort accepts what Python's int() does for a port: optional sign and surrounding spaces.
func parsePort(s string) (int, error) {
	if !portRE.MatchString(s) {
		return 0, fmt.Errorf("bad port")
	}
	n, err := strconv.Atoi(strings.TrimPrefix(strings.TrimSpace(s), "+"))
	if err != nil {
		return 0, err
	}
	return n, nil
}

type splitURL struct {
	scheme, hostname, port, username, password string
}

var urlStartRE = regexp.MustCompile(`^([A-Za-z][A-Za-z0-9+.-]*)://([^/?#]*)`)
var digitsRE = regexp.MustCompile(`^[0-9]+$`)

// urlsplit is the part of Python's urllib.parse.urlsplit that proxy parsing uses.
func urlsplit(raw string) (splitURL, error) {
	m := urlStartRE.FindStringSubmatch(raw)
	if m == nil {
		return splitURL{}, fmt.Errorf("not a URL")
	}
	out := splitURL{scheme: strings.ToLower(m[1])}
	netloc := m[2]

	at := strings.LastIndex(netloc, "@")
	if at != -1 {
		userinfo := netloc[:at]
		user, pass, hasPass := strings.Cut(userinfo, ":")
		out.username = unquote(user)
		if hasPass {
			out.password = unquote(pass)
		}
	}

	hostinfo := netloc[at+1:]
	var port string
	if bracket := strings.Index(hostinfo, "["); bracket != -1 {
		bracketed := hostinfo[bracket+1:]
		host, rest, closed := strings.Cut(bracketed, "]")
		out.hostname = host
		if closed {
			if _, p, ok := strings.Cut(rest, ":"); ok {
				port = p
			}
		}
	} else {
		host, p, _ := strings.Cut(hostinfo, ":")
		out.hostname = host
		port = p
	}
	// Never quote the port text: it can hold the password (http://host:port:user:pass).
	if port != "" && !digitsRE.MatchString(port) {
		return splitURL{}, errors.New("missing or bad port")
	}
	if port != "" {
		if n, err := strconv.Atoi(port); err != nil || n > 65535 {
			return splitURL{}, errors.New("port out of range")
		}
	}
	out.hostname = strings.ToLower(out.hostname)
	out.port = port
	return out, nil
}

// quote is Python's urllib.parse.quote(value, safe=""): everything but A-Z a-z 0-9 - _ . ~ is
// percent-encoded.
func quote(value string) string {
	var b strings.Builder
	for i := 0; i < len(value); i++ {
		c := value[i]
		if 'A' <= c && c <= 'Z' || 'a' <= c && c <= 'z' || '0' <= c && c <= '9' ||
			c == '-' || c == '_' || c == '.' || c == '~' {
			b.WriteByte(c)
		} else {
			fmt.Fprintf(&b, "%%%02X", c)
		}
	}
	return b.String()
}

func unquote(value string) string {
	if s, err := url.PathUnescape(value); err == nil {
		return s
	}
	return value
}

// MaskProxyString hides the password in a proxy string that may not parse, for error messages.
func MaskProxyString(value string) string {
	if at := strings.LastIndex(value, "@"); at != -1 {
		creds, rest := value[:at], value[at+1:]
		scheme := ""
		if sep := strings.LastIndex(creds, "://"); sep != -1 {
			scheme, creds = creds[:sep+3], creds[sep+3:]
		}
		user, _, _ := strings.Cut(creds, ":")
		return scheme + user + ":****@" + rest
	}
	if parts := strings.Split(value, ":"); len(parts) >= 4 {
		return strings.Join(append(parts[:3:3], "****"), ":")
	}
	return value
}
