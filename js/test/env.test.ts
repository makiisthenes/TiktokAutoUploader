import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { loadEnv, parseEnv } from "../src/index.ts";
import { isolatedHome } from "./helpers.ts";

test("parses .env syntax like the Python package", () => {
  assert.deepEqual(
    parseEnv([
      "# comment",
      "",
      "A=1",
      "export B = two ",
      'C="quoted # not a comment"',
      "D='single'",
      "E=value  # note",
      "F=tab\t# note",
      "bad line",
      "G=",
      "=nokey",
      "H-I=dash",
      "___=underscores",
    ].join("\n")),
    { A: "1", B: "two", C: "quoted # not a comment", D: "single", E: "value", F: "tab", G: "" },
  );
});

test("loadEnv reads $AUTOTOK_HOME/.env and never overrides set variables", () => {
  const { home } = isolatedHome();
  writeFileSync(join(home, ".env"), "﻿AUTOTOK_TEST_NEW=from-file\nAUTOTOK_TEST_SET=from-file\n");
  process.env.AUTOTOK_TEST_SET = "from-env";
  const read = loadEnv(join(home, ".env"));
  assert.deepEqual(read, [join(home, ".env")]);
  assert.equal(process.env.AUTOTOK_TEST_NEW, "from-file");
  assert.equal(process.env.AUTOTOK_TEST_SET, "from-env");
  assert.deepEqual(loadEnv(join(home, "missing.env")), []);
});
