#!/bin/bash
# 临时公网内测 — ngrok 暴露 AI 精听（方案 B）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="$HOME/.local/node/bin:$PATH"

echo "==> 启动 AI 服务器（端口 3000）…"
lsof -ti :3000 | xargs kill 2>/dev/null || true
sleep 1
cd "$ROOT/server"
nohup npm start > /tmp/yysd-api.log 2>&1 &
for i in 1 2 3 4 5 6 7 8 9 10; do
  curl -sf http://127.0.0.1:3000/api/health >/dev/null 2>&1 && break
  sleep 1
done
if ! curl -sf http://127.0.0.1:3000/api/health | grep -q '"ai":true'; then
  echo "❌ AI 服务器未就绪，查看 /tmp/yysd-api.log"
  tail -5 /tmp/yysd-api.log 2>/dev/null || true
  exit 1
fi
echo "    AI 服务器已就绪"

echo "==> 启动 ngrok 隧道…"
lsof -ti :4040 | xargs kill 2>/dev/null || true
pkill -f "ngrok http 3000" 2>/dev/null || true
sleep 1

if [ -z "${NGROK_AUTHTOKEN:-}" ] && [ -f "$HOME/.ngrok2/ngrok.yml" ]; then
  : # 已配置过
elif [ -z "${NGROK_AUTHTOKEN:-}" ]; then
  echo ""
  echo "⚠️  首次使用需要 ngrok 账号（免费）："
  echo "   1. 打开 https://dashboard.ngrok.com/signup 注册"
  echo "   2. 复制 Authtoken，运行："
  echo "      npx ngrok config add-authtoken <你的token>"
  echo "   3. 再重新运行本脚本"
  echo ""
  exit 1
fi

nohup npx ngrok http 3000 --log=stdout > /tmp/yysd-ngrok.log 2>&1 &
for i in 1 2 3 4 5 6 7 8 9 10; do
  curl -sf http://127.0.0.1:4040/api/tunnels >/dev/null 2>&1 && break
  sleep 1
done

PUBLIC_URL=$(curl -s http://127.0.0.1:4040/api/tunnels | python3 -c "
import sys, json
try:
  data = json.load(sys.stdin)
  for t in data.get('tunnels', []):
    if t.get('proto') == 'https':
      print(t['public_url']); break
except: pass
" 2>/dev/null)

if [ -z "$PUBLIC_URL" ]; then
  echo "❌ ngrok 未获取到公网地址，查看 /tmp/yysd-ngrok.log"
  tail -10 /tmp/yysd-ngrok.log 2>/dev/null || true
  exit 1
fi

TEST_URL="${PUBLIC_URL}/test/jingting"

echo ""
echo "✅ 临时公网链接已生成（发给内测人员）："
echo ""
echo "   $TEST_URL"
echo ""
echo "⚠️  注意："
echo "   · 你的 Mac 必须保持开机，且本脚本服务在运行"
echo "   · 免费 ngrok 链接重启后会变"
echo "   · 首次打开可能有 ngrok 提示页，点 Visit Site 继续"
echo "   · 请用 Chrome 打开，并允许麦克风"
echo ""
echo "停止：bash \"$ROOT/scripts/stop-ngrok-test.sh\""
