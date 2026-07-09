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
echo "==> 下一步（手动）："
echo "1. 编辑 .env：JWT_SECRET、ALIYUN_ACCESS_KEY_ID、ALIYUN_ACCESS_KEY_SECRET、DASHSCOPE_API_KEY"
echo "2. 配置 nginx 反向代理 api.youyisida.com -> 127.0.0.1:3000"
echo "   参考 deploy/nginx-api.conf"
echo "3. certbot --nginx -d api.youyisida.com"
echo "4. pm2 restart yysd-api"
echo "5. curl https://api.youyisida.com/api/health"
