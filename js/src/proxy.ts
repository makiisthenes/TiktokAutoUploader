/**
 * Proxy parsing and helpers.
 *
 * One proxy is applied to everything autotok does for an account: the login browser, the
 * signature fetch and every upload request. That keeps TikTok seeing a single IP per account.
 *
 * Accepted formats (the scheme defaults to `http`):
 *
 *     http://user:pass@host:port
 *     socks5://user:pass@host:port
 *     host:port
 *     user:pass@host:port
 *     host:port:user:pass          // the export format most proxy providers use
 *
 * Parsing follows the Python package exactly, so a proxy string saved by either one means the
 * same thing to both.
 */
import { ValidationError } from "./errors.ts";

export const SUPPORTED_SCHEMES = ["http", "https", "socks5", "socks5h", "socks4"] as const;
export type ProxyScheme = (typeof SUPPORTED_SCHEMES)[number];

/** Used by `checkProxy` to report the exit IP. */
export const IP_ECHO_URL = "https://api.ipify.org?format=json";

/** Playwright's proxy option. */
export interface PlaywrightProxy {
  server: string;
  username?: string;
  password?: string;
}

export class Proxy {
  readonly scheme: ProxyScheme;
  readonly host: string;
  readonly port: number;
  readonly username: string | null;
  // Private, so it never shows up in console.log() or JSON.stringify().
  readonly #password: string | null;

  constructor(scheme: ProxyScheme, host: string, port: number, username: string | null = null,
              password: string | null = null) {
    this.scheme = scheme;
    this.host = host;
    this.port = port;
    this.username = username || null;
    this.#password = password || null;
  }

  get password(): string | null {
    return this.#password;
  }

  static parse(value: string): Proxy {
    let raw = (value ?? "").trim();
    if (!raw) throw new ValidationError("proxy is empty");

    if (!raw.includes("://")) {
      const parts = raw.split(":");
      // host:port:user:pass (no '@'). Passwords containing ':' are kept intact.
      if (!raw.includes("@") && parts.length >= 4) {
        const [host, port, user] = parts as [string, string, string];
        return build("http", host, port, user, parts.slice(3).join(":"), raw);
      }
      raw = "http://" + raw;
    }

    const split = urlsplit(raw);
    if (typeof split === "string") throw new ValidationError(`invalid proxy '${maskRaw(value)}': ${split}`);
    return build(split.scheme || "http", split.hostname, split.port, split.username, split.password, value);
  }

  /** Full URL including credentials, e.g. `http://user:pass@host:8080`. */
  get url(): string {
    return `${this.scheme}://${this.#auth(false)}${this.#hostPort}`;
  }

  /** URL safe for logs and UIs: the password is replaced with `****`. */
  masked(): string {
    return `${this.scheme}://${this.#auth(true)}${this.#hostPort}`;
  }

  /** Never leaks the password by accident. */
  toString(): string {
    return this.masked();
  }

  forPlaywright(): PlaywrightProxy {
    if (this.scheme.startsWith("socks") && this.username) {
      throw new ValidationError(
        "Chromium cannot use SOCKS proxies that need a username/password. " +
          "Use the provider's HTTP endpoint for this account instead.",
      );
    }
    const scheme = this.scheme === "socks5h" ? "socks5" : this.scheme;
    const out: PlaywrightProxy = { server: `${scheme}://${this.#hostPort}` };
    if (this.username) {
      out.username = this.username;
      out.password = this.#password ?? "";
    }
    return out;
  }

  get #hostPort(): string {
    return `${this.host.includes(":") ? `[${this.host}]` : this.host}:${this.port}`;
  }

  #auth(mask: boolean): string {
    if (!this.username) return "";
    const user = quote(this.username);
    if (this.#password === null) return `${user}@`;
    return `${user}:${mask ? "****" : quote(this.#password)}@`;
  }
}

