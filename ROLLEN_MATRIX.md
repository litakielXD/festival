# Rollen-Matrix (Festival Planner)

Stand: Festival-first MVP.
Diese Datei definiert verbindlich, wer was darf.

## Rollen

- **System-Admin**: Nutzer mit E-Mail in `ADMIN_EMAILS`.
- **Festival-Admin**: Rolle `admin` in `festival_members` für ein konkretes Festival.
- **Festival-Member**: Rolle `member` in `festival_members` für ein konkretes Festival.

## Grundprinzip

- **Globale Verwaltung** (Personen/Festivals/Zuordnungen) passiert nur im `Adminbereich`.
- **Festivalseiten** sind für die Zusammenarbeit im Festival (Mitglieder sehen, Nachrichten, Notizen, Ranking, Timeline), nicht für globale Verwaltung.

## Berechtigungen

### Adminbereich

- **System-Admin**
  - Darf Personen anlegen/löschen, Passwörter setzen.
  - Darf Festivals anlegen/bearbeiten/löschen.
  - Darf Festivalmitglieder zuweisen/entfernen.
  - Darf Rollen im Festival ändern (`member`/`admin`).
  - Darf Bands/Slots für Festivals pflegen.
- **Festival-Admin / Festival-Member**
  - Kein Zugriff auf den Adminbereich.

### Festivalansicht (`/dashboard/festivals/[festivalId]` und Unterseiten)

- **Festival-Admin**
  - Gleiche Sicht wie Member innerhalb des Festivals.
  - Keine globale Mitgliederverwaltung in dieser Ansicht.
- **Festival-Member**
  - Darf Festivalinhalte sehen und nutzen (Timeline, Ranking, Notizen, Nachrichten).

### Notizen

- **Festival-Admin / Festival-Member**
  - Darf eigene Notizen erstellen, bearbeiten, löschen.
  - Darf Sichtbarkeit eigener Notizen ändern (`private`/`group`).
  - Sieht in "Meine Notizen" nur eigene Notizen.
  - Sieht im Überblick alle Notizen entsprechend der Ansicht.

### Nachrichten

- **Festival-Admin / Festival-Member**
  - Darf Direktnachrichten an andere Festivalmitglieder senden.
  - Darf eigene gesendete Nachrichten löschen.

## Technische Leitlinie (wichtig)

- Server-Actions sind die Quelle der Wahrheit für Berechtigungen.
- UI darf zusätzliche Einschränkungen anzeigen, aber niemals lockerere Rechte als die Server-Actions.
- Bei Konflikt gilt: Server-Action-Regel gewinnt.
