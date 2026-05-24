"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUpWithEmail } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState = { error: "", message: "" };

export default function RegisterPage() {
  const [state, action, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      const response = await signUpWithEmail(formData);
      return { error: response?.error ?? "", message: response?.message ?? "" };
    },
    initialState
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6 py-12">
      <div>
        <h1 className="text-3xl font-bold">Konto erstellen</h1>
        <p className="mt-1 text-sm text-muted">
          Schon ein Konto?{" "}
          <Link href="/login" className="text-accent underline-offset-2 hover:underline">
            Einloggen
          </Link>
        </p>
      </div>

      {state.message ? (
        <div className="festival-card rounded-lg border border-emerald-400 bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
          <p className="font-semibold">Fast geschafft!</p>
          <p className="mt-1">{state.message}</p>
          <p className="mt-3 text-xs text-emerald-700 dark:text-emerald-400">
            Sobald dein Konto bestätigt ist, kannst du dich{" "}
            <Link href="/login" className="underline underline-offset-2">
              einloggen
            </Link>
            . Ein Admin weist dich dann einem Festival zu.
          </p>
        </div>
      ) : (
        <form action={action} className="festival-card space-y-4 rounded-xl p-6">
          <div className="space-y-1">
            <label htmlFor="register-email" className="text-sm font-medium">
              E-Mail
            </label>
            <Input
              id="register-email"
              name="email"
              type="email"
              placeholder="deine@email.de"
              autoComplete="email"
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="register-username" className="text-sm font-medium">
              Benutzername
            </label>
            <Input
              id="register-username"
              name="username"
              type="text"
              placeholder="z.B. melanie"
              autoComplete="username"
              required
            />
            <p className="text-xs text-muted">Wird anderen Festivalmitgliedern angezeigt.</p>
          </div>

          <div className="space-y-1">
            <label htmlFor="register-password" className="text-sm font-medium">
              Passwort
            </label>
            <Input
              id="register-password"
              name="password"
              type="password"
              placeholder="Mindestens 6 Zeichen"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>

          {state.error ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
              {state.error}
            </p>
          ) : null}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Wird erstellt …" : "Konto erstellen"}
          </Button>
        </form>
      )}

      <p className="text-center text-xs text-muted">
        Nach der Registrierung wirst du von einem Admin einem Festival zugewiesen.
      </p>
    </main>
  );
}
