# autotok — TikTok Auto Uploader

<p align="center">
  <a href="README.md">English</a> ·
  <a href="README.zh-CN.md">简体中文</a> ·
  <a href="README.zh-TW.md">繁體中文</a> ·
  <a href="README.ja.md">日本語</a> ·
  <a href="README.ko.md">한국어</a> ·
  <a href="README.es.md">Español</a> ·
  <a href="README.pt-BR.md">Português (Brasil)</a> ·
  <b>Русский</b> ·
  <a href="README.fr.md">Français</a> ·
  <a href="README.de.md">Deutsch</a>
</p>

*Это перевод [английского README](README.md); если они расходятся, актуальна английская версия.*

<p align="center">
  <img src="https://user-images.githubusercontent.com/52138450/111885490-04ab6680-89c0-11eb-955a-f833577b4406.png" width="35%" alt="Логотип TiktokAutoUploader">
</p>

<p align="center">Загружайте видео в TikTok и планируйте публикации из командной строки, Python, TypeScript, Go, PHP, Java или C#, со своим прокси для каждого аккаунта.</p>
<p align="center"><code>uv tool install autotok</code> · <code>npm install autotok</code> · один вход · одна команда на загрузку</p>

<p align="center">
  <a href="https://pypi.org/project/autotok/"><img alt="PyPI" src="https://img.shields.io/pypi/v/autotok?label=pypi"></a>
  <a href="https://www.npmjs.com/package/autotok"><img alt="npm" src="https://img.shields.io/npm/v/autotok?label=npm"></a>
  <a href="#typescript-sdk"><img alt="Типы TypeScript в комплекте" src="https://img.shields.io/npm/types/autotok"></a>
  <a href="https://pkg.go.dev/github.com/makiisthenes/TiktokAutoUploader/go"><img alt="Справочник Go" src="https://pkg.go.dev/badge/github.com/makiisthenes/TiktokAutoUploader/go.svg"></a>
  <a href="https://github.com/makiisthenes/TiktokAutoUploader/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/makiisthenes/TiktokAutoUploader/actions/workflows/ci.yml/badge.svg"></a>
  <a href="LICENSE"><img alt="Лицензия: AGPL-3.0" src="https://img.shields.io/badge/license-AGPL--3.0-blue"></a>
  <a href="https://www.linkedin.com/in/michael-p-88b015200/"><img alt="LinkedIn" src="https://img.shields.io/badge/LinkedIn-0077B5?style=flat-square&logo=linkedin&logoColor=white"></a>
  <img alt="Звёзды" src="https://img.shields.io/github/stars/makiisthenes/TiktokAutoUploader">
  <img alt="Форки" src="https://img.shields.io/github/forks/makiisthenes/TiktokAutoUploader">
</p>

<p align="center">
  <a href="https://github.com/makiisthenes/TiktokAutoUploader/blob/main/docs/media/autotok-launch.mp4">
    <img src="https://raw.githubusercontent.com/makiisthenes/TiktokAutoUploader/main/docs/media/autotok-launch.webp" width="100%" alt="autotok за 38 секунд: войдите один раз, и дальше одна команда загружает ваше видео в TikTok — сразу или по расписанию, в любой из ваших аккаунтов">
  </a>
</p>
<p align="center"><sub>Нажмите на видео, чтобы посмотреть его со звуком.</sub></p>

---

<a id="install"></a>

## Установка

**Командная строка и Python**

```bash
uv tool install "autotok[youtube]"
autotok install-browser                                   # one-time browser download, about 300 MB
```

Затем один раз войдите в каждый аккаунт и загружайте видео одной командой:

```bash
autotok login -n my_account                               # log in on the page that opens; the QR code is quickest
autotok upload -u my_account -v clip.mp4 -t "Hello #fyp"
```

