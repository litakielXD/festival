# Entwicklungsplan — Festival Planner

**Ziel-URL:** https://festival.mondschule.de  
**Stack:** Next.js 15 (App Router, RSC), TypeScript, Supabase (Auth + Postgres + Storage), TailwindCSS v3  
**Deploy-Workflow:** `git push origin main` → `./deploy-path.sh` (rsync Standalone nach `/var/www/festival.mondschule.de`)

---

## 1. Projektstatus (Ist-Stand, Mai 2026)

### 1.1 Was ist gebaut

Die App ist ein kollaborativer Festival-Planer für Gruppen. Ein System-Admin verwaltet Festivals, Personen und Lineup. Mitglieder nutzen die Festivalseiten interaktiv.

#### Authentifizierung & Routing
- E-Mail/Passwort-Login via Supabase Auth (`/login`, `/reset-password`)
- **Selbstregistrierung:** `signUpWithEmail`-Action in `lib/actions/auth.ts` vorhanden — als Formular auf `/login` eingebaut (unfertig, kein eigener Bereich, kein Confirmation-Callback)
- Middleware-Schutz: alle `/dashboard/*`-Routen → Redirect auf `/login` wenn nicht eingeloggt
- Logout via Server Action

#### Rollen-System (3 Ebenen)
| Rolle | Zugang |
|---|---|
| **System-Admin** (E-Mail in `ADMIN_EMAILS`) | Adminbereich, volle Verwaltung |
| **Festival-Admin** (`festival_members.role = admin`) | Festival-Detailseiten, keine globale Verwaltung |
| **Festival-Member** (`festival_members.role = member`) | Festival-Detailseiten (Timeline, Ranking, Notizen, DMs) |

#### Dashboard (`/dashboard`)
- Übersicht: Kommende Festivals, Vergangene Festivals, Neueste Nachrichten (3-Spalten-Grid, responsive)
- Festival-Liste (`/dashboard/festivals`): alle zugewiesenen Festivals

#### Festival-Detailseiten (`/dashboard/festivals/[festivalId]/`)
| Route | Inhalt |
|---|---|
| `(root)` | Mitgliederliste + Festival-Direktnachrichten (DMs) |
| `timeline` | Live-Timeline mit Slots, Status (Live/Upcoming/Finished), Offline-Cache, Favoriten-Filter |
| `bands` | Band-Ranking (Drag & Drop + Pfeil-Buttons, Favoriten-Filter, Genre-Verwaltung) |
| `notes` | Notizen pro Band (`private` / `group`), PDF-Export |
| `ranking` | (Alias/Redirect auf `bands`) |

#### Adminbereich (`/dashboard/admin`)
- Tab „Personen": Person anlegen (Username, E-Mail, Passwort), Passwort ändern, löschen
- Tab „Festivals": Festival erstellen/bearbeiten (Name, Bild, Datum, Ort), Mitglieder zuweisen, Rollen ändern, Mitglieder entfernen, Band + Slot hinzufügen, Festival löschen

#### Komponenten
| Datei | Funktion |
|---|---|
| `festival-timeline-cached-view.tsx` | Timeline mit LocalStorage-Cache, Online/Offline-Status, Band-Detail-Sheet |
| `festival-band-ranking-board.tsx` | Drag & Drop Ranking, Genre-Badges, Favoriten-Filter |
| `festival-favorites-controls.tsx` | Herz-Button (localStorage), Filter-Toggle |
| `festival-band-genre-add.tsx` | Genre-Tag hinzufügen (max. 3 pro Band), Duplikat-Schutz |
| `festival-nav.tsx` | Desktop-Tab-Nav + Mobile-Bottom-Bar (4 Tabs) |
| `main-menu.tsx` | Hamburger/Hauptmenü (Admin-Link bedingt) |
| `avatar-upload-field.tsx` | Bild-Upload zu Supabase Storage (`avatars`-Bucket) |
| `notes-pdf-download-button.tsx` | jsPDF-Export der aktuellen Notizen-Ansicht |
| `offline-indicator.tsx` | Anzeige bei fehlender Netzverbindung |
| `genre-badge.tsx` | Genre-Tag-Anzeige mit stilisierten Varianten (techno, metal, punk, indie) |

