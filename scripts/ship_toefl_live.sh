#!/bin/bash
# 把新托福考场加载修复 + 卷 JSON 推到 ECS。禁止 --delete。
# 在有 ~/.ssh/yysd_ecs_deploy 的机器上运行：
#   bash scripts/ship_toefl_live.sh
# 只推 JS/HTML（靠 GitHub raw 回源先恢复开卷）：
#   bash scripts/ship_toefl_live.sh --js-only
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
KEY="${YYSD_SSH_KEY:-$HOME/.ssh/yysd_ecs_deploy}"
HOST="${YYSD_HOST:-root@8.159.129.88}"
JS_ONLY=0
DRY=0

for arg in "$@"; do
  case "$arg" in
    --js-only) JS_ONLY=1 ;;
    --dry-run) DRY=1 ;;
    *) echo "unknown arg: $arg" >&2; exit 2 ;;
  esac
done

if [ ! -f "$KEY" ]; then
  echo "!! 找不到部署密钥: $KEY" >&2
  echo "   在有 yysd_ecs_deploy 的 Mac 上进入本仓库后执行: bash scripts/ship_toefl_live.sh" >&2
  exit 2
fi

RSH="ssh -i $KEY -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new"
RSYNC=(rsync -avz --no-times)
if [ "$DRY" = 1 ]; then
  RSYNC+=(--dry-run)
fi

echo "==> SSH $HOST"
$RSH "$HOST" 'test -d /opt/yysd/web && test -d /opt/yysd/app && echo ok-paths'

put() {
  local src="$1"
  local dest="$2"
  echo "--> $src  →  $dest"
  "${RSYNC[@]}" -e "$RSH" "$src" "$HOST:$dest"
}

echo "==> JS / HTML（先让考场能开）"
put "$ROOT/assets/js/auth.js" /opt/yysd/web/assets/js/auth.js
put "$ROOT/assets/js/auth.js" /opt/yysd/repo/assets/js/auth.js
put "$ROOT/assets/js/toefl-full.js" /opt/yysd/web/assets/js/toefl-full.js
put "$ROOT/assets/js/toefl-full.js" /opt/yysd/repo/assets/js/toefl-full.js
put "$ROOT/app/assets/js/play.js" /opt/yysd/app/assets/js/play.js
put "$ROOT/app/assets/js/play.js" /opt/yysd/repo/app/assets/js/play.js
put "$ROOT/app/review.html" /opt/yysd/app/review.html
put "$ROOT/app/review.html" /opt/yysd/repo/app/review.html

for f in toefl-reading.html toefl-listening.html toefl-speaking.html toefl-writing.html toefl-full.html zone.html; do
  put "$ROOT/$f" "/opt/yysd/web/$f"
  put "$ROOT/$f" "/opt/yysd/repo/$f"
done

if [ "$JS_ONLY" = 1 ]; then
  echo "==> --js-only：跳过卷 JSON。考场会走 GitHub raw 回源。"
  exit 0
fi

echo "==> 网站日期卷 JSON → /opt/yysd/web 与 repo（无 --delete）"
"${RSYNC[@]}" -e "$RSH" --include='*.json' --exclude='*/' --exclude='*' \
  "$ROOT/library/toefl/" "$HOST:/opt/yysd/web/library/toefl/"
"${RSYNC[@]}" -e "$RSH" --include='*.json' --exclude='*/' --exclude='*' \
  "$ROOT/library/toefl/" "$HOST:/opt/yysd/repo/library/toefl/"

echo "==> HIT / bank JSON → /opt/yysd/app 与 repo/app（无 --delete，跳过 incoming/ backups/）"
"${RSYNC[@]}" -e "$RSH" --include='*.json' --exclude='incoming/' --exclude='backups/' --exclude='*/' --exclude='*' \
  "$ROOT/app/library/toefl/" "$HOST:/opt/yysd/app/library/toefl/"
"${RSYNC[@]}" -e "$RSH" --include='*.json' --exclude='incoming/' --exclude='backups/' --exclude='*/' --exclude='*' \
  "$ROOT/app/library/toefl/" "$HOST:/opt/yysd/repo/app/library/toefl/"

echo "==> 上线完成。抽查："
echo "    curl -sI https://youyisida.com/library/toefl/2025-07-04-reading.json"
echo "    curl -sI https://app.youyisida.com/library/toefl/set-1-reading.json"
