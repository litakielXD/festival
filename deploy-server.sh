#!/usr/bin/env bash
set -euo pipefail

# Safe deploy routine for Festival server.
# Usage: ./deploy-server.sh [service_name] [--auto-stash]

SERVICE_NAME="${1:-festival}"
AUTO_STASH="${2:-}"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

if [[ ! -d .git ]]; then
  echo "Fehler: Kein .git – dieser Ordner ist kein Git-Checkout." >&2
  exit 1
fi

export PATH=~/.npm-global/bin:$PATH

echo "[1/5] Git-Status prüfen"
# Lokale Änderungen stashen falls vorhanden (außer ignorierten env-Dateien)
if [[ -n "$(git status --porcelain -- ':!.env.production' ':!.env' ':!.env.local')" ]]; then
  if [[ "$AUTO_STASH" == "--auto-stash" ]]; then
    git stash push -u -m "deploy-auto-stash-$(date +%Y%m%d-%H%M%S)" >/dev/null
    echo "    Lokale Änderungen stashed."
  else
    echo "Fehler: Lokale Änderungen auf dem Server. Nutze --auto-stash oder committen." >&2
    exit 1
  fi
else
  echo "    Arbeitsverzeichnis ist sauber."
fi

echo "[2/5] git pull --rebase"
git pull --rebase origin main || git pull --rebase

echo "[3/5] npm ci"
npm ci

echo "[4/5] npm run build"
npm run build
echo "    Kopiere statische Assets für Standalone-Auslieferung..."
mkdir -p .next/standalone/.next
cp -rf .next/static .next/standalone/.next/
if [[ -d public ]]; then
  cp -rf public .next/standalone/
fi


echo "[5/5] PM2 Service: $SERVICE_NAME"
if pm2 describe "$SERVICE_NAME" >/dev/null 2>&1; then
  echo "    Dienst existiert. Starte '$SERVICE_NAME' neu..."
  pm2 restart "$SERVICE_NAME"
else
  echo "    PM2-Prozess '$SERVICE_NAME' nicht gefunden."
  echo "    Starte neu mit: pm2 start .next/standalone/server.js --name $SERVICE_NAME -- --port 3016"
  NODE_ENV=production PORT=3016 pm2 start .next/standalone/server.js \
    --name "$SERVICE_NAME" \
    --env production \
    -- --port 3016 || true
fi

echo "    Speichere PM2-Konfiguration..."
pm2 save

echo "deploy-server.sh fertig."
