import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getGlobalDispatcher, MockAgent, setGlobalDispatcher, type Dispatcher } from "undici";

/** Fresh AUTOTOK_HOME and videos folder; returns their paths. */
export function isolatedHome(): { home: string; videos: string } {
  const root = mkdtempSync(join(tmpdir(), "autotok-js-"));
  const home = join(root, "home");
  const videos = join(root, "videos");
  mkdirSync(home);
  mkdirSync(videos);
  process.env.AUTOTOK_HOME = home;
  process.env.AUTOTOK_VIDEOS_DIR = videos;
  process.env.AUTOTOK_BROWSER = "local";
  return { home, videos };
}

export function writeVideo(dir: string, name = "clip.mp4"): string {
  const path = join(dir, name);
  writeFileSync(path, Buffer.concat([Buffer.from("\x00\x00\x00\x18ftypmp42", "latin1"), Buffer.alloc(2048, "x")]));
  return path;
}

export interface Call {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: Buffer | null;
}

/** Swap undici's global dispatcher for a MockAgent that refuses real network access. */
export function mockNetwork(): { agent: MockAgent; calls: Call[]; restore: () => Promise<void> } {
  const previous: Dispatcher = getGlobalDispatcher();
  const agent = new MockAgent();
  agent.disableNetConnect();
  setGlobalDispatcher(agent);
  return {
    agent,
    calls: [],
    restore: async () => {
      setGlobalDispatcher(previous);
      await agent.close();
    },
  };
}

export function recordCall(calls: Call[], origin: string, opts: { method: string; path: string; headers?: unknown; body?: unknown }): Call {
  const headers: Record<string, string> = {};
  const raw = opts.headers;
  if (Array.isArray(raw)) {
    for (let i = 0; i < raw.length; i += 2) headers[String(raw[i]).toLowerCase()] = String(raw[i + 1]);
  } else if (raw && typeof raw === "object") {
    for (const [k, v] of Object.entries(raw)) headers[k.toLowerCase()] = String(v);
  }
  const body = opts.body === undefined || opts.body === null
    ? null
    : Buffer.from(typeof opts.body === "string" ? opts.body : (opts.body as Uint8Array));
  const call = { method: opts.method, url: origin + opts.path, headers, body };
  calls.push(call);
  return call;
}
