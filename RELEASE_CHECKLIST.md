# Release-Checkliste (Go-Live)

Vor dem ersten produktiven Deployment: diese Liste abarbeiten.  
Detaillierte manuelle Tests bleiben in `TESTING.md` — hier nur Verweise und zusätzliche Release-Punkte.

---

## Status (Stand: 2026-05-03, zuletzt Checklisten-Durchgang)

### Im Repo automatisch geprüft / erledigt

- **Production-Build:** `npm run lint` (nur Warnungen), `npm run typecheck`, `npm run build` — erfolgreich
- **Service-Role:** `SUPABASE_SERVICE_ROLE_KEY` nur als normale Env-Variable (nicht `NEXT_PUBLIC_*`); Browser-Client nutzt nur Anon-Key (`lib/supabase/client.ts`)
- **Admin-UI:** `/dashboard/admin` nach Login nur bei `isSystemAdminEmail`, sonst Redirect auf `/dashboard` (`app/(dashboard)/dashboard/admin/page.tsx`)
- **Dashboard-Auth:** Middleware leitet nicht eingeloggte Nutzer von `/dashboard/*` auf `/login` (`middleware.ts`); Seiten nutzen zusätzlich `requireUser` wo nötig
- **RLS-Stichprobe:** Tabellen in `supabase/migrations` mit Policies u.a. für Festivals, Mitglieder, Bands, Slots, Notizen, Gruppen-DMs, Festival-DMs, Rankings, `festival_band_genres`, Storage Avatare — **Delete-Policy für `festival_band_genres`** ergänzt in `20260426221000_festival_band_genres_delete_policy.sql` (vorher fehlend)
- **Dev-Stabilität:** Hinweise zu `.next`-Cache und Supabase-DNS in `README.md` und `TESTING.md`

### Nur in echter Produktion / durch Betrieb (hier offen)

- separates **Produktions**-Supabase (wenn ihr nicht dasselbe Remote wie Dev nutzt): noch einmal `db:push` dort
- **Vercel** (o.ä.): Env-Vars, Deploy, Smoke auf **öffentlicher** URL
- **§3** und Auth/Session gezielt auf dieser URL ausprobieren
- **§5** rechtliche Seiten, falls die App öffentlich wird

---

## 1) Umgebung & Deployment

- Produktions-Supabase-Projekt **eigenständig** angelegt und verknüpft (falls nicht = aktuelles Remote-Projekt)
- Alle Migrationen auf dem **per CLI verlinkten** Remote angewendet (`supabase migration list`: Local ≡ Remote, inkl. `20260426221000`)
- Hosting (z. B. Vercel): Projekt angelegt, Branch/Production korrekt
- Umgebungsvariablen **im Hosting** gesetzt (nicht nur lokal):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` **nur** serverseitig (nie im Client)
- Nach Deploy: Smoke-Test auf der **echten** Produktions-URL (nicht nur lokal)

---

## 2) Sicherheit

- RLS für die zentralen Tabellen in den Migrationen vorhanden (Stichprobe + **Anhang A** — ersetzt kein externes Audit)
- Service-Role-Key: nicht per `NEXT_PUBLIC_`* exponiert; `.env.local` in `.gitignore` (Secrets gehören nicht ins Repo)
- Auth-Flow: Logout, Session-Refresh, Login auf der **Live-URL** bewusst testen
- Admin-Routen: Zugriff nur für konfigurierte System-Admins (siehe Status oben)

---

## 3) Funktions-Tests (Smoke)

Vollständige E2E-Szenarien: `**TESTING.md`** Zeile für Zeile durchgehen.

Mindestens vor Release kurz verifizieren:

- Login / Redirect `/dashboard`
- Festival: Timeline, Bands, Notes, Messages
- Festival-Genres: hinzufügen (max. 3), Duplikat-Fehler, Anzeige korrekt, eigenes Zusatz-Genre entfernen (Bands + Timeline-Sheet)
- Ranking speichern
- Mobile: wichtigste Festival-Flows tappbar (siehe `TESTING.md` Abschnitt Mobile)

### 10-Minuten-Smoke (Produktions-URL)

**Voraussetzung:** Deploy läuft, Env-Vars im Hosting gesetzt. Ersetzt nicht die volle `TESTING.md`-Liste, deckt aber die kritischsten Pfade ab.


| #   | Schritt (~Min)                                                                                | Erwartung                                           |
| --- | --------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| 1   | **~1** Ohne Login: `…/dashboard` öffnen                                                       | Redirect auf `/login`                               |
| 2   | **~1** Login, danach `/dashboard`                                                             | Landet auf Dashboard, keine Konsole-500             |
| 3   | **~1** Ein Festival öffnen (Übersicht → Klick)                                                | Festival-Startseite lädt                            |
| 4   | **~2** **Timeline** öffnen, eine Band-Zeile aufklappen (falls Sheet)                          | Slots sichtbar, kein weißer Screen                  |
| 5   | **~2** **Bands** öffnen; Genre **+** einmal testen (kurzer Text)                              | Toast/OK oder klare Fehlermeldung; Badge zeigt Text |
| 6   | **~1** **Notes** öffnen, eine Notiz anlegen + speichern                                       | Bleibt nach Reload sichtbar (Stichprobe)            |
| 7   | **~1** **Messages** (Festival-DM): eine kurze Nachricht senden                                | erscheint in der Liste                              |
| 8   | **~1** **Ranking**: eine Position setzen / speichern                                          | nach Reload noch da                                 |
| 9   | **~1** Anderes Browserfenster oder Inkognito: **Logout** auf der Live-Site, dann wieder Login | Session sauber                                      |


- 10-Minuten-Smoke auf **echter** URL abgeschlossen (Datum: ___________)

---

## 4) Stabilität & Betrieb

- Nur **ein** Build/Deploy-Ziel pro Umgebung; keine parallelen Dev-Server auf Produktion (Team-Disziplin)
- Lokale Probleme (`.next`, DNS): dokumentiert in `README.md` / `TESTING.md`
- Logging: Vercel (o.ä.) + Supabase Dashboard für Auth/API-Fehler im Blick
- Optional: Supabase Backups / Wiederherstellung geklärt

---

## 5) Rechtliches (falls App öffentlich & personenbezogene Daten)

- Datenschutzerklärung / Impressum falls erforderlich (im Repo derzeit keine Pflichtseiten)
- Nutzungsbedingungen nur falls nötig

---

## Anhang A — Tabellen mit aktiviertem RLS (laut Migrationen)


| Tabelle                                         | Anmerkung                               |
| ----------------------------------------------- | --------------------------------------- |
| `profiles`, `groups`, `group_members`           | Basis (`init`)                          |
| `festival_days`, `bands`, `band_slots`, `notes` | Basis + Festival-Member-Lesezugriff     |
| `festivals`, `festival_groups`                  | Festival-Modell                         |
| `festival_members`, `festival_direct_messages`  | Festival-Mitgliedschaft & DMs           |
| `festival_band_rankings`                        | Rankings                                |
| `festival_band_genres`                          | inkl. Delete-Policy ab `20260426221000` |
| `group_direct_messages`                         | Gruppen-DMs                             |
| `group_invites`                                 | Einladungen                             |
| **Storage** `avatars`                           | Policies in `20260426180000`            |


---

## Ergebnis

- **Repo / Code:** automatische Verifikation und RLS-Fix dokumentiert (Abschnitt „Status“)
- **Produktion:** Abschnitte 1–5 vollständig durch Betrieb abgehakt
- `TESTING.md` E2E auf **Produktions-URL** bestanden oder Abweichungen in der Known-Issues-Tabelle eingetragen