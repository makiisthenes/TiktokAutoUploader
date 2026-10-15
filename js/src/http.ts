/**
 * A small HTTP client: per-account proxy, a cookie jar, redirects and timeouts.
 *
 * Built on undici's `request` rather than `fetch`, so the headers sent are exactly the ones set
 * here (fetch adds `sec-fetch-mode`, `accept-language: *` and friends). The proxy is pinned on
 * the client: `HTTP(S)_PROXY` environment variables are never consulted, so they can't send an
 * account through another IP.
 */
import { brotliDecompressSync, gunzipSync, inflateRawSync, inflateSync } from "node:zlib";
import { socksDispatcher } from "fetch-socks";
import { ProxyAgent, request, type Dispatcher } from "undici";
import { AutotokError } from "./errors.ts";
import { IP_ECHO_URL, parseProxy, type Proxy } from "./proxy.ts";

const REDIRECTS = new Set([301, 302, 303, 307, 308]);
const MAX_REDIRECTS = 10;

/** A request failed before a response arrived (connection refused, reset, timeout...). */
export class NetworkError extends Error {
  override name = "NetworkError";
}

export interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string | Uint8Array;
  timeoutMs?: number;
}

export class HttpResponse {
  readonly status: number;
  readonly headers: Record<string, string | string[] | undefined>;
  readonly body: Buffer;
  readonly url: string;

  constructor(status: number, headers: Record<string, string | string[] | undefined>, body: Buffer, url: string) {
    this.status = status;
    this.headers = headers;
    this.body = body;
    this.url = url;
  }

  text(): string {
    return this.body.toString("utf8");
  }

  /** The parsed JSON body, or `undefined` if it isn't JSON. */
  json(): unknown {
    try {
      return JSON.parse(this.text());
    } catch {
      return undefined;
    }
  }
}

export interface StoredCookie {
  name: string;
  value: string;
  /** Without a leading dot. */
  domain: string;
  /** Host-only cookies are sent to `domain` exactly; domain cookies also to its subdomains. */
  hostOnly: boolean;
  path: string;
  secure: boolean;
  /** Epoch milliseconds, or `null` for session cookies. */
  expires: number | null;
}

/** Just enough of RFC 6265 for TikTok: domain/path matching, expiry, replacement. */
export class CookieJar {
  #cookies: StoredCookie[] = [];

  /** Set a cookie. A `domain` with a leading dot (the default, `.tiktok.com`) covers subdomains. */
  set(name: string, value: string, { domain = ".tiktok.com", path = "/" }: { domain?: string; path?: string } = {}): void {
    const hostOnly = !domain.startsWith(".");
    this.#put({ name, value, domain: domain.replace(/^\./, "").toLowerCase(), hostOnly, path, secure: false, expires: null });
  }

  /** The value of the most recently set cookie called `name`. */
  get(name: string): string | undefined {
    const now = Date.now();
    return this.#cookies.findLast((c) => c.name === name && !expired(c, now))?.value;
  }

  all(): StoredCookie[] {
    const now = Date.now();
    return this.#cookies.filter((c) => !expired(c, now)).map((c) => ({ ...c }));
  }

  /** The `Cookie` header for a request to `url`, or `undefined` if no cookie applies. */
  header(url: URL): string | undefined {
    const host = url.hostname.toLowerCase();
    const now = Date.now();
    const pairs = this.#cookies
      .filter((c) => !expired(c, now) && domainMatches(host, c) && pathMatches(url.pathname, c.path)
        && (!c.secure || url.protocol === "https:"))
      .sort((a, b) => b.path.length - a.path.length)
      .map((c) => `${c.name}=${c.value}`);
    return pairs.length ? pairs.join("; ") : undefined;
  }

  /** Store the `Set-Cookie` headers of a response to `url`. */
  store(url: URL, setCookie: string | string[] | undefined): void {
    if (!setCookie) return;
    for (const line of Array.isArray(setCookie) ? setCookie : [setCookie]) {
      const cookie = parseSetCookie(url, line);
      if (cookie) this.#put(cookie);
    }
  }

  #put(cookie: StoredCookie): void {
    this.#cookies = this.#cookies.filter(
      (c) => !(c.name === cookie.name && c.domain === cookie.domain && c.path === cookie.path),
    );
    if (!expired(cookie, Date.now())) this.#cookies.push(cookie);
  }
}

