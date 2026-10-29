# autotok — TikTok Auto Uploader

<p align="center">
  <a href="README.md">English</a> ·
  <a href="README.zh-CN.md">简体中文</a> ·
  <a href="README.zh-TW.md">繁體中文</a> ·
  <a href="README.ja.md">日本語</a> ·
  <a href="README.ko.md">한국어</a> ·
  <a href="README.es.md">Español</a> ·
  <b>Português (Brasil)</b> ·
  <a href="README.ru.md">Русский</a> ·
  <a href="README.fr.md">Français</a> ·
  <a href="README.de.md">Deutsch</a>
</p>

*Esta é uma tradução do [README em inglês](README.md); se houver diferenças, a versão em inglês é a que está atualizada.*

<p align="center">
  <img src="https://user-images.githubusercontent.com/52138450/111885490-04ab6680-89c0-11eb-955a-f833577b4406.png" width="35%" alt="Logo do TiktokAutoUploader">
</p>

<p align="center">Envie e agende vídeos no TikTok pela linha de comando, Python, TypeScript, Go, PHP, Java ou C#, com um proxy por conta.</p>
<p align="center"><code>uv tool install autotok</code> · <code>npm install autotok</code> · um login · um comando por upload</p>

<p align="center">
  <a href="https://pypi.org/project/autotok/"><img alt="PyPI" src="https://img.shields.io/pypi/v/autotok?label=pypi"></a>
  <a href="https://www.npmjs.com/package/autotok"><img alt="npm" src="https://img.shields.io/npm/v/autotok?label=npm"></a>
  <a href="#typescript-sdk"><img alt="Tipos TypeScript incluídos" src="https://img.shields.io/npm/types/autotok"></a>
  <a href="https://pkg.go.dev/github.com/makiisthenes/TiktokAutoUploader/go"><img alt="Referência do Go" src="https://pkg.go.dev/badge/github.com/makiisthenes/TiktokAutoUploader/go.svg"></a>
  <a href="https://github.com/makiisthenes/TiktokAutoUploader/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/makiisthenes/TiktokAutoUploader/actions/workflows/ci.yml/badge.svg"></a>
  <a href="LICENSE"><img alt="Licença: AGPL-3.0" src="https://img.shields.io/badge/license-AGPL--3.0-blue"></a>
  <a href="https://www.linkedin.com/in/michael-p-88b015200/"><img alt="LinkedIn" src="https://img.shields.io/badge/LinkedIn-0077B5?style=flat-square&logo=linkedin&logoColor=white"></a>
  <img alt="Estrelas" src="https://img.shields.io/github/stars/makiisthenes/TiktokAutoUploader">
  <img alt="Forks" src="https://img.shields.io/github/forks/makiisthenes/TiktokAutoUploader">
</p>

<p align="center">
  <a href="https://github.com/makiisthenes/TiktokAutoUploader/blob/main/docs/media/autotok-launch.mp4">
    <img src="https://raw.githubusercontent.com/makiisthenes/TiktokAutoUploader/main/docs/media/autotok-launch.webp" width="100%" alt="autotok em 38 segundos: faça login uma vez e depois um único comando envia seu vídeo para o TikTok, na hora ou agendado, em qualquer uma das suas contas">
  </a>
</p>
<p align="center"><sub>Clique no vídeo para assistir com som.</sub></p>

---

<a id="install"></a>

## Instalação

**Linha de comando e Python**

```bash
uv tool install "autotok[youtube]"
autotok install-browser                                   # one-time browser download, about 300 MB
```

Depois, faça login uma vez em cada conta e envie vídeos com um único comando:

```bash
autotok login -n my_account                               # log in on the page that opens; the QR code is quickest
autotok upload -u my_account -v clip.mp4 -t "Hello #fyp"
```

