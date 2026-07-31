#!/usr/bin/env bash
# ponytail: intro + reading pause + cue + dialogue; loudnorm each segment before concat
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OLD="${1:-$HOME/Desktop/之昂张张张zzz - 【新】IELTS19 Test1 Part1.mp3}"
NEW="${2:-$HOME/Desktop/401cccf7032647eab197f46ab565676e.mp3}"
C16="${3:-$ROOT/library/mock/cambridge-listening/ielts16_test1_audio1.mp3}"
OUT="$ROOT/library/mock/cambridge-listening/ielts19_test1_audio1.mp3"
FFMPEG="${FFMPEG:-/tmp/ffmpeg}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

NORM='loudnorm=I=-16:TP=-1.5:LRA=11'
mk() {
  "$FFMPEG" -y -i "$1" "${@:3}" -af "$NORM" -ar 44100 -ac 2 -c:a libmp3lame -b:a 128k \
    -loglevel error "$TMP/$2"
}

mk "$OLD" 01_intro.mp3 -t 62
mk "$OLD" 02_reading.mp3 -ss 62 -t 38
mk "$NEW" 04_dialogue.mp3

"$FFMPEG" -y -i "$C16" -ss 78.6 -t 3.2 -ar 44100 -ac 2 -c:a libmp3lame -b:a 128k "$TMP/cue_prefix.mp3" -loglevel error
"$FFMPEG" -y -i "$OLD" -ss 61.5 -t 1.4 -ar 44100 -ac 2 -c:a libmp3lame -b:a 128k "$TMP/cue_suffix.mp3" -loglevel error
printf "file '%s'\nfile '%s'\n" "$TMP/cue_prefix.mp3" "$TMP/cue_suffix.mp3" > "$TMP/cue_list.txt"
"$FFMPEG" -y -f concat -safe 0 -i "$TMP/cue_list.txt" -c:a libmp3lame -b:a 128k "$TMP/cue_raw.mp3" -loglevel error
mk "$TMP/cue_raw.mp3" 03_cue.mp3

printf "file '%s'\nfile '%s'\nfile '%s'\nfile '%s'\n" \
  "$TMP/01_intro.mp3" "$TMP/02_reading.mp3" "$TMP/03_cue.mp3" "$TMP/04_dialogue.mp3" > "$TMP/all.txt"
"$FFMPEG" -y -f concat -safe 0 -i "$TMP/all.txt" -c:a libmp3lame -b:a 128k "$OUT" -loglevel error
echo "wrote $OUT ($(wc -c < "$OUT") bytes)"
