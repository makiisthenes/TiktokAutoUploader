package autotok

// Browserbase cloud browsers (https://www.browserbase.com).
//
// Environment variables (the same as the other packages'):
//
//   - BROWSERBASE_API_KEY: required. Browserbase dashboard → Settings → API keys.
//   - BROWSERBASE_PROJECT_ID: optional; Browserbase infers it from the API key.
//   - BROWSERBASE_REGION: optional, e.g. eu-central-1 (Browserbase's default is us-west-2).
//   - BROWSERBASE_PROXY_COUNTRY: optional two-letter country, e.g. GB. Logins from accounts
//     without a proxy then go through Browserbase's residential proxies in that country.
//
// Account proxies are applied as Browserbase "external" proxies (HTTP or HTTPS only).

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"
)

// BrowserbaseAPIURL is Browserbase's API.
var BrowserbaseAPIURL = "https://api.browserbase.com/v1"

// Browserbase's allowed session timeout range, in seconds.
const (
	browserbaseMinTimeout = 60
	browserbaseMaxTimeout = 21600
)

// BrowserbaseBackend starts Browserbase sessions.
type BrowserbaseBackend struct{}

// Label implements CloudBackend.
func (BrowserbaseBackend) Label() string { return "Browserbase" }

func browserbaseHeaders(key string) map[string]string {
	return map[string]string{"x-bb-api-key": key, "content-type": "application/json"}
}

func browserbaseAPIKey() (string, error) {
	key := strings.TrimSpace(os.Getenv("BROWSERBASE_API_KEY"))
	if key == "" {
		return "", newConfigurationError("AUTOTOK_BROWSER=browserbase needs BROWSERBASE_API_KEY (Browserbase dashboard → Settings → API keys)")
	}
	return key, nil
}

// browserbaseProxy is the "external" proxy entry for an account proxy (HTTP/HTTPS only).
func browserbaseProxy(p *Proxy) (map[string]string, error) {
	if p.Scheme != "http" && p.Scheme != "https" {
		return nil, newValidationError(fmt.Sprintf("Browserbase only supports HTTP/HTTPS proxies, not %s. "+
			"Use your provider's HTTP endpoint for this account.", p.Scheme))
	}
	config := map[string]string{"type": "external", "server": p.chromeServer()}
	if p.Username != "" {
		config["username"] = p.Username
		config["password"] = p.password
	}
	return config, nil
}

// CreateSession implements CloudBackend.
func (BrowserbaseBackend) CreateSession(ctx context.Context, o CloudSessionOptions) (CloudSession, error) {
	key, err := browserbaseAPIKey()
	if err != nil {
		return nil, err
	}
	body := map[string]any{}
	if project := strings.TrimSpace(os.Getenv("BROWSERBASE_PROJECT_ID")); project != "" {
		body["projectId"] = project
	}
	if region := strings.TrimSpace(os.Getenv("BROWSERBASE_REGION")); region != "" {
		body["region"] = region
	}
	if o.Timeout > 0 {
		body["timeout"] = max(browserbaseMinTimeout, min(browserbaseMaxTimeout, int(o.Timeout.Seconds())))
	}
	country := strings.ToUpper(strings.TrimSpace(os.Getenv("BROWSERBASE_PROXY_COUNTRY")))
	if o.Proxy != nil {
		config, err := browserbaseProxy(o.Proxy)
		if err != nil {
			return nil, err
		}
		body["proxies"] = []any{config}
	} else if country != "" && !o.Offline {
		body["proxies"] = []any{map[string]any{"type": "browserbase", "geolocation": map[string]string{"country": country}}}
	}
	payload, _ := json.Marshal(body)

	client := cloudHTTP()
	defer client.close()
	r, err := client.do(ctx, "POST", BrowserbaseAPIURL+"/sessions", requestOptions{
		headers: browserbaseHeaders(key), body: payload, hasBody: true,
	})
	if err != nil {
		return nil, newRemoteBrowserError("could not reach Browserbase: "+describe(err), err)
	}
	if r.status == 401 || r.status == 403 {
		return nil, newConfigurationError(fmt.Sprintf("Browserbase rejected the API key (HTTP %d): %s", r.status, errorDetail(r)))
	}
	if r.status >= 400 {
		return nil, newRemoteBrowserError(fmt.Sprintf("Browserbase could not start a session (HTTP %d): %s", r.status, errorDetail(r)), nil)
	}
	data, _ := r.json().(map[string]any)
	id, _ := data["id"].(string)
	connect, _ := data["connectUrl"].(string)
	if id == "" || connect == "" {
		return nil, newRemoteBrowserError("unexpected response from Browserbase when starting a session", nil)
	}
	logDebug("started Browserbase session %s", id)
	return &browserbaseSession{id: id, connectURL: connect, apiKey: key}, nil
}

type browserbaseSession struct {
	id, connectURL, apiKey string
}

func (s *browserbaseSession) ID() string         { return s.id }
func (s *browserbaseSession) ConnectURL() string { return s.connectURL }

func (s *browserbaseSession) LiveViewURL(ctx context.Context) (string, error) {
	client := cloudHTTP()
	defer client.close()
	r, err := client.do(ctx, "GET", BrowserbaseAPIURL+"/sessions/"+s.id+"/debug", requestOptions{headers: browserbaseHeaders(s.apiKey)})
	if err != nil {
		return "", newRemoteBrowserError("could not get the Browserbase live view link: "+describe(err), err)
	}
	data, _ := r.json().(map[string]any)
	link, _ := data["debuggerFullscreenUrl"].(string)
	if r.status >= 400 || link == "" {
		return "", newRemoteBrowserError(fmt.Sprintf("could not get the Browserbase live view link: HTTP %d: %s", r.status, errorDetail(r)), nil)
	}
	return link, nil
}

func (s *browserbaseSession) Release(ctx context.Context) {
	client := cloudHTTP()
	defer client.close()
	_, err := client.do(ctx, "POST", BrowserbaseAPIURL+"/sessions/"+s.id, requestOptions{
		headers: browserbaseHeaders(s.apiKey), body: []byte(`{"status":"REQUEST_RELEASE"}`), hasBody: true,
	})
	if err != nil {
		logDebug("could not release Browserbase session %s: %s", s.id, describe(err))
	}
}