/** A {@link Proxy}, or `null` for empty values. */
export function parseProxy(value: string | Proxy | null | undefined): Proxy | null {
  if (value === null || value === undefined || value instanceof Proxy) return value ?? null;
  if (!String(value).trim()) return null;
  return Proxy.parse(String(value));
}

function build(scheme: string, host: string, port: string | null, username: string | null,
               password: string | null, original: string): Proxy {
  if (!(SUPPORTED_SCHEMES as readonly string[]).includes(scheme)) {
    throw new ValidationError(`unsupported proxy scheme '${scheme}' (use one of: ${SUPPORTED_SCHEMES.join(", ")})`);
  }
  if (!host) throw new ValidationError(`invalid proxy '${maskRaw(original)}': missing host`);
  const portNumber = port !== null && /^\s*[+-]?\d+\s*$/.test(port) ? Number.parseInt(port, 10) : Number.NaN;
  if (Number.isNaN(portNumber)) throw new ValidationError(`invalid proxy '${maskRaw(original)}': missing or bad port`);
  if (!(portNumber > 0 && portNumber < 65536)) {
    throw new ValidationError(`invalid proxy '${maskRaw(original)}': port out of range`);
  }
  return new Proxy(scheme as ProxyScheme, host, portNumber, username, password);
}

interface SplitUrl {
  scheme: string;
  hostname: string;
  port: string | null;
  username: string | null;
  password: string | null;
}

/** The parts of Python's `urllib.parse.urlsplit` that proxy parsing uses. Returns an error message on failure. */
function urlsplit(raw: string): SplitUrl | string {
  const match = /^([A-Za-z][A-Za-z0-9+.-]*):\/\/([^/?#]*)/.exec(raw);
  if (!match) return "not a URL";
  const scheme = match[1]!.toLowerCase();
  const netloc = match[2]!;

  const at = netloc.lastIndexOf("@");
  let username: string | null = null;
  let password: string | null = null;
  if (at !== -1) {
    const userinfo = netloc.slice(0, at);
    const colon = userinfo.indexOf(":");
    username = unquote(colon === -1 ? userinfo : userinfo.slice(0, colon)) || null;
    password = colon === -1 ? null : unquote(userinfo.slice(colon + 1)) || null;
  }

  const hostinfo = netloc.slice(at + 1);
  let hostname: string;
  let port: string;
  const bracket = hostinfo.indexOf("[");
  if (bracket !== -1) {
    const bracketed = hostinfo.slice(bracket + 1);
    const close = bracketed.indexOf("]");
    hostname = close === -1 ? bracketed : bracketed.slice(0, close);
    const rest = close === -1 ? "" : bracketed.slice(close + 1);
    const colon = rest.indexOf(":");
    port = colon === -1 ? "" : rest.slice(colon + 1);
  } else {
    const colon = hostinfo.indexOf(":");
    hostname = colon === -1 ? hostinfo : hostinfo.slice(0, colon);
    port = colon === -1 ? "" : hostinfo.slice(colon + 1);
  }

  // Never quote the port text: it can hold the password (http://host:port:user:pass).
  if (port && !/^[0-9]+$/.test(port)) return "missing or bad port";
  if (port && Number(port) > 65535) return "port out of range";
  return { scheme, hostname: hostname.toLowerCase(), port: port || null, username, password };
}

/** Python's `urllib.parse.quote(value, safe="")`. */
function quote(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function unquote(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Best-effort masking for error messages about strings that failed to parse. */
export function maskRaw(value: string): string {
  value = value ?? "";
  const at = value.lastIndexOf("@");
  if (at !== -1) {
    const creds = value.slice(0, at);
    const rest = value.slice(at + 1);
    const sep = creds.lastIndexOf("://");
    const scheme = sep === -1 ? "" : creds.slice(0, sep + 3);
    const user = (sep === -1 ? creds : creds.slice(sep + 3)).split(":", 1)[0];
    return `${scheme}${user}:****@${rest}`;
  }
  const parts = value.split(":");
  if (parts.length >= 4) return [...parts.slice(0, 3), "****"].join(":");
  return value;
}
