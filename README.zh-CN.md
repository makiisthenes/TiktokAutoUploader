# autotok — TikTok Auto Uploader

<p align="center">
  <a href="README.md">English</a> ·
  <b>简体中文</b> ·
  <a href="README.zh-TW.md">繁體中文</a> ·
  <a href="README.ja.md">日本語</a> ·
  <a href="README.ko.md">한국어</a> ·
  <a href="README.es.md">Español</a> ·
  <a href="README.pt-BR.md">Português (Brasil)</a> ·
  <a href="README.ru.md">Русский</a> ·
  <a href="README.fr.md">Français</a> ·
  <a href="README.de.md">Deutsch</a>
</p>

*本文是[英文 README](README.md) 的译文，如两者内容不一致，以最新的英文版为准。*

<p align="center">
  <img src="https://user-images.githubusercontent.com/52138450/111885490-04ab6680-89c0-11eb-955a-f833577b4406.png" width="35%" alt="TiktokAutoUploader 标志">
</p>

<p align="center">通过命令行、Python、TypeScript、Go、PHP、Java 或 C# 上传和定时发布 TikTok 视频，每个账号可使用独立代理。</p>
<p align="center"><code>uv tool install autotok</code> · <code>npm install autotok</code> · 只需登录一次 · 每次上传一条命令</p>

<p align="center">
  <a href="https://pypi.org/project/autotok/"><img alt="PyPI" src="https://img.shields.io/pypi/v/autotok?label=pypi"></a>
  <a href="https://www.npmjs.com/package/autotok"><img alt="npm" src="https://img.shields.io/npm/v/autotok?label=npm"></a>
  <a href="#typescript-sdk"><img alt="已内置 TypeScript 类型" src="https://img.shields.io/npm/types/autotok"></a>
  <a href="https://pkg.go.dev/github.com/makiisthenes/TiktokAutoUploader/go"><img alt="Go 参考文档" src="https://pkg.go.dev/badge/github.com/makiisthenes/TiktokAutoUploader/go.svg"></a>
  <a href="https://github.com/makiisthenes/TiktokAutoUploader/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/makiisthenes/TiktokAutoUploader/actions/workflows/ci.yml/badge.svg"></a>
  <a href="LICENSE"><img alt="许可证：AGPL-3.0" src="https://img.shields.io/badge/license-AGPL--3.0-blue"></a>
  <a href="https://www.linkedin.com/in/michael-p-88b015200/"><img alt="LinkedIn" src="https://img.shields.io/badge/LinkedIn-0077B5?style=flat-square&logo=linkedin&logoColor=white"></a>
  <img alt="Star 数" src="https://img.shields.io/github/stars/makiisthenes/TiktokAutoUploader">
  <img alt="Fork 数" src="https://img.shields.io/github/forks/makiisthenes/TiktokAutoUploader">
</p>

<p align="center">
  <a href="https://github.com/makiisthenes/TiktokAutoUploader/blob/main/docs/media/autotok-launch.mp4">
    <img src="https://raw.githubusercontent.com/makiisthenes/TiktokAutoUploader/main/docs/media/autotok-launch.webp" width="100%" alt="38 秒了解 autotok：只需登录一次，之后一条命令就能把视频上传到 TikTok，可以立即发布，也可以定时发布，你的任何账号都适用">
  </a>
</p>
<p align="center"><sub>点击视频，观看带声音的版本。</sub></p>

---

<a id="install"></a>

## 安装

**命令行与 Python**

```bash
uv tool install "autotok[youtube]"
autotok install-browser                                   # one-time browser download, about 300 MB
```

然后每个账号登录一次，之后用一条命令就能上传：

```bash
autotok login -n my_account                               # log in on the page that opens; the QR code is quickest
autotok upload -u my_account -v clip.mp4 -t "Hello #fyp"
```

