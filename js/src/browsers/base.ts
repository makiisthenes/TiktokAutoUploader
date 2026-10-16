/**
 * The browser provider interface.
 *
 * A {@link BrowserProvider} starts a browser and returns a {@link BrowserHandle}.
 * {@link CloudProvider} covers services that hand out a remote Chromium over CDP (Browserbase,
 * Steel): subclasses only implement `createSession`.
 */
import { chromium, type Browser, type BrowserContext, type BrowserContextOptions, type Page } from "playwright";
import { RemoteBrowserError } from "../errors.ts";
import type { Proxy } from "../proxy.ts";
import { redactUrls } from "./util.ts";

/** A remote browser session. */
export interface CloudSession {
  readonly id: string;
  /** CDP endpoint for Playwright's `connectOverCDP`. */
  readonly connectUrl: string;
  /** Link that lets a person watch and control the browser. */
  liveViewUrl(): Promise<string>;
  /** End the session now (stops billing). Must not throw. */
  release(): Promise<void>;
}

export interface OpenOptions {
  headless?: boolean;
  /** Route the browser's traffic through the account's proxy. */
  proxy?: Proxy | null;
  args?: string[];
  /**
   * Offline browsers only run page scripts (every request is fulfilled by a route handler), so
   * they need no proxy.
   */
  offline?: boolean;
  /** How long a cloud session may live. */
  timeoutMs?: number | null;
}

/** A running browser: local Chromium, or a cloud session. */
export class BrowserHandle {
  readonly browser: Browser;
  readonly session: CloudSession | null;
  readonly provider: string;

  constructor(browser: Browser, { session = null, provider = "local" }: { session?: CloudSession | null; provider?: string } = {}) {
    this.browser = browser;
    this.session = session;
    this.provider = provider;
  }

  get isRemote(): boolean {
    return this.session !== null;
  }

  /**
   * A browser context to work in. Cloud sessions come with one preconfigured context
   * (fingerprint, proxy), so `options` only apply to local browsers.
   */
  async context(options: BrowserContextOptions = {}): Promise<BrowserContext> {
    if (this.isRemote) return this.browser.contexts()[0] ?? (await this.browser.newContext());
    return this.browser.newContext(options);
  }

  /** The context's first page (cloud sessions open with one), or a new one. */
  async page(context: BrowserContext): Promise<Page> {
    return context.pages()[0] ?? (await context.newPage());
  }

  async liveViewUrl(): Promise<string | null> {
    return this.session ? this.session.liveViewUrl() : null;
  }

  async close(): Promise<void> {
    await this.browser.close().catch(() => {});
    await this.session?.release();
  }
}

/** Starts browsers for login and signing. */
export abstract class BrowserProvider {
  /** Human-readable name used in messages. */
  readonly label: string = "browser";

  abstract open(options?: OpenOptions): Promise<BrowserHandle>;
}

/** A provider that hands out remote Chromium sessions over CDP. */
export abstract class CloudProvider extends BrowserProvider {
  /**
   * Start a remote session (its traffic goes through `proxy` if given). `offline` sessions only
   * run page scripts, so providers should skip any managed proxy for them.
   */
  abstract createSession(options: { proxy: Proxy | null; timeoutMs: number | null; offline: boolean }): Promise<CloudSession>;

  override async open({ proxy = null, offline = false, timeoutMs = null }: OpenOptions = {}): Promise<BrowserHandle> {
    const session = await this.createSession({ proxy: offline ? null : proxy, timeoutMs, offline });
    let browser: Browser;
    try {
      browser = await chromium.connectOverCDP(session.connectUrl);
    } catch (error) {
      await session.release();
      // The CDP URL can carry an API key or a signed token (Steel, Browserbase), and Playwright
      // may quote it in its error.
      throw new RemoteBrowserError(`could not connect to the ${this.label} session: ${redactUrls((error as Error).message)}`);
    }
    return new BrowserHandle(browser, { session, provider: this.label });
  }
}
