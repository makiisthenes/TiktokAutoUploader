package autotok

import (
	"bufio"
	"bytes"
	"compress/gzip"
	"context"
	"encoding/base64"
	"encoding/binary"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"
)

func TestCookieJar(t *testing.T) {
	jar := &cookieJar{}
	jar.set("sessionid", "s", "", "")
	www, _ := url.Parse("https://www.tiktok.com/api/x")
	jar.store(www, []string{
		"msToken=MS1; Domain=.tiktok.com; Path=/",
		"hostonly=1; Path=/",
		"scoped=1; Path=/api",
		"other=1; Domain=evil.example; Path=/",
	})
	header := func(raw string) string {
		u, _ := url.Parse(raw)
		return jar.header(u)
	}
	if got := header("https://www.tiktok.com/api/x"); got != "scoped=1; sessionid=s; msToken=MS1; hostonly=1" {
		t.Error(got)
	}
	if got := header("https://upload.tiktok.com/"); got != "sessionid=s; msToken=MS1" {
		t.Error(got)
	}
	if got := header("https://www.tiktok.com/apis"); got != "sessionid=s; msToken=MS1; hostonly=1" {
		t.Error(got)
	}
	if got := header("https://tiktok.com.evil.example/"); got != "" {
		t.Error(got)
	}
	jar.store(www, []string{"msToken=MS2; Domain=tiktok.com; Path=/"})
	if jar.get("msToken") != "MS2" {
		t.Error(jar.get("msToken"))
	}
	jar.store(www, []string{"msToken=; Domain=.tiktok.com; Path=/; Max-Age=0"})
	if jar.get("msToken") != "" {
		t.Error("expired cookie kept")
	}
}

func TestRedirectsKeepCookiesAndDropCredentialsAcrossOrigins(t *testing.T) {
	other := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "%s auth=%q", r.Method, r.Header.Get("Authorization"))
	}))
	defer other.Close()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/redirect":
			http.SetCookie(w, &http.Cookie{Name: "hop", Value: "1", Path: "/"})
			http.Redirect(w, r, "/final", http.StatusFound)
		case "/away":
			http.Redirect(w, r, other.URL+"/", http.StatusFound)
		default:
			fmt.Fprintf(w, "%s cookie=%q", r.Method, r.Header.Get("Cookie"))
		}
	}))
	defer srv.Close()
	c := newHTTPClient(httpClientOptions{jar: &cookieJar{}})
	defer c.close()
	r, err := c.do(context.Background(), "POST", srv.URL+"/redirect", requestOptions{body: []byte("x"), hasBody: true})
	if err != nil || r.text() != `GET cookie="hop=1"` {
		t.Fatalf("%v %q", err, r.text())
	}
	r, err = c.do(context.Background(), "GET", srv.URL+"/away", requestOptions{headers: map[string]string{"authorization": "secret"}})
	if err != nil || r.text() != `GET auth=""` {
		t.Fatalf("%v %q", err, r.text())
	}
}

func TestResponsesAreDecoded(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Accept-Encoding") != "gzip, deflate" {
			t.Errorf("accept-encoding %q", r.Header.Get("Accept-Encoding"))
		}
		w.Header().Set("Content-Encoding", "gzip")
		gz := gzip.NewWriter(w)
		gz.Write([]byte(`{"ok":true}`))
		gz.Close()
	}))
	defer srv.Close()
	c := newHTTPClient(httpClientOptions{})
	r, err := c.do(context.Background(), "GET", srv.URL, requestOptions{})
	if err != nil || r.text() != `{"ok":true}` {
		t.Fatalf("%v %q", err, r.text())
	}
}

func TestNetworkFailuresAndTimeoutsAreNetworkErrors(t *testing.T) {
	ln, _ := net.Listen("tcp", "127.0.0.1:0")
	defer ln.Close()
	go func() {
		for {
			conn, err := ln.Accept()
			if err != nil {
				return
			}
			defer conn.Close() // hang
		}
	}()
	c := newHTTPClient(httpClientOptions{timeout: 200 * time.Millisecond})
	_, err := c.do(context.Background(), "GET", "http://"+ln.Addr().String()+"/", requestOptions{})
	var ne *networkError
	if !errors.As(err, &ne) || !strings.Contains(err.Error(), "timed out after 200ms") {
		t.Fatalf("%v", err)
	}
	_, err = newHTTPClient(httpClientOptions{}).do(context.Background(), "GET", "http://127.0.0.1:9/", requestOptions{})
	if !errors.As(err, &ne) {
		t.Fatalf("%v", err)
	}
}

