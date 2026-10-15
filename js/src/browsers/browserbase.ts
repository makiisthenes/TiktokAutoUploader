/**
 * Browserbase cloud browsers (https://www.browserbase.com).
 *
 * Environment variables (the same as the Python package's):
 *
 * - `BROWSERBASE_API_KEY`: required. Browserbase dashboard → Settings → API keys.
 * - `BROWSERBASE_PROJECT_ID`: optional; Browserbase infers it from the API key.
 * - `BROWSERBASE_REGION`: optional, e.g. `eu-central-1` (Browserbase's default is `us-west-2`).
 * - `BROWSERBASE_PROXY_COUNTRY`: optional two-letter country, e.g. `GB`. Logins from accounts
 *   without a proxy then go through Browserbase's residential proxies in that country.
 *
 * Account proxies are applied as Browserbase "external" proxies (HTTP or HTTPS only).
 */
import { ConfigurationError, RemoteBrowserError, ValidationError } from "../errors.ts";
import { describe, HttpClient } from "../http.ts";
import { log } from "../log.ts";
import type { Proxy } from "../proxy.ts";
import { env } from "../settings.ts";
import { CloudProvider, type CloudSession } from "./base.ts";
import { errorDetail } from "./util.ts";

export const API_URL = "https://api.browserbase.com/v1";
/** Seconds: Browserbase's allowed session timeout range. */
const MIN_TIMEOUT = 60;
const MAX_TIMEOUT = 21_600;
const HTTP_TIMEOUT_MS = 30_000;

function headers(key: string): Record<string, string> {
  return { "x-bb-api-key": key, "content-type": "application/json" };
}

/** Browserbase "external" proxy entry for an account proxy (HTTP/HTTPS only). */
function proxyConfig(proxy: Proxy): Record<string, string> {
  if (proxy.scheme !== "http" && proxy.scheme !== "https") {
    throw new ValidationError(
      `Browserbase only supports HTTP/HTTPS proxies, not ${proxy.scheme}. Use your provider's HTTP endpoint for this account.`,
    );
  }
  const server = proxy.forPlaywright();
  const config: Record<string, string> = { type: "external", server: server.server };
  if (server.username) {
    config.username = server.username;
    config.password = server.password ?? "";
  }
  return config;
}

export class BrowserbaseSession implements CloudSession {
  readonly id: string;
  readonly connectUrl: string;
  readonly #apiKey: string;

  constructor(id: string, connectUrl: string, apiKey: string) {
    this.id = id;
    this.connectUrl = connectUrl;
    this.#apiKey = apiKey;
  }

  async liveViewUrl(): Promise<string> {
    const http = new HttpClient({ timeoutMs: HTTP_TIMEOUT_MS });
    try {
      const r = await http.request(`${API_URL}/sessions/${this.id}/debug`, { headers: headers(this.#apiKey) });
      const url = (r.json() as { debuggerFullscreenUrl?: unknown } | undefined)?.debuggerFullscreenUrl;
      if (r.status >= 400 || typeof url !== "string") throw new Error(`HTTP ${r.status}: ${errorDetail(r)}`);
      return url;
    } catch (error) {
      throw new RemoteBrowserError(`could not get the Browserbase live view link: ${describe(error)}`);
    } finally {
      await http.close();
    }
  }

  async release(): Promise<void> {
    const http = new HttpClient({ timeoutMs: HTTP_TIMEOUT_MS });
    try {
      await http.request(`${API_URL}/sessions/${this.id}`, {
        method: "POST",
        headers: headers(this.#apiKey),
        body: JSON.stringify({ status: "REQUEST_RELEASE" }),
      });
    } catch (error) {
      log.debug(`could not release Browserbase session ${this.id}: ${describe(error)}`);
    } finally {
      await http.close();
    }
  }
}

export class BrowserbaseProvider extends CloudProvider {
  override readonly label = "Browserbase";

  static apiKey(): string {
    const key = (env("BROWSERBASE_API_KEY") ?? "").trim();
    if (!key) {
      throw new ConfigurationError("AUTOTOK_BROWSER=browserbase needs BROWSERBASE_API_KEY (Browserbase dashboard → Settings → API keys)");
    }
    return key;
  }

  override async createSession({ proxy, timeoutMs, offline }: { proxy: Proxy | null; timeoutMs: number | null; offline: boolean }): Promise<BrowserbaseSession> {
    const key = BrowserbaseProvider.apiKey();
    const body: Record<string, unknown> = {};
    const project = (env("BROWSERBASE_PROJECT_ID") ?? "").trim();
    if (project) body.projectId = project;
    const region = (env("BROWSERBASE_REGION") ?? "").trim();
    if (region) body.region = region;
    if (timeoutMs !== null) body.timeout = Math.max(MIN_TIMEOUT, Math.min(MAX_TIMEOUT, Math.floor(timeoutMs / 1000)));
    const country = (env("BROWSERBASE_PROXY_COUNTRY") ?? "").trim().toUpperCase();
    if (proxy) body.proxies = [proxyConfig(proxy)];
    else if (country && !offline) body.proxies = [{ type: "browserbase", geolocation: { country } }];

    const http = new HttpClient({ timeoutMs: HTTP_TIMEOUT_MS });
    let r;
    try {
      r = await http.request(`${API_URL}/sessions`, { method: "POST", headers: headers(key), body: JSON.stringify(body) });
    } catch (error) {
      throw new RemoteBrowserError(`could not reach Browserbase: ${describe(error)}`);
    } finally {
      await http.close();
    }
    if (r.status === 401 || r.status === 403) {
      throw new ConfigurationError(`Browserbase rejected the API key (HTTP ${r.status}): ${errorDetail(r)}`);
    }
    if (r.status >= 400) {
      throw new RemoteBrowserError(`Browserbase could not start a session (HTTP ${r.status}): ${errorDetail(r)}`);
    }
    const data = r.json() as { id?: unknown; connectUrl?: unknown } | undefined;
    if (typeof data?.id !== "string" || typeof data.connectUrl !== "string") {
      throw new RemoteBrowserError("unexpected response from Browserbase when starting a session");
    }
    log.debug(`started Browserbase session ${data.id}`);
    return new BrowserbaseSession(data.id, data.connectUrl, key);
  }
}
