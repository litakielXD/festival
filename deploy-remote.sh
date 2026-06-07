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
export PATH=~/.npm-global/bin:\$PATH
cd "$REMOTE_PROJECT_DIR"

if [[ ! -d .git ]]; then
  echo "Fehler: Kein Git-Checkout in $REMOTE_PROJECT_DIR" >&2
  exit 1
fi

# Bootstrapping: falls deploy-server.sh noch nicht auf dem Server existiert, einmalig pullen
if [[ ! -f ./deploy-server.sh ]]; then
  echo "Bootstrap: deploy-server.sh fehlt – git pull (ggf. lokale Änderungen stashen) …"
  if [[ -n "\$(git status --porcelain)" ]]; then
    git stash push -u -m "deploy-bootstrap-\$(date +%Y%m%d-%H%M%S)" >/dev/null || true
  fi
  git pull --rebase origin main || git pull --rebase
fi

chmod +x ./deploy-server.sh
./deploy-server.sh "$REMOTE_SERVICE_NAME" --auto-stash
EOF

echo "deploy-remote.sh fertig."
