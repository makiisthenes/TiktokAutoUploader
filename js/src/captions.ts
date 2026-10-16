/**
 * Caption markup: turns `#hashtags` and `@mentions` into the `markup_text` and `text_extra`
 * fields TikTok's web uploader sends, so they are clickable.
 *
 * Offsets are UTF-16 code units, like TikTok's JavaScript client (and JavaScript strings), so
 * captions with emoji keep their hashtags aligned. Matching follows the Python package exactly.
 */
import type { HttpClient } from "./http.ts";
import { describe } from "./http.ts";
import { log } from "./log.ts";

// Hashtags: word characters (Python's `\w`). Mentions: TikTok usernames are letters, digits,
// '_' and '.', and cannot end with '.'.
const TOKEN_RE = /#([\p{L}\p{N}_]+)|@([A-Za-z0-9_.]*[A-Za-z0-9_])/gu;
const USER_ID_RE = /"userInfo":\{"user":\{"id":"(\d+)"/;

/** Maps a username (without `@`) to TikTok's numeric user id, or `null` if unknown. */
export type UserResolver = (username: string) => Promise<string | null> | string | null;

export interface TextExtra {
  end: number;
  hashtag_name: string;
  start: number;
  tag_id: string;
  type: 0 | 1;
  user_id: string;
}

export interface Caption {
  markup: string;
  textExtra: TextExtra[];
}

/**
 * Build `markup_text` and `text_extra` for `text`. Mentions `resolveUser` can't resolve are
 * left as plain text instead of failing the upload.
 */
export async function buildCaption(text: string, resolveUser?: UserResolver | null): Promise<Caption> {
  const markup: string[] = [];
  const textExtra: TextExtra[] = [];
  let last = 0;
  let nextId = 0;
  for (const match of text.matchAll(TOKEN_RE)) {
    const start = match.index;
    const token = match[0];
    const [, hashtag, mention] = match;
    markup.push(text.slice(last, start));
    const end = start + token.length;

    if (hashtag) {
      textExtra.push(extra(start, end, 1, hashtag, "", nextId));
      markup.push(`<h id="${nextId}">${token}</h>`);
      nextId++;
    } else {
      const userId = resolveUser && mention ? await resolveUser(mention) : null;
      if (userId) {
        textExtra.push(extra(start, end, 0, "", userId, nextId));
        markup.push(`<m id="${nextId}">${token}</m>`);
        nextId++;
      } else {
        markup.push(token);
      }
    }
    last = end;
  }
  markup.push(text.slice(last));
  return { markup: markup.join(""), textExtra };
}

function extra(start: number, end: number, type: 0 | 1, hashtag: string, userId: string, tagId: number): TextExtra {
  return { end, hashtag_name: hashtag, start, tag_id: String(tagId), type, user_id: userId };
}

/** Resolve usernames by reading the profile page with the upload session. */
export function makeUserResolver(http: HttpClient, userAgent: string, timeoutMs = 15_000): UserResolver {
  const cache = new Map<string, string | null>();
  return async (username) => {
    if (cache.has(username)) return cache.get(username)!;
    let userId: string | null = null;
    try {
      const r = await http.request(`https://www.tiktok.com/@${username}`, {
        headers: { "user-agent": userAgent, accept: "text/html" },
        timeoutMs,
      });
      userId = USER_ID_RE.exec(r.text())?.[1] ?? null;
      if (!userId) log.warn(`Could not find TikTok user @${username}; leaving it as plain text`);
    } catch (error) {
      // Network errors must not fail the upload.
      log.warn(`Could not look up @${username} (${describe(error)}); leaving it as plain text`);
    }
    cache.set(username, userId);
    return userId;
  };
}
