import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center gap-6 px-6">
      <h1 className="text-4xl font-bold">Festival Planner</h1>
      <p className="max-w-2xl text-muted">
        Plane dein Festival in Gruppen, teile Notizen pro Band und sehe live, welche Acts gerade laufen.
      </p>
      <div className="flex gap-3">
        {user ? (
          <Link className="rounded-md bg-accent px-4 py-2 font-semibold" href="/dashboard">
            Zum Dashboard
          </Link>
        ) : (
          <Link className="rounded-md bg-accent px-4 py-2 font-semibold" href="/login">
            Einloggen / Registrieren
          </Link>
        )}
      </div>

      <footer className="mt-12 text-center text-xs text-muted-foreground/60">
        <p>Festival Planner &copy; 2026 | <a href="https://mondschule.de/impressum.html" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Impressum</a></p>
      </footer>
    </main>
  );
}
