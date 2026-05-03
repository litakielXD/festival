"use client";

import { useActionState } from "react";
import { requestPasswordReset, signInWithEmail, signUpWithEmail } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState = { error: "", message: "" };

export default function LoginPage() {
  const [signinState, signInAction, signinPending] = useActionState(async (_prev: typeof initialState, formData: FormData) => {
    const response = await signInWithEmail(formData);
    return { error: response?.error ?? "", message: "" };
  }, initialState);

  const [signupState, signUpAction, signupPending] = useActionState(async (_prev: typeof initialState, formData: FormData) => {
    const response = await signUpWithEmail(formData);
    return { error: response?.error ?? "", message: response?.message ?? "" };
  }, initialState);

  const [resetState, resetAction, resetPending] = useActionState(async (_prev: typeof initialState, formData: FormData) => {
    const response = await requestPasswordReset(formData);
    return { error: response?.error ?? "", message: response?.message ?? "" };
  }, initialState);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6">
      <h1 className="text-3xl font-bold">Festival Quatsch Login</h1>
      <form action={signInAction} className="space-y-3 rounded-lg bg-card p-5">
        <Input name="identifier" type="text" placeholder="E-Mail oder Benutzername" required />
        <Input name="password" type="password" placeholder="Passwort" required />
        <Button type="submit" disabled={signinPending}>
          Einloggen
        </Button>
        <a href="#forgot-password" className="inline-block text-sm text-muted underline-offset-2 hover:underline">
          Passwort vergessen?
        </a>
        {signinState.error ? <p className="text-sm text-danger">{signinState.error}</p> : null}
      </form>

      <form id="forgot-password" action={resetAction} className="space-y-3 rounded-lg border border-slate-300 p-5">
        <p className="text-sm font-semibold">Passwort vergessen</p>
        <Input name="email" type="email" placeholder="Echte E-Mail-Adresse" required />
        <Button type="submit" variant="secondary" disabled={resetPending}>
          Reset-Mail senden
        </Button>
        {resetState.error ? <p className="text-sm text-danger">{resetState.error}</p> : null}
        {resetState.message ? <p className="text-sm text-success">{resetState.message}</p> : null}
      </form>

      <form action={signUpAction} className="space-y-3 rounded-lg border border-slate-300 p-5">
        <Input name="email" type="email" placeholder="E-Mail" required />
        <Input name="username" type="text" placeholder="Benutzername" required />
        <Input name="password" type="password" placeholder="Passwort (min. 6 Zeichen)" minLength={6} required />
        <Button type="submit" variant="secondary" disabled={signupPending}>
          Registrieren
        </Button>
        {signupState.error ? <p className="text-sm text-danger">{signupState.error}</p> : null}
        {signupState.message ? <p className="text-sm text-success">{signupState.message}</p> : null}
      </form>
    </main>
  );
}
