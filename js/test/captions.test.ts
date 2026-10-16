import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCaption } from "../src/index.ts";

// Generated with the Python package's autotok.captions.build_caption, resolving
// @bob -> "42" and @a.b_c -> "9", so both packages post identical captions.
const PYTHON: { text: string; markup: string; extra: [number, number, string, number, string, string][] }[] = [
  { text: "Hello #fyp and #cats", markup: 'Hello <h id="0">#fyp</h> and <h id="1">#cats</h>',
    extra: [[6, 10, "fyp", 1, "", "0"], [15, 20, "cats", 1, "", "1"]] },
  { text: "🔥🔥 #fyp", markup: '🔥🔥 <h id="0">#fyp</h>', extra: [[5, 9, "fyp", 1, "", "0"]] },
  { text: "hi @bob and @ghost. #x", markup: 'hi <m id="0">@bob</m> and @ghost. <h id="1">#x</h>',
    extra: [[3, 7, "", 0, "42", "0"], [20, 22, "x", 1, "", "1"]] },
  { text: "no tags # here @", markup: "no tags # here @", extra: [] },
  { text: "#café #日本語 #été2024 @a.b_c.",
    markup: '<h id="0">#café</h> <h id="1">#日本語</h> <h id="2">#été2024</h> <m id="3">@a.b_c</m>.',
    extra: [[0, 5, "café", 1, "", "0"], [6, 10, "日本語", 1, "", "1"], [11, 19, "été2024", 1, "", "2"], [20, 26, "", 0, "9", "3"]] },
  { text: "mail me@example.com #ok", markup: 'mail me@example.com <h id="0">#ok</h>', extra: [[20, 23, "ok", 1, "", "0"]] },
  { text: "issue#12 and C# and #_under", markup: 'issue<h id="0">#12</h> and C# and <h id="1">#_under</h>',
    extra: [[5, 8, "12", 1, "", "0"], [20, 27, "_under", 1, "", "1"]] },
  { text: "#हिन्दी test", markup: '<h id="0">#ह</h>िन्दी test', extra: [[0, 2, "ह", 1, "", "0"]] },
  { text: "👨‍👩‍👧 family #fam👍 @bob🔥", markup: '👨‍👩‍👧 family <h id="0">#fam</h>👍 <m id="1">@bob</m>🔥',
    extra: [[16, 20, "fam", 1, "", "0"], [23, 27, "", 0, "42", "1"]] },
  { text: "tab\t#t\nnew #line", markup: 'tab\t<h id="0">#t</h>\nnew <h id="1">#line</h>',
    extra: [[4, 6, "t", 1, "", "0"], [11, 16, "line", 1, "", "1"]] },
];

const ids: Record<string, string> = { bob: "42", "a.b_c": "9" };

test("captions match the Python package, offsets in UTF-16 units", async () => {
  for (const { text, markup, extra } of PYTHON) {
    const caption = await buildCaption(text, (u) => ids[u] ?? null);
    assert.equal(caption.markup, markup, text);
    assert.deepEqual(
      caption.textExtra.map((e) => [e.start, e.end, e.hashtag_name, e.type, e.user_id, e.tag_id]),
      extra,
      text,
    );
  }
});

test("text_extra has the fields TikTok expects", async () => {
  const { textExtra } = await buildCaption("hi @bob", () => "42");
  assert.deepEqual(textExtra[0], { end: 7, hashtag_name: "", start: 3, tag_id: "0", type: 0, user_id: "42" });
});

test("works without a resolver: mentions stay plain text", async () => {
  assert.deepEqual(await buildCaption("@bob #a"), {
    markup: '@bob <h id="0">#a</h>',
    textExtra: [{ end: 7, hashtag_name: "a", start: 5, tag_id: "0", type: 1, user_id: "" }],
  });
});
