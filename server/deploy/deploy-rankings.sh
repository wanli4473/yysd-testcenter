#!/usr/bin/env bash
# Deploy 全球大学排行榜 Next.js app on ECS (run on server).
# Usage: sudo bash deploy/deploy-rankings.sh
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/yysd/repo}"
APP_DIR="$REPO_DIR/rankings"
SERVICE_UNIT="/etc/systemd/system/yysd-rankings.service"

echo "==> rankings dir: $APP_DIR"
cd "$REPO_DIR"
git config --local http.version HTTP/1.1 || true
git fetch origin main
git checkout main
git pull --ff-only origin main

cd "$APP_DIR"
if [ ! -f .env ] && [ ! -f .env.local ]; then
  echo 'DATABASE_URL="file:./dev.db"' > .env
  echo "==> wrote default SQLite .env"
fi

npm install --registry=https://registry.npmmirror.com
export PRISMA_ENGINES_MIRROR="${PRISMA_ENGINES_MIRROR:-https://registry.npmmirror.com/-/binary/prisma}"
npx prisma generate
npx prisma db push
npm run seed
npm run build

cp "$REPO_DIR/server/deploy/rankings.service" "$SERVICE_UNIT"
systemctl daemon-reload
systemctl enable yysd-rankings
systemctl restart yysd-rankings
systemctl --no-pager --full status yysd-rankings | head -20

# Ensure nginx has /rankings → :3002
NGINX_SRC="$REPO_DIR/server/deploy/nginx-site.conf"
for cand in /etc/nginx/sites-available/youyisida.com /etc/nginx/sites-available/youyisida /etc/nginx/conf.d/youyisida.conf; do
  if [ -f "$cand" ]; then
    if ! grep -q 'location ^~ /rankings' "$cand" 2>/dev/null; then
      echo "==> patching $cand with /rankings location from repo template"
      cp "$NGINX_SRC" "$cand"
    else
      # refresh from repo so rankings block stays current
      cp "$NGINX_SRC" "$cand"
    fi
    nginx -t && systemctl reload nginx
    echo "==> nginx reloaded ($cand)"
    break
  fi
done

echo "==> OK → https://youyisida.com/rankings/"
