package autotok

// Mirrors tests/test_uploader.py and js/test/uploader.test.ts: the same TikTok responses, the
// same expectations.

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"hash/crc32"
	"net/http"
	"os"
	"regexp"
	"strings"
	"testing"
	"time"
)

type tiktokReplies struct {
	publishStatus int
	publishJSON   any
	publishDrop   bool
	applyStatus   int
	authJSON      any
}

func fakeTikTok(t *testing.T, o tiktokReplies) *fakeNet {
	t.Helper()
	if o.publishStatus == 0 {
		o.publishStatus = 200
	}
	if o.publishJSON == nil {
		o.publishJSON = map[string]any{"status_code": 0, "status_msg": ""}
	}
	if o.applyStatus == 0 {
		o.applyStatus = 200
	}
	if o.authJSON == nil {
		o.authJSON = map[string]any{"video_token_v5": map[string]any{"access_key_id": "AK", "secret_acess_key": "SK", "session_token": "ST"}}
	}
	return newFakeNet(t, func(w http.ResponseWriter, r *http.Request, _ []byte) {
		path := r.URL.Path
		switch {
		case r.Host == "upload.example" && strings.HasPrefix(path, "/tos/abc"):
			writeJSON(w, 200, map[string]any{})
		case strings.HasPrefix(path, "/api/v1/web/project/create/"):
			w.Header().Set("Set-Cookie", "msToken=MS123; Domain=.tiktok.com; Path=/")
			writeJSON(w, 200, map[string]any{"project": map[string]any{"project_id": "p1"}})
		case strings.HasPrefix(path, "/api/v1/video/upload/auth/"):
			writeJSON(w, 200, o.authJSON)
		case path == "/top/v1" && r.URL.Query().Get("Action") == "ApplyUploadInner":
			writeJSON(w, o.applyStatus, map[string]any{"Result": map[string]any{"InnerUploadAddress": map[string]any{"UploadNodes": []any{
				map[string]any{"Vid": "v123", "UploadHost": "upload.example", "SessionKey": "SKEY",
					"StoreInfos": []any{map[string]any{"StoreUri": "tos/abc", "Auth": "STOREAUTH"}}},
			}}}})
		case path == "/top/v1" && r.URL.Query().Get("Action") == "CommitUploadInner":
			writeJSON(w, 200, map[string]any{})
		case r.Method == "HEAD" && path == "/":
			w.WriteHeader(200)
		case path == "/@bob":
			fmt.Fprint(w, `"userInfo":{"user":{"id":"777"`)
		case strings.HasPrefix(path, "/tiktok/web/project/post/v1/"):
			if o.publishDrop {
				conn, _, _ := w.(http.Hijacker).Hijack()
				conn.Close()
				return
			}
			writeJSON(w, o.publishStatus, o.publishJSON)
		default:
			http.NotFound(w, r)
		}
	})
}

func setupClient(t *testing.T) (client *Client, signer *stubSigner, video string, acct *Account) {
	t.Helper()
	_, videos := isolatedHome(t)
	video = writeVideo(t, videos)
	acct, err := NewAccountFromSessionID("alice", "sess-123", SessionAccountOptions{Datacenter: "useast5", UserAgent: "UA/1.0"})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := NewAccountStore("").Save(acct); err != nil {
		t.Fatal(err)
	}
	signer = &stubSigner{}
	client, err = NewClientForAccount(acct, &ClientOptions{Signer: signer})
	if err != nil {
		t.Fatal(err)
	}
	return client, signer, video, acct
}

func publishBody(t *testing.T, f *fakeNet) (call, map[string]any) {
	t.Helper()
	found := f.find("/tiktok/web/project/post/v1/")
	if len(found) != 1 {
		t.Fatalf("publish calls: %d", len(found))
	}
	var body map[string]any
	if err := json.Unmarshal(found[0].body, &body); err != nil {
		t.Fatal(err)
	}
	return found[0], body
}

func mustJSON(v any) string {
	b, _ := json.Marshal(v)
	return string(b)
}

