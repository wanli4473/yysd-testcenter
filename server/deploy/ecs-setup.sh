#!/bin/bash
# 优益思达登录 API — ECS 一键部署（Ubuntu/Debian）
# 用法：在服务器上 cd 到本仓库 server 目录后执行 bash deploy/ecs-setup.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> 安装 Node.js 20（若已安装可跳过）"
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

echo "==> 安装依赖"
npm install --production

if [ ! -f .env ]; then
  cp .env.example .env
  echo "!! 请编辑 $ROOT/.env 填写 JWT_SECRET 和阿里云 AccessKey"
fi

echo "==> 安装 pm2"
sudo npm install -g pm2 2>/dev/null || npm install -g pm2

echo "==> 启动 API"
pm2 delete yysd-api 2>/dev/null || true
pm2 start server.js --name yysd-api
pm2 save
pm2 startup | tail -1 | sudo bash 2>/dev/null || true

echo ""
echo "==> 部署前必读（外网探活失败时按此排查）"
echo "0. 备案：在阿里云备案控制台为 youyisida.com 添加子域名 api 的接入；未备案时访问 api.youyisida.com 会被阿里云拦截"
echo "1. 安全组：放行入站 TCP 80、443（3000 仅需本机，勿对公网开放）"
echo "2. 编辑 .env：JWT_SECRET（openssl rand -hex 32）、ALIYUN AccessKey、短信签名/模板"
echo "3. nginx 反代 api.youyisida.com -> 127.0.0.1:3000（参考 deploy/nginx-api.conf）"
echo "4. certbot --nginx -d api.youyisida.com   # 正式站前端使用 https"
echo "5. pm2 restart yysd-api"
echo "6. 复制 deploy/nginx-site.conf 到 nginx，certbot -d youyisida.com -d www.youyisida.com"
echo "7. sudo bash deploy/sync-web.sh          # 同步静态站到 /opt/yysd/web（口语题库、精听 AI 等）"
echo "8. bash deploy/diagnose-api.sh          # 逐项检查 JWT / 短信 / HTTPS"
echo "9. 浏览器测试 https://youyisida.com/login.html 与口语/精听"
