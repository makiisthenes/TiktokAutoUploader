package autotok

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"testing"
)

// Expected values come from the Python package (autotok.proxy.Proxy), so all packages parse
// alike.
var pythonProxies = []struct {
	raw, url, username, password string
	port                         int
}{
	{"host.example:8000", "http://host.example:8000", "", "", 8000},
	{"http://host.example:80", "http://host.example:80", "", "", 80},
	{"HTTP://User:P%40ss@Host.Example:8000/path?q=1", "http://User:P%40ss@host.example:8000", "User", "P@ss", 8000},
	{"host.example:8000:user:pa:ss", "http://user:pa%3Ass@host.example:8000", "user", "pa:ss", 8000},
	{"host.example:8000:us er:p!a*s(s)~", "http://us%20er:p%21a%2As%28s%29~@host.example:8000", "us er", "p!a*s(s)~", 8000},
	{"socks5h://[::1]:1080", "socks5h://[::1]:1080", "", "", 1080},
	{"https://u:p%40w@h.example:443", "https://u:p%40w@h.example:443", "u", "p@w", 443},
	{"user@host.example:3128", "http://user@host.example:3128", "user", "", 3128},
	{"socks4://10.0.0.1:1080", "socks4://10.0.0.1:1080", "", "", 1080},
	{"user:pass@host.example:8000", "http://user:pass@host.example:8000", "user", "pass", 8000},
	{"socks5://u:p@10.0.0.1:1080", "socks5://u:p@10.0.0.1:1080", "u", "p", 1080},
}

func TestProxyParsesLikeThePythonPackage(t *testing.T) {
	for _, c := range pythonProxies {
		p, err := ParseProxy(c.raw)
		if err != nil {
			t.Errorf("%s: %v", c.raw, err)
			continue
		}
		if p.URL() != c.url || p.Username != c.username || p.Password() != c.password || p.Port != c.port {
			t.Errorf("%s: got %s %q %q %d", c.raw, p.URL(), p.Username, p.Password(), p.Port)
		}
	}
}

func TestProxyPasswordNeverShowsUp(t *testing.T) {
	p, _ := ParseProxy("http://user:topsecret@h.example:8000")
	if p.Masked() != "http://user:****@h.example:8000" {
		t.Errorf("masked: %s", p.Masked())
	}
	b, _ := json.Marshal(p)
	for _, shown := range []string{fmt.Sprint(p), fmt.Sprintf("%v", p), fmt.Sprintf("%+v", p), fmt.Sprintf("%#v", p), p.String(), string(b)} {
		if strings.Contains(shown, "topsecret") {
			t.Errorf("leaked: %s", shown)
		}
	}
}

func TestProxyChromeServer(t *testing.T) {
	p, _ := ParseProxy("socks5h://h.example:1080")
	if p.chromeServer() != "socks5://h.example:1080" {
		t.Error(p.chromeServer())
	}
	p, _ = ParseProxy("http://u:p@[::1]:8000")
	if p.chromeServer() != "http://[::1]:8000" {
		t.Error(p.chromeServer())
	}
}

func TestInvalidProxies(t *testing.T) {
	for _, bad := range []string{"ftp://h:1", "h.example", "h.example:99999", "http://:80", "h.example:0", "h.example:abc:user:pass"} {
		var ve *ValidationError
		if _, err := ParseProxy(bad); !errors.As(err, &ve) {
			t.Errorf("%q: %v", bad, err)
		}
	}
	if p, err := ParseProxy("  "); p != nil || err != nil {
		t.Errorf("blank: %v %v", p, err)
	}
}

func TestProxyErrorsMaskThePassword(t *testing.T) {
	// The second is the provider format with a scheme added, which isn't valid.
	for _, bad := range []string{"http://user:topsecret@h.example:99999", "http://h.example:8000:user:topsecret"} {
		_, err := ParseProxy(bad)
		if err == nil || strings.Contains(err.Error(), "topsecret") {
			t.Errorf("%s: %v", bad, err)
		}
	}
	if got := MaskProxyString("h.example:1:user:topsecret"); got != "h.example:1:user:****" {
		t.Error(got)
	}
}
