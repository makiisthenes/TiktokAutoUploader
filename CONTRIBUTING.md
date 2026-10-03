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

## Repository layout

| Path | What it is |
|---|---|
| `autotok/` | The `autotok` package published to PyPI (CLI, uploader, browsers) |
| `tests/` | The test suite (`pytest`) |
| `web/` | The self-hosted web app: `api/` (FastAPI), `scheduler/`, `novnc/` (virtual login browser), `frontend/` (React; `npm ci && npm run dev`) |
| `docs/` | Extra documentation and images |
| `Dockerfile` | Image for the `autotok` CLI |
| `docker-compose.yml` | Runs the web app: `docker compose up --build` |
| `cli.py` | Kept so `python cli.py ...` from 1.x still works |

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
