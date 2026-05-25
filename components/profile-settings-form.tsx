"use client";

import { useState, useTransition } from "react";
import { toast } from "@/components/ui/toast";
import { AvatarUploadField } from "@/components/avatar-upload-field";
import { upsertProfile, updateProfilePassword } from "@/lib/actions/profile";

interface ProfileSettingsFormProps {
  userId: string;
  initialUsername: string;
  initialAvatarUrl: string | null;
}

export function ProfileSettingsForm({
  userId,
  initialUsername,
  initialAvatarUrl
}: ProfileSettingsFormProps) {
  const [isPendingProfile, startProfileTransition] = useTransition();
  const [isPendingPassword, startPasswordTransition] = useTransition();

  // Profile fields states
  const [username, setUsername] = useState(initialUsername);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl ?? "");

  // Password manager states
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Dynamic Password Strength Meter
  const getPasswordStrength = (pwd: string) => {
    let score = 0;
    if (!pwd) return { score, label: "Keins", color: "bg-slate-200 dark:bg-slate-800" };
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    switch (score) {
      case 1:
        return { score, label: "Schwach", color: "bg-rose-500" };
      case 2:
        return { score, label: "Mittel", color: "bg-amber-500" };
      case 3:
        return { score, label: "Stark", color: "bg-indigo-500" };
      case 4:
        return { score, label: "Sehr stark", color: "bg-emerald-500" };
      default:
        return { score, label: "Schwach", color: "bg-rose-500" };
    }
  };

  const strength = getPasswordStrength(password);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error("Benutzername darf nicht leer sein.");
      return;
    }

    const formData = new FormData();
    formData.append("username", username);
    formData.append("avatarUrl", avatarUrl);

    startProfileTransition(async () => {
      try {
        const res = await upsertProfile(formData);
        if (res?.error) {
          toast.error(res.error);
        } else {
          toast.success("Profil erfolgreich aktualisiert!");
        }
      } catch {
        toast.error("Fehler beim Speichern des Profils.");
      }
    });
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      toast.error("Bitte gib ein neues Passwort ein.");
      return;
    }
    if (password.length < 8) {
      toast.error("Das Passwort muss mindestens 8 Zeichen lang sein.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Die Passwörter stimmen nicht überein.");
      return;
    }

    const formData = new FormData();
    formData.append("password", password);

    startPasswordTransition(async () => {
      try {
        const res = await updateProfilePassword(formData);
        if (res?.error) {
          toast.error(res.error);
        } else {
          toast.success("Passwort wurde erfolgreich geändert!");
          setPassword("");
          setConfirmPassword("");
        }
      } catch {
        toast.error("Fehler beim Zurücksetzen des Passworts.");
      }
    });
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 animate-fade-in">
      
      {/* 1. Profile Settings Form */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/70 p-6 shadow-xl backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/60 dark:shadow-2xl">
        <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-accent/10 blur-3xl" />
        
        <h3 className="mb-4 text-lg font-semibold tracking-tight text-slate-800 dark:text-slate-100">
          Profil bearbeiten
        </h3>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <AvatarUploadField
            userId={userId}
            label="Profilbild"
            fieldName="avatarUrl"
            pathPrefix="profiles"
            initialAvatarUrl={avatarUrl || null}
          />
          {/* This handler updates local state so the input is controlled */}
          <input
            type="hidden"
            name="avatarUrl"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
          />

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Benutzername
            </label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-accent focus:bg-white focus:outline-none focus:ring-4 focus:ring-accent/15 dark:border-slate-700/80 dark:bg-slate-800/40 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus:border-accent dark:focus:bg-slate-900/50"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="z.B. melanie"
              required
              disabled={isPendingProfile}
            />
          </div>

          <button
            className="inline-flex items-center justify-center rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-accent/10 transition-all hover:bg-accent/90 hover:shadow-lg active:scale-95 disabled:scale-100 disabled:opacity-60"
            type="submit"
            disabled={isPendingProfile}
          >
            {isPendingProfile ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              "Profil speichern"
            )}
          </button>
        </form>
      </section>

      {/* 2. Password Reset Form */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/70 p-6 shadow-xl backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/60 dark:shadow-2xl">
        <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-rose-500/5 blur-3xl" />
        
        <h3 className="mb-4 text-lg font-semibold tracking-tight text-slate-800 dark:text-slate-100">
          Passwort ändern
        </h3>

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Neues Passwort
            </label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-accent focus:bg-white focus:outline-none focus:ring-4 focus:ring-accent/15 dark:border-slate-700/80 dark:bg-slate-800/40 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus:border-accent dark:focus:bg-slate-900/50"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mindestlänge 8 Zeichen"
              type="password"
              required
              disabled={isPendingPassword}
            />
          </div>

          {/* Password Strength Indicator */}
          {password && (
            <div className="space-y-1.5 animate-fade-in">
              <div className="flex justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <span>Passwortstärke:</span>
                <span className="font-bold">{strength.label}</span>
              </div>
              <div className="flex h-1.5 gap-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                  style={{ width: `${(strength.score / 4) * 100}%` }}
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Passwort bestätigen
            </label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-accent focus:bg-white focus:outline-none focus:ring-4 focus:ring-accent/15 dark:border-slate-700/80 dark:bg-slate-800/40 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus:border-accent dark:focus:bg-slate-900/50"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Passwort erneut eingeben"
              type="password"
              required
              disabled={isPendingPassword}
            />
          </div>

          <button
            className="inline-flex items-center justify-center rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-slate-900/10 transition-all hover:bg-slate-700 hover:shadow-lg active:scale-95 disabled:scale-100 disabled:opacity-60 dark:bg-slate-700 dark:hover:bg-slate-600"
            type="submit"
            disabled={isPendingPassword}
          >
            {isPendingPassword ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              "Passwort speichern"
            )}
          </button>
        </form>
      </section>

    </div>
  );
}
