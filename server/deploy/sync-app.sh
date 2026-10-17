#!/bin/bash
# 机考系统静态站 — 同步 app/ 到 /opt/yysd/app
# 用法：sudo bash deploy/sync-app.sh
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/yysd/repo}"
APP_ROOT="${APP_ROOT:-/opt/yysd/app}"

if [ ! -d "$REPO_DIR/app" ]; then
  echo "!! 仓库缺少 app/ — 中止"
  exit 1
fi

mkdir -p "$APP_ROOT"
rsync -a --delete \
  --exclude '.DS_Store' \
  "$REPO_DIR/app/" "$APP_ROOT/"

echo "==> 校验"
for f in index.html login.html home.html mock.html reading.html reading-lab.html listening.html writing.html speaking.html review.html assets/js/gate.js assets/js/hit-shell.js assets/js/mock.js assets/js/toefl-writing.js library/toefl/set-1-reading.json library/toefl/set-1-listening.json; do
  if [ -f "$APP_ROOT/$f" ]; then
    echo "  ✓ $f"
  else
    echo "  ✗ $f"
    exit 1
  fi
done
echo "==> 同步完成 → $APP_ROOT"
