# Testing Checklist

Kurze Smoke-Test-Checkliste fuer lokale Verifikation.

## Voraussetzungen

- [ ] Dev-Server laeuft: `npm run dev`
- [ ] `.env.local` ist gesetzt (Supabase URL + Anon Key)

## Auth

- [ ] `/login` oeffnen
- [ ] Neuen User registrieren oder einloggen
- [ ] Redirect auf `/dashboard` funktioniert

## Gruppen

- [ ] In `/dashboard` eine neue Gruppe erstellen
- [ ] Gruppe erscheint unter "Meine Gruppen"
- [ ] Gruppen-ID notieren
- [ ] (Optional) Mit zweitem Account per Gruppen-ID beitreten

## Bands und Tage

- [ ] Route `/dashboard/groups/<groupId>/bands` oeffnen
- [ ] Festivaltag anlegen
- [ ] Band anlegen
- [ ] Band erscheint unter "Alle Bands"

## Slots

- [ ] Timeslot mit Band + Tag + Start/Ende anlegen
- [ ] Slot erscheint unter "Geplante Slots"

## Notizen

- [ ] Route `/dashboard/groups/<groupId>/notes` oeffnen
- [ ] Notiz mit `private` speichern
- [ ] Notiz mit `group` speichern
- [ ] Notizen erscheinen mit Bandname + Visibility

## Timeline

- [ ] Route `/dashboard/groups/<groupId>/timeline` oeffnen
- [ ] Timeline zeigt vorhandene Slots an

## Regression

- [ ] Ohne Login `/dashboard` aufrufen -> Redirect auf `/login`
- [ ] Gruppenroute neu laden -> Session bleibt stabil
- [ ] Keine Runtime-Fehler in Browser-Konsole

## Known Issues / Notes

Hier Findings und Beobachtungen festhalten (Datum, Route, kurz beschreiben).

| Datum | Bereich / Route | Kurzbeschreibung | Schwere (low/med/high) | Status |
|-------|-----------------|------------------|------------------------|--------|
|       |                 |                  |                        |        |

Freitext / Details:

- 

## Ergebnis

- [ ] Smoke-Test bestanden
- [ ] Offene Punkte dokumentiert (falls vorhanden)