Não tem o uv? `pipx install "autotok[youtube]"` ou `pip install "autotok[youtube]"` também funcionam.
[Primeiros passos](#getting-started) explica cada etapa, incluindo proxies e navegadores na nuvem.

**TypeScript e JavaScript (Node.js)**

```bash
npm install autotok
npx playwright install chromium                           # one-time browser download
```

```ts
import { login, uploadVideo } from "autotok";

await login("my_account");                                // once: log in on the page that opens
await uploadVideo("my_account", "clip.mp4", "Hello #fyp");
```

Tipado, baseado em promises, sem precisar de Python, e compartilha as contas salvas com a CLI. Veja o
[SDK TypeScript](#typescript-sdk).

**Go, ou um único binário sem mais nada para instalar**

```bash
go install github.com/makiisthenes/TiktokAutoUploader/go/cmd/autotok@latest
```

ou baixe o binário `autotok` para o seu sistema nas
[releases](https://github.com/makiisthenes/TiktokAutoUploader/releases) (as que começam com `go/v...`).
Ele tem os mesmos comandos mostrados acima, não precisa de Python nem de Node.js e usa o Chrome que já
está no seu computador. Em código Go: `go get github.com/makiisthenes/TiktokAutoUploader/go`. Veja
[Go](#go-sdk-and-single-binary).

**PHP, Java e C#**

Bibliotecas pequenas que executam o comando `autotok` por você e devolvem resultados e erros tipados.
Instale o autotok como mostrado acima e depois veja [PHP, Java e C#](#php-java-and-c).

---

<a id="sponsors"></a>

## Patrocinadores

<p align="center">
  <a href="https://www.swiftproxy.net/?ref=makiisthenes">
    <img src="https://github.com/user-attachments/assets/a1d0e915-e09a-4b36-ba72-788c4cc1e709" alt="Swiftproxy — mais de 90 milhões de proxies residenciais" width="420">
  </a>
</p>

[**Swiftproxy**](https://www.swiftproxy.net/?ref=makiisthenes) oferece mais de 90 milhões de proxies residenciais e residenciais estáticos limpos, pensados para automação de redes sociais, gerenciamento de várias contas e fluxos de automação web. Com conexões estáveis, cobertura global de IPs e uma infraestrutura de proxy confiável, a Swiftproxy ajuda você a gerenciar várias contas com segurança, reduzir restrições ligadas ao IP e escalar suas automações. O tráfego de proxy residencial não expira até ser usado, e há teste gratuito disponível.

> **Ganhe 10% de desconto** com o código `PROXY90` — [Compre proxies na Swiftproxy →](https://www.swiftproxy.net/?ref=makiisthenes)

<br>

<p align="center">
  <a href="https://termius.com/">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/makiisthenes/TiktokAutoUploader/main/docs/images/termius-logo-white.png">
      <img src="https://raw.githubusercontent.com/makiisthenes/TiktokAutoUploader/main/docs/images/termius-logo.png" alt="Termius" width="300">
    </picture>
  </a>
</p>

[**Termius**](https://termius.com/) oferece um cliente SSH seguro, confiável e colaborativo.

> [Baixe o Termius →](https://termius.com/)

---

<a id="getting-started"></a>

## Primeiros passos

A configuração leva uns cinco minutos. Depois de instalar (etapa 1), você pode rodar `autotok setup` para
ser guiado pelo resto: ele verifica o navegador, pede um proxy e o testa, e depois faz o seu login no
TikTok através dele. As etapas abaixo fazem o mesmo manualmente.

<a id="1-install-autotok"></a>

### 1. Instale o autotok

```bash
uv tool install "autotok[youtube]"
```

Pronto: `autotok` agora é um comando que você pode rodar em qualquer terminal (confira com `autotok --version`).
O uv mantém o autotok separado dos seus outros pacotes Python e baixa o Python para você, caso ainda não
o tenha.

Não tem o uv? Instale com uma linha seguindo [docs.astral.sh/uv](https://docs.astral.sh/uv/getting-started/installation/),
ou use o [pipx](https://pipx.pypa.io): `pipx install "autotok[youtube]"`.

- Para atualizar depois: `uv tool upgrade autotok`.
- Para testar sem instalar: `uvx --from "autotok[youtube]" autotok --version`.
- Vai usar o autotok em código Python? Adicione-o ao seu projeto: `uv add "autotok[youtube]"` ou
  `pip install "autotok[youtube]"`.
- Usa TypeScript ou JavaScript? Rode `npm install autotok` no lugar disso e veja o [SDK TypeScript](#typescript-sdk).
  No código, `login()` e `uploadVideo()` substituem os comandos das etapas 3 e 4.
- Não pode instalar o Python, ou está programando em Go? Use o binário único `autotok` das
  [releases](https://github.com/makiisthenes/TiktokAutoUploader/releases): as etapas abaixo
  são as mesmas. Veja [Go](#go-sdk-and-single-binary).
- `[youtube]` adiciona suporte a links do YouTube. Pode deixar de fora se não precisar.
- O terminal diz que `autotok` está "not recognized" ou dá "command not found"? Rode `uv tool update-shell`
  uma vez e abra um novo terminal.

<a id="2-choose-where-the-browser-runs"></a>

### 2. Escolha onde o navegador roda

O autotok usa um navegador para o login (feito uma única vez) e para assinar cada upload. Escolha uma opção:

| Opção | Ideal para | Configuração |
|---|---|---|
| **Local** (padrão) | Seu próprio computador | `autotok install-browser`, um download único de cerca de 300 MB |
| **Nuvem** ([Browserbase](https://www.browserbase.com) ou [Steel](https://github.com/steel-dev/steel-browser)) | Servidores, Docker, ou para deixar seu computador livre | Adicione uma chave de API a um arquivo de configuração. Veja [Navegadores na nuvem](#cloud-browsers-browserbase-steel) |

Para usar o navegador local em um servidor Linux recém-instalado, rode `autotok install-browser --with-deps`
como root, o que também instala as bibliotecas de sistema do Chromium.

<a id="3-log-in-to-tiktok-once-per-account"></a>

### 3. Faça login no TikTok (uma vez por conta)

```bash
autotok login -n my_account
```

Uma janela do navegador abre na página de login do TikTok. Entre do jeito que preferir; o QR code com o app
do TikTok no celular é o mais rápido. A janela fecha sozinha e a sessão é salva como `my_account`.
Com um navegador na nuvem, você recebe um link para abrir.

```bash
autotok accounts check my_account     # confirms TikTok accepts the saved session
```

- Vai usar um proxy nessa conta? Passe-o agora, para que o login e os uploads futuros usem o mesmo IP:
  `autotok login -n my_account -p http://user:pass@host:port` (veja [Proxies](#proxies)).
- Repita com um nome `-n` diferente para cada conta.
- As sessões ficam salvas em `~/.autotok/accounts`. Trate-as como senhas.

<a id="4-upload"></a>

### 4. Faça o upload

```bash
autotok upload -u my_account -v "C:\Videos\clip.mp4" -t "My caption #fyp"
```

Pronto. Mais exemplos:

```bash
autotok upload -u my_account -v clip.mp4 -t "Just for me" -vi 1                 # private
autotok upload -u my_account -v clip.mp4 -t "Later #fyp" -sc 3600               # publish in 1 hour
autotok upload -u my_account -yt "https://www.youtube.com/shorts/xxxxxxxxxxx" -t "Caption"
```

`-v` aceita o caminho de qualquer vídeo, ou só o nome do arquivo se o vídeo estiver em `~/.autotok/videos`.
Veja a [referência da CLI](#cli-reference) para conhecer todas as opções.

<a id="5-optional-save-your-settings-in-a-file"></a>

### 5. Opcional: salve suas configurações em um arquivo

Configurações como um navegador na nuvem ou a chave de API dele ficam em um arquivo `.env`. O autotok procura
primeiro na pasta de onde você o executa e depois em `~/.autotok/.env`; o segundo local vale para qualquer
pasta. Copie o [`.env.example`](.env.example) (deste repositório) ou comece só com o que precisar:

```bash
# ~/.autotok/.env   (Windows: C:\Users\<you>\.autotok\.env)
AUTOTOK_BROWSER=browserbase
BROWSERBASE_API_KEY=bb_live_...
```

<a id="where-next"></a>

### Próximos passos

| Eu quero... | Veja |
|---|---|
| Rodar várias contas, cada uma com seu próprio IP | [Proxies](#proxies) |
| Não rodar um navegador no meu computador | [Navegadores na nuvem](#cloud-browsers-browserbase-steel) |
| Enviar vídeos a partir de código Python | [SDK Python](#python-sdk) |
| Enviar vídeos a partir de TypeScript ou JavaScript | [SDK TypeScript](#typescript-sdk) |
| Enviar vídeos a partir de Go, ou usar um único binário sem Python | [Go](#go-sdk-and-single-binary) |
| Enviar vídeos a partir de PHP, Java ou C# | [PHP, Java e C#](#php-java-and-c) |
| Deixar um agente de IA (Claude, Cursor...) fazer os uploads por mim | [Servidor MCP](#mcp-server-ai-agents) |
| Enviar vídeos pedindo ao Claude Code, com uma skill | [Plugin para o Claude Code](#claude-code-plugin) |
| Rodar em um servidor ou em um contêiner | [Docker](#docker) |
| Usar um painel web com agendador | [App web](#web-app-self-hosted) |
| Corrigir um erro | [Solução de problemas](#troubleshooting) |

---

<a id="features"></a>

## Recursos

- **Uploads com um único comando** pela API de upload web do TikTok. Nada de ficar clicando no site do TikTok.
- **Proxy por conta**: o login, a assinatura das requisições e todos os uploads passam pelo mesmo proxy, então cada conta sempre aparece com o mesmo IP. HTTP(S) e SOCKS5 são suportados.
- **Várias contas**: faça login uma vez em cada conta e envie vídeos usando o nome dela.
- **Agendamento**: agendamento feito pelo próprio TikTok, de 15 minutos a 30 dias de antecedência (o TikTok limita algumas contas a 10 dias). O app web self-hosted adiciona um agendador sem limite de tempo.
- **Configurações do post**: público ou privado, e comentários, duetos, costuras e o selo de conteúdo gerado por IA ativados ou desativados.
- **Hashtags e @menções clicáveis**, sem quebrar emojis.
- **Links do YouTube** são baixados automaticamente com o [yt-dlp](https://github.com/yt-dlp/yt-dlp).
- **SDK Python, CLI e um app web opcional** (Docker) com login pelo navegador.
- **SDK TypeScript** no npm (`npm install autotok`): totalmente tipado, baseado em promises, sem precisar de Python, e
  compartilha as contas salvas com a CLI.
- **Pacote Go e um binário único**: instale a biblioteca com `go get` ou baixe um único executável `autotok`,
  sem Python nem Node.js. Ele compartilha as contas salvas com os outros pacotes.
- **Bibliotecas para PHP, Java e C#** que controlam o comando `autotok` e retornam resultados e erros
  tipados, sem nenhuma outra dependência.
- **Servidor MCP** para que agentes de IA (Claude, Cursor, VS Code...) enviem e agendem vídeos por você.
- **Plugin para o Claude Code** com uma skill de upload para o TikTok: peça com suas próprias palavras, e ele
  confirma antes de postar.
- **Navegadores na nuvem**: rode o navegador de login e de assinatura no [Browserbase](https://www.browserbase.com) ou no [Steel](https://github.com/steel-dev/steel-browser) (na nuvem ou self-hosted) em vez de no seu computador.
- **Imagem Docker** para rodar a CLI em servidores.
- **Sem necessidade de Node.js** no pacote Python: as assinaturas de requisição do TikTok são calculadas em um Chromium headless.

---

<a id="proxies"></a>

## Proxies

Rodar várias contas a partir de um só IP é o jeito mais rápido de fazer com que sejam sinalizadas. O autotok
permite dar a cada conta o seu próprio proxy e o usa **em todo lugar** onde essa conta se comunica com o TikTok:

| Etapa | Passa pelo proxy da conta |
|---|---|
| Navegador de login (`autotok login`, login do app web) | ✅ |
| Carregamento da página de assinatura | ✅ (o próprio navegador de assinatura não faz nenhuma requisição de rede) |
| Chamadas à API de upload e transferência do vídeo | ✅ |
| Downloads do YouTube | ❌ (não é tráfego do TikTok; economiza banda do proxy) |

**Defina, altere e teste proxies**

O `autotok setup` pede o proxy, testa e faz login através dele. Para fazer manualmente:

```bash
autotok login -n alice -p http://user:pass@gate.example.com:7000   # set at login
autotok proxy set alice socks5://user:pass@gate.example.com:1080     # set or change later
autotok proxy test -u alice                                          # shows the IP TikTok will see
autotok proxy clear alice                                            # go direct
autotok accounts list                                                # every account and its proxy (passwords hidden)

autotok upload -u alice -v clip.mp4 -t "hi" -p http://other:pass@host:8000   # one-off override
autotok upload -u alice -v clip.mp4 -t "hi" --no-proxy                       # ignore the saved proxy once
```

**Formatos aceitos** (o esquema padrão é `http`)

```
http://user:pass@host:port      https://user:pass@host:port
socks5://user:pass@host:port    host:port
user:pass@host:port             host:port:user:pass      ← the export format most providers use
```

**Dicas**

- Use proxies **residenciais ou móveis**, um por conta, com **sessão fixa** (sticky session: o mesmo IP por
  horas). Um proxy que troca de IP a cada requisição faz uma sessão logada parecer sequestrada.
- Faça login **pelo mesmo proxy** que vai usar nos uploads (`autotok login -p ...`). Fazer login de casa e
  enviar por um proxy é uma inconsistência que o TikTok consegue perceber.
- O Chromium não consegue usar proxies SOCKS5 que exigem usuário e senha. Na etapa de login, use o endpoint
  HTTP do seu provedor (os uploads funcionam com qualquer um dos dois).
- As senhas nunca são exibidas: a CLI e o app web mostram `http://user:****@host:port`.

Precisa de proxies? Veja nossos [patrocinadores](#sponsors).

---

<a id="cloud-browsers-browserbase-steel"></a>

## Navegadores na nuvem (Browserbase, Steel)

O autotok precisa de um navegador em dois momentos: no **login** (feito uma vez só) e na **assinatura** de cada
upload (as assinaturas anti-bot do TikTok são calculadas em uma página do navegador). Por padrão, é o Chromium
da sua máquina. Defina `AUTOTOK_BROWSER` para rodá-lo na nuvem. Assim, nada precisa ser instalado nem aberto
localmente, o que é ideal para servidores e Docker.

| `AUTOTOK_BROWSER` | Onde o navegador roda | Configurações |
|---|---|---|
| `local` (padrão) | Chromium nesta máquina | `autotok install-browser` uma vez |
| `browserbase` | [Browserbase](https://www.browserbase.com) | `BROWSERBASE_API_KEY` (opcionais: `BROWSERBASE_PROJECT_ID`, `BROWSERBASE_REGION`) |
| `steel` | [Steel Cloud](https://steel.dev), ou o seu próprio servidor [steel-browser](https://github.com/steel-dev/steel-browser) | Nuvem: `STEEL_API_KEY`. Self-hosted: `STEEL_BASE_URL`, por exemplo `http://localhost:3000` |

Coloque as configurações no seu arquivo `.env` (copie o [`.env.example`](.env.example)):

```bash
AUTOTOK_BROWSER=browserbase
BROWSERBASE_API_KEY=bb_live_...
```

Depois, use o autotok normalmente:

```bash
autotok browser check                 # starts a session and shows the IP it browses from
autotok login -n alice -p http://user:pass@gate.example.com:7000
autotok upload -u alice -v clip.mp4 -t "Hello #fyp"
```

Ou escolha por comando: `autotok --browser steel login -n alice`.

**Login:** o `autotok login` exibe um link de visualização ao vivo e o abre no seu navegador normal. Faça login
no TikTok nessa página; a sessão é salva assim que você entra, e o navegador na nuvem é fechado.

O **Steel self-hosted** é gratuito e open source:

```bash
docker run -p 3000:3000 -e DOMAIN=localhost:3000 ghcr.io/steel-dev/steel-browser
```

e no `.env`:

```bash
AUTOTOK_BROWSER=steel
STEEL_BASE_URL=http://localhost:3000
```

Defina `DOMAIN` como o endereço pelo qual você acessa o servidor. Sem isso, o steel-browser manda os navegadores
se conectarem a `0.0.0.0` e a visualização ao vivo fica em branco, então não dá para fazer login. O autotok
avisa quando detecta isso. Um steel-browser self-hosted roda uma sessão por vez.

Bom saber:

- **Use um proxy na conta ao fazer login na nuvem.** O proxy da conta é aplicado à sessão de login na
  nuvem, então o TikTok vê o mesmo IP no login e no upload. Sem ele, o TikTok vê o login vindo do IP do
  provedor e os uploads vindo do seu.
- **"Verify it's really you"** depois do login significa que o TikTok viu um dispositivo desconhecido em um
  IP de datacenter. Você pode concluir a verificação na visualização ao vivo, mas é melhor evitá-la: use um
  proxy na conta ou, em um plano pago do Browserbase, defina `BROWSERBASE_PROXY_COUNTRY=GB` (o seu país) para
  fazer login por um IP residencial de lá. No plano gratuito, definir `BROWSERBASE_REGION` como a região mais
  próxima de você (por exemplo, `eu-central-1`) pelo menos evita um login vindo dos EUA.
- A visualização ao vivo mostra só a aba do TikTok, então o autotok fecha pop-ups como "Continuar com o Google"
  durante logins na nuvem. Use o QR code, e-mail/nome de usuário ou telefone.
- O Browserbase só aceita proxies HTTP/HTTPS, e proxies personalizados exigem o plano Developer ou superior.
  No Steel Cloud, proxies personalizados também podem exigir um plano pago.
- Só o navegador roda na nuvem. O arquivo de vídeo continua indo da sua máquina (pelo proxy da conta) direto
  para o TikTok, então o uso da nuvem fica pequeno: uma sessão curta por login e por upload.
- Quer outro provedor? Crie uma subclasse de `autotok.browsers.CloudProvider` e chame
  `autotok.browsers.register_provider("name", YourProvider)`.

---

<a id="python-sdk"></a>

## SDK Python

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

Já tem um cookie `sessionid` do seu navegador? Pule a janela de login:

```python
autotok.import_session("alice", "<sessionid value>", datacenter="<tt-target-idc value>")
```

---

<a id="typescript-sdk"></a>

## SDK TypeScript

O mesmo uploader para TypeScript e JavaScript, publicado no npm como [`autotok`](https://www.npmjs.com/package/autotok).
Ele roda no Node.js 22.12+, já vem com os tipos e não precisa de Python. Como lê e grava o mesmo
`~/.autotok/accounts`, uma conta em que você fez login pela CLI também funciona no TypeScript, e
vice-versa.

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

- Tudo no seu editor é tipado: opções, resultados e todas as classes de erro.
- O vídeo pode ser um caminho, um nome de arquivo em `~/.autotok/videos` ou os bytes do vídeo (`Buffer`/`Uint8Array`).
- Funciona com ES modules e CommonJS (`require("autotok")`), e com as configurações `nodenext`,
  `node20` e `bundler` do TypeScript.
- Proxies, navegadores na nuvem (`AUTOTOK_BROWSER`), as variáveis de configuração e os arquivos `.env` funcionam
  como descrito neste README; chame `loadEnv()` para ler o `.env`.
- Já tem um cookie `sessionid`? `await importSession("alice", "<sessionid>", { datacenter: "<tt-target-idc>" })`.

A API completa está em [`js/README.md`](js/README.md). A CLI, os links do YouTube, o servidor MCP e o
app web ficam no pacote Python.

---

<a id="go-sdk-and-single-binary"></a>

## SDK Go e binário único

O autotok também é um módulo Go, que compila para um único binário `autotok` sem precisar de Python nem
Node.js. O binário tem os mesmos comandos e flags da CLI Python. Assim como o pacote TypeScript, ele lê e
grava o mesmo `~/.autotok/accounts`, então as contas funcionam em todos eles.

```bash
go install github.com/makiisthenes/TiktokAutoUploader/go/cmd/autotok@latest   # or download a release binary
autotok login -n my_account
autotok upload -u my_account -v clip.mp4 -t "Hello #fyp"
```

Ele faz login e assina usando o Chrome, Chromium ou Edge que já está no seu computador, ou o Chromium do
Playwright, se os outros pacotes o tiverem instalado. Em uma máquina sem nenhum dos dois, rode
`autotok install-browser`, que baixa o Chrome for Testing (cerca de 200 MB, uma única vez).

Em código Go (Go 1.26+):

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

- Toda chamada recebe um `context.Context`, então os uploads podem ser cancelados ou ter um prazo.
- Os erros são tipados (`*autotok.PublishError`, `*autotok.UploadError`...) para uso com `errors.As`.
- Proxies e navegadores na nuvem (`AUTOTOK_BROWSER`) funcionam como descrito neste README. O navegador de
  login também funciona com proxies SOCKS5 que exigem senha.
- Links do YouTube funcionam quando o [yt-dlp](https://github.com/yt-dlp/yt-dlp) está instalado. O assistente
  de configuração, o shell e o servidor MCP existem apenas no pacote Python.

A API completa está em [`go/README.md`](go/README.md) e no
[pkg.go.dev](https://pkg.go.dev/github.com/makiisthenes/TiktokAutoUploader/go).

---

<a id="php-java-and-c"></a>

## PHP, Java e C#

Bibliotecas pequenas para PHP, Java e .NET executam o comando `autotok` por você (o pacote Python ou
o binário Go) e transformam as respostas dele em objetos e erros tipados. Elas usam as mesmas contas e
proxies salvos e não precisam de mais nada. Instale o autotok e faça login uma vez com
`autotok login -n alice`, e depois:

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

- As três têm as mesmas configurações de post da CLI (agendamento, visibilidade, comentários, duetos,
  costuras, selo de IA, proxy), listam e verificam contas e lançam um único tipo de exceção com o `type` e o
  `retryable` do erro do autotok, para você saber quando tentar de novo não tem como postar duas vezes.
- Elas precisam de um autotok com [`--json`](#json-output) e `--title-file`: o pacote Python posterior à
  2.1.0 ou o binário Go posterior à 0.1.0. Até essas versões saírem, instale o autotok a partir deste
  repositório: `uv tool install "autotok[youtube] @ git+https://github.com/makiisthenes/TiktokAutoUploader"`.
- Elas ainda não estão no Packagist, no Maven Central nem no NuGet; o README de cada uma explica como
  adicioná-la a partir deste repositório.
- Qualquer outra linguagem pode fazer o mesmo: rode `autotok --json upload ...` e leia uma linha de
  [JSON](#json-output).

---

<a id="mcp-server-ai-agents"></a>

## Servidor MCP (agentes de IA)

O autotok inclui um servidor [MCP](https://modelcontextprotocol.io), para que agentes de IA como Claude,
Cursor ou VS Code possam enviar e agendar vídeos por você. Ele usa as mesmas contas salvas da CLI.

```bash
uv tool install "autotok[youtube,mcp]"    # or: pip install "autotok[youtube,mcp]"
```

**Claude Code**

```bash
claude mcp add autotok -- autotok mcp
```

**Claude Desktop, Cursor e outros clientes**: adicione isto às configurações de MCP do cliente
(`claude_desktop_config.json`, `.cursor/mcp.json`, ...):

```json
{
  "mcpServers": {
    "autotok": { "command": "autotok", "args": ["mcp"] }
  }
}
```

Se o cliente não encontrar o `autotok`, use o caminho completo que `which autotok` (Windows:
`where autotok`) mostrar. Depois, é só pedir, por exemplo: *"Envie clip.mp4 para my_account com a legenda
'Hello #fyp', agendado para amanhã às 18h."*

| Ferramenta | O que faz |
|---|---|
| `list_accounts` | Contas salvas, se cada uma está logada e o proxy dela (mascarado) |
| `check_account` | Pergunta ao TikTok se a sessão de uma conta ainda funciona |
| `list_videos` | Arquivos na sua pasta de vídeos |
| `upload_video` | Envia um arquivo ou um link do YouTube, publica na hora ou agenda de 15 minutos a 30 dias à frente, com as mesmas configurações de post da CLI |
| `login`, `login_status` | Inicia um login. Você o conclui na janela do navegador que abrir (ou no link fornecido por um navegador na nuvem) |
| `set_proxy`, `test_proxy` | Salva ou remove o proxy de uma conta e mostra o IP que o TikTok vai ver |

- **Suas sessões ficam no seu computador.** As ferramentas nunca retornam cookies, e as senhas de proxy
  são mascaradas.
- **Todo upload é um post de verdade.** A maioria dos clientes pede confirmação antes de cada chamada de
  ferramenta; mantenha isso ativado para `upload_video`. Um erro de upload dizendo que o post *pode ou não
  existir* instrui o agente a não tentar de novo, para que nada seja postado duas vezes.
- **Timeouts não causam duplicatas.** Se um cliente desistir de um upload demorado e chamar
  `upload_video` de novo com a mesma conta, vídeo e legenda, ele recebe o resultado do primeiro upload
  em vez de criar um segundo post. Enquanto isso, clientes que suportam notificações de progresso continuam
  esperando.
- **Streamable HTTP**: `autotok mcp --http` serve em `http://127.0.0.1:8000/mcp` (use `--host` e
  `--port` para mudar). Não há autenticação, então mantenha em localhost ou atrás de uma autenticação sua.

---

<a id="claude-code-plugin"></a>

## Plugin para o Claude Code

Um plugin para o [Claude Code](https://code.claude.com) com uma skill `tiktok-upload`, para você enviar
vídeos só pedindo:

> Poste ~/Videos/clip.mp4 em my_account com a legenda "Bastidores 🎬 #fyp", amanhã às 18h.

```
/plugin marketplace add makiisthenes/TiktokAutoUploader
/plugin install autotok@autotok
```

A skill executa o comando `autotok`, então [instale o autotok](#install) e faça login antes. Ela escolhe
a conta (ou faz login em uma por uma janela do navegador), mostra a conta, o vídeo, a legenda e o horário
e pede confirmação antes de postar; depois faz o upload e explica qualquer erro. Apenas comandos de leitura,
como listar contas, rodam sem pedir permissão. Um upload que pode ou não ter chegado ao TikTok nunca é
repetido, então nada é postado duas vezes. Você também pode rodá-la diretamente:
`/autotok:tiktok-upload clip.mp4 "Hello #fyp"`.

Mais detalhes em [`claude-plugin/README.md`](claude-plugin/README.md), incluindo como usar a skill
sem o plugin.

---

<a id="cli-reference"></a>

## Referência da CLI

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

Opções de upload:

| Flag | Descrição | Padrão |
|---|---|---|
| `-u` / `--user` | Nome da conta salva | *obrigatório* |
| `-v` / `--video` | Arquivo de vídeo (caminho ou nome na sua pasta de vídeos) | — |
| `-yt` / `--youtube` | URL do YouTube para baixar e enviar | — |
| `-t` / `--title` | Legenda, com até 2200 caracteres | *obrigatório* (ou `--title-file`) |
| `--title-file` | Lê a legenda de um arquivo de texto UTF-8, ou da stdin com `-` | — |
| `-sc` / `--schedule` | Publica daqui a essa quantidade de segundos (900–2592000; algumas contas só permitem até 864000) | agora |
| `-vi` / `--visibility` | `0` público, `1` privado | `0` |
| `-ct` / `--comment` | Permitir comentários (`0`/`1`) | `1` |
| `-d` / `--duet` | Permitir duetos (`0`/`1`) | `0` |
| `-st` / `--stitch` | Permitir costuras (`0`/`1`) | `0` |
| `-ai` / `--ailabel` | Marcar como gerado por IA (`0`/`1`) | `0` |
| `-p` / `--proxy` | Proxy só para este upload | proxy da conta |
| `--no-proxy` | Ignora o proxy salvo da conta | — |

`python cli.py ...` neste repositório continua funcionando e equivale a `autotok ...`.

<a id="json-output"></a>

### Saída em JSON

Para scripts e outras linguagens, `--json` faz `upload` e `accounts` imprimirem uma linha de JSON na
stdout em vez de texto. Os logs continuam indo para a stderr. As [bibliotecas para PHP, Java e C#](#php-java-and-c)
usam esse modo.

```bash
autotok --json upload -u alice -v clip.mp4 -t "Hello #fyp"
```

| Comando | Imprime |
|---|---|
| `upload` | `{"video_id": "...", "creation_id": "...", "scheduled_for": "2026-11-02T18:30:00Z"}` (`null` quando postado na hora) |
| `accounts list` | `{"accounts": [{"name": "alice", "session": true, "proxy": "http://user:****@host:port"}]}` |
| `accounts check NAME` | `{"name": "alice", "session_ok": true}` (código de saída 1 quando `false`) |
| `accounts remove NAME` | `{"name": "alice", "removed": true}` (código de saída 1 quando `false`) |

Os erros imprimem `{"error": {"type": "PublishError", "message": "...", "retryable": false}}`, com o
código de saída de sempre (2 para entrada inválida). `type` é o nome da classe do erro, como
`ValidationError`, `AccountNotFoundError`, `PublishError` ou `PublishUncertainError`. `retryable`
é `true` só quando nada chegou à etapa de publicação do TikTok, então rodar o comando de novo não tem como
postar duas vezes. Um `PublishError` também traz o `status_code` e o `status_msg` do TikTok.
Erros que o analisador de argumentos detecta antes de o comando rodar, como uma opção desconhecida
ou a falta do nome da conta, imprimem o texto de uso no stderr em vez de JSON, com status de saída 2;
por isso, trate também como erro qualquer saída que não seja JSON.

---

<a id="docker"></a>

## Docker

O `Dockerfile` do repositório gera a imagem da CLI já com o Chromium incluído:

```bash
docker build -t autotok .

docker run --rm -it -v autotok-data:/data autotok accounts list
docker run --rm -it -v autotok-data:/data -v "$PWD/videos:/data/videos" \
  autotok upload -u alice -v clip.mp4 -t "Hello #fyp"
```

As contas salvas ficam em `/data`, então mantenha esse diretório em um volume. Contêineres não têm tela,
então faça login com um [navegador na nuvem](#cloud-browsers-browserbase-steel) e abra o link que ele exibir:

```bash
docker run --rm -it -v autotok-data:/data \
  -e AUTOTOK_BROWSER=browserbase -e BROWSERBASE_API_KEY=bb_live_... \
  autotok login -n alice -p http://user:pass@gate.example.com:7000
```

Você também pode salvar um cookie de sessão do seu próprio navegador com `login --sessionid ... --datacenter ...`.

Vai usar um navegador na nuvem para tudo? Gere a imagem sem o Chromium local para ela ficar bem menor:
`docker build --build-arg INSTALL_BROWSER=false -t autotok:slim .`

---

<a id="web-app-self-hosted"></a>

## App web (self-hosted)

Um painel de controle local com contas, proxies, uma biblioteca de vídeos, uploads e um agendador, além de
um navegador virtual para fazer login. Requer Docker.

```bash
git clone https://github.com/makiisthenes/TiktokAutoUploader.git
cd TiktokAutoUploader
docker compose up --build
```

Abra <http://localhost:3000>. A documentação da API fica em <http://localhost:8000/docs>.

- **Contas**: adicione contas fazendo login pelo navegador virtual embutido (com um proxy opcional) e
  depois defina, altere ou teste o proxy de cada conta e verifique a sessão dela.
- **Upload**: arraste um arquivo, escolha um da biblioteca ou cole um link do YouTube. Publique na hora ou
  agende para qualquer horário.
- **Agendamentos**: o agendador só tenta de novo as falhas que aconteceram antes de qualquer coisa chegar ao
  TikTok, então uma tarefa não tem como postar duas vezes. Uma tarefa interrompida durante a publicação é
  marcada como *may already be posted* (pode já ter sido postada), e tentar de novo pede que você confira o
  TikTok antes.

Os dados ficam em `./data`. Para usar uma conta em que você fez login pela CLI, copie o arquivo dela para o
armazenamento do app e clique em **Import from disk** na página Accounts:

```bash
mkdir -p data/autotok/accounts && cp ~/.autotok/accounts/my_account.json data/autotok/accounts/
```

(No Linux, os arquivos gravados pelos contêineres pertencem ao root, então use o login do próprio app web
para as contas que você gerencia por lá.)

Para assinar os uploads com um navegador na nuvem, coloque `AUTOTOK_BROWSER` e as configurações dele (veja
[Navegadores na nuvem](#cloud-browsers-browserbase-steel)) em um arquivo `.env` ao lado do `docker-compose.yml`.
O login pelo app web continua usando o navegador virtual embutido.

Scripts que chamam a API diretamente precisam enviar o header `X-Requested-With: autotok` nas requisições
`POST`/`PATCH`/`DELETE`. Isso impede que outras páginas web usem a API local.
A API também só responde a `localhost` e `127.0.0.1`. Se você acessa o app por outro nome
(por exemplo, atrás do seu próprio proxy reverso), adicione-o ao `.env`: `AUTOTOK_ALLOWED_HOSTS=tiktok.home.lan`.

> O app web não tem login próprio e só escuta em `127.0.0.1`. Não o exponha à
> internet.

---

<a id="configuration"></a>

## Configuração

Tudo é opcional. Coloque as configurações em um arquivo `.env`: copie [`.env.example`](.env.example) para `.env`
e preencha o que for usar. O `autotok` lê o `.env` da pasta onde você o executa e depois o
`~/.autotok/.env`. Variáveis já definidas no seu ambiente têm prioridade, e o `docker compose`
lê o mesmo arquivo. O `.env` guarda chaves de API, então nunca faça commit dele (ele está no `.gitignore`).

| Variável | Finalidade | Padrão |
|---|---|---|
| `AUTOTOK_HOME` | Contas e configurações salvas | `~/.autotok` |
| `AUTOTOK_VIDEOS_DIR` | Pasta de vídeos e downloads do YouTube | `$AUTOTOK_HOME/videos` |
| `AUTOTOK_BROWSER` | Onde rodam os navegadores de login/assinatura: `local`, `browserbase`, `steel` | `local` |
| `AUTOTOK_BROWSER_CHANNEL` | Usar um navegador instalado, por exemplo `chrome` | Chromium do Playwright |
| `AUTOTOK_BROWSER_PATH` | Caminho completo de um binário do Chrome/Chromium | Chromium do Playwright |
| `BROWSERBASE_API_KEY`, `BROWSERBASE_PROJECT_ID`, `BROWSERBASE_REGION`, `BROWSERBASE_PROXY_COUNTRY` | Configurações do Browserbase | — |
| `STEEL_API_KEY`, `STEEL_BASE_URL`, `STEEL_CONNECT_URL` | Configurações do Steel (`STEEL_BASE_URL` para self-hosted) | Steel Cloud |

Os arquivos de conta contêm a sua sessão do TikTok (equivale à sua senha). Eles são salvos com
permissões apenas para o dono; mantenha-os privados.

---

<a id="upgrading-from-tiktokautouploader-1x"></a>

## Atualizando a partir do TiktokAutoUploader 1.x

- **Instalação:** siga os [Primeiros passos](#getting-started) (`uv tool install "autotok[youtube]"` e depois `autotok install-browser`). O Node.js e o `npm install` não são mais necessários.
- **Sessões:** as sessões salvas em `CookiesDir/` são migradas automaticamente na primeira vez que você as
  usa a partir da pasta do repositório. As flags são as mesmas, e `python cli.py` continua funcionando.
- **Agendamento:** `-sc` volta a agendar pelo próprio TikTok (de 15 minutos a 10 dias). A fila local
  da 1.x (`cli.py schedule list|cancel`) agora fica na página Schedules do app web.
- **Correções de bugs:** as configurações de privacidade, comentários, duetos e costuras agora são aplicadas
  de verdade. As versões anteriores sempre postavam publicamente, com tudo permitido. As hashtags voltaram a
  ser clicáveis.
- **Removido:** o `config.txt` e os helpers de edição de vídeo com ImageMagick, que não eram usados.

---

<a id="troubleshooting"></a>

## Solução de problemas

| Problema | Solução |
|---|---|
| `'autotok' is not recognized` / `command not found` | Rode `uv tool update-shell` uma vez e abra um novo terminal. Se você instalou com pip, use `python -m autotok ...` |
| `Chromium for Playwright is not installed` | `autotok install-browser` (em servidores Linux: adicione `--with-deps`) |
| `TikTok rejected the session` / `session rejected` | `autotok login -n NAME --force` (confira com `autotok accounts check NAME`) |
| `Invalid parameters (status_code=5)` | O TikTok mudou a API de upload. Por favor, [abra uma issue](https://github.com/makiisthenes/TiktokAutoUploader/issues) com o erro completo. |
| `potential violation of our Community Guidelines` | O TikTok bloqueou o conteúdo desse vídeo; não é um erro da ferramenta. |
| A página de login se recusa a fazer login / fica em loop de captcha | Tente o Chrome instalado: adicione `AUTOTOK_BROWSER_CHANNEL=chrome` ao seu `.env`, ou copie o cookie `sessionid` do seu navegador e use `autotok login -n NAME --sessionid ...` |
| "Verify it's really you" durante um login na nuvem | O TikTok não reconhece o IP do navegador na nuvem. Conclua a verificação na visualização ao vivo (escolha E-mail), ou evite-a com um proxy; veja as observações em [Navegadores na nuvem](#cloud-browsers-browserbase-steel) |
| A visualização ao vivo do login na nuvem fica em branco (Steel self-hosted) | Reinicie o steel-browser com `DOMAIN=localhost:3000` (o endereço dele) |
| `Browserbase ... (HTTP 402): Proxies are not included in the free plan` | Remova `BROWSERBASE_PROXY_COUNTRY`, ou o proxy da conta nos logins na nuvem, ou faça upgrade do plano do Browserbase |
| Aviso `No TikTok datacenter cookie saved` | Faça login de novo com `autotok login`, ou passe `--datacenter` junto com `--sessionid` |
| `may or may not have been posted` | A conexão caiu durante a publicação. Confira a conta antes de tentar de novo, para evitar uma duplicata. |

Veja também [Problemas comuns](docs/common-problems.md).

---

<a id="professional-software-autotok-pro"></a>

## Software profissional (autotok Pro)

Preencha o formulário da lista de espera: https://forms.gle/M4KpdfruqCukQvj99

Se você procura algo a mais, que leve você ao seu objetivo mais rápido, eu ofereço um software que pode:

- Gerenciar mais de 1000 contas
- Enviar vídeos idênticos para várias contas automaticamente
- Agendar vídeos para várias contas, de 20 dias a 2 anos de antecedência
- Buscar vídeos automaticamente no YouTube, X, Reddit e TikTok
- Montar pipelines de upload, da origem dos vídeos até o agendamento dos uploads
- Mostrar métricas do desempenho atual dessas diferentes contas
- Oferecer suporte personalizado comigo para qualquer problema que você enfrente, por até 3 meses
- Suporte a proxies, interface limpa e moderna

Disponível para compra. Se tiver interesse, me envie um e-mail para `michaelperes562@gmail.com` com o assunto `Tiktok Bot Software`, senão posso acabar não vendo a mensagem.

---

<a id="licensing"></a>

## Licenciamento

O autotok tem **licença dupla**:

- **Open source:** [GNU AGPL v3.0](LICENSE). Use, modifique e compartilhe à vontade. Se você distribuir uma
  versão modificada, ou rodá-la como serviço para outras pessoas, precisa publicar o seu código-fonte sob a
  mesma licença.
- **Comercial:** para incorporar o autotok a produtos de código fechado ou a serviços pagos sem as obrigações
  da AGPL, ou para usar o autotok Pro, entre em contato pelo `michaelperes562@gmail.com`.

Copyright © 2021–2026 Michael Peres. As versões anteriores à 2.0.0 continuam sob a licença com que foram
publicadas. Os scripts de assinatura incluídos são código de terceiros; veja
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Contribuições são bem-vindas nos termos de
[CONTRIBUTING.md](CONTRIBUTING.md).

---

<a id="support-this-project"></a>

## Apoie este projeto

Se você gosta do trabalho, considere me apoiar pelo [Patreon](https://patreon.com/makiisthenes) ou pelo [Ko-Fi](https://ko-fi.com/makiperes), ou dar uma estrela ao projeto.

- Obrigado ao [@DelvinBa](https://github.com/DelvinBa) pela atualização para o novo endpoint de upload do TikTok. (09/12/2024)

<a id="bugs-and-issues"></a>

## Bugs e problemas

Por favor, relate bugs na [aba de issues](https://github.com/makiisthenes/TiktokAutoUploader/issues) em vez de por e-mail.
Problemas de segurança devem ser enviados por um relato privado, como descrito em [SECURITY.md](SECURITY.md).

<a id="notes-and-terms"></a>

## Observações e termos

Este projeto não tem nenhuma afiliação com o TikTok. Automatizar uploads pode violar os termos de serviço do
TikTok e levar a restrições ou banimento das contas. Só envie conteúdo sobre o qual você tem os direitos. Use
por sua conta e risco.

<a id="star-history"></a>

## Histórico de estrelas

[![Gráfico do histórico de estrelas](https://api.star-history.com/svg?repos=makiisthenes/TiktokAutoUploader&type=Date)](https://star-history.com/#makiisthenes/TiktokAutoUploader&Date)
