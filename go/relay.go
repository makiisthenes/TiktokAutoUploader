package autotok

// A local proxy that forwards a browser's traffic through the account's proxy.
//
// Chromium can't send a proxy username and password on its own (and can't use SOCKS proxies
// that need them at all), so a local browser is pointed at this relay instead: it listens on
// 127.0.0.1 only, for as long as the browser runs, and opens every connection through the
// account's proxy with its credentials. Hostnames are resolved by the proxy.

import (
	"context"
	"io"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

type proxyRelay struct {
	ln        net.Listener
	srv       *http.Server
	dial      dialFunc
	transport *http.Transport
	wg        sync.WaitGroup
	mu        sync.Mutex
	conns     map[net.Conn]struct{}
}

func startRelay(p *Proxy) (*proxyRelay, error) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return nil, err
	}
	r := &proxyRelay{ln: ln, dial: proxyDialer(p), transport: newHTTPTransport(p), conns: map[net.Conn]struct{}{}}
	r.srv = &http.Server{Handler: r, ReadHeaderTimeout: 30 * time.Second}
	r.wg.Add(1)
	go func() {
		defer r.wg.Done()
		r.srv.Serve(ln)
	}()
	return r, nil
}

// url is the --proxy-server value for the browser.
func (r *proxyRelay) url() string { return "http://" + r.ln.Addr().String() }

func (r *proxyRelay) Close() error {
	err := r.srv.Close()
	r.mu.Lock()
	for c := range r.conns {
		c.Close()
	}
	r.mu.Unlock()
	r.transport.CloseIdleConnections()
	r.wg.Wait()
	return err
}

func (r *proxyRelay) track(c net.Conn, add bool) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if add {
		r.conns[c] = struct{}{}
	} else {
		delete(r.conns, c)
	}
}

var hopHeaders = []string{"Connection", "Keep-Alive", "Proxy-Authenticate", "Proxy-Authorization",
	"Proxy-Connection", "Te", "Trailer", "Transfer-Encoding", "Upgrade"}

func (r *proxyRelay) ServeHTTP(w http.ResponseWriter, req *http.Request) {
	if req.Method == http.MethodConnect {
		r.tunnel(w, req)
		return
	}
	if !req.URL.IsAbs() {
		http.Error(w, "this is a proxy", http.StatusBadRequest)
		return
	}
	out := req.Clone(req.Context())
	out.RequestURI = ""
	for _, h := range hopHeaders {
		out.Header.Del(h)
	}
	resp, err := r.transport.RoundTrip(out)
	if err != nil {
		http.Error(w, "proxy error: "+describe(err), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()
	for _, h := range hopHeaders {
		resp.Header.Del(h)
	}
	for k, vs := range resp.Header {
		for _, v := range vs {
			w.Header().Add(k, v)
		}
	}
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

func (r *proxyRelay) tunnel(w http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()
	upstream, err := r.dial(ctx, "tcp", req.Host)
	if err != nil {
		logDebug("proxy relay: connection to %s failed: %s", req.Host, describe(err))
		http.Error(w, "proxy error", http.StatusBadGateway)
		return
	}
	hj, ok := w.(http.Hijacker)
	if !ok {
		upstream.Close()
		http.Error(w, "hijacking unsupported", http.StatusInternalServerError)
		return
	}
	client, buf, err := hj.Hijack()
	if err != nil {
		upstream.Close()
		return
	}
	r.track(client, true)
	r.track(upstream, true)
	defer func() {
		r.track(client, false)
		r.track(upstream, false)
		client.Close()
		upstream.Close()
	}()
	if _, err := client.Write([]byte("HTTP/1.1 200 Connection Established\r\n\r\n")); err != nil {
		return
	}
	done := make(chan struct{}, 2)
	go func() {
		// Bytes the client sent right after the CONNECT request are in buf.
		if n := buf.Reader.Buffered(); n > 0 {
			pending, _ := buf.Reader.Peek(n)
			upstream.Write(pending)
		}
		io.Copy(upstream, client)
		closeWrite(upstream)
		done <- struct{}{}
	}()
	go func() {
		io.Copy(client, upstream)
		closeWrite(client)
		done <- struct{}{}
	}()
	<-done
	<-done
}

func closeWrite(c net.Conn) {
	type closeWriter interface{ CloseWrite() error }
	if cw, ok := c.(closeWriter); ok {
		cw.CloseWrite()
		return
	}
	if strings.Contains(c.LocalAddr().Network(), "tcp") {
		c.Close()
	}
}
