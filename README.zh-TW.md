# autotok — TikTok Auto Uploader

<p align="center">
  <a href="README.md">English</a> ·
  <a href="README.zh-CN.md">简体中文</a> ·
  <b>繁體中文</b> ·
  <a href="README.ja.md">日本語</a> ·
  <a href="README.ko.md">한국어</a> ·
  <a href="README.es.md">Español</a> ·
  <a href="README.pt-BR.md">Português (Brasil)</a> ·
  <a href="README.ru.md">Русский</a> ·
  <a href="README.fr.md">Français</a> ·
  <a href="README.de.md">Deutsch</a>
</p>

*本文為[英文版 README](README.md) 的翻譯；若兩者內容不一致，請以最新的英文版為準。*

<p align="center">
  <img src="https://user-images.githubusercontent.com/52138450/111885490-04ab6680-89c0-11eb-955a-f833577b4406.png" width="35%" alt="TiktokAutoUploader 標誌">
</p>

<p align="center">從命令列、Python、TypeScript、Go、PHP、Java 或 C# 上傳 TikTok 影片並排程發布，每個帳號都能使用各自的代理伺服器。</p>
<p align="center"><code>uv tool install autotok</code> · <code>npm install autotok</code> · 登入一次 · 每次上傳只要一行指令</p>

<p align="center">
  <a href="https://pypi.org/project/autotok/"><img alt="PyPI" src="https://img.shields.io/pypi/v/autotok?label=pypi"></a>
  <a href="https://www.npmjs.com/package/autotok"><img alt="npm" src="https://img.shields.io/npm/v/autotok?label=npm"></a>
  <a href="#typescript-sdk"><img alt="內含 TypeScript 型別" src="https://img.shields.io/npm/types/autotok"></a>
  <a href="https://pkg.go.dev/github.com/makiisthenes/TiktokAutoUploader/go"><img alt="Go 參考文件" src="https://pkg.go.dev/badge/github.com/makiisthenes/TiktokAutoUploader/go.svg"></a>
  <a href="https://github.com/makiisthenes/TiktokAutoUploader/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/makiisthenes/TiktokAutoUploader/actions/workflows/ci.yml/badge.svg"></a>
  <a href="LICENSE"><img alt="授權條款：AGPL-3.0" src="https://img.shields.io/badge/license-AGPL--3.0-blue"></a>
  <a href="https://www.linkedin.com/in/michael-p-88b015200/"><img alt="LinkedIn" src="https://img.shields.io/badge/LinkedIn-0077B5?style=flat-square&logo=linkedin&logoColor=white"></a>
  <img alt="Star 數" src="https://img.shields.io/github/stars/makiisthenes/TiktokAutoUploader">
  <img alt="Fork 數" src="https://img.shields.io/github/forks/makiisthenes/TiktokAutoUploader">
</p>

<p align="center">
  <a href="https://github.com/makiisthenes/TiktokAutoUploader/blob/main/docs/media/autotok-launch.mp4">
    <img src="https://raw.githubusercontent.com/makiisthenes/TiktokAutoUploader/main/docs/media/autotok-launch.webp" width="100%" alt="38 秒認識 autotok：只要登入一次，之後一行指令就能把影片上傳到你任何一個 TikTok 帳號，可以立即發布，也可以排程發布">
  </a>
</p>
<p align="center"><sub>點擊影片即可觀看有聲版本。</sub></p>

---

<a id="install"></a>

## 安裝

**命令列與 Python**

```bash
uv tool install "autotok[youtube]"
autotok install-browser                                   # one-time browser download, about 300 MB
```

接著每個帳號登入一次，之後只要一行指令就能上傳：

```bash
autotok login -n my_account                               # log in on the page that opens; the QR code is quickest
autotok upload -u my_account -v clip.mp4 -t "Hello #fyp"
```

