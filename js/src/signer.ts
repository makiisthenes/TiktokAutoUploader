/**
 * TikTok request signing (`_signature` and `X-Bogus`).
 *
 * TikTok's own obfuscated JavaScript computes the signatures, so it runs inside a headless
 * Chromium page on the `www.tiktok.com` origin. The browser never touches the network itself:
 * the page request is made from Node (through the account's proxy, if any) so TikTok's cookies
 * land in the browser, Chromium is given a blank page on that origin, and every other request
 * is blocked.
 *
 * A {@link Signer} can be reused for many signatures; starting it costs about two seconds. With
 * a cloud browser (`AUTOTOK_BROWSER=browserbase` or `steel`) the page runs remotely; the page
 * fetch and every other request still go through the route handler, so TikTok traffic keeps
 * using the account's proxy.
 */
import { fileURLToPath } from "node:url";
import { devices, type BrowserContext, type Page, type Route } from "playwright";
import { openBrowser, type BrowserHandle } from "./browsers/index.ts";
import { AutotokError, SigningError } from "./errors.ts";
import { CookieJar, describe, HttpClient } from "./http.ts";
import { log } from "./log.ts";
import { parseProxy, type Proxy } from "./proxy.ts";

const SCRIPTS_DIR = new URL("../signer_js/", import.meta.url);
const SCRIPTS = ["signer.js", "webmssdk.js", "xbogus.js"];
export const PAGE_URL = "https://www.tiktok.com/api/v1/web/project/post/";
export const VERIFY_FP = "verify_5b161567bda98b6a50c0414d99909d4b";
const STUB_HTML = "<!doctype html><html><head></head><body></body></html>";

/** What TikTok's scripts add to the page. */
interface SigningWindow {
  byted_acrawler?: { sign(options: { url: string }): string };
  generateBogus?(query: string, userAgent: string): string;
}

export interface Signature {
  signature: string;
  xBogus: string;
  verifyFp: string;
  signedUrl: string;
}

/** Anything that can sign a TikTok URL; pass your own to `Client` to reuse or stub signing. */
export interface SignerLike {
  sign(url: string): Promise<Signature>;
}

export interface SignerOptions {
  /** Proxy for the page fetch (the account's proxy). */
  proxy?: string | Proxy | null;
  timeoutMs?: number;
}

const randomInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

export class Signer implements SignerLike {
  readonly userAgent: string;
  readonly proxy: Proxy | null;
  readonly timeoutMs: number;
  #http: HttpClient;
  #handle: BrowserHandle | null = null;
  #context: BrowserContext | null = null;
  #page: Page | null = null;
  #starting: Promise<Page> | null = null;

  constructor(userAgent: string, { proxy = null, timeoutMs = 30_000 }: SignerOptions = {}) {
    this.userAgent = userAgent;
    this.proxy = parseProxy(proxy);
    this.timeoutMs = timeoutMs;
    this.#http = this.#newHttp();
  }

  /** A started signer. */
  static async start(userAgent: string, options: SignerOptions = {}): Promise<Signer> {
    const signer = new Signer(userAgent, options);
    await signer.start();
    return signer;
  }

  #newHttp(): HttpClient {
    return new HttpClient({
      proxy: this.proxy,
      jar: new CookieJar(),
      timeoutMs: this.timeoutMs,
      headers: { "user-agent": this.userAgent, accept: "text/html,application/json,*/*" },
    });
  }

  async start(): Promise<void> {
    if (this.#page) return;
    this.#starting ??= this.#start().finally(() => {
      this.#starting = null;
    });
    await this.#starting;
  }

  async #start(): Promise<Page> {
    try {
      // Locally, the browser points at a closed port: anything that slips past the route
      // handler (e.g. Chrome's preconnect) fails instead of reaching TikTok from the real IP.
      this.#handle = await openBrowser({ headless: true, offline: true, timeoutMs: Math.max(300_000, this.timeoutMs * 4) });
      let page: Page;
      if (this.#handle.isRemote) {
        this.#context = await this.#handle.context();
        page = await this.#handle.page(this.#context);
      } else {
        const { defaultBrowserType: _, ...device } = devices["iPhone 11 Pro"];
        this.#context = await this.#handle.context({
          ...device,
          userAgent: this.userAgent,
          locale: "en-US",
          deviceScaleFactor: randomInt(1, 3),
          isMobile: Math.random() > 0.5,
          hasTouch: Math.random() > 0.5,
          viewport: { width: randomInt(320, 1920), height: randomInt(320, 1920) },
          bypassCSP: true,
        });
        page = await this.#context.newPage();
      }
      await page.route("**/*", (route) => this.#route(route));
      await page.goto(PAGE_URL, { waitUntil: "load", timeout: this.timeoutMs });
      for (const name of SCRIPTS) await page.addScriptTag({ path: fileURLToPath(new URL(name, SCRIPTS_DIR)) });
      await page.waitForFunction(
        () => {
          const w = globalThis as unknown as SigningWindow;
          return typeof w.byted_acrawler?.sign === "function" && typeof w.generateBogus === "function";
        },
        undefined,
        { timeout: this.timeoutMs },
      );
      this.#page = page;
      return page;
    } catch (error) {
      await this.close();
      if (error instanceof AutotokError) throw error;
      throw new SigningError(`could not start the signing browser: ${describe(error)}`, { cause: error });
    }
  }

  async #route(route: Route): Promise<void> {
    const request = route.request();
    if (request.resourceType() !== "document") {
      await route.abort().catch(() => {});
      return;
    }
    try {
      await this.#http.request(request.url());
      const cookies = this.#http.jar!.all().map((c) => ({
        name: c.name,
        value: c.value,
        domain: c.hostOnly ? c.domain : `.${c.domain}`,
        path: c.path,
        secure: c.secure,
      }));
      if (cookies.length) await this.#context?.addCookies(cookies);
    } catch (error) {
      // The signature code runs locally; a stub page on the right origin is enough.
      log.debug(`signer page fetch failed (${describe(error)}); using stub page`);
    }
    await route.fulfill({ status: 200, contentType: "text/html", body: STUB_HTML }).catch(() => {});
  }

  async sign(url: string): Promise<Signature> {
    if (!this.#page) await this.start();
    const page = this.#page!;
    let token: string;
    let bogus: string;
    let signed: string;
    try {
      const urlFp = `${url}${new URL(url).search.length > 1 ? "&" : "?"}verifyFp=${VERIFY_FP}`;
      token = await page.evaluate((u) => (globalThis as unknown as SigningWindow).byted_acrawler!.sign({ url: u }), urlFp);
      signed = `${urlFp}&_signature=${token}`;
      const query = await page.evaluate((u) => new URL(u).searchParams.toString(), signed);
      bogus = await page.evaluate(
        ([q, ua]) => (globalThis as unknown as SigningWindow).generateBogus!(q, ua),
        [query, this.userAgent] as const,
      );
    } catch (error) {
      throw new SigningError(`signature generation failed: ${describe(error)}`, { cause: error });
    }
    if (!token || !bogus) throw new SigningError("signature generation returned an empty value");
    return { signature: token, xBogus: bogus, verifyFp: VERIFY_FP, signedUrl: `${signed}&X-Bogus=${bogus}` };
  }

  async close(): Promise<void> {
    const handle = this.#handle;
    this.#page = this.#context = this.#handle = null;
    await handle?.close().catch(() => {});
    await this.#http.close();
    this.#http = this.#newHttp();
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }
}
