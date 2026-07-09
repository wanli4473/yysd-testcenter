#!/bin/bash
# 本地 AI 精听测试 — 一键启动（优益思达）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="$HOME/.local/node/bin:$PATH"

TEST_URL="http://127.0.0.1:8080/library/practice/jingting/cam20-test1-section1.html"
SPEAKING_URL="http://127.0.0.1:8080/speaking.html"

echo "==> 检查 Node.js…"
if ! command -v node &>/dev/null; then
  echo "未找到 node，请先安装或确认 ~/.local/node 存在"
  exit 1
fi

echo "==> 启动 AI 服务器 (端口 3000)…"
cd "$ROOT/server"
if lsof -ti :3000 &>/dev/null; then
  echo "    端口 3000 已在运行，跳过"
else
  nohup npm start > /tmp/yysd-api.log 2>&1 &
  sleep 2
fi

echo "==> 启动网站预览 (端口 8080)…"
cd "$ROOT"
if lsof -ti :8080 &>/dev/null; then
  echo "    端口 8080 已在运行，跳过"
else
  nohup python3 -m http.server 8080 > /tmp/yysd-web.log 2>&1 &
  sleep 1
fi

if curl -sf http://127.0.0.1:3000/api/health | grep -q '"ai":true'; then
  echo "    AI 服务：已就绪"
else
  echo "    AI 服务：未就绪，请查看 /tmp/yysd-api.log"
fi

echo ""
echo "✅ 本地测试环境已就绪"
echo ""
echo "📎 精听测试："
echo "   $TEST_URL"
echo "📎 口语练习："
echo "   $SPEAKING_URL"
echo ""
echo "停止服务：lsof -ti :3000 | xargs kill; lsof -ti :8080 | xargs kill"
