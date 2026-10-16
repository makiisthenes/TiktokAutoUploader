// Copies the files the npm package shares with the Python package: TikTok's
// signing scripts (one copy lives in autotok/signer_js) and the licence files.
import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const pkg = join(dirname(fileURLToPath(import.meta.url)), "..");
const repo = join(pkg, "..");

const signerSrc = join(repo, "autotok", "signer_js");
const signerDest = join(pkg, "signer_js");
mkdirSync(signerDest, { recursive: true });
for (const name of readdirSync(signerSrc)) {
  if (name.endsWith(".js")) copyFileSync(join(signerSrc, name), join(signerDest, name));
}
for (const name of ["LICENSE", "THIRD_PARTY_NOTICES.md"]) {
  copyFileSync(join(repo, name), join(pkg, name));
}
