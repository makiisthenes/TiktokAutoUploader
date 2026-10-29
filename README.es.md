# autotok — TikTok Auto Uploader

<p align="center">
  <a href="README.md">English</a> ·
  <a href="README.zh-CN.md">简体中文</a> ·
  <a href="README.zh-TW.md">繁體中文</a> ·
  <a href="README.ja.md">日本語</a> ·
  <a href="README.ko.md">한국어</a> ·
  <b>Español</b> ·
  <a href="README.pt-BR.md">Português (Brasil)</a> ·
  <a href="README.ru.md">Русский</a> ·
  <a href="README.fr.md">Français</a> ·
  <a href="README.de.md">Deutsch</a>
</p>

*Esta es una traducción del [README en inglés](README.md); si hay diferencias, la versión en inglés es la que está al día.*

<p align="center">
  <img src="https://user-images.githubusercontent.com/52138450/111885490-04ab6680-89c0-11eb-955a-f833577b4406.png" width="35%" alt="Logo de TiktokAutoUploader">
</p>

<p align="center">Sube y programa videos de TikTok desde la línea de comandos, Python, TypeScript, Go, PHP, Java o C#, con un proxy por cuenta.</p>
<p align="center"><code>uv tool install autotok</code> · <code>npm install autotok</code> · un solo inicio de sesión · un comando por subida</p>

<p align="center">
  <a href="https://pypi.org/project/autotok/"><img alt="PyPI" src="https://img.shields.io/pypi/v/autotok?label=pypi"></a>
  <a href="https://www.npmjs.com/package/autotok"><img alt="npm" src="https://img.shields.io/npm/v/autotok?label=npm"></a>
  <a href="#typescript-sdk"><img alt="Tipos de TypeScript incluidos" src="https://img.shields.io/npm/types/autotok"></a>
  <a href="https://pkg.go.dev/github.com/makiisthenes/TiktokAutoUploader/go"><img alt="Referencia de Go" src="https://pkg.go.dev/badge/github.com/makiisthenes/TiktokAutoUploader/go.svg"></a>
  <a href="https://github.com/makiisthenes/TiktokAutoUploader/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/makiisthenes/TiktokAutoUploader/actions/workflows/ci.yml/badge.svg"></a>
  <a href="LICENSE"><img alt="Licencia: AGPL-3.0" src="https://img.shields.io/badge/license-AGPL--3.0-blue"></a>
  <a href="https://www.linkedin.com/in/michael-p-88b015200/"><img alt="LinkedIn" src="https://img.shields.io/badge/LinkedIn-0077B5?style=flat-square&logo=linkedin&logoColor=white"></a>
  <img alt="Estrellas" src="https://img.shields.io/github/stars/makiisthenes/TiktokAutoUploader">
  <img alt="Forks" src="https://img.shields.io/github/forks/makiisthenes/TiktokAutoUploader">
</p>

<p align="center">
  <a href="https://github.com/makiisthenes/TiktokAutoUploader/blob/main/docs/media/autotok-launch.mp4">
    <img src="https://raw.githubusercontent.com/makiisthenes/TiktokAutoUploader/main/docs/media/autotok-launch.webp" width="100%" alt="autotok en 38 segundos: inicia sesión una vez y luego un solo comando sube tu video a TikTok, al momento o programado, en cualquiera de tus cuentas">
  </a>
</p>
<p align="center"><sub>Haz clic en el video para verlo con sonido.</sub></p>

---

<a id="install"></a>

## Instalación

**Línea de comandos y Python**

```bash
uv tool install "autotok[youtube]"
autotok install-browser                                   # one-time browser download, about 300 MB
```

Después, inicia sesión una vez por cuenta y sube videos con un solo comando:

```bash
autotok login -n my_account                               # log in on the page that opens; the QR code is quickest
autotok upload -u my_account -v clip.mp4 -t "Hello #fyp"
```

