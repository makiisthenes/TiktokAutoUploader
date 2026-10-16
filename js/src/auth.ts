/**
 * Logging in to TikTok and saving the session.
 *
 * {@link login} opens a real (headed) Chromium window on TikTok's login page, routed through
 * the account's proxy, and waits until TikTok sets the `sessionid` cookie. The cookies and the
 * browser's user agent are saved, so later uploads present the same browser identity that
 * created the session.
 *
 * With a cloud browser (`AUTOTOK_BROWSER=browserbase` or `steel`) the browser runs remotely
 * instead, and you log in through its live view link from your own browser.
 */
import type { BrowserContext, Page } from "playwright";
import { Account, AccountStore, DATACENTER_COOKIE, SESSION_COOKIE, validateAccountName, type Cookie } from "./accounts.ts";
import { openBrowser } from "./browsers/index.ts";
import { LoginError } from "./errors.ts";
import { describe } from "./http.ts";
import { log } from "./log.ts";
import { parseProxy, type Proxy } from "./proxy.ts";
import { TIKTOK_LOGIN_URL } from "./settings.ts";

const REQUIRED_COOKIES = [SESSION_COOKIE, DATACENTER_COOKIE];

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Poll `getCookies` until `sessionid` and `tt-target-idc` are set. Returns every TikTok cookie
 * at that moment. Throws {@link LoginError} on timeout, when `signal` aborts, or when the
 * browser is closed.
 */
export async function waitForSessionCookies(
  getCookies: () => Promise<Cookie[]>,
  {
    pollIntervalMs = 1000,
    timeoutMs = null,
    signal,
    sleep = delay,
  }: { pollIntervalMs?: number; timeoutMs?: number | null; signal?: AbortSignal; sleep?: (ms: number) => Promise<void> } = {},
): Promise<Cookie[]> {
  const start = performance.now();
  for (;;) {
    if (signal?.aborted) throw new LoginError("login cancelled");
    let cookies: Cookie[];
    try {
      cookies = await getCookies();
    } catch (error) {
      throw new LoginError(`the browser was closed before login finished (${describe(error)})`);
    }
    const names = new Set(cookies.filter((c) => c.value).map((c) => c.name));
    if (REQUIRED_COOKIES.every((n) => names.has(n))) {
      return cookies.filter((c) => String(c.domain ?? "").includes("tiktok"));
    }
    if (timeoutMs !== null && performance.now() - start > timeoutMs) {
      throw new LoginError(`timed out after ${Math.floor(timeoutMs / 1000)}s waiting for TikTok login`);
    }
    try {
      await sleep(pollIntervalMs);
    } catch (error) {
      // e.g. the user closed the browser window
      throw new LoginError(`the browser was closed before login finished (${describe(error)})`);
    }
  }
}

/**
 * Cloud live views show only the login tab, so a popup (e.g. "Continue with Google") would be
 * invisible and steal focus from it. Close popups and keep the login tab in front.
 */
async function keepLoginTabInFront(context: BrowserContext, loginPage: Page): Promise<void> {
  let closed = false;
  for (const p of context.pages()) {
    if (p !== loginPage && !p.isClosed()) {
      await p.close().then(() => (closed = true), () => {});
    }
  }
  if (closed) {
    log.warn("Closed a popup window: popups (e.g. 'Continue with Google') can't be shown in the live view. " +
      "Log in with the QR code, email/username or phone instead.");
    await loginPage.bringToFront().catch(() => {});
  }
}

export interface LoginSessionOptions {
  proxy?: string | Proxy | null;
  /** Give up after this long (default 10 minutes); `null` waits until the window is closed. */
  timeoutMs?: number | null;
  /** Abort to cancel the login. */
  signal?: AbortSignal;
  /** With a cloud browser, receives the link to log in through (default: logged as a warning). */
  onLiveUrl?: (url: string) => void;
}

/** Open a browser for the user to log in. Resolves with the TikTok cookies and the browser's user agent. */
export async function openLoginSession({
  proxy = null,
  timeoutMs = 600_000,
  signal,
  onLiveUrl,
}: LoginSessionOptions = {}): Promise<{ cookies: Cookie[]; userAgent: string }> {
  const p = parseProxy(proxy);
  const handle = await openBrowser({
    headless: false,
    proxy: p,
    args: ["--start-maximized"],
    timeoutMs: (timeoutMs ?? 3_600_000) + 300_000,
  });
  try {
    let context: BrowserContext;
    let page: Page;
    if (handle.isRemote) {
      context = await handle.context();
      page = await handle.page(context);
    } else {
      context = await handle.context({ viewport: null });
      page = await context.newPage();
    }
    let userAgent: string;
    try {
      await page.goto(TIKTOK_LOGIN_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
      userAgent = await page.evaluate(() => (globalThis as unknown as { navigator: { userAgent: string } }).navigator.userAgent);
    } catch (error) {
      throw new LoginError(`could not open TikTok's login page${p ? " (check the proxy)" : ""}: ${describe(error)}`);
    }
    if (handle.isRemote) {
      const url = (await handle.liveViewUrl()) ?? "";
      (onLiveUrl ?? ((u: string) => log.warn(`Open this link in your browser and log in to TikTok there:\n  ${u}`)))(url);
    }

    const cookies = await waitForSessionCookies(
      async () => {
        if (page.isClosed()) throw new Error("page closed");
        if (handle.isRemote) await keepLoginTabInFront(context, page);
        return (await context.cookies()) as Cookie[];
      },
      { timeoutMs, ...(signal ? { signal } : {}), sleep: (ms) => page.waitForTimeout(ms) },
    );
    return { cookies, userAgent };
  } finally {
    await handle.close();
  }
}

export interface LoginOptions extends LoginSessionOptions {
  store?: AccountStore;
}

/**
 * Log in through a browser window and save the session as `name`.
 *
 * ```ts
 * await login("alice", { proxy: "http://user:pass@gate.example.com:7000" });
 * ```
 */
export async function login(name: string, { store, proxy = null, ...options }: LoginOptions = {}): Promise<Account> {
  validateAccountName(name);
  const p = parseProxy(proxy);
  const { cookies, userAgent } = await openLoginSession({ ...options, proxy: p });
  const account = new Account({ name, cookies, userAgent, proxy: p });
  await (store ?? new AccountStore()).save(account);
  log.info(`Saved session for '${name}'`);
  return account;
}

/** Save a `sessionid` copied from a browser's cookies (no browser needed). */
export async function importSession(
  name: string,
  sessionId: string,
  {
    datacenter = null,
    userAgent = null,
    proxy = null,
    store,
  }: { datacenter?: string | null; userAgent?: string | null; proxy?: string | Proxy | null; store?: AccountStore } = {},
): Promise<Account> {
  const account = Account.fromSessionId(name, sessionId, { datacenter, userAgent, proxy });
  await (store ?? new AccountStore()).save(account);
  return account;
}
