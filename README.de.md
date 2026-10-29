# autotok — TikTok Auto Uploader

<p align="center">
  <a href="README.md">English</a> ·
  <a href="README.zh-CN.md">简体中文</a> ·
  <a href="README.zh-TW.md">繁體中文</a> ·
  <a href="README.ja.md">日本語</a> ·
  <a href="README.ko.md">한국어</a> ·
  <a href="README.es.md">Español</a> ·
  <a href="README.pt-BR.md">Português (Brasil)</a> ·
  <a href="README.ru.md">Русский</a> ·
  <a href="README.fr.md">Français</a> ·
  <b>Deutsch</b>
</p>

*Dies ist eine Übersetzung der [englischen README](README.md); bei Abweichungen ist die englische Version auf dem neuesten Stand.*

<p align="center">
  <img src="https://user-images.githubusercontent.com/52138450/111885490-04ab6680-89c0-11eb-955a-f833577b4406.png" width="35%" alt="TiktokAutoUploader-Logo">
</p>

<p align="center">TikTok-Videos per Kommandozeile oder aus Python, TypeScript, Go, PHP, Java oder C# hochladen und planen – mit einem eigenen Proxy pro Account.</p>
<p align="center"><code>uv tool install autotok</code> · <code>npm install autotok</code> · einmal anmelden · ein Befehl pro Upload</p>

<p align="center">
  <a href="https://pypi.org/project/autotok/"><img alt="PyPI" src="https://img.shields.io/pypi/v/autotok?label=pypi"></a>
  <a href="https://www.npmjs.com/package/autotok"><img alt="npm" src="https://img.shields.io/npm/v/autotok?label=npm"></a>
  <a href="#typescript-sdk"><img alt="TypeScript-Typen enthalten" src="https://img.shields.io/npm/types/autotok"></a>
  <a href="https://pkg.go.dev/github.com/makiisthenes/TiktokAutoUploader/go"><img alt="Go-Referenz" src="https://pkg.go.dev/badge/github.com/makiisthenes/TiktokAutoUploader/go.svg"></a>
  <a href="https://github.com/makiisthenes/TiktokAutoUploader/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/makiisthenes/TiktokAutoUploader/actions/workflows/ci.yml/badge.svg"></a>
  <a href="LICENSE"><img alt="Lizenz: AGPL-3.0" src="https://img.shields.io/badge/license-AGPL--3.0-blue"></a>
  <a href="https://www.linkedin.com/in/michael-p-88b015200/"><img alt="LinkedIn" src="https://img.shields.io/badge/LinkedIn-0077B5?style=flat-square&logo=linkedin&logoColor=white"></a>
  <img alt="Stars" src="https://img.shields.io/github/stars/makiisthenes/TiktokAutoUploader">
  <img alt="Forks" src="https://img.shields.io/github/forks/makiisthenes/TiktokAutoUploader">
</p>

<p align="center">
  <a href="https://github.com/makiisthenes/TiktokAutoUploader/blob/main/docs/media/autotok-launch.mp4">
    <img src="https://raw.githubusercontent.com/makiisthenes/TiktokAutoUploader/main/docs/media/autotok-launch.webp" width="100%" alt="autotok in 38 Sekunden: einmal anmelden, dann lädt ein einziger Befehl dein Video auf TikTok hoch, sofort oder geplant, auf jeden deiner Accounts">
  </a>
</p>
<p align="center"><sub>Klick auf das Video, um es mit Ton anzusehen.</sub></p>

---

<a id="install"></a>

## Installation

**Kommandozeile und Python**

```bash
uv tool install "autotok[youtube]"
autotok install-browser                                   # one-time browser download, about 300 MB
```

Danach meldest du dich einmal pro Account an und lädst mit einem einzigen Befehl hoch:

```bash
autotok login -n my_account                               # log in on the page that opens; the QR code is quickest
autotok upload -u my_account -v clip.mp4 -t "Hello #fyp"
```

