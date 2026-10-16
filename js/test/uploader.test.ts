// Mirrors tests/test_uploader.py: the same TikTok responses, the same expectations.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { crc32 } from "node:zlib";
import { afterEach, beforeEach, test } from "node:test";
import type { MockAgent } from "undici";
import {
  Account,
  AccountStore,
  Client,
  NotLoggedInError,
  PublishError,
  PublishUncertainError,
  UploadError,
  uploadVideo,
  ValidationError,
  type Signature,
  type SignerLike,
} from "../src/index.ts";
import { isolatedHome, mockNetwork, recordCall, writeVideo, type Call } from "./helpers.ts";

const TT = "https://www.tiktok.com";
const UPLOAD = "https://upload.example";
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

class FakeSigner implements SignerLike {
  urls: string[] = [];
  async sign(url: string): Promise<Signature> {
    this.urls.push(url);
    return { signature: "_sig", xBogus: "XBOGUS", verifyFp: "fp", signedUrl: url };
  }
}

let network: ReturnType<typeof mockNetwork>;
let video: string;
let account: Account;
let signer: FakeSigner;
let client: Client;

beforeEach(async () => {
  const { videos } = isolatedHome();
  video = writeVideo(videos);
  account = Account.fromSessionId("alice", "sess-123", { datacenter: "useast5", userAgent: "UA/1.0" });
  await new AccountStore().save(account);
  signer = new FakeSigner();
  client = new Client(account, { signer });
  network = mockNetwork();
});

afterEach(async () => {
  await network.restore();
});

type Reply = { status?: number; json?: unknown; error?: Error };

function mockTikTok(agent: MockAgent, calls: Call[], { publish = { json: { status_code: 0, status_msg: "" } } as Reply, applyStatus = 200, authJson = undefined as unknown } = {}) {
  const tt = agent.get(TT);
  const route = (method: string, prefix: string, reply: Reply & { headers?: Record<string, string>; body?: string }, origin = TT) => {
    const pool = origin === TT ? tt : agent.get(origin);
    const interceptor = pool.intercept({ method, path: (p: string) => p.startsWith(prefix) });
    if (reply.error) {
      interceptor.replyWithError(reply.error).persist();
      return;
    }
    interceptor
      .reply((opts) => {
        recordCall(calls, origin, opts);
        return {
          statusCode: reply.status ?? 200,
          data: reply.body ?? JSON.stringify(reply.json ?? {}),
          responseOptions: { headers: { "content-type": "application/json", ...reply.headers } },
        };
      })
      .persist();
  };
  route("POST", "/api/v1/web/project/create/", {
    json: { project: { project_id: "p1" } },
    headers: { "set-cookie": "msToken=MS123; Domain=.tiktok.com; Path=/" },
  });
  route("GET", "/api/v1/video/upload/auth/", {
    json: authJson ?? { video_token_v5: { access_key_id: "AK", secret_acess_key: "SK", session_token: "ST" } },
  });
  route("GET", "/top/v1?Action=ApplyUploadInner", {
    status: applyStatus,
    json: { Result: { InnerUploadAddress: { UploadNodes: [{
      Vid: "v123", UploadHost: "upload.example", SessionKey: "SKEY",
      StoreInfos: [{ StoreUri: "tos/abc", Auth: "STOREAUTH" }],
    }] } } },
  });
  route("POST", "/tos/abc", { json: {} }, UPLOAD);
  route("POST", "/top/v1?Action=CommitUploadInner", { json: {} });
  route("HEAD", "/", { body: "" });
  route("GET", "/@bob", { body: '"userInfo":{"user":{"id":"777"' });
  if (publish.error) {
    // Record the attempt, then fail the connection.
    tt.intercept({ method: "POST", path: (p: string) => p.startsWith("/tiktok/web/project/post/v1/") })
      .reply((opts) => {
        recordCall(calls, TT, opts);
        throw publish.error;
      });
  } else {
    route("POST", "/tiktok/web/project/post/v1/", publish);
  }
}

function publishCall(calls: Call[]): { call: Call; body: any } {
  const found = calls.filter((c) => c.url.startsWith(`${TT}/tiktok/web/project/post/v1/`));
  assert.equal(found.length, 1);
  return { call: found[0]!, body: JSON.parse(found[0]!.body!.toString()) };
}

