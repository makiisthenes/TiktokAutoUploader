# autotok — TikTok Auto Uploader

<p align="center">
  <a href="README.md">English</a> ·
  <a href="README.zh-CN.md">简体中文</a> ·
  <a href="README.zh-TW.md">繁體中文</a> ·
  <a href="README.ja.md">日本語</a> ·
  <b>한국어</b> ·
  <a href="README.es.md">Español</a> ·
  <a href="README.pt-BR.md">Português (Brasil)</a> ·
  <a href="README.ru.md">Русский</a> ·
  <a href="README.fr.md">Français</a> ·
  <a href="README.de.md">Deutsch</a>
</p>

*이 문서는 [영어 README](README.md)를 번역한 것입니다. 두 문서의 내용이 다르면 영어 버전이 최신입니다.*

<p align="center">
  <img src="https://user-images.githubusercontent.com/52138450/111885490-04ab6680-89c0-11eb-955a-f833577b4406.png" width="35%" alt="TiktokAutoUploader 로고">
</p>

<p align="center">명령줄, Python, TypeScript, Go, PHP, Java, C#에서 TikTok 영상을 업로드하고 예약하세요. 계정마다 프록시를 따로 쓸 수 있습니다.</p>
<p align="center"><code>uv tool install autotok</code> · <code>npm install autotok</code> · 로그인은 한 번 · 업로드는 명령어 하나로</p>

<p align="center">
  <a href="https://pypi.org/project/autotok/"><img alt="PyPI" src="https://img.shields.io/pypi/v/autotok?label=pypi"></a>
  <a href="https://www.npmjs.com/package/autotok"><img alt="npm" src="https://img.shields.io/npm/v/autotok?label=npm"></a>
  <a href="#typescript-sdk"><img alt="TypeScript 타입 포함" src="https://img.shields.io/npm/types/autotok"></a>
  <a href="https://pkg.go.dev/github.com/makiisthenes/TiktokAutoUploader/go"><img alt="Go 레퍼런스" src="https://pkg.go.dev/badge/github.com/makiisthenes/TiktokAutoUploader/go.svg"></a>
  <a href="https://github.com/makiisthenes/TiktokAutoUploader/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/makiisthenes/TiktokAutoUploader/actions/workflows/ci.yml/badge.svg"></a>
  <a href="LICENSE"><img alt="라이선스: AGPL-3.0" src="https://img.shields.io/badge/license-AGPL--3.0-blue"></a>
  <a href="https://www.linkedin.com/in/michael-p-88b015200/"><img alt="LinkedIn" src="https://img.shields.io/badge/LinkedIn-0077B5?style=flat-square&logo=linkedin&logoColor=white"></a>
  <img alt="스타" src="https://img.shields.io/github/stars/makiisthenes/TiktokAutoUploader">
  <img alt="포크" src="https://img.shields.io/github/forks/makiisthenes/TiktokAutoUploader">
</p>

<p align="center">
  <a href="https://github.com/makiisthenes/TiktokAutoUploader/blob/main/docs/media/autotok-launch.mp4">
    <img src="https://raw.githubusercontent.com/makiisthenes/TiktokAutoUploader/main/docs/media/autotok-launch.webp" width="100%" alt="38초 만에 보는 autotok: 한 번만 로그인하면, 명령어 하나로 내 계정 어디에든 영상을 TikTok에 바로 올리거나 예약할 수 있습니다">
  </a>
</p>
<p align="center"><sub>영상을 클릭하면 소리와 함께 볼 수 있습니다.</sub></p>

---

<a id="install"></a>

## 설치

**명령줄과 Python**

```bash
uv tool install "autotok[youtube]"
autotok install-browser                                   # one-time browser download, about 300 MB
```

그다음 계정마다 한 번씩 로그인하고, 명령어 하나로 업로드하세요:

```bash
autotok login -n my_account                               # log in on the page that opens; the QR code is quickest
autotok upload -u my_account -v clip.mp4 -t "Hello #fyp"
```

