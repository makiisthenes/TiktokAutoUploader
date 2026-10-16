import assert from "node:assert/strict";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { inspect } from "node:util";
import { beforeEach, test } from "node:test";
import { Account, AccountNotFoundError, AccountStore, importSession, ValidationError } from "../src/index.ts";
import { isolatedHome } from "./helpers.ts";

let home: string;
beforeEach(() => {
  ({ home } = isolatedHome());
});

// What the Python package writes for `autotok login` (AccountStore.save).
const PYTHON_FILE = `{
  "name": "alice",
  "cookies": [
    {"name": "sessionid", "value": "sess-123", "domain": ".tiktok.com", "path": "/", "expires": 1799999999.5,
     "httpOnly": true, "secure": true, "sameSite": "None"},
    {"name": "tt-target-idc", "value": "useast5", "domain": ".tiktok.com", "path": "/"},
    {"name": "msToken", "value": "x", "domain": "www.tiktok.com", "path": "/"}
  ],
  "user_agent": "UA/1.0",
  "proxy": "http://bob:secret@proxy.example:8000",
  "created_at": "2026-10-01T10:00:00+00:00",
  "updated_at": "2026-10-02T10:00:00+00:00"
}`;

test("reads accounts saved by the Python package", async () => {
  mkdirSync(join(home, "accounts"));
  writeFileSync(join(home, "accounts", "alice.json"), PYTHON_FILE);
  const store = new AccountStore();
  assert.deepEqual(await store.list(), ["alice"]);
  const account = await store.load("alice");
  assert.equal(account.sessionId, "sess-123");
  assert.equal(account.datacenter, "useast5");
  assert.equal(account.userAgent, "UA/1.0");
  assert.equal(account.getProxy()?.password, "secret");
  assert.equal(account.createdAt, "2026-10-01T10:00:00+00:00");
});

test("saves in the Python package's format, owner-only", async () => {
  const store = new AccountStore();
  const path = await store.save(Account.fromSessionId("bob", " sess ", { datacenter: "useast5", proxy: "h.example:1:u:p" }));
  const data = JSON.parse(readFileSync(path, "utf8"));
  assert.deepEqual(Object.keys(data), ["name", "cookies", "user_agent", "proxy", "created_at", "updated_at"]);
  assert.equal(data.proxy, "http://u:p@h.example:1");
  assert.deepEqual(data.cookies[0], { name: "sessionid", value: "sess", domain: ".tiktok.com", path: "/" });
  assert.match(data.updated_at, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\+00:00$/);
  if (process.platform !== "win32") assert.equal(statSync(path).mode & 0o777, 0o600);
  assert.equal((await store.load("bob")).sessionId, "sess");
});

test("missing, unreadable and invalid accounts", async () => {
  const store = new AccountStore();
  await assert.rejects(store.load("nobody"), AccountNotFoundError);
  mkdirSync(join(home, "accounts"));
  writeFileSync(join(home, "accounts", "broken.json"), "{not json");
  await assert.rejects(store.load("broken"), ValidationError);
  for (const bad of ["..", ".", "a/b", "a\\b", "", "x".repeat(129)]) {
    assert.throws(() => store.pathFor(bad), ValidationError, bad);
  }
});

test("set proxy, list, delete", async () => {
  const store = new AccountStore();
  await importSession("carol", "s1", { store });
  assert.equal((await store.setProxy("carol", "socks5://h.example:1080")).proxy, "socks5://h.example:1080");
  assert.equal((await store.setProxy("carol", null)).proxy, null);
  assert.deepEqual(await store.list(), ["carol"]);
  assert.equal(await store.delete("carol"), true);
  assert.equal(await store.delete("carol"), false);
  assert.deepEqual(await store.list(), []);
});

test("console.log(account) hides the session and the proxy password", () => {
  const account = Account.fromSessionId("dave", "topsession", { proxy: "http://u:topsecret@h.example:1" });
  const shown = inspect(account);
  assert.ok(!shown.includes("topsession") && !shown.includes("topsecret"), shown);
});
