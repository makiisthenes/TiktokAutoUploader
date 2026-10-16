import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import * as autotok from "../src/index.ts";

test("VERSION matches package.json", () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(autotok.VERSION, pkg.version);
});

test("errors: one base class, retryable only before publish", () => {
  const { AutotokError } = autotok;
  const cases: [Error, boolean][] = [
    [new autotok.UploadError("x"), true],
    [new autotok.SigningError("x"), true],
    [new autotok.RemoteBrowserError("x"), true],
    [new autotok.PublishError("x"), false],
    [new autotok.PublishUncertainError("x"), false],
    [new autotok.ValidationError("x"), false],
    [new autotok.NotLoggedInError("x"), false],
  ];
  for (const [error, retryable] of cases) {
    assert.ok(error instanceof AutotokError && error instanceof Error);
    assert.equal((error as InstanceType<typeof AutotokError>).retryable, retryable, error.name);
    assert.notEqual(error.name, "Error");
  }
});
