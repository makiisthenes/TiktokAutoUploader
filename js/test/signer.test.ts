// Runs TikTok's signing scripts in a real headless Chromium, offline. Skipped when Playwright's
// Chromium isn't installed (CI installs it with `npx playwright install chromium`).
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { BrowserNotInstalledError, Signer } from "../src/index.ts";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
const URL_ = "https://www.tiktok.com/api/v1/web/project/post/?app_name=tiktok_web&channel=tiktok_web&device_platform=web&aid=1988&msToken=abc";

// The page fetch goes to a proxy that doesn't exist, so the stub page is used and nothing
// reaches TikTok.
const signer = new Signer(UA, { proxy: "http://u:p@proxy.invalid:8000", timeoutMs: 20_000 });
let skip: string | false = false;

before(async () => {
  try {
    await signer.start();
  } catch (error) {
    if (error instanceof BrowserNotInstalledError) skip = "Chromium for Playwright is not installed";
    else throw error;
  }
});

after(() => signer.close());

test("signatures have TikTok's format", async (t) => {
  if (skip) return t.skip(skip);
  const sig = await signer.sign(URL_);
  assert.ok(sig.signature.startsWith("_02B4Z6wo00f01"), sig.signature);
  assert.equal(sig.xBogus.length, 28);
  assert.ok(sig.signedUrl.startsWith(`${URL_}&verifyFp=`));
  assert.ok(sig.signedUrl.endsWith(`&X-Bogus=${sig.xBogus}`));
});

test("a signer is reusable", async (t) => {
  if (skip) return t.skip(skip);
  const a = await signer.sign(URL_);
  const b = await signer.sign(`${URL_}x`);
  assert.ok(a.xBogus && b.xBogus);
});