func TestUploadSendsTheRequestedSettings(t *testing.T) {
	client, signer, video, _ := setupClient(t)
	f := fakeTikTok(t, tiktokReplies{})
	result, err := client.Upload(context.Background(), video, "Hello #fyp @bob", &UploadOptions{
		Visibility: Private, DisableComments: true, AllowDuet: true, AllowStitch: true, AILabel: true,
	})
	if err != nil {
		t.Fatal(err)
	}
	if result.VideoID != "v123" || !result.ScheduledFor.IsZero() {
		t.Fatalf("result: %+v", result)
	}
	c, body := publishBody(t, f)
	feature := body["feature_common_info_list"].([]any)[0].(map[string]any)
	if got := mustJSON(feature["privacy_setting_info"]); got != `{"allow_comment":0,"allow_duet":1,"allow_stitch":1,"visibility_type":1}` {
		t.Errorf("privacy: %s", got)
	}
	if got := mustJSON(feature["aigc_info"]); got != `{"aigc_label_type":1}` {
		t.Errorf("aigc: %s", got)
	}
	if _, ok := feature["schedule_time"]; ok {
		t.Error("schedule_time set without a schedule")
	}
	info := body["single_post_req_list"].([]any)[0].(map[string]any)["single_post_feature_info"].(map[string]any)
	if info["text"] != "Hello #fyp @bob" || info["markup_text"] != `Hello <h id="0">#fyp</h> <m id="1">@bob</m>` {
		t.Errorf("caption: %v", info)
	}
	extras := info["text_extra"].([]any)
	if len(extras) != 2 || extras[1].(map[string]any)["user_id"] != "777" {
		t.Errorf("text_extra: %v", extras)
	}
	if !strings.Contains(c.url, "msToken=MS123") || !strings.Contains(c.url, "X-Bogus=XBOGUS") {
		t.Errorf("publish URL: %s", c.url)
	}
	if !strings.Contains(c.url, "?app_name=tiktok_web&channel=tiktok_web&device_platform=web&aid=1988&msToken=MS123&X-Bogus=XBOGUS&_signature=_sig") {
		t.Errorf("publish query order: %s", c.url)
	}
	if c.header.Get("User-Agent") != "UA/1.0" {
		t.Errorf("user agent: %q", c.header.Get("User-Agent"))
	}
	if !strings.HasPrefix(signer.urls[0], tiktokURL+"/api/v1/web/project/post/?") || !strings.Contains(signer.urls[0], "msToken=MS123") {
		t.Errorf("signed URL: %s", signer.urls[0])
	}
	// The markup reaches TikTok as written, not as < escapes.
	if !strings.Contains(string(c.body), `<h id=\"0\">#fyp</h>`) {
		t.Errorf("body: %s", c.body)
	}
}

func TestTikTokRequestsCarryCookiesAndStorageRequestsAreSigned(t *testing.T) {
	client, _, video, _ := setupClient(t)
	f := fakeTikTok(t, tiktokReplies{})
	if _, err := client.Upload(context.Background(), video, "x", nil); err != nil {
		t.Fatal(err)
	}
	create := f.find("/project/create/")[0]
	if cookie := create.header.Get("Cookie"); !strings.Contains(cookie, "sessionid=sess-123") || !strings.Contains(cookie, "tt-target-idc=useast5") {
		t.Errorf("cookie: %q", cookie)
	}
	authRE := regexp.MustCompile(`^AWS4-HMAC-SHA256 Credential=AK/\d{8}/ap-singapore-1/vod/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date;x-amz-security-token, Signature=[0-9a-f]{64}$`)
	for _, action := range []string{"ApplyUploadInner", "CommitUploadInner"} {
		c := f.find(action)[0]
		if !authRE.MatchString(c.header.Get("Authorization")) || c.header.Get("X-Amz-Security-Token") != "ST" {
			t.Errorf("%s headers: %v", action, c.header)
		}
	}
	if commit := f.find("CommitUploadInner")[0]; string(commit.body) != `{"SessionKey":"SKEY","Functions":[{"name":"GetMeta"}]}` {
		t.Errorf("commit body: %s", commit.body)
	}
}

