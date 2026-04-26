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
4. Supabase Migration ausfuehren (empfohlen per CLI):
   - Supabase CLI einmalig installieren (z. B. via Homebrew) oder per `npx` nutzen
   - Einmalig authentifizieren und Projekt verknuepfen:
     - `npx supabase login`
     - `npx supabase link --project-ref <dein-project-ref>`
   - Dann alle offenen Migrationen ausfuehren:
     - `npm run db:push`
5. Development starten:
   - `npm run dev`

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

## Deployment

- Frontend auf Vercel deployen
- Supabase als DB/Auth/Realtime nutzen
- ENV Variablen in Vercel hinterlegen
