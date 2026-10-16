/** Uploading and publishing videos through TikTok's web upload API. */
import { randomInt, randomUUID } from "node:crypto";
import { open, stat } from "node:fs/promises";
import { basename, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { crc32 } from "node:zlib";
import { Account, AccountStore } from "./accounts.ts";
import { buildCaption, makeUserResolver, type TextExtra } from "./captions.ts";
import {
  NotLoggedInError,
  PublishError,
  PublishUncertainError,
  UploadError,
  ValidationError,
} from "./errors.ts";
import { CookieJar, describe, HttpClient, NetworkError, type HttpResponse } from "./http.ts";
import { log } from "./log.ts";
import { parseProxy, type Proxy } from "./proxy.ts";
import { DEFAULT_USER_AGENT, expandUser, videosDir } from "./settings.ts";
import { Signer, type Signature, type SignerLike } from "./signer.ts";
import { signV4, type AwsCredentials } from "./sigv4.ts";

export const MAX_CAPTION_LENGTH = 2200;
const MINUTE = 60_000;
const DAY = 86_400_000;
export const MIN_SCHEDULE_MS = 15 * MINUTE;
export const MAX_SCHEDULE_MS = 30 * DAY;
// TikTok gives some accounts 30 days to schedule and others only 10, depending on account and region.
const SHORT_SCHEDULE_WINDOW_MS = 10 * DAY;
export const CHUNK_SIZE = 5 * 1024 * 1024;
const DEFAULT_DATACENTER = "useast2a";
const AID = 1988;
const TT = "https://www.tiktok.com";

/**
 * When to publish: a `Date`, a timestamp in milliseconds (`Date.now() + 3_600_000`) or an ISO
 * 8601 string, between 15 minutes and 30 days ahead. `null`/omitted publishes now.
 */
export type Schedule = Date | number | string | null | undefined;
export type Visibility = "public" | "private" | 0 | 1;

/** A video file path (or a name in your videos folder), a `file:` URL, or the video's bytes. */
export type VideoInput = string | URL | Uint8Array;

export interface UploadOptions {
  schedule?: Schedule;
  /** Default `"public"`. TikTok doesn't allow scheduling private videos. */
  visibility?: Visibility;
  /** Default `true`. */
  allowComment?: boolean;
  /** Default `false`. */
  allowDuet?: boolean;
  /** Default `false`. */
  allowStitch?: boolean;
  /** Label the video as AI-generated. Default `false`. */
  aiLabel?: boolean;
}

/** What TikTok returned for a successful post. */
export interface UploadResult {
  videoId: string;
  creationId: string;
  /** When TikTok will publish it, or `null` if it was published now. */
  scheduledFor: Date | null;
  response: Record<string, unknown>;
}

export interface ClientOptions {
  /**
   * `true` (default): the account's saved proxy. `false` or `null`: no proxy. Or a proxy
   * (string or {@link Proxy}) to use instead.
   */
  proxy?: string | Proxy | boolean | null;
  /** Per-request timeout. Default 60 s. */
  timeoutMs?: number;
  /** Signs the publish request. Default: a headless {@link Signer} started for each upload. */
  signer?: SignerLike;
  /** Bytes per upload request. Default 5 MiB. */
  chunkSize?: number;
}

interface VideoSource {
  name: string;
  size: number;
  chunks(size: number): AsyncGenerator<Uint8Array>;
}

/** Find `video` as given, or by name in the videos folder. */
export async function resolveVideoPath(video: string | URL): Promise<string> {
  const path = video instanceof URL ? fileURLToPath(video) : expandUser(video);
  const candidates = [path];
  if (!isAbsolute(path)) candidates.push(join(videosDir(), path));
  for (const candidate of candidates) {
    try {
      if ((await stat(candidate)).isFile()) return resolve(candidate);
    } catch {
      // try the next one
    }
  }
  throw new ValidationError(`video not found: ${String(video)} (also looked in: ${videosDir()})`);
}

async function videoSource(video: VideoInput): Promise<VideoSource> {
  if (video instanceof Uint8Array) {
    return {
      name: "video bytes",
      size: video.byteLength,
      async *chunks(size) {
        for (let at = 0; at < video.byteLength; at += size) yield video.subarray(at, at + size);
      },
    };
  }
  const path = await resolveVideoPath(video);
  return {
    name: basename(path),
    size: (await stat(path)).size,
    async *chunks(size) {
      const file = await open(path, "r");
      try {
        for (;;) {
          const buffer = Buffer.allocUnsafe(size);
          const { bytesRead } = await file.read(buffer, 0, size, null);
          if (!bytesRead) return;
          yield buffer.subarray(0, bytesRead);
        }
      } finally {
        await file.close();
      }
    },
  };
}

/** Validate `schedule` and return the publish time, or `null` to publish now. */
export function resolveSchedule(schedule: Schedule, now: number = Date.now()): Date | null {
  if (schedule === null || schedule === undefined) return null;
  let at: Date;
  if (schedule instanceof Date) at = new Date(schedule.getTime());
  else if (typeof schedule === "number" || typeof schedule === "string") at = new Date(schedule);
  else throw new ValidationError(`unsupported schedule value: ${String(schedule)}`);
  if (Number.isNaN(at.getTime())) throw new ValidationError(`invalid schedule: ${String(schedule)}`);
  const delay = at.getTime() - now;
  if (delay < MIN_SCHEDULE_MS || delay > MAX_SCHEDULE_MS) {
    const hint = typeof schedule === "number" && schedule < 1e11
      ? "; a number is a timestamp in milliseconds (e.g. Date.now() + 3_600_000), not a delay"
      : "";
    throw new ValidationError(
      `TikTok only accepts schedules between 15 minutes and 30 days ahead (got ${at.toISOString()}${hint})`,
    );
  }
  return at;
}

function visibilityCode(value: Visibility): 0 | 1 {
  const key = typeof value === "string" ? value.toLowerCase() : value;
  if (key === "public" || key === 0) return 0;
  if (key === "private" || key === 1) return 1;
  throw new ValidationError("visibility must be 0/'public' or 1/'private'");
}

function creationId(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_";
  return Array.from({ length: 21 }, () => alphabet[randomInt(alphabet.length)]).join("");
}

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function jsonBody(r: HttpResponse, what: string): Json {
  const data = r.json();
  if (!isObject(data)) {
    throw new UploadError(`${what}: TikTok returned a non-JSON response (HTTP ${r.status})`, {
      status: r.status,
      body: r.text().slice(0, 500),
    });
  }
  return data;
}

/** Follow `path` (keys and array indexes) into parsed JSON; `undefined` if any step is missing. */
function dig(value: unknown, ...path: (string | number)[]): unknown {
  for (const key of path) {
    if (value === null || typeof value !== "object") return undefined;
    value = (value as Record<string | number, unknown>)[key];
  }
  return value;
}

/**
 * An authenticated TikTok uploader for one account.
 *
 * ```ts
 * const client = await Client.fromAccount("alice");
 * await client.upload("clip.mp4", "Hello #fyp");
 * ```
 */
export class Client {
  readonly account: Account;
  readonly proxy: Proxy | null;
  readonly userAgent: string;
  readonly timeoutMs: number;
  readonly #signer: SignerLike | null;
  readonly #chunkSize: number;

  constructor(account: Account, { proxy = true, timeoutMs = 60_000, signer, chunkSize = CHUNK_SIZE }: ClientOptions = {}) {
    if (!account.hasSession) {
      throw new NotLoggedInError(`account '${account.name}' has no TikTok session. Log in first: login("${account.name}")`);
    }
    this.account = account;
    this.proxy = proxy === true ? account.getProxy() : proxy === false ? null : parseProxy(proxy);
    this.userAgent = account.userAgent ?? DEFAULT_USER_AGENT;
    this.timeoutMs = timeoutMs;
    this.#signer = signer ?? null;
    this.#chunkSize = chunkSize;
  }

  /** A client for a saved account (uses its saved proxy unless `proxy` says otherwise). */
  static async fromAccount(name: string, { store, ...options }: ClientOptions & { store?: AccountStore } = {}): Promise<Client> {
    return new Client(await (store ?? new AccountStore()).load(name), options);
  }

  /** A client for a `sessionid` copied out of a browser, without saving an account. */
  static fromSessionId(
    sessionId: string,
    { datacenter, userAgent, ...options }: ClientOptions & { datacenter?: string | null; userAgent?: string | null } = {},
  ): Client {
    return new Client(Account.fromSessionId("session", sessionId, { datacenter: datacenter ?? null, userAgent: userAgent ?? null }), options);
  }

  // -- helpers ----------------------------------------------------------------

  #session(): HttpClient {
    const jar = new CookieJar();
    jar.set("sessionid", this.account.sessionId!);
    let datacenter = this.account.datacenter;
    if (!datacenter) {
      log.warn(`No TikTok datacenter cookie saved for '${this.account.name}'; assuming ${DEFAULT_DATACENTER}. Log in again if uploads fail.`);
      datacenter = DEFAULT_DATACENTER;
    }
    jar.set("tt-target-idc", datacenter);
    return new HttpClient({
      proxy: this.proxy,
      jar,
      timeoutMs: this.timeoutMs,
      headers: { "user-agent": this.userAgent, accept: "application/json, text/plain, */*" },
    });
  }

  async #request(
    http: HttpClient,
    method: string,
    url: string,
    what: string,
    { expectOk = true, headers, body, timeoutMs, aws }: {
      expectOk?: boolean;
      headers?: Record<string, string>;
      body?: string | Uint8Array;
      timeoutMs?: number;
      aws?: AwsCredentials;
    } = {},
  ): Promise<HttpResponse> {
    let sent = headers ?? {};
    if (aws) {
      const base = { "user-agent": this.userAgent, accept: "application/json, text/plain, */*", ...sent };
      sent = { ...sent, ...signV4({ method, url, headers: base, body: body ?? null }, aws, { region: "ap-singapore-1", service: "vod" }) };
    }
    let r: HttpResponse;
    try {
      r = await http.request(url, { method, headers: sent, ...(body !== undefined ? { body } : {}), ...(timeoutMs ? { timeoutMs } : {}) });
    } catch (error) {
      if (error instanceof NetworkError) throw new UploadError(`${what}: network error: ${error.message}`, { cause: error });
      throw error;
    }
    if (expectOk && r.status !== 200) {
      throw new UploadError(`${what}: HTTP ${r.status}`, { status: r.status, body: r.text().slice(0, 500) });
    }
    return r;
  }

  /** Whether TikTok still accepts the saved session for uploads. */
  async checkSession(): Promise<boolean> {
    const http = this.#session();
    try {
      const r = await this.#request(http, "GET", `${TT}/api/v1/video/upload/auth/?aid=${AID}`, "session check", { expectOk: false });
      const data = r.json();
      return r.status === 200 && isObject(data) && "video_token_v5" in data;
    } finally {
      await http.close();
    }
  }

  // -- upload -----------------------------------------------------------------

  /**
   * Upload `video` and publish it with `caption`. Throws a subclass of `AutotokError` on failure;
   * check `error.retryable` before trying again.
   */
  async upload(video: VideoInput, caption: string, options: UploadOptions = {}): Promise<UploadResult> {
    const { schedule, visibility = 0, allowComment = true, allowDuet = false, allowStitch = false, aiLabel = false } = options;
    if (typeof caption !== "string" || !caption.trim()) throw new ValidationError("caption is required");
    // Counted in code points, like the Python package.
    if ([...caption].length > MAX_CAPTION_LENGTH) {
      throw new ValidationError(`caption must be at most ${MAX_CAPTION_LENGTH} characters`);
    }
    const vis = visibilityCode(visibility);
    // Fixed now, so a slow upload doesn't push the publish time back.
    const startedAt = Date.now();
    const publishAt = resolveSchedule(schedule, startedAt);
    if (publishAt && vis === 1) throw new ValidationError("TikTok does not allow scheduling private videos");
    const source = await videoSource(video);
    if (!source.size) throw new ValidationError(`video is empty: ${source.name}`);

    log.info(`Uploading ${source.name} as '${this.account.name}'${this.proxy ? ` via proxy ${this.proxy.masked()}` : ""}`);
    const http = this.#session();
    try {
      const id = creationId();
      const project = jsonBody(
        await this.#request(http, "POST", `${TT}/api/v1/web/project/create/?creation_id=${id}&type=1&aid=${AID}`, "create project"),
        "create project",
      );
      if (!("project" in project)) {
        throw new UploadError(
          "create project: TikTok did not return a project. The session may have expired or the datacenter cookie is wrong; log in again.",
          { body: JSON.stringify(project).slice(0, 500) },
        );
      }

      const videoId = await this.#transfer(http, source);

      const { markup, textExtra } = await buildCaption(caption, makeUserResolver(http, this.userAgent, this.timeoutMs));
      const payload = buildPayload({ creationId: id, videoId, caption, markup, textExtra, visibility: vis, allowComment, allowDuet, allowStitch, aiLabel });
      let scheduledFor: Date | null = null;
      if (publishAt) {
        let ts = Math.floor(publishAt.getTime() / 1000);
        const earliest = Math.floor((Date.now() + MIN_SCHEDULE_MS) / 1000);
        if (ts < earliest) {
          log.warn("The upload took long enough that the scheduled time is now less than 15 minutes away; publishing 15 minutes from now instead.");
          ts = earliest;
        }
        payload.feature.schedule_time = ts;
        scheduledFor = new Date(ts * 1000);
      }

      let response: Json;
      try {
        response = await this.#publish(http, payload.body);
      } catch (error) {
        if (error instanceof PublishError && publishAt && publishAt.getTime() - startedAt > SHORT_SCHEDULE_WINDOW_MS) {
          throw new PublishError(
            `${error.message}. This post was scheduled more than 10 days ahead, and some accounts can only schedule up to 10 days; try an earlier time.`,
            { statusCode: error.statusCode, statusMsg: error.statusMsg, response: error.response, cause: error },
          );
        }
        throw error;
      }
      log.debug(`Published${scheduledFor ? `, scheduled for ${scheduledFor.toISOString()}` : ""}`);
      return { videoId, creationId: id, scheduledFor, response };
    } finally {
      await http.close();
    }
  }

  /** Send the video to TikTok's storage. Returns TikTok's video id. */
  async #transfer(http: HttpClient, source: VideoSource): Promise<string> {
    const auth = jsonBody(await this.#request(http, "GET", `${TT}/api/v1/video/upload/auth/?aid=${AID}`, "upload auth"), "upload auth");
    const token = auth.video_token_v5;
    const accessKeyId = dig(token, "access_key_id");
    const secretAccessKey = dig(token, "secret_acess_key"); // sic: TikTok's spelling
    const sessionToken = dig(token, "session_token");
    if (typeof accessKeyId !== "string" || typeof secretAccessKey !== "string") {
      throw new NotLoggedInError(
        `TikTok rejected the session for '${this.account.name}'. Log in again: login("${this.account.name}") or autotok login -n ${this.account.name} --force`,
      );
    }
    const aws: AwsCredentials = { accessKeyId, secretAccessKey, sessionToken: typeof sessionToken === "string" ? sessionToken : null };

    const applyUrl =
      `${TT}/top/v1?Action=ApplyUploadInner&Version=2020-11-19&SpaceName=tiktok&FileType=video&IsInner=1&FileSize=${source.size}&s=g158iqx8434`;
    const apply = jsonBody(await this.#request(http, "GET", applyUrl, "apply upload", { aws }), "apply upload");
    const node = dig(apply, "Result", "InnerUploadAddress", "UploadNodes", 0);
    const videoId = dig(node, "Vid");
    const storeUri = dig(node, "StoreInfos", 0, "StoreUri");
    const storeAuth = dig(node, "StoreInfos", 0, "Auth");
    const uploadHost = dig(node, "UploadHost");
    const sessionKey = dig(node, "SessionKey");
    if (![videoId, storeUri, storeAuth, uploadHost, sessionKey].every((v) => typeof v === "string")) {
      throw new UploadError("apply upload: unexpected response from TikTok", { body: JSON.stringify(apply).slice(0, 500) });
    }

    const uploadId = randomUUID();
    const crcs: string[] = [];
    let part = 0;
    for await (const chunk of source.chunks(this.#chunkSize)) {
      part++;
      const crc = crc32(chunk).toString(16).padStart(8, "0");
      crcs.push(crc);
      await this.#request(http, "POST", `https://${uploadHost}/${storeUri}?partNumber=${part}&uploadID=${uploadId}&phase=transfer`, `upload part ${part}`, {
        headers: {
          authorization: storeAuth as string,
          "content-type": "application/octet-stream",
          "content-disposition": 'attachment; filename="undefined"',
          "content-crc32": crc,
        },
        body: chunk,
        // A total (not idle) timeout, so leave room for slow proxies.
        timeoutMs: Math.max(this.timeoutMs, 300_000),
      });
      log.debug(`uploaded part ${part} (${chunk.byteLength} bytes)`);
    }
    if (!crcs.length) throw new ValidationError(`video is empty: ${source.name}`);

    // Finishing the multipart upload goes straight to the storage host without TikTok's
    // cookies, like the web client does.
    const bare = new HttpClient({ proxy: this.proxy, timeoutMs: this.timeoutMs, headers: { "user-agent": this.userAgent } });
    try {
      await this.#request(bare, "POST", `https://${uploadHost}/${storeUri}?uploadID=${uploadId}&phase=finish&uploadmode=part`, "finish upload", {
        headers: { authorization: storeAuth as string, "content-type": "text/plain;charset=UTF-8" },
        body: crcs.map((c, i) => `${i + 1}:${c}`).join(","),
      });
    } finally {
      await bare.close();
    }

    await this.#request(http, "POST", `${TT}/top/v1?Action=CommitUploadInner&Version=2020-11-19&SpaceName=tiktok`, "commit upload", {
      aws,
      body: JSON.stringify({ SessionKey: sessionKey, Functions: [{ name: "GetMeta" }] }),
    });
    await this.#request(http, "HEAD", TT, "tiktok.com", { expectOk: false, headers: { "user-agent": this.userAgent } });
    return videoId as string;
  }

  async #publish(http: HttpClient, payload: Json): Promise<Json> {
    const msToken = http.jar?.get("msToken") ?? "";
    const query = `app_name=tiktok_web&channel=tiktok_web&device_platform=web&aid=${AID}&msToken=${msToken}`;
    const toSign = `${TT}/api/v1/web/project/post/?${query}`;
    let sig: Signature;
    if (this.#signer) {
      sig = await this.#signer.sign(toSign);
    } else {
      const signer = new Signer(this.userAgent, { proxy: this.proxy, timeoutMs: this.timeoutMs });
      try {
        sig = await signer.sign(toSign);
      } finally {
        await signer.close();
      }
    }

    const params = new URLSearchParams({
      app_name: "tiktok_web",
      channel: "tiktok_web",
      device_platform: "web",
      aid: String(AID),
      msToken,
      "X-Bogus": sig.xBogus,
      _signature: sig.signature,
    });
    let r: HttpResponse;
    try {
      r = await http.request(`${TT}/tiktok/web/project/post/v1/?${params}`, {
        method: "POST",
        headers: { "content-type": "application/json", "user-agent": this.userAgent, origin: TT, referer: `${TT}/` },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      throw new PublishUncertainError(
        `publish request failed (${describe(error)}); the video may or may not have been posted. Check the account on TikTok before retrying.`,
        { cause: error },
      );
    }
    if (r.status !== 200) throw new PublishError(`publish: HTTP ${r.status}`, { statusMsg: r.text().slice(0, 300) });
    const data = r.json();
    if (!isObject(data)) {
      throw new PublishUncertainError("publish: TikTok returned a non-JSON response; check the account before retrying.");
    }
    if (data.status_code !== 0) {
      const code = data.status_code;
      const msg = typeof data.status_msg === "string" ? data.status_msg : "";
      throw new PublishError(`TikTok rejected the post: ${msg || "unknown error"} (status_code=${String(code)})`, {
        statusCode: typeof code === "number" ? code : null,
        statusMsg: msg,
        response: data,
      });
    }
    return data;
  }
}