test("upload sends the requested settings", async () => {
  mockTikTok(network.agent, network.calls);
  const result = await client.upload(video, "Hello #fyp @bob", {
    visibility: "private", allowComment: false, allowDuet: true, allowStitch: true, aiLabel: true,
  });
  assert.equal(result.videoId, "v123");
  assert.equal(result.scheduledFor, null);

  const { call, body } = publishCall(network.calls);
  const feature = body.feature_common_info_list[0];
  assert.deepEqual(feature.privacy_setting_info, { visibility_type: 1, allow_duet: 1, allow_stitch: 1, allow_comment: 0 });
  assert.deepEqual(feature.aigc_info, { aigc_label_type: 1 });
  assert.equal("schedule_time" in feature, false);
  const info = body.single_post_req_list[0].single_post_feature_info;
  assert.equal(info.text, "Hello #fyp @bob");
  assert.equal(info.markup_text, 'Hello <h id="0">#fyp</h> <m id="1">@bob</m>');
  assert.deepEqual(info.text_extra.map((e: { type: number }) => e.type), [1, 0]);
  assert.equal(info.text_extra[1].user_id, "777");
  assert.ok(call.url.includes("msToken=MS123") && call.url.includes("X-Bogus=XBOGUS"), call.url);
  assert.equal(call.headers["user-agent"], "UA/1.0");
  assert.ok(signer.urls[0]!.startsWith(`${TT}/api/v1/web/project/post/?`));
  assert.ok(signer.urls[0]!.includes("msToken=MS123"));
});

test("TikTok requests carry the session cookies; storage requests are signed", async () => {
  mockTikTok(network.agent, network.calls);
  await client.upload(video, "x");
  const create = network.calls.find((c) => c.url.includes("/project/create/"))!;
  assert.match(create.headers.cookie!, /sessionid=sess-123/);
  assert.match(create.headers.cookie!, /tt-target-idc=useast5/);
  for (const action of ["ApplyUploadInner", "CommitUploadInner"]) {
    const call = network.calls.find((c) => c.url.includes(action))!;
    assert.match(call.headers.authorization!, /^AWS4-HMAC-SHA256 Credential=AK\/\d{8}\/ap-singapore-1\/vod\/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date;x-amz-security-token, Signature=[0-9a-f]{64}$/);
    assert.equal(call.headers["x-amz-security-token"], "ST");
  }
});

test("defaults are public, comments on, no AI label", async () => {
  mockTikTok(network.agent, network.calls);
  await client.upload(video, "plain caption");
  const feature = publishCall(network.calls).body.feature_common_info_list[0];
  assert.deepEqual(feature.privacy_setting_info, { visibility_type: 0, allow_duet: 0, allow_stitch: 0, allow_comment: 1 });
  assert.equal("aigc_info" in feature, false);
});

test("schedule sets an absolute timestamp", async () => {
  mockTikTok(network.agent, network.calls);
  const at = new Date(Date.now() + HOUR);
  const result = await client.upload(video, "later", { schedule: at });
  const ts = publishCall(network.calls).body.feature_common_info_list[0].schedule_time;
  assert.equal(ts, Math.floor(at.getTime() / 1000));
  assert.deepEqual(result.scheduledFor, new Date(ts * 1000));
});

test("schedule accepts timestamps and ISO strings, up to 30 days", async () => {
  mockTikTok(network.agent, network.calls);
  const before = Math.floor(Date.now() / 1000);
  await client.upload(video, "a", { schedule: Date.now() + 30 * DAY - 1000 });
  await client.upload(video, "b", { schedule: new Date(Date.now() + 2 * HOUR).toISOString() });
  const times = network.calls
    .filter((c) => c.url.includes("/project/post/v1/"))
    .map((c) => JSON.parse(c.body!.toString()).feature_common_info_list[0].schedule_time);
  assert.ok(times[0] >= before + 30 * 86400 - 2);
  assert.ok(Math.abs(times[1] - (before + 7200)) <= 2);
});

test("chunks and CRCs", async () => {
  mockTikTok(network.agent, network.calls);
  await new Client(account, { signer, chunkSize: 1000 }).upload(video, "chunks");
  const parts = network.calls.filter((c) => c.url.includes("phase=transfer"));
  const finish = network.calls.filter((c) => c.url.includes("phase=finish"));
  const data = readFileSync(video);
  assert.equal(parts.length, Math.ceil(data.length / 1000));
  assert.equal(parts[0]!.headers["content-crc32"], crc32(data.subarray(0, 1000)).toString(16).padStart(8, "0"));
  assert.ok(parts.every((c) => c.headers["content-crc32"]!.length === 8 && c.headers.authorization === "STOREAUTH"));
  assert.deepEqual(Buffer.concat(parts.map((c) => c.body!)), data);
  assert.ok(finish[0]!.body!.toString().startsWith("1:"));
  assert.equal(finish[0]!.headers.cookie, undefined);
});

test("videos can be bytes", async () => {
  mockTikTok(network.agent, network.calls);
  const bytes = new Uint8Array(readFileSync(video));
  await client.upload(bytes, "from memory");
  const parts = network.calls.filter((c) => c.url.includes("phase=transfer"));
  assert.deepEqual(Buffer.concat(parts.map((c) => c.body!)), Buffer.from(bytes));
  assert.ok(network.calls.some((c) => c.url.includes(`FileSize=${bytes.byteLength}`)));
});