func TestUploadDefaults(t *testing.T) {
	client, _, video, _ := setupClient(t)
	f := fakeTikTok(t, tiktokReplies{})
	if _, err := client.Upload(context.Background(), video, "plain caption", nil); err != nil {
		t.Fatal(err)
	}
	_, body := publishBody(t, f)
	feature := body["feature_common_info_list"].([]any)[0].(map[string]any)
	if got := mustJSON(feature["privacy_setting_info"]); got != `{"allow_comment":1,"allow_duet":0,"allow_stitch":0,"visibility_type":0}` {
		t.Errorf("privacy: %s", got)
	}
	if _, ok := feature["aigc_info"]; ok {
		t.Error("aigc_info set by default")
	}
}

func TestScheduleSetsAnAbsoluteTimestamp(t *testing.T) {
	client, _, video, _ := setupClient(t)
	f := fakeTikTok(t, tiktokReplies{})
	at := time.Now().Add(time.Hour)
	result, err := client.Upload(context.Background(), video, "later", &UploadOptions{Schedule: at})
	if err != nil {
		t.Fatal(err)
	}
	_, body := publishBody(t, f)
	ts := body["feature_common_info_list"].([]any)[0].(map[string]any)["schedule_time"].(float64)
	if int64(ts) != at.Unix() || result.ScheduledFor.Unix() != at.Unix() {
		t.Errorf("schedule_time %v, result %v, want %d", ts, result.ScheduledFor, at.Unix())
	}
}

func TestChunksAndCRCs(t *testing.T) {
	client, signer, video, acct := setupClient(t)
	f := fakeTikTok(t, tiktokReplies{})
	small, err := NewClientForAccount(acct, &ClientOptions{Signer: signer, ChunkSize: 1000})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := small.Upload(context.Background(), video, "chunks", nil); err != nil {
		t.Fatal(err)
	}
	data, _ := os.ReadFile(video)
	parts := f.find("phase=transfer")
	if len(parts) != (len(data)+999)/1000 {
		t.Fatalf("parts: %d", len(parts))
	}
	var joined []byte
	for i, p := range parts {
		joined = append(joined, p.body...)
		if p.header.Get("Authorization") != "STOREAUTH" || len(p.header.Get("Content-Crc32")) != 8 {
			t.Errorf("part %d headers: %v", i, p.header)
		}
	}
	if string(joined) != string(data) {
		t.Error("parts don't add up to the video")
	}
	if got, want := parts[0].header.Get("Content-Crc32"), fmt.Sprintf("%08x", crc32.ChecksumIEEE(data[:1000])); got != want {
		t.Errorf("crc %s, want %s", got, want)
	}
	finish := f.find("phase=finish")[0]
	if !strings.HasPrefix(string(finish.body), "1:") || finish.header.Get("Cookie") != "" {
		t.Errorf("finish: %s %v", finish.body, finish.header)
	}
	_ = client
}

func TestUploadBytesAndReader(t *testing.T) {
	client, _, video, _ := setupClient(t)
	f := fakeTikTok(t, tiktokReplies{})
	data, _ := os.ReadFile(video)
	if _, err := client.UploadBytes(context.Background(), data, "from memory", nil); err != nil {
		t.Fatal(err)
	}
	if _, err := client.UploadReader(context.Background(), strings.NewReader(string(data)), int64(len(data)), "from a reader", nil); err != nil {
		t.Fatal(err)
	}
	if n := len(f.find(fmt.Sprintf("FileSize=%d", len(data)))); n != 2 {
		t.Errorf("apply calls with the size: %d", n)
	}
}

