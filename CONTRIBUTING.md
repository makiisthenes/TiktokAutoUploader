# Contributing

Thanks for helping improve autotok. Bug reports go in
[Issues](https://github.com/makiisthenes/TiktokAutoUploader/issues); pull
requests are welcome.

## Development setup

```bash
git clone https://github.com/makiisthenes/TiktokAutoUploader.git
cd TiktokAutoUploader
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e ".[youtube,shell,dev]"
autotok install-browser
pytest
```

### Node.js / TypeScript package

```bash
cd js
npm ci
npx playwright install chromium   # for the signer tests; they're skipped without it
npm test                          # runs the TypeScript sources directly (Node.js 22.18+)
npm run typecheck
```

The npm package mirrors the Python package module for module (`js/src/uploader.ts` ↔
`autotok/uploader.py`, and so on) and shares its account files and TikTok's signing scripts
(`autotok/signer_js` is copied in at build time). When you change upload behaviour in one, change
the other too; `js/test` checks captions, proxy parsing and request signing against values
produced by the Python package.

### Go module and binary

```bash
cd go
go vet ./...
go test ./...                     # the browser tests need Chrome or Chromium, and are skipped without it
go build ./cmd/autotok            # the single binary
```

The Go module mirrors the Python package too (`go/uploader.go` ↔ `autotok/uploader.py`, and so
on), with the same account files and test values. Go modules can't reach files outside their
folder, so TikTok's signing scripts are copied into `go/signer_js`; CI checks the copy matches
`autotok/signer_js`, so update both together.

### PHP, Java and C# libraries

```bash
(cd php && composer install && vendor/bin/phpunit)
(cd java && mvn test)
(cd dotnet && dotnet test)
```

These run the `autotok` command with `--json` (and send the caption with `--title-file -`), so
they don't reimplement uploading. Their tests run a stand-in for autotok; set `AUTOTOK_TEST_BIN`
to a real autotok (CI builds the Go binary) to also run them against it. When you change the
JSON that `upload` or `accounts` print, in `autotok/cli.py` and `go/cmd/autotok/main.go`, update
the three libraries too.

## Repository layout

| Path | What it is |
|---|---|
| `autotok/` | The `autotok` package published to PyPI (CLI, uploader, browsers) |
| `tests/` | The test suite (`pytest`) |
| `js/` | The `autotok` npm package for Node.js and TypeScript (`npm ci && npm test`) |
| `go/` | The Go module and the single `autotok` binary (`go test ./...`) |
| `php/`, `java/`, `dotnet/` | PHP, Java and C# libraries that run the `autotok` command with `--json` (`vendor/bin/phpunit`, `mvn test`, `dotnet test`) |
| `web/` | The self-hosted web app: `api/` (FastAPI), `scheduler/`, `novnc/` (virtual login browser), `frontend/` (React; `npm ci && npm run dev`) |
| `docs/` | Extra documentation and images |
| `Dockerfile` | Image for the `autotok` CLI |
| `docker-compose.yml` | Runs the web app: `docker compose up --build` |
| `cli.py` | Kept so `python cli.py ...` from 1.x still works |

## Adding a proxy provider

Add a `ProxyProvider` to `PROVIDERS` in `autotok/proxy_providers.py` (the module docstring has an
example). `autotok setup` and the web app's login page pick it up; nothing else needs to change.

## Licensing of contributions

autotok is dual-licensed: the public code is released under the GNU AGPL v3.0,
and Michael Peres also offers it under separate commercial terms (autotok Pro).
To keep that possible, contributions are accepted on these terms:

By submitting a pull request you confirm that you wrote the contribution (or
otherwise have the right to submit it), and you license it to the project under
the AGPL-3.0 **and** grant Michael Peres a perpetual, worldwide, non-exclusive,
royalty-free, irrevocable licence to use, modify, sublicense and distribute your
contribution under any other licence terms, including commercial ones.

If you can't agree to this, please open an issue describing the change instead.
