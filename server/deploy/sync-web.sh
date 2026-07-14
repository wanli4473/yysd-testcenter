#!/bin/bash
# 优益思达静态站 — 从 GitHub 同步到 nginx 目录（在 ECS 上运行）
# 用法：sudo bash deploy/sync-web.sh
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/yysd/repo}"
WEB_ROOT="${WEB_ROOT:-/opt/yysd/web}"
REPO_URL="${REPO_URL:-https://github.com/wanli4473/yysd-testcenter.git}"
BRANCH="${BRANCH:-main}"

echo "==> 仓库目录: $REPO_DIR"
echo "==> 网站目录: $WEB_ROOT"

if ! command -v git &>/dev/null; then
  echo "!! 请先安装 git: apt-get install -y git"
  exit 1
fi

if [ ! -d "$REPO_DIR/.git" ]; then
  mkdir -p "$(dirname "$REPO_DIR")"
  git clone --branch "$BRANCH" "$REPO_URL" "$REPO_DIR"
fi

cd "$REPO_DIR"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

mkdir -p "$WEB_ROOT"

if command -v rsync &>/dev/null; then
  rsync -a --delete \
    --exclude '.git/' \
    --exclude 'server/' \
    --exclude '.staging/' \
    --exclude 'admin/' \
    --exclude '.github/' \
    --exclude '.env' \
    "$REPO_DIR/" "$WEB_ROOT/"
else
  echo "!! rsync 未安装，使用 cp（较慢）"
  find "$WEB_ROOT" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} + 2>/dev/null || true
  for item in assets data library "*.html" "*.json" scripts; do
    [ -e "$REPO_DIR/$item" ] && cp -a "$REPO_DIR/$item" "$WEB_ROOT/" 2>/dev/null || true
  done
fi

echo ""
echo "==> 校验关键文件"
check() {
  if [ -f "$WEB_ROOT/$1" ]; then
    echo "  ✓ $1"
  else
    echo "  ✗ 缺少 $1"
    missing=1
  fi
}
missing=0
check "dashboard.html"
check "assets/js/dashboard.js"
check "ai-tutor.html"
check "data/speaking/jiijing-banks/2026-q2.json"
check "data/speaking/jiijing-active.json"
check "data/speaking/writing-prompts.json"
check "data/speaking/part1-topics.json"
check "data/speaking/part1-fixed.json"
check "speaking.html"
check "library/practice/jingting/cam20-test1-section1.html"

if grep -q "api.youyisida.com" "$WEB_ROOT/library/practice/jingting/cam20-test1-section1.html" 2>/dev/null; then
  echo "  ✓ 精听页已配置生产 API"
else
  echo "  ✗ 精听页 API_BASE 未指向 api.youyisida.com"
  missing=1
fi

if [ -f /etc/nginx/sites-enabled/youyisida.com ] || grep -Rq "youyisida.com" /etc/nginx 2>/dev/null; then
  if nginx -t 2>/dev/null; then
    systemctl reload nginx 2>/dev/null || service nginx reload 2>/dev/null || true
    echo "  ✓ nginx 已重载"
  fi
fi

echo ""
if [ "$missing" -eq 0 ]; then
  echo "==> 同步完成。请在浏览器强制刷新（Ctrl+Shift+R）后测试口语与精听。"
else
  echo "==> 同步完成但有缺失项，请检查上方 ✗"
  exit 1
fi
