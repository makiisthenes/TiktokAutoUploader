# autotok plugin for Claude Code

Upload and schedule TikTok videos by asking Claude Code, for example:

> Post ~/Videos/clip.mp4 to my_account with the caption "Behind the scenes 🎬 #fyp", tomorrow at 6 pm.

The plugin's `tiktok-upload` skill drives the [autotok](https://github.com/makiisthenes/TiktokAutoUploader)
command line: it picks the account, logs in when needed (in a browser window on your computer),
confirms the account, video, caption and time with you, uploads, and explains any error. Uploads
use your saved accounts and their proxies, and your sessions never leave your computer.

## Install

1. Install autotok and log in once (see the main README's
   [Getting started](https://github.com/makiisthenes/TiktokAutoUploader#getting-started)):

   ```bash
   uv tool install "autotok[youtube]"
   autotok install-browser
   autotok login -n my_account
   ```

2. Add the plugin in Claude Code:

   ```
   /plugin marketplace add makiisthenes/TiktokAutoUploader
   /plugin install autotok@autotok
   ```

   Or from a terminal: `claude plugin marketplace add makiisthenes/TiktokAutoUploader`, then
   `claude plugin install autotok@autotok`.

## Use

Ask in your own words ("upload this to TikTok", "schedule clip.mp4 for Friday 9 am", "which
TikTok accounts do I have?"), or run the skill directly with `/autotok:tiktok-upload`, optionally
followed by the video, caption, account and time.

- **Every upload is a real post.** The skill shows what it will post and asks before uploading,
  and Claude Code asks your permission before running the upload command. Only read-only commands
  (`autotok --version`, `autotok accounts list`, `autotok show`) run without asking.
- Captions go to autotok through stdin, so quotes and emoji arrive exactly as written. That needs
  autotok with `--json` and `--title-file` (the Python package after 2.1.0, or the Go binary after
  0.1.0); with older versions the skill falls back to `-t`.
- An upload that may or may not have reached TikTok is never retried, so nothing is posted twice.

Prefer tools over a skill? autotok also has an [MCP server](https://github.com/makiisthenes/TiktokAutoUploader#mcp-server-ai-agents):
`claude mcp add autotok -- autotok mcp`.

## Without the marketplace

Copy `skills/tiktok-upload` to `~/.claude/skills/tiktok-upload` (for all your projects) or to
`.claude/skills/tiktok-upload` in a project. It's then `/tiktok-upload`.
