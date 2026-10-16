package autotok

import (
	"testing"
	"time"
)

// Produced by requests-auth-aws-sigv4 0.7 (what the Python package uses) at the same instant,
// with the same credentials, URLs and bodies.
var (
	sigv4Creds   = awsCredentials{accessKeyID: "AKIDEXAMPLE", secretAccessKey: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY", sessionToken: "ST/abc+def=="}
	sigv4Now     = time.Date(2026, 10, 16, 12, 34, 56, 0, time.UTC)
	sigv4Headers = map[string]string{"User-Agent": "UA/1.0", "Accept": "application/json, text/plain, */*"}
)

func TestSigV4ApplyUploadMatchesPython(t *testing.T) {
	h, err := signV4("GET", "https://www.tiktok.com/top/v1?Action=ApplyUploadInner&Version=2020-11-19&SpaceName=tiktok&FileType=video&IsInner=1&FileSize=2058&s=g158iqx8434",
		sigv4Headers, nil, sigv4Creds, "ap-singapore-1", "vod", sigv4Now)
	if err != nil {
		t.Fatal(err)
	}
	want := map[string]string{
		"content-type":         "application/x-www-form-urlencoded; charset=utf-8",
		"x-amz-date":           "20261016T123456Z",
		"x-amz-security-token": "ST/abc+def==",
		"x-amz-content-sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
		"authorization": "AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20261016/ap-singapore-1/vod/aws4_request, " +
			"SignedHeaders=host;x-amz-content-sha256;x-amz-date;x-amz-security-token, " +
			"Signature=6811d66ec43fc40177f0980bbb73e68de1017c50484f653d9fa2e0f8acc79bed",
	}
	if mustJSON(h) != mustJSON(want) {
		t.Errorf("got %v", h)
	}
}

func TestSigV4CommitUploadMatchesPython(t *testing.T) {
	h, _ := signV4("POST", "https://www.tiktok.com/top/v1?Action=CommitUploadInner&Version=2020-11-19&SpaceName=tiktok",
		sigv4Headers, []byte(`{"SessionKey": "SKEY", "Functions": [{"name": "GetMeta"}]}`), sigv4Creds, "ap-singapore-1", "vod", sigv4Now)
	if h["x-amz-content-sha256"] != "71128324d1aebc0dfa269785c91dedf03d85267906fbaf6feb4b677cac13a09f" {
		t.Error(h["x-amz-content-sha256"])
	}
	want := "AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20261016/ap-singapore-1/vod/aws4_request, " +
		"SignedHeaders=host;x-amz-content-sha256;x-amz-date;x-amz-security-token, " +
		"Signature=bd5edcaecec23d459de482f71a14123ff67dcc33263788150224df84d1f3ff36"
	if h["authorization"] != want {
		t.Error(h["authorization"])
	}
}

func TestSigV4KeepsAnExistingContentType(t *testing.T) {
	h, _ := signV4("POST", "https://h.example/x", map[string]string{"Content-Type": "text/plain"}, []byte("a"), sigv4Creds, "r", "s", sigv4Now)
	if _, ok := h["content-type"]; ok {
		t.Error("content-type added")
	}
}
