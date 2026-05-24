#!/usr/bin/env bash
set -euo pipefail

# Wie bei ../mathe/deploy-path.sh: rsync per SSH auf den Mondschule-Server.
# Ziel: vhost festival.mondschule.de (DocumentRoot = REMOTE_BASE).
# Next.js läuft als Node-Prozess; Webserver reverse-proxy auf PORT (siehe README).

REMOTE_HOST="${REMOTE_HOST:-178.254.6.104}"
REMOTE_USER="${REMOTE_USER:-lita}"
REMOTE_PORT="${REMOTE_PORT:-22}"
# DocumentRoot des vhosts festival.mondschule.de — falls abweichend, überschreiben:
#   REMOTE_BASE=/pfad/zum/documentroot ./deploy-path.sh
REMOTE_BASE="${REMOTE_BASE:-/var/www/mondschule.de/public_html/festival}"

SRC_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SRC_DIR"

echo "Building Next.js (output: standalone) …"
NODE_ENV=production npm run build

STAND="${SRC_DIR}/.next/standalone"
rm -rf "${STAND}/public" "${STAND}/.next/static" 2>/dev/null || true
cp -R "${SRC_DIR}/public" "${STAND}/public"
mkdir -p "${STAND}/.next"
cp -R "${SRC_DIR}/.next/static" "${STAND}/.next/static"

TARGET="${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_BASE}/"

echo "Deploying ${STAND}/ -> ${TARGET}"

rsync -avz --delete \
  --filter "protect .env" \
  --filter "protect .env.local" \
  --filter "protect .env.production" \
  --exclude ".DS_Store" \
  -e "ssh -p ${REMOTE_PORT}" \
  "${STAND}/" "${TARGET}"

echo "Done. Auf dem Server: .env.production mit Supabase-Variablen, dann Node starten (README)."
