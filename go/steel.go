package autotok

// Steel browsers: Steel Cloud or your own steel-browser server
// (https://github.com/steel-dev/steel-browser).
//
// Environment variables (the same as the other packages'):
//
//   - STEEL_BASE_URL: your steel-browser server, e.g. http://localhost:3000. Defaults to Steel
//     Cloud (https://api.steel.dev).
//   - STEEL_API_KEY: required for Steel Cloud; self-hosted servers don't need one.
//   - STEEL_CONNECT_URL: optional CDP endpoint override, for servers behind a separate websocket
//     host.
//
// Start a self-hosted server with DOMAIN=<host>:<port>, otherwise its live view connects to
// 0.0.0.0 and stays blank.

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"os"
	"strings"
)

const (
	// SteelCloudAPIURL is Steel Cloud's API.
	SteelCloudAPIURL = "https://api.steel.dev"
	// SteelCloudConnectURL is Steel Cloud's CDP endpoint.
	SteelCloudConnectURL = "wss://connect.steel.dev"
	steelMinTimeoutMs    = 60_000
)

// SteelBackend starts Steel sessions.
type SteelBackend struct{}

// Label implements CloudBackend.
func (SteelBackend) Label() string { return "Steel" }

func steelBaseURL() string {
	base := strings.TrimSpace(os.Getenv("STEEL_BASE_URL"))
	if base == "" {
		base = SteelCloudAPIURL
	}
	return strings.TrimRight(base, "/")
}

func isSteelCloud(base string) bool {
	u, err := url.Parse(base)
	cloud, _ := url.Parse(SteelCloudAPIURL)
	return err == nil && u.Hostname() == cloud.Hostname()
}

func steelHeaders(key string) map[string]string {
	h := map[string]string{"content-type": "application/json"}
	if key != "" {
		h["steel-api-key"] = key
	}
	return h
}

// CreateSession implements CloudBackend.
func (SteelBackend) CreateSession(ctx context.Context, o CloudSessionOptions) (CloudSession, error) {
	base := steelBaseURL()
	key := strings.TrimSpace(os.Getenv("STEEL_API_KEY"))
	if isSteelCloud(base) && key == "" {
		return nil, newConfigurationError("AUTOTOK_BROWSER=steel needs STEEL_API_KEY for Steel Cloud, or STEEL_BASE_URL " +
			"pointing at your own steel-browser server (e.g. http://localhost:3000)")
	}
	body := map[string]any{}
	if o.Timeout > 0 {
		body["timeout"] = max(steelMinTimeoutMs, o.Timeout.Milliseconds())
	}
	if o.Proxy != nil {
		body["proxyUrl"] = o.Proxy.URL()
	}
	payload, _ := json.Marshal(body)

	client := cloudHTTP()
	defer client.close()
	r, err := client.do(ctx, "POST", base+"/v1/sessions", requestOptions{headers: steelHeaders(key), body: payload, hasBody: true})
	if err != nil {
		return nil, newRemoteBrowserError(fmt.Sprintf("could not reach Steel at %s: %s", base, describe(err)), err)
	}
	if r.status == 401 || r.status == 403 {
		return nil, newConfigurationError(fmt.Sprintf("Steel rejected the API key (HTTP %d): %s", r.status, errorDetail(r)))
	}
	if r.status >= 400 {
		return nil, newRemoteBrowserError(fmt.Sprintf("Steel could not start a session (HTTP %d): %s", r.status, errorDetail(r)), nil)
	}
	data, _ := r.json().(map[string]any)
	id, _ := data["id"].(string)
	if id == "" {
		return nil, newRemoteBrowserError("unexpected response from Steel when starting a session", nil)
	}
	websocketURL, _ := data["websocketUrl"].(string)
	reportedDebug, _ := data["debugUrl"].(string)

	var connect string
	switch override := strings.TrimSpace(os.Getenv("STEEL_CONNECT_URL")); {
	case override != "":
		connect = addQuery(override, "sessionId="+id)
	case websocketURL != "":
		connect = reachable(websocketURL, base)
	default:
		connect = addQuery(SteelCloudConnectURL, "sessionId="+id)
	}
	if key != "" {
		connect = addQuery(connect, "apiKey="+key)
	}

	reported := reportedDebug
	if reported == "" {
		reported = websocketURL
	}
	if reported != "" && reachable(reported, base) != reported {
		host := base
		if u, err := url.Parse(base); err == nil {
			host = u.Host
		}
		logWarn("Steel at %s reports its address as 0.0.0.0, so its live view can't connect (logging in through it "+
			"won't work). Restart steel-browser with DOMAIN=%s.", base, host)
	}
	debug := reportedDebug
	if debug == "" {
		debug = base + "/v1/sessions/debug"
	}
	logDebug("started Steel session %s", id)
	return &steelSession{id: id, connectURL: connect, baseURL: base, debugURL: reachable(debug, base), apiKey: key}, nil
}

type steelSession struct {
	id, connectURL, baseURL, debugURL, apiKey string
}

func (s *steelSession) ID() string         { return s.id }
func (s *steelSession) ConnectURL() string { return s.connectURL }

func (s *steelSession) LiveViewURL(context.Context) (string, error) {
	// Without interactive=true the viewer is watch-only.
	return addQuery(s.debugURL, "interactive=true&showControls=true"), nil
}

func (s *steelSession) Release(ctx context.Context) {
	client := cloudHTTP()
	defer client.close()
	_, err := client.do(ctx, "POST", s.baseURL+"/v1/sessions/"+s.id+"/release", requestOptions{headers: steelHeaders(s.apiKey), hasBody: true})
	if err != nil {
		logDebug("could not release Steel session %s: %s", s.id, describe(err))
	}
}
