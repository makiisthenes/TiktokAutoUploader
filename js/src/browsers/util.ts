/** Small helpers shared by the cloud providers. */
import type { HttpResponse } from "../http.ts";

/** Hosts a server reports when it doesn't know its public address. */
const UNROUTABLE_HOSTS = new Set(["0.0.0.0", "::", "[::]", ""]);

/** Short error text from an API response, for messages. */
export function errorDetail(r: HttpResponse): string {
  const data = r.json();
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const { message, error } = data as { message?: unknown; error?: unknown };
    return String(message || error || JSON.stringify(data)).slice(0, 300);
  }
  return (data === undefined ? r.text() : JSON.stringify(data)).slice(0, 300);
}

/** Hide the query string of every URL in `text` (API keys and tokens travel there). */
export function redactUrls(text: string): string {
  return text.replace(/\b((?:wss?|https?):\/\/[^\s?#'"]+)\?[^\s'"]*/g, "$1?****");
}

/** Append `query` (`a=1&b=2`) to `url`. */
export function addQuery(url: string, query: string): string {
  return `${url}${url.includes("?") ? "&" : "?"}${query}`;
}

/**
 * Point `url` at `baseUrl`'s host when the server reported an unroutable address such as
 * `0.0.0.0` (self-hosted defaults).
 */
export function reachable(url: string, baseUrl: string): string {
  let parts: URL;
  let base: URL;
  try {
    parts = new URL(url);
    base = new URL(baseUrl);
  } catch {
    return url;
  }
  if (!UNROUTABLE_HOSTS.has(parts.hostname)) return url;
  let scheme = parts.protocol;
  if (scheme === "ws:" || scheme === "wss:") scheme = base.protocol === "https:" ? "wss:" : "ws:";
  else if (scheme === "http:" || scheme === "https:") scheme = base.protocol;
  return `${scheme}//${base.host}${parts.pathname}${parts.search}${parts.hash}`;
}
