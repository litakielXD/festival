#!/usr/bin/env bash
set -euo pipefail

# Vom Mac: committen, pushen, Server-Deploy anstoßen (ein Befehl).
# Analog zu ../mathe/push-and-deploy.sh
#
# Usage: ./push-and-deploy.sh "Kurze Commit-Nachricht"
# Ohne Nachricht: "Update festival"
# Optional: SKIP_TYPECHECK=yes  SKIP_LINT=yes  SKIP_DEPLOY=yes

MSG="${*:-Update festival}"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Fehler: Kein Git-Repository." >&2
  exit 1
fi

root="$(git rev-parse --show-toplevel)"
cd "$root"

# --- 1. Lint (nur Warnung, kein Hard-Fail) ---
if [[ "${SKIP_LINT:-}" != "yes" ]]; then
  echo "==> npm run lint"
  npm run lint || echo "    (Lint-Warnungen ignoriert — kein Fehler)"
fi

# --- 2. TypeScript-Check ---
if [[ "${SKIP_TYPECHECK:-}" != "yes" ]]; then
  echo "==> npm run typecheck"
  npm run typecheck
fi

# --- 3. Commit ---
echo "==> git add -A"
git add -A

echo "==> Commit"
if git diff --cached --quiet; then
  echo "    nichts zu committen — nur Push + Deploy"
else
  git commit -m "$MSG"
fi

# --- 4. Push ---
branch="$(git rev-parse --abbrev-ref HEAD)"
echo "==> git push origin $branch"
git push origin "$branch"

# --- 5. Deploy ---
if [[ "${SKIP_DEPLOY:-}" != "yes" ]]; then
  if [[ -x "$root/deploy-remote.sh" ]]; then
    echo "==> deploy-remote.sh (Git-pull auf Server)"
    ./deploy-remote.sh
  else
    echo "==> deploy-path.sh (rsync Standalone — Fallback)"
    ./deploy-path.sh
  fi
fi

echo ""
echo "Fertig. Live unter: https://festival.mondschule.de"
