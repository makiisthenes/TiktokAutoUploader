package autotok

// Uploading and publishing videos through TikTok's web upload API.

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"hash/crc32"
	"io"
	"math/big"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"
)

const (
	// MaxCaptionLength is TikTok's caption limit, in characters (code points).
	MaxCaptionLength = 2200
	// MinScheduleDelay and MaxScheduleDelay bound how far ahead TikTok accepts a schedule.
	MinScheduleDelay = 15 * time.Minute
	MaxScheduleDelay = 30 * 24 * time.Hour
	// TikTok gives some accounts 30 days to schedule and others only 10, depending on account
	// and region.
	shortScheduleWindow = 10 * 24 * time.Hour
	// DefaultChunkSize is how many bytes each upload request carries.
	DefaultChunkSize  = 5 * 1024 * 1024
	defaultDatacenter = "useast2a"
	tiktokAID         = "1988"
	tiktokURL         = "https://www.tiktok.com"
)

// Visibility is who can see a post.
type Visibility int

const (
	Public  Visibility = 0
	Private Visibility = 1
)

// UploadOptions say how to publish a video. The zero value publishes now, publicly, with
// comments allowed and duets and stitches off, like the other packages' defaults.
type UploadOptions struct {
	// Schedule is when TikTok should publish the video, between 15 minutes and 30 days ahead.
	// The zero time publishes now.
	Schedule time.Time
	// Visibility is Public (default) or Private. TikTok doesn't allow scheduling private videos.
	Visibility Visibility
	// DisableComments turns comments off.
	DisableComments bool
	AllowDuet       bool
	AllowStitch     bool
	// AILabel labels the video as AI-generated.
	AILabel bool
}

// UploadResult is what TikTok returned for a successful post.
type UploadResult struct {
	VideoID    string
	CreationID string
	// ScheduledFor is when TikTok will publish the video, or the zero time if it was published
	// now.
	ScheduledFor time.Time
	Response     map[string]any
}

// ClientOptions configure a Client.
type ClientOptions struct {
	// Proxy is a proxy string to use instead of the account's saved proxy.
	Proxy string
	// NoProxy connects directly, ignoring the account's saved proxy.
	NoProxy bool
	// Timeout is the per-request timeout (default 60s).
	Timeout time.Duration
	// Signer signs the publish request. Default: a headless Signer started for each upload.
	Signer URLSigner
	// ChunkSize is how many bytes each upload request carries (default 5 MiB).
	ChunkSize int
	// Store is where NewClient loads the account from (default: AccountsDir()).
	Store *AccountStore
	// Browser is the browser provider for the default signer ("" for AUTOTOK_BROWSER's).
	Browser string
}

// Client is an authenticated TikTok uploader for one account.
//
//	client, err := autotok.NewClient("alice", nil)
//	result, err := client.Upload(ctx, "clip.mp4", "Hello #fyp", nil)
type Client struct {
	Account   *Account
	Proxy     *Proxy
	UserAgent string
	Timeout   time.Duration
	// Signer signs the publish request; nil starts a headless Signer for each upload. See
	// NewSigner to keep one for many uploads.
	Signer    URLSigner
	chunkSize int
	browser   string
}

// NewClient returns a client for the saved account called name, using its saved proxy unless
// opts says otherwise.
func NewClient(name string, opts *ClientOptions) (*Client, error) {
	var store *AccountStore
	if opts != nil {
		store = opts.Store
	}
	acct, err := store.Load(name)
	if err != nil {
		return nil, err
	}
	return NewClientForAccount(acct, opts)
}

