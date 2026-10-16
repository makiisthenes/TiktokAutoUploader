/** Chromium on this machine (the default provider). */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { chromium, type Browser, type LaunchOptions } from "playwright";
import { BrowserNotInstalledError } from "../errors.ts";
import type { Proxy } from "../proxy.ts";
import { browserChannel, browserExecutable } from "../settings.ts";
import { BrowserHandle, BrowserProvider, type OpenOptions } from "./base.ts";

/** Hide the most obvious automation flags from the pages we open. */
export const STEALTH_ARGS = ["--disable-blink-features=AutomationControlled", "--disable-infobars"];

/** A proxy nobody listens on: used to make a browser fail closed. */
const BLACKHOLE_PROXY = { server: "http://127.0.0.1:9" };

/**
 * Launch Chromium honouring `AUTOTOK_BROWSER_PATH` / `AUTOTOK_BROWSER_CHANNEL`.
 *
 * `offline: true` routes the browser through a dead proxy so it cannot make any direct
 * connection (requests must be fulfilled by a route handler).
 */
export async function launchChromium({
  headless = true,
  proxy = null,
  args = [],
  offline = false,
}: { headless?: boolean; proxy?: Proxy | null; args?: string[]; offline?: boolean } = {}): Promise<Browser> {
  const options: LaunchOptions = {
    headless,
    args: [...STEALTH_ARGS, ...args],
    ignoreDefaultArgs: ["--enable-automation"],
  };
  const executable = browserExecutable();
  const channel = browserChannel();
  if (executable) options.executablePath = executable;
  else if (channel) options.channel = channel;
  if (offline) {
    options.proxy = BLACKHOLE_PROXY;
  } else if (proxy) {
    options.proxy = proxy.forPlaywright();
    // Stop WebRTC from revealing the real IP over UDP, around the proxy.
    options.args!.push("--force-webrtc-ip-handling-policy=disable_non_proxied_udp");
  }
  try {
    return await chromium.launch(options);
  } catch (error) {
    const message = String((error as Error).message ?? error);
    if (message.includes("Executable doesn't exist") || message.includes("playwright install")) {
      throw new BrowserNotInstalledError(
        "Chromium for Playwright is not installed. Run: npx playwright install chromium (or call installBrowser())",
      );
    }
    throw error;
  }
}

/**
 * Download the Chromium build that autotok's Playwright version uses (about 300 MB, once).
 * `withDeps` also installs the system libraries Chromium needs on Linux (run as root).
 * Resolves with the installer's exit code.
 */
export function installBrowser({ withDeps = false }: { withDeps?: boolean } = {}): Promise<number> {
  const cli = join(dirname(createRequire(import.meta.url).resolve("playwright/package.json")), "cli.js");
  const args = [cli, "install", ...(withDeps ? ["--with-deps"] : []), "chromium"];
  return new Promise((resolve, reject) => {
    spawn(process.execPath, args, { stdio: "inherit" }).on("error", reject).on("exit", (code) => resolve(code ?? 1));
  });
}

export class LocalProvider extends BrowserProvider {
  override readonly label = "local Chromium";

  override async open({ headless = true, proxy = null, args = [], offline = false }: OpenOptions = {}): Promise<BrowserHandle> {
    return new BrowserHandle(await launchChromium({ headless, proxy, args, offline }), { provider: this.label });
  }
}
