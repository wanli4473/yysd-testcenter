#!/bin/bash
# Deploy AI 升学顾问 Next.js app on ECS (run on server).
# Usage: sudo bash deploy/deploy-admission.sh
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/yysd/repo}"
APP_DIR="$REPO_DIR/admission"
SERVICE_UNIT="/etc/systemd/system/yysd-admission.service"

echo "==> admission dir: $APP_DIR"
cd "$REPO_DIR"
git config --local http.version HTTP/1.1 || true
git fetch origin main
git checkout main
git pull --ff-only origin main

cd "$APP_DIR"
if [ ! -f .env.local ] && [ ! -f .env ]; then
  echo "!! Missing $APP_DIR/.env.local — copy from local and re-run."
  echo "   Need: DATABASE_URL, DIRECT_URL, DASHSCOPE_API_KEY, NEXT_PUBLIC_USE_MOCK=0"
  exit 1
fi

npm install --registry=https://registry.npmmirror.com
export PRISMA_ENGINES_MIRROR="${PRISMA_ENGINES_MIRROR:-https://registry.npmmirror.com/-/binary/prisma}"
npx prisma generate
npm run build

cp "$REPO_DIR/server/deploy/admission.service" "$SERVICE_UNIT"
systemctl daemon-reload
systemctl enable yysd-admission
systemctl restart yysd-admission
systemctl --no-pager --full status yysd-admission | head -20

# nginx snippet already in nginx-site.conf — reload if present
if [ -f /etc/nginx/sites-available/youyisida ] || [ -f /etc/nginx/conf.d/youyisida.conf ]; then
  nginx -t && systemctl reload nginx
  echo "==> nginx reloaded"
else
  echo "==> Ensure nginx has location ^~ /admission → 127.0.0.1:3001 (see server/deploy/nginx-site.conf)"
fi

echo "==> OK → https://youyisida.com/admission/"