Нет uv? Подойдут и `pipx install "autotok[youtube]"` или `pip install "autotok[youtube]"`.
В разделе [Начало работы](#getting-started) все шаги разобраны по порядку, включая прокси и облачные браузеры.

**TypeScript и JavaScript (Node.js)**

```bash
npm install autotok
npx playwright install chromium                           # one-time browser download
```

```ts
import { login, uploadVideo } from "autotok";

await login("my_account");                                // once: log in on the page that opens
await uploadVideo("my_account", "clip.mp4", "Hello #fyp");
```

Типизированный API на промисах, Python не нужен, а сохранённые аккаунты общие с CLI. Подробнее в разделе
[TypeScript SDK](#typescript-sdk).

**Go или один бинарник, которому больше ничего не нужно**

```bash
go install github.com/makiisthenes/TiktokAutoUploader/go/cmd/autotok@latest
```

или скачайте бинарник `autotok` для своей системы из
[релизов](https://github.com/makiisthenes/TiktokAutoUploader/releases) (тех, что с тегом `go/v...`). У него
те же команды, что и выше, ему не нужны Python и Node.js, а работает он с Chrome, который уже есть на вашем
компьютере. Для кода на Go: `go get github.com/makiisthenes/TiktokAutoUploader/go`. Подробнее в разделе
[Go](#go-sdk-and-single-binary).

**PHP, Java и C#**

Небольшие библиотеки, которые сами запускают команду `autotok` и возвращают типизированные результаты и ошибки.
Установите autotok, как описано выше, и переходите к разделу [PHP, Java и C#](#php-java-and-c).

---

<a id="sponsors"></a>

## Спонсоры

<p align="center">
  <a href="https://www.swiftproxy.net/?ref=makiisthenes">
    <img src="https://github.com/user-attachments/assets/a1d0e915-e09a-4b36-ba72-788c4cc1e709" alt="Swiftproxy — более 90 млн резидентных прокси" width="420">
  </a>
</p>

[**Swiftproxy**](https://www.swiftproxy.net/?ref=makiisthenes) предлагает более 90 млн чистых резидентных и статических резидентных прокси для автоматизации соцсетей, работы с несколькими аккаунтами и веб-автоматизации. Стабильные соединения, IP-адреса по всему миру и надёжная прокси-инфраструктура помогают безопасно управлять несколькими аккаунтами, реже упираться в ограничения по IP и масштабировать автоматизацию. Трафик резидентных прокси не сгорает, пока вы его не израсходуете, а протестировать сервис можно бесплатно.

> **Скидка 10%** по промокоду `PROXY90` — [Купить прокси у Swiftproxy →](https://www.swiftproxy.net/?ref=makiisthenes)

<br>

<p align="center">
  <a href="https://termius.com/">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/makiisthenes/TiktokAutoUploader/main/docs/images/termius-logo-white.png">
      <img src="https://raw.githubusercontent.com/makiisthenes/TiktokAutoUploader/main/docs/images/termius-logo.png" alt="Termius" width="300">
    </picture>
  </a>
</p>

[**Termius**](https://termius.com/) — безопасный и надёжный SSH-клиент с возможностью совместной работы.

> [Скачать Termius →](https://termius.com/)

---

<a id="getting-started"></a>

## Начало работы

Настройка занимает около пяти минут. После установки (шаг 1) можно запустить `autotok setup`, и он проведёт
вас по остальным шагам: проверит браузер, спросит прокси и протестирует его, а затем выполнит вход в TikTok
через этот прокси. Ниже те же шаги описаны для ручной настройки.

<a id="1-install-autotok"></a>

### 1. Установите autotok

```bash
uv tool install "autotok[youtube]"
```

Готово: `autotok` теперь можно запускать из любого терминала (проверьте командой `autotok --version`).
uv держит autotok отдельно от остальных ваших Python-пакетов и сам скачает Python, если его у вас
нет.

Нет uv? Его можно установить одной командой, см. [docs.astral.sh/uv](https://docs.astral.sh/uv/getting-started/installation/),
или воспользуйтесь [pipx](https://pipx.pypa.io): `pipx install "autotok[youtube]"`.

- Обновление: `uv tool upgrade autotok`.
- Попробовать без установки: `uvx --from "autotok[youtube]" autotok --version`.
- Используете autotok из кода на Python? Добавьте его в проект: `uv add "autotok[youtube]"` или
  `pip install "autotok[youtube]"`.
- Пишете на TypeScript или JavaScript? Тогда вместо этого `npm install autotok`, см. [TypeScript SDK](#typescript-sdk).
  В коде команды из шагов 3 и 4 заменяют `login()` и `uploadVideo()`.
- Не можете установить Python или пишете на Go? Возьмите вместо этого единый бинарник `autotok` из
  [релизов](https://github.com/makiisthenes/TiktokAutoUploader/releases): дальнейшие шаги
  не меняются. См. [Go](#go-sdk-and-single-binary).
- `[youtube]` добавляет поддержку ссылок на YouTube. Если она не нужна, его можно не указывать.
- Терминал пишет, что `autotok` «not recognized» или «command not found»? Один раз выполните `uv tool update-shell` и откройте новый
  терминал.

<a id="2-choose-where-the-browser-runs"></a>

### 2. Выберите, где будет работать браузер

Браузер нужен autotok для однократного входа и для подписи каждой загрузки. Выберите вариант:

| Вариант | Когда выбирать | Настройка |
|---|---|---|
| **Локальный** (по умолчанию) | Работа на своём компьютере | `autotok install-browser`, однократное скачивание около 300 МБ |
| **Облачный** ([Browserbase](https://www.browserbase.com) или [Steel](https://github.com/steel-dev/steel-browser)) | Серверы, Docker или если не хотите занимать свой компьютер | Добавьте API-ключ в файл настроек. См. [Облачные браузеры](#cloud-browsers-browserbase-steel) |

Чтобы использовать локальный браузер на свежем Linux-сервере, выполните от root `autotok install-browser --with-deps`: эта команда
также установит системные библиотеки для Chromium.

<a id="3-log-in-to-tiktok-once-per-account"></a>

### 3. Войдите в TikTok (один раз для каждого аккаунта)

```bash
autotok login -n my_account
```

Откроется окно браузера со страницей входа TikTok. Войдите любым удобным способом; быстрее всего — по QR-коду через приложение TikTok
на телефоне. Окно закроется само, а сессия сохранится под именем `my_account`.
С облачным браузером вместо окна вы получите ссылку, которую нужно открыть.

```bash
autotok accounts check my_account     # confirms TikTok accepts the saved session
```

- Собираетесь использовать для этого аккаунта прокси? Укажите его сразу, чтобы вход и последующие загрузки шли с одного IP:
  `autotok login -n my_account -p http://user:pass@host:port` (см. [Прокси](#proxies)).
- Для каждого аккаунта повторите это с другим именем в `-n`.
- Сессии сохраняются в `~/.autotok/accounts`. Обращайтесь с ними как с паролями.

<a id="4-upload"></a>

### 4. Загрузите видео

```bash
autotok upload -u my_account -v "C:\Videos\clip.mp4" -t "My caption #fyp"
```

Вот и всё. Ещё примеры:

```bash
autotok upload -u my_account -v clip.mp4 -t "Just for me" -vi 1                 # private
autotok upload -u my_account -v clip.mp4 -t "Later #fyp" -sc 3600               # publish in 1 hour
autotok upload -u my_account -yt "https://www.youtube.com/shorts/xxxxxxxxxxx" -t "Caption"
```

`-v` принимает путь к любому видео или просто имя файла, если видео лежит в `~/.autotok/videos`. Все параметры описаны в
[справочнике по CLI](#cli-reference).

<a id="5-optional-save-your-settings-in-a-file"></a>

### 5. Необязательно: сохраните настройки в файл

Такие настройки, как облачный браузер и его API-ключ, хранятся в файле `.env`. autotok ищет его в папке, из которой
вы его запускаете, а затем в `~/.autotok/.env`; второй вариант работает из любой папки. Скопируйте
[`.env.example`](.env.example) (из этого репозитория) или начните только с того, что вам нужно:

```bash
# ~/.autotok/.env   (Windows: C:\Users\<you>\.autotok\.env)
AUTOTOK_BROWSER=browserbase
BROWSERBASE_API_KEY=bb_live_...
```

<a id="where-next"></a>

### Что дальше?

| Я хочу... | Раздел |
|---|---|
| Вести несколько аккаунтов, у каждого свой IP | [Прокси](#proxies) |
| Не запускать браузер на своём компьютере | [Облачные браузеры](#cloud-browsers-browserbase-steel) |
| Загружать из кода на Python | [Python SDK](#python-sdk) |
| Загружать из TypeScript или JavaScript | [TypeScript SDK](#typescript-sdk) |
| Загружать из Go или пользоваться одним бинарником без Python | [Go](#go-sdk-and-single-binary) |
| Загружать из PHP, Java или C# | [PHP, Java и C#](#php-java-and-c) |
| Поручить загрузку ИИ-агенту (Claude, Cursor...) | [MCP-сервер](#mcp-server-ai-agents) |
| Загружать, просто попросив Claude Code, с помощью скилла | [Плагин для Claude Code](#claude-code-plugin) |
| Запускать на сервере или в контейнере | [Docker](#docker) |
| Пользоваться веб-панелью с планировщиком | [Веб-приложение](#web-app-self-hosted) |
| Исправить ошибку | [Решение проблем](#troubleshooting) |

---

<a id="features"></a>

## Возможности

- **Загрузка одной командой** через веб-API загрузки TikTok. Ничего не нужно прокликивать на сайте TikTok.
- **Свой прокси для каждого аккаунта**: вход, подпись запросов и каждая загрузка идут через один и тот же прокси, поэтому каждый аккаунт всегда выходит в сеть с одного IP. Поддерживаются HTTP(S) и SOCKS5.
- **Несколько аккаунтов**: войдите в каждый аккаунт один раз и загружайте, указывая его имя.
- **Отложенная публикация**: планирование на стороне TikTok от 15 минут до 30 дней вперёд (для некоторых аккаунтов TikTok ограничивает срок 10 днями). Веб-приложение, которое вы разворачиваете у себя, добавляет планировщик без ограничения по времени.
- **Настройки публикации**: публичная или приватная, а также включение и отключение комментариев, дуэтов, склеек (Stitch) и метки «Создано ИИ».
- **Кликабельные хештеги и @упоминания**, эмодзи ничего не ломают.
- **Ссылки на YouTube** скачиваются автоматически с помощью [yt-dlp](https://github.com/yt-dlp/yt-dlp).
- **Python SDK, CLI и необязательное веб-приложение** (Docker) со входом через браузер.
- **TypeScript SDK** в npm (`npm install autotok`): полностью типизированный, на промисах, без Python, а сохранённые аккаунты
  общие с CLI.
- **Go-пакет и единый бинарник**: подключите библиотеку через `go get` или скачайте один исполняемый файл `autotok`,
  которому не нужны Python и Node.js. Сохранённые аккаунты общие с остальными пакетами.
- **Библиотеки для PHP, Java и C#**, которые управляют командой `autotok` и возвращают типизированные результаты и
  ошибки, без других зависимостей.
- **MCP-сервер**, чтобы ИИ-агенты (Claude, Cursor, VS Code...) могли загружать видео и планировать публикации за вас.
- **Плагин для Claude Code** со скиллом загрузки в TikTok: попросите обычными словами, и перед публикацией он
  спросит подтверждение.
- **Облачные браузеры**: браузер для входа и подписи может работать не на вашем компьютере, а в [Browserbase](https://www.browserbase.com) или [Steel](https://github.com/steel-dev/steel-browser) (в облаке или на своём сервере).
- **Docker-образ** для запуска CLI на серверах.
- **Node.js не нужен** для Python-пакета: подписи запросов TikTok вычисляются в headless Chromium.

---

<a id="proxies"></a>

## Прокси

Несколько аккаунтов с одного IP — самый быстрый способ попасть под подозрение. autotok позволяет назначить
каждому аккаунту свой прокси и использует его **везде**, где этот аккаунт обращается к TikTok:

| Этап | Идёт через прокси аккаунта |
|---|---|
| Браузер для входа (`autotok login`, вход в веб-приложении) | ✅ |
| Загрузка страницы для подписи | ✅ (сам браузер для подписи не делает сетевых запросов) |
| Вызовы API загрузки и передача видео | ✅ |
| Скачивание с YouTube | ❌ (это не трафик TikTok; так экономится трафик прокси) |

**Настройка, смена и проверка прокси**

`autotok setup` спрашивает прокси, проверяет его и выполняет вход через него. Вручную это делается так:

```bash
autotok login -n alice -p http://user:pass@gate.example.com:7000   # set at login
autotok proxy set alice socks5://user:pass@gate.example.com:1080     # set or change later
autotok proxy test -u alice                                          # shows the IP TikTok will see
autotok proxy clear alice                                            # go direct
autotok accounts list                                                # every account and its proxy (passwords hidden)

autotok upload -u alice -v clip.mp4 -t "hi" -p http://other:pass@host:8000   # one-off override
autotok upload -u alice -v clip.mp4 -t "hi" --no-proxy                       # ignore the saved proxy once
```

**Поддерживаемые форматы** (схема по умолчанию — `http`)

```
http://user:pass@host:port      https://user:pass@host:port
socks5://user:pass@host:port    host:port
user:pass@host:port             host:port:user:pass      ← the export format most providers use
```

**Советы**

- Используйте **резидентные или мобильные** прокси, по одному на аккаунт, со **sticky-сессией** (один и тот же IP
  в течение нескольких часов). Если прокси меняет IP при каждом запросе, сессия с выполненным входом выглядит угнанной.
- Входите **через тот же прокси**, через который будете загружать (`autotok login -p ...`). Вход из дома и
  загрузка через прокси — несоответствие, которое TikTok замечает.
- Chromium не умеет работать с SOCKS5-прокси, которым нужны логин и пароль. Для входа используйте
  HTTP-эндпоинт вашего провайдера (загрузки работают с любым из них).
- Пароли никогда не выводятся: CLI и веб-приложение показывают `http://user:****@host:port`.

Нужны прокси? Загляните к нашим [спонсорам](#sponsors).

---

<a id="cloud-browsers-browserbase-steel"></a>

## Облачные браузеры (Browserbase, Steel)

Браузер нужен autotok в двух местах: для однократного **входа** и для **подписи** каждой загрузки (антибот-подписи
TikTok вычисляются на странице в браузере). По умолчанию это Chromium на вашей машине.
Задайте `AUTOTOK_BROWSER`, чтобы вместо этого запускать его в облаке. Тогда локально ничего не нужно устанавливать и открывать,
поэтому такой вариант хорошо подходит для серверов и Docker.

| `AUTOTOK_BROWSER` | Где работает браузер | Настройки |
|---|---|---|
| `local` (по умолчанию) | Chromium на этой машине | Один раз выполнить `autotok install-browser` |
| `browserbase` | [Browserbase](https://www.browserbase.com) | `BROWSERBASE_API_KEY` (по желанию `BROWSERBASE_PROJECT_ID`, `BROWSERBASE_REGION`) |
| `steel` | [Steel Cloud](https://steel.dev) или собственный сервер [steel-browser](https://github.com/steel-dev/steel-browser) | Облако: `STEEL_API_KEY`. Свой сервер: `STEEL_BASE_URL`, например `http://localhost:3000` |

Пропишите настройки в файле `.env` (скопируйте [`.env.example`](.env.example)):

```bash
AUTOTOK_BROWSER=browserbase
BROWSERBASE_API_KEY=bb_live_...
```

Дальше пользуйтесь autotok как обычно:

```bash
autotok browser check                 # starts a session and shows the IP it browses from
autotok login -n alice -p http://user:pass@gate.example.com:7000
autotok upload -u alice -v clip.mp4 -t "Hello #fyp"
```

Или выбирайте браузер для отдельной команды: `autotok --browser steel login -n alice`.

**Вход:** `autotok login` выводит ссылку на live view и открывает её в вашем обычном браузере. Войдите в
TikTok на этой странице; как только вход выполнен, сессия сохраняется, а облачный браузер закрывается.

**Steel на своём сервере** бесплатен и имеет открытый исходный код:

```bash
docker run -p 3000:3000 -e DOMAIN=localhost:3000 ghcr.io/steel-dev/steel-browser
```

и в `.env`:

```bash
AUTOTOK_BROWSER=steel
STEEL_BASE_URL=http://localhost:3000
```

В `DOMAIN` укажите адрес, по которому вы открываете сервер. Без него steel-browser говорит браузерам
подключаться к `0.0.0.0`, его live view остаётся пустым, и войти не получится. autotok предупреждает, когда замечает
такую ситуацию. Собственный steel-browser держит только одну сессию за раз.

Полезно знать:

- **Используйте прокси аккаунта при входе через облако.** Прокси аккаунта применяется к облачной
  сессии входа, поэтому TikTok видит один и тот же IP при входе и при загрузке. Без него TikTok увидит, что вход
  выполнен с IP провайдера, а загрузки идут с вашего.
- **«Verify it's really you»** после входа означает, что TikTok увидел незнакомое устройство на IP
  дата-центра. Проверку можно пройти в live view, но лучше её избежать: используйте прокси аккаунта или на
  платном тарифе Browserbase задайте `BROWSERBASE_PROXY_COUNTRY=GB` (код вашей страны), чтобы входить через домашний
  IP в этой стране. На бесплатном тарифе `BROWSERBASE_REGION` с ближайшим к вам регионом
  (например, `eu-central-1`) хотя бы позволит не входить из США.
- В live view видна только вкладка TikTok, поэтому при входе через облако autotok закрывает всплывающие окна
  вроде «Continue with Google». Вместо этого входите по QR-коду, через email/имя пользователя или по телефону.
- Browserbase принимает только HTTP/HTTPS-прокси, а для собственных прокси нужен тариф Developer или выше.
  В Steel Cloud для собственных прокси тоже может понадобиться платный тариф.
- В облаке работает только браузер. Сам видеофайл по-прежнему идёт с вашей машины (через
  прокси аккаунта) напрямую в TikTok, поэтому облачных ресурсов тратится мало: одна короткая сессия на вход и
  на каждую загрузку.
- Нужен другой провайдер? Унаследуйтесь от `autotok.browsers.CloudProvider` и вызовите
  `autotok.browsers.register_provider("name", YourProvider)`.

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

Уже есть cookie `sessionid` из вашего браузера? Обойдитесь без окна входа:

```python
autotok.import_session("alice", "<sessionid value>", datacenter="<tt-target-idc value>")
```

---

<a id="typescript-sdk"></a>

## TypeScript SDK

Тот же загрузчик для TypeScript и JavaScript, опубликован в npm как [`autotok`](https://www.npmjs.com/package/autotok).
Работает на Node.js 22.12+, типы в комплекте, Python не нужен. Он читает и пишет тот же
`~/.autotok/accounts`, поэтому аккаунт, в который вы вошли через CLI, работает и из TypeScript, и
наоборот.

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

- В редакторе типизировано всё: параметры, результаты и каждый класс ошибок.
- Видео можно передать путём, именем файла в `~/.autotok/videos` или его байтами (`Buffer`/`Uint8Array`).
- Работает из ES-модулей и CommonJS (`require("autotok")`), а также с настройками TypeScript `nodenext`,
  `node20` и `bundler`.
- Прокси, облачные браузеры (`AUTOTOK_BROWSER`), переменные конфигурации и файлы `.env` работают так, как
  описано в этом README; чтобы прочитать `.env`, вызовите `loadEnv()`.
- Уже есть cookie `sessionid`? `await importSession("alice", "<sessionid>", { datacenter: "<tt-target-idc>" })`.

Полное описание API — в [`js/README.md`](js/README.md). CLI, ссылки на YouTube, MCP-сервер и
веб-приложение входят в Python-пакет.

---

<a id="go-sdk-and-single-binary"></a>

## Go SDK и единый бинарник

autotok также доступен как Go-модуль, который собирается в один бинарник `autotok`, и для него не нужны Python
и Node.js. У бинарника те же команды и флаги, что и у Python CLI. Как и TypeScript-пакет,
он читает и пишет тот же `~/.autotok/accounts`, так что аккаунты работают везде.

```bash
go install github.com/makiisthenes/TiktokAutoUploader/go/cmd/autotok@latest   # or download a release binary
autotok login -n my_account
autotok upload -u my_account -v clip.mp4 -t "Hello #fyp"
```

Для входа и подписи он использует Chrome, Chromium или Edge, уже установленные на вашем компьютере, или
Chromium от Playwright, если его установили другие пакеты. Если на машине нет ни того, ни другого, выполните
`autotok install-browser`: команда скачает Chrome for Testing (около 200 МБ, один раз).

Из кода на Go (Go 1.26+):

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

- Каждый вызов принимает `context.Context`, поэтому загрузку можно отменить или ограничить по времени.
- Ошибки типизированы (`*autotok.PublishError`, `*autotok.UploadError`...) для использования с `errors.As`.
- Прокси и облачные браузеры (`AUTOTOK_BROWSER`) работают так, как описано в этом README. Браузер для входа
  работает и с SOCKS5-прокси, которым нужен пароль.
- Ссылки на YouTube работают, если установлен [yt-dlp](https://github.com/yt-dlp/yt-dlp). Мастер
  настройки, интерактивная оболочка и MCP-сервер есть только в Python-пакете.

Полное описание API — в [`go/README.md`](go/README.md) и на
[pkg.go.dev](https://pkg.go.dev/github.com/makiisthenes/TiktokAutoUploader/go).

---

<a id="php-java-and-c"></a>

## PHP, Java и C#

Небольшие библиотеки для PHP, Java и .NET сами запускают команду `autotok` (из Python-пакета или
Go-бинарника) и превращают её ответы в объекты и типизированные ошибки. Они используют те же сохранённые
аккаунты и прокси и больше ничего не требуют. Установите autotok, один раз войдите командой
`autotok login -n alice`, а затем:

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

- Все три поддерживают те же настройки публикации, что и CLI (расписание, видимость, комментарии, дуэты,
  склейки, метка ИИ, прокси), умеют выводить список аккаунтов и проверять их и выбрасывают исключение одного типа
  с полями `type` и `retryable` из ошибки autotok, так что вы знаете, когда повторная попытка точно не опубликует видео дважды.
- Им нужна версия autotok с [`--json`](#json-output) и `--title-file`: Python-пакет новее
  2.1.0 или Go-бинарник новее 0.1.0. Пока такие версии не вышли, установите autotok из этого
  репозитория: `uv tool install "autotok[youtube] @ git+https://github.com/makiisthenes/TiktokAutoUploader"`.
- В Packagist, Maven Central и NuGet их пока нет; в README каждой библиотеки описано, как подключить её из этого
  репозитория.
- То же самое можно сделать на любом другом языке: запустите `autotok --json upload ...` и прочитайте одну строку
  [JSON](#json-output).

---

<a id="mcp-server-ai-agents"></a>

## MCP-сервер (ИИ-агенты)

В autotok есть [MCP](https://modelcontextprotocol.io)-сервер, так что ИИ-агенты вроде Claude,
Cursor или VS Code могут загружать видео и планировать публикации за вас. Он использует те же сохранённые аккаунты, что и CLI.

```bash
uv tool install "autotok[youtube,mcp]"    # or: pip install "autotok[youtube,mcp]"
```

**Claude Code**

```bash
claude mcp add autotok -- autotok mcp
```

**Claude Desktop, Cursor и другие клиенты**: добавьте это в настройки MCP клиента
(`claude_desktop_config.json`, `.cursor/mcp.json`, ...):

```json
{
  "mcpServers": {
    "autotok": { "command": "autotok", "args": ["mcp"] }
  }
}
```

Если клиент не находит `autotok`, укажите полный путь, который выводит `which autotok` (в Windows —
`where autotok`). Затем попросите, например: *«Загрузи clip.mp4 в my_account с описанием
'Hello #fyp' и запланируй на завтра на 18:00».*

| Инструмент | Что делает |
|---|---|
| `list_accounts` | Сохранённые аккаунты, выполнен ли в каждом вход, и его прокси (замаскированный) |
| `check_account` | Спрашивает у TikTok, действует ли ещё сессия аккаунта |
| `list_videos` | Файлы в вашей папке с видео |
| `upload_video` | Загружает файл или видео по ссылке на YouTube, публикует сразу или планирует на срок от 15 минут до 30 дней вперёд, с теми же настройками публикации, что и в CLI |
| `login`, `login_status` | Начинает вход. Завершаете его вы сами в открывшемся окне браузера (или по ссылке, которую выдаёт облачный браузер) |
| `set_proxy`, `test_proxy` | Сохраняет или удаляет прокси аккаунта и показывает IP, который увидит TikTok |

- **Ваши сессии остаются на вашем компьютере.** Инструменты никогда не возвращают cookies, а пароли прокси
  маскируются.
- **Каждая загрузка — это настоящая публикация.** Большинство клиентов спрашивают разрешение перед каждым вызовом инструмента;
  для `upload_video` не отключайте это. Ошибка загрузки, в которой сказано, что публикация *может существовать, а может и нет*,
  говорит агенту не повторять попытку, поэтому ничего не публикуется дважды.
- **Таймауты не приводят к дублям.** Если клиент не дождался окончания долгой загрузки и снова вызывает
  `upload_video` с тем же аккаунтом, видео и описанием, он получит результат первой загрузки,
  а не вторую публикацию. Клиенты, которые поддерживают уведомления о прогрессе, тем временем продолжают ждать.
- **Streamable HTTP**: `autotok mcp --http` работает по адресу `http://127.0.0.1:8000/mcp` (изменить можно через `--host`,
  `--port`). Аутентификации нет, поэтому держите сервер на localhost или за собственной аутентификацией.

---

<a id="claude-code-plugin"></a>

## Плагин для Claude Code

Плагин для [Claude Code](https://code.claude.com) со скиллом `tiktok-upload`, чтобы загружать видео
простой просьбой:

> Опубликуй ~/Videos/clip.mp4 в my_account с описанием «За кадром 🎬 #fyp» завтра в 18:00.

```
/plugin marketplace add makiisthenes/TiktokAutoUploader
/plugin install autotok@autotok
```

Скилл запускает команду `autotok`, поэтому сначала [установите autotok](#install) и войдите в аккаунт. Он выбирает
аккаунт (или выполняет вход через окно браузера), показывает аккаунт, видео, описание и время,
спрашивает подтверждение перед публикацией, затем загружает видео и объясняет любые ошибки. Без запроса разрешения
выполняются только команды, которые ничего не меняют, например вывод списка аккаунтов. Загрузка, которая могла дойти
до TikTok, а могла и не дойти, никогда не повторяется, поэтому ничего не публикуется дважды. Скилл можно запустить и напрямую:
`/autotok:tiktok-upload clip.mp4 "Hello #fyp"`.

Подробнее — в [`claude-plugin/README.md`](claude-plugin/README.md), в том числе о том, как использовать скилл
без плагина.

---

<a id="cli-reference"></a>

## Справочник по CLI

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

Параметры загрузки:

| Флаг | Описание | По умолчанию |
|---|---|---|
| `-u` / `--user` | Имя сохранённого аккаунта | *обязательный* |
| `-v` / `--video` | Видеофайл (путь или имя в вашей папке с видео) | — |
| `-yt` / `--youtube` | URL видео на YouTube, которое нужно скачать и загрузить | — |
| `-t` / `--title` | Описание, до 2200 символов | *обязательный* (или `--title-file`) |
| `--title-file` | Прочитать описание из текстового файла в UTF-8 или из stdin, если указать `-` | — |
| `-sc` / `--schedule` | Опубликовать через указанное число секунд (900–2592000; некоторые аккаунты допускают не больше 864000) | сразу |
| `-vi` / `--visibility` | `0` — публичное, `1` — приватное | `0` |
| `-ct` / `--comment` | Разрешить комментарии (`0`/`1`) | `1` |
| `-d` / `--duet` | Разрешить дуэты (`0`/`1`) | `0` |
| `-st` / `--stitch` | Разрешить склейки (`0`/`1`) | `0` |
| `-ai` / `--ailabel` | Пометить как созданное ИИ (`0`/`1`) | `0` |
| `-p` / `--proxy` | Прокси только для этой загрузки | прокси аккаунта |
| `--no-proxy` | Игнорировать сохранённый прокси аккаунта | — |

`python cli.py ...` в этом репозитории по-прежнему работает и делает то же самое, что `autotok ...`.

<a id="json-output"></a>

### Вывод в формате JSON

Для скриптов и других языков: с `--json` команды `upload` и `accounts` выводят в stdout одну строку JSON
вместо текста. Логи по-прежнему идут в stderr. Именно так работают [библиотеки для PHP, Java и C#](#php-java-and-c).

```bash
autotok --json upload -u alice -v clip.mp4 -t "Hello #fyp"
```

| Команда | Выводит |
|---|---|
| `upload` | `{"video_id": "...", "creation_id": "...", "scheduled_for": "2026-11-02T18:30:00Z"}` (`null`, если опубликовано сразу) |
| `accounts list` | `{"accounts": [{"name": "alice", "session": true, "proxy": "http://user:****@host:port"}]}` |
| `accounts check NAME` | `{"name": "alice", "session_ok": true}` (код выхода 1 при `false`) |
| `accounts remove NAME` | `{"name": "alice", "removed": true}` (код выхода 1 при `false`) |

Ошибки выводятся в виде `{"error": {"type": "PublishError", "message": "...", "retryable": false}}` с
обычным кодом выхода (2 при некорректных входных данных). `type` — имя класса ошибки, например
`ValidationError`, `AccountNotFoundError`, `PublishError` или `PublishUncertainError`. `retryable`
равен `true`, только если ничего не дошло до этапа публикации в TikTok, поэтому повторный запуск команды не опубликует видео
дважды. У `PublishError` также есть `status_code` и `status_msg` от TikTok.
Ошибки, которые парсер аргументов находит ещё до запуска команды (например, неизвестный параметр
или не указанное имя аккаунта), выводят вместо JSON справку по использованию в stderr с кодом выхода 2,
поэтому вывод, который не является JSON, тоже считайте ошибкой.

---

<a id="docker"></a>

## Docker

`Dockerfile` в репозитории собирает CLI вместе с Chromium:

```bash
docker build -t autotok .

docker run --rm -it -v autotok-data:/data autotok accounts list
docker run --rm -it -v autotok-data:/data -v "$PWD/videos:/data/videos" \
  autotok upload -u alice -v clip.mp4 -t "Hello #fyp"
```

Сохранённые аккаунты хранятся в `/data`, поэтому держите этот каталог в volume. У контейнеров нет экрана, так что входите через
[облачный браузер](#cloud-browsers-browserbase-steel) и открывайте ссылку, которую он выводит:

```bash
docker run --rm -it -v autotok-data:/data \
  -e AUTOTOK_BROWSER=browserbase -e BROWSERBASE_API_KEY=bb_live_... \
  autotok login -n alice -p http://user:pass@gate.example.com:7000
```

Можно также сохранить cookie сессии из своего браузера с помощью `login --sessionid ... --datacenter ...`.

Используете облачный браузер для всего? Соберите образ без локального Chromium, он получится намного меньше:
`docker build --build-arg INSTALL_BROWSER=false -t autotok:slim .`

---

<a id="web-app-self-hosted"></a>

## Веб-приложение (на своём сервере)

Локальная панель управления с аккаунтами, прокси, библиотекой видео, загрузками и планировщиком, а также
виртуальным браузером для входа. Нужен Docker.

```bash
git clone https://github.com/makiisthenes/TiktokAutoUploader.git
cd TiktokAutoUploader
docker compose up --build
```

Откройте <http://localhost:3000>. Документация API доступна по адресу <http://localhost:8000/docs>.

- **Аккаунты**: добавляйте аккаунты, выполняя вход через встроенный виртуальный браузер (при желании
  через прокси), затем задавайте, меняйте и проверяйте прокси каждого аккаунта и проверяйте его сессию.
- **Загрузка**: перетащите файл, выберите его из библиотеки или вставьте ссылку на YouTube. Публикуйте сразу или
  запланируйте на любое время.
- **Расписание**: планировщик повторяет только те попытки, которые сорвались до того, как что-либо дошло до TikTok,
  поэтому задача не может опубликовать видео дважды. Задача, прерванная во время публикации, помечается как *возможно, уже
  опубликовано*, а при повторе вас попросят сначала проверить TikTok.

Данные хранятся в `./data`. Чтобы использовать аккаунт, в который вы вошли через CLI, скопируйте его файл в
хранилище приложения и нажмите **Import from disk** на странице Accounts:

```bash
mkdir -p data/autotok/accounts && cp ~/.autotok/accounts/my_account.json data/autotok/accounts/
```

(В Linux файлы, которые записывают контейнеры, принадлежат root, поэтому для аккаунтов, которыми вы управляете
в веб-приложении, используйте его собственный вход.)

Чтобы подписывать загрузки облачным браузером, пропишите `AUTOTOK_BROWSER` и его настройки (см.
[Облачные браузеры](#cloud-browsers-browserbase-steel)) в файле `.env` рядом с `docker-compose.yml`.
Вход через веб-приложение по-прежнему выполняется во встроенном виртуальном браузере.

Скрипты, которые обращаются к API напрямую, должны отправлять заголовок `X-Requested-With: autotok` в
запросах `POST`/`PATCH`/`DELETE`. Так другие веб-страницы не смогут пользоваться локальным API.
Кроме того, API отвечает только на `localhost` и `127.0.0.1`. Если вы открываете приложение по другому имени
(например, через собственный reverse proxy), добавьте его в `.env`: `AUTOTOK_ALLOWED_HOSTS=tiktok.home.lan`.

> У веб-приложения нет собственной авторизации, и оно слушает только `127.0.0.1`. Не открывайте к нему доступ
> из интернета.

---

<a id="configuration"></a>

## Конфигурация

Все настройки необязательны. Храните их в файле `.env`: скопируйте [`.env.example`](.env.example) в `.env`
и заполните то, чем пользуетесь. `autotok` читает `.env` из папки, в которой вы его запускаете, затем
`~/.autotok/.env`. Переменные, уже заданные в окружении, имеют приоритет, а `docker compose`
читает тот же файл. В `.env` хранятся API-ключи, поэтому никогда не коммитьте его (он есть в `.gitignore`).

| Переменная | Назначение | По умолчанию |
|---|---|---|
| `AUTOTOK_HOME` | Сохранённые аккаунты и настройки | `~/.autotok` |
| `AUTOTOK_VIDEOS_DIR` | Папка с видео и скачанными с YouTube роликами | `$AUTOTOK_HOME/videos` |
| `AUTOTOK_BROWSER` | Где работают браузеры для входа и подписи: `local`, `browserbase`, `steel` | `local` |
| `AUTOTOK_BROWSER_CHANNEL` | Использовать установленный браузер, например `chrome` | Chromium от Playwright |
| `AUTOTOK_BROWSER_PATH` | Полный путь к исполняемому файлу Chrome/Chromium | Chromium от Playwright |
| `BROWSERBASE_API_KEY`, `BROWSERBASE_PROJECT_ID`, `BROWSERBASE_REGION`, `BROWSERBASE_PROXY_COUNTRY` | Настройки Browserbase | — |
| `STEEL_API_KEY`, `STEEL_BASE_URL`, `STEEL_CONNECT_URL` | Настройки Steel (`STEEL_BASE_URL` для своего сервера) | Steel Cloud |

Файлы аккаунтов содержат вашу сессию TikTok (по сути это равноценно паролю). Они сохраняются с правами доступа
только для владельца; никому их не передавайте.

---

<a id="upgrading-from-tiktokautouploader-1x"></a>

## Переход с TiktokAutoUploader 1.x

- **Установка:** следуйте разделу [Начало работы](#getting-started) (`uv tool install "autotok[youtube]"`, затем `autotok install-browser`). Node.js и `npm install` больше не нужны.
- **Сессии:** сохранённые сессии из `CookiesDir/` переносятся автоматически, когда вы впервые используете
  их из папки репозитория. Флаги остались прежними, и `python cli.py` по-прежнему работает.
- **Планирование:** `-sc` снова планирует публикацию на стороне TikTok (от 15 минут до 10 дней). Локальная очередь
  из 1.x (`cli.py schedule list|cancel`) теперь находится на странице Schedules в веб-приложении.
- **Исправления ошибок:** настройки приватности, комментариев, дуэтов и склеек теперь действительно применяются. Прежние
  версии всегда публиковали видео публично и со всеми разрешениями. Хештеги снова кликабельны.
- **Удалено:** `config.txt` и неиспользуемые вспомогательные функции для редактирования видео на ImageMagick.

---

<a id="troubleshooting"></a>

## Решение проблем

| Проблема | Решение |
|---|---|
| `'autotok' is not recognized` / `command not found` | Один раз выполните `uv tool update-shell` и откройте новый терминал. Если вы устанавливали через pip, используйте `python -m autotok ...` |
| `Chromium for Playwright is not installed` | `autotok install-browser` (на Linux-серверах добавьте `--with-deps`) |
| `TikTok rejected the session` / `session rejected` | `autotok login -n NAME --force` (проверить: `autotok accounts check NAME`) |
| `Invalid parameters (status_code=5)` | TikTok изменил API загрузки. Пожалуйста, [создайте issue](https://github.com/makiisthenes/TiktokAutoUploader/issues) с полным текстом ошибки. |
| `potential violation of our Community Guidelines` | TikTok заблокировал содержимое этого видео; это не ошибка инструмента. |
| Страница входа не даёт войти или зацикливается на капче | Попробуйте установленный у вас Chrome: добавьте `AUTOTOK_BROWSER_CHANNEL=chrome` в `.env` или скопируйте cookie `sessionid` из браузера и используйте `autotok login -n NAME --sessionid ...` |
| «Verify it's really you» при входе через облако | TikTok не узнаёт IP облачного браузера. Пройдите проверку в live view (выберите Email) или избегайте её с помощью прокси; см. примечания в разделе [Облачные браузеры](#cloud-browsers-browserbase-steel) |
| Live view при входе через облако пустой (Steel на своём сервере) | Перезапустите steel-browser с `DOMAIN=localhost:3000` (его адрес) |
| `Browserbase ... (HTTP 402): Proxies are not included in the free plan` | Уберите `BROWSERBASE_PROXY_COUNTRY` или прокси аккаунта для входа через облако либо перейдите на более высокий тариф Browserbase |
| Предупреждение `No TikTok datacenter cookie saved` | Войдите заново через `autotok login` или передайте `--datacenter` вместе с `--sessionid` |
| `may or may not have been posted` | Соединение оборвалось во время публикации. Перед повторной попыткой проверьте аккаунт, чтобы не опубликовать видео дважды. |

См. также [Частые проблемы](docs/common-problems.md).

---

<a id="professional-software-autotok-pro"></a>

## Профессиональная версия (autotok Pro)

Заполните форму листа ожидания: https://forms.gle/M4KpdfruqCukQvj99

Если вам нужно что-то большее, что быстрее приведёт вас к цели, я предлагаю программу, в которой есть:

- Работа с более чем 1000 аккаунтов
- Автоматическая загрузка одинаковых видео в несколько аккаунтов
- Планирование публикаций для нескольких аккаунтов на срок от 20 дней до 2 лет вперёд
- Автоматический сбор видео из YouTube, X, Reddit, TikTok
- Настройка конвейеров загрузки, от источника до расписания публикаций
- Метрики текущей эффективности всех этих аккаунтов
- Персональная поддержка от меня по любым вопросам на срок до 3 месяцев
- Поддержка прокси, аккуратный современный интерфейс

Программу можно купить. Если интересно, напишите мне на `michaelperes562@gmail.com` с темой письма `Tiktok Bot Software`, иначе я могу пропустить ваше письмо.

---

<a id="licensing"></a>

## Лицензирование

autotok распространяется под **двойной лицензией**:

- **Открытая лицензия:** [GNU AGPL v3.0](LICENSE). Свободно используйте, изменяйте и распространяйте. Если вы распространяете
  изменённую версию или запускаете её как сервис для других, вы обязаны опубликовать свой исходный код под
  той же лицензией.
- **Коммерческая лицензия:** чтобы встраивать autotok в продукты с закрытым исходным кодом или платные сервисы без обязательств
  AGPL или чтобы пользоваться autotok Pro, пишите на `michaelperes562@gmail.com`.

Авторские права © 2021–2026 Michael Peres. Релизы до 2.0.0 остаются под той лицензией, с которой они
были опубликованы. Входящие в комплект скрипты подписи — сторонний код, см.
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Вклад в проект приветствуется на условиях, описанных в
[CONTRIBUTING.md](CONTRIBUTING.md).

---

<a id="support-this-project"></a>

## Поддержите проект

Если вам нравится проект, поддержите меня через [Patreon](https://patreon.com/makiisthenes) или [Ko-Fi](https://ko-fi.com/makiperes) или поставьте проекту звезду.

- Спасибо [@DelvinBa](https://github.com/DelvinBa) за переход на новый эндпоинт загрузки TikTok. (09/12/2024)

<a id="bugs-and-issues"></a>

## Ошибки и проблемы

Сообщайте об ошибках на [вкладке Issues](https://github.com/makiisthenes/TiktokAutoUploader/issues), а не по электронной почте.
О проблемах безопасности сообщайте через приватный отчёт, как описано в [SECURITY.md](SECURITY.md).

<a id="notes-and-terms"></a>

## Примечания и условия

Этот проект не связан с TikTok. Автоматизация загрузок может нарушать условия использования TikTok
и привести к ограничению или блокировке аккаунтов. Загружайте только тот контент, на который у вас есть права. Используйте на свой
страх и риск.

<a id="star-history"></a>

## История звёзд

[![График истории звёзд](https://api.star-history.com/svg?repos=makiisthenes/TiktokAutoUploader&type=Date)](https://star-history.com/#makiisthenes/TiktokAutoUploader&Date)