沒有 uv？用 `pipx install "autotok[youtube]"` 或 `pip install "autotok[youtube]"` 也可以。[快速入門](#getting-started)會逐步說明每個步驟，包括代理伺服器與雲端瀏覽器的設定。

**TypeScript 與 JavaScript（Node.js）**

```bash
npm install autotok
npx playwright install chromium                           # one-time browser download
```

```ts
import { login, uploadVideo } from "autotok";

await login("my_account");                                // once: log in on the page that opens
await uploadVideo("my_account", "clip.mp4", "Hello #fyp");
```

具備完整型別、以 Promise 為基礎、不需要 Python，並且與 CLI 共用已儲存的帳號。請參閱 [TypeScript SDK](#typescript-sdk)。

**Go，或不必再安裝任何東西的單一執行檔**

```bash
go install github.com/makiisthenes/TiktokAutoUploader/go/cmd/autotok@latest
```

或是從 [Releases 頁面](https://github.com/makiisthenes/TiktokAutoUploader/releases)（標記為 `go/v...` 的版本）下載適用於你系統的 `autotok` 執行檔。它的指令與上面相同，不需要 Python 或 Node.js，並會使用你電腦上已安裝的 Chrome。在 Go 程式碼中使用：`go get github.com/makiisthenes/TiktokAutoUploader/go`。請參閱 [Go](#go-sdk-and-single-binary)。

**PHP、Java 與 C#**

輕量的函式庫，會替你執行 `autotok` 指令，並回傳具型別的結果與錯誤。請先依照上述方式安裝 autotok，再參閱 [PHP、Java 與 C#](#php-java-and-c)。

---

<a id="sponsors"></a>

## 贊助商

<p align="center">
  <a href="https://www.swiftproxy.net/?ref=makiisthenes">
    <img src="https://github.com/user-attachments/assets/a1d0e915-e09a-4b36-ba72-788c4cc1e709" alt="Swiftproxy — 超過 9,000 萬個住宅代理 IP" width="420">
  </a>
</p>

[**Swiftproxy**](https://www.swiftproxy.net/?ref=makiisthenes) 提供超過 9,000 萬個乾淨的住宅代理與靜態住宅代理，專為社群媒體自動化、多帳號管理與網頁自動化流程而設計。憑藉穩定的連線、涵蓋全球的 IP 與可靠的代理基礎架構，Swiftproxy 能協助使用者安全地管理多個帳號、減少與 IP 相關的限制，並擴大自動化任務的規模。住宅代理流量在用完之前永不過期，並提供免費試用。

> 使用優惠碼 `PROXY90` 即可**享 9 折優惠** — [前往 Swiftproxy 購買代理 →](https://www.swiftproxy.net/?ref=makiisthenes)

<br>

<p align="center">
  <a href="https://termius.com/">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/makiisthenes/TiktokAutoUploader/main/docs/images/termius-logo-white.png">
      <img src="https://raw.githubusercontent.com/makiisthenes/TiktokAutoUploader/main/docs/images/termius-logo.png" alt="Termius" width="300">
    </picture>
  </a>
</p>

[**Termius**](https://termius.com/) 提供安全、可靠且支援團隊協作的 SSH 用戶端。

> [取得 Termius →](https://termius.com/)

---

<a id="getting-started"></a>

## 快速入門

整個設定大約只需要五分鐘。安裝完成後（步驟 1），可以執行 `autotok setup`，由它一步步帶你完成其餘設定：它會檢查瀏覽器、詢問代理伺服器並進行測試，然後透過該代理伺服器幫你登入 TikTok。下面的步驟則是以手動方式完成同樣的事情。

<a id="1-install-autotok"></a>

### 1. 安裝 autotok

```bash
uv tool install "autotok[youtube]"
```

就這樣：現在你可以在任何終端機執行 `autotok` 指令了（可以用 `autotok --version` 確認）。uv 會將 autotok 與你其他的 Python 套件隔離開來；如果你還沒有安裝 Python，它也會幫你下載。

還沒有 uv？可以依照 [docs.astral.sh/uv](https://docs.astral.sh/uv/getting-started/installation/) 的說明用一行指令安裝，或改用 [pipx](https://pipx.pypa.io)：`pipx install "autotok[youtube]"`。

- 日後更新：`uv tool upgrade autotok`。
- 不安裝直接試用：`uvx --from "autotok[youtube]" autotok --version`。
- 要在 Python 程式碼中使用 autotok？將它加入你的專案：`uv add "autotok[youtube]"` 或 `pip install "autotok[youtube]"`。
- 使用 TypeScript 或 JavaScript？請改用 `npm install autotok`，詳見 [TypeScript SDK](#typescript-sdk)。在程式碼中，`login()` 與 `uploadVideo()` 可以取代步驟 3 和步驟 4 的指令。
- 無法安裝 Python，或是用 Go 開發？改用 [Releases 頁面](https://github.com/makiisthenes/TiktokAutoUploader/releases)上的單一 `autotok` 執行檔即可，下面的步驟都相同。請參閱 [Go](#go-sdk-and-single-binary)。
- `[youtube]` 會加入 YouTube 連結支援，不需要的話可以省略。
- 執行 `autotok` 時出現「not recognized」或「command not found」？請執行一次 `uv tool update-shell`，然後開啟新的終端機。

<a id="2-choose-where-the-browser-runs"></a>

### 2. 選擇瀏覽器的執行位置

autotok 會使用瀏覽器進行一次性的登入，並為每次上傳產生簽章。請從以下擇一：

| 選項 | 適用情境 | 設定方式 |
|---|---|---|
| **本機**（預設） | 你自己的電腦 | `autotok install-browser`，一次性下載約 300 MB |
| **雲端**（[Browserbase](https://www.browserbase.com) 或 [Steel](https://github.com/steel-dev/steel-browser)） | 伺服器、Docker，或不想占用自己的電腦 | 在設定檔中加入 API 金鑰。請參閱[雲端瀏覽器](#cloud-browsers-browserbase-steel) |

若要在全新的 Linux 伺服器上使用本機瀏覽器，請以 root 身分執行 `autotok install-browser --with-deps`，它也會一併安裝 Chromium 所需的系統函式庫。

<a id="3-log-in-to-tiktok-once-per-account"></a>

### 3. 登入 TikTok（每個帳號一次）

```bash
autotok login -n my_account
```

瀏覽器視窗會開啟 TikTok 的登入頁面。你可以用任何方式登入，其中用手機上的 TikTok App 掃描 QR Code 最快。登入後視窗會自動關閉，session 則會儲存為 `my_account`。若使用雲端瀏覽器，你會改為取得一個要開啟的連結。

```bash
autotok accounts check my_account     # confirms TikTok accepts the saved session
```

- 這個帳號要使用代理伺服器嗎？現在就指定，讓登入與之後的上傳都使用同一個 IP（請參閱[代理伺服器](#proxies)）：`autotok login -n my_account -p http://user:pass@host:port`
- 每個帳號請使用不同的 `-n` 名稱，重複以上步驟。
- Session 會儲存在 `~/.autotok/accounts`。請像對待密碼一樣保管它們。

<a id="4-upload"></a>

### 4. 上傳

```bash
autotok upload -u my_account -v "C:\Videos\clip.mp4" -t "My caption #fyp"
```

就這麼簡單。更多範例：

```bash
autotok upload -u my_account -v clip.mp4 -t "Just for me" -vi 1                 # private
autotok upload -u my_account -v clip.mp4 -t "Later #fyp" -sc 3600               # publish in 1 hour
autotok upload -u my_account -yt "https://www.youtube.com/shorts/xxxxxxxxxxx" -t "Caption"
```

`-v` 可以接任何影片的路徑；如果影片放在 `~/.autotok/videos` 裡，只要給檔名就可以。所有選項請參閱 [CLI 參考](#cli-reference)。

<a id="5-optional-save-your-settings-in-a-file"></a>

### 5. 選用：將設定儲存在檔案中

雲端瀏覽器及其 API 金鑰等設定，都寫在 `.env` 檔案中。autotok 會先在你執行它的資料夾中尋找，接著尋找 `~/.autotok/.env`；後者不論在哪個資料夾執行都有效。你可以複製本儲存庫中的 [`.env.example`](.env.example)，或只寫入你需要的設定：

```bash
# ~/.autotok/.env   (Windows: C:\Users\<you>\.autotok\.env)
AUTOTOK_BROWSER=browserbase
BROWSERBASE_API_KEY=bb_live_...
```

<a id="where-next"></a>

### 接下來呢？

| 我想要…… | 請參閱 |
|---|---|
| 執行多個帳號，每個帳號使用各自的 IP | [代理伺服器](#proxies) |
| 不在自己的電腦上執行瀏覽器 | [雲端瀏覽器](#cloud-browsers-browserbase-steel) |
| 從 Python 程式碼上傳 | [Python SDK](#python-sdk) |
| 從 TypeScript 或 JavaScript 上傳 | [TypeScript SDK](#typescript-sdk) |
| 從 Go 上傳，或使用不需要 Python 的單一執行檔 | [Go](#go-sdk-and-single-binary) |
| 從 PHP、Java 或 C# 上傳 | [PHP、Java 與 C#](#php-java-and-c) |
| 讓 AI agent（Claude、Cursor……）替我上傳 | [MCP 伺服器](#mcp-server-ai-agents) |
| 透過 skill 直接請 Claude Code 上傳 | [Claude Code 外掛](#claude-code-plugin) |
| 在伺服器或容器中執行 | [Docker](#docker) |
| 使用附排程器的網頁儀表板 | [網頁應用程式](#web-app-self-hosted) |
| 解決錯誤 | [疑難排解](#troubleshooting) |

---

<a id="features"></a>

## 功能特色

- **一行指令完成上傳**，透過 TikTok 的網頁版上傳 API 進行，不必在 TikTok 網站上一步步點選操作。
- **每個帳號各自的代理伺服器**：登入、請求簽章與每次上傳都會經過同一個代理伺服器，因此每個帳號在 TikTok 看來始終來自同一個 IP。支援 HTTP(S) 與 SOCKS5。
- **多帳號**：每個帳號登入一次，之後以名稱指定帳號上傳。
- **排程發布**：由 TikTok 端排程，可設定在 15 分鐘到 30 天後發布（TikTok 對部分帳號限制為 10 天）。自行架設的網頁應用程式另外提供沒有時間限制的排程器。
- **貼文設定**：公開或私人，以及開啟或關閉留言、合拍、拼接與「AI 生成」標籤。
- **可點擊的 hashtag 與 @提及**，可安全使用表情符號。
- **YouTube 連結**會透過 [yt-dlp](https://github.com/yt-dlp/yt-dlp) 自動下載。
- **Python SDK、CLI，以及選用的網頁應用程式**（Docker），可直接在瀏覽器中登入。
- 發布在 npm 上的 **TypeScript SDK**（`npm install autotok`）：具備完整型別、以 Promise 為基礎、不需要 Python，並且與 CLI 共用已儲存的帳號。
- **Go 套件與單一執行檔**：用 `go get` 取得函式庫，或下載一個不需要 Python 或 Node.js 的 `autotok` 執行檔。它與其他套件共用已儲存的帳號。
- **PHP、Java 與 C# 函式庫**：透過 `autotok` 指令運作，回傳具型別的結果與錯誤，沒有其他相依套件。
- **MCP 伺服器**：讓 AI agent（Claude、Cursor、VS Code……）替你上傳與排程。
- **Claude Code 外掛**，內含 TikTok 上傳 skill：用平常說話的方式提出需求，它會在發布前先向你確認。
- **雲端瀏覽器**：將負責登入與簽章的瀏覽器改在 [Browserbase](https://www.browserbase.com) 或 [Steel](https://github.com/steel-dev/steel-browser)（雲端或自行架設）上執行，而不是在你的電腦上。
- **Docker 映像檔**，可在伺服器上執行 CLI。
- Python 套件**不需要 Node.js**：TikTok 的請求簽章會在 headless Chromium 中計算。

---

<a id="proxies"></a>

## 代理伺服器

從同一個 IP 操作多個帳號，是讓帳號被標記的最快方式。autotok 讓你為每個帳號設定各自的代理伺服器，並在該帳號與 TikTok 的**所有**通訊中使用它：

| 步驟 | 是否經過該帳號的代理伺服器 |
|---|---|
| 登入用瀏覽器（`autotok login`、網頁應用程式登入） | ✅ |
| 擷取簽章頁面 | ✅（負責簽章的瀏覽器本身不會發出任何網路請求） |
| 上傳 API 呼叫與影片傳輸 | ✅ |
| YouTube 下載 | ❌（不是 TikTok 的流量；可節省代理伺服器頻寬） |

**設定、變更與測試代理伺服器**

`autotok setup` 會詢問代理伺服器、進行測試，並透過它登入。若要手動設定：

```bash
autotok login -n alice -p http://user:pass@gate.example.com:7000   # set at login
autotok proxy set alice socks5://user:pass@gate.example.com:1080     # set or change later
autotok proxy test -u alice                                          # shows the IP TikTok will see
autotok proxy clear alice                                            # go direct
autotok accounts list                                                # every account and its proxy (passwords hidden)

autotok upload -u alice -v clip.mp4 -t "hi" -p http://other:pass@host:8000   # one-off override
autotok upload -u alice -v clip.mp4 -t "hi" --no-proxy                       # ignore the saved proxy once
```

**支援的格式**（未指定 scheme 時預設為 `http`）

```
http://user:pass@host:port      https://user:pass@host:port
socks5://user:pass@host:port    host:port
user:pass@host:port             host:port:user:pass      ← the export format most providers use
```

**建議**

- 使用**住宅或行動網路**代理，每個帳號一個，並啟用 **sticky session**（數小時內維持同一個 IP）。每次請求都會更換 IP 的代理，會讓已登入的 session 看起來像是遭到盜用。
- **透過之後上傳要用的代理伺服器**登入（`autotok login -p ...`）。在家登入、卻透過代理伺服器上傳，這種不一致 TikTok 是看得出來的。
- Chromium 無法使用需要帳號密碼的 SOCKS5 代理。登入步驟請改用代理服務商提供的 HTTP 端點（上傳則兩種都可以）。
- 密碼一律不會顯示出來，CLI 與網頁應用程式只會顯示 `http://user:****@host:port`.

需要代理伺服器嗎？請參考我們的[贊助商](#sponsors)。

---

<a id="cloud-browsers-browserbase-steel"></a>

## 雲端瀏覽器（Browserbase、Steel）

autotok 在兩個地方需要用到瀏覽器：一次性的**登入**，以及為每次上傳**產生簽章**（TikTok 的反機器人簽章是在瀏覽器頁面中計算的）。預設使用的是你電腦上的 Chromium。只要設定 `AUTOTOK_BROWSER`，就能改在雲端執行。如此一來，本機就不必安裝或開啟任何東西，非常適合伺服器與 Docker 環境。

| `AUTOTOK_BROWSER` | 瀏覽器執行位置 | 設定 |
|---|---|---|
| `local`（預設） | 本機上的 Chromium | 執行一次 `autotok install-browser` |
| `browserbase` | [Browserbase](https://www.browserbase.com) | `BROWSERBASE_API_KEY`（選用：`BROWSERBASE_PROJECT_ID`、`BROWSERBASE_REGION`） |
| `steel` | [Steel Cloud](https://steel.dev)，或你自己的 [steel-browser](https://github.com/steel-dev/steel-browser) 伺服器 | 雲端：`STEEL_API_KEY`。自行架設：`STEEL_BASE_URL`，例如 `http://localhost:3000` |

將設定寫入你的 `.env` 檔案（可以複製 [`.env.example`](.env.example)）：

```bash
AUTOTOK_BROWSER=browserbase
BROWSERBASE_API_KEY=bb_live_...
```

接著照常使用 autotok：

```bash
autotok browser check                 # starts a session and shows the IP it browses from
autotok login -n alice -p http://user:pass@gate.example.com:7000
autotok upload -u alice -v clip.mp4 -t "Hello #fyp"
```

也可以針對單一指令指定：`autotok --browser steel login -n alice`。

**登入方式：** `autotok login` 會印出一個即時畫面（live view）連結，並在你平常使用的瀏覽器中開啟。在該頁面登入 TikTok 即可；一登入成功，session 就會被儲存，雲端瀏覽器也會隨之關閉。

**自行架設的 Steel** 免費且開放原始碼：

```bash
docker run -p 3000:3000 -e DOMAIN=localhost:3000 ghcr.io/steel-dev/steel-browser
```

並在 `.env` 中設定：

```bash
AUTOTOK_BROWSER=steel
STEEL_BASE_URL=http://localhost:3000
```

請將 `DOMAIN` 設為你連線到該伺服器時使用的位址。如果沒有設定，steel-browser 會讓瀏覽器連線到 `0.0.0.0`，即時畫面就會一片空白，導致你無法登入。autotok 偵測到這種情況時會發出警告。自行架設的 steel-browser 一次只能執行一個 session。

注意事項：

- **使用雲端登入時，請搭配帳號的代理伺服器**。帳號的代理伺服器會套用到雲端登入的 session 上，因此 TikTok 在登入與上傳時看到的是同一個 IP。如果沒有設定，TikTok 會看到登入來自雲端服務商的 IP，而上傳卻來自你的 IP。
- 登入後若出現「**Verify it's really you**」，表示 TikTok 發現有陌生裝置從資料中心的 IP 登入。你可以在即時畫面中完成驗證，但最好事先避免：使用帳號的代理伺服器，或在 Browserbase 付費方案中設定 `BROWSERBASE_PROXY_COUNTRY=GB`（改成你所在的國家），透過當地的住宅 IP 登入。若使用免費方案，將 `BROWSERBASE_REGION` 設為離你最近的區域（例如 `eu-central-1`），至少可以避免從美國登入。
- 即時畫面只會顯示 TikTok 的分頁，因此在雲端登入期間，autotok 會關閉「Continue with Google」之類的彈出視窗。請改用 QR Code、電子郵件／使用者名稱或手機號碼登入。
- Browserbase 只支援 HTTP/HTTPS 代理，而且自訂代理需要 Developer 以上的方案。Steel Cloud 的自訂代理也可能需要付費方案。
- 只有瀏覽器在雲端執行。影片檔案仍是從你的電腦（經由帳號的代理伺服器）直接傳送到 TikTok，因此雲端用量很小：每次登入與每次上傳各只需要一個短暫的 session。
- 想使用其他服務商？繼承 `autotok.browsers.CloudProvider` 建立子類別，再呼叫 `autotok.browsers.register_provider("name", YourProvider)` 即可。

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

已經從瀏覽器取得 `sessionid` cookie 了嗎？那就可以跳過登入視窗：

```python
autotok.import_session("alice", "<sessionid value>", datacenter="<tt-target-idc value>")
```

---

<a id="typescript-sdk"></a>

## TypeScript SDK

同一套上傳工具的 TypeScript 與 JavaScript 版本，在 npm 上的套件名稱為 [`autotok`](https://www.npmjs.com/package/autotok)。它可在 Node.js 22.12 以上版本執行，內含型別定義，而且不需要 Python。它讀寫的是同一個 `~/.autotok/accounts`，因此用 CLI 登入的帳號也能在 TypeScript 中使用，反之亦然。

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

- 在編輯器中一切都有型別：選項、結果，以及每一個錯誤類別。
- 影片可以是路徑、`~/.autotok/videos` 中的檔名，或是影片的位元組資料（`Buffer`/`Uint8Array`）。
- 支援 ES 模組與 CommonJS（`require("autotok")`），也相容於 TypeScript 的 `nodenext`、`node20` 與 `bundler` 設定。
- 代理伺服器、雲端瀏覽器（`AUTOTOK_BROWSER`）、設定變數與 `.env` 檔案的運作方式都與本 README 所述相同；呼叫 `loadEnv()` 即可讀取 `.env`。
- 已經有 `sessionid` cookie 了？`await importSession("alice", "<sessionid>", { datacenter: "<tt-target-idc>" })`。

完整 API 請參閱 [`js/README.md`](js/README.md)。CLI、YouTube 連結、MCP 伺服器與網頁應用程式則包含在 Python 套件中。

---

<a id="go-sdk-and-single-binary"></a>

## Go SDK 與單一執行檔

autotok 也是一個 Go 模組，可以編譯成單一個 `autotok` 執行檔，不需要 Python 或 Node.js。這個執行檔的指令與參數都和 Python CLI 相同。它也和 TypeScript 套件一樣，讀寫同一個 `~/.autotok/accounts`，因此帳號在各處都能通用。

```bash
go install github.com/makiisthenes/TiktokAutoUploader/go/cmd/autotok@latest   # or download a release binary
autotok login -n my_account
autotok upload -u my_account -v clip.mp4 -t "Hello #fyp"
```

它會使用你電腦上已安裝的 Chrome、Chromium 或 Edge 來登入及產生簽章；如果其他套件已經安裝了 Playwright 的 Chromium，也會使用它。若電腦上兩者都沒有，請執行 `autotok install-browser`，它會下載 Chrome for Testing（約 200 MB，只需一次）。

在 Go 程式碼中使用（Go 1.26 以上）：

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

- 每個呼叫都接受 `context.Context`，因此可以取消上傳，或為上傳設定期限。
- 錯誤皆有型別（`*autotok.PublishError`、`*autotok.UploadError`……），可搭配 `errors.As` 使用。
- 代理伺服器與雲端瀏覽器（`AUTOTOK_BROWSER`）的運作方式與本 README 所述相同。此外，登入用的瀏覽器也能使用需要密碼的 SOCKS5 代理。
- 安裝 [yt-dlp](https://github.com/yt-dlp/yt-dlp) 後即可使用 YouTube 連結。設定精靈、互動式 shell 與 MCP 伺服器只包含在 Python 套件中。

完整 API 請參閱 [`go/README.md`](go/README.md) 與 [pkg.go.dev](https://pkg.go.dev/github.com/makiisthenes/TiktokAutoUploader/go)。

---

<a id="php-java-and-c"></a>

## PHP、Java 與 C#

適用於 PHP、Java 與 .NET 的輕量函式庫，會替你執行 `autotok` 指令（Python 套件或 Go 執行檔），並將它的回應轉換成物件與具型別的錯誤。它們使用相同的已儲存帳號與代理伺服器，不需要其他任何東西。請先安裝 autotok，並用 `autotok login -n alice` 登入一次，接著：

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

- 三者都提供與 CLI 相同的貼文設定（排程、公開範圍、留言、合拍、拼接、AI 標籤、代理伺服器），可以列出並檢查帳號，且只會拋出一種例外類型，其中帶有 autotok 錯誤的 `type` 與 `retryable`，讓你知道何時重試不會造成重複發布。
- 它們需要支援 [`--json`](#json-output) 與 `--title-file` 的 autotok：Python 套件需為 2.1.0 之後的版本，Go 執行檔則需為 0.1.0 之後的版本。在這些版本正式發布之前，請從本儲存庫安裝 autotok：`uv tool install "autotok[youtube] @ git+https://github.com/makiisthenes/TiktokAutoUploader"`。
- 它們尚未發布到 Packagist、Maven Central 或 NuGet；各自的 README 中說明了如何從本儲存庫將它加入專案。
- 其他任何語言也能比照辦理：執行 `autotok --json upload ...`，再讀取一行 [JSON](#json-output) 即可。

---

<a id="mcp-server-ai-agents"></a>

## MCP 伺服器（AI agent）

autotok 內建 [MCP](https://modelcontextprotocol.io) 伺服器，讓 Claude、Cursor 或 VS Code 等 AI agent 可以替你上傳影片與排程。它使用的已儲存帳號與 CLI 相同。

```bash
uv tool install "autotok[youtube,mcp]"    # or: pip install "autotok[youtube,mcp]"
```

**Claude Code**

```bash
claude mcp add autotok -- autotok mcp
```

**Claude Desktop、Cursor 與其他用戶端**：將以下內容加入用戶端的 MCP 設定（`claude_desktop_config.json`、`.cursor/mcp.json` 等）：

```json
{
  "mcpServers": {
    "autotok": { "command": "autotok", "args": ["mcp"] }
  }
}
```

如果用戶端找不到 `autotok`，請改用 `which autotok`（Windows：`where autotok`）印出的完整路徑。接著就可以這樣要求它：*「把 clip.mp4 上傳到 my_account，說明文字是『Hello #fyp』，排程在明天晚上 6 點發布。」*

| 工具 | 功能 |
|---|---|
| `list_accounts` | 已儲存的帳號、各帳號是否已登入，以及其代理伺服器（已遮蔽密碼） |
| `check_account` | 向 TikTok 確認帳號的 session 是否仍然有效 |
| `list_videos` | 影片資料夾中的檔案 |
| `upload_video` | 上傳檔案或 YouTube 連結，可立即發布或排程在 15 分鐘到 30 天後發布，貼文設定與 CLI 相同 |
| `login`、`login_status` | 開始登入。你需要在開啟的瀏覽器視窗中（或在雲端瀏覽器提供的連結中）完成登入 |
| `set_proxy`、`test_proxy` | 儲存或移除帳號的代理伺服器，並顯示 TikTok 會看到的 IP |

- **你的 session 只會留在你的電腦上**。這些工具絕不會回傳 cookie，代理伺服器的密碼也會被遮蔽。
- **每次上傳都是真正的發布**。大多數用戶端會在每次呼叫工具前先詢問你；對 `upload_video` 請保持開啟這項確認。如果上傳錯誤指出貼文*可能存在、也可能不存在*，就是在告訴 agent 不要重試，因此不會重複發布。
- **逾時不會造成重複發布**。如果用戶端等太久而放棄某次上傳，並以相同的帳號、影片與說明文字再次呼叫 `upload_video`，它會取得第一次上傳的結果，而不會再發布一次。支援進度通知的用戶端在這段期間會持續等待。
- **Streamable HTTP**：`autotok mcp --http` 會在 `http://127.0.0.1:8000/mcp` 提供服務（可用 `--host`、`--port` 變更）。此模式沒有任何身分驗證，因此請只在 localhost 上使用，或放在你自己的驗證機制後面。

---

<a id="claude-code-plugin"></a>

## Claude Code 外掛

這是一個 [Claude Code](https://code.claude.com) 外掛，內含 `tiktok-upload` skill，讓你只要開口就能上傳：

> 把 ~/Videos/clip.mp4 發布到 my_account，說明文字是「幕後花絮 🎬 #fyp」，時間是明天晚上 6 點。

```
/plugin marketplace add makiisthenes/TiktokAutoUploader
/plugin install autotok@autotok
```

這個 skill 會執行 `autotok` 指令，所以請先[安裝 autotok](#install) 並登入。它會選擇帳號（或透過瀏覽器視窗登入一個帳號），顯示帳號、影片、說明文字與發布時間，並在發布前詢問你，接著上傳，並解釋發生的任何錯誤。只有唯讀指令（例如列出帳號）會在不跳出權限提示的情況下執行。可能已經送達、也可能尚未送達 TikTok 的上傳絕不會重試，因此不會重複發布。你也可以直接執行它：`/autotok:tiktok-upload clip.mp4 "Hello #fyp"`。

更多內容請參閱 [`claude-plugin/README.md`](claude-plugin/README.md)，其中也說明了如何在不安裝外掛的情況下使用這個 skill。

---

<a id="cli-reference"></a>

## CLI 參考

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

上傳選項：

| 參數 | 說明 | 預設值 |
|---|---|---|
| `-u` / `--user` | 已儲存的帳號名稱 | *必填* |
| `-v` / `--video` | 影片檔案（路徑，或影片資料夾中的檔名） | — |
| `-yt` / `--youtube` | 要下載並上傳的 YouTube 網址 | — |
| `-t` / `--title` | 說明文字，最多 2200 個字元 | *必填*（或使用 `--title-file`） |
| `--title-file` | 從 UTF-8 文字檔讀取說明文字，或以 `-` 從 stdin 讀取 | — |
| `-sc` / `--schedule` | 從現在起經過指定秒數後發布（900–2592000；部分帳號最多只能設定到 864000） | 立即 |
| `-vi` / `--visibility` | `0` 公開，`1` 私人 | `0` |
| `-ct` / `--comment` | 允許留言（`0`/`1`） | `1` |
| `-d` / `--duet` | 允許合拍（`0`/`1`） | `0` |
| `-st` / `--stitch` | 允許拼接（`0`/`1`） | `0` |
| `-ai` / `--ailabel` | 標示為 AI 生成內容（`0`/`1`） | `0` |
| `-p` / `--proxy` | 僅用於此次上傳的代理伺服器 | 帳號的代理伺服器 |
| `--no-proxy` | 忽略帳號已儲存的代理伺服器 | — |

在本儲存庫中執行 `python cli.py ...` 仍然有效，效果與 `autotok ...` 相同。

<a id="json-output"></a>

### JSON 輸出

為了方便指令碼與其他語言使用，`--json` 會讓 `upload` 與 `accounts` 在 stdout 輸出一行 JSON，而不是一般文字。記錄訊息仍會輸出到 stderr。[PHP、Java 與 C# 函式庫](#php-java-and-c)就是使用這種輸出。

```bash
autotok --json upload -u alice -v clip.mp4 -t "Hello #fyp"
```

| 指令 | 輸出內容 |
|---|---|
| `upload` | `{"video_id": "...", "creation_id": "...", "scheduled_for": "2026-11-02T18:30:00Z"}`（立即發布時為 `null`） |
| `accounts list` | `{"accounts": [{"name": "alice", "session": true, "proxy": "http://user:****@host:port"}]}` |
| `accounts check NAME` | `{"name": "alice", "session_ok": true}`（為 `false` 時結束狀態碼為 1） |
| `accounts remove NAME` | `{"name": "alice", "removed": true}`（為 `false` 時結束狀態碼為 1） |

發生錯誤時會輸出 `{"error": {"type": "PublishError", "message": "...", "retryable": false}}`，並使用一般的結束狀態碼（輸入無效時為 2）。`type` 是錯誤的類別名稱，例如 `ValidationError`、`AccountNotFoundError`、`PublishError` 或 `PublishUncertainError`。只有在尚未有任何內容送達 TikTok 的發布步驟時，`retryable` 才會是 `true`，因此重新執行指令不會重複發布。`PublishError` 還會包含 TikTok 的 `status_code` 與 `status_msg`。在指令執行前就被參數解析器攔下的錯誤（例如未知的選項或缺少帳號名稱）不會輸出 JSON，而是在 stderr 輸出用法說明，結束狀態碼為 2，因此不是 JSON 的輸出也應視為錯誤。

---

<a id="docker"></a>

## Docker

使用儲存庫中的 `Dockerfile`，可以建置內含 Chromium 的 CLI：

```bash
docker build -t autotok .

docker run --rm -it -v autotok-data:/data autotok accounts list
docker run --rm -it -v autotok-data:/data -v "$PWD/videos:/data/videos" \
  autotok upload -u alice -v clip.mp4 -t "Hello #fyp"
```

已儲存的帳號存放在 `/data`，所以請將它放在 volume 中保存。容器沒有螢幕，因此請使用[雲端瀏覽器](#cloud-browsers-browserbase-steel)登入，並開啟它印出的連結：

```bash
docker run --rm -it -v autotok-data:/data \
  -e AUTOTOK_BROWSER=browserbase -e BROWSERBASE_API_KEY=bb_live_... \
  autotok login -n alice -p http://user:pass@gate.example.com:7000
```

你也可以使用 `login --sessionid ... --datacenter ...`，儲存從自己瀏覽器取得的 session cookie。

全部都使用雲端瀏覽器嗎？建置時不包含本機的 Chromium，就能得到小得多的映像檔：`docker build --build-arg INSTALL_BROWSER=false -t autotok:slim .`

---

<a id="web-app-self-hosted"></a>

## 網頁應用程式（自行架設）

一個在本機執行的控制面板，提供帳號、代理伺服器、影片庫、上傳與排程器等功能，還有一個用來登入的虛擬瀏覽器。需要 Docker。

```bash
git clone https://github.com/makiisthenes/TiktokAutoUploader.git
cd TiktokAutoUploader
docker compose up --build
```

開啟 <http://localhost:3000>。API 文件位於 <http://localhost:8000/docs>。

- **帳號**：透過內建的虛擬瀏覽器登入來新增帳號（可選擇搭配代理伺服器），之後可以設定、變更或測試每個帳號的代理伺服器，並檢查其 session。
- **上傳**：拖放檔案、從影片庫中挑選，或貼上 YouTube 連結。可以立即發布，或排程在任何時間發布。
- **排程**：排程器只會重試在任何內容送達 TikTok 之前就發生的失敗，因此同一個工作不會發布兩次。在發布過程中被中斷的工作會被標示為*可能已經發布*，重試時會要求你先到 TikTok 確認。

資料存放在 `./data`。若要使用你透過 CLI 登入的帳號，請將它的檔案複製到應用程式的儲存位置，然後在 Accounts 頁面點擊 **Import from disk**：

```bash
mkdir -p data/autotok/accounts && cp ~/.autotok/accounts/my_account.json data/autotok/accounts/
```

（在 Linux 上，容器寫入的檔案擁有者是 root，因此要在網頁應用程式中管理的帳號，請使用網頁應用程式本身的登入功能。）

若要使用雲端瀏覽器為上傳產生簽章，請將 `AUTOTOK_BROWSER` 及其相關設定（請參閱[雲端瀏覽器](#cloud-browsers-browserbase-steel)）寫入與 `docker-compose.yml` 位於同一目錄的 `.env` 檔案中。透過網頁應用程式登入時，仍會使用其內建的虛擬瀏覽器。

直接呼叫 API 的指令碼，在發送 `POST`/`PATCH`/`DELETE` 請求時必須帶上 `X-Requested-With: autotok` 標頭，以防止其他網頁使用本機 API。此外，API 只會回應 `localhost` 與 `127.0.0.1`。如果你是透過其他名稱存取這個應用程式（例如放在你自己的反向代理後面），請將該名稱加入 `.env`：`AUTOTOK_ALLOWED_HOSTS=tiktok.home.lan`。

> 網頁應用程式本身沒有登入驗證機制，且只監聽 `127.0.0.1`。請勿將它暴露在網際網路上。

---

<a id="configuration"></a>

## 設定

所有設定都是選用的。設定請寫在 `.env` 檔案中：將 [`.env.example`](.env.example) 複製為 `.env`，再填入你會用到的項目。`autotok` 會先讀取你執行它的資料夾中的 `.env`，再讀取 `~/.autotok/.env`。已在環境中設定的變數優先順序較高，而 `docker compose` 也會讀取同一個檔案。`.env` 中含有 API 金鑰，因此絕對不要將它 commit（它已列在 `.gitignore` 中）。

| 變數 | 用途 | 預設值 |
|---|---|---|
| `AUTOTOK_HOME` | 已儲存的帳號與設定 | `~/.autotok` |
| `AUTOTOK_VIDEOS_DIR` | 影片資料夾與 YouTube 下載位置 | `$AUTOTOK_HOME/videos` |
| `AUTOTOK_BROWSER` | 登入／簽章用瀏覽器的執行位置：`local`、`browserbase`、`steel` | `local` |
| `AUTOTOK_BROWSER_CHANNEL` | 使用已安裝的瀏覽器，例如 `chrome` | Playwright Chromium |
| `AUTOTOK_BROWSER_PATH` | Chrome/Chromium 執行檔的完整路徑 | Playwright Chromium |
| `BROWSERBASE_API_KEY`、`BROWSERBASE_PROJECT_ID`、`BROWSERBASE_REGION`、`BROWSERBASE_PROXY_COUNTRY` | Browserbase 設定 | — |
| `STEEL_API_KEY`、`STEEL_BASE_URL`、`STEEL_CONNECT_URL` | Steel 設定（自行架設時使用 `STEEL_BASE_URL`） | Steel Cloud |

帳號檔案包含你的 TikTok session（等同於你的密碼），會以僅限擁有者存取的權限儲存；請妥善保管，切勿外流。

---

<a id="upgrading-from-tiktokautouploader-1x"></a>

## 從 TiktokAutoUploader 1.x 升級

- **安裝：** 依照[快速入門](#getting-started)操作（`uv tool install "autotok[youtube]"`，接著執行 `autotok install-browser`）。不再需要 Node.js 與 `npm install`。
- **Session：** 儲存在 `CookiesDir/` 中的 session，會在你第一次從儲存庫資料夾使用時自動遷移。參數維持不變，`python cli.py` 也仍然可以使用。
- **排程：** `-sc` 再次改回由 TikTok 端排程（15 分鐘到 10 天）。1.x 版的本機佇列（`cli.py schedule list|cancel`）現在移到了網頁應用程式的 Schedules 頁面。
- **錯誤修正：** 隱私、留言、合拍與拼接設定現在會確實套用。舊版本一律以公開方式發布，且所有互動功能都是允許的。Hashtag 也恢復為可點擊。
- **已移除：** `config.txt` 以及未使用的 ImageMagick 影片編輯輔助工具。

---

<a id="troubleshooting"></a>

## 疑難排解

| 問題 | 解決方法 |
|---|---|
| `'autotok' is not recognized` / `command not found` | 執行一次 `uv tool update-shell`，然後開啟新的終端機。如果你是用 pip 安裝的，請改用 `python -m autotok ...` |
| `Chromium for Playwright is not installed` | `autotok install-browser`（Linux 伺服器請加上 `--with-deps`） |
| `TikTok rejected the session` / `session rejected` | `autotok login -n NAME --force`（可用 `autotok accounts check NAME` 確認） |
| `Invalid parameters (status_code=5)` | TikTok 變更了它的上傳 API。請附上完整的錯誤訊息[提交 issue](https://github.com/makiisthenes/TiktokAutoUploader/issues)。 |
| `potential violation of our Community Guidelines` | TikTok 封鎖了該影片的內容；這不是工具本身的錯誤。 |
| 登入頁面拒絕登入／一直重複出現驗證碼 | 試試你已安裝的 Chrome：在 `.env` 中加入 `AUTOTOK_BROWSER_CHANNEL=chrome`，或從瀏覽器複製 `sessionid` cookie，再使用 `autotok login -n NAME --sessionid ...` |
| 雲端登入時出現「Verify it's really you」 | TikTok 不認得雲端瀏覽器的 IP。請在即時畫面中完成驗證（選擇 Email），或使用代理伺服器避免這個狀況；請參閱[雲端瀏覽器](#cloud-browsers-browserbase-steel)下方的注意事項 |
| 雲端登入的即時畫面一片空白（自行架設的 Steel） | 以 `DOMAIN=localhost:3000`（它的位址）重新啟動 steel-browser |
| `Browserbase ... (HTTP 402): Proxies are not included in the free plan` | 移除 `BROWSERBASE_PROXY_COUNTRY`，或移除雲端登入所用的帳號代理伺服器，或升級 Browserbase 方案 |
| 出現 `No TikTok datacenter cookie saved` 警告 | 用 `autotok login` 重新登入，或在使用 `--sessionid` 時一併傳入 `--datacenter` |
| `may or may not have been posted` | 發布過程中連線中斷了。重試前請先檢查該帳號，以免重複發布。 |

另請參閱[常見問題](docs/common-problems.md)。

---

<a id="professional-software-autotok-pro"></a>

## 專業版軟體（autotok Pro）

填寫候補名單表單： https://forms.gle/M4KpdfruqCukQvj99

如果你需要功能更強大、能讓你更快達成目標的工具，我提供的軟體可以：

- 管理超過 1000 個帳號
- 自動將相同的影片上傳到多個帳號
- 為多個帳號排程影片，可提前 20 天到 2 年
- 自動從 YouTube、X、Reddit、TikTok 取得影片素材
- 建立從素材來源到上傳排程的完整上傳流程
- 提供各帳號目前成效的數據指標
- 最長 3 個月由我親自提供個人化支援，協助解決你遇到的任何問題
- 支援代理伺服器，介面簡潔現代

本軟體開放購買。如有興趣，請寄信至 `michaelperes562@gmail.com`，並將主旨設為 `Tiktok Bot Software`，否則我可能會漏看你的郵件。

---

<a id="licensing"></a>

## 授權

autotok 採用**雙重授權**：

- **開放原始碼：** [GNU AGPL v3.0](LICENSE)。你可以自由使用、修改與分享。如果你散布修改過的版本，或將修改版作為服務提供給他人使用，就必須以相同的授權條款公開你的原始碼。
- **商業授權：** 若要將 autotok 整合到閉源產品或付費服務中，而不受 AGPL 義務的約束，或要使用 autotok Pro，請聯絡 `michaelperes562@gmail.com`。

Copyright © 2021–2026 Michael Peres。2.0.0 之前的版本仍適用其發布時的授權條款。隨附的簽章指令碼屬於第三方程式碼，請參閱 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。歡迎依照 [CONTRIBUTING.md](CONTRIBUTING.md) 中的條款參與貢獻。

---

<a id="support-this-project"></a>

## 支持本專案

如果你喜歡這個專案，歡迎透過 [Patreon](https://patreon.com/makiisthenes) 或 [Ko-Fi](https://ko-fi.com/makiperes) 支持我，或為本專案點個 star。

- 感謝 [@DelvinBa](https://github.com/DelvinBa) 將專案更新為使用 TikTok 新的上傳端點。（09/12/2024）

<a id="bugs-and-issues"></a>

## 錯誤與問題回報

回報錯誤請使用 [Issues 分頁](https://github.com/makiisthenes/TiktokAutoUploader/issues)，請勿透過電子郵件。安全性問題則請依照 [SECURITY.md](SECURITY.md) 的說明，改以私下回報的方式提交。

<a id="notes-and-terms"></a>

## 注意事項與條款

本專案與 TikTok 沒有任何關聯。自動化上傳可能違反 TikTok 的服務條款，並可能導致帳號遭到限制或停權。請只上傳你擁有權利的內容。使用風險請自行承擔。

<a id="star-history"></a>

## Star 歷史

[![Star 歷史圖表](https://api.star-history.com/svg?repos=makiisthenes/TiktokAutoUploader&type=Date)](https://star-history.com/#makiisthenes/TiktokAutoUploader&Date)
