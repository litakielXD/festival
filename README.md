# Festival Planner MVP

Browserbasierte App fuer Festivalgruppen mit:
- Auth (E-Mail Login/Signup)
- Gruppen und Rollen (`admin`, `member`)
- Bands, Festivaltage und Slots
- Notizen pro Band (`private` oder `group`)
- Live-Timeline mit Status (`running_now`, `upcoming`, `finished`)

## Setup

1. Node.js 20+ und npm installieren.
2. Abhaengigkeiten installieren:
   - `npm install`
3. Umgebungsvariablen setzen:
   - `.env.example` nach `.env.local` kopieren
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (nur serverseitig, fuer Admin-Nutzeranlage)
4. Supabase Migration ausfuehren (empfohlen per CLI):
   - Supabase CLI einmalig installieren (z. B. via Homebrew) oder per `npx` nutzen
   - Einmalig authentifizieren und Projekt verknuepfen:
     - `npx supabase login`
     - `npx supabase link --project-ref <dein-project-ref>`
   - Dann alle offenen Migrationen ausfuehren:
     - `npm run db:push`
5. Development starten:
   - `NODE_OPTIONS=--dns-result-order=ipv4first WATCHPACK_POLLING=true npm run dev -- --hostname 127.0.0.1 --port 3016`

## Dev-Server Stabilitaet (wichtig)

- Nur eine `next dev` Instanz gleichzeitig laufen lassen.
- Wenn 500-Fehler wie `Cannot find module './611.js'` oder fehlende `.next`-Dateien auftreten:
  1. Alle laufenden Dev-Server stoppen (`Ctrl + C` in jedem offenen Terminal)
  2. Build-Cache loeschen: `rm -rf .next`
  3. Dev-Server neu starten mit dem oben genannten Befehl
- Wenn Login mit `fetch failed` scheitert, zuerst Supabase-Erreichbarkeit pruefen:
  - `node -e "require('dns').lookup('xoociazmjgdliaziwqoy.supabase.co',(e,a,f)=>console.log(e||{a,f}))"`
  - `node -e "fetch('https://xoociazmjgdliaziwqoy.supabase.co/auth/v1/health').then(r=>r.text().then(t=>console.log(r.status,t))).catch(console.error)"`

## Supabase Migrations Workflow (ohne SQL Editor)

- Neue Migration erzeugen:
  - `npm run db:new -- <migration_name>`
- Migrationen/Status anzeigen:
  - `npm run db:list`
- Alle offenen Migrationen in Supabase anwenden:
  - `npm run db:push`

Damit musst du SQL aus `supabase/migrations/*.sql` nicht mehr manuell kopieren.

## Wichtige Routen

- `/` Landing
- `/login` Login/Signup
- `/dashboard` Gruppenuebersicht
- `/dashboard/groups/[groupId]/bands` Band-, Slot- und Tagverwaltung
- `/dashboard/groups/[groupId]/notes` Notizen
- `/dashboard/groups/[groupId]/timeline` Live-Timeline

## Git (wie [mathe](https://github.com/litakielXD/mathe))

- Remote: `origin` → `git@github.com:litakielxd/festival.git`
- Hauptbranch: `main` (tracking `origin/main`)
- Commit-Konvention: `feat:`, `fix:`, `chore:`, `docs:`, `style:`, `refactor:`

### Workflow: lokal entwickeln → deployen (ein Befehl)

```bash
./push-and-deploy.sh "feat: Beschreibung der Änderung"
```

Das Skript führt automatisch aus:
1. `npm run lint` (Warnungen werden toleriert)
2. `npm run typecheck` (muss sauber sein)
3. `git add -A && git commit -m "..."`
4. `git push origin main`
5. SSH auf Server → `git pull --rebase` + `npm run build` + `pm2 restart festival`

**Nur pushen ohne Deploy:** `SKIP_DEPLOY=yes ./push-and-deploy.sh "..."`  
**Nur rsync (Fallback ohne git auf Server):** `./deploy-path.sh`

## Deployment

**Live-Ziel:** https://festival.mondschule.de (Subdomain, nicht Unterordner wie `/mathe/`).

Im **Supabase Dashboard** unter Auth → URL configuration die Site-URL und Redirect-URLs um `https://festival.mondschule.de` ergänzen (sonst Login-Redirect nach Deploy fehlerhaft).

### Variante A — eigener Server (Mondschule, rsync wie mathe)

1. Auf dem Server existiert ein vhost mit DocumentRoot = `REMOTE_BASE` (Standard im Skript: `/var/www/festival.mondschule.de`). Pfad bei Bedarf beim Aufruf setzen.
2. **Reverse Proxy** (Apache/Nginx): alles an `http://127.0.0.1:3016` weiterleiten (oder anderen `PORT`), dort läuft `node server.js` aus dem Standalone-Bundle.
3. **Umgebung auf dem Server:** im DocumentRoot eine Datei `.env.production` (oder `.env`) mit denselben Variablen wie lokal (`NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`). Die Datei wird von `deploy-path.sh` nicht gelöscht (`rsync` protect).
4. Deploy vom Entwicklungsrechner:
   ```bash
   chmod +x ./deploy-path.sh
   ./deploy-path.sh
   ```
   Optional wie bei mathe:
   ```bash
   REMOTE_HOST=178.254.6.104 REMOTE_USER=lita REMOTE_BASE=/dein/documentroot ./deploy-path.sh
   ```
5. **Prozess auf dem Server** (Beispiel, Port 3016):
   ```bash
   cd /var/www/festival.mondschule.de   # = REMOTE_BASE
   export $(grep -v '^#' .env.production | xargs)  # oder manuell setzen
   PORT=3016 NODE_ENV=production node server.js
   ```
   Dauerhaft z. B. mit `pm2` oder systemd — nicht Teil dieses Repos.

### Variante B — Vercel

- Projekt verbinden, Supabase-URLs/Keys in den Vercel-Settings setzen.
- Custom Domain `festival.mondschule.de` bei Vercel hinterlegen und DNS (CNAME) setzen.

### Checklisten

- Vor Go-Live: [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md) (manuelle Tests: [TESTING.md](./TESTING.md))
