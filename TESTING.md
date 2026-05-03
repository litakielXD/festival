# Testing Checklist

Kurze E2E-Checkliste fuer lokale Verifikation im Festival-first Setup.

## Voraussetzungen

- [ ] Dev-Server laeuft: `NODE_OPTIONS=--dns-result-order=ipv4first WATCHPACK_POLLING=true npm run dev -- --hostname 127.0.0.1 --port 3016`
- [ ] `.env.local` ist gesetzt (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
- [ ] Testkonten vorhanden: 1x Admin, 2x Member

## Stabilitaet vor dem Test

- [ ] Nur eine `next dev` Instanz laeuft
- [ ] Bei Chunk-/Manifest-Fehlern (`Cannot find module './611.js'`, `.next` ENOENT):
  - alle Dev-Server stoppen (`Ctrl + C` in allen Terminals)
  - `rm -rf .next`
  - Dev-Server mit obigem Startbefehl neu starten
- [ ] Bei Login-`fetch failed` Supabase-Verbindung checken:
  - `node -e "require('dns').lookup('xoociazmjgdliaziwqoy.supabase.co',(e,a,f)=>console.log(e||{a,f}))"`
  - `node -e "fetch('https://xoociazmjgdliaziwqoy.supabase.co/auth/v1/health').then(r=>r.text().then(t=>console.log(r.status,t))).catch(console.error)"`

## Auth

- [ ] `/login` oeffnen
- [ ] Login mit Admin funktioniert
- [ ] Login mit Member funktioniert
- [ ] Redirect auf `/dashboard` funktioniert

## Rollen / Sichtbarkeit

- [ ] Member sieht in `/dashboard/festivals` nur zugewiesene Festivals
- [ ] Admin sieht in `/dashboard/festivals` dieselbe Festivalansicht wie Member (keine Admin-Forms)
- [ ] Nur Admin sieht den Menuepunkt `/dashboard/admin`
- [ ] Rollen-Matrix entspricht `ROLLEN_MATRIX.md`

## Adminbereich - Personen

- [ ] In `/dashboard/admin` Person anlegen (Name, optional E-Mail, Passwort)
- [ ] In "Personen verwalten" werden Name **und** E-Mail angezeigt
- [ ] Passwort aendern funktioniert
- [ ] Person loeschen funktioniert

## Adminbereich - Festivals

- [ ] Festival erstellen funktioniert
- [ ] Festival bearbeiten (Name, Bild, Datum, Ort) funktioniert
- [ ] Person per Name/E-Mail ueber Autocomplete zuweisen funktioniert
- [ ] Erfolg/Fehler-Meldung bei Zuweisung wird angezeigt
- [ ] "Bereits zugewiesene Personen" zeigt Mitglieder inkl. Rolle
- [ ] Mitglied entfernen funktioniert
- [ ] Band + Slot hinzufuegen funktioniert
- [ ] Festival loeschen funktioniert

## Festival-Detailseiten

- [ ] Klick auf Festival fuehrt zu `/dashboard/festivals/<festivalId>/timeline`
- [ ] Tabs (`Members & Messages`, `Timeline`, `Bands`, `Notes`) funktionieren
- [ ] Notizen erstellen/bearbeiten/loeschen funktioniert
- [ ] Direktnachrichten senden/loeschen funktioniert

## E2E mit 3 Konten (Admin + 2 Member)

Empfohlene Konten:

- Admin: `litakiel@gmail.com`
- Member A: z. B. `melanie`
- Member B: weiteres Testkonto

### 1) Setup durch Admin

- [ ] Festival erstellen (oder bestehendes Testfestival verwenden)
- [ ] Beide Member dem Festival zuweisen
- [ ] Einen Member auf Rolle `admin` im Festival setzen (optional Rollentest)
- [ ] Mindestens 2 Spieltage + mehrere Bands vorhanden

### 2) Sichtbarkeitstest Member A

- [ ] Login als Member A
- [ ] Nur zugewiesene Festivals sichtbar
- [ ] Festival oeffnen: keine Admin-Verwaltung sichtbar
- [ ] Notiz erstellen (Band X, `private`)
- [ ] Notiz erstellen (Band Y, `group`)
- [ ] Eigene Notiz bearbeiten + Sichtbarkeit aendern
- [ ] Ranking speichern

### 3) Sichtbarkeitstest Member B

- [ ] Login als Member B
- [ ] Notiz `private` von Member A **nicht** in Uebersichten sichtbar
- [ ] Notiz `group` von Member A in Notiz-Uebersicht sichtbar
- [ ] Notiz der anderen: nach Person gruppiert und sortierbar

### 4) Nachrichtenfluss

- [ ] Member A sendet DM an Member B
- [ ] Member B sieht Nachricht
- [ ] Sender kann eigene DM loeschen

### 5) Notizen-Ansichten + PDF

- [ ] `Meine Notizen`: Umschalten `Timetable` / `Alphabetisch`
- [ ] `Notiz-Uebersicht`: nach Person gruppiert + Sortierung umschaltbar
- [ ] PDF-Export: "Aktuelle Ansicht als PDF" spiegelt sichtbare Sortierung
- [ ] PDF startet auf Seite 1 ohne Leerseite

### 6) Mobile Check (real device oder DevTools)

- [ ] `Meine Notizen`: Kartenlayout unter `md`
- [ ] Speichern/Loeschen-Buttons gut tappbar (volle Breite)
- [ ] `Notiz-Uebersicht`: Kartenlayout unter `md`

## Regression

- [ ] Ohne Login `/dashboard` -> Redirect auf `/login`
- [ ] Browser-Konsole ohne Runtime-Fehler
- [ ] Keine 500er beim Seitenwechsel zwischen Dashboard/Admin/Festival

## Known Issues / Notes

Hier Findings und Beobachtungen festhalten (Datum, Route, kurz beschreiben).

| Datum | Bereich / Route | Kurzbeschreibung | Schwere (low/med/high) | Status |
|-------|-----------------|------------------|------------------------|--------|
| 2026-05-03 | DB RLS `festival_band_genres` | DELETE war ohne Policy — Entfernen von Festival-Genres schlug fehl; Fix: Migration `20260426221000_festival_band_genres_delete_policy.sql` | high | fixed (Migration anwenden) |

Freitext / Details:

- 

## Ergebnis

- [ ] E2E-Test bestanden
- [ ] Offene Punkte dokumentiert (falls vorhanden)
