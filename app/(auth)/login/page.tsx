"use client";

import Link from "next/link";
import { useActionState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { requestPasswordReset, signInWithEmail } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState = { error: "", message: "" };

function LoginForm() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

  const [signinState, signInAction, signinPending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      const response = await signInWithEmail(formData);
      return { error: response?.error ?? "", message: "" };
    },
    initialState
  );

  const [resetState, resetAction, resetPending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      const response = await requestPasswordReset(formData);
      return { error: response?.error ?? "", message: response?.message ?? "" };
    },
    initialState
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6 py-12">
      <div>
        <h1 className="text-3xl font-bold">Anmelden</h1>
        <p className="mt-1 text-sm text-muted">
          Noch kein Konto?{" "}
          <Link href="/register" className="text-accent underline-offset-2 hover:underline">
            Jetzt registrieren
          </Link>
        </p>
      </div>

      {urlError ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {urlError === "missing_code"
            ? "Ungültiger Bestätigungs-Link. Bitte erneut registrieren."
            : urlError}
        </p>
      ) : null}

      <form action={signInAction} className="festival-card space-y-4 rounded-xl p-6">
        <div className="space-y-1">
          <label htmlFor="login-identifier" className="text-sm font-medium">
            E-Mail oder Benutzername
          </label>
          <Input
            id="login-identifier"
            name="identifier"
            type="text"
            placeholder="E-Mail oder Benutzername"
            autoComplete="username"
            required
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="login-password" className="text-sm font-medium">
            Passwort
          </label>
          <Input
            id="login-password"
            name="password"
            type="password"
            placeholder="Passwort"
            autoComplete="current-password"
            required
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <Button type="submit" disabled={signinPending} className="flex-1">
            {signinPending ? "Einloggen …" : "Einloggen"}
          </Button>
          <a
            href="#forgot-password"
            className="text-sm text-muted underline-offset-2 hover:underline"
          >
            Passwort vergessen?
          </a>
        </div>
        {signinState.error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {signinState.error}
          </p>
        ) : null}
      </form>

      <form
        id="forgot-password"
        action={resetAction}
        className="space-y-3 rounded-xl border border-slate-300 p-5"
      >
        <p className="text-sm font-semibold">Passwort vergessen</p>
        <Input name="email" type="email" placeholder="Deine E-Mail-Adresse" required />
        <Button type="submit" variant="secondary" disabled={resetPending}>
          {resetPending ? "Wird gesendet …" : "Reset-Mail senden"}
        </Button>
        {resetState.error ? (
          <p className="text-sm text-red-700 dark:text-red-400">{resetState.error}</p>
        ) : null}
        {resetState.message ? (
          <p className="text-sm text-emerald-700 dark:text-emerald-400">{resetState.message}</p>
        ) : null}
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6 py-12">
          <div>
            <h1 className="text-3xl font-bold font-serif text-slate-800 dark:text-slate-100">Anmelden</h1>
            <p className="mt-1 text-sm text-muted">Lade Anmeldebereich …</p>
          </div>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