// echoServer answers with the request's method, path and cookie.
func echoServer(t *testing.T) *httptest.Server {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "%s %s", r.Method, r.URL.Path)
	}))
	t.Cleanup(srv.Close)
	return srv
}

// connectProxy is an HTTP proxy that requires user:pa:ss and records CONNECT targets.
func connectProxy(t *testing.T) (addr string, seen func() []string) {
	var mu sync.Mutex
	var targets []string
	want := "Basic " + base64.StdEncoding.EncodeToString([]byte("user:pa:ss"))
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Proxy-Authorization") != want {
			w.WriteHeader(http.StatusProxyAuthRequired)
			return
		}
		mu.Lock()
		targets = append(targets, r.Method+" "+r.Host)
		mu.Unlock()
		if r.Method != http.MethodConnect {
			resp, err := http.DefaultTransport.RoundTrip(&http.Request{Method: r.Method, URL: r.URL, Header: http.Header{}, Host: r.Host})
			if err != nil {
				w.WriteHeader(502)
				return
			}
			defer resp.Body.Close()
			w.WriteHeader(resp.StatusCode)
			io.Copy(w, resp.Body)
			return
		}
		upstream, err := net.Dial("tcp", r.Host)
		if err != nil {
			w.WriteHeader(502)
			return
		}
		conn, buf, _ := w.(http.Hijacker).Hijack()
		conn.Write([]byte("HTTP/1.1 200 Connection Established\r\n\r\n"))
		go func() {
			if n := buf.Reader.Buffered(); n > 0 {
				b, _ := buf.Reader.Peek(n)
				upstream.Write(b)
			}
			io.Copy(upstream, conn)
			upstream.Close()
		}()
		io.Copy(conn, upstream)
		conn.Close()
	}))
	t.Cleanup(srv.Close)
	return srv.Listener.Addr().String(), func() []string {
		mu.Lock()
		defer mu.Unlock()
		return append([]string(nil), targets...)
	}
}

// socksServer is a SOCKS4a/SOCKS5 proxy (user u, password p) that records the hostnames it was
// asked for, so tests can see that the proxy, not the client, resolves them.
func socksServer(t *testing.T, resolve map[string]string) (addr string, seen func() []string) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { ln.Close() })
	var mu sync.Mutex
	var hosts []string
	record := func(h string) {
		mu.Lock()
		hosts = append(hosts, h)
		mu.Unlock()
	}
	serve := func(conn net.Conn) {
		defer conn.Close()
		br := bufio.NewReader(conn)
		version, _ := br.ReadByte()
		var host string
		var port uint16
		switch version {
		case 5:
			n, _ := br.ReadByte()
			methods := make([]byte, n)
			io.ReadFull(br, methods)
			conn.Write([]byte{5, 2}) // username/password
			br.ReadByte()
			ulen, _ := br.ReadByte()
			user := make([]byte, ulen)
			io.ReadFull(br, user)
			plen, _ := br.ReadByte()
			pass := make([]byte, plen)
			io.ReadFull(br, pass)
			if string(user) != "u" || string(pass) != "p" {
				conn.Write([]byte{1, 1})
				return
			}
			conn.Write([]byte{1, 0})
			head := make([]byte, 4)
			io.ReadFull(br, head)
			switch head[3] {
			case 1:
				ip := make([]byte, 4)
				io.ReadFull(br, ip)
				host = net.IP(ip).String()
			case 3:
				l, _ := br.ReadByte()
				name := make([]byte, l)
				io.ReadFull(br, name)
				host = string(name)
			}
			binary.Read(br, binary.BigEndian, &port)
		case 4:
			br.ReadByte()
			binary.Read(br, binary.BigEndian, &port)
			ip := make([]byte, 4)
			io.ReadFull(br, ip)
			br.ReadString(0) // user id
			if ip[0] == 0 && ip[3] != 0 {
				name, _ := br.ReadString(0)
				host = strings.TrimSuffix(name, "\x00")
			} else {
				host = net.IP(ip).String()
			}
		default:
			return
		}
		record(host)
		if mapped, ok := resolve[host]; ok {
			host = mapped
		}
		upstream, err := net.Dial("tcp", net.JoinHostPort(host, strconv.Itoa(int(port))))
		if err != nil {
			return
		}
		defer upstream.Close()
		if version == 5 {
			conn.Write([]byte{5, 0, 0, 1, 0, 0, 0, 0, 0, 0})
		} else {
			conn.Write([]byte{0, 0x5a, 0, 0, 0, 0, 0, 0})
		}
		go io.Copy(upstream, br)
		io.Copy(conn, upstream)
	}
	go func() {
		for {
			conn, err := ln.Accept()
			if err != nil {
				return
			}
			go serve(conn)
		}
	}()
	return ln.Addr().String(), func() []string {
		mu.Lock()
		defer mu.Unlock()
		return append([]string(nil), hosts...)
	}
}