¿No tienes uv? `pipx install "autotok[youtube]"` o `pip install "autotok[youtube]"` también sirven.
En [Primeros pasos](#getting-started) se explica cada paso, incluidos los proxies y los navegadores en la nube.

**TypeScript y JavaScript (Node.js)**

```bash
npm install autotok
npx playwright install chromium                           # one-time browser download
```

```ts
import { login, uploadVideo } from "autotok";

await login("my_account");                                // once: log in on the page that opens
await uploadVideo("my_account", "clip.mp4", "Hello #fyp");
```

Con tipos, basado en promesas, sin necesidad de Python, y comparte las cuentas guardadas con la CLI.
Consulta el [SDK de TypeScript](#typescript-sdk).

**Go, o un único binario sin nada más que instalar**

```bash
go install github.com/makiisthenes/TiktokAutoUploader/go/cmd/autotok@latest
```

o descarga el binario `autotok` para tu sistema desde las
[releases](https://github.com/makiisthenes/TiktokAutoUploader/releases) (las `go/v...`). Tiene
los mismos comandos que arriba, no necesita Python ni Node.js y usa el Chrome que ya tienes en tu
equipo. En código Go: `go get github.com/makiisthenes/TiktokAutoUploader/go`. Consulta
[Go](#go-sdk-and-single-binary).

**PHP, Java y C#**

Pequeñas bibliotecas que ejecutan el comando `autotok` por ti y devuelven resultados y errores con tipos.
Instala autotok como se indica arriba y luego consulta [PHP, Java y C#](#php-java-and-c).

---

<a id="sponsors"></a>

## Patrocinadores

<p align="center">
  <a href="https://www.swiftproxy.net/?ref=makiisthenes">
    <img src="https://github.com/user-attachments/assets/a1d0e915-e09a-4b36-ba72-788c4cc1e709" alt="Swiftproxy — más de 90M de proxies residenciales" width="420">
  </a>
</p>

[**Swiftproxy**](https://www.swiftproxy.net/?ref=makiisthenes) ofrece más de 90M de proxies residenciales y residenciales estáticos limpios, pensados para la automatización de redes sociales, la gestión de varias cuentas y los flujos de automatización web. Con conexiones estables, cobertura de IP en todo el mundo y una infraestructura de proxies fiable, Swiftproxy ayuda a gestionar varias cuentas de forma segura, reducir las restricciones relacionadas con la IP y escalar las tareas de automatización. El tráfico de los proxies residenciales no caduca hasta que se consume, y se pueden probar gratis.

> **Obtén un 10 % de descuento** con el código `PROXY90` — [Consigue proxies de Swiftproxy →](https://www.swiftproxy.net/?ref=makiisthenes)

<br>

<p align="center">
  <a href="https://termius.com/">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/makiisthenes/TiktokAutoUploader/main/docs/images/termius-logo-white.png">
      <img src="https://raw.githubusercontent.com/makiisthenes/TiktokAutoUploader/main/docs/images/termius-logo.png" alt="Termius" width="300">
    </picture>
  </a>
</p>

[**Termius**](https://termius.com/) ofrece un cliente SSH seguro, fiable y colaborativo.

> [Consigue Termius →](https://termius.com/)

---

<a id="getting-started"></a>

## Primeros pasos

La configuración lleva unos cinco minutos. Después de instalar (paso 1), puedes ejecutar `autotok setup` para
que te guíe en el resto: comprueba el navegador, te pide un proxy y lo prueba, y luego inicia tu sesión en
TikTok a través de él. Los pasos siguientes hacen lo mismo a mano.

<a id="1-install-autotok"></a>

### 1. Instala autotok

```bash
uv tool install "autotok[youtube]"
```

Listo: `autotok` ya es un comando que puedes ejecutar desde cualquier terminal (compruébalo con `autotok --version`).
uv mantiene autotok separado de tus otros paquetes de Python y, si no tienes Python, lo descarga
por ti.

¿No tienes uv? Instálalo con una sola línea desde [docs.astral.sh/uv](https://docs.astral.sh/uv/getting-started/installation/)
o usa [pipx](https://pipx.pypa.io): `pipx install "autotok[youtube]"`.

- Para actualizar más adelante: `uv tool upgrade autotok`.
- Para probarlo sin instalarlo: `uvx --from "autotok[youtube]" autotok --version`.
- ¿Vas a usar autotok desde código Python? Añádelo a tu proyecto: `uv add "autotok[youtube]"` o
  `pip install "autotok[youtube]"`.
- ¿Usas TypeScript o JavaScript? Usa `npm install autotok` en su lugar; consulta el [SDK de TypeScript](#typescript-sdk).
  Desde el código, `login()` y `uploadVideo()` sustituyen a los comandos de los pasos 3 y 4.
- ¿No puedes instalar Python, o programas en Go? Usa en su lugar el binario único `autotok` de las
  [releases](https://github.com/makiisthenes/TiktokAutoUploader/releases): los pasos siguientes
  son los mismos. Consulta [Go](#go-sdk-and-single-binary).
- `[youtube]` añade compatibilidad con enlaces de YouTube. Omítelo si no lo necesitas.
- ¿`autotok` da "not recognized" o "command not found"? Ejecuta `uv tool update-shell` una vez y abre
  una terminal nueva.

<a id="2-choose-where-the-browser-runs"></a>

### 2. Elige dónde se ejecuta el navegador

autotok usa un navegador para el inicio de sesión, que se hace una sola vez, y para firmar cada subida. Elige una opción:

| Opción | Ideal para | Configuración |
|---|---|---|
| **Local** (predeterminado) | Tu propio equipo | `autotok install-browser`, una descarga única de unos 300 MB |
| **En la nube** ([Browserbase](https://www.browserbase.com) o [Steel](https://github.com/steel-dev/steel-browser)) | Servidores, Docker o dejar libre tu equipo | Añade una clave de API a un archivo de configuración. Consulta [Navegadores en la nube](#cloud-browsers-browserbase-steel) |

Para el navegador local en un servidor Linux recién instalado, ejecuta `autotok install-browser --with-deps` como root;
así también se instalan las bibliotecas del sistema que necesita Chromium.

<a id="3-log-in-to-tiktok-once-per-account"></a>

### 3. Inicia sesión en TikTok (una vez por cuenta)

```bash
autotok login -n my_account
```

Se abre una ventana del navegador en la página de inicio de sesión de TikTok. Inicia sesión como prefieras; lo más
rápido es el código QR con la app de TikTok en tu teléfono. La ventana se cierra sola y la sesión se guarda como `my_account`.
Con un navegador en la nube, en cambio, recibes un enlace para abrirlo.

```bash
autotok accounts check my_account     # confirms TikTok accepts the saved session
```

- ¿Vas a usar un proxy con esta cuenta? Indícalo ya, para que el inicio de sesión y las subidas posteriores compartan la misma IP:
  `autotok login -n my_account -p http://user:pass@host:port` (consulta [Proxies](#proxies)).
- Repite el proceso con un nombre `-n` distinto para cada cuenta.
- Las sesiones se guardan en `~/.autotok/accounts`. Trátalas como contraseñas.

<a id="4-upload"></a>

### 4. Sube un video

```bash
autotok upload -u my_account -v "C:\Videos\clip.mp4" -t "My caption #fyp"
```

Eso es todo. Más ejemplos:

```bash
autotok upload -u my_account -v clip.mp4 -t "Just for me" -vi 1                 # private
autotok upload -u my_account -v clip.mp4 -t "Later #fyp" -sc 3600               # publish in 1 hour
autotok upload -u my_account -yt "https://www.youtube.com/shorts/xxxxxxxxxxx" -t "Caption"
```

`-v` acepta la ruta de cualquier video, o solo el nombre del archivo si el video está en `~/.autotok/videos`. Consulta la
[referencia de la CLI](#cli-reference) para ver todas las opciones.

<a id="5-optional-save-your-settings-in-a-file"></a>

### 5. Opcional: guarda tu configuración en un archivo

Ajustes como el navegador en la nube o su clave de API van en un archivo `.env`. autotok busca primero en la carpeta
desde la que lo ejecutas y luego en `~/.autotok/.env`; esta segunda ubicación funciona desde cualquier carpeta. Copia
[`.env.example`](.env.example) (de este repositorio) o empieza solo con lo que necesites:

```bash
# ~/.autotok/.env   (Windows: C:\Users\<you>\.autotok\.env)
AUTOTOK_BROWSER=browserbase
BROWSERBASE_API_KEY=bb_live_...
```

<a id="where-next"></a>

### ¿Y ahora qué?

| Quiero... | Consulta |
|---|---|
| Usar varias cuentas, cada una con su propia IP | [Proxies](#proxies) |
| No ejecutar un navegador en mi equipo | [Navegadores en la nube](#cloud-browsers-browserbase-steel) |
| Subir videos desde código Python | [SDK de Python](#python-sdk) |
| Subir videos desde TypeScript o JavaScript | [SDK de TypeScript](#typescript-sdk) |
| Subir videos desde Go, o usar un único binario sin Python | [Go](#go-sdk-and-single-binary) |
| Subir videos desde PHP, Java o C# | [PHP, Java y C#](#php-java-and-c) |
| Que un agente de IA (Claude, Cursor...) suba videos por mí | [Servidor MCP](#mcp-server-ai-agents) |
| Subir videos pidiéndoselo a Claude Code, con una skill | [Plugin de Claude Code](#claude-code-plugin) |
| Ejecutarlo en un servidor o en un contenedor | [Docker](#docker) |
| Usar un panel web con un planificador | [App web](#web-app-self-hosted) |
| Solucionar un error | [Solución de problemas](#troubleshooting) |

---

<a id="features"></a>

## Características

- **Subidas con un solo comando** a través de la API de subida web de TikTok. Sin ir haciendo clic por el sitio web de TikTok.
- **Un proxy por cuenta**: el inicio de sesión, la firma de las solicitudes y cada subida pasan por el mismo proxy, así que cada cuenta siempre aparece desde la misma IP. Se admiten HTTP(S) y SOCKS5.
- **Varias cuentas**: inicia sesión una vez por cuenta y sube videos indicando su nombre.
- **Programación**: programación en el lado de TikTok, desde 15 minutos hasta 30 días de antelación (TikTok limita algunas cuentas a 10 días). La app web autoalojada añade un planificador sin límite de tiempo.
- **Ajustes de publicación**: pública o privada, y comentarios, dúos, stitches y la etiqueta de contenido generado por IA activados o desactivados.
- **Hashtags y @menciones que funcionan como enlaces**, sin problemas con los emojis.
- **Los enlaces de YouTube** se descargan automáticamente con [yt-dlp](https://github.com/yt-dlp/yt-dlp).
- **SDK de Python, CLI y una app web opcional** (Docker) con inicio de sesión desde el navegador.
- **SDK de TypeScript** en npm (`npm install autotok`): totalmente tipado, basado en promesas, sin necesidad de Python, y
  comparte las cuentas guardadas con la CLI.
- **Paquete de Go y un único binario**: instala la biblioteca con `go get` o descarga un solo ejecutable `autotok`
  sin Python ni Node.js. Comparte las cuentas guardadas con los demás paquetes.
- **Bibliotecas para PHP, Java y C#** que controlan el comando `autotok` y devuelven resultados y errores con
  tipos, sin otras dependencias.
- **Servidor MCP** para que los agentes de IA (Claude, Cursor, VS Code...) suban y programen videos por ti.
- **Plugin para Claude Code** con una skill para subir videos a TikTok: pídelo con tus propias palabras y te pedirá
  confirmación antes de publicar.
- **Navegadores en la nube**: ejecuta el navegador de inicio de sesión y de firma en [Browserbase](https://www.browserbase.com) o [Steel](https://github.com/steel-dev/steel-browser) (en la nube o autoalojado) en lugar de en tu equipo.
- **Imagen de Docker** para ejecutar la CLI en servidores.
- **No hace falta Node.js** para el paquete de Python: las firmas de las solicitudes de TikTok se calculan en Chromium en modo headless.

---

<a id="proxies"></a>

## Proxies

Usar varias cuentas desde una misma IP es la forma más rápida de que las marquen. autotok te permite asignar a
cada cuenta su propio proxy, y lo usa **en todas partes** donde esa cuenta se comunica con TikTok:

| Paso | Pasa por el proxy de la cuenta |
|---|---|
| Navegador de inicio de sesión (`autotok login`, inicio de sesión en la app web) | ✅ |
| Carga de la página de firma | ✅ (el propio navegador de firma no hace solicitudes de red) |
| Llamadas a la API de subida y transferencia del video | ✅ |
| Descargas de YouTube | ❌ (no es tráfico de TikTok; así se ahorra ancho de banda del proxy) |

**Configurar, cambiar y probar proxies**

`autotok setup` te pide el proxy, lo prueba e inicia sesión a través de él. Para hacerlo a mano:

```bash
autotok login -n alice -p http://user:pass@gate.example.com:7000   # set at login
autotok proxy set alice socks5://user:pass@gate.example.com:1080     # set or change later
autotok proxy test -u alice                                          # shows the IP TikTok will see
autotok proxy clear alice                                            # go direct
autotok accounts list                                                # every account and its proxy (passwords hidden)

autotok upload -u alice -v clip.mp4 -t "hi" -p http://other:pass@host:8000   # one-off override
autotok upload -u alice -v clip.mp4 -t "hi" --no-proxy                       # ignore the saved proxy once
```

**Formatos aceptados** (si no se indica el esquema, se usa `http`)

```
http://user:pass@host:port      https://user:pass@host:port
socks5://user:pass@host:port    host:port
user:pass@host:port             host:port:user:pass      ← the export format most providers use
```

**Consejos**

- Usa proxies **residenciales o móviles**, uno por cuenta, con **sesión fija** (*sticky session*: la misma IP
  durante horas). Un proxy que cambia de IP en cada solicitud hace que una sesión iniciada parezca secuestrada.
- Inicia sesión **a través del proxy** con el que vas a subir los videos (`autotok login -p ...`). Iniciar sesión desde casa y
  subir desde un proxy es una incoherencia que TikTok puede detectar.
- Chromium no puede usar proxies SOCKS5 que requieran usuario y contraseña. Para el inicio de sesión, usa el
  endpoint HTTP de tu proveedor (las subidas funcionan con cualquiera de los dos).
- Las contraseñas nunca se muestran: la CLI y la app web muestran `http://user:****@host:port`.

¿Necesitas proxies? Echa un vistazo a nuestros [patrocinadores](#sponsors).

---

<a id="cloud-browsers-browserbase-steel"></a>

## Navegadores en la nube (Browserbase, Steel)

autotok necesita un navegador en dos momentos: el **inicio de sesión**, que se hace una sola vez, y la **firma** de cada subida
(las firmas antibots de TikTok se calculan en una página del navegador). De forma predeterminada se usa Chromium en tu máquina.
Configura `AUTOTOK_BROWSER` para ejecutarlo en la nube. Así no hace falta instalar ni abrir nada en
local, lo que lo hace ideal para servidores y Docker.

| `AUTOTOK_BROWSER` | Dónde se ejecuta el navegador | Configuración |
|---|---|---|
| `local` (predeterminado) | Chromium en esta máquina | `autotok install-browser` una vez |
| `browserbase` | [Browserbase](https://www.browserbase.com) | `BROWSERBASE_API_KEY` (opcionales: `BROWSERBASE_PROJECT_ID`, `BROWSERBASE_REGION`) |
| `steel` | [Steel Cloud](https://steel.dev), o tu propio servidor [steel-browser](https://github.com/steel-dev/steel-browser) | En la nube: `STEEL_API_KEY`. Autoalojado: `STEEL_BASE_URL`, p. ej. `http://localhost:3000` |

Pon la configuración en tu archivo `.env` (copia [`.env.example`](.env.example)):

```bash
AUTOTOK_BROWSER=browserbase
BROWSERBASE_API_KEY=bb_live_...
```

Después, usa autotok como siempre:

```bash
autotok browser check                 # starts a session and shows the IP it browses from
autotok login -n alice -p http://user:pass@gate.example.com:7000
autotok upload -u alice -v clip.mp4 -t "Hello #fyp"
```

O elígelo en cada comando: `autotok --browser steel login -n alice`.

**Inicio de sesión:** `autotok login` muestra un enlace a la vista en vivo y lo abre en tu navegador habitual. Inicia sesión en
TikTok en esa página; la sesión se guarda en cuanto entras y el navegador en la nube se cierra.

**Steel autoalojado** es gratuito y de código abierto:

```bash
docker run -p 3000:3000 -e DOMAIN=localhost:3000 ghcr.io/steel-dev/steel-browser
```

y en `.env`:

```bash
AUTOTOK_BROWSER=steel
STEEL_BASE_URL=http://localhost:3000
```

Asigna a `DOMAIN` la dirección con la que accedes al servidor. Sin ella, steel-browser indica a los navegadores que se
conecten a `0.0.0.0` y su vista en vivo se queda en blanco, así que no puedes iniciar sesión. autotok te avisa cuando lo detecta.
Un steel-browser autoalojado ejecuta una sola sesión a la vez.

Conviene saber:

- **Usa un proxy de cuenta con los inicios de sesión en la nube.** El proxy de la cuenta se aplica a la sesión del navegador en la nube
  con la que inicias sesión, así que TikTok ve la misma IP al iniciar sesión y al subir. Sin él, TikTok ve que el inicio de sesión llega
  desde la IP del proveedor y las subidas desde la tuya.
- **"Verify it's really you"** después de iniciar sesión significa que TikTok vio un dispositivo desconocido con una IP de centro
  de datos. Puedes completar la verificación en la vista en vivo, pero es mejor evitarla: usa un proxy de cuenta o, con un plan
  de pago de Browserbase, configura `BROWSERBASE_PROXY_COUNTRY=GB` (tu país) para iniciar sesión a través de una IP doméstica
  de ese país. Con el plan gratuito, asignar a `BROWSERBASE_REGION` la región más cercana a ti
  (p. ej. `eu-central-1`) al menos evita un inicio de sesión desde EE. UU.
- La vista en vivo solo muestra la pestaña de TikTok, así que autotok cierra ventanas emergentes como "Continue with Google"
  durante los inicios de sesión en la nube. Usa en su lugar el código QR, el correo electrónico/nombre de usuario o el teléfono.
- Browserbase solo admite proxies HTTP/HTTPS, y los proxies personalizados requieren su plan Developer o superior.
  En Steel Cloud, los proxies personalizados también pueden requerir un plan de pago.
- Solo el navegador se ejecuta en la nube. El archivo de video sigue yendo desde tu máquina (a través del
  proxy de la cuenta) directamente a TikTok, así que el uso de la nube es reducido: una sesión corta por cada inicio de sesión y
  por cada subida.
- ¿Quieres otro proveedor? Crea una subclase de `autotok.browsers.CloudProvider` y llama a
  `autotok.browsers.register_provider("name", YourProvider)`.

---

<a id="python-sdk"></a>

## SDK de Python

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

¿Ya tienes una cookie `sessionid` de tu navegador? Sáltate la ventana de inicio de sesión:

```python
autotok.import_session("alice", "<sessionid value>", datacenter="<tt-target-idc value>")
```

---

<a id="typescript-sdk"></a>

## SDK de TypeScript

La misma herramienta de subida para TypeScript y JavaScript, publicada en npm como [`autotok`](https://www.npmjs.com/package/autotok).
Funciona con Node.js 22.12+, incluye los tipos y no necesita Python. Lee y escribe en el mismo
`~/.autotok/accounts`, así que una cuenta con la que inicias sesión desde la CLI también funciona desde TypeScript, y
viceversa.

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

- En tu editor todo tiene tipos: las opciones, los resultados y todas las clases de error.
- El video puede ser una ruta, un nombre de archivo en `~/.autotok/videos` o los bytes del video (`Buffer`/`Uint8Array`).
- Funciona desde módulos ES y CommonJS (`require("autotok")`), y con las opciones `nodenext`,
  `node20` y `bundler` de TypeScript.
- Los proxies, los navegadores en la nube (`AUTOTOK_BROWSER`), las variables de configuración y los archivos `.env` funcionan
  como se describe en este README; llama a `loadEnv()` para leer `.env`.
- ¿Ya tienes una cookie `sessionid`? `await importSession("alice", "<sessionid>", { datacenter: "<tt-target-idc>" })`.

La API completa está en [`js/README.md`](js/README.md). La CLI, los enlaces de YouTube, el servidor MCP y la
app web están en el paquete de Python.

---

<a id="go-sdk-and-single-binary"></a>

## SDK de Go y binario único

autotok también es un módulo de Go, que se compila en un único binario `autotok` sin necesidad de Python ni
Node.js. El binario tiene los mismos comandos y opciones que la CLI de Python. Al igual que el paquete de
TypeScript, lee y escribe en el mismo `~/.autotok/accounts`, así que las cuentas funcionan en todas partes.

```bash
go install github.com/makiisthenes/TiktokAutoUploader/go/cmd/autotok@latest   # or download a release binary
autotok login -n my_account
autotok upload -u my_account -v clip.mp4 -t "Hello #fyp"
```

Inicia sesión y firma con el Chrome, Chromium o Edge que ya tengas en tu equipo, o con el Chromium de
Playwright si lo instalaron los otros paquetes. En una máquina sin ninguno de ellos, ejecuta
`autotok install-browser`, que descarga Chrome for Testing (unos 200 MB, una sola vez).

Desde código Go (Go 1.26+):

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

- Todas las llamadas reciben un `context.Context`, así que las subidas se pueden cancelar o tener un plazo límite.
- Los errores tienen tipos (`*autotok.PublishError`, `*autotok.UploadError`...) para usarlos con `errors.As`.
- Los proxies y los navegadores en la nube (`AUTOTOK_BROWSER`) funcionan como se describe en este README. El navegador
  de inicio de sesión también funciona con proxies SOCKS5 que requieren contraseña.
- Los enlaces de YouTube funcionan si [yt-dlp](https://github.com/yt-dlp/yt-dlp) está instalado. El asistente
  de configuración, el shell y el servidor MCP solo están en el paquete de Python.

La API completa está en [`go/README.md`](go/README.md) y en
[pkg.go.dev](https://pkg.go.dev/github.com/makiisthenes/TiktokAutoUploader/go).

---

<a id="php-java-and-c"></a>

## PHP, Java y C#

Unas pequeñas bibliotecas para PHP, Java y .NET ejecutan el comando `autotok` por ti (el paquete de Python o
el binario de Go) y convierten sus respuestas en objetos y errores con tipos. Usan las mismas cuentas
guardadas y los mismos proxies, y no necesitan nada más. Instala autotok e inicia sesión una vez con
`autotok login -n alice`; después:

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

- Las tres tienen los mismos ajustes de publicación que la CLI (programación, visibilidad, comentarios, dúos,
  stitches, etiqueta de IA, proxy), permiten listar y comprobar cuentas, y lanzan un único tipo de excepción con
  el `type` y el `retryable` del error de autotok, para que sepas cuándo reintentar no puede publicar dos veces.
- Necesitan una versión de autotok con [`--json`](#json-output) y `--title-file`: el paquete de Python posterior a la
  2.1.0 o el binario de Go posterior a la 0.1.0. Hasta que se publiquen, instala autotok desde este
  repositorio: `uv tool install "autotok[youtube] @ git+https://github.com/makiisthenes/TiktokAutoUploader"`.
- Todavía no están en Packagist, Maven Central ni NuGet; el README de cada una explica cómo añadirla desde este
  repositorio.
- Cualquier otro lenguaje puede hacer lo mismo: ejecuta `autotok --json upload ...` y lee una línea de
  [JSON](#json-output).

---

<a id="mcp-server-ai-agents"></a>

## Servidor MCP (agentes de IA)

autotok incluye un servidor [MCP](https://modelcontextprotocol.io) para que agentes de IA como Claude,
Cursor o VS Code puedan subir y programar videos por ti. Usa las mismas cuentas guardadas que la CLI.

```bash
uv tool install "autotok[youtube,mcp]"    # or: pip install "autotok[youtube,mcp]"
```

**Claude Code**

```bash
claude mcp add autotok -- autotok mcp
```

**Claude Desktop, Cursor y otros clientes**: añade esto a la configuración MCP del cliente
(`claude_desktop_config.json`, `.cursor/mcp.json`, ...):

```json
{
  "mcpServers": {
    "autotok": { "command": "autotok", "args": ["mcp"] }
  }
}
```

Si el cliente no encuentra `autotok`, usa la ruta completa que muestra `which autotok` (en Windows:
`where autotok`). Después pide, por ejemplo: *"Sube clip.mp4 a my_account con la descripción
'Hello #fyp', programado para mañana a las 6 de la tarde."*

| Herramienta | Qué hace |
|---|---|
| `list_accounts` | Las cuentas guardadas, si cada una tiene la sesión iniciada y su proxy (enmascarado) |
| `check_account` | Pregunta a TikTok si la sesión de una cuenta sigue funcionando |
| `list_videos` | Los archivos de tu carpeta de videos |
| `upload_video` | Sube un archivo o un enlace de YouTube, lo publica al momento o lo programa con entre 15 minutos y 30 días de antelación, con los mismos ajustes de publicación que la CLI |
| `login`, `login_status` | Empieza un inicio de sesión. Lo terminas en la ventana del navegador que se abre (o en el enlace que te da un navegador en la nube) |
| `set_proxy`, `test_proxy` | Guarda o elimina el proxy de una cuenta y muestra la IP que verá TikTok |

- **Tus sesiones se quedan en tu equipo.** Las herramientas nunca devuelven cookies, y las contraseñas de los proxies
  se enmascaran.
- **Cada subida es una publicación real.** La mayoría de los clientes piden confirmación antes de cada llamada a una herramienta; mantén esa confirmación activada para
  `upload_video`. Un error de subida que dice que la publicación *puede que exista o puede que no* le indica al agente que no
  reintente, así que nada se publica dos veces.
- **Los tiempos de espera agotados no generan duplicados.** Si un cliente deja de esperar una subida larga y vuelve a llamar a
  `upload_video` con la misma cuenta, el mismo video y la misma descripción, recibe el resultado de la primera subida
  en lugar de una segunda publicación. Mientras tanto, los clientes que admiten notificaciones de progreso siguen esperando.
- **Streamable HTTP**: `autotok mcp --http` sirve en `http://127.0.0.1:8000/mcp` (se cambia con `--host` y
  `--port`). No tiene autenticación, así que mantenlo en localhost o detrás de una autenticación propia.

---

<a id="claude-code-plugin"></a>

## Plugin de Claude Code

Un plugin para [Claude Code](https://code.claude.com) con la skill `tiktok-upload`, para que puedas
subir videos con solo pedirlo:

> Publica ~/Videos/clip.mp4 en my_account con la descripción "Detrás de cámaras 🎬 #fyp", mañana a las 6 de la tarde.

```
/plugin marketplace add makiisthenes/TiktokAutoUploader
/plugin install autotok@autotok
```

La skill ejecuta el comando `autotok`, así que primero [instala autotok](#install) e inicia sesión. Elige
la cuenta (o inicia sesión en una a través de una ventana del navegador), muestra la cuenta, el video, la descripción y la hora,
y te pide confirmación antes de publicar; después sube el video y explica cualquier error. Solo los comandos de solo lectura, como
listar cuentas, se ejecutan sin pedir permiso. Una subida que puede haber llegado o no a
TikTok nunca se reintenta, así que nada se publica dos veces. También puedes ejecutarla directamente:
`/autotok:tiktok-upload clip.mp4 "Hello #fyp"`.

Más información en [`claude-plugin/README.md`](claude-plugin/README.md), incluido cómo usar la skill
sin el plugin.

---

<a id="cli-reference"></a>

## Referencia de la CLI

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

Opciones de subida:

| Opción | Descripción | Valor predeterminado |
|---|---|---|
| `-u` / `--user` | Nombre de la cuenta guardada | *obligatorio* |
| `-v` / `--video` | Archivo de video (ruta o nombre en tu carpeta de videos) | — |
| `-yt` / `--youtube` | URL de YouTube que se descarga y se sube | — |
| `-t` / `--title` | Descripción, hasta 2200 caracteres | *obligatorio* (o `--title-file`) |
| `--title-file` | Lee la descripción de un archivo de texto UTF-8, o de stdin con `-` | — |
| `-sc` / `--schedule` | Publica dentro de este número de segundos (900–2592000; algunas cuentas solo permiten hasta 864000) | ahora |
| `-vi` / `--visibility` | `0` pública, `1` privada | `0` |
| `-ct` / `--comment` | Permitir comentarios (`0`/`1`) | `1` |
| `-d` / `--duet` | Permitir dúos (`0`/`1`) | `0` |
| `-st` / `--stitch` | Permitir stitches (`0`/`1`) | `0` |
| `-ai` / `--ailabel` | Etiquetar como generado por IA (`0`/`1`) | `0` |
| `-p` / `--proxy` | Proxy solo para esta subida | proxy de la cuenta |
| `--no-proxy` | Ignora el proxy guardado de la cuenta | — |

`python cli.py ...` en este repositorio sigue funcionando y equivale a `autotok ...`.

<a id="json-output"></a>

### Salida JSON

Para scripts y otros lenguajes, `--json` hace que `upload` y `accounts` impriman una línea de JSON en
stdout en lugar de texto. Los logs siguen yendo a stderr. Las [bibliotecas de PHP, Java y C#](#php-java-and-c)
la usan.

```bash
autotok --json upload -u alice -v clip.mp4 -t "Hello #fyp"
```

| Comando | Imprime |
|---|---|
| `upload` | `{"video_id": "...", "creation_id": "...", "scheduled_for": "2026-11-02T18:30:00Z"}` (`null` si se publica al momento) |
| `accounts list` | `{"accounts": [{"name": "alice", "session": true, "proxy": "http://user:****@host:port"}]}` |
| `accounts check NAME` | `{"name": "alice", "session_ok": true}` (código de salida 1 si es `false`) |
| `accounts remove NAME` | `{"name": "alice", "removed": true}` (código de salida 1 si es `false`) |

Los errores imprimen `{"error": {"type": "PublishError", "message": "...", "retryable": false}}`, con el
código de salida habitual (2 si la entrada no es válida). `type` es el nombre de la clase del error, como
`ValidationError`, `AccountNotFoundError`, `PublishError` o `PublishUncertainError`. `retryable`
es `true` solo cuando nada llegó al paso de publicación de TikTok, así que volver a ejecutar el comando no puede publicar
dos veces. Un `PublishError` también incluye el `status_code` y el `status_msg` de TikTok.
Los errores que detecta el analizador de argumentos antes de ejecutar el comando, como una opción
desconocida o la falta del nombre de la cuenta, imprimen en su lugar el texto de uso en stderr, con estado
de salida 2, así que trata también como error cualquier salida que no sea JSON.

---

<a id="docker"></a>

## Docker

El `Dockerfile` del repositorio construye la CLI con Chromium incluido:

```bash
docker build -t autotok .

docker run --rm -it -v autotok-data:/data autotok accounts list
docker run --rm -it -v autotok-data:/data -v "$PWD/videos:/data/videos" \
  autotok upload -u alice -v clip.mp4 -t "Hello #fyp"
```

Las cuentas guardadas están en `/data`, así que conviene montarlo en un volumen. Como los contenedores no tienen pantalla, inicia sesión con un
[navegador en la nube](#cloud-browsers-browserbase-steel) y abre el enlace que muestra:

```bash
docker run --rm -it -v autotok-data:/data \
  -e AUTOTOK_BROWSER=browserbase -e BROWSERBASE_API_KEY=bb_live_... \
  autotok login -n alice -p http://user:pass@gate.example.com:7000
```

También puedes guardar una cookie de sesión de tu propio navegador con `login --sessionid ... --datacenter ...`.

¿Usas un navegador en la nube para todo? Construye la imagen sin el Chromium local para que sea mucho más pequeña:
`docker build --build-arg INSTALL_BROWSER=false -t autotok:slim .`

---

<a id="web-app-self-hosted"></a>

## App web (autoalojada)

Un panel de control local con cuentas, proxies, una biblioteca de videos, subidas y un planificador, además de un
navegador virtual para iniciar sesión. Requiere Docker.

```bash
git clone https://github.com/makiisthenes/TiktokAutoUploader.git
cd TiktokAutoUploader
docker compose up --build
```

Abre <http://localhost:3000>. La documentación de la API está en <http://localhost:8000/docs>.

- **Cuentas**: añade cuentas iniciando sesión a través del navegador virtual integrado (con un proxy
  opcional) y después configura, cambia o prueba el proxy de cada cuenta y comprueba su sesión.
- **Subir**: arrastra un archivo, elige uno de la biblioteca o pega un enlace de YouTube. Publica al momento o
  prográmalo para cuando quieras.
- **Programaciones**: el planificador solo reintenta los fallos que ocurrieron antes de que nada llegara a TikTok,
  así que una tarea no puede publicar dos veces. Una tarea que se interrumpió mientras se publicaba se marca como *may already be
  posted* (puede que ya esté publicada), y al reintentarla se te pide que antes lo compruebes en TikTok.

Los datos se guardan en `./data`. Para usar una cuenta con la que iniciaste sesión desde la CLI, copia su archivo al
almacén de la app y haz clic en **Import from disk** en la página Accounts:

```bash
mkdir -p data/autotok/accounts && cp ~/.autotok/accounts/my_account.json data/autotok/accounts/
```

(En Linux, los archivos que escriben los contenedores pertenecen a root, así que para las cuentas que gestiones
ahí usa el inicio de sesión de la propia app web.)

Para firmar las subidas con un navegador en la nube, pon `AUTOTOK_BROWSER` y su configuración (consulta
[Navegadores en la nube](#cloud-browsers-browserbase-steel)) en un archivo `.env` junto a `docker-compose.yml`.
El inicio de sesión a través de la app web sigue usando su navegador virtual integrado.

Los scripts que llaman directamente a la API deben enviar la cabecera `X-Requested-With: autotok` en las solicitudes
`POST`/`PATCH`/`DELETE`. Así se evita que otras páginas web usen la API local.
Además, la API solo responde a `localhost` y `127.0.0.1`. Si accedes a la app con otro nombre
(por ejemplo, detrás de tu propio proxy inverso), añádelo a `.env`: `AUTOTOK_ALLOWED_HOSTS=tiktok.home.lan`.

> La app web no tiene un inicio de sesión propio y solo escucha en `127.0.0.1`. No la expongas a
> internet.

---

<a id="configuration"></a>

## Configuración

Todo es opcional. Pon la configuración en un archivo `.env`: copia [`.env.example`](.env.example) a `.env`
y rellena lo que uses. `autotok` lee `.env` de la carpeta en la que lo ejecutas y luego
`~/.autotok/.env`. Las variables que ya están definidas en tu entorno tienen prioridad, y `docker compose`
lee el mismo archivo. `.env` contiene claves de API, así que nunca lo incluyas en un commit (está en `.gitignore`).

| Variable | Para qué sirve | Valor predeterminado |
|---|---|---|
| `AUTOTOK_HOME` | Cuentas guardadas y configuración | `~/.autotok` |
| `AUTOTOK_VIDEOS_DIR` | Carpeta de videos y descargas de YouTube | `$AUTOTOK_HOME/videos` |
| `AUTOTOK_BROWSER` | Dónde se ejecutan los navegadores de inicio de sesión/firma: `local`, `browserbase`, `steel` | `local` |
| `AUTOTOK_BROWSER_CHANNEL` | Usar un navegador instalado, p. ej. `chrome` | Chromium de Playwright |
| `AUTOTOK_BROWSER_PATH` | Ruta completa a un binario de Chrome/Chromium | Chromium de Playwright |
| `BROWSERBASE_API_KEY`, `BROWSERBASE_PROJECT_ID`, `BROWSERBASE_REGION`, `BROWSERBASE_PROXY_COUNTRY` | Configuración de Browserbase | — |
| `STEEL_API_KEY`, `STEEL_BASE_URL`, `STEEL_CONNECT_URL` | Configuración de Steel (`STEEL_BASE_URL` para la versión autoalojada) | Steel Cloud |

Los archivos de cuenta contienen tu sesión de TikTok (equivalen a tu contraseña). Se guardan con
permisos solo para el propietario; mantenlos en privado.

---

<a id="upgrading-from-tiktokautouploader-1x"></a>

## Actualizar desde TiktokAutoUploader 1.x

- **Instalación:** sigue [Primeros pasos](#getting-started) (`uv tool install "autotok[youtube]"` y luego `autotok install-browser`). Ya no se necesitan Node.js ni `npm install`.
- **Sesiones:** las sesiones guardadas en `CookiesDir/` se migran automáticamente la primera vez que las usas
  desde la carpeta del repositorio. Las opciones son las mismas y `python cli.py` sigue funcionando.
- **Programación:** `-sc` vuelve a programar en el lado de TikTok (de 15 minutos a 10 días). La cola local de la 1.x
  (`cli.py schedule list|cancel`) ahora está en la página Schedules de la app web.
- **Corrección de errores:** los ajustes de privacidad, comentarios, dúos y stitches ahora se aplican de verdad. Las
  versiones anteriores siempre publicaban en público y con todo permitido. Los hashtags vuelven a funcionar como enlaces.
- **Eliminado:** `config.txt` y las utilidades de edición de video con ImageMagick que no se usaban.

---

<a id="troubleshooting"></a>

## Solución de problemas

| Problema | Solución |
|---|---|
| `'autotok' is not recognized` / `command not found` | Ejecuta `uv tool update-shell` una vez y abre una terminal nueva. Si en cambio instalaste con pip, usa `python -m autotok ...` |
| `Chromium for Playwright is not installed` | `autotok install-browser` (en servidores Linux: añade `--with-deps`) |
| `TikTok rejected the session` / `session rejected` | `autotok login -n NAME --force` (compruébalo con `autotok accounts check NAME`) |
| `Invalid parameters (status_code=5)` | TikTok cambió su API de subida. Por favor, [abre un issue](https://github.com/makiisthenes/TiktokAutoUploader/issues) con el error completo. |
| `potential violation of our Community Guidelines` | TikTok bloqueó el contenido de ese video; no es un error de la herramienta. |
| La página de inicio de sesión no te deja entrar o muestra captchas en bucle | Prueba con el Chrome que tienes instalado: añade `AUTOTOK_BROWSER_CHANNEL=chrome` a tu `.env`, o copia la cookie `sessionid` de tu navegador y usa `autotok login -n NAME --sessionid ...` |
| "Verify it's really you" durante un inicio de sesión en la nube | TikTok no reconoce la IP del navegador en la nube. Complétalo en la vista en vivo (elige Email) o evítalo con un proxy; consulta las notas de [Navegadores en la nube](#cloud-browsers-browserbase-steel) |
| La vista en vivo del inicio de sesión en la nube está en blanco (Steel autoalojado) | Reinicia steel-browser con `DOMAIN=localhost:3000` (su dirección) |
| `Browserbase ... (HTTP 402): Proxies are not included in the free plan` | Quita `BROWSERBASE_PROXY_COUNTRY`, o el proxy de la cuenta para los inicios de sesión en la nube, o pasa a un plan superior de Browserbase |
| Aviso `No TikTok datacenter cookie saved` | Vuelve a iniciar sesión con `autotok login`, o pasa `--datacenter` junto con `--sessionid` |
| `may or may not have been posted` | La conexión se cortó durante la publicación. Revisa la cuenta antes de reintentar, para evitar un duplicado. |

Consulta también [Problemas frecuentes](docs/common-problems.md).

---

<a id="professional-software-autotok-pro"></a>

## Software profesional (autotok Pro)

Rellena el formulario de la lista de espera: https://forms.gle/M4KpdfruqCukQvj99

Si buscas algo más, que te lleve antes a tu objetivo, ofrezco un software que puede:

- Gestionar más de 1000 cuentas
- Subir automáticamente los mismos videos a varias cuentas
- Programar videos para varias cuentas, con entre 20 días y 2 años de antelación
- Obtener videos automáticamente de YouTube, X, Reddit y TikTok
- Configurar flujos de subida, desde el origen de los videos hasta la programación de las subidas
- Métricas para ver el rendimiento actual de las distintas cuentas
- Soporte personalizado por mi parte, durante un máximo de 3 meses, para cualquier problema que tengas
- Compatibilidad con proxies, interfaz limpia y moderna

Disponible para compra. Si te interesa, escríbeme a `michaelperes562@gmail.com` con el asunto `Tiktok Bot Software`; si no, puede que se me pase el correo.

---

<a id="licensing"></a>

## Licencia

autotok tiene **doble licencia**:

- **Código abierto:** [GNU AGPL v3.0](LICENSE). Úsalo, modifícalo y compártelo libremente. Si distribuyes una
  versión modificada, o la ofreces como servicio a terceros, debes publicar tu código fuente bajo la
  misma licencia.
- **Comercial:** para integrar autotok en productos de código cerrado o servicios de pago sin las obligaciones
  de la AGPL, o para usar autotok Pro, escribe a `michaelperes562@gmail.com`.

Copyright © 2021–2026 Michael Peres. Las versiones anteriores a la 2.0.0 siguen bajo la licencia con la que se
publicaron. Los scripts de firma incluidos son código de terceros; consulta
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Las contribuciones son bienvenidas según los términos de
[CONTRIBUTING.md](CONTRIBUTING.md).

---

<a id="support-this-project"></a>

## Apoya este proyecto

Si te gusta este trabajo, considera apoyarme en [Patreon](https://patreon.com/makiisthenes) o [Ko-Fi](https://ko-fi.com/makiperes), o darle una estrella al proyecto.

- Gracias a [@DelvinBa](https://github.com/DelvinBa) por la actualización al nuevo endpoint de subida de TikTok. (09/12/2024)

<a id="bugs-and-issues"></a>

## Errores e incidencias

Informa de los errores en la [pestaña de issues](https://github.com/makiisthenes/TiktokAutoUploader/issues) en lugar de por correo electrónico.
Los problemas de seguridad, en cambio, se comunican mediante un informe privado, como se describe en [SECURITY.md](SECURITY.md).

<a id="notes-and-terms"></a>

## Notas y condiciones

Este proyecto no está afiliado a TikTok. Automatizar las subidas puede infringir las condiciones del servicio de TikTok
y hacer que las cuentas se restrinjan o se bloqueen. Sube solo contenido sobre el que tengas los derechos. Úsalo bajo tu
propia responsabilidad.

<a id="star-history"></a>

## Historial de estrellas

[![Gráfico del historial de estrellas](https://api.star-history.com/svg?repos=makiisthenes/TiktokAutoUploader&type=Date)](https://star-history.com/#makiisthenes/TiktokAutoUploader&Date)