func TestValidationHappensBeforeAnythingIsSent(t *testing.T) {
	client, _, video, _ := setupClient(t)
	f := fakeTikTok(t, tiktokReplies{})
	now := time.Now()
	cases := []struct {
		opts *UploadOptions
		want string
	}{
		{&UploadOptions{Schedule: now.Add(time.Minute)}, "15 minutes"},
		{&UploadOptions{Schedule: now.Add(31 * 24 * time.Hour)}, "30 days"},
		{&UploadOptions{Schedule: now.Add(time.Hour), Visibility: Private}, "private"},
		{&UploadOptions{Visibility: 2}, "visibility"},
	}
	for _, c := range cases {
		_, err := client.Upload(context.Background(), video, "x", c.opts)
		var ve *ValidationError
		if !errors.As(err, &ve) || !strings.Contains(err.Error(), c.want) {
			t.Errorf("%+v: %v", c.opts, err)
		}
	}
	for _, caption := range []string{strings.Repeat("x", 2201), "  "} {
		var ve *ValidationError
		if _, err := client.Upload(context.Background(), video, caption, nil); !errors.As(err, &ve) {
			t.Errorf("caption %.10q: %v", caption, err)
		}
	}
	if _, err := client.Upload(context.Background(), "missing.mp4", "x", nil); err == nil || !strings.Contains(err.Error(), "not found") {
		t.Errorf("missing video: %v", err)
	}
	if _, err := client.UploadBytes(context.Background(), nil, "x", nil); err == nil || !strings.Contains(err.Error(), "empty") {
		t.Errorf("empty video: %v", err)
	}
	if n := len(f.recorded()); n != 0 {
		t.Fatalf("%d requests sent", n)
	}
	// The limit counts characters (code points), like the Python package: 2200 emoji are fine.
	if _, err := client.Upload(context.Background(), video, strings.Repeat("🔥", 2200), nil); err != nil {
		t.Fatal(err)
	}
}

func TestVideoFoundByNameInVideosFolder(t *testing.T) {
	client, _, _, _ := setupClient(t)
	f := fakeTikTok(t, tiktokReplies{})
	if _, err := client.Upload(context.Background(), "clip.mp4", "by name", nil); err != nil {
		t.Fatal(err)
	}
	if len(f.find("phase=transfer")) != 1 {
		t.Error("no upload")
	}
}

func TestTikTokRejectionIsNotRetryable(t *testing.T) {
	client, _, video, _ := setupClient(t)
	fakeTikTok(t, tiktokReplies{publishJSON: map[string]any{"status_code": 3013046, "status_msg": "potential violation of our Community Guidelines"}})
	_, err := client.Upload(context.Background(), video, "x", nil)
	var pe *PublishError
	if !errors.As(err, &pe) || pe.StatusCode != 3013046 || !pe.HasStatusCode || IsRetryable(err) {
		t.Fatalf("%#v", err)
	}
}

func TestLongScheduleRejectionMentionsTenDayAccounts(t *testing.T) {
	client, _, video, _ := setupClient(t)
	fakeTikTok(t, tiktokReplies{publishJSON: map[string]any{"status_code": 5, "status_msg": "invalid parameters"}})
	_, err := client.Upload(context.Background(), video, "x", &UploadOptions{Schedule: time.Now().Add(20 * 24 * time.Hour)})
	var pe *PublishError
	if !errors.As(err, &pe) || !strings.Contains(err.Error(), "some accounts can only schedule up to 10 days") ||
		pe.StatusCode != 5 || pe.StatusMsg != "invalid parameters" {
		t.Fatalf("%v", err)
	}
	_, err = client.Upload(context.Background(), video, "x", &UploadOptions{Schedule: time.Now().Add(5 * 24 * time.Hour)})
	if err == nil || strings.Contains(err.Error(), "10 days") {
		t.Fatalf("%v", err)
	}
}

func TestNetworkErrorWhilePublishingIsUncertain(t *testing.T) {
	client, _, video, _ := setupClient(t)
	fakeTikTok(t, tiktokReplies{publishDrop: true})
	_, err := client.Upload(context.Background(), video, "x", nil)
	var pu *PublishUncertainError
	if !errors.As(err, &pu) || IsRetryable(err) || !strings.Contains(err.Error(), "may or may not have been posted") {
		t.Fatalf("%v", err)
	}
}

