#!/bin/bash
# ponytail: file-level HBR of open WAL is unsafe — checkpoint then copy main db
set -euo pipefail
DIR=/opt/yysd/server
OUT="$DIR/data/backups"
KEEP=168 # hourly × 168 ≈ 7d local rollback (~0.5GB at current db size)
mkdir -p "$OUT"
cd "$DIR"
STAMP=$(date -u +%Y-%m-%dT%H-%M-%SZ)
DEST="$OUT/yysd-$STAMP.db"
node -e 'const Database=require("better-sqlite3"); const db=new Database("data/yysd.db"); console.log(db.pragma("wal_checkpoint(TRUNCATE)")); db.close();'
cp -a data/yysd.db "$DEST"
cp -a "$DEST" "$OUT/yysd-latest.db"
ls -1t "$OUT"/yysd-2*.db 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f
echo "backup_ok $DEST $(stat -c%s "$DEST") bytes"