function expired(cookie: StoredCookie, now: number): boolean {
  return cookie.expires !== null && cookie.expires <= now;
}

function domainMatches(host: string, cookie: StoredCookie): boolean {
  if (cookie.hostOnly) return host === cookie.domain;
  return host === cookie.domain || host.endsWith(`.${cookie.domain}`);
}

function pathMatches(requestPath: string, cookiePath: string): boolean {
  if (requestPath === cookiePath) return true;
  if (!requestPath.startsWith(cookiePath)) return false;
  return cookiePath.endsWith("/") || requestPath[cookiePath.length] === "/";
}

function defaultPath(url: URL): string {
  const path = url.pathname;
  if (!path.startsWith("/") || path.lastIndexOf("/") === 0) return "/";
  return path.slice(0, path.lastIndexOf("/"));
}

function parseSetCookie(url: URL, line: string): StoredCookie | null {
  const [pair = "", ...attributes] = line.split(";");
  const eq = pair.indexOf("=");
  if (eq <= 0) return null;
  const host = url.hostname.toLowerCase();
  const cookie: StoredCookie = {
    name: pair.slice(0, eq).trim(),
    value: pair.slice(eq + 1).trim(),
    domain: host,
    hostOnly: true,
    path: defaultPath(url),
    secure: false,
    expires: null,
  };
  let maxAge: number | null = null;
  for (const attribute of attributes) {
    const sep = attribute.indexOf("=");
    const key = (sep === -1 ? attribute : attribute.slice(0, sep)).trim().toLowerCase();
    const value = sep === -1 ? "" : attribute.slice(sep + 1).trim();
    if (key === "domain" && value) {
      const domain = value.replace(/^\./, "").toLowerCase();
      // Ignore cookies for other sites, like a browser would.
      if (host !== domain && !host.endsWith(`.${domain}`)) return null;
      cookie.domain = domain;
      cookie.hostOnly = false;
    } else if (key === "path" && value.startsWith("/")) {
      cookie.path = value;
    } else if (key === "secure") {
      cookie.secure = true;
    } else if (key === "max-age" && /^-?\d+$/.test(value)) {
      maxAge = Number(value);
    } else if (key === "expires") {
      const time = Date.parse(value);
      if (!Number.isNaN(time)) cookie.expires = time;
    }
  }
  if (maxAge !== null) cookie.expires = Date.now() + maxAge * 1000;
  return cookie;
}

/** An undici dispatcher that sends everything through `proxy` (or `undefined` for a direct connection). */
export function proxyDispatcher(proxy: Proxy | null): Dispatcher | undefined {
  if (!proxy) return undefined;
  if (proxy.scheme === "http" || proxy.scheme === "https") {
    const options: ProxyAgent.Options = { uri: `${proxy.scheme}://${proxy.host.includes(":") ? `[${proxy.host}]` : proxy.host}:${proxy.port}` };
    if (proxy.username) {
      options.token = `Basic ${Buffer.from(`${proxy.username}:${proxy.password ?? ""}`).toString("base64")}`;
    }
    return new ProxyAgent(options);
  }
  // SOCKS: hostnames are resolved by the proxy, so DNS lookups don't leak the real IP.
  return socksDispatcher({
    type: proxy.scheme === "socks4" ? 4 : 5,
    host: proxy.host,
    port: proxy.port,
    ...(proxy.username ? { userId: proxy.username, password: proxy.password ?? "" } : {}),
  });
}

export interface HttpClientOptions {
  proxy?: Proxy | null;
  /** Sent with every request unless a request sets the same header. */
  headers?: Record<string, string>;
  /** Cookies to send and collect; `null` sends none. */
  jar?: CookieJar | null;
  timeoutMs?: number;
}

export class HttpClient {
  readonly jar: CookieJar | null;
  readonly timeoutMs: number;
  readonly #headers: Record<string, string>;
  readonly #dispatcher: Dispatcher | undefined;

  constructor({ proxy = null, headers = {}, jar = null, timeoutMs = 60_000 }: HttpClientOptions = {}) {
    this.jar = jar;
    this.timeoutMs = timeoutMs;
    this.#headers = lowerKeys(headers);
    this.#dispatcher = proxyDispatcher(proxy);
  }