Kein uv? `pipx install "autotok[youtube]"` oder `pip install "autotok[youtube]"` funktionieren auch.
Unter [Erste Schritte](#getting-started) wird jeder Schritt erklärt, auch Proxys und Cloud-Browser.

**TypeScript und JavaScript (Node.js)**

```bash
npm install autotok
npx playwright install chromium                           # one-time browser download
```

```ts
import { login, uploadVideo } from "autotok";

await login("my_account");                                // once: log in on the page that opens
await uploadVideo("my_account", "clip.mp4", "Hello #fyp");
```

Typisiert, Promise-basiert, kein Python nötig, und es nutzt dieselben gespeicherten Accounts wie die CLI. Siehe
[TypeScript-SDK](#typescript-sdk).

**Go, oder ein einzelnes Binary ohne weitere Installation**

```bash
go install github.com/makiisthenes/TiktokAutoUploader/go/cmd/autotok@latest
```

oder lade das `autotok`-Binary für dein System aus den
[Releases](https://github.com/makiisthenes/TiktokAutoUploader/releases) herunter (die mit `go/v...`). Es
hat dieselben Befehle wie oben, braucht weder Python noch Node.js und nutzt das Chrome, das schon auf deinem
Rechner installiert ist. In Go-Code: `go get github.com/makiisthenes/TiktokAutoUploader/go`. Siehe
[Go](#go-sdk-and-single-binary).

**PHP, Java und C#**

Kleine Bibliotheken, die den Befehl `autotok` für dich ausführen und typisierte Ergebnisse und Fehler zurückgeben.
Installiere autotok wie oben beschrieben und lies dann [PHP, Java und C#](#php-java-and-c).

---

<a id="sponsors"></a>

## Sponsoren

<p align="center">
  <a href="https://www.swiftproxy.net/?ref=makiisthenes">
    <img src="https://github.com/user-attachments/assets/a1d0e915-e09a-4b36-ba72-788c4cc1e709" alt="Swiftproxy — über 90 Mio. Residential-Proxys" width="420">
  </a>
</p>

[**Swiftproxy**](https://www.swiftproxy.net/?ref=makiisthenes) bietet über 90 Mio. saubere Residential- und Static-Residential-Proxys, ausgelegt auf Social-Media-Automatisierung, Multi-Account-Management und Workflows zur Web-Automatisierung. Mit stabilen Verbindungen, weltweiter IP-Abdeckung und zuverlässiger Proxy-Infrastruktur hilft Swiftproxy dabei, mehrere Accounts sicher zu verwalten, IP-bedingte Einschränkungen zu verringern und Automatisierungsaufgaben zu skalieren. Residential-Proxy-Traffic verfällt nicht, bis er verbraucht ist, und ein kostenloser Test ist möglich.

> **10 % Rabatt** mit dem Code `PROXY90` — [Proxys bei Swiftproxy holen →](https://www.swiftproxy.net/?ref=makiisthenes)

<br>

<p align="center">
  <a href="https://termius.com/">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/makiisthenes/TiktokAutoUploader/main/docs/images/termius-logo-white.png">
      <img src="https://raw.githubusercontent.com/makiisthenes/TiktokAutoUploader/main/docs/images/termius-logo.png" alt="Termius" width="300">
    </picture>
  </a>
</p>

[**Termius**](https://termius.com/) bietet einen sicheren, zuverlässigen SSH-Client für die Zusammenarbeit im Team.

> [Termius holen →](https://termius.com/)

---

<a id="getting-started"></a>

## Erste Schritte

Die Einrichtung dauert etwa fünf Minuten. Nach der Installation (Schritt 1) kannst du `autotok setup` ausführen, das dich
durch den Rest führt: Es prüft den Browser, fragt nach einem Proxy und testet ihn und meldet dich dann darüber
bei TikTok an. Die folgenden Schritte machen dasselbe von Hand.

<a id="1-install-autotok"></a>

### 1. autotok installieren

```bash
uv tool install "autotok[youtube]"
```

Das war's: `autotok` ist jetzt ein Befehl, den du in jedem Terminal ausführen kannst (prüfen mit `autotok --version`).
uv hält autotok getrennt von deinen anderen Python-Paketen und lädt Python für dich herunter, falls es noch
nicht installiert ist.

Kein uv? Installiere es mit einer Zeile von [docs.astral.sh/uv](https://docs.astral.sh/uv/getting-started/installation/)
oder nimm [pipx](https://pipx.pypa.io): `pipx install "autotok[youtube]"`.

- Später aktualisieren: `uv tool upgrade autotok`.
- Ohne Installation ausprobieren: `uvx --from "autotok[youtube]" autotok --version`.
- Du nutzt autotok aus Python-Code? Füge es deinem Projekt hinzu: `uv add "autotok[youtube]"` oder
  `pip install "autotok[youtube]"`.
- Du nutzt TypeScript oder JavaScript? Dann stattdessen `npm install autotok`, siehe [TypeScript-SDK](#typescript-sdk).
  Im Code ersetzen `login()` und `uploadVideo()` die Befehle aus Schritt 3 und 4.
- Du kannst kein Python installieren oder schreibst Go? Nimm stattdessen das einzelne `autotok`-Binary aus den
  [Releases](https://github.com/makiisthenes/TiktokAutoUploader/releases): Die folgenden Schritte
  sind dieselben. Siehe [Go](#go-sdk-and-single-binary).
- `[youtube]` ergänzt die Unterstützung für YouTube-Links. Lass es weg, wenn du sie nicht brauchst.
- `autotok` „not recognized“ oder „command not found“? Führe einmal `uv tool update-shell` aus und öffne ein neues
  Terminal.

<a id="2-choose-where-the-browser-runs"></a>

### 2. Festlegen, wo der Browser läuft

autotok braucht einen Browser für den einmaligen Login und zum Signieren jedes Uploads. Wähle eine Option:

| Option | Ideal für | Einrichtung |
|---|---|---|
| **Lokal** (Standard) | Deinen eigenen Rechner | `autotok install-browser`, ein einmaliger Download von etwa 300 MB |
| **Cloud** ([Browserbase](https://www.browserbase.com) oder [Steel](https://github.com/steel-dev/steel-browser)) | Server, Docker, oder wenn dein Rechner frei bleiben soll | Einen API-Key in eine Einstellungsdatei eintragen. Siehe [Cloud-Browser](#cloud-browsers-browserbase-steel) |

Für den lokalen Browser auf einem frisch aufgesetzten Linux-Server führst du `autotok install-browser --with-deps` als root aus;
das installiert auch die Systembibliotheken von Chromium.

<a id="3-log-in-to-tiktok-once-per-account"></a>

### 3. Bei TikTok anmelden (einmal pro Account)

```bash
autotok login -n my_account
```

Ein Browserfenster mit der Login-Seite von TikTok öffnet sich. Melde dich an, wie du willst; am schnellsten geht es
mit dem QR-Code und der TikTok-App auf deinem Handy. Das Fenster schließt sich von selbst und die Session wird als `my_account` gespeichert.
Mit einem Cloud-Browser bekommst du stattdessen einen Link, den du öffnest.

```bash
autotok accounts check my_account     # confirms TikTok accepts the saved session
```

- Willst du für diesen Account einen Proxy nutzen? Gib ihn gleich jetzt an, damit Login und spätere Uploads dieselbe IP verwenden:
  `autotok login -n my_account -p http://user:pass@host:port` (siehe [Proxys](#proxies)).
- Wiederhole das für jeden Account mit einem anderen Namen bei `-n`.
- Sessions werden in `~/.autotok/accounts` gespeichert. Behandle sie wie Passwörter.

<a id="4-upload"></a>

### 4. Hochladen

```bash
autotok upload -u my_account -v "C:\Videos\clip.mp4" -t "My caption #fyp"
```

Das war's. Weitere Beispiele:

```bash
autotok upload -u my_account -v clip.mp4 -t "Just for me" -vi 1                 # private
autotok upload -u my_account -v clip.mp4 -t "Later #fyp" -sc 3600               # publish in 1 hour
autotok upload -u my_account -yt "https://www.youtube.com/shorts/xxxxxxxxxxx" -t "Caption"
```

`-v` nimmt einen Pfad zu einem beliebigen Video, oder nur einen Dateinamen, wenn das Video in `~/.autotok/videos` liegt. Alle
Optionen findest du in der [CLI-Referenz](#cli-reference).

<a id="5-optional-save-your-settings-in-a-file"></a>

### 5. Optional: Einstellungen in einer Datei speichern

Einstellungen wie ein Cloud-Browser oder dessen API-Key kommen in eine `.env`-Datei. autotok sucht zuerst in dem Ordner,
aus dem du es startest, dann in `~/.autotok/.env`; der zweite Ort funktioniert aus jedem Ordner. Kopiere
[`.env.example`](.env.example) (aus diesem Repository) oder fang nur mit dem an, was du brauchst:

```bash
# ~/.autotok/.env   (Windows: C:\Users\<you>\.autotok\.env)
AUTOTOK_BROWSER=browserbase
BROWSERBASE_API_KEY=bb_live_...
```

<a id="where-next"></a>

### Wie geht's weiter?

| Ich möchte ... | Siehe |
|---|---|
| Mehrere Accounts betreiben, jeden mit eigener IP | [Proxys](#proxies) |
| Keinen Browser auf meinem Rechner laufen lassen | [Cloud-Browser](#cloud-browsers-browserbase-steel) |
| Aus Python-Code hochladen | [Python-SDK](#python-sdk) |
| Aus TypeScript oder JavaScript hochladen | [TypeScript-SDK](#typescript-sdk) |
| Aus Go hochladen oder ein einzelnes Binary ohne Python nutzen | [Go](#go-sdk-and-single-binary) |
| Aus PHP, Java oder C# hochladen | [PHP, Java und C#](#php-java-and-c) |
| Einen KI-Agenten (Claude, Cursor ...) für mich hochladen lassen | [MCP-Server](#mcp-server-ai-agents) |
| Hochladen, indem ich Claude Code darum bitte, mit einem Skill | [Plugin für Claude Code](#claude-code-plugin) |
| Auf einem Server oder in einem Container laufen lassen | [Docker](#docker) |
| Ein Web-Dashboard mit Scheduler nutzen | [Web-App](#web-app-self-hosted) |
| Einen Fehler beheben | [Fehlerbehebung](#troubleshooting) |

---

<a id="features"></a>

## Funktionen

- **Uploads mit einem Befehl** über die Web-Upload-API von TikTok. Kein Durchklicken der TikTok-Website.
- **Proxy pro Account**: Login, Signieren der Requests und jeder Upload laufen über denselben Proxy, sodass jeder Account immer von derselben IP kommt. HTTP(S) und SOCKS5 werden unterstützt.
- **Mehrere Accounts**: einmal pro Account anmelden und per Name hochladen.
- **Planen**: Planung direkt bei TikTok, 15 Minuten bis 30 Tage im Voraus (bei manchen Accounts begrenzt TikTok das auf 10 Tage). Die selbst gehostete Web-App bringt zusätzlich einen Scheduler ohne Zeitlimit mit.
- **Post-Einstellungen**: öffentlich oder privat, dazu Kommentare, Duette, Stitches und das Label „KI-generiert“ ein oder aus.
- **Klickbare Hashtags und @-Erwähnungen**, auch mit Emojis.
- **YouTube-Links** werden automatisch mit [yt-dlp](https://github.com/yt-dlp/yt-dlp) heruntergeladen.
- **Python-SDK, CLI und eine optionale Web-App** (Docker) mit Login im Browser.
- **TypeScript-SDK** auf npm (`npm install autotok`): vollständig typisiert, Promise-basiert, kein Python nötig, und es
  nutzt dieselben gespeicherten Accounts wie die CLI.
- **Go-Paket und ein einzelnes Binary**: Hol dir die Bibliothek mit `go get` oder lade eine einzelne `autotok`-Programmdatei
  herunter, ganz ohne Python oder Node.js. Es nutzt dieselben gespeicherten Accounts wie die anderen Pakete.
- **Bibliotheken für PHP, Java und C#**, die den Befehl `autotok` steuern und typisierte Ergebnisse und
  Fehler zurückgeben, ohne weitere Abhängigkeiten.
- **MCP-Server**, damit KI-Agenten (Claude, Cursor, VS Code ...) für dich hochladen und planen können.
- **Plugin für Claude Code** mit einem Skill für TikTok-Uploads: Frag einfach in normalen Worten, und vor dem
  Posten wird um Bestätigung gebeten.
- **Cloud-Browser**: Lass den Browser für Login und Signieren auf [Browserbase](https://www.browserbase.com) oder [Steel](https://github.com/steel-dev/steel-browser) (Cloud oder selbst gehostet) statt auf deinem Rechner laufen.
- **Docker-Image**, um die CLI auf Servern zu betreiben.
- **Kein Node.js nötig** für das Python-Paket: Die Request-Signaturen von TikTok werden in einem Headless-Chromium berechnet.

---

<a id="proxies"></a>

## Proxys

Mehrere Accounts über eine einzige IP laufen zu lassen, ist der schnellste Weg, sie von TikTok markieren zu lassen. Mit autotok
bekommt jeder Account seinen eigenen Proxy, und der wird **überall** genutzt, wo dieser Account mit TikTok kommuniziert:

| Schritt | Läuft über den Proxy des Accounts |
|---|---|
| Login-Browser (`autotok login`, Login in der Web-App) | ✅ |
| Abruf der Signaturseite | ✅ (der Signier-Browser selbst stellt keine Netzwerkanfragen) |
| Upload-API-Aufrufe und Videoübertragung | ✅ |
| YouTube-Downloads | ❌ (kein TikTok-Traffic; spart Proxy-Bandbreite) |

**Proxys festlegen, ändern und testen**

`autotok setup` fragt nach dem Proxy, testet ihn und meldet dich darüber an. Von Hand geht es so:

```bash
autotok login -n alice -p http://user:pass@gate.example.com:7000   # set at login
autotok proxy set alice socks5://user:pass@gate.example.com:1080     # set or change later
autotok proxy test -u alice                                          # shows the IP TikTok will see
autotok proxy clear alice                                            # go direct
autotok accounts list                                                # every account and its proxy (passwords hidden)

autotok upload -u alice -v clip.mp4 -t "hi" -p http://other:pass@host:8000   # one-off override
autotok upload -u alice -v clip.mp4 -t "hi" --no-proxy                       # ignore the saved proxy once
```

**Unterstützte Formate** (Standardschema ist `http`)

```
http://user:pass@host:port      https://user:pass@host:port
socks5://user:pass@host:port    host:port
user:pass@host:port             host:port:user:pass      ← the export format most providers use
```

**Tipps**

- Nimm **Residential- oder Mobile-Proxys**, einen pro Account, mit **Sticky Session** (stundenlang dieselbe
  IP). Ein Proxy, der bei jeder Anfrage die IP wechselt, lässt eine eingeloggte Session wie gekapert aussehen.
- Melde dich **über den Proxy** an, mit dem du auch hochlädst (`autotok login -p ...`). Login von zu Hause und
  Upload über einen Proxy passen nicht zusammen, und das sieht TikTok.
- Chromium kann keine SOCKS5-Proxys verwenden, die Benutzername und Passwort brauchen. Nimm für den Login den
  HTTP-Endpunkt deines Anbieters (Uploads funktionieren mit beiden).
- Passwörter werden nie ausgegeben: CLI und Web-App zeigen `http://user:****@host:port`.

Du brauchst Proxys? Schau bei unseren [Sponsoren](#sponsors) vorbei.

---

<a id="cloud-browsers-browserbase-steel"></a>

## Cloud-Browser (Browserbase, Steel)

autotok braucht an zwei Stellen einen Browser: für den einmaligen **Login** und zum **Signieren** jedes Uploads (die
Anti-Bot-Signaturen von TikTok werden in einer Browserseite berechnet). Standardmäßig ist das Chromium auf deinem Rechner.
Setze `AUTOTOK_BROWSER`, um den Browser stattdessen in der Cloud laufen zu lassen. Dann muss lokal nichts installiert
oder geöffnet werden, was das ideal für Server und Docker macht.

| `AUTOTOK_BROWSER` | Wo der Browser läuft | Einstellungen |
|---|---|---|
| `local` (Standard) | Chromium auf diesem Rechner | einmal `autotok install-browser` |
| `browserbase` | [Browserbase](https://www.browserbase.com) | `BROWSERBASE_API_KEY` (optional `BROWSERBASE_PROJECT_ID`, `BROWSERBASE_REGION`) |
| `steel` | [Steel Cloud](https://steel.dev) oder ein eigener Server mit [steel-browser](https://github.com/steel-dev/steel-browser) | Cloud: `STEEL_API_KEY`. Selbst gehostet: `STEEL_BASE_URL`, z. B. `http://localhost:3000` |

Trag die Einstellungen in deine `.env`-Datei ein (kopiere dazu [`.env.example`](.env.example)):

```bash
AUTOTOK_BROWSER=browserbase
BROWSERBASE_API_KEY=bb_live_...
```

Dann nutzt du autotok wie gewohnt:

```bash
autotok browser check                 # starts a session and shows the IP it browses from
autotok login -n alice -p http://user:pass@gate.example.com:7000
autotok upload -u alice -v clip.mp4 -t "Hello #fyp"
```

Oder wähle pro Befehl: `autotok --browser steel login -n alice`.

**Anmelden:** `autotok login` gibt einen Live-View-Link aus und öffnet ihn in deinem normalen Browser. Melde dich auf dieser
Seite bei TikTok an; sobald du drin bist, wird die Session gespeichert und der Cloud-Browser geschlossen.

**Selbst gehostetes Steel** ist kostenlos und Open Source:

```bash
docker run -p 3000:3000 -e DOMAIN=localhost:3000 ghcr.io/steel-dev/steel-browser
```

und in der `.env`:

```bash
AUTOTOK_BROWSER=steel
STEEL_BASE_URL=http://localhost:3000
```

Setze `DOMAIN` auf die Adresse, unter der du den Server erreichst. Ohne diese Angabe weist steel-browser die Browser an,
sich mit `0.0.0.0` zu verbinden, und die Live-View bleibt leer, sodass du dich nicht anmelden kannst. autotok warnt, wenn es
das erkennt. Ein selbst gehosteter steel-browser führt immer nur eine Session gleichzeitig aus.

Gut zu wissen:

- **Nutze bei Cloud-Logins einen Account-Proxy.** Der Proxy des Accounts wird auf die Login-Session in der Cloud
  angewendet, sodass TikTok beim Login und beim Upload dieselbe IP sieht. Ohne Proxy sieht TikTok den Login von der IP
  des Anbieters und die Uploads von deiner.
- **„Verify it's really you“** nach dem Login bedeutet, dass TikTok ein unbekanntes Gerät mit einer Rechenzentrums-IP
  gesehen hat. Du kannst die Prüfung in der Live-View abschließen, besser ist es aber, sie zu vermeiden: Nutze einen Account-Proxy, oder setze
  bei einem kostenpflichtigen Browserbase-Plan `BROWSERBASE_PROXY_COUNTRY=GB` (dein Land), um dich über die IP eines
  Privatanschlusses dort anzumelden. Im kostenlosen Plan vermeidest du mit `BROWSERBASE_REGION` auf der Region, die dir am nächsten liegt
  (z. B. `eu-central-1`), zumindest einen Login aus den USA.
- Die Live-View zeigt nur den TikTok-Tab, deshalb schließt autotok bei Cloud-Logins Popups wie „Continue with Google“.
  Nutze stattdessen den QR-Code, E-Mail/Benutzername oder Telefonnummer.
- Browserbase akzeptiert nur HTTP/HTTPS-Proxys, und eigene Proxys erfordern dort mindestens den Developer-Plan.
  Auch bei Steel Cloud brauchen eigene Proxys eventuell einen kostenpflichtigen Plan.
- Nur der Browser läuft in der Cloud. Die Videodatei geht weiterhin von deinem Rechner (über den
  Account-Proxy) direkt zu TikTok, daher bleibt die Cloud-Nutzung gering: eine kurze Session pro Login und
  pro Upload.
- Du willst einen anderen Anbieter? Leite eine Klasse von `autotok.browsers.CloudProvider` ab und rufe
  `autotok.browsers.register_provider("name", YourProvider)` auf.

---

<a id="python-sdk"></a>

## Python-SDK

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

Du hast schon ein `sessionid`-Cookie aus deinem Browser? Dann spar dir das Login-Fenster:

```python
autotok.import_session("alice", "<sessionid value>", datacenter="<tt-target-idc value>")
```

---

<a id="typescript-sdk"></a>

## TypeScript-SDK

Derselbe Uploader für TypeScript und JavaScript, auf npm als [`autotok`](https://www.npmjs.com/package/autotok).
Er läuft auf Node.js 22.12+, bringt Typen mit und braucht kein Python. Er liest und schreibt dasselbe
`~/.autotok/accounts`, sodass ein Account, bei dem du dich mit der CLI angemeldet hast, auch aus TypeScript funktioniert, und
umgekehrt.

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

- In deinem Editor ist alles typisiert: Optionen, Ergebnisse und jede Fehlerklasse.
- Das Video kann ein Pfad sein, ein Dateiname in `~/.autotok/videos` oder die Bytes des Videos (`Buffer`/`Uint8Array`).
- Funktioniert aus ES-Modulen und CommonJS (`require("autotok")`) sowie mit den TypeScript-Einstellungen `nodenext`,
  `node20` und `bundler`.
- Proxys, Cloud-Browser (`AUTOTOK_BROWSER`), die Konfigurationsvariablen und `.env`-Dateien funktionieren wie in dieser
  README beschrieben; rufe `loadEnv()` auf, um die `.env` einzulesen.
- Du hast schon ein `sessionid`-Cookie? `await importSession("alice", "<sessionid>", { datacenter: "<tt-target-idc>" })`.

Die vollständige API steht in [`js/README.md`](js/README.md). CLI, YouTube-Links, MCP-Server und
Web-App gibt es im Python-Paket.

---

<a id="go-sdk-and-single-binary"></a>

## Go-SDK und einzelnes Binary

autotok ist auch ein Go-Modul, das sich zu einem einzigen `autotok`-Binary bauen lässt, ganz ohne Python oder Node.js.
Das Binary hat dieselben Befehle und Flags wie die Python-CLI. Wie das TypeScript-Paket
liest und schreibt es dasselbe `~/.autotok/accounts`, sodass Accounts überall funktionieren.

```bash
go install github.com/makiisthenes/TiktokAutoUploader/go/cmd/autotok@latest   # or download a release binary
autotok login -n my_account
autotok upload -u my_account -v clip.mp4 -t "Hello #fyp"
```

Für Login und Signieren nutzt es das Chrome, Chromium oder Edge, das schon auf deinem Rechner ist, oder das
Chromium von Playwright, falls die anderen Pakete es installiert haben. Auf einem Rechner ohne beides führst du
`autotok install-browser` aus; das lädt Chrome for Testing herunter (etwa 200 MB, einmalig).

Aus Go-Code (Go 1.26+):

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

- Jeder Aufruf nimmt einen `context.Context` entgegen, sodass Uploads abgebrochen oder mit einer Deadline versehen werden können.
- Fehler sind typisiert (`*autotok.PublishError`, `*autotok.UploadError` ...) für `errors.As`.
- Proxys und Cloud-Browser (`AUTOTOK_BROWSER`) funktionieren wie in dieser README beschrieben. Der Login-Browser
  funktioniert auch mit SOCKS5-Proxys, die ein Passwort brauchen.
- YouTube-Links funktionieren, wenn [yt-dlp](https://github.com/yt-dlp/yt-dlp) installiert ist. Den
  Einrichtungsassistenten, die Shell und den MCP-Server gibt es nur im Python-Paket.

Die vollständige API steht in [`go/README.md`](go/README.md) und auf
[pkg.go.dev](https://pkg.go.dev/github.com/makiisthenes/TiktokAutoUploader/go).

---

<a id="php-java-and-c"></a>

## PHP, Java und C#

Kleine Bibliotheken für PHP, Java und .NET führen den Befehl `autotok` für dich aus (das Python-Paket oder
das Go-Binary) und machen aus seinen Antworten Objekte und typisierte Fehler. Sie nutzen dieselben gespeicherten
Accounts und Proxys und brauchen sonst nichts. Installiere autotok, melde dich einmal mit
`autotok login -n alice` an, und dann:

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

- Alle drei bieten dieselben Post-Einstellungen wie die CLI (Zeitplan, Sichtbarkeit, Kommentare, Duette,
  Stitches, KI-Label, Proxy), können Accounts auflisten und prüfen und werfen einen einzigen Exception-Typ mit
  `type` und `retryable` des autotok-Fehlers, sodass du weißt, wann ein erneuter Versuch nicht doppelt posten kann.
- Sie brauchen ein autotok mit [`--json`](#json-output) und `--title-file`: das Python-Paket nach
  2.1.0 oder das Go-Binary nach 0.1.0. Bis diese Versionen erschienen sind, installiere autotok aus diesem
  Repository: `uv tool install "autotok[youtube] @ git+https://github.com/makiisthenes/TiktokAutoUploader"`.
- Auf Packagist, Maven Central oder NuGet gibt es sie noch nicht; jede README erklärt, wie du die Bibliothek aus diesem
  Repository einbindest.
- Jede andere Sprache kann es genauso machen: `autotok --json upload ...` ausführen und eine Zeile
  [JSON](#json-output) lesen.

---

<a id="mcp-server-ai-agents"></a>

## MCP-Server (KI-Agenten)

autotok enthält einen [MCP](https://modelcontextprotocol.io)-Server, sodass KI-Agenten wie Claude,
Cursor oder VS Code Videos für dich hochladen und planen können. Er nutzt dieselben gespeicherten Accounts wie die CLI.

```bash
uv tool install "autotok[youtube,mcp]"    # or: pip install "autotok[youtube,mcp]"
```

**Claude Code**

```bash
claude mcp add autotok -- autotok mcp
```

**Claude Desktop, Cursor und andere Clients**: Füge das in die MCP-Einstellungen des Clients ein
(`claude_desktop_config.json`, `.cursor/mcp.json`, ...):

```json
{
  "mcpServers": {
    "autotok": { "command": "autotok", "args": ["mcp"] }
  }
}
```

Wenn der Client `autotok` nicht findet, verwende den vollständigen Pfad, den `which autotok` (Windows:
`where autotok`) ausgibt. Dann frag zum Beispiel: *„Lade clip.mp4 auf my_account hoch, mit der Caption
‚Hello #fyp‘, geplant für morgen um 18 Uhr.“*

| Tool | Was es macht |
|---|---|
| `list_accounts` | Gespeicherte Accounts, ob jeder angemeldet ist, und sein Proxy (maskiert) |
| `check_account` | Fragt bei TikTok nach, ob die Session eines Accounts noch funktioniert |
| `list_videos` | Dateien in deinem Videoordner |
| `upload_video` | Lädt eine Datei oder einen YouTube-Link hoch, postet sofort oder plant 15 Minuten bis 30 Tage im Voraus, mit denselben Post-Einstellungen wie die CLI |
| `login`, `login_status` | Startet einen Login. Du schließt ihn in dem Browserfenster ab, das sich öffnet (oder über den Link, den ein Cloud-Browser liefert) |
| `set_proxy`, `test_proxy` | Speichert oder entfernt den Proxy eines Accounts und zeigt die IP, die TikTok sehen wird |

- **Deine Sessions bleiben auf deinem Rechner.** Die Tools geben nie Cookies zurück, und Proxy-Passwörter
  werden maskiert.
- **Jeder Upload ist ein echter Post.** Die meisten Clients fragen vor jedem Tool-Aufruf nach; lass das für
  `upload_video` eingeschaltet. Ein Upload-Fehler, laut dem der Post *vielleicht existiert, vielleicht aber auch nicht*, sagt dem Agenten,
  es nicht erneut zu versuchen, damit nichts doppelt gepostet wird.
- **Timeouts führen nicht zu Duplikaten.** Wenn ein Client einen langen Upload aufgibt und
  `upload_video` erneut mit demselben Account, Video und derselben Caption aufruft, bekommt er das Ergebnis des ersten Uploads
  statt eines zweiten Posts. Clients, die Fortschrittsbenachrichtigungen unterstützen, warten in der Zwischenzeit weiter.
- **Streamable HTTP**: `autotok mcp --http` stellt `http://127.0.0.1:8000/mcp` bereit (ändern mit `--host`,
  `--port`). Es gibt keine Authentifizierung, also lass es auf localhost laufen oder setz deine eigene davor.

---

<a id="claude-code-plugin"></a>

## Plugin für Claude Code

Ein Plugin für [Claude Code](https://code.claude.com) mit dem Skill `tiktok-upload`, mit dem du
hochladen kannst, indem du einfach darum bittest:

> Poste ~/Videos/clip.mp4 morgen um 18 Uhr auf my_account, mit der Caption „Hinter den Kulissen 🎬 #fyp“.

```
/plugin marketplace add makiisthenes/TiktokAutoUploader
/plugin install autotok@autotok
```

Der Skill führt den Befehl `autotok` aus, also [installiere autotok](#install) und melde dich vorher an. Er wählt
den Account aus (oder meldet einen über ein Browserfenster an), zeigt Account, Video, Caption und Zeitpunkt,
fragt vor dem Posten nach, lädt dann hoch und erklärt eventuelle Fehler. Nur lesende Befehle, etwa das
Auflisten von Accounts, laufen ohne Berechtigungsabfrage. Ein Upload, der TikTok vielleicht erreicht hat, vielleicht aber auch nicht,
wird nie wiederholt, damit nichts doppelt gepostet wird. Du kannst den Skill auch direkt ausführen:
`/autotok:tiktok-upload clip.mp4 "Hello #fyp"`.

Mehr dazu in [`claude-plugin/README.md`](claude-plugin/README.md), auch dazu, wie du den Skill
ohne das Plugin nutzt.

---

<a id="cli-reference"></a>

## CLI-Referenz

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

Upload-Optionen:

| Flag | Beschreibung | Standard |
|---|---|---|
| `-u` / `--user` | Name des gespeicherten Accounts | *erforderlich* |
| `-v` / `--video` | Videodatei (Pfad oder Name in deinem Videoordner) | — |
| `-yt` / `--youtube` | YouTube-URL, die heruntergeladen und hochgeladen wird | — |
| `-t` / `--title` | Caption, bis zu 2200 Zeichen | *erforderlich* (oder `--title-file`) |
| `--title-file` | Caption aus einer UTF-8-Textdatei lesen, oder mit `-` von stdin | — |
| `-sc` / `--schedule` | In so vielen Sekunden ab jetzt veröffentlichen (900–2592000; manche Accounts erlauben nur bis 864000) | sofort |
| `-vi` / `--visibility` | `0` öffentlich, `1` privat | `0` |
| `-ct` / `--comment` | Kommentare erlauben (`0`/`1`) | `1` |
| `-d` / `--duet` | Duette erlauben (`0`/`1`) | `0` |
| `-st` / `--stitch` | Stitches erlauben (`0`/`1`) | `0` |
| `-ai` / `--ailabel` | Als KI-generiert kennzeichnen (`0`/`1`) | `0` |
| `-p` / `--proxy` | Proxy nur für diesen Upload | Proxy des Accounts |
| `--no-proxy` | Gespeicherten Proxy des Accounts ignorieren | — |

`python cli.py ...` in diesem Repository funktioniert weiterhin und entspricht `autotok ...`.

<a id="json-output"></a>

### JSON-Ausgabe

Für Skripte und andere Sprachen sorgt `--json` dafür, dass `upload` und `accounts` statt Text eine Zeile JSON auf
stdout ausgeben. Logs gehen weiterhin nach stderr. Die [Bibliotheken für PHP, Java und C#](#php-java-and-c)
nutzen das.

```bash
autotok --json upload -u alice -v clip.mp4 -t "Hello #fyp"
```

| Befehl | Ausgabe |
|---|---|
| `upload` | `{"video_id": "...", "creation_id": "...", "scheduled_for": "2026-11-02T18:30:00Z"}` (`null`, wenn sofort gepostet) |
| `accounts list` | `{"accounts": [{"name": "alice", "session": true, "proxy": "http://user:****@host:port"}]}` |
| `accounts check NAME` | `{"name": "alice", "session_ok": true}` (Exit-Status 1 bei `false`) |
| `accounts remove NAME` | `{"name": "alice", "removed": true}` (Exit-Status 1 bei `false`) |

Fehler geben `{"error": {"type": "PublishError", "message": "...", "retryable": false}}` aus, mit dem
üblichen Exit-Status (2 bei ungültiger Eingabe). `type` ist der Klassenname des Fehlers, etwa
`ValidationError`, `AccountNotFoundError`, `PublishError` oder `PublishUncertainError`. `retryable`
ist nur dann `true`, wenn nichts bis zum Veröffentlichungsschritt von TikTok gelangt ist, sodass ein erneutes Ausführen
nicht doppelt posten kann. Ein `PublishError` enthält außerdem `status_code` und `status_msg` von TikTok.
Fehler, die der Argument-Parser schon vor dem Ausführen des Befehls erkennt, etwa eine unbekannte
Option oder ein fehlender Account-Name, geben stattdessen einen Nutzungshinweis auf stderr aus, mit
Exit-Status 2. Behandle daher auch Ausgaben, die kein JSON sind, als Fehler.

---

<a id="docker"></a>

## Docker

Das `Dockerfile` im Repository baut die CLI inklusive Chromium:

```bash
docker build -t autotok .

docker run --rm -it -v autotok-data:/data autotok accounts list
docker run --rm -it -v autotok-data:/data -v "$PWD/videos:/data/videos" \
  autotok upload -u alice -v clip.mp4 -t "Hello #fyp"
```

Gespeicherte Accounts liegen in `/data`, also leg das in ein Volume. Container haben keinen Bildschirm, deshalb meldest du dich
über einen [Cloud-Browser](#cloud-browsers-browserbase-steel) an und öffnest den Link, den er ausgibt:

```bash
docker run --rm -it -v autotok-data:/data \
  -e AUTOTOK_BROWSER=browserbase -e BROWSERBASE_API_KEY=bb_live_... \
  autotok login -n alice -p http://user:pass@gate.example.com:7000
```

Du kannst auch ein Session-Cookie aus deinem eigenen Browser mit `login --sessionid ... --datacenter ...` speichern.

Du nutzt für alles einen Cloud-Browser? Dann bau ohne das lokale Chromium, für ein deutlich kleineres Image:
`docker build --build-arg INSTALL_BROWSER=false -t autotok:slim .`

---

<a id="web-app-self-hosted"></a>

## Web-App (selbst gehostet)

Ein lokales Control Panel mit Accounts, Proxys, Videobibliothek, Uploads und Scheduler, dazu ein
virtueller Browser zum Anmelden. Benötigt Docker.

```bash
git clone https://github.com/makiisthenes/TiktokAutoUploader.git
cd TiktokAutoUploader
docker compose up --build
```

Öffne <http://localhost:3000>. Die API-Dokumentation findest du unter <http://localhost:8000/docs>.

- **Accounts**: Füge Accounts hinzu, indem du dich über den eingebauten virtuellen Browser anmeldest (optional
  mit Proxy), und lege dann für jeden Account den Proxy fest, ändere oder teste ihn und prüfe seine Session.
- **Upload**: Datei hineinziehen, eine aus der Bibliothek wählen oder einen YouTube-Link einfügen. Sofort veröffentlichen oder
  für einen beliebigen Zeitpunkt planen.
- **Schedules**: Der Scheduler wiederholt nur Fehlschläge, die passiert sind, bevor irgendetwas TikTok erreicht hat,
  sodass ein Job nicht doppelt posten kann. Ein Job, der beim Veröffentlichen abgebrochen wurde, wird als *may already be
  posted* markiert, und bei einem erneuten Versuch wirst du gebeten, zuerst auf TikTok nachzusehen.

Die Daten liegen in `./data`. Um einen Account zu nutzen, bei dem du dich mit der CLI angemeldet hast, kopiere seine Datei in den
Speicher der App und klicke auf der Seite „Accounts“ auf **Import from disk**:

```bash
mkdir -p data/autotok/accounts && cp ~/.autotok/accounts/my_account.json data/autotok/accounts/
```

(Dateien, die die Container schreiben, gehören unter Linux root; nutze daher für Accounts, die du dort verwaltest, den
Login der Web-App selbst.)

Um Uploads mit einem Cloud-Browser zu signieren, trag `AUTOTOK_BROWSER` und die zugehörigen Einstellungen (siehe
[Cloud-Browser](#cloud-browsers-browserbase-steel)) in eine `.env`-Datei neben `docker-compose.yml` ein.
Der Login über die Web-App nutzt weiterhin deren eingebauten virtuellen Browser.

Skripte, die die API direkt aufrufen, müssen bei `POST`/`PATCH`/`DELETE`-Requests den Header `X-Requested-With: autotok`
mitschicken. Das verhindert, dass andere Webseiten die lokale API nutzen.
Außerdem antwortet die API nur auf `localhost` und `127.0.0.1`. Wenn du die App unter einem anderen Namen erreichst
(etwa hinter deinem eigenen Reverse Proxy), trag ihn in die `.env` ein: `AUTOTOK_ALLOWED_HOSTS=tiktok.home.lan`.

> Die Web-App hat keinen eigenen Login und lauscht nur auf `127.0.0.1`. Mach sie nicht aus dem
> Internet erreichbar.

---

<a id="configuration"></a>

## Konfiguration

Alles ist optional. Einstellungen kommen in eine `.env`-Datei: Kopiere [`.env.example`](.env.example) nach `.env`
und trag ein, was du nutzt. `autotok` liest `.env` aus dem Ordner, in dem du es ausführst, dann
`~/.autotok/.env`. Bereits in deiner Umgebung gesetzte Variablen haben Vorrang, und `docker compose`
liest dieselbe Datei. `.env` enthält API-Keys, also committe sie nie (sie steht in `.gitignore`).

| Variable | Zweck | Standard |
|---|---|---|
| `AUTOTOK_HOME` | Gespeicherte Accounts und Einstellungen | `~/.autotok` |
| `AUTOTOK_VIDEOS_DIR` | Videoordner und YouTube-Downloads | `$AUTOTOK_HOME/videos` |
| `AUTOTOK_BROWSER` | Wo die Browser für Login und Signieren laufen: `local`, `browserbase`, `steel` | `local` |
| `AUTOTOK_BROWSER_CHANNEL` | Einen installierten Browser nutzen, z. B. `chrome` | Chromium von Playwright |
| `AUTOTOK_BROWSER_PATH` | Vollständiger Pfad zu einem Chrome/Chromium-Binary | Chromium von Playwright |
| `BROWSERBASE_API_KEY`, `BROWSERBASE_PROJECT_ID`, `BROWSERBASE_REGION`, `BROWSERBASE_PROXY_COUNTRY` | Browserbase-Einstellungen | — |
| `STEEL_API_KEY`, `STEEL_BASE_URL`, `STEEL_CONNECT_URL` | Steel-Einstellungen (`STEEL_BASE_URL` für selbst gehostet) | Steel Cloud |

Account-Dateien enthalten deine TikTok-Session (gleichwertig mit deinem Passwort). Sie werden mit Berechtigungen nur für
den Eigentümer gespeichert; halte sie privat.

---

<a id="upgrading-from-tiktokautouploader-1x"></a>

## Upgrade von TiktokAutoUploader 1.x

- **Installation:** Folge den [Ersten Schritten](#getting-started) (`uv tool install "autotok[youtube]"`, dann `autotok install-browser`). Node.js und `npm install` werden nicht mehr benötigt.
- **Sessions:** Gespeicherte Sessions in `CookiesDir/` werden automatisch migriert, wenn du sie zum ersten Mal
  aus dem Repository-Ordner verwendest. Die Flags sind gleich geblieben, und `python cli.py` funktioniert weiterhin.
- **Planen:** `-sc` plant wieder direkt bei TikTok (15 Minuten bis 10 Tage). Die lokale
  Warteschlange aus 1.x (`cli.py schedule list|cancel`) befindet sich jetzt auf der Seite „Schedules“ der Web-App.
- **Bugfixes:** Die Einstellungen für Privatsphäre, Kommentare, Duette und Stitches werden jetzt tatsächlich angewendet. Frühere
  Versionen haben immer öffentlich gepostet, mit allem erlaubt. Hashtags sind wieder klickbar.
- **Entfernt:** `config.txt` und die ungenutzten Hilfsfunktionen zur Videobearbeitung mit ImageMagick.

---

<a id="troubleshooting"></a>

## Fehlerbehebung

| Problem | Lösung |
|---|---|
| `'autotok' is not recognized` / `command not found` | Führe einmal `uv tool update-shell` aus und öffne ein neues Terminal. Wenn du stattdessen mit pip installiert hast, nutze `python -m autotok ...` |
| `Chromium for Playwright is not installed` | `autotok install-browser` (auf Linux-Servern: `--with-deps` anhängen) |
| `TikTok rejected the session` / `session rejected` | `autotok login -n NAME --force` (prüfen mit `autotok accounts check NAME`) |
| `Invalid parameters (status_code=5)` | TikTok hat seine Upload-API geändert. Bitte [eröffne ein Issue](https://github.com/makiisthenes/TiktokAutoUploader/issues) mit der vollständigen Fehlermeldung. |
| `potential violation of our Community Guidelines` | TikTok hat den Inhalt dieses Videos blockiert; das ist kein Fehler des Tools. |
| Die Login-Seite lässt dich nicht anmelden / zeigt eine Captcha-Schleife | Probier dein installiertes Chrome: Trag `AUTOTOK_BROWSER_CHANNEL=chrome` in deine `.env` ein, oder kopiere das `sessionid`-Cookie aus deinem Browser und nutze `autotok login -n NAME --sessionid ...` |
| „Verify it's really you“ bei einem Cloud-Login | TikTok kennt die IP des Cloud-Browsers nicht. Schließ die Prüfung in der Live-View ab (wähle E-Mail) oder vermeide sie mit einem Proxy; siehe die Hinweise unter [Cloud-Browser](#cloud-browsers-browserbase-steel) |
| Live-View beim Cloud-Login bleibt leer (selbst gehostetes Steel) | Starte steel-browser mit `DOMAIN=localhost:3000` (seiner Adresse) neu |
| `Browserbase ... (HTTP 402): Proxies are not included in the free plan` | Entferne `BROWSERBASE_PROXY_COUNTRY` oder den Proxy des Accounts für Cloud-Logins, oder wechsle zu einem höheren Browserbase-Plan |
| Warnung `No TikTok datacenter cookie saved` | Melde dich erneut mit `autotok login` an oder übergib `--datacenter` zusammen mit `--sessionid` |
| `may or may not have been posted` | Die Verbindung ist beim Veröffentlichen abgebrochen. Prüfe den Account, bevor du es erneut versuchst, um ein Duplikat zu vermeiden. |

Siehe auch [Häufige Probleme](docs/common-problems.md).

---

<a id="professional-software-autotok-pro"></a>

## Professionelle Software (autotok Pro)

Trag dich in die Warteliste ein: https://forms.gle/M4KpdfruqCukQvj99

Wenn du nach etwas mehr suchst, das dich schneller ans Ziel bringt, biete ich Software an, die Folgendes kann:

- Mehr als 1000 Accounts verwalten
- Identische Videos automatisch auf mehrere Accounts hochladen
- Videos für mehrere Accounts planen, 20 Tage bis 2 Jahre im Voraus
- Videos automatisch von YouTube, X, Reddit und TikTok beziehen
- Upload-Pipelines einrichten, von der Quelle bis zum Upload-Zeitplan
- Metriken, die die aktuelle Performance dieser verschiedenen Accounts zeigen
- Persönlicher Support von mir bei allen Problemen, bis zu 3 Monate lang
- Proxy-Unterstützung, aufgeräumte und moderne Oberfläche

Die Software ist käuflich erhältlich. Bei Interesse schreib mir bitte an `michaelperes562@gmail.com` mit dem Betreff `Tiktok Bot Software`, sonst übersehe ich die E-Mail vielleicht.

---

<a id="licensing"></a>

## Lizenzierung

autotok steht unter einer **Dual-Lizenz**:

- **Open Source:** [GNU AGPL v3.0](LICENSE). Du darfst es frei nutzen, verändern und weitergeben. Wenn du eine
  veränderte Version verbreitest oder als Dienst für andere betreibst, musst du deinen Quellcode unter
  derselben Lizenz veröffentlichen.
- **Kommerziell:** Um autotok ohne die Pflichten der AGPL in Closed-Source-Produkte oder kostenpflichtige Dienste einzubauen,
  oder um autotok Pro zu nutzen, wende dich an `michaelperes562@gmail.com`.

Copyright © 2021–2026 Michael Peres. Releases vor 2.0.0 bleiben unter der Lizenz, unter der sie
veröffentlicht wurden. Die mitgelieferten Signierskripte sind Code von Drittanbietern, siehe
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Beiträge sind willkommen, zu den Bedingungen in
[CONTRIBUTING.md](CONTRIBUTING.md).

---

<a id="support-this-project"></a>

## Dieses Projekt unterstützen

Wenn dir die Arbeit gefällt, unterstütz mich gern über [Patreon](https://patreon.com/makiisthenes) oder [Ko-Fi](https://ko-fi.com/makiperes), oder gib dem Projekt einen Stern.

- Danke an [@DelvinBa](https://github.com/DelvinBa) für die Umstellung auf den neuen Upload-Endpunkt von TikTok. (09/12/2024)

<a id="bugs-and-issues"></a>

## Bugs und Probleme

Bitte melde Bugs im [Issues-Tab](https://github.com/makiisthenes/TiktokAutoUploader/issues) und nicht per E-Mail.
Sicherheitsprobleme meldest du stattdessen über einen privaten Report, wie in [SECURITY.md](SECURITY.md) beschrieben.

<a id="notes-and-terms"></a>

## Hinweise und Bedingungen

Dieses Projekt steht in keiner Verbindung zu TikTok. Automatisierte Uploads können gegen die Nutzungsbedingungen von TikTok verstoßen
und dazu führen, dass Accounts eingeschränkt oder gesperrt werden. Lade nur Inhalte hoch, an denen du die Rechte hast. Nutzung auf
eigene Gefahr.

<a id="star-history"></a>

## Star-Verlauf

[![Diagramm des Star-Verlaufs](https://api.star-history.com/svg?repos=makiisthenes/TiktokAutoUploader&type=Date)](https://star-history.com/#makiisthenes/TiktokAutoUploader&Date)