func TestFailureBeforePublishingIsRetryable(t *testing.T) {
	client, _, video, _ := setupClient(t)
	f := fakeTikTok(t, tiktokReplies{applyStatus: 500})
	_, err := client.Upload(context.Background(), video, "x", nil)
	var ue *UploadError
	if !errors.As(err, &ue) || !IsRetryable(err) || ue.Status != 500 {
		t.Fatalf("%v", err)
	}
	if len(f.find("/project/post/")) != 0 {
		t.Error("reached publish")
	}
}

func TestExpiredSession(t *testing.T) {
	client, _, video, _ := setupClient(t)
	fakeTikTok(t, tiktokReplies{authJSON: map[string]any{"status_code": 8}})
	_, err := client.Upload(context.Background(), video, "x", nil)
	var nl *NotLoggedInError
	if !errors.As(err, &nl) {
		t.Fatalf("%v", err)
	}
	if ok, err := client.CheckSession(context.Background()); ok || err != nil {
		t.Fatalf("CheckSession: %v %v", ok, err)
	}
}

func TestCheckSession(t *testing.T) {
	client, _, _, _ := setupClient(t)
	fakeTikTok(t, tiktokReplies{})
	if ok, err := client.CheckSession(context.Background()); !ok || err != nil {
		t.Fatalf("CheckSession: %v %v", ok, err)
	}
}

func TestAccountsWithoutASessionAreRefused(t *testing.T) {
	acct, _ := NewAccount("empty", nil, "", "")
	var nl *NotLoggedInError
	if _, err := NewClientForAccount(acct, nil); !errors.As(err, &nl) {
		t.Fatal(err)
	}
}

func TestNewClientLoadsASavedAccount(t *testing.T) {
	_, _, video, _ := setupClient(t)
	fakeTikTok(t, tiktokReplies{})
	client, err := NewClient("alice", &ClientOptions{Signer: &stubSigner{}})
	if err != nil {
		t.Fatal(err)
	}
	result, err := client.Upload(context.Background(), video, "one call", nil)
	if err != nil || result.VideoID != "v123" {
		t.Fatalf("%v %v", result, err)
	}
	var nf *AccountNotFoundError
	if _, err := NewClient("nobody", nil); !errors.As(err, &nf) {
		t.Fatal(err)
	}
}

func TestTheAccountProxyIsUsedUnlessOverridden(t *testing.T) {
	acct, _ := NewAccountFromSessionID("p", "s", SessionAccountOptions{Proxy: "http://u:pw@h.example:8000"})
	c, _ := NewClientForAccount(acct, nil)
	if c.Proxy == nil || c.Proxy.Host != "h.example" {
		t.Errorf("saved proxy: %v", c.Proxy)
	}
	c, _ = NewClientForAccount(acct, &ClientOptions{NoProxy: true})
	if c.Proxy != nil {
		t.Errorf("NoProxy: %v", c.Proxy)
	}
	c, _ = NewClientForAccount(acct, &ClientOptions{Proxy: "socks5://o.example:1080"})
	if c.Proxy == nil || c.Proxy.Scheme != "socks5" {
		t.Errorf("override: %v", c.Proxy)
	}
}

func TestCancellingStopsTheUpload(t *testing.T) {
	client, _, video, _ := setupClient(t)
	fakeTikTok(t, tiktokReplies{})
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, err := client.Upload(ctx, video, "x", nil); !errors.Is(err, context.Canceled) {
		t.Fatalf("%v", err)
	}
}

func TestFormEncodeMatchesURLSearchParams(t *testing.T) {
	got := formEncode([][2]string{{"a b", "x*y~z/=&"}, {"_", "-."}})
	if want := "a+b=x*y%7Ez%2F%3D%26&_=-."; got != want {
		t.Errorf("got %s, want %s", got, want)
	}
}