  /** Send a request, following redirects. Throws {@link NetworkError} when no response arrives. */
  async request(url: string, options: RequestOptions = {}): Promise<HttpResponse> {
    let method = (options.method ?? "GET").toUpperCase();
    let body = options.body;
    let headers = { ...this.#headers, ...lowerKeys(options.headers ?? {}) };
    let current = new URL(url);
    const signal = AbortSignal.timeout(options.timeoutMs ?? this.timeoutMs);

    for (let hop = 0; ; hop++) {
      const sent: Record<string, string> = { ...headers, "accept-encoding": headers["accept-encoding"] ?? "gzip, deflate, br" };
      const cookie = this.jar?.header(current);
      if (cookie) sent.cookie = cookie;

      let status: number;
      let responseHeaders: Record<string, string | string[] | undefined>;
      let raw: Buffer;
      try {
        const response = await request(current, {
          method: method as Dispatcher.HttpMethod,
          headers: sent,
          body: body ?? null,
          signal,
          ...(this.#dispatcher ? { dispatcher: this.#dispatcher } : {}),
        });
        status = response.statusCode;
        responseHeaders = response.headers;
        raw = Buffer.from(await response.body.arrayBuffer());
      } catch (error) {
        const reason = signal.aborted ? `timed out after ${options.timeoutMs ?? this.timeoutMs} ms` : describe(error);
        throw new NetworkError(`${method} ${current.origin}${current.pathname}: ${reason}`, { cause: error });
      }
      this.jar?.store(current, responseHeaders["set-cookie"]);

      const location = header(responseHeaders, "location");
      if (REDIRECTS.has(status) && location && hop < MAX_REDIRECTS) {
        const next = new URL(location, current);
        if ((status === 303 && method !== "HEAD") || ((status === 301 || status === 302) && method === "POST")) {
          method = "GET";
          body = undefined;
          headers = Object.fromEntries(Object.entries(headers).filter(([k]) => k !== "content-type" && k !== "content-length"));
        }
        if (next.origin !== current.origin) {
          headers = Object.fromEntries(Object.entries(headers).filter(([k]) => k !== "authorization"));
        }
        current = next;
        continue;
      }
      return new HttpResponse(status, responseHeaders, decode(raw, header(responseHeaders, "content-encoding")), current.href);
    }
  }

  async close(): Promise<void> {
    await this.#dispatcher?.close().catch(() => {});
  }
}

export function header(headers: Record<string, string | string[] | undefined>, name: string): string | undefined {
  const value = headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function decode(body: Buffer, encoding: string | undefined): Buffer {
  if (!body.length || !encoding) return body;
  try {
    switch (encoding.trim().toLowerCase()) {
      case "gzip":
      case "x-gzip":
        return gunzipSync(body);
      case "deflate":
        try {
          return inflateSync(body);
        } catch {
          return inflateRawSync(body);
        }
      case "br":
        return brotliDecompressSync(body);
      default:
        return body;
    }
  } catch {
    return body;
  }
}

function lowerKeys(headers: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
}

export function describe(error: unknown): string {
  if (error instanceof Error) {
    const cause = error.cause instanceof Error ? ` (${error.cause.message})` : "";
    const code = (error as { code?: string }).code;
    return `${error.message}${code && !error.message.includes(code) ? ` [${code}]` : ""}${cause}`;
  }
  return String(error);
}

/** Make a request through `proxy` and return the public IP TikTok will see. */
export async function checkProxy(proxy: string | Proxy | null | undefined, { timeoutMs = 15_000 } = {}): Promise<string> {
  const p = parseProxy(proxy);
  const http = new HttpClient({ proxy: p, timeoutMs });
  try {
    const r = await http.request(IP_ECHO_URL, { headers: { accept: "application/json" } });
    const ip = (r.json() as { ip?: unknown } | undefined)?.ip;
    if (r.status !== 200 || typeof ip !== "string") throw new Error(`HTTP ${r.status}`);
    return ip;
  } catch (error) {
    throw new AutotokError(`proxy check failed for ${p ? p.masked() : "direct connection"}: ${describe(error)}`);
  } finally {
    await http.close();
  }
}
