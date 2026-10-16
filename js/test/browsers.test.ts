import assert from "node:assert/strict";
import { test } from "node:test";
import { CloudProvider, RemoteBrowserError, type CloudSession } from "../src/index.ts";
import { redactUrls } from "../src/browsers/util.ts";

test("URLs in messages lose their query strings", () => {
  assert.equal(
    redactUrls("connect ECONNREFUSED wss://connect.steel.dev/?sessionId=1&apiKey=sk_live (retrying)"),
    "connect ECONNREFUSED wss://connect.steel.dev/?**** (retrying)",
  );
  assert.equal(redactUrls("no urls here"), "no urls here");
});

test("a failed cloud connection doesn't leak the API key", async () => {
  let released = false;
  class Provider extends CloudProvider {
    override readonly label = "Test cloud";
    override async createSession(): Promise<CloudSession> {
      return {
        id: "s1",
        // Nothing listens on port 9, so Playwright fails and may quote the URL.
        connectUrl: "http://127.0.0.1:9/?sessionId=s1&apiKey=topsecret",
        liveViewUrl: async () => "",
        release: async () => {
          released = true;
        },
      };
    }
  }
  await assert.rejects(new Provider().open(), (error: Error) => {
    assert.ok(error instanceof RemoteBrowserError, String(error));
    assert.ok(!error.message.includes("topsecret"), error.message);
    return true;
  });
  assert.ok(released);
});
