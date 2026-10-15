/**
 * Steel browsers: Steel Cloud or your own steel-browser server
 * (https://github.com/steel-dev/steel-browser).
 *
 * Environment variables (the same as the Python package's):
 *
 * - `STEEL_BASE_URL`: your steel-browser server, e.g. `http://localhost:3000`. Defaults to Steel
 *   Cloud (`https://api.steel.dev`).
 * - `STEEL_API_KEY`: required for Steel Cloud; self-hosted servers don't need one.
 * - `STEEL_CONNECT_URL`: optional CDP endpoint override, for servers behind a separate websocket host.
 *
 * Start a self-hosted server with `DOMAIN=<host>:<port>`, otherwise its live view connects to
 * `0.0.0.0` and stays blank.
 */
import { ConfigurationError, RemoteBrowserError } from "../errors.ts";
import { describe, HttpClient } from "../http.ts";
import { log } from "../log.ts";
import type { Proxy } from "../proxy.ts";
import { env } from "../settings.ts";
import { CloudProvider, type CloudSession } from "./base.ts";
import { addQuery, errorDetail, reachable } from "./util.ts";

export const CLOUD_API_URL = "https://api.steel.dev";
export const CLOUD_CONNECT_URL = "wss://connect.steel.dev";
const HTTP_TIMEOUT_MS = 30_000;
/** Seconds. */
const MIN_TIMEOUT = 60;

export function baseUrl(): string {
  return (env("STEEL_BASE_URL") ?? CLOUD_API_URL).trim().replace(/\/+$/, "");
}

function isCloud(url: string): boolean {
  try {
    return new URL(url).hostname === new URL(CLOUD_API_URL).hostname;
  } catch {
    return false;
  }
}

function headers(key: string | null): Record<string, string> {
  return key ? { "content-type": "application/json", "steel-api-key": key } : { "content-type": "application/json" };
}

export class SteelSession implements CloudSession {
  readonly id: string;
  readonly connectUrl: string;
  readonly baseUrl: string;
  readonly debugUrl: string;
  readonly #apiKey: string | null;

  constructor(id: string, connectUrl: string, baseUrl: string, debugUrl: string, apiKey: string | null) {
    this.id = id;
    this.connectUrl = connectUrl;
    this.baseUrl = baseUrl;
    this.debugUrl = debugUrl;
    this.#apiKey = apiKey;
  }

  async liveViewUrl(): Promise<string> {
    // Without interactive=true the viewer is watch-only.
    return addQuery(this.debugUrl, "interactive=true&showControls=true");
  }

  async release(): Promise<void> {
    const http = new HttpClient({ timeoutMs: HTTP_TIMEOUT_MS });
    try {
      await http.request(`${this.baseUrl}/v1/sessions/${this.id}/release`, { method: "POST", headers: headers(this.#apiKey) });
    } catch (error) {
      log.debug(`could not release Steel session ${this.id}: ${describe(error)}`);
    } finally {
      await http.close();
    }
  }
}

export class SteelProvider extends CloudProvider {
  override readonly label = "Steel";

  override async createSession({ proxy, timeoutMs }: { proxy: Proxy | null; timeoutMs: number | null; offline: boolean }): Promise<SteelSession> {
    const base = baseUrl();
    const key = (env("STEEL_API_KEY") ?? "").trim() || null;
    if (isCloud(base) && !key) {
      throw new ConfigurationError(
        "AUTOTOK_BROWSER=steel needs STEEL_API_KEY for Steel Cloud, or STEEL_BASE_URL " +
          "pointing at your own steel-browser server (e.g. http://localhost:3000)",
      );
    }
    const body: Record<string, unknown> = {};
    if (timeoutMs !== null) body.timeout = Math.floor(Math.max(MIN_TIMEOUT * 1000, timeoutMs));
    if (proxy) body.proxyUrl = proxy.url;

    const http = new HttpClient({ timeoutMs: HTTP_TIMEOUT_MS });
    let r;
    try {
      r = await http.request(`${base}/v1/sessions`, { method: "POST", headers: headers(key), body: JSON.stringify(body) });
    } catch (error) {
      throw new RemoteBrowserError(`could not reach Steel at ${base}: ${describe(error)}`);
    } finally {
      await http.close();
    }
    if (r.status === 401 || r.status === 403) {
      throw new ConfigurationError(`Steel rejected the API key (HTTP ${r.status}): ${errorDetail(r)}`);
    }
    if (r.status >= 400) {
      throw new RemoteBrowserError(`Steel could not start a session (HTTP ${r.status}): ${errorDetail(r)}`);
    }
    const data = r.json() as { id?: unknown; websocketUrl?: unknown; debugUrl?: unknown } | undefined;
    if (typeof data?.id !== "string") throw new RemoteBrowserError("unexpected response from Steel when starting a session");
    const id = data.id;
    const websocketUrl = typeof data.websocketUrl === "string" ? data.websocketUrl : "";
    const reportedDebug = typeof data.debugUrl === "string" ? data.debugUrl : "";

    const override = (env("STEEL_CONNECT_URL") ?? "").trim();
    let connect: string;
    if (override) connect = addQuery(override, `sessionId=${id}`);
    else if (websocketUrl) connect = reachable(websocketUrl, base);
    else connect = addQuery(CLOUD_CONNECT_URL, `sessionId=${id}`);
    if (key) connect = addQuery(connect, `apiKey=${key}`);

    const reported = reportedDebug || websocketUrl;
    if (reported && reachable(reported, base) !== reported) {
      log.warn(
        `Steel at ${base} reports its address as 0.0.0.0, so its live view can't connect ` +
          `(logging in through it won't work). Restart steel-browser with DOMAIN=${new URL(base).host}.`,
      );
    }
    const debug = reachable(reportedDebug || `${base}/v1/sessions/debug`, base);
    log.debug(`started Steel session ${id}`);
    return new SteelSession(id, connect, base, debug, key);
  }
}