uv가 없나요? `pipx install "autotok[youtube]"`나 `pip install "autotok[youtube]"`로도 설치할 수 있습니다.
[시작하기](#getting-started)에서 프록시와 클라우드 브라우저를 포함해 각 단계를 차례대로 안내합니다.

**TypeScript와 JavaScript (Node.js)**

```bash
npm install autotok
npx playwright install chromium                           # one-time browser download
```

```ts
import { login, uploadVideo } from "autotok";

await login("my_account");                                // once: log in on the page that opens
await uploadVideo("my_account", "clip.mp4", "Hello #fyp");
```

타입을 지원하고 Promise 기반이며 Python이 필요 없습니다. 저장된 계정도 CLI와 함께 씁니다.
[TypeScript SDK](#typescript-sdk)를 참고하세요.

**Go, 또는 따로 설치할 것이 없는 단일 바이너리**

```bash
go install github.com/makiisthenes/TiktokAutoUploader/go/cmd/autotok@latest
```

또는 [릴리스 페이지](https://github.com/makiisthenes/TiktokAutoUploader/releases)에서 내 시스템에 맞는 `autotok` 바이너리를 내려받으세요(`go/v...`로 시작하는 릴리스). 위와 같은 명령어를 그대로 쓸 수 있고, Python이나 Node.js가 필요 없으며, 컴퓨터에 이미 설치된 Chrome을 사용합니다. Go 코드에서는 `go get github.com/makiisthenes/TiktokAutoUploader/go`를 실행하세요.
[Go](#go-sdk-and-single-binary)를 참고하세요.

**PHP, Java, C#**

`autotok` 명령어를 대신 실행하고, 결과와 오류를 타입이 있는 객체로 돌려주는 작은 라이브러리입니다.
위와 같이 autotok을 설치한 다음 [PHP, Java, C#](#php-java-and-c)을 참고하세요.

---

<a id="sponsors"></a>

## 후원사

<p align="center">
  <a href="https://www.swiftproxy.net/?ref=makiisthenes">
    <img src="https://github.com/user-attachments/assets/a1d0e915-e09a-4b36-ba72-788c4cc1e709" alt="Swiftproxy — 9천만 개 이상의 레지덴셜 프록시" width="420">
  </a>
</p>

[**Swiftproxy**](https://www.swiftproxy.net/?ref=makiisthenes)는 소셜 미디어 자동화, 다중 계정 관리, 웹 자동화 워크플로를 위해 설계된 9천만 개 이상의 깨끗한 레지덴셜 프록시와 고정 레지덴셜 프록시를 제공합니다. 안정적인 연결, 전 세계를 아우르는 IP, 믿을 수 있는 프록시 인프라를 갖춘 Swiftproxy로 여러 계정을 안전하게 관리하고, IP 관련 제한을 줄이고, 자동화 작업을 확장할 수 있습니다. 레지덴셜 프록시 트래픽은 다 쓰기 전까지 만료되지 않으며, 무료 테스트도 제공합니다.

> 코드 `PROXY90` 입력 시 **10% 할인** — [Swiftproxy에서 프록시 구매하기 →](https://www.swiftproxy.net/?ref=makiisthenes)

<br>

<p align="center">
  <a href="https://termius.com/">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/makiisthenes/TiktokAutoUploader/main/docs/images/termius-logo-white.png">
      <img src="https://raw.githubusercontent.com/makiisthenes/TiktokAutoUploader/main/docs/images/termius-logo.png" alt="Termius" width="300">
    </picture>
  </a>
</p>

[**Termius**](https://termius.com/)는 안전하고 안정적이며 협업이 가능한 SSH 클라이언트를 제공합니다.

> [Termius 받기 →](https://termius.com/)

---

<a id="getting-started"></a>

## 시작하기

설정은 5분 정도면 끝납니다. 설치(1단계)를 마친 뒤 `autotok setup`을 실행하면 나머지 과정을 차례로 안내받을 수 있습니다. 브라우저를 확인하고, 프록시를 입력받아 테스트한 다음, 그 프록시를 거쳐 TikTok에 로그인합니다. 아래 단계는 같은 작업을 직접 하는 방법입니다.

<a id="1-install-autotok"></a>

### 1. autotok 설치

```bash
uv tool install "autotok[youtube]"
```

이게 전부입니다. 이제 어느 터미널에서든 `autotok` 명령어를 실행할 수 있습니다(`autotok --version`으로 확인).
uv는 autotok을 다른 Python 패키지와 분리해서 관리하며, Python이 없으면 알아서 내려받습니다.

uv가 없나요? [docs.astral.sh/uv](https://docs.astral.sh/uv/getting-started/installation/)에 있는 한 줄짜리 명령어로 설치하거나,
[pipx](https://pipx.pypa.io)를 사용하세요: `pipx install "autotok[youtube]"`.

- 나중에 업데이트하려면: `uv tool upgrade autotok`.
- 설치하지 않고 써 보려면: `uvx --from "autotok[youtube]" autotok --version`.
- Python 코드에서 autotok을 쓰나요? 프로젝트에 추가하세요: `uv add "autotok[youtube]"` 또는
  `pip install "autotok[youtube]"`.
- TypeScript나 JavaScript를 쓰나요? 대신 `npm install autotok`을 실행하고 [TypeScript SDK](#typescript-sdk)를 참고하세요.
  코드에서는 `login()`과 `uploadVideo()`가 3단계와 4단계의 명령어를 대신합니다.
- Python을 설치할 수 없거나 Go로 개발하나요? 대신 [릴리스 페이지](https://github.com/makiisthenes/TiktokAutoUploader/releases)에서 받은 `autotok` 단일 바이너리를 쓰세요.
  아래 단계는 똑같습니다. [Go](#go-sdk-and-single-binary)를 참고하세요.
- `[youtube]`는 YouTube 링크 지원을 추가합니다. 필요 없으면 빼도 됩니다.
- `autotok`이 "not recognized" 또는 "command not found"로 나오나요? `uv tool update-shell`을 한 번 실행하고
  새 터미널을 여세요.

<a id="2-choose-where-the-browser-runs"></a>

### 2. 브라우저를 실행할 위치 선택

autotok은 처음 한 번 로그인할 때와 업로드마다 서명할 때 브라우저를 사용합니다. 다음 중 하나를 고르세요:

| 옵션 | 적합한 경우 | 설정 |
|---|---|---|
| **로컬** (기본값) | 내 컴퓨터 | `autotok install-browser`로 약 300 MB를 한 번만 내려받음 |
| **클라우드** ([Browserbase](https://www.browserbase.com) 또는 [Steel](https://github.com/steel-dev/steel-browser)) | 서버, Docker, 또는 내 컴퓨터의 자원을 아끼고 싶을 때 | 설정 파일에 API 키 추가. [클라우드 브라우저](#cloud-browsers-browserbase-steel) 참고 |

새로 설치한 Linux 서버에서 로컬 브라우저를 쓰려면 root 권한으로 `autotok install-browser --with-deps`를 실행하세요.
Chromium에 필요한 시스템 라이브러리도 함께 설치됩니다.

<a id="3-log-in-to-tiktok-once-per-account"></a>

### 3. TikTok 로그인 (계정마다 한 번)

```bash
autotok login -n my_account
```

브라우저 창에 TikTok 로그인 페이지가 열립니다. 원하는 방법으로 로그인하세요. 휴대폰의 TikTok 앱으로 QR 코드를 스캔하는 방법이 가장 빠릅니다.
로그인이 끝나면 창이 저절로 닫히고 세션이 `my_account`라는 이름으로 저장됩니다. 클라우드 브라우저를 쓰는 경우에는 창 대신 열어 볼 링크가 출력됩니다.

```bash
autotok accounts check my_account     # confirms TikTok accepts the saved session
```

- 이 계정에 프록시를 쓸 예정인가요? 지금 함께 지정하면 로그인과 이후 업로드가 같은 IP를 씁니다:
  `autotok login -n my_account -p http://user:pass@host:port` ([프록시](#proxies) 참고).
- 계정마다 `-n` 이름을 다르게 해서 반복하세요.
- 세션은 `~/.autotok/accounts`에 저장됩니다. 비밀번호처럼 다루세요.

<a id="4-upload"></a>

### 4. 업로드

```bash
autotok upload -u my_account -v "C:\Videos\clip.mp4" -t "My caption #fyp"
```

끝입니다. 다른 예시:

```bash
autotok upload -u my_account -v clip.mp4 -t "Just for me" -vi 1                 # private
autotok upload -u my_account -v clip.mp4 -t "Later #fyp" -sc 3600               # publish in 1 hour
autotok upload -u my_account -yt "https://www.youtube.com/shorts/xxxxxxxxxxx" -t "Caption"
```

`-v`에는 영상 경로를 넣거나, 영상이 `~/.autotok/videos`에 있다면 파일 이름만 넣어도 됩니다. 모든 옵션은
[CLI 레퍼런스](#cli-reference)를 참고하세요.

<a id="5-optional-save-your-settings-in-a-file"></a>

### 5. 선택 사항: 설정을 파일에 저장하기

클라우드 브라우저나 그 API 키 같은 설정은 `.env` 파일에 넣습니다. autotok은 실행한 폴더를 먼저 찾아보고,
그다음 `~/.autotok/.env`를 찾습니다. 두 번째 위치는 어느 폴더에서 실행해도 적용됩니다. (이 저장소에 있는)
[`.env.example`](.env.example)를 복사하거나, 필요한 설정만 넣어서 시작하세요:

```bash
# ~/.autotok/.env   (Windows: C:\Users\<you>\.autotok\.env)
AUTOTOK_BROWSER=browserbase
BROWSERBASE_API_KEY=bb_live_...
```

<a id="where-next"></a>

### 다음 단계

| 하고 싶은 일 | 참고 |
|---|---|
| 여러 계정을 각각 다른 IP로 운영하기 | [프록시](#proxies) |
| 내 컴퓨터에서 브라우저를 실행하지 않기 | [클라우드 브라우저](#cloud-browsers-browserbase-steel) |
| Python 코드에서 업로드하기 | [Python SDK](#python-sdk) |
| TypeScript나 JavaScript에서 업로드하기 | [TypeScript SDK](#typescript-sdk) |
| Go에서 업로드하거나, Python 없이 바이너리 하나로 쓰기 | [Go](#go-sdk-and-single-binary) |
| PHP, Java, C#에서 업로드하기 | [PHP, Java, C#](#php-java-and-c) |
| AI 에이전트(Claude, Cursor...)에게 업로드 맡기기 | [MCP 서버](#mcp-server-ai-agents) |
| 스킬을 이용해 Claude Code에게 말로 요청해서 업로드하기 | [Claude Code 플러그인](#claude-code-plugin) |
| 서버나 컨테이너에서 실행하기 | [Docker](#docker) |
| 스케줄러가 있는 웹 대시보드 쓰기 | [웹 앱](#web-app-self-hosted) |
| 오류 해결하기 | [문제 해결](#troubleshooting) |

---

<a id="features"></a>

## 기능

- **명령어 하나로 업로드**: TikTok의 웹 업로드 API를 사용합니다. TikTok 웹사이트에서 일일이 클릭할 필요가 없습니다.
- **계정별 프록시**: 로그인, 요청 서명, 모든 업로드가 같은 프록시를 거치므로 각 계정은 항상 하나의 IP에서 접속하는 것으로 보입니다. HTTP(S)와 SOCKS5를 지원합니다.
- **다중 계정**: 계정마다 한 번 로그인하고, 이름으로 골라 업로드합니다.
- **예약**: TikTok 자체 예약 기능으로 15분 후부터 30일 후까지 예약할 수 있습니다(일부 계정은 TikTok이 10일로 제한합니다). 셀프 호스팅 웹 앱에는 시간 제한이 없는 스케줄러가 추가로 있습니다.
- **게시물 설정**: 공개 또는 비공개, 그리고 댓글, 듀엣, 스티치, AI 생성 라벨을 켜거나 끌 수 있습니다.
- **클릭할 수 있는 해시태그와 @멘션**, 이모지도 문제없이 처리합니다.
- **YouTube 링크**는 [yt-dlp](https://github.com/yt-dlp/yt-dlp)로 자동으로 내려받습니다.
- **Python SDK, CLI, 선택 사항인 웹 앱**(Docker)을 제공하며, 웹 앱에서는 브라우저로 로그인할 수 있습니다.
- npm으로 배포되는 **TypeScript SDK**(`npm install autotok`): 타입이 완전히 지정되어 있고, Promise 기반이며, Python이 필요 없고,
  저장된 계정을 CLI와 함께 씁니다.
- **Go 패키지와 단일 바이너리**: 라이브러리를 `go get`으로 받거나, Python이나 Node.js 없이 동작하는 `autotok` 실행 파일 하나를
  내려받으세요. 저장된 계정을 다른 패키지와 함께 씁니다.
- **PHP, Java, C# 라이브러리**: `autotok` 명령어를 실행하고 결과와 오류를 타입이 있는 객체로 돌려주며,
  다른 의존성이 없습니다.
- **MCP 서버**: AI 에이전트(Claude, Cursor, VS Code...)가 대신 업로드하고 예약할 수 있습니다.
- **Claude Code 플러그인**: TikTok 업로드 스킬이 들어 있습니다. 평소 말투로 요청하면 게시하기 전에
  한 번 더 확인합니다.
- **클라우드 브라우저**: 로그인과 서명에 쓰는 브라우저를 내 컴퓨터 대신 [Browserbase](https://www.browserbase.com)나 [Steel](https://github.com/steel-dev/steel-browser)(클라우드 또는 셀프 호스팅)에서 실행합니다.
- **Docker 이미지**로 서버에서 CLI를 실행할 수 있습니다.
- Python 패키지는 **Node.js가 필요 없습니다**: TikTok의 요청 서명은 헤드리스 Chromium에서 계산합니다.

---

<a id="proxies"></a>

## 프록시

여러 계정을 IP 하나로 운영하면 가장 빨리 TikTok의 감시 대상이 됩니다. autotok에서는 계정마다 별도의 프록시를 지정할 수 있고,
그 계정이 TikTok과 통신하는 **모든 곳**에서 그 프록시를 사용합니다:

| 단계 | 계정 프록시 경유 여부 |
|---|---|
| 로그인 브라우저(`autotok login`, 웹 앱 로그인) | ✅ |
| 서명 페이지 가져오기 | ✅ (서명 브라우저 자체는 네트워크 요청을 보내지 않음) |
| 업로드 API 호출과 영상 전송 | ✅ |
| YouTube 다운로드 | ❌ (TikTok 트래픽이 아니므로 프록시 대역폭을 아낌) |

**프록시 설정, 변경, 테스트**

`autotok setup`은 프록시를 입력받아 테스트한 다음 그 프록시를 거쳐 로그인합니다. 직접 하려면:

```bash
autotok login -n alice -p http://user:pass@gate.example.com:7000   # set at login
autotok proxy set alice socks5://user:pass@gate.example.com:1080     # set or change later
autotok proxy test -u alice                                          # shows the IP TikTok will see
autotok proxy clear alice                                            # go direct
autotok accounts list                                                # every account and its proxy (passwords hidden)

autotok upload -u alice -v clip.mp4 -t "hi" -p http://other:pass@host:8000   # one-off override
autotok upload -u alice -v clip.mp4 -t "hi" --no-proxy                       # ignore the saved proxy once
```

**지원하는 형식** (스킴을 생략하면 `http`)

```
http://user:pass@host:port      https://user:pass@host:port
socks5://user:pass@host:port    host:port
user:pass@host:port             host:port:user:pass      ← the export format most providers use
```

**팁**

- **레지덴셜 또는 모바일** 프록시를 계정마다 하나씩, **스티키 세션**(몇 시간 동안 같은 IP 유지)으로 쓰세요.
  요청할 때마다 IP가 바뀌는 프록시를 쓰면 로그인된 세션이 탈취된 것처럼 보입니다.
- 업로드할 때 쓸 **프록시를 거쳐** 로그인하세요(`autotok login -p ...`). 집에서 로그인하고 프록시로
  업로드하면 TikTok이 그 불일치를 알아챌 수 있습니다.
- Chromium은 사용자 이름과 비밀번호가 필요한 SOCKS5 프록시를 쓸 수 없습니다. 로그인 단계에서는
  프록시 업체의 HTTP 엔드포인트를 쓰세요(업로드는 둘 다 됩니다).
- 비밀번호는 절대 출력되지 않습니다. CLI와 웹 앱에서는 다음과 같이 표시됩니다: `http://user:****@host:port`.

프록시가 필요한가요? [후원사](#sponsors)를 확인해 보세요.

---

<a id="cloud-browsers-browserbase-steel"></a>

## 클라우드 브라우저 (Browserbase, Steel)

autotok은 두 군데에서 브라우저가 필요합니다. 처음 한 번 하는 **로그인**, 그리고 업로드마다 하는 **서명**입니다(TikTok의
봇 방지 서명은 브라우저 페이지 안에서 계산됩니다). 기본값은 내 컴퓨터의 Chromium입니다.
`AUTOTOK_BROWSER`를 설정하면 대신 클라우드에서 실행합니다. 그러면 로컬에 아무것도 설치하거나 띄울 필요가
없어서 서버와 Docker에 잘 맞습니다.

| `AUTOTOK_BROWSER` | 브라우저 실행 위치 | 설정 |
|---|---|---|
| `local` (기본값) | 이 컴퓨터의 Chromium | `autotok install-browser` 한 번 실행 |
| `browserbase` | [Browserbase](https://www.browserbase.com) | `BROWSERBASE_API_KEY` (선택: `BROWSERBASE_PROJECT_ID`, `BROWSERBASE_REGION`) |
| `steel` | [Steel Cloud](https://steel.dev), 또는 직접 운영하는 [steel-browser](https://github.com/steel-dev/steel-browser) 서버 | 클라우드: `STEEL_API_KEY`. 셀프 호스팅: `STEEL_BASE_URL`(예: `http://localhost:3000`) |

설정은 `.env` 파일에 넣으세요([`.env.example`](.env.example)를 복사해서 시작):

```bash
AUTOTOK_BROWSER=browserbase
BROWSERBASE_API_KEY=bb_live_...
```

그다음 평소처럼 autotok을 쓰면 됩니다:

```bash
autotok browser check                 # starts a session and shows the IP it browses from
autotok login -n alice -p http://user:pass@gate.example.com:7000
autotok upload -u alice -v clip.mp4 -t "Hello #fyp"
```

명령어마다 지정할 수도 있습니다: `autotok --browser steel login -n alice`.

**로그인:** `autotok login`은 라이브 뷰 링크를 출력하고 평소 쓰는 브라우저로 엽니다. 그 페이지에서
TikTok에 로그인하세요. 로그인되는 즉시 세션이 저장되고 클라우드 브라우저는 닫힙니다.

**셀프 호스팅 Steel**은 무료 오픈 소스입니다:

```bash
docker run -p 3000:3000 -e DOMAIN=localhost:3000 ghcr.io/steel-dev/steel-browser
```

`.env`에는 다음을 넣습니다:

```bash
AUTOTOK_BROWSER=steel
STEEL_BASE_URL=http://localhost:3000
```

`DOMAIN`에는 서버에 접속하는 주소를 지정하세요. 지정하지 않으면 steel-browser가 브라우저에게
`0.0.0.0`으로 연결하라고 알려 주기 때문에 라이브 뷰가 빈 화면으로 남아 로그인할 수 없습니다. autotok은 이 상황을
발견하면 경고합니다. 셀프 호스팅 steel-browser는 한 번에 세션 하나만 실행합니다.

알아 두면 좋은 점:

- **클라우드 로그인에는 계정 프록시를 쓰세요.** 계정의 프록시가 클라우드 로그인 세션에도 적용되므로
  TikTok은 로그인과 업로드에서 같은 IP를 보게 됩니다. 프록시가 없으면 TikTok 입장에서는 로그인은 클라우드 업체의 IP에서,
  업로드는 내 IP에서 들어온 것으로 보입니다.
- 로그인 후 **"Verify it's really you"**(본인 확인)가 뜬다면 TikTok이 데이터센터 IP에서 낯선 기기를 감지했다는 뜻입니다.
  라이브 뷰에서 인증을 마칠 수도 있지만, 아예 피하는 편이 낫습니다. 계정 프록시를 쓰거나, Browserbase 유료 플랜이라면
  `BROWSERBASE_PROXY_COUNTRY=GB`(내 국가)를 설정해 그 나라의 가정용 IP로 로그인하세요. 무료 플랜에서는
  `BROWSERBASE_REGION`을 가장 가까운 리전(예: `eu-central-1`)으로 설정하면 최소한 미국에서 로그인하는 일은 피할 수 있습니다.
- 라이브 뷰에는 TikTok 탭만 보이므로, 클라우드 로그인 중에는 autotok이 "Continue with Google" 같은 팝업을 닫습니다.
  대신 QR 코드, 이메일/사용자 이름, 전화번호로 로그인하세요.
- Browserbase는 HTTP/HTTPS 프록시만 지원하며, 사용자 지정 프록시를 쓰려면 Developer 플랜 이상이 필요합니다.
  Steel Cloud에서도 사용자 지정 프록시에는 유료 플랜이 필요할 수 있습니다.
- 클라우드에서 실행되는 것은 브라우저뿐입니다. 영상 파일은 여전히 내 컴퓨터에서 (계정 프록시를 거쳐)
  TikTok으로 바로 전송되므로 클라우드 사용량은 적습니다. 로그인 한 번, 업로드 한 번마다 짧은 세션
  하나씩만 씁니다.
- 다른 업체를 쓰고 싶나요? `autotok.browsers.CloudProvider`를 상속한 클래스를 만들고
  `autotok.browsers.register_provider("name", YourProvider)`를 호출하세요.

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

브라우저에서 가져온 `sessionid` 쿠키가 이미 있나요? 로그인 창을 건너뛰세요:

```python
autotok.import_session("alice", "<sessionid value>", datacenter="<tt-target-idc value>")
```

---

<a id="typescript-sdk"></a>

## TypeScript SDK

같은 업로더를 TypeScript와 JavaScript용으로 npm에서 [`autotok`](https://www.npmjs.com/package/autotok)이라는 이름으로 제공합니다.
Node.js 22.12 이상에서 동작하고, 타입이 포함되어 있으며, Python이 필요 없습니다. 같은
`~/.autotok/accounts`를 읽고 쓰기 때문에 CLI로 로그인한 계정을 TypeScript에서도 쓸 수 있고,
그 반대도 마찬가지입니다.

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

- 옵션, 결과, 모든 오류 클래스까지 에디터에서 전부 타입이 지원됩니다.
- 영상은 경로, `~/.autotok/videos` 안의 파일 이름, 또는 영상 바이트(`Buffer`/`Uint8Array`)로 넘길 수 있습니다.
- ES 모듈과 CommonJS(`require("autotok")`)에서 모두 동작하고, TypeScript의 `nodenext`,
  `node20`, `bundler` 설정에서도 동작합니다.
- 프록시, 클라우드 브라우저(`AUTOTOK_BROWSER`), 설정 변수, `.env` 파일은 이 README에서 설명한 대로
  동작합니다. `.env`를 읽으려면 `loadEnv()`를 호출하세요.
- `sessionid` 쿠키가 이미 있나요? `await importSession("alice", "<sessionid>", { datacenter: "<tt-target-idc>" })`.

전체 API는 [`js/README.md`](js/README.md)에 있습니다. CLI, YouTube 링크, MCP 서버,
웹 앱은 Python 패키지에 들어 있습니다.

---

<a id="go-sdk-and-single-binary"></a>

## Go SDK와 단일 바이너리

autotok은 Go 모듈로도 제공되며, Python이나 Node.js 없이 동작하는 `autotok` 바이너리 하나로 빌드됩니다.
이 바이너리는 Python CLI와 명령어, 플래그가 같습니다. TypeScript 패키지처럼
같은 `~/.autotok/accounts`를 읽고 쓰므로 계정을 어디서든 쓸 수 있습니다.

```bash
go install github.com/makiisthenes/TiktokAutoUploader/go/cmd/autotok@latest   # or download a release binary
autotok login -n my_account
autotok upload -u my_account -v clip.mp4 -t "Hello #fyp"
```

로그인과 서명에는 컴퓨터에 이미 설치된 Chrome, Chromium, Edge를 쓰거나, 다른 패키지가 설치해 둔
Playwright의 Chromium을 씁니다. 둘 다 없는 컴퓨터라면 `autotok install-browser`를 실행하세요.
Chrome for Testing을 내려받습니다(약 200 MB, 한 번만).

Go 코드에서 쓰기(Go 1.26 이상):

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

- 모든 호출이 `context.Context`를 받으므로 업로드를 취소하거나 기한을 정할 수 있습니다.
- 오류에는 타입이 있어서(`*autotok.PublishError`, `*autotok.UploadError`...) `errors.As`로 구분할 수 있습니다.
- 프록시와 클라우드 브라우저(`AUTOTOK_BROWSER`)는 이 README에서 설명한 대로 동작합니다. 로그인
  브라우저는 비밀번호가 필요한 SOCKS5 프록시에서도 동작합니다.
- YouTube 링크는 [yt-dlp](https://github.com/yt-dlp/yt-dlp)가 설치되어 있으면 동작합니다. 설정
  마법사, 셸, MCP 서버는 Python 패키지에만 있습니다.

전체 API는 [`go/README.md`](go/README.md)와
[pkg.go.dev](https://pkg.go.dev/github.com/makiisthenes/TiktokAutoUploader/go)에서 볼 수 있습니다.

---

<a id="php-java-and-c"></a>

## PHP, Java, C#

PHP, Java, .NET용 작은 라이브러리가 `autotok` 명령어(Python 패키지 또는 Go 바이너리)를 대신 실행하고,
그 응답을 객체와 타입이 있는 오류로 바꿔 줍니다. 저장된 계정과 프록시를 그대로 쓰며,
다른 것은 필요 없습니다. autotok을 설치하고 `autotok login -n alice`로 한 번 로그인한 다음:

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

- 세 라이브러리 모두 CLI와 같은 게시물 설정(예약, 공개 범위, 댓글, 듀엣, 스티치, AI 라벨, 프록시)을 지원하고,
  계정 목록을 보거나 확인할 수 있으며, autotok 오류의 `type`과 `retryable`을 담은 예외 타입 하나를 던집니다.
  그래서 다시 시도해도 두 번 게시될 일이 없는 경우를 알 수 있습니다.
- [`--json`](#json-output)과 `--title-file`을 지원하는 autotok이 필요합니다. Python 패키지는 2.1.0 이후,
  Go 바이너리는 0.1.0 이후 버전입니다. 이 버전들이 릴리스되기 전까지는 이 저장소에서 autotok을 설치하세요:
  `uv tool install "autotok[youtube] @ git+https://github.com/makiisthenes/TiktokAutoUploader"`.
- 아직 Packagist, Maven Central, NuGet에는 올라가 있지 않습니다. 이 저장소에서 추가하는 방법은 각 README에
  있습니다.
- 다른 언어에서도 같은 방식을 쓸 수 있습니다. `autotok --json upload ...`를 실행하고 한 줄짜리
  [JSON](#json-output)을 읽으면 됩니다.

---

<a id="mcp-server-ai-agents"></a>

## MCP 서버 (AI 에이전트)

autotok에는 [MCP](https://modelcontextprotocol.io) 서버가 들어 있어서 Claude, Cursor, VS Code 같은 AI 에이전트가
대신 영상을 업로드하고 예약할 수 있습니다. CLI와 같은 저장된 계정을 사용합니다.

```bash
uv tool install "autotok[youtube,mcp]"    # or: pip install "autotok[youtube,mcp]"
```

**Claude Code**

```bash
claude mcp add autotok -- autotok mcp
```

**Claude Desktop, Cursor 및 기타 클라이언트**: 클라이언트의 MCP 설정(`claude_desktop_config.json`, `.cursor/mcp.json` 등)에
다음을 추가하세요:

```json
{
  "mcpServers": {
    "autotok": { "command": "autotok", "args": ["mcp"] }
  }
}
```

클라이언트가 `autotok`을 찾지 못하면 `which autotok`(Windows: `where autotok`)이 출력하는
전체 경로를 쓰세요. 그다음 이렇게 요청해 보세요: *"clip.mp4를 my_account에 'Hello #fyp' 캡션으로 올리고,
내일 오후 6시로 예약해 줘."*

| 도구 | 하는 일 |
|---|---|
| `list_accounts` | 저장된 계정과 각 계정의 로그인 여부, 프록시(마스킹됨)를 보여 줍니다 |
| `check_account` | 계정의 세션이 아직 유효한지 TikTok에 확인합니다 |
| `list_videos` | 영상 폴더에 있는 파일을 보여 줍니다 |
| `upload_video` | 파일이나 YouTube 링크를 업로드합니다. 바로 게시하거나 15분~30일 후로 예약할 수 있으며, 게시물 설정은 CLI와 같습니다 |
| `login`, `login_status` | 로그인을 시작합니다. 열리는 브라우저 창(또는 클라우드 브라우저가 주는 링크)에서 마무리하면 됩니다 |
| `set_proxy`, `test_proxy` | 계정의 프록시를 저장하거나 제거하고, TikTok이 보게 될 IP를 보여 줍니다 |

- **세션은 내 컴퓨터에만 남습니다.** 도구는 쿠키를 절대 반환하지 않으며, 프록시 비밀번호는
  마스킹됩니다.
- **모든 업로드는 실제 게시물입니다.** 대부분의 클라이언트는 도구를 호출할 때마다 확인을 요청합니다.
  `upload_video`에는 이 확인을 켜 두세요. 게시물이 *존재할 수도, 존재하지 않을 수도 있다*고 알리는 업로드 오류는
  에이전트에게 재시도하지 말라고 알려 주므로, 같은 게시물이 두 번 올라가지 않습니다.
- **타임아웃이 나도 중복 게시되지 않습니다.** 클라이언트가 오래 걸리는 업로드를 기다리다 포기하고
  같은 계정, 영상, 캡션으로 `upload_video`를 다시 호출하면, 두 번째 게시물이 올라가는 대신 첫 번째 업로드의 결과를
  받습니다. 진행 상황 알림을 지원하는 클라이언트는 그동안 계속 기다립니다.
- **Streamable HTTP**: `autotok mcp --http`를 실행하면 다음 주소에서 서버가 열립니다: `http://127.0.0.1:8000/mcp` (바꾸려면 `--host`,
  `--port`). 인증 기능이 없으니 localhost에서만 쓰거나, 직접 구성한 인증 뒤에 두세요.

---

<a id="claude-code-plugin"></a>

## Claude Code 플러그인

`tiktok-upload` 스킬이 들어 있는 [Claude Code](https://code.claude.com)용 플러그인입니다.
말로 요청해서 업로드할 수 있습니다:

> ~/Videos/clip.mp4를 my_account에 "Behind the scenes 🎬 #fyp" 캡션으로 내일 오후 6시에 올려 줘.

```
/plugin marketplace add makiisthenes/TiktokAutoUploader
/plugin install autotok@autotok
```

이 스킬은 `autotok` 명령어를 실행하므로 먼저 [autotok을 설치](#install)하고 로그인하세요. 스킬은
계정을 고르고(또는 브라우저 창으로 새 계정에 로그인하고), 게시하기 전에 계정, 영상, 캡션, 시간을 보여 주며
확인을 받은 다음, 업로드하고 오류가 나면 그 내용을 설명해 줍니다. 계정 목록 보기 같은 읽기 전용 명령어만
권한 확인 없이 실행됩니다. TikTok에 도달했는지 알 수 없는 업로드는 절대 재시도하지 않으므로
두 번 게시되는 일이 없습니다. 직접 실행할 수도 있습니다:
`/autotok:tiktok-upload clip.mp4 "Hello #fyp"`.

플러그인 없이 스킬만 쓰는 방법을 포함한 자세한 내용은 [`claude-plugin/README.md`](claude-plugin/README.md)에
있습니다.

---

<a id="cli-reference"></a>

## CLI 레퍼런스

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

업로드 옵션:

| 플래그 | 설명 | 기본값 |
|---|---|---|
| `-u` / `--user` | 저장된 계정 이름 | *필수* |
| `-v` / `--video` | 영상 파일(경로 또는 영상 폴더 안의 파일 이름) | — |
| `-yt` / `--youtube` | 내려받아 업로드할 YouTube URL | — |
| `-t` / `--title` | 캡션, 최대 2200자 | *필수* (또는 `--title-file`) |
| `--title-file` | UTF-8 텍스트 파일에서 캡션을 읽음. `-`를 주면 stdin에서 읽음 | — |
| `-sc` / `--schedule` | 지금부터 지정한 초만큼 뒤에 게시(900–2592000, 일부 계정은 864000까지만 허용) | 바로 게시 |
| `-vi` / `--visibility` | `0` 공개, `1` 비공개 | `0` |
| `-ct` / `--comment` | 댓글 허용(`0`/`1`) | `1` |
| `-d` / `--duet` | 듀엣 허용(`0`/`1`) | `0` |
| `-st` / `--stitch` | 스티치 허용(`0`/`1`) | `0` |
| `-ai` / `--ailabel` | AI 생성 콘텐츠로 표시(`0`/`1`) | `0` |
| `-p` / `--proxy` | 이번 업로드에만 쓸 프록시 | 계정의 프록시 |
| `--no-proxy` | 계정에 저장된 프록시 무시 | — |

이 저장소의 `python cli.py ...`도 여전히 동작하며 `autotok ...`과 같습니다.

<a id="json-output"></a>

### JSON 출력

스크립트나 다른 언어에서 쓸 수 있도록, `--json`을 붙이면 `upload`와 `accounts`가 텍스트 대신 한 줄짜리 JSON을
stdout에 출력합니다. 로그는 그대로 stderr로 나갑니다. [PHP, Java, C# 라이브러리](#php-java-and-c)가
이 기능을 사용합니다.

```bash
autotok --json upload -u alice -v clip.mp4 -t "Hello #fyp"
```

| 명령어 | 출력 |
|---|---|
| `upload` | `{"video_id": "...", "creation_id": "...", "scheduled_for": "2026-11-02T18:30:00Z"}` (바로 게시하면 `null`) |
| `accounts list` | `{"accounts": [{"name": "alice", "session": true, "proxy": "http://user:****@host:port"}]}` |
| `accounts check NAME` | `{"name": "alice", "session_ok": true}` (`false`이면 종료 상태 1) |
| `accounts remove NAME` | `{"name": "alice", "removed": true}` (`false`이면 종료 상태 1) |

오류가 나면 `{"error": {"type": "PublishError", "message": "...", "retryable": false}}`를 출력하고, 종료 상태는
평소와 같습니다(잘못된 입력이면 2). `type`은 오류의 클래스 이름으로,
`ValidationError`, `AccountNotFoundError`, `PublishError`, `PublishUncertainError` 등이 있습니다. `retryable`은
TikTok의 게시 단계에 아무것도 도달하지 않았을 때만 `true`이므로, 이때는 명령어를 다시 실행해도 두 번
게시될 수 없습니다. `PublishError`에는 TikTok의 `status_code`와 `status_msg`도 들어 있습니다.
단, 명령이 실행되기 전에 인자 파서가 잡아내는 실수(알 수 없는 옵션, 빠진 계정 이름 등)는 JSON 대신 stderr에 사용법을 출력하고 종료 상태 2로 끝납니다. 따라서 JSON이 아닌 출력도 오류로 처리하세요.

---

<a id="docker"></a>

## Docker

저장소에 있는 `Dockerfile`로 Chromium이 포함된 CLI를 빌드합니다:

```bash
docker build -t autotok .

docker run --rm -it -v autotok-data:/data autotok accounts list
docker run --rm -it -v autotok-data:/data -v "$PWD/videos:/data/videos" \
  autotok upload -u alice -v clip.mp4 -t "Hello #fyp"
```

저장된 계정은 `/data`에 있으므로 볼륨으로 유지하세요. 컨테이너에는 화면이 없으니
[클라우드 브라우저](#cloud-browsers-browserbase-steel)로 로그인하고 출력되는 링크를 여세요:

```bash
docker run --rm -it -v autotok-data:/data \
  -e AUTOTOK_BROWSER=browserbase -e BROWSERBASE_API_KEY=bb_live_... \
  autotok login -n alice -p http://user:pass@gate.example.com:7000
```

`login --sessionid ... --datacenter ...`로 내 브라우저의 세션 쿠키를 저장할 수도 있습니다.

모든 작업에 클라우드 브라우저를 쓰나요? 로컬 Chromium 없이 빌드하면 이미지가 훨씬 작아집니다:
`docker build --build-arg INSTALL_BROWSER=false -t autotok:slim .`

---

<a id="web-app-self-hosted"></a>

## 웹 앱 (셀프 호스팅)

계정, 프록시, 영상 라이브러리, 업로드, 스케줄러를 갖춘 로컬 제어판이며, 로그인용 가상 브라우저도
들어 있습니다. Docker가 필요합니다.

```bash
git clone https://github.com/makiisthenes/TiktokAutoUploader.git
cd TiktokAutoUploader
docker compose up --build
```

<http://localhost:3000>을 여세요. API 문서는 <http://localhost:8000/docs>에 있습니다.

- **계정(Accounts)**: 내장 가상 브라우저로 로그인해서(프록시는 선택 사항) 계정을 추가한 다음,
  계정마다 프록시를 설정, 변경, 테스트하고 세션을 확인합니다.
- **업로드(Upload)**: 파일을 끌어다 놓거나, 라이브러리에서 고르거나, YouTube 링크를 붙여 넣으세요. 바로 게시하거나
  원하는 시간으로 예약할 수 있습니다.
- **예약(Schedules)**: 스케줄러는 TikTok에 아무것도 도달하기 전에 일어난 실패만 재시도하므로,
  작업이 두 번 게시될 수 없습니다. 게시 도중 끊긴 작업은 *may already be posted*(이미 게시되었을 수 있음)로
  표시되며, 이 작업을 재시도하면 먼저 TikTok을 확인하라는 안내가 나옵니다.

데이터는 `./data`에 저장됩니다. CLI로 로그인한 계정을 쓰려면 그 파일을 앱의 저장소에 복사하고
Accounts 페이지에서 **Import from disk**를 클릭하세요:

```bash
mkdir -p data/autotok/accounts && cp ~/.autotok/accounts/my_account.json data/autotok/accounts/
```

(Linux에서는 컨테이너가 쓴 파일의 소유자가 root가 되므로, 웹 앱에서 관리할 계정은 웹 앱의 로그인 기능으로
추가하세요.)

업로드 서명을 클라우드 브라우저로 하려면 `AUTOTOK_BROWSER`와 관련 설정([클라우드 브라우저](#cloud-browsers-browserbase-steel)
참고)을 `docker-compose.yml` 옆의 `.env` 파일에 넣으세요.
웹 앱에서 로그인할 때는 여전히 내장 가상 브라우저를 씁니다.

API를 직접 호출하는 스크립트는 `POST`/`PATCH`/`DELETE` 요청에 `X-Requested-With: autotok` 헤더를
보내야 합니다. 다른 웹 페이지가 로컬 API를 쓰지 못하게 막기 위해서입니다.
또한 API는 `localhost`와 `127.0.0.1`로 들어온 요청에만 응답합니다. 다른 이름으로 앱에 접속한다면
(예: 직접 구성한 리버스 프록시 뒤에서) `.env`에 추가하세요: `AUTOTOK_ALLOWED_HOSTS=tiktok.home.lan`.

> 웹 앱에는 자체 로그인 기능이 없고 `127.0.0.1`에서만 연결을 받습니다. 인터넷에 노출하지
> 마세요.

---

<a id="configuration"></a>

## 설정

모든 설정은 선택 사항입니다. 설정은 `.env` 파일에 넣습니다. [`.env.example`](.env.example)를 `.env`로 복사하고
쓰는 항목만 채우면 됩니다. `autotok`은 실행한 폴더의 `.env`를 먼저 읽고, 그다음
`~/.autotok/.env`를 읽습니다. 환경에 이미 설정된 변수가 우선하며, `docker compose`도
같은 파일을 읽습니다. `.env`에는 API 키가 들어 있으니 절대 커밋하지 마세요(`.gitignore`에 포함되어 있습니다).

| 변수 | 용도 | 기본값 |
|---|---|---|
| `AUTOTOK_HOME` | 저장된 계정과 설정 | `~/.autotok` |
| `AUTOTOK_VIDEOS_DIR` | 영상 폴더 및 YouTube 다운로드 위치 | `$AUTOTOK_HOME/videos` |
| `AUTOTOK_BROWSER` | 로그인/서명 브라우저 실행 위치: `local`, `browserbase`, `steel` | `local` |
| `AUTOTOK_BROWSER_CHANNEL` | 설치된 브라우저 사용(예: `chrome`) | Playwright Chromium |
| `AUTOTOK_BROWSER_PATH` | Chrome/Chromium 바이너리의 전체 경로 | Playwright Chromium |
| `BROWSERBASE_API_KEY`, `BROWSERBASE_PROJECT_ID`, `BROWSERBASE_REGION`, `BROWSERBASE_PROXY_COUNTRY` | Browserbase 설정 | — |
| `STEEL_API_KEY`, `STEEL_BASE_URL`, `STEEL_CONNECT_URL` | Steel 설정(셀프 호스팅은 `STEEL_BASE_URL`) | Steel Cloud |

계정 파일에는 TikTok 세션(비밀번호와 같은 수준의 정보)이 들어 있습니다. 소유자만 접근할 수 있는
권한으로 저장되니 다른 사람에게 노출되지 않게 관리하세요.

---

<a id="upgrading-from-tiktokautouploader-1x"></a>

## TiktokAutoUploader 1.x에서 업그레이드하기

- **설치:** [시작하기](#getting-started)를 따라 하세요(`uv tool install "autotok[youtube]"`를 실행한 다음 `autotok install-browser`). 이제 Node.js와 `npm install`은 필요 없습니다.
- **세션:** `CookiesDir/`에 저장된 세션은 저장소 폴더에서 처음 사용할 때 자동으로
  마이그레이션됩니다. 플래그는 그대로이고, `python cli.py`도 여전히 동작합니다.
- **예약:** `-sc`는 다시 TikTok 측에서 예약합니다(15분~10일). 1.x의 로컬
  대기열(`cli.py schedule list|cancel`)은 이제 웹 앱의 Schedules 페이지로 옮겨졌습니다.
- **버그 수정:** 공개 범위, 댓글, 듀엣, 스티치 설정이 이제 실제로 적용됩니다. 이전
  버전은 항상 모든 것을 허용한 채 공개로 게시했습니다. 해시태그도 다시 클릭할 수 있습니다.
- **제거됨:** `config.txt`와 쓰이지 않던 ImageMagick 영상 편집 헬퍼.

---

<a id="troubleshooting"></a>

## 문제 해결

| 문제 | 해결 방법 |
|---|---|
| `'autotok' is not recognized` / `command not found` | `uv tool update-shell`을 한 번 실행하고 새 터미널을 여세요. uv 대신 pip로 설치했다면 `python -m autotok ...`을 쓰세요 |
| `Chromium for Playwright is not installed` | `autotok install-browser` (Linux 서버에서는 `--with-deps` 추가) |
| `TikTok rejected the session` / `session rejected` | `autotok login -n NAME --force` (`autotok accounts check NAME`으로 확인) |
| `Invalid parameters (status_code=5)` | TikTok이 업로드 API를 변경했습니다. 전체 오류 내용과 함께 [이슈를 열어](https://github.com/makiisthenes/TiktokAutoUploader/issues) 주세요. |
| `potential violation of our Community Guidelines` | TikTok이 해당 영상의 콘텐츠를 차단한 것으로, 도구의 오류가 아닙니다. |
| 로그인 페이지에서 로그인이 거부되거나 캡차가 계속 반복됨 | 설치된 Chrome을 써 보세요. `.env`에 `AUTOTOK_BROWSER_CHANNEL=chrome`을 추가하거나, 브라우저에서 `sessionid` 쿠키를 복사해 `autotok login -n NAME --sessionid ...` 명령으로 로그인하세요 |
| 클라우드 로그인 중 "Verify it's really you"(본인 확인)가 뜸 | TikTok이 클라우드 브라우저의 IP를 알아보지 못한 것입니다. 라이브 뷰에서 인증을 마치거나(Email 선택), 프록시로 피할 수 있습니다. [클라우드 브라우저](#cloud-browsers-browserbase-steel)의 참고 사항을 보세요 |
| 클라우드 로그인 라이브 뷰가 빈 화면임(셀프 호스팅 Steel) | `DOMAIN=localhost:3000`(서버 주소)으로 steel-browser를 다시 시작하세요 |
| `Browserbase ... (HTTP 402): Proxies are not included in the free plan` | `BROWSERBASE_PROXY_COUNTRY`를 제거하거나, 클라우드 로그인에 쓰는 계정 프록시를 제거하거나, Browserbase 플랜을 업그레이드하세요 |
| `No TikTok datacenter cookie saved` 경고 | `autotok login`으로 다시 로그인하거나, `--sessionid`와 함께 `--datacenter`를 지정하세요 |
| `may or may not have been posted` | 게시 중에 연결이 끊겼습니다. 중복 게시를 피하려면 재시도하기 전에 계정을 확인하세요. |

[자주 발생하는 문제](docs/common-problems.md)도 참고하세요.

---

<a id="professional-software-autotok-pro"></a>

## 전문가용 소프트웨어 (autotok Pro)

대기자 명단 신청서 작성: https://forms.gle/M4KpdfruqCukQvj99

목표에 더 빨리 도달할 수 있는 더 강력한 도구를 찾고 있다면, 다음 기능을 갖춘 소프트웨어를 제공합니다:

- 1000개 이상의 계정 관리
- 동일한 영상을 여러 계정에 자동으로 업로드
- 여러 계정의 영상을 20일부터 2년 앞까지 예약
- YouTube, X, Reddit, TikTok에서 영상을 자동으로 수집
- 영상 수집부터 업로드 일정까지 이어지는 업로드 파이프라인 구성
- 각 계정의 현재 성과를 확인할 수 있는 지표
- 겪을 수 있는 모든 문제에 대해 최대 3개월간 제가 직접 제공하는 맞춤 지원
- 프록시 지원, 깔끔하고 현대적인 UI

구매할 수 있습니다. 관심이 있다면 제목을 `Tiktok Bot Software`로 해서 `michaelperes562@gmail.com`으로 이메일을 보내 주세요. 제목이 다르면 메일을 놓칠 수 있습니다.

---

<a id="licensing"></a>

## 라이선스

autotok은 **듀얼 라이선스**로 제공됩니다:

- **오픈 소스:** [GNU AGPL v3.0](LICENSE). 자유롭게 사용, 수정, 공유할 수 있습니다. 수정한 버전을
  배포하거나 다른 사람을 위한 서비스로 운영한다면, 소스 코드를 같은 라이선스로 공개해야 합니다.
- **상용:** AGPL 의무 없이 autotok을 비공개 소스 제품이나 유료 서비스에 포함하려면, 또는 autotok Pro를
  쓰려면 `michaelperes562@gmail.com`으로 연락하세요.

Copyright © 2021–2026 Michael Peres. 2.0.0 이전 릴리스는 배포 당시의 라이선스를 그대로 따릅니다.
함께 들어 있는 서명 스크립트는 서드파티 코드입니다.
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)를 참고하세요. 기여는
[CONTRIBUTING.md](CONTRIBUTING.md)의 조건에 따라 언제든 환영합니다.

---

<a id="support-this-project"></a>

## 프로젝트 후원하기

이 프로젝트가 마음에 든다면 [Patreon](https://patreon.com/makiisthenes)이나 [Ko-Fi](https://ko-fi.com/makiperes)로 후원하거나, 프로젝트에 스타를 눌러 주세요.

- TikTok의 새 업로드 엔드포인트로 업데이트해 준 [@DelvinBa](https://github.com/DelvinBa)님께 감사드립니다. (09/12/2024)

<a id="bugs-and-issues"></a>

## 버그 및 이슈

버그는 이메일 대신 [issues 탭](https://github.com/makiisthenes/TiktokAutoUploader/issues)에 제보해 주세요.
보안 문제는 [SECURITY.md](SECURITY.md)에 설명된 대로 비공개 신고로 알려 주세요.

<a id="notes-and-terms"></a>

## 참고 사항 및 약관

이 프로젝트는 TikTok과 관련이 없습니다. 업로드를 자동화하면 TikTok 서비스 약관을 위반할 수 있으며,
계정이 제한되거나 정지될 수 있습니다. 권리를 가진 콘텐츠만 업로드하세요. 사용에 따른 책임은
본인에게 있습니다.

<a id="star-history"></a>

## 스타 히스토리

[![스타 히스토리 차트](https://api.star-history.com/svg?repos=makiisthenes/TiktokAutoUploader&type=Date)](https://star-history.com/#makiisthenes/TiktokAutoUploader&Date)
