/**
 * Where login and signing browsers run.
 *
 * A small factory picks the {@link BrowserProvider} named by `AUTOTOK_BROWSER`:
 *
 * - `local`: Chromium on this machine (default)
 * - `browserbase`: Browserbase cloud browsers (`BROWSERBASE_API_KEY`)
 * - `steel`: Steel Cloud, or a self-hosted steel-browser server (`STEEL_BASE_URL`)
 *
 * Add your own with {@link registerProvider}:
 *
 * ```ts
 * class MyProvider extends CloudProvider {
 *   override label = "My cloud";
 *   async createSession({ proxy, timeoutMs, offline }) { ... }
 * }
 * registerProvider("mycloud", () => new MyProvider());   // then AUTOTOK_BROWSER=mycloud
 * ```
 */
import { ConfigurationError } from "../errors.ts";
import { browserProvider } from "../settings.ts";
import type { BrowserHandle, BrowserProvider, OpenOptions } from "./base.ts";
import { BrowserbaseProvider } from "./browserbase.ts";
import { LocalProvider } from "./local.ts";
import { SteelProvider } from "./steel.ts";

export { BrowserHandle, BrowserProvider, CloudProvider, type CloudSession, type OpenOptions } from "./base.ts";
export { BrowserbaseProvider, BrowserbaseSession } from "./browserbase.ts";
export { installBrowser, launchChromium, LocalProvider } from "./local.ts";
export { SteelProvider, SteelSession } from "./steel.ts";

const registry = new Map<string, () => BrowserProvider>([
  ["local", () => new LocalProvider()],
  ["browserbase", () => new BrowserbaseProvider()],
  ["steel", () => new SteelProvider()],
]);

/** Make `factory` available as `AUTOTOK_BROWSER=<name>`. */
export function registerProvider(name: string, factory: () => BrowserProvider): void {
  registry.set(name.trim().toLowerCase(), factory);
}

export function availableProviders(): string[] {
  return [...registry.keys()].sort();
}

/** The provider called `name`, or the one `AUTOTOK_BROWSER` selects. */
export function getProvider(name?: string | null): BrowserProvider {
  const key = (name || browserProvider()).trim().toLowerCase();
  const factory = registry.get(key);
  if (!factory) {
    throw new ConfigurationError(`unknown browser provider '${key}'; use one of: ${availableProviders().join(", ")}`);
  }
  return factory();
}

/** Start a browser from the selected provider. */
export function openBrowser(options: OpenOptions & { provider?: string | null } = {}): Promise<BrowserHandle> {
  const { provider, ...rest } = options;
  return getProvider(provider).open(rest);
}
