#!/usr/bin/env bash
# Mux a rendered picture with the synthesized score: H.264 copied, AAC 320k.
#   scripts/mux.sh renders/master_video.mp4 build/score.wav renders/autotok-launch.mp4
# AAC encoding can overshoot the score's true peak by about a decibel on hard
# transients, so the encoded file is measured and, if it is above -1 dBTP,
# re-encoded with just enough gain reduction.
set -euo pipefail
video=${1:-renders/master_video.mp4}
audio=${2:-build/score.wav}
out=${3:-renders/autotok-launch.mp4}
ceiling=-1.0

true_peak() {
  # fails (and so stops the script) when no numeric Peak: value was measured; -inf (silence) is a number
  ffmpeg -hide_banner -nostats -i "$1" -map 0:a -af ebur128=peak=true -f null - 2>&1 |
    awk '$1 == "Peak:" { p = $2 } END { if (p !~ /^-?([0-9.]+|inf)$/) exit 1; print p }'
}

gain=0
for pass in 1 2 3; do
  ffmpeg -hide_banner -loglevel error -y -i "$video" -i "$audio" \
    -map 0:v:0 -map 1:a:0 -c:v copy -af "volume=${gain}dB" -c:a aac -b:a 320k -ar 48000 -shortest -movflags +faststart "$out"
  tp=$(true_peak "$out")
  if awk -v tp="$tp" -v c="$ceiling" 'BEGIN { exit !(tp <= c) }'; then
    echo "$out  (audio gain ${gain} dB, true peak ${tp} dBTP)"
    exit 0
  fi
  gain=$(awk -v g="$gain" -v tp="$tp" -v c="$ceiling" 'BEGIN { printf "%.2f", g - (tp - c) - 0.1 }')
done
echo "audio true peak is still ${tp} dBTP after 3 passes (ceiling ${ceiling})" >&2
exit 1
