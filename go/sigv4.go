package autotok

// AWS Signature Version 4, as TikTok's upload storage expects it.
//
// Produces the same headers as the requests-auth-aws-sigv4 library the Python package uses:
// host, x-amz-content-sha256, x-amz-date and x-amz-security-token are signed, the query string
// is sorted by key without re-encoding, and requests without a content type get the
// form-encoded one.

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"net/url"
	"sort"
	"strings"
	"time"
)

type awsCredentials struct {
	accessKeyID     string
	secretAccessKey string
	sessionToken    string
}

func sha256Hex(data []byte) string {
	sum := sha256.Sum256(data)
	return hex.EncodeToString(sum[:])
}

func hmacSHA256(key []byte, data string) []byte {
	h := hmac.New(sha256.New, key)
	h.Write([]byte(data))
	return h.Sum(nil)
}

// signV4 returns the headers (lower-case names) that sign the request: add them to it as-is.
// headers are the request's existing headers, in any case.
func signV4(method, rawURL string, headers map[string]string, body []byte, creds awsCredentials,
	region, service string, now time.Time) (map[string]string, error) {
	u, err := url.Parse(rawURL)
	if err != nil {
		return nil, err
	}
	amzDate := now.UTC().Format("20060102T150405Z")
	dateStamp := amzDate[:8]
	method = strings.ToUpper(method)

	params := map[string]string{}
	var keys []string
	if u.RawQuery != "" {
		for _, item := range strings.Split(u.RawQuery, "&") {
			k, v, _ := strings.Cut(item, "=")
			if _, seen := params[k]; !seen {
				keys = append(keys, k)
			}
			params[k] = v
		}
	}
	sort.Strings(keys)
	pairs := make([]string, len(keys))
	for i, k := range keys {
		pairs[i] = k + "=" + params[k]
	}
	canonicalQuery := strings.Join(pairs, "&")

	added := map[string]string{}
	hasContentType := false
	for k := range headers {
		if strings.EqualFold(k, "content-type") {
			hasContentType = true
		}
	}
	if !hasContentType {
		added["content-type"] = "application/x-www-form-urlencoded; charset=utf-8"
	}
	added["x-amz-date"] = amzDate
	if creds.sessionToken != "" {
		added["x-amz-security-token"] = creds.sessionToken
	}
	payload := body
	if method == "GET" {
		payload = nil
	}
	payloadHash := sha256Hex(payload)
	added["x-amz-content-sha256"] = payloadHash

	signed := map[string]string{"host": u.Hostname()}
	for k, v := range headers {
		if lk := strings.ToLower(k); strings.HasPrefix(lk, "x-amz-") {
			signed[lk] = v
		}
	}
	for k, v := range added {
		if strings.HasPrefix(k, "x-amz-") {
			signed[k] = v
		}
	}
	names := make([]string, 0, len(signed))
	for k := range signed {
		names = append(names, k)
	}
	sort.Strings(names)
	var canonicalHeaders strings.Builder
	for _, k := range names {
		canonicalHeaders.WriteString(k + ":" + signed[k] + "\n")
	}
	signedHeaders := strings.Join(names, ";")

	path := u.EscapedPath()
	canonicalRequest := strings.Join([]string{method, path, canonicalQuery, canonicalHeaders.String(), signedHeaders, payloadHash}, "\n")
	scope := dateStamp + "/" + region + "/" + service + "/aws4_request"
	stringToSign := strings.Join([]string{"AWS4-HMAC-SHA256", amzDate, scope, sha256Hex([]byte(canonicalRequest))}, "\n")

	kDate := hmacSHA256([]byte("AWS4"+creds.secretAccessKey), dateStamp)
	kSigning := hmacSHA256(hmacSHA256(hmacSHA256(kDate, region), service), "aws4_request")
	signature := hex.EncodeToString(hmacSHA256(kSigning, stringToSign))

	added["authorization"] = "AWS4-HMAC-SHA256 Credential=" + creds.accessKeyID + "/" + scope +
		", SignedHeaders=" + signedHeaders + ", Signature=" + signature
	return added, nil
}
