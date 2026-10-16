package autotok

// Caption markup: turns #hashtags and @mentions into the markup_text and text_extra fields
// TikTok's web uploader sends, so they are clickable.
//
// Offsets are UTF-16 code units, like TikTok's JavaScript client, so captions with emoji keep
// their hashtags aligned. Matching follows the Python package exactly.

import (
	"context"
	"regexp"
	"strconv"
	"sync"
	"time"
	"unicode/utf8"
)

// Hashtags: word characters (Python's \w). Mentions: TikTok usernames are letters, digits, '_'
// and '.', and cannot end with '.'.
var (
	captionTokenRE = regexp.MustCompile(`#([\p{L}\p{N}_]+)|@([A-Za-z0-9_.]*[A-Za-z0-9_])`)
	userIDRE       = regexp.MustCompile(`"userInfo":\{"user":\{"id":"(\d+)"`)
)

// UserResolver maps a username (without @) to TikTok's numeric user id, or "" if unknown.
type UserResolver func(ctx context.Context, username string) string

// TextExtra is one hashtag or mention in TikTok's text_extra list.
type TextExtra struct {
	End         int    `json:"end"`
	HashtagName string `json:"hashtag_name"`
	Start       int    `json:"start"`
	TagID       string `json:"tag_id"`
	// Type is 1 for a hashtag, 0 for a mention.
	Type   int    `json:"type"`
	UserID string `json:"user_id"`
}

// Caption is a caption's markup_text and text_extra.
type Caption struct {
	Markup    string
	TextExtra []TextExtra
}

// BuildCaption builds markup_text and text_extra for text. Mentions resolve can't resolve (or
// all mentions, when resolve is nil) are left as plain text instead of failing the upload.
func BuildCaption(ctx context.Context, text string, resolve UserResolver) Caption {
	var markup []byte
	extras := []TextExtra{}
	last, lastUnits := 0, 0
	nextID := 0
	for _, m := range captionTokenRE.FindAllStringSubmatchIndex(text, -1) {
		start, end := m[0], m[1]
		token := text[start:end]
		markup = append(markup, text[last:start]...)
		startUnits := lastUnits + utf16Len(text[last:start])
		endUnits := startUnits + utf16Len(token)

		if m[2] != -1 {
			extras = append(extras, TextExtra{End: endUnits, HashtagName: text[m[2]:m[3]], Start: startUnits, TagID: strconv.Itoa(nextID), Type: 1})
			markup = append(markup, `<h id="`+strconv.Itoa(nextID)+`">`+token+`</h>`...)
			nextID++
		} else {
			userID := ""
			if resolve != nil {
				userID = resolve(ctx, text[m[4]:m[5]])
			}
			if userID != "" {
				extras = append(extras, TextExtra{End: endUnits, Start: startUnits, TagID: strconv.Itoa(nextID), Type: 0, UserID: userID})
				markup = append(markup, `<m id="`+strconv.Itoa(nextID)+`">`+token+`</m>`...)
				nextID++
			} else {
				markup = append(markup, token...)
			}
		}
		last, lastUnits = end, endUnits
	}
	markup = append(markup, text[last:]...)
	return Caption{Markup: string(markup), TextExtra: extras}
}

// utf16Len is the length of s in UTF-16 code units.
func utf16Len(s string) int {
	n := 0
	for len(s) > 0 {
		r, size := utf8.DecodeRuneInString(s)
		s = s[size:]
		if r >= 0x10000 {
			n += 2
		} else {
			n++
		}
	}
	return n
}

// makeUserResolver resolves usernames by reading the profile page with the upload session.
func makeUserResolver(client *httpClient, userAgent string, timeout time.Duration) UserResolver {
	var mu sync.Mutex
	cache := map[string]string{}
	return func(ctx context.Context, username string) string {
		mu.Lock()
		if id, ok := cache[username]; ok {
			mu.Unlock()
			return id
		}
		mu.Unlock()
		userID := ""
		r, err := client.do(ctx, "GET", "https://www.tiktok.com/@"+username, requestOptions{
			headers: map[string]string{"user-agent": userAgent, "accept": "text/html"},
			timeout: timeout,
		})
		if err != nil {
			// Network errors must not fail the upload.
			logWarn("Could not look up @%s (%s); leaving it as plain text", username, describe(err))
		} else if m := userIDRE.FindStringSubmatch(r.text()); m != nil {
			userID = m[1]
		} else {
			logWarn("Could not find TikTok user @%s; leaving it as plain text", username)
		}
		mu.Lock()
		cache[username] = userID
		mu.Unlock()
		return userID
	}
}
