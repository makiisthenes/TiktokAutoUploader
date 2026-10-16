# Third-party notices

autotok is licensed under the GNU Affero General Public License v3.0 (see `LICENSE`). The files
listed below are **not** covered by that licence. They are redistributed as-is because they are
needed to produce the request signatures TikTok's web uploader expects, and remain the property of
their respective owners. They are copies of the files in `autotok/signer_js/` at the root of the
repository, and are built into the Go package and binary.

| File | Origin |
|---|---|
| `signer_js/signer.js` | Signature routine ("byted_acrawler"), as distributed by the [carcabot/tiktok-signature](https://github.com/carcabot/tiktok-signature) project (MIT). Originally derived from TikTok's web client. |
| `signer_js/webmssdk.js` | Modified copy of TikTok's `webmssdk.js` (originally from `lf3-cdn-tos.bytescm.com`), shared in [carcabot/tiktok-signature#140](https://github.com/carcabot/tiktok-signature/issues/140#issuecomment-1194196455). |
| `signer_js/xbogus.js` | X-Bogus routine extracted from TikTok's web client, as circulated in the tiktok-signature community. |

The original Node.js glue code from carcabot/tiktok-signature (MIT, © CarcaBot) has been replaced
by Go code in `signer.go`.

If you are a rights holder and want a file removed, please open an issue.
