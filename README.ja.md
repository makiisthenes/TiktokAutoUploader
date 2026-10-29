# autotok — TikTok Auto Uploader

<p align="center">
  <a href="README.md">English</a> ·
  <a href="README.zh-CN.md">简体中文</a> ·
  <a href="README.zh-TW.md">繁體中文</a> ·
  <b>日本語</b> ·
  <a href="README.ko.md">한국어</a> ·
  <a href="README.es.md">Español</a> ·
  <a href="README.pt-BR.md">Português (Brasil)</a> ·
  <a href="README.ru.md">Русский</a> ·
  <a href="README.fr.md">Français</a> ·
  <a href="README.de.md">Deutsch</a>
</p>

*このドキュメントは[英語版 README](README.md) の翻訳です。内容が異なる場合は、英語版が最新です。*

<p align="center">
  <img src="https://user-images.githubusercontent.com/52138450/111885490-04ab6680-89c0-11eb-955a-f833577b4406.png" width="35%" alt="TiktokAutoUploader のロゴ">
</p>

<p align="center">コマンドライン、Python、TypeScript、Go、PHP、Java、C# から TikTok 動画をアップロード・予約投稿。プロキシはアカウントごとに設定できます。</p>
<p align="center"><code>uv tool install autotok</code> · <code>npm install autotok</code> · ログインは 1 回だけ · アップロードはコマンド 1 つ</p>

<p align="center">
  <a href="https://pypi.org/project/autotok/"><img alt="PyPI" src="https://img.shields.io/pypi/v/autotok?label=pypi"></a>
  <a href="https://www.npmjs.com/package/autotok"><img alt="npm" src="https://img.shields.io/npm/v/autotok?label=npm"></a>
  <a href="#typescript-sdk"><img alt="TypeScript の型定義を同梱" src="https://img.shields.io/npm/types/autotok"></a>
  <a href="https://pkg.go.dev/github.com/makiisthenes/TiktokAutoUploader/go"><img alt="Go リファレンス" src="https://pkg.go.dev/badge/github.com/makiisthenes/TiktokAutoUploader/go.svg"></a>
  <a href="https://github.com/makiisthenes/TiktokAutoUploader/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/makiisthenes/TiktokAutoUploader/actions/workflows/ci.yml/badge.svg"></a>
  <a href="LICENSE"><img alt="ライセンス: AGPL-3.0" src="https://img.shields.io/badge/license-AGPL--3.0-blue"></a>
  <a href="https://www.linkedin.com/in/michael-p-88b015200/"><img alt="LinkedIn" src="https://img.shields.io/badge/LinkedIn-0077B5?style=flat-square&logo=linkedin&logoColor=white"></a>
  <img alt="スター" src="https://img.shields.io/github/stars/makiisthenes/TiktokAutoUploader">
  <img alt="フォーク" src="https://img.shields.io/github/forks/makiisthenes/TiktokAutoUploader">
</p>

<p align="center">
  <a href="https://github.com/makiisthenes/TiktokAutoUploader/blob/main/docs/media/autotok-launch.mp4">
    <img src="https://raw.githubusercontent.com/makiisthenes/TiktokAutoUploader/main/docs/media/autotok-launch.webp" width="100%" alt="38 秒でわかる autotok: 一度ログインすれば、あとはコマンド 1 つで動画を TikTok にアップロード。今すぐの投稿も予約投稿も、どのアカウントでもできます">
  </a>
</p>
<p align="center"><sub>動画をクリックすると、音声付きで再生できます。</sub></p>

---

<a id="install"></a>

## インストール

**コマンドラインと Python**

```bash
uv tool install "autotok[youtube]"
autotok install-browser                                   # one-time browser download, about 300 MB
```

あとはアカウントごとに一度ログインすれば、コマンド 1 つでアップロードできます。

```bash
autotok login -n my_account                               # log in on the page that opens; the QR code is quickest
autotok upload -u my_account -v clip.mp4 -t "Hello #fyp"
```

