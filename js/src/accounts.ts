/**
 * Saved TikTok sessions.
 *
 * Each account is one JSON file in `$AUTOTOK_HOME/accounts/<name>.json` holding the TikTok
 * cookies, the user agent of the browser that logged in, and the account's proxy. It's the same
 * file the Python package reads and writes, so accounts logged in with either one work in both.
 * Files are written with `0600` permissions: a `sessionid` cookie is full access to the account.
 */
import { randomBytes } from "node:crypto";
import { chmod, mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { AccountNotFoundError, ValidationError } from "./errors.ts";
import { parseProxy, type Proxy } from "./proxy.ts";
import { accountsDir } from "./settings.ts";

export const SESSION_COOKIE = "sessionid";
export const DATACENTER_COOKIE = "tt-target-idc";

const NAME_RE = /^[A-Za-z0-9_.-]{1,128}$/;

/** A cookie as Playwright reports it (extra fields are kept). */
export interface Cookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
  [key: string]: unknown;
}

/** The on-disk format, shared with the Python package (hence snake_case). */
export interface AccountData {
  name: string;
  cookies?: Cookie[];
  user_agent?: string | null;
  proxy?: string | null;
  created_at?: string;
  updated_at?: string;
}

export function validateAccountName(name: string): string {
  if (typeof name !== "string" || !NAME_RE.test(name) || name === "." || name === "..") {
    throw new ValidationError(`invalid account name ${JSON.stringify(name)}: use 1-128 letters, digits, '.', '_' or '-'`);
  }
  return name;
}

/** `2026-01-31T12:00:00+00:00`, like Python's `isoformat(timespec="seconds")`. */
function now(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "+00:00");
}

export interface AccountInit {
  name: string;
  cookies?: Cookie[];
  userAgent?: string | null;
  proxy?: string | Proxy | null;
  createdAt?: string;
  updatedAt?: string;
}

export class Account {
  readonly name: string;
  cookies: Cookie[];
  userAgent: string | null;
  /** The proxy URL, credentials included (`null` for none). */
  proxy: string | null;
  createdAt: string;
  updatedAt: string;

  constructor(init: AccountInit) {
    this.name = validateAccountName(init.name);
    this.cookies = [...(init.cookies ?? [])];
    this.userAgent = init.userAgent ?? null;
    this.proxy = parseProxy(init.proxy)?.url ?? null;
    this.createdAt = init.createdAt ?? now();
    this.updatedAt = init.updatedAt ?? now();
  }

  cookie(name: string): string | null {
    const found = this.cookies.find((c) => c.name === name && c.value);
    return found ? String(found.value) : null;
  }

  get sessionId(): string | null {
    return this.cookie(SESSION_COOKIE);
  }

  get datacenter(): string | null {
    return this.cookie(DATACENTER_COOKIE);
  }

  get hasSession(): boolean {
    return this.sessionId !== null;
  }

  getProxy(): Proxy | null {
    return parseProxy(this.proxy);
  }

  /** Build an account from a `sessionid` copied out of a browser. */
  static fromSessionId(
    name: string,
    sessionId: string,
    { datacenter, userAgent, proxy }: { datacenter?: string | null; userAgent?: string | null; proxy?: string | Proxy | null } = {},
  ): Account {
    if (!sessionId?.trim()) throw new ValidationError("session id is empty");
    const cookies = [tiktokCookie(SESSION_COOKIE, sessionId.trim())];
    if (datacenter) cookies.push(tiktokCookie(DATACENTER_COOKIE, datacenter.trim()));
    return new Account({ name, cookies, userAgent: userAgent ?? null, proxy: proxy ?? null });
  }

  toDict(): AccountData {
    return {
      name: this.name,
      cookies: this.cookies,
      user_agent: this.userAgent,
      proxy: this.proxy,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
    };
  }

  static fromDict(data: AccountData): Account {
    if (!data || typeof data !== "object" || typeof data.name !== "string") throw new TypeError("missing account name");
    return new Account({
      name: data.name,
      cookies: Array.isArray(data.cookies) ? data.cookies : [],
      userAgent: data.user_agent ?? null,
      proxy: data.proxy ?? null,
      createdAt: data.created_at || now(),
      updatedAt: data.updated_at || now(),
    });
  }

  /** `console.log(account)` shows no cookies and masks the proxy password. */
  [Symbol.for("nodejs.util.inspect.custom")](): string {
    const proxy = this.getProxy();
    return `Account { name: ${JSON.stringify(this.name)}, hasSession: ${this.hasSession}, proxy: ${proxy ? JSON.stringify(proxy.masked()) : null} }`;
  }
}

function tiktokCookie(name: string, value: string): Cookie {
  return { name, value, domain: ".tiktok.com", path: "/" };
}

export class AccountStore {
  readonly root: string;

  constructor(root?: string) {
    this.root = root ?? accountsDir();
  }

  pathFor(name: string): string {
    return join(this.root, `${validateAccountName(name)}.json`);
  }

  async exists(name: string): Promise<boolean> {
    try {
      return (await stat(this.pathFor(name))).isFile();
    } catch {
      return false;
    }
  }

  async load(name: string): Promise<Account> {
    const path = this.pathFor(name);
    let text: string;
    try {
      text = await readFile(path, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        throw new AccountNotFoundError(
          `no saved session for '${name}' in ${this.root}. Log in first: login("${name}") or autotok login -n ${name}`,
        );
      }
      throw error;
    }
    try {
      return Account.fromDict(JSON.parse(text) as AccountData);
    } catch (error) {
      throw new ValidationError(`account file ${path} is unreadable (${(error as Error).message}); log in again`);
    }
  }

  async save(account: Account): Promise<string> {
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    const path = this.pathFor(account.name);
    account.updatedAt = now();
    const tmp = join(this.root, `.tmp-${randomBytes(6).toString("hex")}`);
    try {
      await writeFile(tmp, JSON.stringify(account.toDict(), null, 2), { mode: 0o600, flag: "wx" });
      await chmod(tmp, 0o600);
      await rename(tmp, path);
    } catch (error) {
      await rm(tmp, { force: true }).catch(() => {});
      throw error;
    }
    return path;
  }

  /** Delete the saved session. Returns whether there was one. */
  async delete(name: string): Promise<boolean> {
    try {
      await rm(this.pathFor(name));
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
      throw error;
    }
  }

  /** Names of every saved account, sorted. */
  async list(): Promise<string[]> {
    let entries: string[];
    try {
      entries = await readdir(this.root);
    } catch {
      return [];
    }
    return entries
      .filter((n) => n.endsWith(".json"))
      .map((n) => n.slice(0, -".json".length))
      .filter((n) => NAME_RE.test(n))
      .sort();
  }

  /** Save `proxy` as the account's proxy (`null` to go direct). */
  async setProxy(name: string, proxy: string | Proxy | null): Promise<Account> {
    const account = await this.load(name);
    account.proxy = parseProxy(proxy)?.url ?? null;
    await this.save(account);
    return account;
  }
}
