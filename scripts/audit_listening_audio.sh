#!/bin/bash
# ponytail: ffmpeg clip + DashScope ASR audit for truncated listening MP3s
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${1:-$ROOT/library/mock/cambridge-listening}"
MODE="${2:-start}"   # start = first 35s | dialogue = ss 95 t 28 (section1)
FF="${FFMPEG:-/tmp/ffmpeg}"
CLIP_DIR="${CLIP_DIR:-/tmp/listening_audit_${MODE}}"
mkdir -p "$CLIP_DIR"
rm -f "$CLIP_DIR"/*.mp3 2>/dev/null || true

if [[ ! -x "$FF" ]]; then
  echo "ffmpeg not found at $FF" >&2
  exit 1
fi

shopt -s nullglob
if [[ "$MODE" == "dialogue" ]]; then
  for f in "$SRC"/*_audio1.mp3; do
    base=$(basename "$f" .mp3)
    "$FF" -y -i "$f" -vn -ss 95 -t 28 -ar 16000 -ac 1 -c:a libmp3lame -b:a 48k "$CLIP_DIR/${base}.mp3" 2>/dev/null
  done
else
  for f in "$SRC"/*_audio*.mp3; do
    base=$(basename "$f" .mp3)
    "$FF" -y -i "$f" -vn -ss 0 -t 35 -ar 16000 -ac 1 -c:a libmp3lame -b:a 48k "$CLIP_DIR/${base}.mp3" 2>/dev/null
  done
fi
echo "clips: $(ls "$CLIP_DIR"/*.mp3 2>/dev/null | wc -l | tr -d ' ') mode=$MODE"
