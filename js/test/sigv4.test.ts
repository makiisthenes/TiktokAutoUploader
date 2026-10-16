import assert from "node:assert/strict";
import { test } from "node:test";
import { signV4 } from "../src/sigv4.ts";

// Produced by requests-auth-aws-sigv4 0.7 (what the Python package uses) at the same instant,
// with the same credentials, URLs and bodies.
const credentials = {
  accessKeyId: "AKIDEXAMPLE",
  secretAccessKey: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY",
  sessionToken: "ST/abc+def==",
};
const now = new Date("2026-10-16T12:34:56Z");
const options = { region: "ap-singapore-1", service: "vod", now };
const sessionHeaders = { "User-Agent": "UA/1.0", Accept: "application/json, text/plain, */*" };

test("apply upload (GET) matches the Python signer", () => {
  const headers = signV4({
    method: "GET",
    url: "https://www.tiktok.com/top/v1?Action=ApplyUploadInner&Version=2020-11-19&SpaceName=tiktok&FileType=video&IsInner=1&FileSize=2058&s=g158iqx8434",
    headers: sessionHeaders,
  }, credentials, options);
  assert.deepEqual(headers, {
    "content-type": "application/x-www-form-urlencoded; charset=utf-8",
    "x-amz-date": "20261016T123456Z",
    "x-amz-security-token": "ST/abc+def==",
    "x-amz-content-sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    authorization: "AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20261016/ap-singapore-1/vod/aws4_request, " +
      "SignedHeaders=host;x-amz-content-sha256;x-amz-date;x-amz-security-token, " +
      "Signature=6811d66ec43fc40177f0980bbb73e68de1017c50484f653d9fa2e0f8acc79bed",
  });
});

test("commit upload (POST with body) matches the Python signer", () => {
  const headers = signV4({
    method: "POST",
    url: "https://www.tiktok.com/top/v1?Action=CommitUploadInner&Version=2020-11-19&SpaceName=tiktok",
    headers: sessionHeaders,
    body: '{"SessionKey": "SKEY", "Functions": [{"name": "GetMeta"}]}',
  }, credentials, options);
  assert.equal(headers["x-amz-content-sha256"], "71128324d1aebc0dfa269785c91dedf03d85267906fbaf6feb4b677cac13a09f");
  assert.equal(
    headers.authorization,
    "AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20261016/ap-singapore-1/vod/aws4_request, " +
      "SignedHeaders=host;x-amz-content-sha256;x-amz-date;x-amz-security-token, " +
      "Signature=bd5edcaecec23d459de482f71a14123ff67dcc33263788150224df84d1f3ff36",
  );
});

test("an existing content type is kept", () => {
  const headers = signV4({ method: "POST", url: "https://h.example/x", headers: { "Content-Type": "text/plain" }, body: "a" }, credentials, options);
  assert.equal(headers["content-type"], undefined);
});
