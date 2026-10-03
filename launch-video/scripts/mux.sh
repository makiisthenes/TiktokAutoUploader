#!/usr/bin/env bash
# Mux a rendered picture with the synthesized score: H.264 copied, AAC 320k.
#   scripts/mux.sh renders/master_video.mp4 build/score.wav renders/autotok-launch.mp4
set -euo pipefail
video=${1:-renders/master_video.mp4}
audio=${2:-build/score.wav}
out=${3:-renders/autotok-launch.mp4}
ffmpeg -hide_banner -loglevel error -y -i "$video" -i "$audio" \
  -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 320k -ar 48000 -shortest -movflags +faststart "$out"
echo "$out"
