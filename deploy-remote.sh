#!/usr/bin/env bash
set -euo pipefail

# Vom Mac: nach git push den Server-Deploy via SSH anstoßen.
# Analog zu ../mathe/deploy-remote.sh
#
# Der Server muss einmalig als Git-Checkout aufgesetzt sein (siehe unten).
# Danach: git pull --rebase + npm run build + pm2 restart
#
# === EINMALIG AUF DEM SERVER (falls noch nicht als Git-Checkout) ===
#   cd /var/www
#   git clone https://github.com/litakielxd/festival.git festival.mondschule.de
#   cd festival.mondschule.de
#   npm ci --omit=dev
#   npm run build
#   # .env.production mit echten Werten anlegen (wird nie überschrieben):
#   cp .env.example .env.production   # dann NEXT_PUBLIC_SUPABASE_URL etc. eintragen
#   pm2 start .next/standalone/server.js --name festival \
#     --env production -- --port 3016
#   pm2 save
#   # Nginx/Apache Reverse Proxy: alles → http://127.0.0.1:3016
#
# Defaults per ENV überschreibbar:
REMOTE_HOST="${REMOTE_HOST:-178.254.6.104}"
REMOTE_USER="${REMOTE_USER:-lita}"
REMOTE_PORT="${REMOTE_PORT:-22}"
REMOTE_PROJECT_DIR="${REMOTE_PROJECT_DIR:-/var/www/festival.mondschule.de}"
REMOTE_SERVICE_NAME="${REMOTE_SERVICE_NAME:-festival}"

TARGET="$REMOTE_USER@$REMOTE_HOST"
echo "Remote-Deploy: $TARGET:$REMOTE_PROJECT_DIR"
echo "Service (pm2): $REMOTE_SERVICE_NAME"

ssh -tt -p "$REMOTE_PORT" -o ServerAliveInterval=15 -o ServerAliveCountMax=4 "$TARGET" "bash -s" <<EOF
set -euo pipefail
cd "$REMOTE_PROJECT_DIR"

if [[ ! -d .git ]]; then
  echo "Fehler: Kein Git-Checkout in $REMOTE_PROJECT_DIR" >&2
  echo "Bitte einmalig per: git clone https://github.com/litakielxd/festival.git $REMOTE_PROJECT_DIR" >&2
  exit 1
fi

# Lokale Änderungen stashen falls vorhanden (z.B. .env.production wurde nicht ignoriert)
if [[ -n "\$(git status --porcelain -- ':!.env.production' ':!.env' ':!.env.local')" ]]; then
  echo "Stashe lokale Änderungen …"
  git stash push -u -m "deploy-auto-\$(date +%Y%m%d-%H%M%S)" >/dev/null || true
fi

echo "==> git pull --rebase origin main"
git pull --rebase origin main

echo "==> npm ci --omit=dev (falls package-lock.json geändert)"
npm ci --omit=dev

echo "==> npm run build"
npm run build

echo "==> pm2 restart $REMOTE_SERVICE_NAME"
if pm2 describe "$REMOTE_SERVICE_NAME" >/dev/null 2>&1; then
  pm2 restart "$REMOTE_SERVICE_NAME"
else
  echo "pm2-Prozess '$REMOTE_SERVICE_NAME' nicht gefunden."
  echo "Starte neu mit: pm2 start .next/standalone/server.js --name $REMOTE_SERVICE_NAME -- --port 3016"
  NODE_ENV=production PORT=3016 pm2 start .next/standalone/server.js \
    --name "$REMOTE_SERVICE_NAME" \
    --env production \
    -- --port 3016 || true
fi

echo "==> pm2 save"
pm2 save

echo ""
echo "Deploy fertig. Live unter: https://festival.mondschule.de"
EOF

echo "deploy-remote.sh fertig."