#### Datenbank (Supabase, 27 Migrationen)
- Tabellen mit RLS: `profiles`, `groups`, `group_members`, `festivals`, `festival_groups`, `festival_members`, `festival_days`, `bands`, `band_slots`, `notes`, `festival_direct_messages`, `group_direct_messages`, `festival_band_rankings`, `festival_band_genres`, `group_invites`
- Storage-Bucket `avatars` mit RLS-Policies

#### Technische Besonderheiten
- **Offline-first Timeline**: LocalStorage-Cache (Versionskey `v2`), automatisches Refresh bei Reconnect
- **Live-Status**: `running_now` / `upcoming` / `finished` via `getSlotStatus()` (clientseitig)
- **Live-Refresh**: `timeline-live-refresh.tsx` (Polling oder Reconnect)
- **Genre-System**: normalisiert (`lib/genre/normalize.ts`), max. 3 Tags pro Band, user-spezifische Beiträge löschbar
- **Favoriten**: localStorage per User+Festival-Key, Custom Events für Cross-Component-Sync

---

## 2. Identifizierte Lücken & Verbesserungsbedarf

### 2.1 UX / Design
- [ ] App-Name „Festival Quatsch" im Header ist Platzhalter → sollte konfigurierbarer App-Name werden
- [ ] Dashboard-Karten haben keine Hover-Animation / aktiven Zustände
- [ ] Festival-Nav (Desktop) hat keine aktiven Zustandsmarkierungen
- [ ] Admin-Seite: lange, unstrukturierte Seite ohne Accordion-State-Persistenz
- [x] Nachrichten-Bereich im Festival ist flach (keine Bubble-Chat-UI, kein Zeitstempel prominent)
- [x] Fehlende Ladeanimationen / Skeleton-States
- [ ] Keine konsistente Toast/Feedback-Komponente (aktuell: diverse `text-xs text-rose-700` etc.)

### 2.2 Funktionen
- [x] **Selbstregistrierung fertigstellen:** `/register`-Seite, `/auth/confirm`-Route, Redirect nach Erfolg, Hinweis wenn Dashboard leer (kein Festival zugewiesen)
- [ ] Band-Slot-Zeiten nur per Admin editierbar; Members können keine Uhrzeit-Vorschläge machen
- [x] Keine Suche/Filter in der Band-Liste
- [ ] Kein Gruppen-Chatroom (nur 1:1-DMs)
- [ ] Keine Push-Notifications / Echtzeit-Updates via Supabase Realtime (nur Timer-Polling)
- [ ] Profilseite (`/dashboard/profile`) vorhanden aber rudimentär
- [x] Kein Dark-Mode-Toggle (nur System-Präferenz)

### 2.3 Code-Qualität
- [ ] Inline Server Actions in Page-Komponenten (`action={async (formData) => { "use server"; ... }}`) → besser in `lib/actions/` auslagern
- [ ] `group*`-Datenbank-Tabellen und -Routes noch vorhanden (aus altem Gruppen-MVP); teilweise tote Code-Pfade
- [ ] Kein einheitliches Error-Boundary / Loading-Boundary Pattern
- [ ] `components/ui/` hat nur `button.tsx` + `input.tsx`; kein konsistentes Design-System

### 2.4 Deploy / DevOps
- [x] Kein `push-and-deploy.sh`-Äquivalent (analog zu mathe) — → **erfolgreich umgesetzt**
- [x] Kein Server-seitiger `deploy-server.sh` (für git-pull + pm2/systemd-Restart auf dem Server)
- [x] Kein automatisches Syntax/Type-Check vor Commit
- [ ] `ENTWICKLUNGSPLAN_14_TAGE.md` war leer

---

## 3. Priorisierter Entwicklungsplan (Nächste Schritte)

### Phase 1 — Deploy-Infrastruktur & Git-Workflow (sofort)

Analog zu `../mathe`: einmaliger Umbau auf Git-basiertes Deployment (server-seitiger `git pull`), damit nach jeder Überarbeitung ein einziger Befehl genügt.

**Ziel:** `./push-and-deploy.sh "Fix: ..."` → commit, push, Server macht `git pull`, npm build, pm2 restart.

#### Dateien die erstellt/angepasst werden:

**[MODIFY] `deploy-path.sh`**
- Aktuell: rsync des Standalone-Bundles (funktioniert, aber kein git-pull auf dem Server)
- Besser: beibehalten als Fallback (rsync-Methode), da Next.js Standalone kein `git pull` braucht
- Alternative: Neuer Workflow via `deploy-remote.sh` (SSH + git pull + npm run build + pm2 restart)

