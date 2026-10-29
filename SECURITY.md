# Security policy

## Supported versions

Security fixes go into the latest release of each package.

| Package | Supported |
|---|---|
| `autotok` on PyPI (CLI, Python SDK, MCP server, web app) | Latest 2.x release |
| `autotok` on npm (TypeScript SDK) | Latest 0.x release |
| Go module and `autotok` binary (`go/v*` releases) | Latest 0.x release |
| PHP, Java and C# libraries, Claude Code plugin | The `main` branch |
| TiktokAutoUploader 1.x | Not supported: upgrade to 2.x |

## Reporting a vulnerability

Please don't report security problems in public issues, pull requests or discussions.

Report them privately on GitHub instead: open the repository's **Security** tab and click
**Report a vulnerability**, or go straight to
<https://github.com/makiisthenes/TiktokAutoUploader/security/advisories/new>.

Please include:

- which package and version is affected (`autotok --version`, or the npm or Go version),
- how to reproduce the problem, ideally with the smallest example you can,
- what an attacker could do with it.

You'll get a reply in the advisory. Once a fix is released, the advisory is published with credit
to you, unless you'd rather stay anonymous.

## What counts

For example:

- saved TikTok sessions (`~/.autotok/accounts`) or proxy passwords leaking, through logs, error
  messages, the MCP server, the web app or its API,
- other websites being able to use the web app's local API, or to watch or control its login
  browser,
- the MCP server or a library running commands or reading files it shouldn't,
- an upload going to a different account or through a different proxy than the one asked for.

Not in scope: problems in TikTok itself, TikTok restricting or banning accounts, and running the
web app or `autotok mcp --http` on a network you don't trust, which the README advises against.

## Keeping your accounts safe

Account files hold your TikTok session, which works like a password. autotok saves them with
owner-only permissions; don't share them, commit them or copy them to machines you don't trust.
Keep `.env` files, which can hold cloud browser API keys and proxy passwords, out of version
control too.
