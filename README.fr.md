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
  <b>Français</b> ·
  <a href="README.de.md">Deutsch</a>
</p>

*Ceci est une traduction du [README anglais](README.md) ; en cas de différence, c'est la version anglaise qui est à jour.*

<p align="center">
  <img src="https://user-images.githubusercontent.com/52138450/111885490-04ab6680-89c0-11eb-955a-f833577b4406.png" width="35%" alt="Logo de TiktokAutoUploader">
</p>

<p align="center">Publiez et programmez des vidéos TikTok depuis la ligne de commande, Python, TypeScript, Go, PHP, Java ou C#, avec un proxy par compte.</p>
<p align="center"><code>uv tool install autotok</code> · <code>npm install autotok</code> · une seule connexion · une commande par vidéo</p>

<p align="center">
  <a href="https://pypi.org/project/autotok/"><img alt="PyPI" src="https://img.shields.io/pypi/v/autotok?label=pypi"></a>
  <a href="https://www.npmjs.com/package/autotok"><img alt="npm" src="https://img.shields.io/npm/v/autotok?label=npm"></a>
  <a href="#typescript-sdk"><img alt="Types TypeScript inclus" src="https://img.shields.io/npm/types/autotok"></a>
  <a href="https://pkg.go.dev/github.com/makiisthenes/TiktokAutoUploader/go"><img alt="Référence Go" src="https://pkg.go.dev/badge/github.com/makiisthenes/TiktokAutoUploader/go.svg"></a>
  <a href="https://github.com/makiisthenes/TiktokAutoUploader/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/makiisthenes/TiktokAutoUploader/actions/workflows/ci.yml/badge.svg"></a>
  <a href="LICENSE"><img alt="Licence : AGPL-3.0" src="https://img.shields.io/badge/license-AGPL--3.0-blue"></a>
  <a href="https://www.linkedin.com/in/michael-p-88b015200/"><img alt="LinkedIn" src="https://img.shields.io/badge/LinkedIn-0077B5?style=flat-square&logo=linkedin&logoColor=white"></a>
  <img alt="Étoiles" src="https://img.shields.io/github/stars/makiisthenes/TiktokAutoUploader">
  <img alt="Forks" src="https://img.shields.io/github/forks/makiisthenes/TiktokAutoUploader">
</p>

<p align="center">
  <a href="https://github.com/makiisthenes/TiktokAutoUploader/blob/main/docs/media/autotok-launch.mp4">
    <img src="https://raw.githubusercontent.com/makiisthenes/TiktokAutoUploader/main/docs/media/autotok-launch.webp" width="100%" alt="autotok en 38 secondes : connectez-vous une fois, puis une seule commande publie votre vidéo sur TikTok, tout de suite ou à l'heure prévue, sur n'importe lequel de vos comptes">
  </a>
</p>
<p align="center"><sub>Cliquez sur la vidéo pour la regarder avec le son.</sub></p>

---

<a id="install"></a>

## Installation

**Ligne de commande et Python**

```bash
uv tool install "autotok[youtube]"
autotok install-browser                                   # one-time browser download, about 300 MB
```

Connectez-vous ensuite une fois par compte, puis publiez en une seule commande :

```bash
autotok login -n my_account                               # log in on the page that opens; the QR code is quickest
autotok upload -u my_account -v clip.mp4 -t "Hello #fyp"
```

