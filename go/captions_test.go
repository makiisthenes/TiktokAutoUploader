package autotok

import (
	"context"
	"encoding/json"
	"testing"
)

// Generated with the Python package's autotok.captions.build_caption, resolving @bob -> "42"
// and @a.b_c -> "9", so all packages post identical captions.
var pythonCaptions = []struct {
	text, markup string
	extra        [][]any // start, end, hashtag_name, type, user_id, tag_id
}{
	{"Hello #fyp and #cats", `Hello <h id="0">#fyp</h> and <h id="1">#cats</h>`,
		[][]any{{6, 10, "fyp", 1, "", "0"}, {15, 20, "cats", 1, "", "1"}}},
	{"🔥🔥 #fyp", `🔥🔥 <h id="0">#fyp</h>`, [][]any{{5, 9, "fyp", 1, "", "0"}}},
	{"hi @bob and @ghost. #x", `hi <m id="0">@bob</m> and @ghost. <h id="1">#x</h>`,
		[][]any{{3, 7, "", 0, "42", "0"}, {20, 22, "x", 1, "", "1"}}},
	{"no tags # here @", "no tags # here @", nil},
	{"#café #日本語 #été2024 @a.b_c.", `<h id="0">#café</h> <h id="1">#日本語</h> <h id="2">#été2024</h> <m id="3">@a.b_c</m>.`,
		[][]any{{0, 5, "café", 1, "", "0"}, {6, 10, "日本語", 1, "", "1"}, {11, 19, "été2024", 1, "", "2"}, {20, 26, "", 0, "9", "3"}}},
	{"mail me@example.com #ok", `mail me@example.com <h id="0">#ok</h>`, [][]any{{20, 23, "ok", 1, "", "0"}}},
	{"issue#12 and C# and #_under", `issue<h id="0">#12</h> and C# and <h id="1">#_under</h>`,
		[][]any{{5, 8, "12", 1, "", "0"}, {20, 27, "_under", 1, "", "1"}}},
	{"#हिन्दी test", `<h id="0">#ह</h>िन्दी test`, [][]any{{0, 2, "ह", 1, "", "0"}}},
	{"👨‍👩‍👧 family #fam👍 @bob🔥", `👨‍👩‍👧 family <h id="0">#fam</h>👍 <m id="1">@bob</m>🔥`,
		[][]any{{16, 20, "fam", 1, "", "0"}, {23, 27, "", 0, "42", "1"}}},
	{"tab\t#t\nnew #line", "tab\t<h id=\"0\">#t</h>\nnew <h id=\"1\">#line</h>",
		[][]any{{4, 6, "t", 1, "", "0"}, {11, 16, "line", 1, "", "1"}}},
}

func TestCaptionsMatchThePythonPackage(t *testing.T) {
	ids := map[string]string{"bob": "42", "a.b_c": "9"}
	resolve := func(_ context.Context, u string) string { return ids[u] }
	for _, c := range pythonCaptions {
		got := BuildCaption(context.Background(), c.text, resolve)
		if got.Markup != c.markup {
			t.Errorf("%q markup: %s", c.text, got.Markup)
		}
		var extra [][]any
		for _, e := range got.TextExtra {
			extra = append(extra, []any{e.Start, e.End, e.HashtagName, e.Type, e.UserID, e.TagID})
		}
		if mustJSON(extra) != mustJSON(c.extra) {
			t.Errorf("%q extra: %v, want %v", c.text, extra, c.extra)
		}
	}
}

func TestTextExtraHasTheFieldsTikTokExpects(t *testing.T) {
	got := BuildCaption(context.Background(), "hi @bob", func(context.Context, string) string { return "42" })
	b, _ := json.Marshal(got.TextExtra[0])
	if string(b) != `{"end":7,"hashtag_name":"","start":3,"tag_id":"0","type":0,"user_id":"42"}` {
		t.Error(string(b))
	}
}

func TestCaptionsWithoutAResolverKeepMentionsAsText(t *testing.T) {
	got := BuildCaption(context.Background(), "@bob #a", nil)
	if got.Markup != `@bob <h id="0">#a</h>` || len(got.TextExtra) != 1 || got.TextExtra[0].Start != 5 {
		t.Errorf("%+v", got)
	}
	if empty := BuildCaption(context.Background(), "plain", nil); empty.TextExtra == nil {
		t.Error("text_extra must be [] for TikTok, not null")
	}
}
