#!/usr/bin/env bash
# Boot the display stack then exec the FastAPI control server in the
# foreground. Using exec at the end means Docker sees the control server's
# exit code, and the backgrounded X services die with the container.
set -euo pipefail

# Clean up any stale X11 lock files from previous runs so Xvfb can start cleanly.
rm -f /tmp/.X*-lock

# Xvfb on :99 at fingerprint-friendly resolution.
Xvfb :99 -screen 0 "${SCREEN_GEOMETRY}" -nolisten tcp &
sleep 1

# Minimal window manager — otherwise Chromium opens without frame chrome.
fluxbox >/dev/null 2>&1 &

# VNC server sharing the Xvfb display. -forever stays up across disconnects.
x11vnc -display :99 -forever -shared -nopw -rfbport 5900 -quiet >/dev/null 2>&1 &

# websockify bridges the websocket noVNC speaks to the raw VNC on 5900.
websockify --web=/usr/share/novnc 6080 localhost:5900 >/dev/null 2>&1 &

# FastAPI control server in foreground.
exec uvicorn novnc.control_server:app --host 0.0.0.0 --port 7900