**[NEU] `push-and-deploy.sh`**
```bash
#!/usr/bin/env bash
# Usage: ./push-and-deploy.sh "Commit-Nachricht"
# Analog zu ../mathe/push-and-deploy.sh
# 1. npm run lint + typecheck (optional)
# 2. git add -A && git commit -m "$MSG"
# 3. git push origin main
# 4. Variante A: ./deploy-path.sh (rsync Standalone)
#    oder Variante B: ./deploy-remote.sh (SSH git pull + pm2)
```

**[NEU] `deploy-remote.sh`** (Variante B, Git-pull auf Server)
```bash
# SSH in Server, cd /var/www/festival.mondschule.de
# git pull --rebase origin main
# npm ci --omit=dev (falls package.json geändert)
# npm run build
# pm2 restart festival (oder systemctl restart festival)
```

**[NEU] `deploy-server.sh`** (läuft auf dem Server selbst, vom SSH-Script aufgerufen)
```bash
# Auf dem Server: git pull, ggf. npm ci, npm run build, pm2 restart
```

#### Einmalig auf dem Server (Setup):
```bash
# Server-Setup für festival.mondschule.de:
cd /var/www
git clone https://github.com/litakielxd/festival.git festival.mondschule.de
cd festival.mondschule.de
cp .env.example .env.production
# .env.production mit echten Werten füllen
npm ci --omit=dev
npm run build
# pm2 start .next/standalone/server.js --name festival -- --port 3016
# oder: systemd service (wie in README)
# Nginx/Apache Reverse Proxy auf 127.0.0.1:3016
# Supabase: Site-URL + Redirect-URL auf https://festival.mondschule.de setzen
```

**[MODIFY] `.gitignore`** — `.env.production` explizit ausschließen (aktuell nur `.env.local`)

---

### Phase 2 — Design-System & UX-Konsistenz

**Ziel:** Einheitliche Komponenten-Bibliothek, konsistentes Feedback-System, aktive Zustände in Navigation.

#### 2.1 Globale Styles (`app/globals.css`)
- CSS-Variablen bereits gut definiert (`--bg`, `--fg`, `--card-bg`, `--accent-neon`)
- Ergänzen: `--success`, `--danger`, `--warning` Tokens
- Toast-Animation keyframes

#### 2.2 Neue UI-Komponenten (`components/ui/`)
- `toast.tsx` — Einheitliche Status-Meldungen (ersetzt inline `text-xs text-rose-700`)
- `skeleton.tsx` — Loading-Platzhalter
- `badge.tsx` — Allgemeine Badge-Komponente
- `dialog.tsx` — Bestätigungs-Dialog (z.B. vor Löschen)

#### 2.3 Navigation-Fixes
- `festival-nav.tsx`: Aktive Tab-Markierung auf Desktop (analog zur Mobile-Bottom-Bar)
- `main-menu.tsx`: Besser strukturiert mit Icons (lucide-react bereits vorhanden)
- Header: App-Name konfigurierbar (Env-Variable oder Konstante)

#### 2.4 Dashboard-UX
- Festival-Karten: Hover-Animation, Festival-Bild als größeres Element
- Nachrichten-Bereich: Chat-Bubble-UI mit Zeitstempeln

---

### Phase 3 — Features & Stabilität

#### 3.1 Supabase Realtime (optional)
- Echtzeit-Updates für Timeline + DMs via Supabase Realtime Channels
- Ersetzt Timer-Polling in `timeline-live-refresh.tsx`

#### 3.2 Band-Filter & Suche
- Suchfeld in Timeline und Ranking-Board
- Filter nach Stage

#### 3.3 Profilseite verbessern
- Display Name, Avatar, Passwort-Änderung (schon teilweise vorhanden)

#### 3.4 Code-Aufräumen
- Inline Server Actions in Page-Dateien → eigene Actions in `lib/actions/`
- `groups`-Code-Pfade bereinigen oder dokumentieren (Legacy)

---

## 4. Git-Workflow (Konvention, wie in `../mathe`)

```
Remote:   origin → git@github.com:litakielxd/festival.git
Branch:   main (einziger Branch, kein Feature-Branch-Workflow)
Commits:  Präfix nach Typ:
            feat:    neues Feature
            fix:     Bugfix
            chore:   Maintenance (deps, config)
            docs:    Dokumentation
            style:   CSS/Design ohne Logik-Änderung
            refactor: Code-Umbau ohne neue Features
Deploy:   ./push-and-deploy.sh "Beschreibung"
          (führt: lint+typecheck → commit → push → deploy aus)
```