uv がない場合は、`pipx install "autotok[youtube]"` や `pip install "autotok[youtube]"` でもインストールできます。
[はじめに](#getting-started)では、プロキシやクラウドブラウザも含め、各ステップを順に説明しています。

**TypeScript と JavaScript（Node.js）**

```bash
npm install autotok
npx playwright install chromium                           # one-time browser download
```

```ts
import { login, uploadVideo } from "autotok";

await login("my_account");                                // once: log in on the page that opens
await uploadVideo("my_account", "clip.mp4", "Hello #fyp");
```

型付きの Promise ベースの API で、Python は不要です。保存済みのアカウントは CLI と共有されます。詳しくは [TypeScript SDK](#typescript-sdk) を参照してください。

**Go、または他に何もインストールせずに使える単一バイナリ**

```bash
go install github.com/makiisthenes/TiktokAutoUploader/go/cmd/autotok@latest
```

または、[リリース](https://github.com/makiisthenes/TiktokAutoUploader/releases)（`go/v...` で始まるもの）からお使いのシステム用の `autotok` バイナリをダウンロードしてください。上と同じコマンドが使え、Python も Node.js も不要で、パソコンにすでに入っている Chrome を使います。Go のコードからは `go get github.com/makiisthenes/TiktokAutoUploader/go` で導入できます。詳しくは [Go](#go-sdk-and-single-binary) を参照してください。

**PHP、Java、C#**

`autotok` コマンドを代わりに実行し、結果とエラーを型付きで返す小さなライブラリです。上記の手順で autotok をインストールしてから、[PHP、Java、C#](#php-java-and-c) を参照してください。

---

<a id="sponsors"></a>

## スポンサー

<p align="center">
  <a href="https://www.swiftproxy.net/?ref=makiisthenes">
    <img src="https://github.com/user-attachments/assets/a1d0e915-e09a-4b36-ba72-788c4cc1e709" alt="Swiftproxy — 9,000 万以上のレジデンシャルプロキシ" width="420">
  </a>
</p>

[**Swiftproxy**](https://www.swiftproxy.net/?ref=makiisthenes) は、SNS の自動化、複数アカウントの管理、Web 自動化のワークフロー向けに設計された、9,000 万以上のクリーンなレジデンシャルプロキシと静的レジデンシャルプロキシを提供しています。安定した接続、世界中をカバーする IP、信頼性の高いプロキシ基盤によって、複数のアカウントを安全に管理し、IP に起因する制限を減らし、自動化タスクをスケールさせることができます。レジデンシャルプロキシのトラフィックは使い切るまで有効期限がなく、無料のテストも利用できます。

> コード `PROXY90` で **10% オフ** — [Swiftproxy でプロキシを入手 →](https://www.swiftproxy.net/?ref=makiisthenes)

<br>

<p align="center">
  <a href="https://termius.com/">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/makiisthenes/TiktokAutoUploader/main/docs/images/termius-logo-white.png">
      <img src="https://raw.githubusercontent.com/makiisthenes/TiktokAutoUploader/main/docs/images/termius-logo.png" alt="Termius" width="300">
    </picture>
  </a>
</p>

[**Termius**](https://termius.com/) は、安全で信頼性が高く、チームでの共同作業にも対応した SSH クライアントです。

> [Termius を入手 →](https://termius.com/)

---

<a id="getting-started"></a>

## はじめに

セットアップは 5 分ほどで終わります。インストール（ステップ 1）が済んだら、`autotok setup` を実行すれば残りの手順を案内してくれます。ブラウザを確認し、プロキシを尋ねてテストし、そのプロキシ経由で TikTok にログインします。以下の手順は、同じことを手動で行う方法です。

<a id="1-install-autotok"></a>

### 1. autotok をインストールする

```bash
uv tool install "autotok[youtube]"
```

これで完了です。`autotok` がどのターミナルからでも実行できるコマンドになりました（`autotok --version` で確認できます）。uv は autotok を他の Python パッケージと分けて管理し、Python が入っていなければ自動でダウンロードします。

uv がない場合は、[docs.astral.sh/uv](https://docs.astral.sh/uv/getting-started/installation/) にある 1 行のコマンドでインストールするか、[pipx](https://pipx.pypa.io) を使ってください: `pipx install "autotok[youtube]"`

- 後でアップデートするには: `uv tool upgrade autotok`
- インストールせずに試すには: `uvx --from "autotok[youtube]" autotok --version`
- Python のコードから autotok を使う場合は、プロジェクトに追加してください: `uv add "autotok[youtube]"` または `pip install "autotok[youtube]"`
- TypeScript や JavaScript を使う場合は、代わりに `npm install autotok` を実行してください。[TypeScript SDK](#typescript-sdk) を参照してください。コードからは、ステップ 3 と 4 のコマンドの代わりに `login()` と `uploadVideo()` を使います。
- Python をインストールできない場合や Go で開発している場合は、代わりに[リリース](https://github.com/makiisthenes/TiktokAutoUploader/releases)から単一の `autotok` バイナリを使ってください。以下の手順は同じです。[Go](#go-sdk-and-single-binary) を参照してください。
- `[youtube]` を付けると YouTube リンクに対応します。不要なら省いてかまいません。
- `autotok` が「not recognized」や「command not found」になる場合は、`uv tool update-shell` を一度実行してから、新しいターミナルを開いてください。

<a id="2-choose-where-the-browser-runs"></a>

### 2. ブラウザを実行する場所を選ぶ

autotok は、初回のログインと各アップロードの署名にブラウザを使います。次のどちらかを選んでください。

| 選択肢 | 向いている環境 | セットアップ |
|---|---|---|
| **ローカル**（デフォルト） | 自分のパソコン | `autotok install-browser` を実行（約 300 MB を一度だけダウンロード） |
| **クラウド**（[Browserbase](https://www.browserbase.com) または [Steel](https://github.com/steel-dev/steel-browser)） | サーバーや Docker、パソコンに負荷をかけたくない場合 | 設定ファイルに API キーを追加します。[クラウドブラウザ](#cloud-browsers-browserbase-steel)を参照 |

新しい Linux サーバーでローカルブラウザを使う場合は、root で `autotok install-browser --with-deps` を実行してください。Chromium に必要なシステムライブラリもあわせてインストールされます。

<a id="3-log-in-to-tiktok-once-per-account"></a>

### 3. TikTok にログインする（アカウントごとに 1 回）

```bash
autotok login -n my_account
```

ブラウザのウィンドウが開き、TikTok のログインページが表示されます。ログイン方法は自由ですが、スマートフォンの TikTok アプリで QR コードを読み取るのが一番手早い方法です。ウィンドウは自動で閉じ、セッションは `my_account` として保存されます。クラウドブラウザの場合は、代わりに開くべきリンクが表示されます。

```bash
autotok accounts check my_account     # confirms TikTok accepts the saved session
```

- このアカウントでプロキシを使う予定なら、ログインとその後のアップロードが同じ IP になるよう、ここで指定してください（[プロキシ](#proxies)を参照）:
  `autotok login -n my_account -p http://user:pass@host:port`
- アカウントごとに、`-n` に別の名前を指定して同じ手順を繰り返します。
- セッションは `~/.autotok/accounts` に保存されます。パスワードと同じように扱ってください。

<a id="4-upload"></a>

### 4. アップロードする

```bash
autotok upload -u my_account -v "C:\Videos\clip.mp4" -t "My caption #fyp"
```

これだけです。他の例:

```bash
autotok upload -u my_account -v clip.mp4 -t "Just for me" -vi 1                 # private
autotok upload -u my_account -v clip.mp4 -t "Later #fyp" -sc 3600               # publish in 1 hour
autotok upload -u my_account -yt "https://www.youtube.com/shorts/xxxxxxxxxxx" -t "Caption"
```

`-v` には任意の動画のパスを指定できます。動画が `~/.autotok/videos` にある場合は、ファイル名だけでもかまいません。すべてのオプションは [CLI リファレンス](#cli-reference)を参照してください。

<a id="5-optional-save-your-settings-in-a-file"></a>

### 5. オプション: 設定をファイルに保存する

クラウドブラウザやその API キーなどの設定は、`.env` ファイルに書きます。autotok は、実行したフォルダ、次に `~/.autotok/.env` の順に探します。後者はどのフォルダから実行しても使われます。（このリポジトリの）[`.env.example`](.env.example) をコピーするか、必要な項目だけを書いて始めてください。

```bash
# ~/.autotok/.env   (Windows: C:\Users\<you>\.autotok\.env)
AUTOTOK_BROWSER=browserbase
BROWSERBASE_API_KEY=bb_live_...
```

<a id="where-next"></a>

### 次のステップ

| やりたいこと | 参照先 |
|---|---|
| 複数のアカウントを、それぞれ別の IP で運用したい | [プロキシ](#proxies) |
| 自分のパソコンでブラウザを動かしたくない | [クラウドブラウザ](#cloud-browsers-browserbase-steel) |
| Python のコードからアップロードしたい | [Python SDK](#python-sdk) |
| TypeScript や JavaScript からアップロードしたい | [TypeScript SDK](#typescript-sdk) |
| Go からアップロードしたい、または Python 不要の単一バイナリを使いたい | [Go](#go-sdk-and-single-binary) |
| PHP、Java、C# からアップロードしたい | [PHP、Java、C#](#php-java-and-c) |
| AI エージェント（Claude、Cursor など）にアップロードを任せたい | [MCP サーバー](#mcp-server-ai-agents) |
| Claude Code に頼んで、スキルでアップロードしたい | [Claude Code プラグイン](#claude-code-plugin) |
| サーバーやコンテナで動かしたい | [Docker](#docker) |
| スケジューラー付きの Web ダッシュボードを使いたい | [Web アプリ](#web-app-self-hosted) |
| エラーを解決したい | [トラブルシューティング](#troubleshooting) |

---

<a id="features"></a>

## 機能

- **コマンド 1 つでアップロード**: TikTok の Web アップロード API を使います。TikTok の Web サイトを何度もクリックする必要はありません。
- **アカウントごとのプロキシ**: ログイン、リクエストの署名、すべてのアップロードが同じプロキシを経由するので、各アカウントは常に 1 つの IP から接続しているように見えます。HTTP(S) と SOCKS5 に対応しています。
- **複数アカウント**: アカウントごとに一度ログインすれば、名前を指定してアップロードできます。
- **予約投稿**: TikTok 側の予約投稿機能で、15 分後から 30 日後まで指定できます（アカウントによっては TikTok の制限で 10 日後まで）。セルフホストの Web アプリには、期間の制限がないスケジューラーもあります。
- **投稿設定**: 公開・非公開と、コメント、デュエット、スティッチ、AI 生成ラベルのオン・オフを設定できます。
- **クリックできるハッシュタグと @メンション**。絵文字も問題なく使えます。
- **YouTube リンク**は [yt-dlp](https://github.com/yt-dlp/yt-dlp) で自動的にダウンロードされます。
- **Python SDK、CLI、オプションの Web アプリ**（Docker）。ブラウザからログインできます。
- **TypeScript SDK** を npm で提供（`npm install autotok`）: 完全な型付きで Promise ベース、Python は不要です。保存済みのアカウントは CLI と共有されます。
- **Go パッケージと単一バイナリ**: ライブラリを `go get` するか、Python も Node.js も不要な `autotok` 実行ファイルを 1 つダウンロードするだけです。保存済みのアカウントは他のパッケージと共有されます。
- **PHP、Java、C# 向けライブラリ**: `autotok` コマンドを操作し、結果とエラーを型付きで返します。他の依存関係はありません。
- **MCP サーバー**: AI エージェント（Claude、Cursor、VS Code など）がアップロードや予約投稿を代行できます。
- **Claude Code プラグイン**: TikTok アップロード用のスキル付き。普段の言葉で頼むだけで、投稿前に確認してくれます。
- **クラウドブラウザ**: ログインと署名に使うブラウザを、自分のパソコンではなく [Browserbase](https://www.browserbase.com) や [Steel](https://github.com/steel-dev/steel-browser)（クラウドまたはセルフホスト）で動かせます。
- **Docker イメージ**: サーバー上で CLI を実行できます。
- Python パッケージなら **Node.js は不要**: TikTok のリクエスト署名はヘッドレス Chromium で計算します。

---

<a id="proxies"></a>

## プロキシ

1 つの IP から複数のアカウントを運用するのは、アカウントがフラグを立てられる一番の近道です。autotok ではアカウントごとに専用のプロキシを設定でき、そのアカウントが TikTok と通信する**すべての場面**でそのプロキシを使います。

| ステップ | アカウントのプロキシを経由するか |
|---|---|
| ログイン用ブラウザ（`autotok login`、Web アプリのログイン） | ✅ |
| 署名ページの取得 | ✅（署名用ブラウザ自体はネットワークリクエストを送りません） |
| アップロード API の呼び出しと動画の転送 | ✅ |
| YouTube のダウンロード | ❌（TikTok への通信ではないため。プロキシの帯域を節約できます） |

**プロキシの設定・変更・テスト**

`autotok setup` はプロキシを尋ねてテストし、そのプロキシ経由でログインします。手動で行う場合は次のとおりです。

```bash
autotok login -n alice -p http://user:pass@gate.example.com:7000   # set at login
autotok proxy set alice socks5://user:pass@gate.example.com:1080     # set or change later
autotok proxy test -u alice                                          # shows the IP TikTok will see
autotok proxy clear alice                                            # go direct
autotok accounts list                                                # every account and its proxy (passwords hidden)

autotok upload -u alice -v clip.mp4 -t "hi" -p http://other:pass@host:8000   # one-off override
autotok upload -u alice -v clip.mp4 -t "hi" --no-proxy                       # ignore the saved proxy once
```

**使用できる形式**（スキームのデフォルトは `http`）

```
http://user:pass@host:port      https://user:pass@host:port
socks5://user:pass@host:port    host:port
user:pass@host:port             host:port:user:pass      ← the export format most providers use
```

**ヒント**

- **レジデンシャルまたはモバイル**のプロキシを、アカウントごとに 1 つずつ、**スティッキーセッション**（数時間同じ IP を維持するもの）で使ってください。リクエストごとに IP が変わるプロキシだと、ログイン中のセッションが乗っ取られたように見えてしまいます。
- アップロードに使うのと**同じプロキシを経由して**ログインしてください（`autotok login -p ...`）。自宅からログインしてプロキシ経由でアップロードすると、その食い違いが TikTok に見えてしまいます。
- Chromium は、ユーザー名とパスワードが必要な SOCKS5 プロキシを使えません。ログインの手順では、プロバイダーの HTTP エンドポイントを使ってください（アップロードはどちらでも動作します）。
- パスワードが表示されることはありません。CLI と Web アプリでは伏せ字で表示されます: `http://user:****@host:port`.

プロキシが必要な場合は、[スポンサー](#sponsors)をご覧ください。

---

<a id="cloud-browsers-browserbase-steel"></a>

## クラウドブラウザ（Browserbase、Steel）

autotok がブラウザを必要とするのは 2 か所です。初回の**ログイン**と、各アップロードの**署名**です（TikTok のボット対策用の署名はブラウザのページ内で計算されます）。デフォルトでは、手元のマシンの Chromium を使います。`AUTOTOK_BROWSER` を設定すると、代わりにクラウドで実行できます。そうすればローカルには何もインストールせず、何も開かずに済むので、サーバーや Docker に向いています。

| `AUTOTOK_BROWSER` | ブラウザの実行場所 | 設定 |
|---|---|---|
| `local`（デフォルト） | このマシンの Chromium | `autotok install-browser` を一度実行 |
| `browserbase` | [Browserbase](https://www.browserbase.com) | `BROWSERBASE_API_KEY`（オプションで `BROWSERBASE_PROJECT_ID`、`BROWSERBASE_REGION`） |
| `steel` | [Steel Cloud](https://steel.dev)、または自分で運用する [steel-browser](https://github.com/steel-dev/steel-browser) サーバー | クラウド: `STEEL_API_KEY`。セルフホスト: `STEEL_BASE_URL`、例えば `http://localhost:3000` |

設定は `.env` ファイルに書きます（[`.env.example`](.env.example) をコピーしてください）。

```bash
AUTOTOK_BROWSER=browserbase
BROWSERBASE_API_KEY=bb_live_...
```

あとはいつもどおり autotok を使います。

```bash
autotok browser check                 # starts a session and shows the IP it browses from
autotok login -n alice -p http://user:pass@gate.example.com:7000
autotok upload -u alice -v clip.mp4 -t "Hello #fyp"
```

コマンドごとに選ぶこともできます: `autotok --browser steel login -n alice`

**ログイン:** `autotok login` はライブビューのリンクを表示し、普段使っているブラウザで開きます。そのページで TikTok にログインしてください。ログインが完了するとすぐにセッションが保存され、クラウドブラウザは閉じられます。

**セルフホストの Steel** は無料のオープンソースです。

```bash
docker run -p 3000:3000 -e DOMAIN=localhost:3000 ghcr.io/steel-dev/steel-browser
```

`.env` には次のように書きます。

```bash
AUTOTOK_BROWSER=steel
STEEL_BASE_URL=http://localhost:3000
```

`DOMAIN` には、そのサーバーにアクセスするときのアドレスを設定してください。設定しないと、steel-browser はブラウザに `0.0.0.0` へ接続するよう指示するため、ライブビューが真っ白なままになり、ログインできません。autotok はこの状態を検出すると警告を出します。セルフホストの steel-browser では、一度に 1 つのセッションしか実行できません。

知っておくと便利なこと:

- **クラウドでログインするときは、アカウントのプロキシを使ってください。** アカウントのプロキシはクラウドのログインセッションにも適用されるので、TikTok からはログイン時とアップロード時で同じ IP に見えます。プロキシがないと、TikTok からはログインがプロバイダーの IP から、アップロードがあなたの IP から来たように見えます。
- ログイン後に **「Verify it's really you」**（本人確認）が表示されるのは、データセンターの IP 上にある見慣れないデバイスを TikTok が検出したためです。ライブビューで確認を済ませることもできますが、避けるほうが得策です。アカウントのプロキシを使うか、Browserbase の有料プランなら `BROWSERBASE_PROXY_COUNTRY=GB`（自分の国）を設定して、その国の家庭用 IP 経由でログインしてください。無料プランでも、`BROWSERBASE_REGION` を最寄りのリージョン（例: `eu-central-1`）に設定すれば、少なくとも米国からのログインは避けられます。
- ライブビューには TikTok のタブしか表示されないため、クラウドでのログイン中は「Continue with Google」などのポップアップを autotok が閉じます。代わりに QR コード、メールアドレス/ユーザー名、または電話番号でログインしてください。
- Browserbase で使えるのは HTTP/HTTPS プロキシだけで、カスタムプロキシには Developer プラン以上が必要です。Steel Cloud でも、カスタムプロキシには有料プランが必要な場合があります。
- クラウドで動くのはブラウザだけです。動画ファイルは引き続き手元のマシンから（アカウントのプロキシを経由して）TikTok に直接送られるので、クラウドの利用量はわずかです。ログインとアップロードのたびに、短いセッションが 1 つ使われるだけです。
- 他のプロバイダーを使いたい場合は、`autotok.browsers.CloudProvider` のサブクラスを作り、`autotok.browsers.register_provider("name", YourProvider)` を呼び出してください。

---

<a id="python-sdk"></a>

## Python SDK

```python
import autotok

autotok.login("alice", proxy="http://user:pass@gate.example.com:7000")   # once; opens a browser

result = autotok.upload_video("alice", "clip.mp4", "Hello #fyp")
print(result.video_id)

# More control: reuse a client, set post options, schedule
from datetime import datetime, timedelta, timezone

client = autotok.Client.from_account("alice")          # uses alice's saved proxy
client.upload(
    "clip.mp4",
    "Going live tomorrow #fyp @friend",
    schedule=datetime.now(timezone.utc) + timedelta(days=1),   # or seconds, or a timedelta
    visibility="public",            # or "private"
    allow_comment=True,
    allow_duet=False,
    allow_stitch=False,
    ai_label=False,
)

# Errors are typed; `retryable` is True only when nothing reached TikTok's publish step.
try:
    client.upload("clip.mp4", "caption")
except autotok.PublishError as e:          # TikTok rejected the post (e.g. guidelines)
    print(e.status_code, e.status_msg)
except autotok.AutotokError as e:
    print("failed:", e, "safe to retry:", e.retryable)
```

ブラウザの `sessionid` Cookie がすでにあるなら、ログインウィンドウを省略できます。

```python
autotok.import_session("alice", "<sessionid value>", datacenter="<tt-target-idc value>")
```

---

<a id="typescript-sdk"></a>

## TypeScript SDK

TypeScript と JavaScript 向けの同じアップローダーで、npm で [`autotok`](https://www.npmjs.com/package/autotok) として公開しています。Node.js 22.12 以降で動作し、型定義が同梱されていて、Python は不要です。同じ `~/.autotok/accounts` を読み書きするので、CLI でログインしたアカウントを TypeScript からも使えますし、その逆も可能です。

```bash
npm install autotok
npx playwright install chromium        # one-time browser download, unless you use a cloud browser
```

```ts
import { Client, login, uploadVideo, AutotokError, PublishError } from "autotok";

await login("alice", { proxy: "http://user:pass@gate.example.com:7000" });   // once; opens a browser

const result = await uploadVideo("alice", "clip.mp4", "Hello #fyp");
console.log(result.videoId);

// More control: reuse a client, set post options, schedule
const client = await Client.fromAccount("alice");        // uses alice's saved proxy
await client.upload("clip.mp4", "Going live tomorrow #fyp @friend", {
  schedule: new Date(Date.now() + 24 * 3_600_000),     // a Date, a timestamp in ms, or an ISO string
  visibility: "public",                                 // or "private"
  allowComment: true,
  allowDuet: false,
  allowStitch: false,
  aiLabel: false,
});

// Errors are typed; `retryable` is true only when nothing reached TikTok's publish step.
try {
  await client.upload("clip.mp4", "caption");
} catch (error) {
  if (error instanceof PublishError) console.log(error.statusCode, error.statusMsg);
  else if (error instanceof AutotokError) console.log("failed:", error.message, "safe to retry:", error.retryable);
}
```

- オプション、結果、すべてのエラークラスに型が付いているので、エディタで補完が効きます。
- 動画には、パス、`~/.autotok/videos` 内のファイル名、または動画のバイト列（`Buffer`/`Uint8Array`）を指定できます。
- ES モジュールと CommonJS（`require("autotok")`）の両方で動作し、TypeScript の `nodenext`、`node20`、`bundler` の設定にも対応しています。
- プロキシ、クラウドブラウザ（`AUTOTOK_BROWSER`）、設定用の環境変数、`.env` ファイルは、この README の説明どおりに動作します。`.env` を読み込むには `loadEnv()` を呼び出してください。
- `sessionid` Cookie がすでにある場合: `await importSession("alice", "<sessionid>", { datacenter: "<tt-target-idc>" })`

API の詳細は [`js/README.md`](js/README.md) にあります。CLI、YouTube リンク、MCP サーバー、Web アプリは Python パッケージに含まれています。

---

<a id="go-sdk-and-single-binary"></a>

## Go SDK と単一バイナリ

autotok は Go モジュールとしても提供しており、Python も Node.js も不要な単一の `autotok` バイナリとしてビルドできます。このバイナリには、Python 版 CLI と同じコマンドとフラグがあります。TypeScript パッケージと同様に同じ `~/.autotok/accounts` を読み書きするので、アカウントはどこからでも使えます。

```bash
go install github.com/makiisthenes/TiktokAutoUploader/go/cmd/autotok@latest   # or download a release binary
autotok login -n my_account
autotok upload -u my_account -v clip.mp4 -t "Hello #fyp"
```

ログインと署名には、パソコンにすでに入っている Chrome、Chromium、Edge か、他のパッケージがインストールした Playwright の Chromium を使います。どちらもないマシンでは、`autotok install-browser` を実行すると Chrome for Testing（約 200 MB、初回のみ）がダウンロードされます。

Go のコードから使う場合（Go 1.26 以降）:

```go
import autotok "github.com/makiisthenes/TiktokAutoUploader/go"

ctx := context.Background()
if _, err := autotok.Login(ctx, "alice", &autotok.LoginOptions{Proxy: "http://user:pass@gate.example.com:7000"}); err != nil {
	log.Fatal(err) // once; opens a browser
}
client, err := autotok.NewClient("alice", nil) // uses alice's saved proxy
if err != nil {
	log.Fatal(err)
}
result, err := client.Upload(ctx, "clip.mp4", "Hello #fyp", &autotok.UploadOptions{
	Schedule: time.Now().Add(24 * time.Hour), // optional: 15 minutes to 30 days ahead
})
if err != nil {
	log.Fatal(err) // autotok.IsRetryable(err) says whether trying again is safe
}
fmt.Println(result.VideoID)
```

- すべての呼び出しが `context.Context` を受け取るので、アップロードをキャンセルしたり、期限を設定したりできます。
- エラーは型付き（`*autotok.PublishError`、`*autotok.UploadError` など）なので、`errors.As` で判別できます。
- プロキシとクラウドブラウザ（`AUTOTOK_BROWSER`）は、この README の説明どおりに動作します。ログイン用ブラウザは、パスワードが必要な SOCKS5 プロキシにも対応しています。
- YouTube リンクは、[yt-dlp](https://github.com/yt-dlp/yt-dlp) がインストールされていれば使えます。セットアップウィザード、シェル、MCP サーバーは Python パッケージにしかありません。

API の詳細は [`go/README.md`](go/README.md) と [pkg.go.dev](https://pkg.go.dev/github.com/makiisthenes/TiktokAutoUploader/go) にあります。

---

<a id="php-java-and-c"></a>

## PHP、Java、C#

PHP、Java、.NET 向けの小さなライブラリが `autotok` コマンド（Python パッケージまたは Go バイナリ）を代わりに実行し、その出力をオブジェクトと型付きのエラーに変換します。保存済みのアカウントとプロキシをそのまま使い、他に必要なものはありません。autotok をインストールし、`autotok login -n alice` で一度ログインしたら、次のように使います。

<table>
<tr><th>PHP 8.1+</th><th>Java 17+</th><th>C# (.NET 8+)</th></tr>
<tr>
<td>

```php
$autotok = new Autotok\Client();
$result = $autotok->upload(
    'alice', 'clip.mp4', 'Hello #fyp',
    schedule: new DateTimeImmutable('+1 day'),
);
echo $result->videoId;
```

</td>
<td>

```java
var autotok = new Autotok();
var result = autotok.upload(
    "alice", "clip.mp4", "Hello #fyp",
    new UploadOptions().schedule(
        Instant.now().plus(Duration.ofDays(1))));
System.out.println(result.videoId());
```

</td>
<td>

```csharp
var autotok = new AutotokClient();
var result = await autotok.UploadAsync(
    "alice", "clip.mp4", "Hello #fyp",
    new UploadOptions {
        Schedule = DateTimeOffset.UtcNow.AddDays(1) });
Console.WriteLine(result.VideoId);
```

</td>
</tr>
<tr>
<td><a href="php/README.md"><code>php/</code></a></td>
<td><a href="java/README.md"><code>java/</code></a></td>
<td><a href="dotnet/README.md"><code>dotnet/</code></a></td>
</tr>
</table>

- 3 つとも CLI と同じ投稿設定（予約投稿、公開範囲、コメント、デュエット、スティッチ、AI ラベル、プロキシ）に対応し、アカウントの一覧表示と確認もできます。例外の型は 1 つだけで、autotok のエラーの `type` と `retryable` を持つので、再試行しても二重投稿にならないかどうかがわかります。
- [`--json`](#json-output) と `--title-file` に対応した autotok が必要です。2.1.0 より後の Python パッケージ、または 0.1.0 より後の Go バイナリが該当します。これらがリリースされるまでは、このリポジトリから autotok をインストールしてください: `uv tool install "autotok[youtube] @ git+https://github.com/makiisthenes/TiktokAutoUploader"`
- まだ Packagist、Maven Central、NuGet では公開していません。このリポジトリから追加する方法は、それぞれの README に書いてあります。
- 他の言語でも同じことができます。`autotok --json upload ...` を実行して、1 行の [JSON](#json-output) を読み取るだけです。

---

<a id="mcp-server-ai-agents"></a>

## MCP サーバー（AI エージェント）

autotok には [MCP](https://modelcontextprotocol.io) サーバーが含まれており、Claude、Cursor、VS Code などの AI エージェントが動画のアップロードや予約投稿を代行できます。CLI と同じ保存済みアカウントを使います。

```bash
uv tool install "autotok[youtube,mcp]"    # or: pip install "autotok[youtube,mcp]"
```

**Claude Code**

```bash
claude mcp add autotok -- autotok mcp
```

**Claude Desktop、Cursor などのクライアント**: クライアントの MCP 設定（`claude_desktop_config.json`、`.cursor/mcp.json` など）に次の内容を追加します。

```json
{
  "mcpServers": {
    "autotok": { "command": "autotok", "args": ["mcp"] }
  }
}
```

クライアントが `autotok` を見つけられない場合は、`which autotok`（Windows では `where autotok`）で表示されるフルパスを指定してください。あとは、例えば次のように頼むだけです: *「clip.mp4 を 'Hello #fyp' というキャプションで my_account にアップロードして。明日の午後 6 時に予約投稿で。」*

| ツール | 機能 |
|---|---|
| `list_accounts` | 保存済みのアカウントと、それぞれのログイン状態、プロキシ（マスク済み）を返します |
| `check_account` | アカウントのセッションがまだ有効かどうかを TikTok に問い合わせます |
| `list_videos` | 動画フォルダ内のファイルを返します |
| `upload_video` | ファイルまたは YouTube リンクをアップロードし、今すぐ投稿するか、15 分後から 30 日後までの日時に予約します。投稿設定は CLI と同じです |
| `login`、`login_status` | ログインを開始します。ログインは、開いたブラウザウィンドウ（またはクラウドブラウザが示すリンク先）で完了させます |
| `set_proxy`、`test_proxy` | アカウントのプロキシを保存・削除し、TikTok から見える IP を表示します |

- **セッションはあなたのパソコンから外に出ません。** ツールが Cookie を返すことはなく、プロキシのパスワードはマスクされます。
- **アップロードはすべて実際の投稿になります。** ほとんどのクライアントはツールを呼び出す前に毎回確認を求めます。`upload_video` ではこの確認をオンのままにしてください。投稿が*存在するかどうかわからない*というアップロードエラーが返った場合、エージェントには再試行しないよう伝えられるので、二重投稿は起きません。
- **タイムアウトしても重複投稿にはなりません。** クライアントが長いアップロードを待ちきれずに、同じアカウント・動画・キャプションで `upload_video` をもう一度呼び出しても、2 回目の投稿は行われず、最初のアップロードの結果が返されます。進捗通知に対応したクライアントは、その間も待ち続けます。
- **Streamable HTTP**: `autotok mcp --http` で `http://127.0.0.1:8000/mcp` を提供します（変更するには `--host`、`--port` を使います）。認証機能はないので、localhost だけで使うか、独自の認証の背後に置いてください。

---

<a id="claude-code-plugin"></a>

## Claude Code プラグイン

`tiktok-upload` スキルを含む [Claude Code](https://code.claude.com) 用のプラグインです。頼むだけでアップロードできます。

> 明日の午後 6 時に、~/Videos/clip.mp4 を "Behind the scenes 🎬 #fyp" というキャプションで my_account に投稿して。

```
/plugin marketplace add makiisthenes/TiktokAutoUploader
/plugin install autotok@autotok
```

このスキルは `autotok` コマンドを実行するので、先に [autotok をインストール](#install)してログインしておいてください。スキルはアカウントを選び（またはブラウザウィンドウでログインし）、アカウント、動画、キャプション、日時を表示して投稿してよいか確認したうえでアップロードし、エラーが出ればその内容を説明します。許可の確認なしで実行されるのは、アカウントの一覧表示などの読み取り専用のコマンドだけです。TikTok に届いたかどうかわからないアップロードは再試行されないので、二重投稿は起きません。直接実行することもできます: `/autotok:tiktok-upload clip.mp4 "Hello #fyp"`

詳しくは [`claude-plugin/README.md`](claude-plugin/README.md) を参照してください。プラグインを使わずにスキルを利用する方法も載っています。

---

<a id="cli-reference"></a>

## CLI リファレンス

```
autotok setup                         # step by step: browser, proxy (tested), TikTok login
autotok login     -n NAME [-p PROXY] [--force] [--sessionid ID --datacenter DC]
autotok upload    -u NAME (-v FILE | -yt URL) (-t CAPTION | --title-file FILE) [options]
autotok accounts  list | check NAME | remove NAME
autotok proxy     set NAME PROXY | clear NAME | test [PROXY | -u NAME]
autotok show      -u (accounts) | -v (videos)
autotok browser check [-u NAME]       # test the local or cloud browser
autotok install-browser [--with-deps]
autotok shell                         # interactive prompt
autotok mcp [--http [--host H] [--port P]]   # MCP server for AI agents (needs autotok[mcp])

autotok --browser {local,browserbase,steel} <command> ...   # choose where the browser runs
autotok --json upload ... | accounts ...                    # print results and errors as JSON
```

アップロードのオプション:

| フラグ | 説明 | デフォルト |
|---|---|---|
| `-u` / `--user` | 保存済みのアカウント名 | *必須* |
| `-v` / `--video` | 動画ファイル（パス、または動画フォルダ内のファイル名） | — |
| `-yt` / `--youtube` | ダウンロードしてアップロードする YouTube の URL | — |
| `-t` / `--title` | キャプション（最大 2200 文字） | *必須*（または `--title-file`） |
| `--title-file` | キャプションを UTF-8 のテキストファイルから読み込みます。`-` を指定すると標準入力から読み込みます | — |
| `-sc` / `--schedule` | 今から指定した秒数後に公開します（900〜2592000。アカウントによっては 864000 まで） | 今すぐ |
| `-vi` / `--visibility` | `0` で公開、`1` で非公開 | `0` |
| `-ct` / `--comment` | コメントを許可する（`0`/`1`） | `1` |
| `-d` / `--duet` | デュエットを許可する（`0`/`1`） | `0` |
| `-st` / `--stitch` | スティッチを許可する（`0`/`1`） | `0` |
| `-ai` / `--ailabel` | AI 生成コンテンツのラベルを付ける（`0`/`1`） | `0` |
| `-p` / `--proxy` | このアップロードだけに使うプロキシ | アカウントのプロキシ |
| `--no-proxy` | アカウントに保存されたプロキシを無視する | — |

このリポジトリの `python cli.py ...` も引き続き使え、`autotok ...` と同じように動作します。

<a id="json-output"></a>

### JSON 出力

スクリプトや他の言語から使う場合は、`--json` を付けると `upload` と `accounts` がテキストの代わりに 1 行の JSON を標準出力に出力します。ログは引き続き標準エラー出力に出ます。[PHP、Java、C# 向けライブラリ](#php-java-and-c)はこの機能を使っています。

```bash
autotok --json upload -u alice -v clip.mp4 -t "Hello #fyp"
```

| コマンド | 出力内容 |
|---|---|
| `upload` | `{"video_id": "...", "creation_id": "...", "scheduled_for": "2026-11-02T18:30:00Z"}`（今すぐ投稿した場合は `null`） |
| `accounts list` | `{"accounts": [{"name": "alice", "session": true, "proxy": "http://user:****@host:port"}]}` |
| `accounts check NAME` | `{"name": "alice", "session_ok": true}`（`false` の場合は終了ステータス 1） |
| `accounts remove NAME` | `{"name": "alice", "removed": true}`（`false` の場合は終了ステータス 1） |

エラーの場合は `{"error": {"type": "PublishError", "message": "...", "retryable": false}}` を出力し、終了ステータスは通常どおりです（不正な入力の場合は 2）。`type` はエラーのクラス名で、`ValidationError`、`AccountNotFoundError`、`PublishError`、`PublishUncertainError` などがあります。`retryable` が `true` になるのは TikTok の公開処理まで何も届いていない場合だけなので、コマンドを再実行しても二重投稿にはなりません。`PublishError` には TikTok の `status_code` と `status_msg` も含まれます。ただし、コマンドの実行前に引数パーサーが検出したミス（未知のオプションやアカウント名の指定漏れなど）は JSON ではなく使い方の説明を stderr に出力し、終了ステータス 2 で終了します。JSON でない出力もエラーとして扱ってください。

---

<a id="docker"></a>

## Docker

リポジトリにある `Dockerfile` で、Chromium を同梱した CLI をビルドできます。

```bash
docker build -t autotok .

docker run --rm -it -v autotok-data:/data autotok accounts list
docker run --rm -it -v autotok-data:/data -v "$PWD/videos:/data/videos" \
  autotok upload -u alice -v clip.mp4 -t "Hello #fyp"
```

保存済みのアカウントは `/data` に置かれるので、ボリュームに保存してください。コンテナには画面がないため、[クラウドブラウザ](#cloud-browsers-browserbase-steel)でログインし、表示されたリンクを開いてください。

```bash
docker run --rm -it -v autotok-data:/data \
  -e AUTOTOK_BROWSER=browserbase -e BROWSERBASE_API_KEY=bb_live_... \
  autotok login -n alice -p http://user:pass@gate.example.com:7000
```

`login --sessionid ... --datacenter ...` で、自分のブラウザのセッション Cookie を保存することもできます。

すべてクラウドブラウザで済ませるなら、ローカルの Chromium を含めずにビルドすると、イメージをかなり小さくできます:
`docker build --build-arg INSTALL_BROWSER=false -t autotok:slim .`

---

<a id="web-app-self-hosted"></a>

## Web アプリ（セルフホスト）

アカウント、プロキシ、動画ライブラリ、アップロード、スケジューラーを備えたローカルのコントロールパネルで、ログイン用の仮想ブラウザも付いています。Docker が必要です。

```bash
git clone https://github.com/makiisthenes/TiktokAutoUploader.git
cd TiktokAutoUploader
docker compose up --build
```

<http://localhost:3000> を開いてください。API ドキュメントは <http://localhost:8000/docs> にあります。

- **アカウント**: 内蔵の仮想ブラウザでログインしてアカウントを追加し（プロキシも指定可能）、各アカウントのプロキシの設定・変更・テストや、セッションの確認ができます。
- **アップロード**: ファイルをドロップするか、ライブラリから選ぶか、YouTube のリンクを貼り付けます。今すぐ公開することも、好きな日時に予約することもできます。
- **スケジュール**: スケジューラーが再試行するのは、TikTok に何も届く前に起きた失敗だけなので、ジョブが二重に投稿されることはありません。公開処理の途中で中断されたジョブは*投稿済みの可能性あり*と表示され、再試行する際はまず TikTok を確認するよう求められます。

データは `./data` に保存されます。CLI でログインしたアカウントを使うには、そのファイルをアプリのストアにコピーし、Accounts ページで **Import from disk** をクリックしてください。

```bash
mkdir -p data/autotok/accounts && cp ~/.autotok/accounts/my_account.json data/autotok/accounts/
```

（Linux ではコンテナが書き込んだファイルの所有者が root になるため、Web アプリで管理するアカウントには、Web アプリ自体のログイン機能を使ってください。）

クラウドブラウザでアップロードに署名するには、`AUTOTOK_BROWSER` とその設定（[クラウドブラウザ](#cloud-browsers-browserbase-steel)を参照）を、`docker-compose.yml` と同じ場所にある `.env` ファイルに書いてください。Web アプリからのログインには、引き続き内蔵の仮想ブラウザが使われます。

API を直接呼び出すスクリプトでは、`POST`/`PATCH`/`DELETE` リクエストに `X-Requested-With: autotok` ヘッダーを付ける必要があります。これは、他の Web ページからローカル API を使われるのを防ぐためです。また、API は `localhost` と `127.0.0.1` 宛てのリクエストにしか応答しません。別の名前でアプリにアクセスする場合（自前のリバースプロキシの背後に置く場合など）は、その名前を `.env` に追加してください: `AUTOTOK_ALLOWED_HOSTS=tiktok.home.lan`

> Web アプリには独自のログイン機能がなく、`127.0.0.1` でしか待ち受けません。インターネットには公開しないでください。

---

<a id="configuration"></a>

## 設定

設定はすべてオプションです。設定は `.env` ファイルに書きます。[`.env.example`](.env.example) を `.env` にコピーし、使う項目を埋めてください。`autotok` は、実行したフォルダの `.env`、次に `~/.autotok/.env` を読み込みます。環境変数ですでに設定されている値が優先され、`docker compose` も同じファイルを読み込みます。`.env` には API キーが含まれるので、絶対にコミットしないでください（`.gitignore` に登録済みです）。

| 変数 | 用途 | デフォルト |
|---|---|---|
| `AUTOTOK_HOME` | 保存済みのアカウントと設定の場所 | `~/.autotok` |
| `AUTOTOK_VIDEOS_DIR` | 動画フォルダと YouTube のダウンロード先 | `$AUTOTOK_HOME/videos` |
| `AUTOTOK_BROWSER` | ログイン/署名用ブラウザの実行場所: `local`、`browserbase`、`steel` | `local` |
| `AUTOTOK_BROWSER_CHANNEL` | インストール済みのブラウザを使う（例: `chrome`） | Playwright の Chromium |
| `AUTOTOK_BROWSER_PATH` | Chrome/Chromium バイナリのフルパス | Playwright の Chromium |
| `BROWSERBASE_API_KEY`、`BROWSERBASE_PROJECT_ID`、`BROWSERBASE_REGION`、`BROWSERBASE_PROXY_COUNTRY` | Browserbase の設定 | — |
| `STEEL_API_KEY`、`STEEL_BASE_URL`、`STEEL_CONNECT_URL` | Steel の設定（セルフホストの場合は `STEEL_BASE_URL`） | Steel Cloud |

アカウントファイルには TikTok のセッション（パスワードと同等のもの）が含まれます。所有者だけがアクセスできる権限で保存されますが、他人に見られないよう管理してください。

---

<a id="upgrading-from-tiktokautouploader-1x"></a>

## TiktokAutoUploader 1.x からのアップグレード

- **インストール:** [はじめに](#getting-started)の手順に従ってください（`uv tool install "autotok[youtube]"` の後に `autotok install-browser`）。Node.js と `npm install` は不要になりました。
- **セッション:** `CookiesDir/` に保存されたセッションは、リポジトリのフォルダから初めて使ったときに自動で移行されます。フラグは同じで、`python cli.py` も引き続き使えます。
- **予約投稿:** `-sc` は再び TikTok 側で予約するようになりました（15 分後から 10 日後まで）。1.x のローカルキュー（`cli.py schedule list|cancel`）は、Web アプリの Schedules ページに移りました。
- **バグ修正:** 公開範囲、コメント、デュエット、スティッチの設定が実際に反映されるようになりました。以前のバージョンでは、常にすべてを許可した状態で公開投稿されていました。ハッシュタグも再びクリックできるようになりました。
- **削除:** `config.txt` と、使われていなかった ImageMagick の動画編集ヘルパー。

---

<a id="troubleshooting"></a>

## トラブルシューティング

| 問題 | 解決方法 |
|---|---|
| `'autotok' is not recognized` / `command not found` | `uv tool update-shell` を一度実行して、新しいターミナルを開いてください。pip でインストールした場合は、代わりに `python -m autotok ...` を使ってください |
| `Chromium for Playwright is not installed` | `autotok install-browser`（Linux サーバーでは `--with-deps` を追加） |
| `TikTok rejected the session` / `session rejected` | `autotok login -n NAME --force`（`autotok accounts check NAME` で確認できます） |
| `Invalid parameters (status_code=5)` | TikTok がアップロード API を変更しました。エラーの全文を添えて [Issue を作成](https://github.com/makiisthenes/TiktokAutoUploader/issues)してください。 |
| `potential violation of our Community Guidelines` | TikTok がその動画の内容をブロックしました。ツールのエラーではありません。 |
| ログインページでログインできない / CAPTCHA が繰り返し表示される | インストール済みの Chrome を試してください。`.env` に `AUTOTOK_BROWSER_CHANNEL=chrome` を追加するか、ブラウザから `sessionid` Cookie をコピーして `autotok login -n NAME --sessionid ...` を使います |
| クラウドでのログイン中に「Verify it's really you」と表示される | TikTok がクラウドブラウザの IP を認識していません。ライブビューで確認を済ませる（Email を選択）か、プロキシを使って回避してください。[クラウドブラウザ](#cloud-browsers-browserbase-steel)の注意事項を参照 |
| クラウドログインのライブビューが真っ白になる（セルフホストの Steel） | `DOMAIN=localhost:3000`（そのサーバーのアドレス）を付けて steel-browser を再起動してください |
| `Browserbase ... (HTTP 402): Proxies are not included in the free plan` | `BROWSERBASE_PROXY_COUNTRY` を削除するか、クラウドログインではアカウントのプロキシを外すか、Browserbase のプランをアップグレードしてください |
| `No TikTok datacenter cookie saved` という警告 | `autotok login` でもう一度ログインするか、`--sessionid` と一緒に `--datacenter` を指定してください |
| `may or may not have been posted` | 公開処理中に接続が切れました。重複投稿を避けるため、再試行する前にアカウントを確認してください。 |

[よくある問題](docs/common-problems.md)もあわせて参照してください。

---

<a id="professional-software-autotok-pro"></a>

## プロフェッショナル版ソフトウェア（autotok Pro）

ウェイティングリストのフォームにご記入ください: https://forms.gle/M4KpdfruqCukQvj99

もっと高機能で、目標により早くたどり着けるものをお探しなら、次のことができるソフトウェアを提供しています。

- 1000 を超えるアカウントを扱える
- 同じ動画を複数のアカウントに自動でアップロード
- 複数のアカウントの動画を、20 日先から 2 年先まで予約投稿
- YouTube、X、Reddit、TikTok から動画を自動で収集
- 動画の収集からアップロードのスケジュールまでのパイプラインを構築
- 各アカウントの現在のパフォーマンスを確認できる指標
- 問題が起きたときに、最長 3 か月間、私が個別にサポート
- プロキシ対応、すっきりとしたモダンな UI

販売しています。興味のある方は、件名を `Tiktok Bot Software` として `michaelperes562@gmail.com` までメールでご連絡ください。件名が異なると、メールを見落としてしまうかもしれません。

---

<a id="licensing"></a>

## ライセンス

autotok は**デュアルライセンス**です。

- **オープンソース:** [GNU AGPL v3.0](LICENSE)。自由に使用、改変、共有できます。改変版を配布する場合や、改変版を他者向けのサービスとして運用する場合は、同じライセンスでソースコードを公開する必要があります。
- **商用:** AGPL の義務を負わずに autotok をクローズドソースの製品や有料サービスに組み込む場合、または autotok Pro を利用する場合は、`michaelperes562@gmail.com` までご連絡ください。

Copyright © 2021–2026 Michael Peres. 2.0.0 より前のリリースは、公開時のライセンスのままです。同梱されている署名スクリプトはサードパーティのコードです。[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) を参照してください。コントリビューションは、[CONTRIBUTING.md](CONTRIBUTING.md) の条件のもとで歓迎します。

---

<a id="support-this-project"></a>

## このプロジェクトを支援する

このプロジェクトを気に入っていただけたら、[Patreon](https://patreon.com/makiisthenes) や [Ko-Fi](https://ko-fi.com/makiperes) での支援、またはプロジェクトへのスターをご検討ください。

- TikTok の新しいアップロードエンドポイントに対応してくれた [@DelvinBa](https://github.com/DelvinBa) に感謝します。（09/12/2024）

<a id="bugs-and-issues"></a>

## バグと Issue

バグはメールではなく、[Issues タブ](https://github.com/makiisthenes/TiktokAutoUploader/issues)で報告してください。
セキュリティ上の問題は、[SECURITY.md](SECURITY.md) に記載のとおり、非公開のレポートで報告してください。

<a id="notes-and-terms"></a>

## 注意事項と利用条件

このプロジェクトは TikTok とは無関係です。アップロードの自動化は TikTok の利用規約に違反する可能性があり、アカウントが制限されたり、停止されたりすることがあります。権利を持っているコンテンツだけをアップロードしてください。ご利用は自己責任でお願いします。

<a id="star-history"></a>

## スター履歴

[![Star History のグラフ](https://api.star-history.com/svg?repos=makiisthenes/TiktokAutoUploader&type=Date)](https://star-history.com/#makiisthenes/TiktokAutoUploader&Date)