// NewClientForAccount returns a client for acct (e.g. one built with NewAccountFromSessionID).
func NewClientForAccount(acct *Account, opts *ClientOptions) (*Client, error) {
	if opts == nil {
		opts = &ClientOptions{}
	}
	if !acct.HasSession() {
		return nil, &NotLoggedInError{baseError{msg: fmt.Sprintf(
			"account '%s' has no TikTok session. Log in first: autotok login -n %s", acct.Name, acct.Name)}}
	}
	c := &Client{
		Account:   acct,
		UserAgent: acct.UserAgent,
		Timeout:   opts.Timeout,
		Signer:    opts.Signer,
		chunkSize: opts.ChunkSize,
		browser:   opts.Browser,
	}
	var err error
	switch {
	case opts.NoProxy:
	case opts.Proxy != "":
		c.Proxy, err = ParseProxy(opts.Proxy)
	default:
		c.Proxy, err = acct.ParsedProxy()
	}
	if err != nil {
		return nil, err
	}
	if c.UserAgent == "" {
		c.UserAgent = DefaultUserAgent
	}
	if c.Timeout <= 0 {
		c.Timeout = 60 * time.Second
	}
	if c.chunkSize <= 0 {
		c.chunkSize = DefaultChunkSize
	}
	return c, nil
}

// NewSigner returns a Signer for this client's account: the same user agent (which X-Bogus is
// computed over), proxy and browser provider. Set it as the client's Signer to start the browser
// once for many uploads, and Close it when done.
func (c *Client) NewSigner() *Signer {
	return newSigner(c.UserAgent, c.Proxy, c.Timeout, c.browser)
}

// ResolveVideoPath finds video as given, or by name in the videos folder.
func ResolveVideoPath(video string) (string, error) {
	path := ExpandUser(video)
	candidates := []string{path}
	if !filepath.IsAbs(path) {
		candidates = append(candidates, filepath.Join(VideosDir(), path))
	}
	for _, candidate := range candidates {
		if info, err := os.Stat(candidate); err == nil && info.Mode().IsRegular() {
			if abs, err := filepath.Abs(candidate); err == nil {
				return abs, nil
			}
			return candidate, nil
		}
	}
	return "", newValidationError(fmt.Sprintf("video not found: %s (also looked in: %s)", video, VideosDir()))
}

// CheckSchedule validates a publish time against now: zero is fine (publish now), anything else
// must be between 15 minutes and 30 days ahead.
func CheckSchedule(at, now time.Time) error {
	if at.IsZero() {
		return nil
	}
	if delay := at.Sub(now); delay < MinScheduleDelay || delay > MaxScheduleDelay {
		return newValidationError(fmt.Sprintf("TikTok only accepts schedules between 15 minutes and 30 days ahead (got %s)",
			at.UTC().Format(time.RFC3339)))
	}
	return nil
}

func creationID() string {
	const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_"
	b := make([]byte, 21)
	for i := range b {
		n, _ := rand.Int(rand.Reader, big.NewInt(int64(len(alphabet))))
		b[i] = alphabet[n.Int64()]
	}
	return string(b)
}