### Täglicher Workflow nach einer Überarbeitung:
```bash
# 1. Lokalen Dev-Server starten (beim Entwickeln):
NODE_OPTIONS=--dns-result-order=ipv4first WATCHPACK_POLLING=true \
  npm run dev -- --hostname 127.0.0.1 --port 3016

# 2. Nach Fertigstellung deployen (ein Befehl):
./push-and-deploy.sh "feat: Beschreibung der Änderung"

# Das Skript macht:
# → npm run lint (Warnung, kein Hard-Fail)
# → npm run typecheck
# → git add -A && git commit -m "..."
# → git push origin main
# → SSH auf Server: git pull + npm run build + pm2 restart festival
```

---

## 5. Deployment-Architektur (festival.mondschule.de)

```
Browser
  ↓ HTTPS
Nginx/Apache vhost festival.mondschule.de
  ↓ Reverse Proxy → http://127.0.0.1:3016
Node.js (pm2: "festival")
  └── .next/standalone/server.js (PORT=3016)
       ├── .env.production  (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)
       └── Supabase → xoociazmjgdliaziwqoy.supabase.co
```

**Variante A — rsync Standalone (aktuell implementiert):**
- Lokal: `npm run build` → rsync `.next/standalone/` auf Server
- Server: existierende `server.js` wird durch neue ersetzt
- Prozess muss manuell neu gestartet werden (pm2 restart)

**Variante B — Git-pull auf Server (empfohlen, analog zu mathe):**
- Lokal: `git push origin main`
- Server-Script: `git pull --rebase`, `npm ci`, `npm run build`, `pm2 restart festival`
- Alles automatisch nach `./push-and-deploy.sh`

> **Empfehlung:** Variante B für den Alltag. Variante A als Fallback wenn Server kein git hat.

### Supabase-Konfiguration (einmalig nach erstem Deploy):
Im Supabase Dashboard → Authentication → URL Configuration:
- **Site URL:** `https://festival.mondschule.de`
- **Redirect URLs:** `https://festival.mondschule.de/**`

---

## 6. Datenbankschema (Übersicht)

```
profiles          → user_id (FK auth.users), display_name, avatar_url, username
festivals         → id, name, avatar_url, starts_on, ends_on, location
festival_members  → festival_id, user_id, role (admin|member)
festival_days     → id, festival_id, date, label
bands             → id, festival_id, name
band_slots        → id, band_id, festival_day_id, stage, starts_at, ends_at
notes             → id, band_id, author_id, content, visibility (private|group)
festival_band_rankings → festival_id, user_id, ordered_band_ids (jsonb)
festival_band_genres   → id, festival_id, band_id, genre, created_by
festival_direct_messages → id, festival_id, sender_id, recipient_id, content, created_at

(Legacy/teilweise aktiv:)
groups, group_members, group_invites, group_direct_messages
```

Alle Tabellen haben Row Level Security (RLS) aktiv.  
Letzter RLS-Fix: `20260426221000_festival_band_genres_delete_policy.sql`

---

## 7. Checkliste vor jedem Deploy

```
[ ] npm run lint          → keine Fehler (Warnungen okay)
[ ] npm run typecheck     → keine Fehler
[ ] npm run build         → erfolgreich (oder via push-and-deploy.sh automatisch)
[ ] .env.production auf Server gesetzt (SUPABASE_URL, ANON_KEY, SERVICE_ROLE_KEY)
[ ] Supabase-Migrationen aktuell (npm run db:list → Local ≡ Remote)
[ ] Supabase Auth-URLs konfiguriert (festival.mondschule.de)
[ ] 10-Minuten-Smoke auf Live-URL (RELEASE_CHECKLIST.md)
```

---

## 8. Bekannte Issues

| Datum | Bereich | Beschreibung | Status |
|---|---|---|---|
| 2026-05-03 | RLS `festival_band_genres` | DELETE-Policy fehlte | ✅ Gefixt (Migration `20260426221000`) |
| — | Admin-UI | Inline Server Actions in Page-Datei | 📋 Refactor geplant |
| — | Navigation | Desktop-Tab ohne aktiven Zustand | 📋 Phase 2 |
| — | App-Name | „Festival Quatsch" als Platzhalter | 📋 Phase 2 |

---

*Erstellt: 2026-05-24 | Letztes Update: 2026-05-24*