test("validation happens before anything is sent", async () => {
  mockTikTok(network.agent, network.calls);
  const cases: [Parameters<Client["upload"]>[2], RegExp][] = [
    [{ schedule: Date.now() + 60_000 }, /15 minutes/],
    [{ schedule: Date.now() + 31 * DAY }, /30 days/],
    [{ schedule: 3600 }, /timestamp in milliseconds/],
    [{ schedule: "not a date" }, /invalid schedule/],
    [{ schedule: Date.now() + HOUR, visibility: 1 }, /private/],
    [{ visibility: "friends" as never }, /visibility/],
  ];
  for (const [options, message] of cases) {
    await assert.rejects(client.upload(video, "x", options), (e: Error) => e instanceof ValidationError && message.test(e.message));
  }
  await assert.rejects(client.upload(video, "x".repeat(2201)), ValidationError);
  await assert.rejects(client.upload(video, "  "), ValidationError);
  await assert.rejects(client.upload("missing.mp4", "x"), /not found/);
  await assert.rejects(client.upload(new Uint8Array(), "x"), /empty/);
  assert.equal(network.calls.length, 0);
  // The limit counts characters (code points), like the Python package: 2200 emoji are fine.
  await client.upload(video, "🔥".repeat(2200));
  assert.equal(network.calls.filter((c) => c.url.includes("/project/create/")).length, 1);
});

test("a video is found by name in the videos folder", async () => {
  mockTikTok(network.agent, network.calls);
  await client.upload("clip.mp4", "by name");
  assert.equal(network.calls.filter((c) => c.url.includes("phase=transfer")).length, 1);
});

test("a TikTok rejection is not retryable", async () => {
  mockTikTok(network.agent, network.calls, {
    publish: { json: { status_code: 3013046, status_msg: "potential violation of our Community Guidelines" } },
  });
  await assert.rejects(client.upload(video, "x"), (e: PublishError) => {
    assert.ok(e instanceof PublishError);
    assert.equal(e.statusCode, 3013046);
    assert.equal(e.retryable, false);
    return true;
  });
});

test("a rejected long schedule mentions 10-day accounts; a short one doesn't", async () => {
  mockTikTok(network.agent, network.calls, { publish: { json: { status_code: 5, status_msg: "invalid parameters" } } });
  await assert.rejects(client.upload(video, "x", { schedule: Date.now() + 20 * DAY }), (e: PublishError) => {
    assert.match(e.message, /some accounts can only schedule up to 10 days/);
    assert.equal(e.statusCode, 5);
    assert.equal(e.statusMsg, "invalid parameters");
    return true;
  });
  await assert.rejects(client.upload(video, "x", { schedule: Date.now() + 5 * DAY }), (e: PublishError) => {
    assert.ok(!e.message.includes("10 days"));
    return true;
  });
});

test("a network error while publishing is uncertain, not retryable", async () => {
  mockTikTok(network.agent, network.calls, { publish: { error: new Error("connection reset") } });
  await assert.rejects(client.upload(video, "x"), (e: PublishUncertainError) => {
    assert.ok(e instanceof PublishUncertainError, String(e));
    assert.equal(e.retryable, false);
    assert.match(e.message, /may or may not have been posted/);
    return true;
  });
});

test("a failure before publishing is retryable and never reaches publish", async () => {
  mockTikTok(network.agent, network.calls, { applyStatus: 500 });
  await assert.rejects(client.upload(video, "x"), (e: UploadError) => {
    assert.ok(e instanceof UploadError);
    assert.equal(e.retryable, true);
    assert.equal(e.status, 500);
    return true;
  });
  assert.equal(network.calls.filter((c) => c.url.includes("/project/post/")).length, 0);
});

test("an expired session", async () => {
  mockTikTok(network.agent, network.calls, { authJson: { status_code: 8 } });
  await assert.rejects(client.upload(video, "x"), NotLoggedInError);
  assert.equal(await client.checkSession(), false);
});

test("checkSession", async () => {
  mockTikTok(network.agent, network.calls);
  assert.equal(await client.checkSession(), true);
});

test("accounts without a session are refused", () => {
  assert.throws(() => new Client(new Account({ name: "empty" })), NotLoggedInError);
});

test("uploadVideo loads a saved account by name", async () => {
  mockTikTok(network.agent, network.calls);
  const result = await uploadVideo("alice", video, "one call", { signer });
  assert.equal(result.videoId, "v123");
});

test("the account's proxy is used unless overridden", () => {
  const withProxy = Account.fromSessionId("p", "s", { proxy: "http://u:pw@h.example:8000" });
  assert.equal(new Client(withProxy).proxy?.host, "h.example");
  assert.equal(new Client(withProxy, { proxy: false }).proxy, null);
  assert.equal(new Client(withProxy, { proxy: "socks5://o.example:1080" }).proxy?.scheme, "socks5");
});
