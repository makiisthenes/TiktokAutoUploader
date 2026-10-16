/**
 * Paths and environment-driven settings, shared with the Python package.
 *
 * Everything is resolved at call time, so environment changes and tests always see the current
 * values. Both packages read the same variables and the same account folder, so a session saved
 * by one works in the other.
 *
 * - `AUTOTOK_HOME`: data directory (default `~/.autotok`)
 * - `AUTOTOK_VIDEOS_DIR`: where videos are looked up by name (default `$AUTOTOK_HOME/videos`)
 * - `AUTOTOK_BROWSER_PATH`: use this Chrome/Chromium binary instead of Playwright's Chromium
 * - `AUTOTOK_BROWSER_CHANNEL`: Playwright channel such as `chrome`, to use an installed Chrome
 * - `AUTOTOK_BROWSER`: where the login and signing browser runs: `local` (default),
 *   `browserbase` or `steel`
 */
import { homedir } from "node:os";
import { join } from "node:path";

export const TIKTOK_LOGIN_URL = "https://www.tiktok.com/login";

/**
 * Used when an account has no user agent recorded (e.g. sessions imported by hand). Accounts
 * saved by `login()` store the real user agent of the browser that created the session.
 */
export const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

/** An environment variable, with empty values treated as unset. */
export function env(name: string): string | undefined {
  return process.env[name] || undefined;
}

export function expandUser(path: string): string {
  if (path === "~") return homedir();
  if (path.startsWith("~/") || path.startsWith("~\\")) return join(homedir(), path.slice(2));
  return path;
}

export function home(): string {
  const value = env("AUTOTOK_HOME");
  return value ? expandUser(value) : join(homedir(), ".autotok");
}

export function accountsDir(): string {
  return join(home(), "accounts");
}

export function videosDir(): string {
  const value = env("AUTOTOK_VIDEOS_DIR");
  return value ? expandUser(value) : join(home(), "videos");
}

export function browserExecutable(): string | undefined {
  return env("AUTOTOK_BROWSER_PATH");
}

export function browserChannel(): string | undefined {
  return env("AUTOTOK_BROWSER_CHANNEL");
}

/** Name of the browser provider (`AUTOTOK_BROWSER`, default `local`). */
export function browserProvider(): string {
  return (env("AUTOTOK_BROWSER") ?? "local").trim().toLowerCase();
}
