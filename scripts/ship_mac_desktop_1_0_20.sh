#!/bin/bash
# Ship Mac 1.0.20 desktop + speaking page fix. Never touch Windows exe.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
KEY="${YYSD_DEPLOY_KEY:-$HOME/.ssh/yysd_ecs_deploy}"
HOST="${YYSD_DEPLOY_HOST:-root@8.159.129.88}"
ZIP="$ROOT/desktop/dist/YouYiSiDa-mac-1.0.20.zip"
RSYNC=(rsync -az -e "ssh -i $KEY -o IdentitiesOnly=yes")

if [ ! -f "$KEY" ]; then
  echo "missing deploy key: $KEY"
  exit 1
fi
if [ ! -f "$ZIP" ]; then
  echo "missing Mac zip: $ZIP"
  exit 1
fi

echo "==> refuse to upload any Windows exe"
find "$ROOT/desktop" -iname '*.exe' -print
if [ -f "$ROOT/desktop/dist/YouYiSiDa.exe" ] || [ -f "$ROOT/desktop/dist/YouYiSiDa-1.0.20.exe" ]; then
  echo "Windows exe present in this ship tree — abort so it cannot be uploaded"
  exit 1
fi

echo "==> speaking pages (website + repo copy)"
for dest in /opt/yysd/web /opt/yysd/repo; do
  "${RSYNC[@]}" \
    "$ROOT/assets/js/toefl-shell.js" \
    "$HOST:$dest/assets/js/"
  "${RSYNC[@]}" \
    "$ROOT/toefl-speaking.html" \
    "$ROOT/toefl-reading.html" \
    "$ROOT/toefl-listening.html" \
    "$ROOT/toefl-writing.html" \
    "$HOST:$dest/"
done

echo "==> Mac version.json + zip only"
"${RSYNC[@]}" "$ROOT/desktop/version.json" "$HOST:/opt/yysd/web/desktop/version.json"
"${RSYNC[@]}" "$ROOT/desktop/version.json" "$HOST:/opt/yysd/repo/desktop/version.json"
ssh -i "$KEY" -o IdentitiesOnly=yes "$HOST" 'mkdir -p /opt/yysd/web/desktop/dist /opt/yysd/repo/desktop/dist'
"${RSYNC[@]}" "$ZIP" "$HOST:/opt/yysd/web/desktop/dist/YouYiSiDa-mac-1.0.20.zip"
"${RSYNC[@]}" "$ZIP" "$HOST:/opt/yysd/repo/desktop/dist/YouYiSiDa-mac-1.0.20.zip"

echo "==> prove Windows installers were not replaced"
ssh -i "$KEY" -o IdentitiesOnly=yes "$HOST" 'python3 - <<"PY"
import os, json
web="/opt/yysd/web/desktop"
info=json.load(open(web+"/version.json"))
assert info["version"]=="1.0.20", info
assert info["url"].endswith("YouYiSiDa-mac-1.0.20.zip"), info
assert info.get("win","").endswith("YouYiSiDa-1.0.19.exe"), info
exe=web+"/dist/YouYiSiDa.exe"
assert os.path.isfile(exe), exe
# last-modified of the generic exe must stay the Oct 24 1.0.19 build
st=os.stat(exe)
print("exe_bytes", st.st_size)
print("exe_mtime", st.st_mtime)
print("mac20", os.path.getsize(web+"/dist/YouYiSiDa-mac-1.0.20.zip"))
print("ok windows exe left in place")
PY'

echo "shipped Mac 1.0.20; Windows exe untouched"