func randomUUID() string {
	b := make([]byte, 16)
	rand.Read(b)
	b[6] = b[6]&0x0f | 0x40
	b[8] = b[8]&0x3f | 0x80
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

type videoSource struct {
	name string
	size int64
	open func() (io.ReadCloser, error)
}

// dig follows path (keys and array indexes) into parsed JSON; nil if any step is missing.
func dig(v any, path ...any) any {
	for _, key := range path {
		switch k := key.(type) {
		case string:
			m, ok := v.(map[string]any)
			if !ok {
				return nil
			}
			v = m[k]
		case int:
			a, ok := v.([]any)
			if !ok || k >= len(a) {
				return nil
			}
			v = a[k]
		}
	}
	return v
}

func digString(v any, path ...any) string {
	s, _ := dig(v, path...).(string)
	return s
}

func truncate(s string, n int) string {
	if len(s) > n {
		return s[:n]
	}
	return s
}

func jsonBody(r *httpResponse, what string) (map[string]any, error) {
	data, ok := r.json().(map[string]any)
	if !ok {
		return nil, newUploadError(fmt.Sprintf("%s: TikTok returned a non-JSON response (HTTP %d)", what, r.status),
			r.status, truncate(r.text(), 500), nil)
	}
	return data, nil
}

func (c *Client) session() *httpClient {
	jar := &cookieJar{}
	jar.set(SessionCookie, c.Account.SessionID(), "", "")
	datacenter := c.Account.Datacenter()
	if datacenter == "" {
		logWarn("No TikTok datacenter cookie saved for '%s'; assuming %s. Log in again if uploads fail.", c.Account.Name, defaultDatacenter)
		datacenter = defaultDatacenter
	}
	jar.set(DatacenterCookie, datacenter, "", "")
	return newHTTPClient(httpClientOptions{
		proxy:   c.Proxy,
		jar:     jar,
		timeout: c.Timeout,
		headers: map[string]string{"user-agent": c.UserAgent, "accept": "application/json, text/plain, */*"},
	})
}

type tiktokRequest struct {
	noExpectOK bool
	headers    map[string]string
	body       []byte
	hasBody    bool
	timeout    time.Duration
	aws        *awsCredentials
}

func (c *Client) request(ctx context.Context, client *httpClient, method, rawURL, what string, o tiktokRequest) (*httpResponse, error) {
	sent := map[string]string{}
	for k, v := range o.headers {
		sent[k] = v
	}
	if o.aws != nil {
		base := map[string]string{"user-agent": c.UserAgent, "accept": "application/json, text/plain, */*"}
		for k, v := range sent {
			base[k] = v
		}
		signed, err := signV4(method, rawURL, base, o.body, *o.aws, "ap-singapore-1", "vod", time.Now())
		if err != nil {
			return nil, newUploadError(fmt.Sprintf("%s: %v", what, err), 0, "", err)
		}
		for k, v := range signed {
			sent[k] = v
		}
	}
	r, err := client.do(ctx, method, rawURL, requestOptions{headers: sent, body: o.body, hasBody: o.hasBody, timeout: o.timeout})
	if err != nil {
		var ne *networkError
		if errors.As(err, &ne) {
			if ctx.Err() != nil {
				return nil, ctx.Err()
			}
			return nil, newUploadError(fmt.Sprintf("%s: network error: %s", what, ne.Error()), 0, "", err)
		}
		return nil, err
	}
	if !o.noExpectOK && r.status != 200 {
		return nil, newUploadError(fmt.Sprintf("%s: HTTP %d", what, r.status), r.status, truncate(r.text(), 500), nil)
	}
	return r, nil
}

// CheckSession reports whether TikTok still accepts the saved session for uploads.
func (c *Client) CheckSession(ctx context.Context) (bool, error) {
	client := c.session()
	defer client.close()
	r, err := c.request(ctx, client, "GET", tiktokURL+"/api/v1/video/upload/auth/?aid="+tiktokAID, "session check", tiktokRequest{noExpectOK: true})
	if err != nil {
		return false, err
	}
	data, ok := r.json().(map[string]any)
	if !ok {
		return false, nil
	}
	_, has := data["video_token_v5"]
	return r.status == 200 && has, nil
}

// Upload uploads the video file at path (or a name in your videos folder) and publishes it with
// caption. On failure it returns one of autotok's error types; check IsRetryable before trying
// again.
func (c *Client) Upload(ctx context.Context, video, caption string, opts *UploadOptions) (*UploadResult, error) {
	path, err := ResolveVideoPath(video)
	if err != nil {
		return nil, err
	}
	info, err := os.Stat(path)
	if err != nil {
		return nil, err
	}
	return c.upload(ctx, videoSource{
		name: filepath.Base(path),
		size: info.Size(),
		open: func() (io.ReadCloser, error) { return os.Open(path) },
	}, caption, opts)
}

// UploadBytes uploads a video held in memory.
func (c *Client) UploadBytes(ctx context.Context, video []byte, caption string, opts *UploadOptions) (*UploadResult, error) {
	return c.upload(ctx, videoSource{
		name: "video bytes",
		size: int64(len(video)),
		open: func() (io.ReadCloser, error) { return io.NopCloser(bytes.NewReader(video)), nil },
	}, caption, opts)
}

// UploadReader uploads size bytes of video read from r.
func (c *Client) UploadReader(ctx context.Context, r io.Reader, size int64, caption string, opts *UploadOptions) (*UploadResult, error) {
	used := false
	return c.upload(ctx, videoSource{
		name: "video stream",
		size: size,
		open: func() (io.ReadCloser, error) {
			if used {
				return nil, errors.New("the video stream can only be read once")
			}
			used = true
			return io.NopCloser(io.LimitReader(r, size)), nil
		},
	}, caption, opts)
}

func (c *Client) upload(ctx context.Context, source videoSource, caption string, opts *UploadOptions) (*UploadResult, error) {
	if opts == nil {
		opts = &UploadOptions{}
	}
	if strings.TrimSpace(caption) == "" {
		return nil, newValidationError("caption is required")
	}
	if utf8.RuneCountInString(caption) > MaxCaptionLength {
		return nil, newValidationError(fmt.Sprintf("caption must be at most %d characters", MaxCaptionLength))
	}
	if opts.Visibility != Public && opts.Visibility != Private {
		return nil, newValidationError("visibility must be Public (0) or Private (1)")
	}
	// Fixed now, so a slow upload doesn't push the publish time back.
	startedAt := time.Now()
	if err := CheckSchedule(opts.Schedule, startedAt); err != nil {
		return nil, err
	}
	scheduled := !opts.Schedule.IsZero()
	if scheduled && opts.Visibility == Private {
		return nil, newValidationError("TikTok does not allow scheduling private videos")
	}
	if source.size <= 0 {
		return nil, newValidationError("video is empty: " + source.name)
	}

	via := ""
	if c.Proxy != nil {
		via = " via proxy " + c.Proxy.Masked()
	}
	logInfo("Uploading %s as '%s'%s", source.name, c.Account.Name, via)
	client := c.session()
	defer client.close()

	id := creationID()
	r, err := c.request(ctx, client, "POST", tiktokURL+"/api/v1/web/project/create/?creation_id="+id+"&type=1&aid="+tiktokAID,
		"create project", tiktokRequest{})
	if err != nil {
		return nil, err
	}
	project, err := jsonBody(r, "create project")
	if err != nil {
		return nil, err
	}
	if _, ok := project["project"]; !ok {
		raw, _ := json.Marshal(project)
		return nil, newUploadError("create project: TikTok did not return a project. The session may have expired or the "+
			"datacenter cookie is wrong; log in again.", 0, truncate(string(raw), 500), nil)
	}

	videoID, err := c.transfer(ctx, client, source)
	if err != nil {
		return nil, err
	}

	built := BuildCaption(ctx, caption, makeUserResolver(client, c.UserAgent, c.Timeout))
	payload := buildPayload(id, videoID, caption, built, opts)
	var scheduledFor time.Time
	if scheduled {
		ts := opts.Schedule.Unix()
		earliest := time.Now().Add(MinScheduleDelay).Unix()
		if ts < earliest {
			logWarn("The upload took long enough that the scheduled time is now less than 15 minutes away; " +
				"publishing 15 minutes from now instead.")
			ts = earliest
		}
		payload.FeatureCommonInfoList[0].ScheduleTime = &ts
		scheduledFor = time.Unix(ts, 0).UTC()
	}

	response, err := c.publish(ctx, client, payload)
	if err != nil {
		var pe *PublishError
		if errors.As(err, &pe) && scheduled && opts.Schedule.Sub(startedAt) > shortScheduleWindow {
			return nil, &PublishError{
				baseError: baseError{msg: pe.msg + ". This post was scheduled more than 10 days ahead, and some accounts " +
					"can only schedule up to 10 days; try an earlier time.", cause: pe},
				StatusCode: pe.StatusCode, HasStatusCode: pe.HasStatusCode, StatusMsg: pe.StatusMsg, Response: pe.Response,
			}
		}
		return nil, err
	}
	if scheduled {
		logDebug("Published, scheduled for %s", scheduledFor.Format(time.RFC3339))
	} else {
		logDebug("Published")
	}
	return &UploadResult{VideoID: videoID, CreationID: id, ScheduledFor: scheduledFor, Response: response}, nil
}

// transfer sends the video to TikTok's storage and returns TikTok's video id.
func (c *Client) transfer(ctx context.Context, client *httpClient, source videoSource) (string, error) {
	r, err := c.request(ctx, client, "GET", tiktokURL+"/api/v1/video/upload/auth/?aid="+tiktokAID, "upload auth", tiktokRequest{})
	if err != nil {
		return "", err
	}
	auth, err := jsonBody(r, "upload auth")
	if err != nil {
		return "", err
	}
	token := auth["video_token_v5"]
	keyID := digString(token, "access_key_id")
	secret := digString(token, "secret_acess_key") // sic: TikTok's spelling
	if keyID == "" || secret == "" {
		return "", &NotLoggedInError{baseError{msg: fmt.Sprintf(
			"TikTok rejected the session for '%s'. Log in again: autotok login -n %s --force", c.Account.Name, c.Account.Name)}}
	}
	aws := &awsCredentials{accessKeyID: keyID, secretAccessKey: secret, sessionToken: digString(token, "session_token")}

	applyURL := tiktokURL + "/top/v1?Action=ApplyUploadInner&Version=2020-11-19&SpaceName=tiktok&FileType=video&IsInner=1&FileSize=" +
		strconv.FormatInt(source.size, 10) + "&s=g158iqx8434"
	r, err = c.request(ctx, client, "GET", applyURL, "apply upload", tiktokRequest{aws: aws})
	if err != nil {
		return "", err
	}
	apply, err := jsonBody(r, "apply upload")
	if err != nil {
		return "", err
	}
	node := dig(apply, "Result", "InnerUploadAddress", "UploadNodes", 0)
	videoID := digString(node, "Vid")
	storeURI := digString(node, "StoreInfos", 0, "StoreUri")
	storeAuth := digString(node, "StoreInfos", 0, "Auth")
	uploadHost := digString(node, "UploadHost")
	sessionKey := digString(node, "SessionKey")
	if videoID == "" || storeURI == "" || storeAuth == "" || uploadHost == "" || sessionKey == "" {
		raw, _ := json.Marshal(apply)
		return "", newUploadError("apply upload: unexpected response from TikTok", 0, truncate(string(raw), 500), nil)
	}

	in, err := source.open()
	if err != nil {
		return "", err
	}
	defer in.Close()
	uploadID := randomUUID()
	var crcs []string
	buf := make([]byte, c.chunkSize)
	for part := 1; ; part++ {
		n, rerr := io.ReadFull(in, buf)
		last := rerr == io.EOF || rerr == io.ErrUnexpectedEOF
		if rerr != nil && !last {
			return "", newUploadError(fmt.Sprintf("reading %s: %v", source.name, rerr), 0, "", rerr)
		}
		if n == 0 {
			break
		}
		chunk := buf[:n]
		crc := fmt.Sprintf("%08x", crc32.ChecksumIEEE(chunk))
		crcs = append(crcs, crc)
		partURL := "https://" + uploadHost + "/" + storeURI + "?partNumber=" + strconv.Itoa(part) + "&uploadID=" + uploadID + "&phase=transfer"
		_, err := c.request(ctx, client, "POST", partURL, "upload part "+strconv.Itoa(part), tiktokRequest{
			headers: map[string]string{
				"authorization":       storeAuth,
				"content-type":        "application/octet-stream",
				"content-disposition": `attachment; filename="undefined"`,
				"content-crc32":       crc,
			},
			body: chunk, hasBody: true,
			// A total (not idle) timeout, so leave room for slow proxies.
			timeout: max(c.Timeout, 5*time.Minute),
		})
		if err != nil {
			return "", err
		}
		logDebug("uploaded part %d (%d bytes)", part, n)
		if last {
			break
		}
	}
	if len(crcs) == 0 {
		return "", newValidationError("video is empty: " + source.name)
	}

	// Finishing the multipart upload goes straight to the storage host without TikTok's
	// cookies, like the web client does.
	bare := newHTTPClient(httpClientOptions{proxy: c.Proxy, timeout: c.Timeout, headers: map[string]string{"user-agent": c.UserAgent}})
	defer bare.close()
	parts := make([]string, len(crcs))
	for i, crc := range crcs {
		parts[i] = strconv.Itoa(i+1) + ":" + crc
	}
	finishURL := "https://" + uploadHost + "/" + storeURI + "?uploadID=" + uploadID + "&phase=finish&uploadmode=part"
	if _, err := c.request(ctx, bare, "POST", finishURL, "finish upload", tiktokRequest{
		headers: map[string]string{"authorization": storeAuth, "content-type": "text/plain;charset=UTF-8"},
		body:    []byte(strings.Join(parts, ",")), hasBody: true,
	}); err != nil {
		return "", err
	}

	commit := orderedCommit(sessionKey)
	if _, err := c.request(ctx, client, "POST", tiktokURL+"/top/v1?Action=CommitUploadInner&Version=2020-11-19&SpaceName=tiktok",
		"commit upload", tiktokRequest{aws: aws, body: commit, hasBody: true}); err != nil {
		return "", err
	}
	c.request(ctx, client, "HEAD", tiktokURL, "tiktok.com", tiktokRequest{noExpectOK: true, headers: map[string]string{"user-agent": c.UserAgent}})
	return videoID, nil
}

// orderedCommit is the commit request body with its keys in the web client's order.
func orderedCommit(sessionKey string) []byte {
	key, _ := marshalNoEscape(sessionKey)
	return []byte(`{"SessionKey":` + string(key) + `,"Functions":[{"name":"GetMeta"}]}`)
}

// formEncode encodes a query like JavaScript's URLSearchParams, keeping the order of pairs.
func formEncode(pairs [][2]string) string {
	enc := func(s string) string {
		var b strings.Builder
		for i := 0; i < len(s); i++ {
			ch := s[i]
			switch {
			case 'A' <= ch && ch <= 'Z', 'a' <= ch && ch <= 'z', '0' <= ch && ch <= '9',
				ch == '*', ch == '-', ch == '.', ch == '_':
				b.WriteByte(ch)
			case ch == ' ':
				b.WriteByte('+')
			default:
				fmt.Fprintf(&b, "%%%02X", ch)
			}
		}
		return b.String()
	}
	out := make([]string, len(pairs))
	for i, p := range pairs {
		out[i] = enc(p[0]) + "=" + enc(p[1])
	}
	return strings.Join(out, "&")
}

func (c *Client) publish(ctx context.Context, client *httpClient, payload *postPayload) (map[string]any, error) {
	msToken := client.jar.get("msToken")
	toSign := tiktokURL + "/api/v1/web/project/post/?app_name=tiktok_web&channel=tiktok_web&device_platform=web&aid=" +
		tiktokAID + "&msToken=" + msToken
	var sig Signature
	var err error
	if c.Signer != nil {
		sig, err = c.Signer.Sign(ctx, toSign)
	} else {
		signer := c.NewSigner()
		sig, err = signer.Sign(ctx, toSign)
		signer.Close()
	}
	if err != nil {
		return nil, err
	}

	query := formEncode([][2]string{
		{"app_name", "tiktok_web"}, {"channel", "tiktok_web"}, {"device_platform", "web"}, {"aid", tiktokAID},
		{"msToken", msToken}, {"X-Bogus", sig.XBogus}, {"_signature", sig.Signature},
	})
	body, err := marshalNoEscape(payload)
	if err != nil {
		return nil, err
	}
	if err := ctx.Err(); err != nil {
		return nil, err // nothing sent yet
	}
	r, err := client.do(ctx, "POST", tiktokURL+"/tiktok/web/project/post/v1/?"+query, requestOptions{
		headers: map[string]string{
			"content-type": "application/json", "user-agent": c.UserAgent, "origin": tiktokURL, "referer": tiktokURL + "/",
		},
		body: body, hasBody: true,
	})
	if err != nil {
		return nil, &PublishUncertainError{baseError{msg: fmt.Sprintf("publish request failed (%s); the video may or may not have "+
			"been posted. Check the account on TikTok before retrying.", describe(err)), cause: err}}
	}
	if r.status != 200 {
		return nil, &PublishError{baseError: baseError{msg: fmt.Sprintf("publish: HTTP %d", r.status)}, StatusMsg: truncate(r.text(), 300)}
	}
	data, ok := r.json().(map[string]any)
	if !ok {
		return nil, &PublishUncertainError{baseError{msg: "publish: TikTok returned a non-JSON response; check the account before retrying."}}
	}
	code, isNumber := data["status_code"].(json.Number)
	if !isNumber || code.String() != "0" {
		msg, _ := data["status_msg"].(string)
		shown := msg
		if shown == "" {
			shown = "unknown error"
		}
		pe := &PublishError{baseError: baseError{msg: fmt.Sprintf("TikTok rejected the post: %s (status_code=%v)", shown, data["status_code"])},
			StatusMsg: msg, Response: data}
		if n, err := code.Int64(); isNumber && err == nil {
			pe.StatusCode, pe.HasStatusCode = n, true
		}
		return nil, pe
	}
	return data, nil
}

// The publish request, in the web client's field order.
type postPayload struct {
	PostCommonInfo        postCommonInfo `json:"post_common_info"`
	FeatureCommonInfoList []*postFeature `json:"feature_common_info_list"`
	SinglePostReqList     []singlePost   `json:"single_post_req_list"`
}

type postCommonInfo struct {
	CreationID        string `json:"creation_id"`
	EnterPostPageFrom int    `json:"enter_post_page_from"`
	PostType          int    `json:"post_type"`
}

type postFeature struct {
	GeofencingRegions  []string           `json:"geofencing_regions"`
	PlaylistName       string             `json:"playlist_name"`
	PlaylistID         string             `json:"playlist_id"`
	TCMParams          string             `json:"tcm_params"`
	SoundExemption     int                `json:"sound_exemption"`
	Anchors            []any              `json:"anchors"`
	VeditCommonInfo    veditCommonInfo    `json:"vedit_common_info"`
	PrivacySettingInfo privacySettingInfo `json:"privacy_setting_info"`
	AIGCInfo           *aigcInfo          `json:"aigc_info,omitempty"`
	ScheduleTime       *int64             `json:"schedule_time,omitempty"`
}

type veditCommonInfo struct {
	Draft   string `json:"draft"`
	VideoID string `json:"video_id"`
}

type privacySettingInfo struct {
	VisibilityType int `json:"visibility_type"`
	AllowDuet      int `json:"allow_duet"`
	AllowStitch    int `json:"allow_stitch"`
	AllowComment   int `json:"allow_comment"`
}

type aigcInfo struct {
	AIGCLabelType int `json:"aigc_label_type"`
}

type singlePost struct {
	BatchIndex            int               `json:"batch_index"`
	VideoID               string            `json:"video_id"`
	IsLongVideo           int               `json:"is_long_video"`
	SinglePostFeatureInfo singlePostFeature `json:"single_post_feature_info"`
}

type singlePostFeature struct {
	Text        string      `json:"text"`
	TextExtra   []TextExtra `json:"text_extra"`
	MarkupText  string      `json:"markup_text"`
	MusicInfo   struct{}    `json:"music_info"`
	PosterDelay int         `json:"poster_delay"`
}

func boolInt(b bool) int {
	if b {
		return 1
	}
	return 0
}

func buildPayload(creationID, videoID, caption string, built Caption, o *UploadOptions) *postPayload {
	feature := &postFeature{
		GeofencingRegions: []string{},
		TCMParams:         `{"commerce_toggle_info":{}}`,
		Anchors:           []any{},
		VeditCommonInfo:   veditCommonInfo{VideoID: videoID},
		PrivacySettingInfo: privacySettingInfo{
			VisibilityType: int(o.Visibility),
			AllowDuet:      boolInt(o.AllowDuet),
			AllowStitch:    boolInt(o.AllowStitch),
			AllowComment:   boolInt(!o.DisableComments),
		},
	}
	if o.AILabel {
		feature.AIGCInfo = &aigcInfo{AIGCLabelType: 1}
	}
	return &postPayload{
		PostCommonInfo:        postCommonInfo{CreationID: creationID, EnterPostPageFrom: 1, PostType: 3},
		FeatureCommonInfoList: []*postFeature{feature},
		SinglePostReqList: []singlePost{{
			VideoID: videoID,
			SinglePostFeatureInfo: singlePostFeature{
				Text: caption, TextExtra: built.TextExtra, MarkupText: built.Markup,
			},
		}},
	}
}

// UploadVideo uploads video for the saved account called account, with its saved proxy, in one
// call.
//
//	result, err := autotok.UploadVideo(ctx, "alice", "clip.mp4", "Hello #fyp", nil)
func UploadVideo(ctx context.Context, account, video, caption string, opts *UploadOptions) (*UploadResult, error) {
	client, err := NewClient(account, nil)
	if err != nil {
		return nil, err
	}
	return client.Upload(ctx, video, caption, opts)
}
