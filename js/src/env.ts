/**
 * Reading settings from `.env` files, the same way the Python package does.
 *
 * {@link loadEnv} reads `./.env`, then `$AUTOTOK_HOME/.env` (`~/.autotok/.env`), and never
 * overrides a variable that is already set. Nothing is loaded automatically: call it once at
 * startup if you keep settings such as `AUTOTOK_BROWSER` or `BROWSERBASE_API_KEY` in a file.
 */
import { readFileSync, realpathSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { home } from "./settings.ts";

/** Parse `KEY=value` lines. Supports comments, `export KEY=...` and single or double quotes. */
export function parseEnv(text: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const raw of text.split(/\r\n|\r|\n/)) {
    let line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("export ")) line = line.slice("export ".length).trimStart();
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (!/^[\p{L}\p{N}]+$/u.test(key.replaceAll("_", ""))) continue;
    let value = line.slice(eq + 1).trim();
    if (value.length >= 2 && value[0] === value.at(-1) && (value[0] === '"' || value[0] === "'")) {
      value = value.slice(1, -1);
    } else {
      // Unquoted values end at an inline comment: KEY=value  # note
      for (const marker of [" #", "\t#"]) {
        const at = value.indexOf(marker);
        if (at !== -1) value = value.slice(0, at).trimEnd();
      }
    }
    values[key] = value;
  }
  return values;
}

/**
 * Load `.env` files into `process.env` without overriding variables that are already set.
 *
 * With no arguments, reads `./.env` then `$AUTOTOK_HOME/.env`. Returns the files that were read.
 */
export function loadEnv(...paths: string[]): string[] {
  const read: string[] = [];
  const seen = new Set<string>();

  const load = (path: string) => {
    let text: string;
    try {
      if (!statSync(path).isFile()) return;
      const real = realpathSync(path);
      if (seen.has(real)) return;
      seen.add(real);
      text = readFileSync(path, "utf8").replace(/^﻿/, "");
    } catch {
      return;
    }
    for (const [key, value] of Object.entries(parseEnv(text))) {
      if (!(key in process.env)) process.env[key] = value;
    }
    read.push(path);
  };

  for (const path of paths.length ? paths : [resolve(".env")]) load(path);
  // Evaluated after ./.env, which may set AUTOTOK_HOME.
  if (!paths.length) load(join(home(), ".env"));
  return read;
}
