/**
 * AWS Signature Version 4, as TikTok's upload storage expects it.
 *
 * Produces the same headers as the `requests-auth-aws-sigv4` library the Python package uses:
 * `host`, `x-amz-content-sha256`, `x-amz-date` and `x-amz-security-token` are signed, the query
 * string is sorted by key without re-encoding, and requests without a content type get the
 * form-encoded one.
 */
import { createHash, createHmac } from "node:crypto";

export interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string | null;
}

export interface SignableRequest {
  method: string;
  url: string;
  /** Existing headers (any case). The returned headers are added to these. */
  headers?: Record<string, string>;
  body?: string | Uint8Array | null;
}

const sha256 = (data: string | Uint8Array) => createHash("sha256").update(data).digest("hex");
const hmac = (key: string | Buffer, data: string) => createHmac("sha256", key).update(data, "utf8").digest();

/** The headers that sign `req` (lower-case names): add them to the request as-is. */
export function signV4(
  req: SignableRequest,
  credentials: AwsCredentials,
  { region, service, now = new Date() }: { region: string; service: string; now?: Date },
): Record<string, string> {
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const dateStamp = amzDate.slice(0, 8);
  const url = new URL(req.url);
  const method = req.method.toUpperCase();

  const query = url.search.slice(1);
  const params = new Map<string, string>();
  if (query) {
    for (const item of query.split("&")) {
      const eq = item.indexOf("=");
      params.set(eq === -1 ? item : item.slice(0, eq), eq === -1 ? "" : item.slice(eq + 1));
    }
  }
  const canonicalQuery = [...params.keys()].sort().map((k) => `${k}=${params.get(k)}`).join("&");

  const existing = new Set(Object.keys(req.headers ?? {}).map((k) => k.toLowerCase()));
  const added: Record<string, string> = {};
  if (!existing.has("content-type")) added["content-type"] = "application/x-www-form-urlencoded; charset=utf-8";
  added["x-amz-date"] = amzDate;
  if (credentials.sessionToken) added["x-amz-security-token"] = credentials.sessionToken;
  const payloadHash = sha256(method === "GET" ? "" : (req.body ?? ""));
  added["x-amz-content-sha256"] = payloadHash;

  const signed: Record<string, string> = { host: url.hostname };
  for (const [k, v] of Object.entries(req.headers ?? {})) {
    if (k.toLowerCase().startsWith("x-amz-")) signed[k.toLowerCase()] = v;
  }
  for (const [k, v] of Object.entries(added)) if (k.startsWith("x-amz-")) signed[k] = v;
  const names = Object.keys(signed).sort();
  const canonicalHeaders = names.map((k) => `${k}:${signed[k]}\n`).join("");
  const signedHeaders = names.join(";");

  const canonicalRequest = [method, url.pathname, canonicalQuery, canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(canonicalRequest)].join("\n");

  const kDate = hmac(`AWS4${credentials.secretAccessKey}`, dateStamp);
  const kSigning = hmac(hmac(hmac(kDate, region), service), "aws4_request");
  const signature = createHmac("sha256", kSigning).update(stringToSign, "utf8").digest("hex");

  added.authorization =
    `AWS4-HMAC-SHA256 Credential=${credentials.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  return added;
}
