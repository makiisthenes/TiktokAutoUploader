#!/usr/bin/env bash
# Developer setup: installs autotok from this checkout plus the browser it needs.
# End users don't need this; they can run: pip install "autotok[youtube]" && autotok install-browser
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

python3 -m pip install -e ".[youtube,shell,dev]"
python3 -m playwright install chromium

echo
echo "Done. Next steps:"
echo "  autotok login -n <account>"
echo "  autotok upload -u <account> -v video.mp4 -t 'My caption #fyp'"