func TestRequestsGoThroughTheAccountProxyNotHTTPSProxy(t *testing.T) {
	target := echoServer(t)
	proxyAddr, seen := connectProxy(t)
	t.Setenv("HTTPS_PROXY", "http://127.0.0.1:9")
	t.Setenv("HTTP_PROXY", "http://127.0.0.1:9")
	host, port, _ := net.SplitHostPort(proxyAddr)
	p, err := ParseProxy(host + ":" + port + ":user:pa:ss")
	if err != nil {
		t.Fatal(err)
	}
	c := newHTTPClient(httpClientOptions{proxy: p})
	defer c.close()
	r, err := c.do(context.Background(), "GET", target.URL+"/x", requestOptions{})
	if err != nil || r.text() != "GET /x" {
		t.Fatalf("%v %v", err, r)
	}
	if got := seen(); len(got) != 1 || !strings.Contains(got[0], strings.TrimPrefix(target.URL, "http://")) {
		t.Errorf("proxy saw %v", got)
	}
}

func TestSOCKSProxiesResolveHostnames(t *testing.T) {
	target := echoServer(t)
	_, port, _ := net.SplitHostPort(strings.TrimPrefix(target.URL, "http://"))
	for _, scheme := range []string{"socks5", "socks5h", "socks4"} {
		t.Run(scheme, func(t *testing.T) {
			addr, seen := socksServer(t, map[string]string{"target.test": "127.0.0.1"})
			p, err := ParseProxy(scheme + "://u:p@" + addr)
			if err != nil {
				t.Fatal(err)
			}
			c := newHTTPClient(httpClientOptions{proxy: p, timeout: 5 * time.Second})
			defer c.close()
			r, err := c.do(context.Background(), "GET", "http://target.test:"+port+"/y", requestOptions{})
			if err != nil || r.text() != "GET /y" {
				t.Fatalf("%v %v", err, r)
			}
			if got := seen(); len(got) != 1 || got[0] != "target.test" {
				t.Errorf("proxy saw %v", got)
			}
		})
	}
}

func TestRelayForwardsThroughTheAccountProxy(t *testing.T) {
	target := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { fmt.Fprint(w, "tls ok") }))
	defer target.Close()
	plain := echoServer(t)
	proxyAddr, seen := connectProxy(t)
	p, _ := ParseProxy("http://user:pa%3Ass@" + proxyAddr)
	relay, err := startRelay(p)
	if err != nil {
		t.Fatal(err)
	}
	defer relay.Close()
	if !strings.HasPrefix(relay.url(), "http://127.0.0.1:") {
		t.Fatal(relay.url())
	}

	// A browser talks to the relay with no credentials, through CONNECT for HTTPS and with
	// absolute URLs for HTTP.
	relayURL, _ := url.Parse(relay.url())
	tr := target.Client().Transport.(*http.Transport).Clone()
	tr.Proxy = http.ProxyURL(relayURL)
	client := &http.Client{Transport: tr, Timeout: 5 * time.Second}
	resp, err := client.Get(target.URL)
	if err != nil {
		t.Fatal(err)
	}
	body, _ := io.ReadAll(resp.Body)
	resp.Body.Close()
	if string(body) != "tls ok" {
		t.Errorf("https: %q", body)
	}
	resp, err = client.Get(plain.URL + "/z")
	if err != nil {
		t.Fatal(err)
	}
	body, _ = io.ReadAll(resp.Body)
	resp.Body.Close()
	if string(body) != "GET /z" {
		t.Errorf("http: %q", body)
	}
	// Both reached the upstream proxy, with its credentials.
	got := seen()
	if len(got) != 2 || !strings.HasPrefix(got[0], "CONNECT ") || !strings.HasPrefix(got[1], "GET ") {
		t.Errorf("proxy saw %v", got)
	}
}

func TestCheckProxyReportsFailuresWithoutThePassword(t *testing.T) {
	_, err := CheckProxy(context.Background(), "http://u:topsecret@127.0.0.1:9")
	if err == nil || strings.Contains(err.Error(), "topsecret") || !strings.Contains(err.Error(), "proxy check failed for http://u:****@127.0.0.1:9") {
		t.Fatalf("%v", err)
	}
}

func TestDecodeBodyKeepsUnknownEncodings(t *testing.T) {
	if got := decodeBody([]byte("raw"), "br"); !bytes.Equal(got, []byte("raw")) {
		t.Error(got)
	}
}
