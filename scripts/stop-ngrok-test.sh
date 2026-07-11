#!/bin/bash
# 停止 ngrok 内测服务
lsof -ti :3000 | xargs kill 2>/dev/null || true
pkill -f "ngrok http 3000" 2>/dev/null || true
echo "已停止 AI 服务器和 ngrok"
