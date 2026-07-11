#!/bin/bash
# 在 ECS 上运行：bash deploy/diagnose-api.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ok=0
warn=0
fail=0

pass() { echo "  ✓ $1"; ok=$((ok + 1)); }
note() { echo "  · $1"; warn=$((warn + 1)); }
bad()  { echo "  ✗ $1"; fail=$((fail + 1)); }

env_set() {
  local key="$1"
  local val
  val="$(grep -E "^${key}=" .env 2>/dev/null | head -1 | cut -d= -f2- || true)"
  [ -n "$val" ] && [ "$val" != "请改成至少32位随机字符串" ]
}

echo "==> 本机监听端口"
if ss -tlnp 2>/dev/null | grep -E ':80|:443|:3000' || netstat -tlnp 2>/dev/null | grep -E ':80|:443|:3000'; then
  :
else
  note "未检测到 80/443/3000 监听"
fi

echo ""
echo "==> pm2 进程"
if command -v pm2 &>/dev/null; then
  pm2 list 2>/dev/null || note "pm2 list 失败"
else
  bad "pm2 未安装 — 运行 bash deploy/ecs-setup.sh"
fi

echo ""
echo "==> 本地 API 探活"
if curl -fsS -m 3 http://127.0.0.1:3000/api/health; then
  echo ""
  pass "127.0.0.1:3000/api/health 正常"
else
  bad "127.0.0.1:3000/api/health 失败 — 检查 pm2 logs yysd-api"
fi

echo ""
echo "==> nginx api 站点"
if [ -d /etc/nginx ]; then
  if grep -Rq "api.youyisida.com" /etc/nginx 2>/dev/null; then
    pass "nginx 已配置 api.youyisida.com"
  else
    bad "未找到 api.youyisida.com — 参考 deploy/nginx-api.conf"
  fi
else
  note "nginx 未安装"
fi

echo ""
echo "==> .env 上线必填项"
if [ ! -f .env ]; then
  bad ".env 不存在 — cp .env.example .env 并填写"
else
  env_set JWT_SECRET && pass "JWT_SECRET 已设置" || bad "JWT_SECRET 未设置或过短占位"
  env_set ALIYUN_ACCESS_KEY_ID && pass "ALIYUN_ACCESS_KEY_ID 已设置" || bad "ALIYUN_ACCESS_KEY_ID 未设置（无法发短信）"
  env_set ALIYUN_ACCESS_KEY_SECRET && pass "ALIYUN_ACCESS_KEY_SECRET 已设置" || bad "ALIYUN_ACCESS_KEY_SECRET 未设置"
  env_set SMS_SIGN_NAME && pass "SMS_SIGN_NAME 已设置" || bad "SMS_SIGN_NAME 未设置"
  env_set SMS_TEMPLATE_CODE && pass "SMS_TEMPLATE_CODE 已设置" || bad "SMS_TEMPLATE_CODE 未设置"
  env_set CORS_ORIGINS && pass "CORS_ORIGINS 已设置" || bad "CORS_ORIGINS 未设置"
  if env_set DASHSCOPE_API_KEY; then
    pass "DASHSCOPE_API_KEY 已设置（AI 功能可用）"
  else
    note "DASHSCOPE_API_KEY 未设置（精听/口语 AI 不可用，登录不受影响）"
  fi
  if grep -q '^SMS_DEV_MODE=1' .env 2>/dev/null; then
    note "SMS_DEV_MODE=1 — 生产环境请改为 0"
  fi
fi

echo ""
echo "==> 外网 HTTPS 探活（可选）"
if curl -fsS -m 5 https://api.youyisida.com/api/health 2>/dev/null; then
  echo ""
  pass "https://api.youyisida.com/api/health 正常"
else
  note "外网 HTTPS 探活失败 — 检查备案子域名 api、安全组 443、certbot 证书"
fi

echo ""
echo "==> 汇总：${ok} 通过 · ${warn} 提示 · ${fail} 待修复"
if [ "$fail" -gt 0 ]; then
  echo "修复后再执行：pm2 restart yysd-api && bash deploy/diagnose-api.sh"
  exit 1
fi
