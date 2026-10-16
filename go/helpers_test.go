package autotok

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/json"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
)

// isolatedHome gives the test its own AUTOTOK_HOME and videos folder.
func isolatedHome(t *testing.T) (home, videos string) {
	t.Helper()
	root := t.TempDir()
	home, videos = filepath.Join(root, "home"), filepath.Join(root, "videos")
	for _, d := range []string{home, videos} {
		if err := os.MkdirAll(d, 0o755); err != nil {
			t.Fatal(err)
		}
	}
	t.Setenv("AUTOTOK_HOME", home)
	t.Setenv("AUTOTOK_VIDEOS_DIR", videos)
	t.Setenv("AUTOTOK_BROWSER", "local")
	return home, videos
}

func writeVideo(t *testing.T, dir string) string {
	t.Helper()
	path := filepath.Join(dir, "clip.mp4")
	data := append([]byte("\x00\x00\x00\x18ftypmp42"), bytes.Repeat([]byte("x"), 2048)...)
	if err := os.WriteFile(path, data, 0o644); err != nil {
		t.Fatal(err)
	}
	return path
}

type call struct {
	method string
	url    string
	header http.Header
	body   []byte
}

// fakeNet sends every connection autotok makes (any host) to one local TLS server, and records
// the requests.
type fakeNet struct {
	mu      sync.Mutex
	calls   []call
	handler func(w http.ResponseWriter, r *http.Request, body []byte)
}

func (f *fakeNet) recorded() []call {
	f.mu.Lock()
	defer f.mu.Unlock()
	return append([]call(nil), f.calls...)
}

func (f *fakeNet) find(substr string) []call {
	var out []call
	for _, c := range f.recorded() {
		if strings.Contains(c.url, substr) {
			out = append(out, c)
		}
	}
	return out
}

func newFakeNet(t *testing.T, handler func(w http.ResponseWriter, r *http.Request, body []byte)) *fakeNet {
	t.Helper()
	f := &fakeNet{handler: handler}
	srv := httptest.NewUnstartedServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		f.mu.Lock()
		f.calls = append(f.calls, call{method: r.Method, url: "https://" + r.Host + r.RequestURI, header: r.Header.Clone(), body: body})
		f.mu.Unlock()
		f.handler(w, r, body)
	}))
	srv.StartTLS()
	addr := srv.Listener.Addr().String()
	testDialHook = func(ctx context.Context, network, _ string) (net.Conn, error) {
		return (&net.Dialer{}).DialContext(ctx, network, addr)
	}
	testTLSConfig = &tls.Config{InsecureSkipVerify: true}
	t.Cleanup(func() {
		testDialHook, testTLSConfig = nil, nil
		srv.Close()
	})
	return f
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// stubSigner records the URLs it signs.
type stubSigner struct {
	mu   sync.Mutex
	urls []string
}

func (s *stubSigner) Sign(_ context.Context, url string) (Signature, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.urls = append(s.urls, url)
	return Signature{Signature: "_sig", XBogus: "XBOGUS", VerifyFp: "fp", SignedURL: url}, nil
}
