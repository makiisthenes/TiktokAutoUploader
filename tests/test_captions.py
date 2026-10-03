from autotok.captions import build_caption, utf16_len


def test_hashtags_get_markup_and_offsets():
    markup, extra = build_caption("Hello #fyp and #cats")
    assert markup == 'Hello <h id="0">#fyp</h> and <h id="1">#cats</h>'
    assert [(e["start"], e["end"], e["hashtag_name"], e["type"]) for e in extra] == [
        (6, 10, "fyp", 1),
        (15, 20, "cats", 1),
    ]


def test_offsets_are_utf16_like_the_web_client():
    text = "🔥🔥 #fyp"
    _, extra = build_caption(text)
    # each emoji is 2 UTF-16 code units
    assert extra[0]["start"] == 5 and extra[0]["end"] == 9
    assert utf16_len(text) == 9


def test_mentions_resolved_or_left_plain():
    ids = {"bob": "42"}
    markup, extra = build_caption("hi @bob and @ghost. #x", resolve_user=ids.get)
    assert markup == 'hi <m id="0">@bob</m> and @ghost. <h id="1">#x</h>'
    assert extra[0] == {"start": 3, "end": 7, "type": 0, "user_id": "42",
                        "hashtag_name": "", "tag_id": "0"}
    assert len(extra) == 2


def test_plain_text_untouched():
    assert build_caption("no tags # here @") == ("no tags # here @", [])
