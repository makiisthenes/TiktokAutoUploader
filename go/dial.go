package autotok

// Connections through a proxy: an HTTP CONNECT tunnel, or SOCKS4a/SOCKS5. Hostnames are always
// resolved by the proxy, so DNS lookups don't reveal the real IP.

import (
	"bufio"
	"context"
	"crypto/tls"
	"encoding/base64"
	"encoding/binary"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"time"

	xproxy "golang.org/x/net/proxy"
)

type dialFunc func(ctx context.Context, network, addr string) (net.Conn, error)

var directDialer = &net.Dialer{Timeout: 30 * time.Second, KeepAlive: 30 * time.Second}

// proxyDialer returns a function that opens a TCP connection to addr through p.
func proxyDialer(p *Proxy) dialFunc {
	switch p.Scheme {
	case "socks5", "socks5h":
		var auth *xproxy.Auth
		if p.Username != "" {
			auth = &xproxy.Auth{User: p.Username, Password: p.password}
		}
		return func(ctx context.Context, network, addr string) (net.Conn, error) {
			d, err := xproxy.SOCKS5("tcp", p.hostPort(), auth, directDialer)
			if err != nil {
				return nil, err
			}
			return d.(xproxy.ContextDialer).DialContext(ctx, network, addr)
		}
	case "socks4":
		return func(ctx context.Context, network, addr string) (net.Conn, error) {
			return dialSOCKS4a(ctx, p, addr)
		}
	default:
		return func(ctx context.Context, network, addr string) (net.Conn, error) {
			return dialConnect(ctx, p, addr)
		}
	}
}

// dialProxyServer connects to the proxy itself (with TLS for an https proxy).
func dialProxyServer(ctx context.Context, p *Proxy) (net.Conn, error) {
	conn, err := directDialer.DialContext(ctx, "tcp", p.hostPort())
	if err != nil {
		return nil, err
	}
	if p.Scheme != "https" {
		return conn, nil
	}
	tc := tls.Client(conn, &tls.Config{ServerName: p.Host})
	if err := tc.HandshakeContext(ctx); err != nil {
		conn.Close()
		return nil, err
	}
	return tc, nil
}

// withDeadline applies ctx's deadline (or cancellation) to conn while a handshake runs.
func withDeadline(ctx context.Context, conn net.Conn) (stop func()) {
	if d, ok := ctx.Deadline(); ok {
		conn.SetDeadline(d)
	}
	cancel := context.AfterFunc(ctx, func() { conn.SetDeadline(time.Unix(1, 0)) })
	return func() {
		cancel()
		conn.SetDeadline(time.Time{})
	}
}

// dialConnect opens a tunnel to addr with an HTTP CONNECT request.
func dialConnect(ctx context.Context, p *Proxy, addr string) (net.Conn, error) {
	conn, err := dialProxyServer(ctx, p)
	if err != nil {
		return nil, err
	}
	stop := withDeadline(ctx, conn)
	req := &http.Request{
		Method: http.MethodConnect,
		URL:    &url.URL{Host: addr},
		Host:   addr,
		Header: http.Header{},
	}
	if p.Username != "" {
		req.Header.Set("Proxy-Authorization", basicAuth(p.Username, p.password))
	}
	if err := req.Write(conn); err != nil {
		stop()
		conn.Close()
		return nil, err
	}
	br := bufio.NewReader(conn)
	resp, err := http.ReadResponse(br, req)
	stop()
	if err != nil {
		conn.Close()
		return nil, err
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		conn.Close()
		return nil, fmt.Errorf("proxy refused the connection to %s: %s", addr, resp.Status)
	}
	if br.Buffered() > 0 {
		return &bufferedConn{Conn: conn, r: br}, nil
	}
	return conn, nil
}

func basicAuth(user, pass string) string {
	return "Basic " + base64.StdEncoding.EncodeToString([]byte(user+":"+pass))
}

// dialSOCKS4a connects to addr through a SOCKS4 proxy, letting the proxy resolve hostnames.
func dialSOCKS4a(ctx context.Context, p *Proxy, addr string) (net.Conn, error) {
	host, portText, err := net.SplitHostPort(addr)
	if err != nil {
		return nil, err
	}
	port, err := strconv.Atoi(portText)
	if err != nil || port <= 0 || port > 65535 {
		return nil, fmt.Errorf("bad port in %q", addr)
	}
	conn, err := dialProxyServer(ctx, p)
	if err != nil {
		return nil, err
	}
	stop := withDeadline(ctx, conn)
	defer stop()

	msg := []byte{4, 1, 0, 0}
	binary.BigEndian.PutUint16(msg[2:], uint16(port))
	ip := net.ParseIP(host).To4()
	if ip != nil {
		msg = append(msg, ip...)
	} else {
		msg = append(msg, 0, 0, 0, 1) // SOCKS4a: the proxy resolves the name below
	}
	msg = append(msg, p.Username...)
	msg = append(msg, 0)
	if ip == nil {
		msg = append(msg, host...)
		msg = append(msg, 0)
	}
	if _, err := conn.Write(msg); err != nil {
		conn.Close()
		return nil, err
	}
	reply := make([]byte, 8)
	if _, err := io.ReadFull(conn, reply); err != nil {
		conn.Close()
		return nil, err
	}
	if reply[1] != 0x5a {
		conn.Close()
		return nil, fmt.Errorf("SOCKS4 proxy refused the connection to %s (code %d)", addr, reply[1])
	}
	return conn, nil
}

type bufferedConn struct {
	net.Conn
	r *bufio.Reader
}

func (c *bufferedConn) Read(b []byte) (int, error) { return c.r.Read(b) }