function buildPayload(p: {
  creationId: string;
  videoId: string;
  caption: string;
  markup: string;
  textExtra: TextExtra[];
  visibility: 0 | 1;
  allowComment: boolean;
  allowDuet: boolean;
  allowStitch: boolean;
  aiLabel: boolean;
}): { body: Json; feature: Json } {
  const feature: Json = {
    geofencing_regions: [],
    playlist_name: "",
    playlist_id: "",
    tcm_params: '{"commerce_toggle_info":{}}',
    sound_exemption: 0,
    anchors: [],
    vedit_common_info: { draft: "", video_id: p.videoId },
    privacy_setting_info: {
      visibility_type: p.visibility,
      allow_duet: p.allowDuet ? 1 : 0,
      allow_stitch: p.allowStitch ? 1 : 0,
      allow_comment: p.allowComment ? 1 : 0,
    },
  };
  if (p.aiLabel) feature.aigc_info = { aigc_label_type: 1 };
  const body: Json = {
    post_common_info: { creation_id: p.creationId, enter_post_page_from: 1, post_type: 3 },
    feature_common_info_list: [feature],
    single_post_req_list: [
      {
        batch_index: 0,
        video_id: p.videoId,
        is_long_video: 0,
        single_post_feature_info: {
          text: p.caption,
          text_extra: p.textExtra,
          markup_text: p.markup,
          music_info: {},
          poster_delay: 0,
        },
      },
    ],
  };
  return { body, feature };
}

/**
 * One-call upload.
 *
 * ```ts
 * await uploadVideo("alice", "clip.mp4", "Hello #fyp");
 * ```
 */
export async function uploadVideo(
  account: string | Account,
  video: VideoInput,
  caption: string,
  { proxy = true, timeoutMs, signer, chunkSize, store, ...options }: UploadOptions & ClientOptions & { store?: AccountStore } = {},
): Promise<UploadResult> {
  const acct = account instanceof Account ? account : await (store ?? new AccountStore()).load(account);
  const client = new Client(acct, {
    proxy,
    ...(timeoutMs !== undefined ? { timeoutMs } : {}),
    ...(signer ? { signer } : {}),
    ...(chunkSize ? { chunkSize } : {}),
  });
  return client.upload(video, caption, options);
}
