#!/bin/bash
# Safe API code sync: NEVER touches production SQLite / uploads.
# Usage on ECS: bash /opt/yysd/repo/server/deploy/sync-api.sh
set -euo pipefail
SRC="${1:-/opt/yysd/repo/server}"
DST="${2:-/opt/yysd/server}"

if [[ ! -d "$SRC" || ! -d "$DST" ]]; then
  echo "usage: $0 [src_server_dir] [dst_server_dir]" >&2
  exit 1
fi

# Hard refuse if someone points SRC at live data tree
case "$SRC" in
  */data|*/data/) echo "refusing to sync from data dir: $SRC" >&2; exit 1 ;;
esac

USERS_BEFORE=$(cd "$DST" && node -e 'const D=require("better-sqlite3"); const db=new D("data/yysd.db",{readonly:true}); process.stdout.write(String(db.prepare("SELECT COUNT(*) c FROM users").get().c));')
SIZE_BEFORE=$(stat -c%s "$DST/data/yysd.db")

rsync -a --delete \
  --exclude node_modules/ \
  --exclude .env \
  --exclude data/ \
  --exclude "*.sqlite*" \
  --exclude "*.db*" \
  --exclude "data.sqlite*" \
  "$SRC"/ "$DST"/

USERS_AFTER=$(cd "$DST" && node -e 'const D=require("better-sqlite3"); const db=new D("data/yysd.db",{readonly:true}); process.stdout.write(String(db.prepare("SELECT COUNT(*) c FROM users").get().c));')
SIZE_AFTER=$(stat -c%s "$DST/data/yysd.db")

if [[ "$USERS_BEFORE" != "$USERS_AFTER" || "$SIZE_BEFORE" != "$SIZE_AFTER" ]]; then
  echo "ABORT: db changed during sync (users $USERS_BEFORE->$USERS_AFTER size $SIZE_BEFORE->$SIZE_AFTER)" >&2
  exit 2
fi

echo "sync_api_ok users=$USERS_AFTER db_bytes=$SIZE_AFTER"
pm2 restart yysd-api --update-env
sleep 1
curl -sS -o /dev/null -w "health %{http_code}\n" http://127.0.0.1:3000/api/health
