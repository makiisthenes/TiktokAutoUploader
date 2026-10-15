/**
 * autotok: upload and schedule TikTok videos from Node.js and TypeScript.
 *
 * ```ts
 * import { login, uploadVideo, Client } from "autotok";
 *
 * await login("alice");                                    // opens a browser once
 * await uploadVideo("alice", "clip.mp4", "Hello #fyp");
 *
 * const client = await Client.fromAccount("alice", { proxy: "http://user:pass@host:8000" });
 * await client.upload("clip.mp4", "Scheduled #fyp", { schedule: Date.now() + 3_600_000 });
 * ```
 *
 * Accounts live in `~/.autotok/accounts`, shared with the Python package and its CLI.
 */
export const VERSION = "0.1.0";

export { Account, AccountStore, validateAccountName, type AccountData, type AccountInit, type Cookie } from "./accounts.ts";
export { importSession, login, openLoginSession, waitForSessionCookies, type LoginOptions, type LoginSessionOptions } from "./auth.ts";
export {
  availableProviders,
  BrowserbaseProvider,
  BrowserHandle,
  BrowserProvider,
  CloudProvider,
  getProvider,
  installBrowser,
  LocalProvider,
  openBrowser,
  registerProvider,
  SteelProvider,
  type CloudSession,
  type OpenOptions,
} from "./browsers/index.ts";
export { buildCaption, type Caption, type TextExtra, type UserResolver } from "./captions.ts";
export { loadEnv, parseEnv } from "./env.ts";
export {
  AccountNotFoundError,
  AutotokError,
  BrowserNotInstalledError,
  ConfigurationError,
  LoginError,
  NotLoggedInError,
  PublishError,
  PublishUncertainError,
  RemoteBrowserError,
  SigningError,
  UploadError,
  ValidationError,
} from "./errors.ts";
export { checkProxy } from "./http.ts";
export { setLogger, type Logger } from "./log.ts";
export { parseProxy, Proxy, type PlaywrightProxy, type ProxyScheme } from "./proxy.ts";
export { Signer, type Signature, type SignerLike, type SignerOptions } from "./signer.ts";
export {
  Client,
  resolveSchedule,
  resolveVideoPath,
  uploadVideo,
  type ClientOptions,
  type Schedule,
  type UploadOptions,
  type UploadResult,
  type VideoInput,
  type Visibility,
} from "./uploader.ts";
