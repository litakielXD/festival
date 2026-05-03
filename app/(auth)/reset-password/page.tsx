"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ResetPasswordPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function initRecoverySession() {
      setError("");
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        // PKCE-style callback
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            if (isMounted) {
              setError("Reset-Link konnte nicht bestätigt werden. Bitte erneut anfordern.");
            }
            return;
          }
        }

        // Implicit/hash-style callback
        const hash = window.location.hash.startsWith("#")
          ? window.location.hash.slice(1)
          : window.location.hash;
        if (hash) {
          const hashParams = new URLSearchParams(hash);
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");
          if (accessToken && refreshToken) {
            const { error: setSessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });
            if (setSessionError) {
              if (isMounted) {
                setError("Reset-Link ist ungültig oder abgelaufen. Bitte erneut anfordern.");
              }
              return;
            }
            window.history.replaceState({}, "", `${url.pathname}${url.search}`);
          }
        }

        const { data } = await supabase.auth.getSession();
        if (!isMounted) return;
        const hasSession = Boolean(data.session);
        setSessionReady(hasSession);
        if (!hasSession) {
          setError("Auth session missing. Bitte den Reset-Link erneut aus der E-Mail öffnen.");
        }
      } finally {
        if (isMounted) setSessionChecked(true);
      }
    }

    void initRecoverySession();
    return () => {
      isMounted = false;
    };
  }, [supabase]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!sessionReady) {
      setError("Auth session missing. Bitte den Reset-Link erneut aus der E-Mail öffnen.");
      return;
    }

    if (password.length < 8) {
      setError("Passwort muss mindestens 8 Zeichen haben.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("Passwörter stimmen nicht überein.");
      return;
    }

    setPending(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setPending(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess("Passwort wurde erfolgreich aktualisiert. Du kannst dich jetzt einloggen.");
    setPassword("");
    setPasswordConfirm("");
    setTimeout(() => router.push("/login"), 900);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6">
      <h1 className="text-3xl font-bold">Passwort zurücksetzen</h1>
      <form onSubmit={onSubmit} className="space-y-3 rounded-lg border border-slate-300 bg-card p-5">
        <Input
          name="password"
          type="password"
          placeholder="Neues Passwort (mind. 8 Zeichen)"
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <Input
          name="passwordConfirm"
          type="password"
          placeholder="Passwort bestätigen"
          minLength={8}
          value={passwordConfirm}
          onChange={(event) => setPasswordConfirm(event.target.value)}
          required
        />
        <Button type="submit" disabled={pending || !sessionReady || !sessionChecked}>
          {pending ? "Speichern..." : "Neues Passwort speichern"}
        </Button>
        {!sessionReady && sessionChecked ? (
          <p className="text-xs text-muted">
            Öffne den aktuellen Reset-Link aus deiner E-Mail erneut im selben Browser und versuche es dann nochmal.
          </p>
        ) : null}
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {success ? <p className="text-sm text-success">{success}</p> : null}
      </form>
    </main>
  );
}
