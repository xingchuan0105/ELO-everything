#!/usr/bin/env bash
# Deploy ELO-everything to Debian VPS (context-osv6 main: 43.161.220.253)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${VPS_ENV_FILE:-/home/chuan/context-osv6/avrag-rs/.env}"
# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

HOST="${VPS_MAIN_HOST:?}"
USER="${VPS_MAIN_USER:?}"
PASS="${VPS_MAIN_PASSWORD:?}"
REMOTE_DIR=/opt/elo-everything
SSH=(sshpass -p "$PASS" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=30)
SCP=(sshpass -p "$PASS" scp -o StrictHostKeyChecking=no)
RSYNC=(sshpass -p "$PASS" rsync -az --delete
  -e "ssh -o StrictHostKeyChecking=no -o ConnectTimeout=30"
  --exclude node_modules
  --exclude .next
  --exclude dist
  --exclude .git
  --exclude '**/*.tsbuildinfo'
  --exclude .env
)

echo "==> rsync → ${USER}@${HOST}:${REMOTE_DIR}"
"${SSH[@]}" "${USER}@${HOST}" "mkdir -p ${REMOTE_DIR}"
"${RSYNC[@]}" "${ROOT}/" "${USER}@${HOST}:${REMOTE_DIR}/"

echo "==> remote setup"
"${SSH[@]}" "${USER}@${HOST}" bash -s <<'REMOTE'
set -euo pipefail
cd /opt/elo-everything

# pnpm: corepack stub may be broken; force npm global pnpm@9
if ! pnpm -v >/dev/null 2>&1; then
  npm install -g pnpm@9.15.9 --force
fi
pnpm -v

# env
if [ ! -f .env ]; then
  PG_PASS=$(openssl rand -hex 12)
  SESSION=$(openssl rand -hex 32)
  cat > .env <<EOF
DATABASE_URL=postgresql://elo:${PG_PASS}@127.0.0.1:54330/elo_everything
POSTGRES_PASSWORD=${PG_PASS}
PORT=3011
WEB_ORIGIN=https://elo.contextlm.top
ELO_API_ORIGIN=http://127.0.0.1:3011
SESSION_SECRET=${SESSION}
EOF
  echo "created .env"
else
  echo "keep existing .env"
fi
# Drift guard: hand-edited .env once broke the API silently
# (PORT=3001 collided with an unrelated next-server; DB port pointed at 54329).
# Enforce the deploy contract values, keep secrets (passwords/SESSION_SECRET) as-is.
sed -i -e 's|^PORT=.*|PORT=3011|' \
       -e 's|^WEB_ORIGIN=.*|WEB_ORIGIN=https://elo.contextlm.top|' \
       -e 's|@localhost:54329/|@127.0.0.1:54330/|' .env
if ! grep -q '^PORT=' .env; then echo 'PORT=3011' >> .env; fi
if ! grep -q '^WEB_ORIGIN=' .env; then echo 'WEB_ORIGIN=https://elo.contextlm.top' >> .env; fi
# load secrets without forcing NODE_ENV=production into install
set -a
# shellcheck disable=SC1091
source .env
set +a
export NODE_ENV=development
export CI=1

# postgres
docker compose -f deploy/docker-compose.prod.yml --env-file .env up -d
echo "waiting for postgres..."
for i in $(seq 1 30); do
  if docker exec elo-postgres pg_isready -U elo -d elo_everything >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
docker exec elo-postgres pg_isready -U elo -d elo_everything

# install (devDeps required: typescript, tsx)
pnpm install --frozen-lockfile || pnpm install
# Migrate from a subshell so a migrate failure exits loudly (set -e) and the
# parent cwd never stays inside packages/db — that stranded every later
# `cp deploy/...` on "No such file or directory".
(
  cd packages/db
  DATABASE_URL="$DATABASE_URL" npx tsx src/migrate.ts
)

# build next
export ELO_API_ORIGIN=http://127.0.0.1:3011
export NODE_ENV=production
pnpm --filter @elo/web build

# systemd + nginx
cp deploy/elo-api.service /etc/systemd/system/elo-api.service
cp deploy/elo-web.service /etc/systemd/system/elo-web.service
cp deploy/nginx-elo.contextlm.top.conf /etc/nginx/conf.d/elo.contextlm.top.conf
systemctl daemon-reload
systemctl enable elo-api elo-web
systemctl restart elo-api
sleep 2
systemctl restart elo-web
nginx -t && systemctl reload nginx

sleep 2
systemctl is-active elo-api elo-web
curl -sS -o /dev/null -w "web_local %{http_code}\n" http://127.0.0.1:3110/ || true
curl -sS -o /dev/null -w "api_local %{http_code}\n" http://127.0.0.1:3011/api/v1/auth/me || true
curl -sS -o /dev/null -w "nginx_vhost %{http_code}\n" -k --resolve elo.contextlm.top:443:127.0.0.1 https://elo.contextlm.top/ || true
echo "deploy remote done"
REMOTE

echo "==> smoke public (may fail if DNS not pointed yet)"
curl -sS -o /dev/null -w "public %{http_code} https://elo.contextlm.top/\n" --connect-timeout 10 https://elo.contextlm.top/ || true
echo "OK: https://elo.contextlm.top (DNS A/CNAME → ${HOST} or Cloudflare orange-cloud)"
echo "    local API :3011  web :3110  pg :54330"