没有 uv？用 `pipx install "autotok[youtube]"` 或 `pip install "autotok[youtube]"` 也可以。[快速上手](#getting-started)会逐一讲解每个步骤，包括代理和云浏览器。

**TypeScript 与 JavaScript（Node.js）**

```bash
npm install autotok
npx playwright install chromium                           # one-time browser download
```

```ts
import { login, uploadVideo } from "autotok";

await login("my_account");                                // once: log in on the page that opens
await uploadVideo("my_account", "clip.mp4", "Hello #fyp");
```

完整的类型支持、基于 Promise、无需 Python，并且与 CLI 共用已保存的账号。详见 [TypeScript SDK](#typescript-sdk)。

**Go，或者一个无需安装任何其他东西的二进制文件**

```bash
go install github.com/makiisthenes/TiktokAutoUploader/go/cmd/autotok@latest
```

也可以从 [Releases](https://github.com/makiisthenes/TiktokAutoUploader/releases) 页面（以 `go/v...` 开头的版本）下载适合你系统的 `autotok` 二进制文件。它的命令与上面相同，不需要 Python 或 Node.js，直接使用你电脑上已有的 Chrome。在 Go 代码中使用：`go get github.com/makiisthenes/TiktokAutoUploader/go`。详见 [Go](#go-sdk-and-single-binary)。

**PHP、Java 和 C#**

几个轻量的库，替你运行 `autotok` 命令，并返回带类型的结果和错误。先按上面的方式安装 autotok，然后参阅 [PHP、Java 和 C#](#php-java-and-c)。

---

<a id="sponsors"></a>

## 赞助商

<p align="center">
  <a href="https://www.swiftproxy.net/?ref=makiisthenes">
    <img src="https://github.com/user-attachments/assets/a1d0e915-e09a-4b36-ba72-788c4cc1e709" alt="Swiftproxy — 9000 万+ 住宅代理" width="420">
  </a>
</p>

[**Swiftproxy**](https://www.swiftproxy.net/?ref=makiisthenes) 提供 9000 万+ 纯净的住宅代理和静态住宅代理，专为社交媒体自动化、多账号管理和网页自动化流程设计。凭借稳定的连接、覆盖全球的 IP 资源和可靠的代理基础设施，Swiftproxy 帮助用户安全地管理多个账号、减少与 IP 相关的限制，并扩大自动化任务的规模。住宅代理流量在用完之前永不过期，并提供免费测试。

> **立享 9 折**：使用优惠码 `PROXY90` —— [从 Swiftproxy 获取代理 →](https://www.swiftproxy.net/?ref=makiisthenes)

<br>

<p align="center">
  <a href="https://termius.com/">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/makiisthenes/TiktokAutoUploader/main/docs/images/termius-logo-white.png">
      <img src="https://raw.githubusercontent.com/makiisthenes/TiktokAutoUploader/main/docs/images/termius-logo.png" alt="Termius" width="300">
    </picture>
  </a>
</p>

[**Termius**](https://termius.com/) 提供安全、可靠、支持团队协作的 SSH 客户端。

> [获取 Termius →](https://termius.com/)

---

<a id="getting-started"></a>

## 快速上手

整个配置大约需要五分钟。完成安装（第 1 步）后，可以运行 `autotok setup`，由它引导你完成剩下的步骤：检查浏览器，询问代理并进行测试，然后通过该代理登录 TikTok。下面的步骤就是手动完成同样的事情。

<a id="1-install-autotok"></a>

### 1. 安装 autotok

```bash
uv tool install "autotok[youtube]"
```

就这么简单：现在你可以在任意终端中运行 `autotok` 命令了（用 `autotok --version` 检查）。uv 会把 autotok 与你的其他 Python 包隔离开；如果你还没有 Python，它也会帮你下载。

还没有 uv？按照 [docs.astral.sh/uv](https://docs.astral.sh/uv/getting-started/installation/) 上的说明，一行命令就能装好；或者使用 [pipx](https://pipx.pypa.io)：`pipx install "autotok[youtube]"`。

- 以后更新：`uv tool upgrade autotok`。
- 不安装直接试用：`uvx --from "autotok[youtube]" autotok --version`。
- 要在 Python 代码中使用 autotok？把它添加到你的项目中：`uv add "autotok[youtube]"` 或 `pip install "autotok[youtube]"`。
- 使用 TypeScript 或 JavaScript？请改用 `npm install autotok`，详见 [TypeScript SDK](#typescript-sdk)。在代码中，用 `login()` 和 `uploadVideo()` 代替第 3、4 步中的命令。
- 无法安装 Python，或者在写 Go？改用 [Releases](https://github.com/makiisthenes/TiktokAutoUploader/releases) 页面中的单个 `autotok` 二进制文件即可，下面的步骤完全相同。详见 [Go](#go-sdk-and-single-binary)。
- `[youtube]` 用于支持 YouTube 链接，不需要的话可以去掉。
- 运行 `autotok` 时提示“not recognized”或“command not found”？运行一次 `uv tool update-shell`，然后打开一个新终端。

<a id="2-choose-where-the-browser-runs"></a>

### 2. 选择浏览器的运行位置

autotok 需要用浏览器完成一次性登录，并为每次上传生成签名。从以下方式中选择一种：

| 方式 | 适用场景 | 配置 |
|---|---|---|
| **本地**（默认） | 你自己的电脑 | `autotok install-browser`，一次性下载约 300 MB |
| **云端**（[Browserbase](https://www.browserbase.com) 或 [Steel](https://github.com/steel-dev/steel-browser)） | 服务器、Docker，或者不想占用自己的电脑 | 在配置文件中添加 API 密钥。详见[云浏览器](#cloud-browsers-browserbase-steel) |

如果要在全新的 Linux 服务器上使用本地浏览器，请以 root 身份运行 `autotok install-browser --with-deps`，它还会一并安装 Chromium 所需的系统库。

<a id="3-log-in-to-tiktok-once-per-account"></a>

### 3. 登录 TikTok（每个账号一次）

```bash
autotok login -n my_account
```

浏览器窗口会打开 TikTok 的登录页面。用什么方式登录都可以，用手机上的 TikTok App 扫描二维码最快。登录完成后窗口会自动关闭，会话保存为 `my_account`。如果使用云浏览器，你会得到一个链接，打开它进行登录即可。

```bash
autotok accounts check my_account     # confirms TikTok accepts the saved session
```

- 打算给这个账号使用代理？现在就传入，这样登录和之后的上传都使用同一个 IP（参见[代理](#proxies)）：`autotok login -n my_account -p http://user:pass@host:port`
- 每个账号换一个 `-n` 名称，重复以上操作。
- 会话保存在 `~/.autotok/accounts` 中，请像对待密码一样妥善保管。

<a id="4-upload"></a>

### 4. 上传

```bash
autotok upload -u my_account -v "C:\Videos\clip.mp4" -t "My caption #fyp"
```

就这么简单。更多示例：

```bash
autotok upload -u my_account -v clip.mp4 -t "Just for me" -vi 1                 # private
autotok upload -u my_account -v clip.mp4 -t "Later #fyp" -sc 3600               # publish in 1 hour
autotok upload -u my_account -yt "https://www.youtube.com/shorts/xxxxxxxxxxx" -t "Caption"
```

`-v` 可以是任意视频的路径；如果视频位于 `~/.autotok/videos` 中，只写文件名即可。全部选项见 [CLI 参考](#cli-reference)。

<a id="5-optional-save-your-settings-in-a-file"></a>

### 5. 可选：把设置保存到文件中

云浏览器、云浏览器的 API 密钥之类的设置写在 `.env` 文件中。autotok 会先在你运行它的文件夹中查找，然后查找 `~/.autotok/.env`；后者在任何文件夹下都会生效。可以复制（本仓库中的）[`.env.example`](.env.example)，也可以只写你需要的内容：

```bash
# ~/.autotok/.env   (Windows: C:\Users\<you>\.autotok\.env)
AUTOTOK_BROWSER=browserbase
BROWSERBASE_API_KEY=bb_live_...
```

<a id="where-next"></a>

### 接下来看什么？

| 我想要…… | 参阅 |
|---|---|
| 运行多个账号，每个账号使用独立 IP | [代理](#proxies) |
| 不在自己的电脑上运行浏览器 | [云浏览器](#cloud-browsers-browserbase-steel) |
| 在 Python 代码中上传 | [Python SDK](#python-sdk) |
| 在 TypeScript 或 JavaScript 中上传 | [TypeScript SDK](#typescript-sdk) |
| 在 Go 中上传，或者使用不依赖 Python 的单个二进制文件 | [Go](#go-sdk-and-single-binary) |
| 在 PHP、Java 或 C# 中上传 | [PHP、Java 和 C#](#php-java-and-c) |
| 让 AI 智能体（Claude、Cursor……）替我上传 | [MCP 服务器](#mcp-server-ai-agents) |
| 通过技能（skill）让 Claude Code 帮我上传 | [Claude Code 插件](#claude-code-plugin) |
| 在服务器或容器中运行 | [Docker](#docker) |
| 使用带调度器的 Web 控制面板 | [Web 应用](#web-app-self-hosted) |
| 解决报错 | [故障排查](#troubleshooting) |

---

<a id="features"></a>

## 功能特性

- **一条命令上传**：通过 TikTok 的网页上传 API 完成，不用在 TikTok 网站上一步步点击。
- **每个账号独立代理**：登录、请求签名和每次上传都走同一个代理，因此每个账号始终显示为来自同一个 IP。支持 HTTP(S) 和 SOCKS5。
- **多账号**：每个账号登录一次，之后按名称上传。
- **定时发布**：由 TikTok 端定时，可提前 15 分钟到 30 天（TikTok 对部分账号限制为 10 天）。自托管的 Web 应用还额外提供一个不限时间的调度器。
- **发布设置**：公开或私密，并可开关评论、合拍、拼接和 AI 生成内容标签。
- **可点击的话题标签和 @提及**，能正确处理 emoji。
- **YouTube 链接**会通过 [yt-dlp](https://github.com/yt-dlp/yt-dlp) 自动下载。
- **Python SDK、CLI 以及可选的 Web 应用**（Docker），支持在浏览器中登录。
- **TypeScript SDK** 已发布到 npm（`npm install autotok`）：完整的类型支持、基于 Promise、无需 Python，并且与 CLI 共用已保存的账号。
- **Go 包和单个二进制文件**：可以用 `go get` 获取这个库，也可以直接下载一个不依赖 Python 或 Node.js 的 `autotok` 可执行文件。它与其他包共用已保存的账号。
- **PHP、Java 和 C# 库**：调用 `autotok` 命令，返回带类型的结果和错误，没有其他依赖。
- **MCP 服务器**：让 AI 智能体（Claude、Cursor、VS Code……）替你上传和定时发布。
- **Claude Code 插件**，内置 TikTok 上传技能：用平常的话说出你的要求即可，发布前它会先跟你确认。
- **云浏览器**：在 [Browserbase](https://www.browserbase.com) 或 [Steel](https://github.com/steel-dev/steel-browser)（云端或自托管）上运行用于登录和签名的浏览器，而不是在你的电脑上运行。
- **Docker 镜像**，用于在服务器上运行 CLI。
- **无需 Node.js**（Python 包）：TikTok 的请求签名在无头 Chromium 中计算。

---

<a id="proxies"></a>

## 代理

多个账号共用一个 IP，是最快让它们被标记的做法。autotok 允许你为每个账号设置独立的代理，并在该账号与 TikTok 的**所有**通信中使用这个代理：

| 步骤 | 是否经过该账号的代理 |
|---|---|
| 登录浏览器（`autotok login`、Web 应用登录） | ✅ |
| 获取签名页面 | ✅（签名浏览器本身不发出任何网络请求） |
| 上传 API 调用和视频传输 | ✅ |
| YouTube 下载 | ❌（不属于 TikTok 流量；可节省代理流量） |

**设置、修改和测试代理**

`autotok setup` 会询问代理、测试代理，并通过它登录。手动操作如下：

```bash
autotok login -n alice -p http://user:pass@gate.example.com:7000   # set at login
autotok proxy set alice socks5://user:pass@gate.example.com:1080     # set or change later
autotok proxy test -u alice                                          # shows the IP TikTok will see
autotok proxy clear alice                                            # go direct
autotok accounts list                                                # every account and its proxy (passwords hidden)

autotok upload -u alice -v clip.mp4 -t "hi" -p http://other:pass@host:8000   # one-off override
autotok upload -u alice -v clip.mp4 -t "hi" --no-proxy                       # ignore the saved proxy once
```

**支持的格式**（协议默认为 `http`）

```
http://user:pass@host:port      https://user:pass@host:port
socks5://user:pass@host:port    host:port
user:pass@host:port             host:port:user:pass      ← the export format most providers use
```

**建议**

- 使用**住宅或移动**代理，每个账号一个，并开启**粘性会话**（数小时内保持同一 IP）。每次请求都更换 IP 的代理，会让已登录的会话看起来像是被劫持了。
- **用之后上传时要用的同一个代理登录**（`autotok login -p ...`）。在家里直接登录、再通过代理上传，这种不一致 TikTok 是能看出来的。
- Chromium 无法使用需要用户名和密码的 SOCKS5 代理。登录这一步请使用代理服务商提供的 HTTP 端点（上传时两种都可以）。
- 密码永远不会被打印出来：CLI 和 Web 应用显示的是 `http://user:****@host:port`.

需要代理？看看我们的[赞助商](#sponsors)。

---

<a id="cloud-browsers-browserbase-steel"></a>

## 云浏览器（Browserbase、Steel）

autotok 在两个地方需要用到浏览器：一次性的**登录**，以及为每次上传**签名**（TikTok 的反机器人签名是在浏览器页面中计算的）。默认使用你本机上的 Chromium。设置 `AUTOTOK_BROWSER` 后，浏览器会改为在云端运行。这样本地无需安装或打开任何东西，非常适合服务器和 Docker 环境。

| `AUTOTOK_BROWSER` | 浏览器运行位置 | 设置 |
|---|---|---|
| `local`（默认） | 本机上的 Chromium | 运行一次 `autotok install-browser` |
| `browserbase` | [Browserbase](https://www.browserbase.com) | `BROWSERBASE_API_KEY`（可选 `BROWSERBASE_PROJECT_ID`、`BROWSERBASE_REGION`） |
| `steel` | [Steel Cloud](https://steel.dev)，或你自己的 [steel-browser](https://github.com/steel-dev/steel-browser) 服务器 | 云端：`STEEL_API_KEY`。自托管：`STEEL_BASE_URL`，例如 `http://localhost:3000` |

把这些设置写入 `.env` 文件（可复制 [`.env.example`](.env.example)）：

```bash
AUTOTOK_BROWSER=browserbase
BROWSERBASE_API_KEY=bb_live_...
```

然后照常使用 autotok：

```bash
autotok browser check                 # starts a session and shows the IP it browses from
autotok login -n alice -p http://user:pass@gate.example.com:7000
autotok upload -u alice -v clip.mp4 -t "Hello #fyp"
```

也可以按命令单独指定：`autotok --browser steel login -n alice`。

**登录**：`autotok login` 会打印一个实时画面（live view）链接，并在你平时用的浏览器中打开它。在该页面中登录 TikTok；登录成功后会话会立即保存，云浏览器随即关闭。

**自托管 Steel** 免费且开源：

```bash
docker run -p 3000:3000 -e DOMAIN=localhost:3000 ghcr.io/steel-dev/steel-browser
```

并在 `.env` 中写入：

```bash
AUTOTOK_BROWSER=steel
STEEL_BASE_URL=http://localhost:3000
```

把 `DOMAIN` 设置为你访问该服务器所用的地址。如果不设置，steel-browser 会让浏览器连接到 `0.0.0.0`，实时画面会一直是空白的，导致你无法登录。autotok 检测到这种情况时会发出警告。自托管的 steel-browser 一次只能运行一个会话。

注意事项：

- **云端登录时请使用账号代理。** 账号的代理会应用到云端登录会话上，因此 TikTok 在登录和上传时看到的是同一个 IP。如果不设置代理，TikTok 会看到登录来自服务商的 IP，而上传来自你自己的 IP。
- **“Verify it's really you”**：登录后出现这个提示，说明 TikTok 发现一台陌生设备在使用数据中心 IP。你可以在实时画面中完成验证，但最好能避免它：使用账号代理；或者如果你是 Browserbase 付费套餐，设置 `BROWSERBASE_PROXY_COUNTRY=GB`（改成你所在的国家），通过当地的家庭 IP 登录。免费套餐下，把 `BROWSERBASE_REGION` 设为离你最近的区域（例如 `eu-central-1`），至少可以避免从美国登录。
- 实时画面只显示 TikTok 标签页，所以在云端登录时 autotok 会关闭“Continue with Google”之类的弹窗。请改用二维码、邮箱/用户名或手机号登录。
- Browserbase 只支持 HTTP/HTTPS 代理，而且自定义代理需要 Developer 或更高级别的套餐。Steel Cloud 上的自定义代理可能也需要付费套餐。
- 只有浏览器在云端运行。视频文件仍然从你的机器（经由账号代理）直接传到 TikTok，所以云端用量很小：每次登录、每次上传各一个短会话。
- 想用其他服务商？继承 `autotok.browsers.CloudProvider`，然后调用 `autotok.browsers.register_provider("name", YourProvider)`。

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

已经从浏览器中拿到了 `sessionid` cookie？可以跳过登录窗口：

```python
autotok.import_session("alice", "<sessionid value>", datacenter="<tt-target-idc value>")
```

---

<a id="typescript-sdk"></a>

## TypeScript SDK

同一个上传工具的 TypeScript 和 JavaScript 版本，在 npm 上的包名为 [`autotok`](https://www.npmjs.com/package/autotok)。它运行在 Node.js 22.12+ 上，自带类型定义，无需 Python。它读写的是同一个 `~/.autotok/accounts`，因此用 CLI 登录的账号在 TypeScript 中也能使用，反之亦然。

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

- 在编辑器中一切都有类型：选项、结果以及所有错误类。
- 视频可以是路径、`~/.autotok/videos` 中的文件名，或者视频的字节数据（`Buffer`/`Uint8Array`）。
- 支持 ES 模块和 CommonJS（`require("autotok")`），也支持 TypeScript 的 `nodenext`、`node20` 和 `bundler` 设置。
- 代理、云浏览器（`AUTOTOK_BROWSER`）、配置变量和 `.env` 文件的用法与本 README 中的说明相同；调用 `loadEnv()` 即可读取 `.env`。
- 已经有 `sessionid` cookie？`await importSession("alice", "<sessionid>", { datacenter: "<tt-target-idc>" })`。

完整 API 见 [`js/README.md`](js/README.md)。CLI、YouTube 链接、MCP 服务器和 Web 应用都在 Python 包中。

---

<a id="go-sdk-and-single-binary"></a>

## Go SDK 与单个二进制文件

autotok 也是一个 Go 模块，可以编译成单个 `autotok` 二进制文件，无需 Python 或 Node.js。这个二进制文件的命令和参数与 Python CLI 完全相同。和 TypeScript 包一样，它读写的也是同一个 `~/.autotok/accounts`，因此账号在各处通用。

```bash
go install github.com/makiisthenes/TiktokAutoUploader/go/cmd/autotok@latest   # or download a release binary
autotok login -n my_account
autotok upload -u my_account -v clip.mp4 -t "Hello #fyp"
```

它使用你电脑上已安装的 Chrome、Chromium 或 Edge 来登录和签名；如果其他包已经安装了 Playwright 的 Chromium，也可以用它。如果两者都没有，运行 `autotok install-browser`，它会下载 Chrome for Testing（约 200 MB，只需一次）。

在 Go 代码中使用（Go 1.26+）：

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

- 每个调用都接收一个 `context.Context`，因此上传可以被取消，也可以设置截止时间。
- 错误带有类型（`*autotok.PublishError`、`*autotok.UploadError`……），可配合 `errors.As` 使用。
- 代理和云浏览器（`AUTOTOK_BROWSER`）的用法与本 README 中的说明相同。登录浏览器还支持需要密码的 SOCKS5 代理。
- 安装 [yt-dlp](https://github.com/yt-dlp/yt-dlp) 后即可使用 YouTube 链接。配置向导、交互式 shell 和 MCP 服务器只在 Python 包中提供。

完整 API 见 [`go/README.md`](go/README.md) 和 [pkg.go.dev](https://pkg.go.dev/github.com/makiisthenes/TiktokAutoUploader/go)。

---

<a id="php-java-and-c"></a>

## PHP、Java 和 C#

适用于 PHP、Java 和 .NET 的几个轻量库会替你运行 `autotok` 命令（Python 包或 Go 二进制文件），并把它的输出转换成对象和带类型的错误。它们使用相同的已保存账号和代理，不需要其他任何依赖。先安装 autotok，并用 `autotok login -n alice` 登录一次，然后：

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

- 这三个库都支持与 CLI 相同的发布设置（定时、可见性、评论、合拍、拼接、AI 标签、代理），可以列出和检查账号，并且只抛出一种异常类型，其中带有 autotok 错误的 `type` 和 `retryable`，让你知道什么时候重试不会导致重复发布。
- 它们需要支持 [`--json`](#json-output) 和 `--title-file` 的 autotok：Python 包 2.1.0 之后的版本，或 Go 二进制文件 0.1.0 之后的版本。在这些版本发布之前，请从本仓库安装 autotok：`uv tool install "autotok[youtube] @ git+https://github.com/makiisthenes/TiktokAutoUploader"`。
- 它们还没有发布到 Packagist、Maven Central 或 NuGet；各自的 README 中说明了如何从本仓库添加。
- 任何其他语言都可以用同样的方式：运行 `autotok --json upload ...`，然后读取一行 [JSON](#json-output)。

---

<a id="mcp-server-ai-agents"></a>

## MCP 服务器（AI 智能体）

autotok 内置一个 [MCP](https://modelcontextprotocol.io) 服务器，让 Claude、Cursor、VS Code 等 AI 智能体可以替你上传和定时发布视频。它使用与 CLI 相同的已保存账号。

```bash
uv tool install "autotok[youtube,mcp]"    # or: pip install "autotok[youtube,mcp]"
```

**Claude Code**

```bash
claude mcp add autotok -- autotok mcp
```

**Claude Desktop、Cursor 及其他客户端**：将以下内容添加到客户端的 MCP 设置中（`claude_desktop_config.json`、`.cursor/mcp.json` 等）：

```json
{
  "mcpServers": {
    "autotok": { "command": "autotok", "args": ["mcp"] }
  }
}
```

如果客户端找不到 `autotok`，请使用 `which autotok`（Windows 上为 `where autotok`）输出的完整路径。然后就可以这样提问，例如：*“把 clip.mp4 上传到 my_account，文案为‘Hello #fyp’，定在明天下午 6 点发布。”*

| 工具 | 作用 |
|---|---|
| `list_accounts` | 列出已保存的账号、各账号是否已登录，以及它的代理（已脱敏） |
| `check_account` | 向 TikTok 确认某个账号的会话是否仍然有效 |
| `list_videos` | 列出你的视频文件夹中的文件 |
| `upload_video` | 上传文件或 YouTube 链接，可以立即发布，也可以定时在 15 分钟到 30 天后发布，发布设置与 CLI 相同 |
| `login`、`login_status` | 发起登录。你需要在打开的浏览器窗口中（或在云浏览器给出的链接中）完成登录 |
| `set_proxy`、`test_proxy` | 保存或移除账号的代理，并显示 TikTok 将会看到的 IP |

- **你的会话始终保留在你的电脑上。** 这些工具从不返回 cookie，代理密码也会被脱敏。
- **每次上传都是真实发布。** 大多数客户端在每次调用工具前都会征求确认；对于 `upload_video`，请保持这项确认开启。如果上传错误提示帖子*可能已发布，也可能未发布*，就是在告诉智能体不要重试，这样就不会重复发布。
- **超时不会导致重复发布。** 如果客户端在一次耗时较长的上传中放弃等待，并用相同的账号、视频和文案再次调用 `upload_video`，它会拿到第一次上传的结果，而不会再发布一次。支持进度通知的客户端在此期间会持续等待。
- **Streamable HTTP**：`autotok mcp --http` 会在 `http://127.0.0.1:8000/mcp` 上提供服务（可用 `--host`、`--port` 修改）。它没有身份验证，所以请只在 localhost 上使用，或者放在你自己的身份验证之后。

---

<a id="claude-code-plugin"></a>

## Claude Code 插件

一个 [Claude Code](https://code.claude.com) 插件，内含 `tiktok-upload` 技能（skill），让你只需提出要求就能上传：

> 把 ~/Videos/clip.mp4 发布到 my_account，文案为“幕后花絮 🎬 #fyp”，明天下午 6 点发。

```
/plugin marketplace add makiisthenes/TiktokAutoUploader
/plugin install autotok@autotok
```

该技能会运行 `autotok` 命令，所以请先[安装 autotok](#install) 并登录。它会选好账号（或通过浏览器窗口登录一个账号），在发布前展示账号、视频、文案和时间并征求你的确认，然后上传，如果出错会解释原因。只有列出账号这类只读命令，才会在没有权限提示的情况下直接运行。对于不确定是否已到达 TikTok 的上传，它绝不会重试，因此不会重复发布。你也可以直接运行它：`/autotok:tiktok-upload clip.mp4 "Hello #fyp"`。

更多内容见 [`claude-plugin/README.md`](claude-plugin/README.md)，包括如何在不安装插件的情况下使用这个技能。

---

<a id="cli-reference"></a>

## CLI 参考

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

上传选项：

| 参数 | 说明 | 默认值 |
|---|---|---|
| `-u` / `--user` | 已保存的账号名 | *必填* |
| `-v` / `--video` | 视频文件（路径，或视频文件夹中的文件名） | — |
| `-yt` / `--youtube` | 要下载并上传的 YouTube URL | — |
| `-t` / `--title` | 文案，最多 2200 个字符 | *必填*（或使用 `--title-file`） |
| `--title-file` | 从 UTF-8 文本文件读取文案；传入 `-` 则从 stdin 读取 | — |
| `-sc` / `--schedule` | 从现在起多少秒后发布（900–2592000；部分账号最多只允许 864000） | 立即 |
| `-vi` / `--visibility` | `0` 公开，`1` 私密 | `0` |
| `-ct` / `--comment` | 允许评论（`0`/`1`） | `1` |
| `-d` / `--duet` | 允许合拍（`0`/`1`） | `0` |
| `-st` / `--stitch` | 允许拼接（`0`/`1`） | `0` |
| `-ai` / `--ailabel` | 标注为 AI 生成（`0`/`1`） | `0` |
| `-p` / `--proxy` | 仅用于本次上传的代理 | 账号的代理 |
| `--no-proxy` | 忽略账号已保存的代理 | — |

本仓库中的 `python cli.py ...` 仍然可用，与 `autotok ...` 完全等效。

<a id="json-output"></a>

### JSON 输出

为了方便脚本和其他语言调用，`--json` 会让 `upload` 和 `accounts` 在 stdout 上输出一行 JSON，而不是普通文本。日志仍然输出到 stderr。[PHP、Java 和 C# 库](#php-java-and-c)就是通过它来调用的。

```bash
autotok --json upload -u alice -v clip.mp4 -t "Hello #fyp"
```

| 命令 | 输出 |
|---|---|
| `upload` | `{"video_id": "...", "creation_id": "...", "scheduled_for": "2026-11-02T18:30:00Z"}`（立即发布时为 `null`） |
| `accounts list` | `{"accounts": [{"name": "alice", "session": true, "proxy": "http://user:****@host:port"}]}` |
| `accounts check NAME` | `{"name": "alice", "session_ok": true}`（为 `false` 时退出状态码为 1） |
| `accounts remove NAME` | `{"name": "alice", "removed": true}`（为 `false` 时退出状态码为 1） |

出错时输出 `{"error": {"type": "PublishError", "message": "...", "retryable": false}}`，退出状态码与平常相同（输入无效时为 2）。`type` 是错误的类名，例如 `ValidationError`、`AccountNotFoundError`、`PublishError` 或 `PublishUncertainError`。只有在请求完全没有到达 TikTok 的发布步骤时，`retryable` 才为 `true`，因此再次运行命令不会导致重复发布。`PublishError` 还会带上 TikTok 返回的 `status_code` 和 `status_msg`。命令运行前就被参数解析器发现的错误（例如未知选项或缺少账号名）不会输出 JSON，而是在 stderr 输出用法说明，退出状态码为 2，因此不是 JSON 的输出也应视为错误。

---

<a id="docker"></a>

## Docker

仓库中的 `Dockerfile` 会构建一个内置 Chromium 的 CLI 镜像：

```bash
docker build -t autotok .

docker run --rm -it -v autotok-data:/data autotok accounts list
docker run --rm -it -v autotok-data:/data -v "$PWD/videos:/data/videos" \
  autotok upload -u alice -v clip.mp4 -t "Hello #fyp"
```

已保存的账号存放在 `/data` 中，所以请把它放在一个卷（volume）里。容器没有屏幕，因此请使用[云浏览器](#cloud-browsers-browserbase-steel)登录，并打开它输出的链接：

```bash
docker run --rm -it -v autotok-data:/data \
  -e AUTOTOK_BROWSER=browserbase -e BROWSERBASE_API_KEY=bb_live_... \
  autotok login -n alice -p http://user:pass@gate.example.com:7000
```

你也可以用 `login --sessionid ... --datacenter ...` 保存从你自己浏览器中取得的会话 cookie。

全部使用云浏览器？构建时去掉本地 Chromium，镜像会小很多：`docker build --build-arg INSTALL_BROWSER=false -t autotok:slim .`

---

<a id="web-app-self-hosted"></a>

## Web 应用（自托管）

一个本地控制面板，包含账号、代理、视频库、上传和调度器，还带有一个用于登录的虚拟浏览器。需要 Docker。

```bash
git clone https://github.com/makiisthenes/TiktokAutoUploader.git
cd TiktokAutoUploader
docker compose up --build
```

打开 <http://localhost:3000>。API 文档位于 <http://localhost:8000/docs>。

- **账号**：通过内置的虚拟浏览器登录来添加账号（可选配代理），然后为每个账号设置、修改或测试代理，并检查它的会话。
- **上传**：拖入文件、从视频库中选择，或者粘贴 YouTube 链接。可以立即发布，也可以定在任意时间发布。
- **定时任务**：调度器只会重试那些在任何内容到达 TikTok 之前就失败的任务，因此同一个任务不会发布两次。如果任务在发布过程中被中断，会被标记为*可能已发布*，重试时会先提醒你去 TikTok 上确认。

数据存放在 `./data` 中。如果要使用通过 CLI 登录的账号，把它的文件复制到应用的存储目录中，然后在 Accounts 页面点击 **Import from disk**：

```bash
mkdir -p data/autotok/accounts && cp ~/.autotok/accounts/my_account.json data/autotok/accounts/
```

（在 Linux 上，容器写入的文件归 root 所有，所以在 Web 应用里管理的账号，请使用 Web 应用自带的登录功能。）

如果要用云浏览器为上传签名，请把 `AUTOTOK_BROWSER` 及其相关设置（参见[云浏览器](#cloud-browsers-browserbase-steel)）写入 `docker-compose.yml` 旁边的 `.env` 文件中。通过 Web 应用登录时，仍然使用它内置的虚拟浏览器。

直接调用 API 的脚本在发送 `POST`/`PATCH`/`DELETE` 请求时，必须带上请求头 `X-Requested-With: autotok`，这样可以防止其他网页调用本地 API。此外，API 只响应 `localhost` 和 `127.0.0.1`。如果你通过其他名称访问这个应用（比如放在你自己的反向代理后面），请把它添加到 `.env` 中：`AUTOTOK_ALLOWED_HOSTS=tiktok.home.lan`。

> Web 应用本身没有登录认证，并且只监听 `127.0.0.1`。不要把它暴露到公网上。

---

<a id="configuration"></a>

## 配置

所有设置都是可选的。设置写在 `.env` 文件中：把 [`.env.example`](.env.example) 复制为 `.env`，然后填写你用到的项。`autotok` 会先读取你运行它的文件夹中的 `.env`，然后读取 `~/.autotok/.env`。环境中已设置的变量优先级更高，`docker compose` 也会读取同一个文件。`.env` 中包含 API 密钥，切勿提交到仓库（它已在 `.gitignore` 中）。

| 变量 | 用途 | 默认值 |
|---|---|---|
| `AUTOTOK_HOME` | 已保存的账号和设置 | `~/.autotok` |
| `AUTOTOK_VIDEOS_DIR` | 视频文件夹以及 YouTube 下载目录 | `$AUTOTOK_HOME/videos` |
| `AUTOTOK_BROWSER` | 登录/签名浏览器的运行位置：`local`、`browserbase`、`steel` | `local` |
| `AUTOTOK_BROWSER_CHANNEL` | 使用已安装的浏览器，例如 `chrome` | Playwright Chromium |
| `AUTOTOK_BROWSER_PATH` | Chrome/Chromium 可执行文件的完整路径 | Playwright Chromium |
| `BROWSERBASE_API_KEY`、`BROWSERBASE_PROJECT_ID`、`BROWSERBASE_REGION`、`BROWSERBASE_PROXY_COUNTRY` | Browserbase 设置 | — |
| `STEEL_API_KEY`、`STEEL_BASE_URL`、`STEEL_CONNECT_URL` | Steel 设置（自托管时使用 `STEEL_BASE_URL`） | Steel Cloud |

账号文件包含你的 TikTok 会话（相当于你的密码）。它们以仅所有者可访问的权限保存，请妥善保管，不要泄露。

---

<a id="upgrading-from-tiktokautouploader-1x"></a>

## 从 TiktokAutoUploader 1.x 升级

- **安装**：按照[快速上手](#getting-started)操作（`uv tool install "autotok[youtube]"`，然后运行 `autotok install-browser`）。不再需要 Node.js 和 `npm install`。
- **会话**：`CookiesDir/` 中保存的会话，在你第一次从仓库文件夹中使用时会自动迁移。参数保持不变，`python cli.py` 也仍然可用。
- **定时发布**：`-sc` 重新改为由 TikTok 端定时（15 分钟到 10 天）。1.x 的本地队列（`cli.py schedule list|cancel`）现在移到了 Web 应用的 Schedules 页面。
- **Bug 修复**：隐私、评论、合拍和拼接设置现在真正生效了。之前的版本总是公开发布，并且所有权限都是开启的。话题标签也重新可以点击了。
- **已移除**：`config.txt` 以及未使用的 ImageMagick 视频编辑辅助工具。

---

<a id="troubleshooting"></a>

## 故障排查

| 问题 | 解决方法 |
|---|---|
| `'autotok' is not recognized` / `command not found` | 运行一次 `uv tool update-shell`，然后打开一个新终端。如果你是用 pip 安装的，请改用 `python -m autotok ...` |
| `Chromium for Playwright is not installed` | `autotok install-browser`（Linux 服务器上加 `--with-deps`） |
| `TikTok rejected the session` / `session rejected` | `autotok login -n NAME --force`（可用 `autotok accounts check NAME` 检查） |
| `Invalid parameters (status_code=5)` | TikTok 修改了上传 API。请附上完整的错误信息[提交 issue](https://github.com/makiisthenes/TiktokAutoUploader/issues)。 |
| `potential violation of our Community Guidelines` | TikTok 屏蔽了这个视频的内容，这不是工具本身的错误。 |
| 登录页面拒绝登录 / 陷入验证码循环 | 试试你已安装的 Chrome：在 `.env` 中添加 `AUTOTOK_BROWSER_CHANNEL=chrome`；或者从浏览器中复制 `sessionid` cookie，然后使用 `autotok login -n NAME --sessionid ...` |
| 云端登录时出现“Verify it's really you” | TikTok 不认识云浏览器的 IP。在实时画面中完成验证（选择 Email），或者通过代理来避免；参见[云浏览器](#cloud-browsers-browserbase-steel)下的注意事项 |
| 云端登录的实时画面一片空白（自托管 Steel） | 用 `DOMAIN=localhost:3000`（它的地址）重启 steel-browser |
| `Browserbase ... (HTTP 402): Proxies are not included in the free plan` | 移除 `BROWSERBASE_PROXY_COUNTRY`，或者移除云端登录所用的账号代理，或者升级 Browserbase 套餐 |
| `No TikTok datacenter cookie saved` 警告 | 用 `autotok login` 重新登录，或者在使用 `--sessionid` 时同时传入 `--datacenter` |
| `may or may not have been posted` | 发布过程中连接断开了。重试前请先检查账号，以免重复发布。 |

另请参阅[常见问题](docs/common-problems.md)。

---

<a id="professional-software-autotok-pro"></a>

## 专业版软件（autotok Pro）

填写候补名单表单： https://forms.gle/M4KpdfruqCukQvj99

如果你需要更强大的工具，帮你更快实现目标，我提供的软件可以：

- 管理 1000 个以上的账号
- 自动把相同的视频上传到多个账号
- 为多个账号定时发布视频，可提前 20 天到 2 年
- 自动从 YouTube、X、Reddit、TikTok 获取视频素材
- 搭建从素材获取到定时上传的完整上传流水线
- 通过数据指标查看各个账号当前的表现
- 由我本人提供最长 3 个月的个性化支持，帮你解决遇到的任何问题
- 支持代理，界面简洁现代

现已开放购买。如有兴趣，请发邮件至 `michaelperes562@gmail.com`，邮件主题请写 `Tiktok Bot Software`，否则我可能会漏看你的邮件。

---

<a id="licensing"></a>

## 许可协议

autotok 采用**双重许可**：

- **开源许可**：[GNU AGPL v3.0](LICENSE)。你可以自由使用、修改和分享。如果你分发修改后的版本，或者将修改后的版本作为服务提供给他人使用，就必须以相同的许可证公开你的源代码。
- **商业许可**：如果要把 autotok 集成到闭源产品或付费服务中，而不承担 AGPL 的义务，或者要使用 autotok Pro，请联系 `michaelperes562@gmail.com`。

版权所有 © 2021–2026 Michael Peres。2.0.0 之前的版本仍沿用其发布时的许可证。随附的签名脚本属于第三方代码，详见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。欢迎按照 [CONTRIBUTING.md](CONTRIBUTING.md) 中的条款贡献代码。

---

<a id="support-this-project"></a>

## 支持本项目

如果你喜欢这个项目，欢迎通过 [Patreon](https://patreon.com/makiisthenes) 或 [Ko-Fi](https://ko-fi.com/makiperes) 支持我，或者给项目点个 Star。

- 感谢 [@DelvinBa](https://github.com/DelvinBa) 将项目更新到 TikTok 新的上传接口。（09/12/2024）

<a id="bugs-and-issues"></a>

## Bug 与问题反馈

请在 [Issues 页面](https://github.com/makiisthenes/TiktokAutoUploader/issues)报告 bug，而不是通过邮件。安全问题请改为私下报告，具体方式见 [SECURITY.md](SECURITY.md)。

<a id="notes-and-terms"></a>

## 说明与条款

本项目与 TikTok 没有任何关联。自动上传可能违反 TikTok 的服务条款，并可能导致账号受限或被封禁。请只上传你拥有相应权利的内容。使用风险自负。

<a id="star-history"></a>

## Star 历史

[![Star History 图表](https://api.star-history.com/svg?repos=makiisthenes/TiktokAutoUploader&type=Date)](https://star-history.com/#makiisthenes/TiktokAutoUploader&Date)