Pas de uv ? `pipx install "autotok[youtube]"` ou `pip install "autotok[youtube]"` fonctionnent aussi.
La section [Prise en main](#getting-started) détaille chaque étape, y compris les proxys et les navigateurs cloud.

**TypeScript et JavaScript (Node.js)**

```bash
npm install autotok
npx playwright install chromium                           # one-time browser download
```

```ts
import { login, uploadVideo } from "autotok";

await login("my_account");                                // once: log in on the page that opens
await uploadVideo("my_account", "clip.mp4", "Hello #fyp");
```

Typé, basé sur les promesses, sans Python, et il partage les comptes enregistrés avec la CLI. Voir le
[SDK TypeScript](#typescript-sdk).

**Go, ou un seul binaire, sans rien d'autre à installer**

```bash
go install github.com/makiisthenes/TiktokAutoUploader/go/cmd/autotok@latest
```

ou téléchargez le binaire `autotok` pour votre système depuis les
[releases](https://github.com/makiisthenes/TiktokAutoUploader/releases) (celles en `go/v...`). Il
propose les mêmes commandes que ci-dessus, ne demande ni Python ni Node.js, et utilise le Chrome déjà
installé sur votre ordinateur. Dans du code Go : `go get github.com/makiisthenes/TiktokAutoUploader/go`. Voir
[Go](#go-sdk-and-single-binary).

**PHP, Java et C#**

De petites bibliothèques qui lancent la commande `autotok` pour vous et renvoient des résultats et des erreurs typés.
Installez autotok comme ci-dessus, puis consultez [PHP, Java et C#](#php-java-and-c).

---

<a id="sponsors"></a>

## Sponsors

<p align="center">
  <a href="https://www.swiftproxy.net/?ref=makiisthenes">
    <img src="https://github.com/user-attachments/assets/a1d0e915-e09a-4b36-ba72-788c4cc1e709" alt="Swiftproxy — plus de 90 millions de proxys résidentiels" width="420">
  </a>
</p>

[**Swiftproxy**](https://www.swiftproxy.net/?ref=makiisthenes) propose plus de 90 millions de proxys résidentiels et résidentiels statiques propres, conçus pour l'automatisation des réseaux sociaux, la gestion multicompte et les workflows d'automatisation web. Avec des connexions stables, une couverture IP mondiale et une infrastructure de proxys fiable, Swiftproxy aide ses utilisateurs à gérer plusieurs comptes en toute sécurité, à limiter les restrictions liées à l'IP et à faire passer leurs automatisations à l'échelle. Le trafic de proxys résidentiels n'expire jamais tant qu'il n'est pas consommé, et un essai gratuit est disponible.

> **10 % de réduction** avec le code `PROXY90` — [Obtenir des proxys chez Swiftproxy →](https://www.swiftproxy.net/?ref=makiisthenes)

<br>

<p align="center">
  <a href="https://termius.com/">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/makiisthenes/TiktokAutoUploader/main/docs/images/termius-logo-white.png">
      <img src="https://raw.githubusercontent.com/makiisthenes/TiktokAutoUploader/main/docs/images/termius-logo.png" alt="Termius" width="300">
    </picture>
  </a>
</p>

[**Termius**](https://termius.com/) est un client SSH sécurisé, fiable et collaboratif.

> [Obtenir Termius →](https://termius.com/)

---

<a id="getting-started"></a>

## Prise en main

La mise en place prend environ cinq minutes. Une fois autotok installé (étape 1), vous pouvez lancer `autotok setup` pour être guidé
pour la suite : il vérifie le navigateur, vous demande un proxy et le teste, puis vous connecte à TikTok
à travers ce proxy. Les étapes ci-dessous font la même chose à la main.

<a id="1-install-autotok"></a>

### 1. Installer autotok

```bash
uv tool install "autotok[youtube]"
```

C'est tout : `autotok` est désormais une commande que vous pouvez lancer depuis n'importe quel terminal (vérifiez avec `autotok --version`).
uv isole autotok de vos autres paquets Python, et télécharge Python pour vous si vous ne
l'avez pas.

Vous n'avez pas uv ? Installez-le en une ligne depuis [docs.astral.sh/uv](https://docs.astral.sh/uv/getting-started/installation/),
ou utilisez [pipx](https://pipx.pypa.io) : `pipx install "autotok[youtube]"`.

- Pour mettre à jour plus tard : `uv tool upgrade autotok`.
- Pour l'essayer sans l'installer : `uvx --from "autotok[youtube]" autotok --version`.
- Vous utilisez autotok depuis du code Python ? Ajoutez-le à votre projet : `uv add "autotok[youtube]"` ou
  `pip install "autotok[youtube]"`.
- Vous utilisez TypeScript ou JavaScript ? Faites plutôt `npm install autotok`, voir le [SDK TypeScript](#typescript-sdk).
  Depuis le code, `login()` et `uploadVideo()` remplacent les commandes des étapes 3 et 4.
- Impossible d'installer Python, ou vous écrivez du Go ? Utilisez plutôt le binaire unique `autotok` disponible dans les
  [releases](https://github.com/makiisthenes/TiktokAutoUploader/releases) : les étapes ci-dessous
  sont les mêmes. Voir [Go](#go-sdk-and-single-binary).
- `[youtube]` ajoute la prise en charge des liens YouTube. Retirez-le si vous n'en avez pas besoin.
- `autotok` « not recognized » ou « command not found » ? Lancez `uv tool update-shell` une fois et ouvrez un nouveau
  terminal.

<a id="2-choose-where-the-browser-runs"></a>

### 2. Choisir où tourne le navigateur

autotok utilise un navigateur pour la connexion initiale, faite une seule fois, et pour signer chaque upload. Choisissez une option :

| Option | Idéal pour | Mise en place |
|---|---|---|
| **Local** (par défaut) | Votre propre ordinateur | `autotok install-browser`, un téléchargement unique d'environ 300 Mo |
| **Cloud** ([Browserbase](https://www.browserbase.com) ou [Steel](https://github.com/steel-dev/steel-browser)) | Les serveurs, Docker, ou pour garder votre ordinateur libre | Ajoutez une clé API dans un fichier de configuration. Voir [Navigateurs cloud](#cloud-browsers-browserbase-steel) |

Pour le navigateur local sur un serveur Linux fraîchement installé, lancez `autotok install-browser --with-deps` en root : cette commande
installe aussi les bibliothèques système de Chromium.

<a id="3-log-in-to-tiktok-once-per-account"></a>

### 3. Se connecter à TikTok (une fois par compte)

```bash
autotok login -n my_account
```

Une fenêtre de navigateur s'ouvre sur la page de connexion de TikTok. Connectez-vous comme vous le souhaitez ; le QR code avec l'application TikTok
sur votre téléphone est le plus rapide. La fenêtre se ferme toute seule et la session est enregistrée sous le nom `my_account`.
Avec un navigateur cloud, vous obtenez à la place un lien à ouvrir.

```bash
autotok accounts check my_account     # confirms TikTok accepts the saved session
```

- Vous allez utiliser un proxy pour ce compte ? Indiquez-le dès maintenant, pour que la connexion et les uploads suivants partagent la même IP :
  `autotok login -n my_account -p http://user:pass@host:port` (voir [Proxys](#proxies)).
- Recommencez avec un nom `-n` différent pour chaque compte.
- Les sessions sont enregistrées dans `~/.autotok/accounts`. Traitez-les comme des mots de passe.

<a id="4-upload"></a>

### 4. Publier

```bash
autotok upload -u my_account -v "C:\Videos\clip.mp4" -t "My caption #fyp"
```

C'est tout. D'autres exemples :

```bash
autotok upload -u my_account -v clip.mp4 -t "Just for me" -vi 1                 # private
autotok upload -u my_account -v clip.mp4 -t "Later #fyp" -sc 3600               # publish in 1 hour
autotok upload -u my_account -yt "https://www.youtube.com/shorts/xxxxxxxxxxx" -t "Caption"
```

`-v` accepte le chemin de n'importe quelle vidéo, ou simplement un nom de fichier si la vidéo se trouve dans `~/.autotok/videos`. Toutes
les options sont décrites dans la [référence de la CLI](#cli-reference).

<a id="5-optional-save-your-settings-in-a-file"></a>

### 5. Facultatif : enregistrer vos réglages dans un fichier

Les réglages comme le navigateur cloud ou sa clé API se placent dans un fichier `.env`. autotok le cherche dans le dossier
depuis lequel vous le lancez, puis dans `~/.autotok/.env` ; ce second emplacement fonctionne depuis n'importe quel dossier. Copiez
[`.env.example`](.env.example) (de ce dépôt) ou commencez avec le strict nécessaire :

```bash
# ~/.autotok/.env   (Windows: C:\Users\<you>\.autotok\.env)
AUTOTOK_BROWSER=browserbase
BROWSERBASE_API_KEY=bb_live_...
```

<a id="where-next"></a>

### Et ensuite ?

| Je veux... | Voir |
|---|---|
| Gérer plusieurs comptes, chacun avec sa propre IP | [Proxys](#proxies) |
| Éviter de faire tourner un navigateur sur mon ordinateur | [Navigateurs cloud](#cloud-browsers-browserbase-steel) |
| Publier depuis du code Python | [SDK Python](#python-sdk) |
| Publier depuis TypeScript ou JavaScript | [SDK TypeScript](#typescript-sdk) |
| Publier depuis Go, ou utiliser un seul binaire sans Python | [Go](#go-sdk-and-single-binary) |
| Publier depuis PHP, Java ou C# | [PHP, Java et C#](#php-java-and-c) |
| Laisser un agent IA (Claude, Cursor...) publier pour moi | [Serveur MCP](#mcp-server-ai-agents) |
| Publier en le demandant à Claude Code, avec un skill | [Plugin Claude Code](#claude-code-plugin) |
| Faire tourner l'outil sur un serveur ou dans un conteneur | [Docker](#docker) |
| Utiliser un tableau de bord web avec un planificateur | [Application web](#web-app-self-hosted) |
| Corriger une erreur | [Dépannage](#troubleshooting) |

---

<a id="features"></a>

## Fonctionnalités

- **Publication en une seule commande** via l'API d'upload web de TikTok. Plus besoin de cliquer partout sur le site de TikTok.
- **Un proxy par compte** : la connexion, la signature des requêtes et chaque upload passent par le même proxy, si bien que chaque compte apparaît toujours depuis la même IP. HTTP(S) et SOCKS5 sont pris en charge.
- **Plusieurs comptes** : connectez-vous une fois par compte, puis publiez en indiquant simplement son nom.
- **Programmation** : programmation côté TikTok de 15 minutes à 30 jours à l'avance (TikTok limite certains comptes à 10 jours). L'application web auto-hébergée ajoute un planificateur sans limite de durée.
- **Réglages de publication** : public ou privé, et commentaires, duos, stitchs et label « généré par IA » activés ou désactivés.
- **Hashtags et @mentions cliquables**, compatibles avec les emojis.
- **Liens YouTube** téléchargés automatiquement avec [yt-dlp](https://github.com/yt-dlp/yt-dlp).
- **SDK Python, CLI et une application web optionnelle** (Docker) avec une connexion depuis le navigateur.
- **SDK TypeScript** sur npm (`npm install autotok`) : entièrement typé, basé sur les promesses, sans Python, et il
  partage les comptes enregistrés avec la CLI.
- **Package Go et binaire unique** : récupérez la bibliothèque avec `go get`, ou téléchargez un seul exécutable `autotok`
  sans Python ni Node.js. Il partage les comptes enregistrés avec les autres packages.
- **Bibliothèques PHP, Java et C#** qui pilotent la commande `autotok` et renvoient des résultats et des
  erreurs typés, sans aucune autre dépendance.
- **Serveur MCP** pour que des agents IA (Claude, Cursor, VS Code...) publient et programment vos vidéos à votre place.
- **Plugin Claude Code** avec un skill de publication TikTok : demandez en langage courant, et il vous demande confirmation avant de
  publier.
- **Navigateurs cloud** : faites tourner le navigateur de connexion et de signature sur [Browserbase](https://www.browserbase.com) ou [Steel](https://github.com/steel-dev/steel-browser) (cloud ou auto-hébergé) plutôt que sur votre ordinateur.
- **Image Docker** pour faire tourner la CLI sur des serveurs.
- **Pas besoin de Node.js** pour le package Python : les signatures des requêtes TikTok sont calculées dans un Chromium headless.

---

<a id="proxies"></a>

## Proxys

Faire tourner plusieurs comptes depuis une seule IP est le moyen le plus rapide de les faire signaler. autotok vous permet d'attribuer
à chaque compte son propre proxy, et l'utilise **partout** où ce compte communique avec TikTok :

| Étape | Passe par le proxy du compte |
|---|---|
| Navigateur de connexion (`autotok login`, connexion via l'application web) | ✅ |
| Récupération de la page de signature | ✅ (le navigateur de signature lui-même n'envoie aucune requête réseau) |
| Appels à l'API d'upload et transfert de la vidéo | ✅ |
| Téléchargements YouTube | ❌ (ce n'est pas du trafic TikTok ; cela économise la bande passante du proxy) |

**Définir, modifier et tester les proxys**

`autotok setup` demande le proxy, le teste et se connecte à travers lui. Pour le faire à la main :

```bash
autotok login -n alice -p http://user:pass@gate.example.com:7000   # set at login
autotok proxy set alice socks5://user:pass@gate.example.com:1080     # set or change later
autotok proxy test -u alice                                          # shows the IP TikTok will see
autotok proxy clear alice                                            # go direct
autotok accounts list                                                # every account and its proxy (passwords hidden)

autotok upload -u alice -v clip.mp4 -t "hi" -p http://other:pass@host:8000   # one-off override
autotok upload -u alice -v clip.mp4 -t "hi" --no-proxy                       # ignore the saved proxy once
```

**Formats acceptés** (le schéma par défaut est `http`)

```
http://user:pass@host:port      https://user:pass@host:port
socks5://user:pass@host:port    host:port
user:pass@host:port             host:port:user:pass      ← the export format most providers use
```

**Conseils**

- Utilisez des proxys **résidentiels ou mobiles**, un par compte, avec une **session sticky** (la même IP pendant
  des heures). Un proxy qui change d'IP à chaque requête donne l'impression qu'une session connectée a été piratée.
- Connectez-vous **à travers le proxy** que vous utiliserez pour publier (`autotok login -p ...`). Se connecter depuis chez soi puis
  publier depuis un proxy crée une incohérence que TikTok peut voir.
- Chromium ne peut pas utiliser de proxys SOCKS5 qui demandent un nom d'utilisateur et un mot de passe. Pour l'étape de connexion, utilisez
  l'endpoint HTTP de votre fournisseur (les uploads fonctionnent avec les deux).
- Les mots de passe ne sont jamais affichés : la CLI et l'application web affichent `http://user:****@host:port`.

Besoin de proxys ? Découvrez nos [sponsors](#sponsors).

---

<a id="cloud-browsers-browserbase-steel"></a>

## Navigateurs cloud (Browserbase, Steel)

autotok a besoin d'un navigateur à deux moments : la **connexion**, faite une seule fois, et la **signature** de chaque upload (les
signatures anti-bot de TikTok sont calculées dans une page de navigateur). Par défaut, c'est Chromium sur votre machine.
Définissez `AUTOTOK_BROWSER` pour le faire tourner dans le cloud à la place. Rien n'a alors besoin d'être installé ni ouvert
en local, ce qui convient bien aux serveurs et à Docker.

| `AUTOTOK_BROWSER` | Où tourne le navigateur | Réglages |
|---|---|---|
| `local` (par défaut) | Chromium sur cette machine | `autotok install-browser`, une fois |
| `browserbase` | [Browserbase](https://www.browserbase.com) | `BROWSERBASE_API_KEY` (en option : `BROWSERBASE_PROJECT_ID`, `BROWSERBASE_REGION`) |
| `steel` | [Steel Cloud](https://steel.dev), ou votre propre serveur [steel-browser](https://github.com/steel-dev/steel-browser) | Cloud : `STEEL_API_KEY`. Auto-hébergé : `STEEL_BASE_URL`, par ex. `http://localhost:3000` |

Placez les réglages dans votre fichier `.env` (copiez [`.env.example`](.env.example)) :

```bash
AUTOTOK_BROWSER=browserbase
BROWSERBASE_API_KEY=bb_live_...
```

Utilisez ensuite autotok comme d'habitude :

```bash
autotok browser check                 # starts a session and shows the IP it browses from
autotok login -n alice -p http://user:pass@gate.example.com:7000
autotok upload -u alice -v clip.mp4 -t "Hello #fyp"
```

Ou choisissez commande par commande : `autotok --browser steel login -n alice`.

**Connexion :** `autotok login` affiche un lien vers la vue en direct (live view) et l'ouvre dans votre navigateur habituel. Connectez-vous à
TikTok sur cette page ; la session est enregistrée dès que vous êtes connecté, puis le navigateur cloud est fermé.

**Steel auto-hébergé** est gratuit et open source :

```bash
docker run -p 3000:3000 -e DOMAIN=localhost:3000 ghcr.io/steel-dev/steel-browser
```

et dans `.env` :

```bash
AUTOTOK_BROWSER=steel
STEEL_BASE_URL=http://localhost:3000
```

Donnez à `DOMAIN` l'adresse à laquelle vous joignez le serveur. Sans elle, steel-browser demande aux navigateurs de
se connecter à `0.0.0.0` et sa vue en direct reste vide, ce qui vous empêche de vous connecter. autotok vous prévient quand il détecte
ce cas. Un steel-browser auto-hébergé ne gère qu'une session à la fois.

Bon à savoir :

- **Utilisez un proxy de compte pour les connexions cloud.** Le proxy du compte est appliqué à la session de connexion
  cloud, si bien que TikTok voit la même IP à la connexion et à l'upload. Sans proxy, TikTok voit la connexion arriver
  depuis l'IP du fournisseur, et les uploads depuis la vôtre.
- **« Verify it's really you »** après la connexion signifie que TikTok a vu un appareil inconnu sur une IP de
  datacenter. Vous pouvez valider cette vérification dans la vue en direct, mais mieux vaut l'éviter : utilisez un proxy de compte, ou, avec
  une offre Browserbase payante, définissez `BROWSERBASE_PROXY_COUNTRY=GB` (votre pays) pour vous connecter via une IP résidentielle
  de ce pays. Avec l'offre gratuite, régler `BROWSERBASE_REGION` sur la région la plus proche de vous
  (par ex. `eu-central-1`) évite au moins une connexion depuis les États-Unis.
- La vue en direct n'affiche que l'onglet TikTok, donc autotok ferme les popups comme « Continue with Google »
  pendant les connexions cloud. Utilisez plutôt le QR code, l'e-mail/le nom d'utilisateur ou le téléphone.
- Browserbase n'accepte que les proxys HTTP/HTTPS, et les proxys personnalisés nécessitent son offre Developer ou supérieure.
  Les proxys personnalisés sur Steel Cloud peuvent aussi nécessiter une offre payante.
- Seul le navigateur tourne dans le cloud. Le fichier vidéo part toujours de votre machine (via le
  proxy du compte) directement vers TikTok, donc l'usage du cloud reste faible : une courte session par connexion et
  par upload.
- Envie d'un autre fournisseur ? Créez une sous-classe de `autotok.browsers.CloudProvider` et appelez
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

Vous avez déjà un cookie `sessionid` dans votre navigateur ? Passez la fenêtre de connexion :

```python
autotok.import_session("alice", "<sessionid value>", datacenter="<tt-target-idc value>")
```

---

<a id="typescript-sdk"></a>

## SDK TypeScript

Le même outil de publication pour TypeScript et JavaScript, disponible sur npm sous le nom [`autotok`](https://www.npmjs.com/package/autotok).
Il fonctionne avec Node.js 22.12+, inclut ses types et ne demande pas Python. Il lit et écrit le même dossier
`~/.autotok/accounts` : un compte connecté avec la CLI fonctionne donc aussi depuis TypeScript, et
inversement.

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

- Tout est typé dans votre éditeur : les options, les résultats et chaque classe d'erreur.
- La vidéo peut être un chemin, un nom de fichier dans `~/.autotok/videos`, ou les octets de la vidéo (`Buffer`/`Uint8Array`).
- Fonctionne avec les modules ES et CommonJS (`require("autotok")`), et avec les réglages `nodenext`,
  `node20` et `bundler` de TypeScript.
- Les proxys, les navigateurs cloud (`AUTOTOK_BROWSER`), les variables de configuration et les fichiers `.env` fonctionnent comme
  décrit dans ce README ; appelez `loadEnv()` pour lire `.env`.
- Vous avez déjà un cookie `sessionid` ? `await importSession("alice", "<sessionid>", { datacenter: "<tt-target-idc>" })`.

L'API complète est décrite dans [`js/README.md`](js/README.md). La CLI, les liens YouTube, le serveur MCP et
l'application web font partie du package Python.

---

<a id="go-sdk-and-single-binary"></a>

## SDK Go et binaire unique

autotok est aussi un module Go, qui se compile en un seul binaire `autotok`, sans Python ni Node.js
nécessaire. Le binaire a les mêmes commandes et options que la CLI Python. Comme le package
TypeScript, il lit et écrit le même dossier `~/.autotok/accounts` : les comptes fonctionnent donc partout.

```bash
go install github.com/makiisthenes/TiktokAutoUploader/go/cmd/autotok@latest   # or download a release binary
autotok login -n my_account
autotok upload -u my_account -v clip.mp4 -t "Hello #fyp"
```

Il se connecte et signe avec le Chrome, Chromium ou Edge déjà présent sur votre ordinateur, ou avec le
Chromium de Playwright si les autres packages l'ont installé. Sur une machine qui n'a ni l'un ni l'autre, lancez
`autotok install-browser`, qui télécharge Chrome for Testing (environ 200 Mo, une seule fois).

Depuis du code Go (Go 1.26+) :

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

- Chaque appel prend un `context.Context`, ce qui permet d'annuler un upload ou de lui fixer une échéance.
- Les erreurs sont typées (`*autotok.PublishError`, `*autotok.UploadError`...) pour `errors.As`.
- Les proxys et les navigateurs cloud (`AUTOTOK_BROWSER`) fonctionnent comme décrit dans ce README. Le navigateur
  de connexion fonctionne aussi avec les proxys SOCKS5 protégés par mot de passe.
- Les liens YouTube fonctionnent quand [yt-dlp](https://github.com/yt-dlp/yt-dlp) est installé. L'assistant de
  configuration, le shell et le serveur MCP ne sont disponibles que dans le package Python.

L'API complète est décrite dans [`go/README.md`](go/README.md) et sur
[pkg.go.dev](https://pkg.go.dev/github.com/makiisthenes/TiktokAutoUploader/go).

---

<a id="php-java-and-c"></a>

## PHP, Java et C#

De petites bibliothèques pour PHP, Java et .NET lancent la commande `autotok` pour vous (le package Python ou
le binaire Go) et transforment ses réponses en objets et en erreurs typées. Elles utilisent les mêmes comptes
et proxys enregistrés, et n'ont besoin de rien d'autre. Installez autotok et connectez-vous une fois avec
`autotok login -n alice`, puis :

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

- Les trois proposent les mêmes réglages de publication que la CLI (programmation, visibilité, commentaires, duos,
  stitchs, label IA, proxy), permettent de lister et de vérifier les comptes, et lèvent un seul type d'exception portant
  le `type` d'erreur d'autotok et `retryable`, pour que vous sachiez quand une nouvelle tentative ne risque pas de publier deux fois.
- Elles nécessitent une version d'autotok qui gère [`--json`](#json-output) et `--title-file` : le package Python après la
  2.1.0, ou le binaire Go après la 0.1.0. En attendant que ces versions sortent, installez autotok depuis ce
  dépôt : `uv tool install "autotok[youtube] @ git+https://github.com/makiisthenes/TiktokAutoUploader"`.
- Elles ne sont pas encore sur Packagist, Maven Central ni NuGet ; chaque README explique comment les ajouter depuis ce
  dépôt.
- N'importe quel autre langage peut faire de même : lancez `autotok --json upload ...` et lisez une ligne de
  [JSON](#json-output).

---

<a id="mcp-server-ai-agents"></a>

## Serveur MCP (agents IA)

autotok inclut un serveur [MCP](https://modelcontextprotocol.io), pour que des agents IA comme Claude,
Cursor ou VS Code puissent publier et programmer des vidéos à votre place. Il utilise les mêmes comptes enregistrés que la CLI.

```bash
uv tool install "autotok[youtube,mcp]"    # or: pip install "autotok[youtube,mcp]"
```

**Claude Code**

```bash
claude mcp add autotok -- autotok mcp
```

**Claude Desktop, Cursor et autres clients** : ajoutez ceci aux réglages MCP du client
(`claude_desktop_config.json`, `.cursor/mcp.json`, ...) :

```json
{
  "mcpServers": {
    "autotok": { "command": "autotok", "args": ["mcp"] }
  }
}
```

Si le client ne trouve pas `autotok`, utilisez le chemin complet qu'affiche `which autotok` (Windows :
`where autotok`). Demandez ensuite, par exemple : *« Publie clip.mp4 sur my_account avec la légende
'Hello #fyp', programmée pour demain à 18 h. »*

| Outil | Ce qu'il fait |
|---|---|
| `list_accounts` | Les comptes enregistrés, si chacun est connecté, et son proxy (masqué) |
| `check_account` | Demande à TikTok si la session d'un compte fonctionne toujours |
| `list_videos` | Les fichiers de votre dossier de vidéos |
| `upload_video` | Publie un fichier ou un lien YouTube, tout de suite ou programmé de 15 minutes à 30 jours à l'avance, avec les mêmes réglages de publication que la CLI |
| `login`, `login_status` | Lance une connexion. Vous la terminez dans la fenêtre de navigateur qui s'ouvre (ou via le lien fourni par un navigateur cloud) |
| `set_proxy`, `test_proxy` | Enregistre ou supprime le proxy d'un compte, et affiche l'IP que TikTok verra |

- **Vos sessions restent sur votre ordinateur.** Les outils ne renvoient jamais de cookies, et les mots de passe des proxys
  sont masqués.
- **Chaque upload est une vraie publication.** La plupart des clients demandent confirmation avant chaque appel d'outil ; gardez cette option activée pour
  `upload_video`. Une erreur d'upload indiquant que la publication *existe peut-être, ou peut-être pas*, dit à l'agent de ne pas
  réessayer, pour que rien ne soit publié deux fois.
- **Les timeouts ne créent pas de doublons.** Si un client abandonne un upload trop long et rappelle
  `upload_video` avec le même compte, la même vidéo et la même légende, il obtient le résultat du premier upload
  au lieu d'une seconde publication. Les clients qui gèrent les notifications de progression continuent d'attendre pendant ce temps.
- **Streamable HTTP** : `autotok mcp --http` sert `http://127.0.0.1:8000/mcp` (`--host`,
  `--port` pour les changer). Il n'y a pas d'authentification, donc gardez-le sur localhost ou derrière votre propre système d'authentification.

---

<a id="claude-code-plugin"></a>

## Plugin Claude Code

Un plugin pour [Claude Code](https://code.claude.com) avec un skill `tiktok-upload`, pour publier
simplement en le demandant :

> Publie ~/Videos/clip.mp4 sur my_account avec la légende « Dans les coulisses 🎬 #fyp », demain à 18 h.

```
/plugin marketplace add makiisthenes/TiktokAutoUploader
/plugin install autotok@autotok
```

Le skill lance la commande `autotok` : [installez autotok](#install) et connectez-vous d'abord. Il choisit
le compte (ou en connecte un via une fenêtre de navigateur), affiche le compte, la vidéo, la légende et l'heure,
et demande confirmation avant de publier, puis publie et explique les éventuelles erreurs. Seules les commandes en lecture seule, comme
lister les comptes, s'exécutent sans demande d'autorisation. Un upload qui a peut-être atteint TikTok, ou peut-être pas, n'est
jamais relancé, pour que rien ne soit publié deux fois. Vous pouvez aussi le lancer directement :
`/autotok:tiktok-upload clip.mp4 "Hello #fyp"`.

Plus de détails dans [`claude-plugin/README.md`](claude-plugin/README.md), y compris comment utiliser le skill
sans le plugin.

---

<a id="cli-reference"></a>

## Référence de la CLI

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

Options d'upload :

| Option | Description | Par défaut |
|---|---|---|
| `-u` / `--user` | Nom du compte enregistré | *obligatoire* |
| `-v` / `--video` | Fichier vidéo (chemin, ou nom dans votre dossier de vidéos) | — |
| `-yt` / `--youtube` | URL YouTube à télécharger puis publier | — |
| `-t` / `--title` | Légende, jusqu'à 2200 caractères | *obligatoire* (ou `--title-file`) |
| `--title-file` | Lire la légende depuis un fichier texte UTF-8, ou depuis stdin avec `-` | — |
| `-sc` / `--schedule` | Publier dans ce nombre de secondes (900–2592000 ; certains comptes n'autorisent que jusqu'à 864000) | maintenant |
| `-vi` / `--visibility` | `0` public, `1` privé | `0` |
| `-ct` / `--comment` | Autoriser les commentaires (`0`/`1`) | `1` |
| `-d` / `--duet` | Autoriser les duos (`0`/`1`) | `0` |
| `-st` / `--stitch` | Autoriser les stitchs (`0`/`1`) | `0` |
| `-ai` / `--ailabel` | Marquer comme généré par IA (`0`/`1`) | `0` |
| `-p` / `--proxy` | Proxy pour cet upload uniquement | proxy du compte |
| `--no-proxy` | Ignorer le proxy enregistré du compte | — |

`python cli.py ...` dans ce dépôt fonctionne toujours et équivaut à `autotok ...`.

<a id="json-output"></a>

### Sortie JSON

Pour les scripts et les autres langages, `--json` fait afficher à `upload` et `accounts` une ligne de JSON sur
stdout au lieu de texte. Les logs vont toujours sur stderr. Les [bibliothèques PHP, Java et C#](#php-java-and-c)
s'en servent.

```bash
autotok --json upload -u alice -v clip.mp4 -t "Hello #fyp"
```

| Commande | Affiche |
|---|---|
| `upload` | `{"video_id": "...", "creation_id": "...", "scheduled_for": "2026-11-02T18:30:00Z"}` (`null` en cas de publication immédiate) |
| `accounts list` | `{"accounts": [{"name": "alice", "session": true, "proxy": "http://user:****@host:port"}]}` |
| `accounts check NAME` | `{"name": "alice", "session_ok": true}` (code de sortie 1 si `false`) |
| `accounts remove NAME` | `{"name": "alice", "removed": true}` (code de sortie 1 si `false`) |

Les erreurs affichent `{"error": {"type": "PublishError", "message": "...", "retryable": false}}`, avec le
code de sortie habituel (2 pour une entrée invalide). `type` est le nom de la classe de l'erreur, par exemple
`ValidationError`, `AccountNotFoundError`, `PublishError` ou `PublishUncertainError`. `retryable`
vaut `true` uniquement quand rien n'a atteint l'étape de publication de TikTok : relancer la commande ne peut donc pas publier
deux fois. Une `PublishError` contient aussi le `status_code` et le `status_msg` renvoyés par TikTok.
Les erreurs que l'analyseur d'arguments détecte avant l'exécution de la commande, comme une option
inconnue ou un nom de compte manquant, affichent à la place l'aide d'utilisation sur stderr, avec le
code de sortie 2 : traitez donc aussi comme une erreur toute sortie qui n'est pas du JSON.

---

<a id="docker"></a>

## Docker

Le `Dockerfile` du dépôt construit la CLI avec Chromium inclus :

```bash
docker build -t autotok .

docker run --rm -it -v autotok-data:/data autotok accounts list
docker run --rm -it -v autotok-data:/data -v "$PWD/videos:/data/videos" \
  autotok upload -u alice -v clip.mp4 -t "Hello #fyp"
```

Les comptes enregistrés se trouvent dans `/data` : gardez ce dossier dans un volume. Les conteneurs n'ont pas d'écran, connectez-vous donc avec un
[navigateur cloud](#cloud-browsers-browserbase-steel) et ouvrez le lien qu'il affiche :

```bash
docker run --rm -it -v autotok-data:/data \
  -e AUTOTOK_BROWSER=browserbase -e BROWSERBASE_API_KEY=bb_live_... \
  autotok login -n alice -p http://user:pass@gate.example.com:7000
```

Vous pouvez aussi enregistrer un cookie de session issu de votre propre navigateur avec `login --sessionid ... --datacenter ...`.

Vous utilisez un navigateur cloud pour tout ? Construisez l'image sans le Chromium local pour qu'elle soit bien plus légère :
`docker build --build-arg INSTALL_BROWSER=false -t autotok:slim .`

---

<a id="web-app-self-hosted"></a>

## Application web (auto-hébergée)

Un panneau de contrôle local avec les comptes, les proxys, une bibliothèque de vidéos, les uploads et un planificateur, ainsi qu'un
navigateur virtuel pour se connecter. Nécessite Docker.

```bash
git clone https://github.com/makiisthenes/TiktokAutoUploader.git
cd TiktokAutoUploader
docker compose up --build
```

Ouvrez <http://localhost:3000>. La documentation de l'API se trouve sur <http://localhost:8000/docs>.

- **Comptes** : ajoutez des comptes en vous connectant via le navigateur virtuel intégré (avec un proxy
  facultatif), puis définissez, modifiez ou testez le proxy de chaque compte et vérifiez sa session.
- **Upload** : déposez un fichier, choisissez-en un dans la bibliothèque, ou collez un lien YouTube. Publiez tout de suite ou
  programmez la publication à n'importe quelle date.
- **Programmations** : le planificateur ne relance que les échecs survenus avant que quoi que ce soit n'atteigne TikTok,
  si bien qu'une tâche ne peut pas publier deux fois. Une tâche interrompue pendant la publication est marquée *may already be
  posted* (peut-être déjà publiée), et la relancer vous demande d'abord de vérifier sur TikTok.

Les données se trouvent dans `./data`. Pour utiliser un compte auquel vous vous êtes connecté avec la CLI, copiez son fichier dans le
stockage de l'application et cliquez sur **Import from disk** dans la page Accounts :

```bash
mkdir -p data/autotok/accounts && cp ~/.autotok/accounts/my_account.json data/autotok/accounts/
```

(Sous Linux, les fichiers écrits par les conteneurs appartiennent à root : pour les comptes que vous gérez dans l'application web,
utilisez donc la connexion intégrée à l'application.)

Pour signer les uploads avec un navigateur cloud, placez `AUTOTOK_BROWSER` et ses réglages (voir
[Navigateurs cloud](#cloud-browsers-browserbase-steel)) dans un fichier `.env` à côté de `docker-compose.yml`.
La connexion via l'application web utilise toujours son navigateur virtuel intégré.

Les scripts qui appellent l'API directement doivent envoyer l'en-tête `X-Requested-With: autotok` sur les requêtes
`POST`/`PATCH`/`DELETE`. Cela empêche d'autres pages web d'utiliser l'API locale.
De plus, l'API ne répond qu'à `localhost` et `127.0.0.1`. Si vous accédez à l'application sous un autre nom
(par exemple derrière votre propre reverse proxy), ajoutez-le à `.env` : `AUTOTOK_ALLOWED_HOSTS=tiktok.home.lan`.

> L'application web n'a pas de système de connexion propre et n'écoute que sur `127.0.0.1`. Ne l'exposez pas sur
> Internet.

---

<a id="configuration"></a>

## Configuration

Tout est facultatif. Placez vos réglages dans un fichier `.env` : copiez [`.env.example`](.env.example) vers `.env`
et renseignez ce dont vous vous servez. `autotok` lit `.env` dans le dossier depuis lequel vous le lancez, puis
`~/.autotok/.env`. Les variables déjà définies dans votre environnement sont prioritaires, et `docker compose`
lit le même fichier. `.env` contient des clés API : ne le commitez donc jamais (il figure dans `.gitignore`).

| Variable | Rôle | Par défaut |
|---|---|---|
| `AUTOTOK_HOME` | Comptes et réglages enregistrés | `~/.autotok` |
| `AUTOTOK_VIDEOS_DIR` | Dossier des vidéos et des téléchargements YouTube | `$AUTOTOK_HOME/videos` |
| `AUTOTOK_BROWSER` | Où tournent les navigateurs de connexion/signature : `local`, `browserbase`, `steel` | `local` |
| `AUTOTOK_BROWSER_CHANNEL` | Utiliser un navigateur installé, par ex. `chrome` | Chromium de Playwright |
| `AUTOTOK_BROWSER_PATH` | Chemin complet vers un binaire Chrome/Chromium | Chromium de Playwright |
| `BROWSERBASE_API_KEY`, `BROWSERBASE_PROJECT_ID`, `BROWSERBASE_REGION`, `BROWSERBASE_PROXY_COUNTRY` | Réglages Browserbase | — |
| `STEEL_API_KEY`, `STEEL_BASE_URL`, `STEEL_CONNECT_URL` | Réglages Steel (`STEEL_BASE_URL` pour l'auto-hébergement) | Steel Cloud |

Les fichiers de compte contiennent votre session TikTok (l'équivalent de votre mot de passe). Ils sont enregistrés avec
des permissions réservées à leur propriétaire ; gardez-les privés.

---

<a id="upgrading-from-tiktokautouploader-1x"></a>

## Migrer depuis TiktokAutoUploader 1.x

- **Installation :** suivez la [prise en main](#getting-started) (`uv tool install "autotok[youtube]"`, puis `autotok install-browser`). Node.js et `npm install` ne sont plus nécessaires.
- **Sessions :** les sessions enregistrées dans `CookiesDir/` sont migrées automatiquement la première fois que vous
  les utilisez depuis le dossier du dépôt. Les options sont les mêmes, et `python cli.py` fonctionne toujours.
- **Programmation :** `-sc` programme de nouveau côté TikTok (de 15 minutes à 10 jours). La file d'attente locale
  de la 1.x (`cli.py schedule list|cancel`) se trouve désormais dans la page Schedules de l'application web.
- **Corrections de bugs :** les réglages de confidentialité, de commentaires, de duos et de stitchs sont désormais réellement appliqués. Les
  versions précédentes publiaient toujours en public avec tout autorisé. Les hashtags sont de nouveau cliquables.
- **Supprimé :** `config.txt` et les utilitaires de montage vidéo ImageMagick, qui n'étaient pas utilisés.

---

<a id="troubleshooting"></a>

## Dépannage

| Problème | Solution |
|---|---|
| `'autotok' is not recognized` / `command not found` | Lancez `uv tool update-shell` une fois et ouvrez un nouveau terminal. Si vous avez installé avec pip, utilisez `python -m autotok ...` |
| `Chromium for Playwright is not installed` | `autotok install-browser` (serveurs Linux : ajoutez `--with-deps`) |
| `TikTok rejected the session` / `session rejected` | `autotok login -n NAME --force` (vérifiez avec `autotok accounts check NAME`) |
| `Invalid parameters (status_code=5)` | TikTok a modifié son API d'upload. Merci d'[ouvrir une issue](https://github.com/makiisthenes/TiktokAutoUploader/issues) avec l'erreur complète. |
| `potential violation of our Community Guidelines` | TikTok a bloqué le contenu de cette vidéo ; ce n'est pas une erreur de l'outil. |
| La page de connexion refuse de vous connecter / affiche des captchas en boucle | Essayez le Chrome installé sur votre machine : ajoutez `AUTOTOK_BROWSER_CHANNEL=chrome` à votre `.env`, ou copiez le cookie `sessionid` depuis votre navigateur et utilisez `autotok login -n NAME --sessionid ...` |
| « Verify it's really you » pendant une connexion cloud | TikTok ne reconnaît pas l'IP du navigateur cloud. Validez la vérification dans la vue en direct (choisissez Email), ou évitez-la avec un proxy ; voir les remarques de la section [Navigateurs cloud](#cloud-browsers-browserbase-steel) |
| La vue en direct de la connexion cloud reste vide (Steel auto-hébergé) | Redémarrez steel-browser avec `DOMAIN=localhost:3000` (son adresse) |
| `Browserbase ... (HTTP 402): Proxies are not included in the free plan` | Retirez `BROWSERBASE_PROXY_COUNTRY`, ou le proxy du compte pour les connexions cloud, ou passez à une offre Browserbase supérieure |
| Avertissement `No TikTok datacenter cookie saved` | Reconnectez-vous avec `autotok login`, ou passez `--datacenter` avec `--sessionid` |
| `may or may not have been posted` | La connexion a été coupée pendant la publication. Vérifiez le compte avant de réessayer, pour éviter un doublon. |

Voir aussi [Problèmes courants](docs/common-problems.md).

---

<a id="professional-software-autotok-pro"></a>

## Logiciel professionnel (autotok Pro)

Inscrivez-vous sur la liste d'attente via ce formulaire : https://forms.gle/M4KpdfruqCukQvj99

Si vous cherchez quelque chose de plus complet, qui vous mènera plus vite à votre objectif, je propose un logiciel qui permet de :

- Gérer plus de 1000 comptes
- Publier automatiquement des vidéos identiques sur plusieurs comptes
- Programmer des vidéos pour plusieurs comptes, de 20 jours à 2 ans à l'avance
- Récupérer automatiquement des vidéos depuis YouTube, X, Reddit, TikTok
- Mettre en place des pipelines de publication, de la source jusqu'au calendrier de publication
- Suivre des métriques sur les performances actuelles de ces différents comptes
- Bénéficier d'un support personnalisé de ma part, pendant 3 mois maximum, pour tout problème que vous pourriez rencontrer
- Utiliser des proxys, avec une interface propre et moderne

Disponible à l'achat : si cela vous intéresse, écrivez-moi à `michaelperes562@gmail.com` avec pour objet `Tiktok Bot Software`, sinon je risque de ne pas voir votre e-mail.

---

<a id="licensing"></a>

## Licence

autotok est distribué sous **double licence** :

- **Open source :** [GNU AGPL v3.0](LICENSE). Utilisez-le, modifiez-le et partagez-le librement. Si vous distribuez une
  version modifiée, ou si vous en faites tourner une en tant que service pour d'autres, vous devez publier votre code source sous la
  même licence.
- **Commerciale :** pour intégrer autotok à des produits propriétaires ou à des services payants sans les obligations de
  l'AGPL, ou pour utiliser autotok Pro, contactez `michaelperes562@gmail.com`.

Copyright © 2021–2026 Michael Peres. Les versions antérieures à la 2.0.0 restent sous la licence avec laquelle elles ont été
publiées. Les scripts de signature inclus sont du code tiers, voir
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Les contributions sont les bienvenues selon les conditions décrites dans
[CONTRIBUTING.md](CONTRIBUTING.md).

---

<a id="support-this-project"></a>

## Soutenir le projet

Si mon travail vous plaît, vous pouvez me soutenir sur [Patreon](https://patreon.com/makiisthenes) ou [Ko-Fi](https://ko-fi.com/makiperes), ou mettre une étoile au projet.

- Merci à [@DelvinBa](https://github.com/DelvinBa) pour le passage au nouvel endpoint d'upload de TikTok. (09/12/2024)

<a id="bugs-and-issues"></a>

## Bugs et problèmes

Merci de signaler les bugs dans l'[onglet Issues](https://github.com/makiisthenes/TiktokAutoUploader/issues) plutôt que par e-mail.
Les problèmes de sécurité passent plutôt par un signalement privé, comme décrit dans [SECURITY.md](SECURITY.md).

<a id="notes-and-terms"></a>

## Remarques et conditions

Ce projet n'est pas affilié à TikTok. Automatiser les publications peut enfreindre les conditions d'utilisation de TikTok
et entraîner la restriction ou le bannissement de comptes. Ne publiez que du contenu dont vous détenez les droits. Utilisation à vos
risques et périls.

<a id="star-history"></a>

## Historique des étoiles

[![Graphique de l'historique des étoiles](https://api.star-history.com/svg?repos=makiisthenes/TiktokAutoUploader&type=Date)](https://star-history.com/#makiisthenes/TiktokAutoUploader&Date)
