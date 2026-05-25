"use client";

import { useState, useTransition } from "react";
import { toast } from "@/components/ui/toast";
import { adminCreatePerson, adminUpdatePersonPassword, adminDeletePerson } from "@/lib/actions/admin";

interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
}

interface AdminPeopleListProps {
  authUsers: AuthUser[];
}

export function AdminPeopleList({ authUsers }: AdminPeopleListProps) {
  const [isPendingCreate, startCreateTransition] = useTransition();
  const [pendingPasswords, setPendingPasswords] = useState<Record<string, boolean>>({});
  const [pendingDeletes, setPendingDeletes] = useState<Record<string, boolean>>({});

  // Form states for creation
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Individual password inputs per user
  const [userPasswords, setUserPasswords] = useState<Record<string, string>>({});

  const handleCreatePerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      toast.error("Benutzername und Passwort sind erforderlich.");
      return;
    }

    const formData = new FormData();
    formData.append("username", username);
    formData.append("email", email);
    formData.append("password", password);

    startCreateTransition(async () => {
      try {
        const res = await adminCreatePerson(formData);
        if (res?.error) {
          toast.error(res.error);
        } else {
          toast.success(`Person "${username}" wurde erfolgreich angelegt!`);
          setUsername("");
          setEmail("");
          setPassword("");
        }
      } catch {
        toast.error("Ein unerwarteter Fehler ist aufgetreten.");
      }
    });
  };

  const handleUpdatePassword = async (userId: string, username: string) => {
    const pwd = userPasswords[userId];
    if (!pwd || pwd.length < 8) {
      toast.error("Das Passwort muss mindestens 8 Zeichen lang sein.");
      return;
    }

    const formData = new FormData();
    formData.append("userId", userId);
    formData.append("password", pwd);

    setPendingPasswords((prev) => ({ ...prev, [userId]: true }));
    try {
      const res = await adminUpdatePersonPassword(formData);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(`Passwort für "${username}" erfolgreich geändert.`);
        setUserPasswords((prev) => ({ ...prev, [userId]: "" }));
      }
    } catch {
      toast.error("Fehler beim Zurücksetzen des Passworts.");
    } finally {
      setPendingPasswords((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const handleDeletePerson = async (userId: string, username: string) => {
    const confirmDelete = window.confirm(
      `Möchtest du "${username}" wirklich unwiderruflich aus dem System löschen?`
    );
    if (!confirmDelete) return;

    const formData = new FormData();
    formData.append("userId", userId);

    setPendingDeletes((prev) => ({ ...prev, [userId]: true }));
    try {
      const res = await adminDeletePerson(formData);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(`Person "${username}" wurde gelöscht.`);
      }
    } catch {
      toast.error("Fehler beim Löschen der Person.");
    } finally {
      setPendingDeletes((prev) => ({ ...prev, [userId]: false }));
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Formular zum Anlegen */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/70 p-6 shadow-xl backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/60 dark:shadow-2xl">
        <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-accent/10 blur-3xl" />
        <h3 className="mb-4 text-lg font-semibold tracking-tight text-slate-800 dark:text-slate-100">
          Neue Person anlegen
        </h3>
        
        <form onSubmit={handleCreatePerson} className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Benutzername</label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-accent focus:bg-white focus:outline-none focus:ring-4 focus:ring-accent/15 dark:border-slate-700/80 dark:bg-slate-800/40 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus:border-accent dark:focus:bg-slate-900/50"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="z.B. max.mustermann"
              required
              disabled={isPendingCreate}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">E-Mail (optional)</label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-accent focus:bg-white focus:outline-none focus:ring-4 focus:ring-accent/15 dark:border-slate-700/80 dark:bg-slate-800/40 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus:border-accent dark:focus:bg-slate-900/50"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="z.B. max@domain.de"
              type="email"
              disabled={isPendingCreate}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Passwort</label>
            <div className="flex gap-2">
              <input
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-accent focus:bg-white focus:outline-none focus:ring-4 focus:ring-accent/15 dark:border-slate-700/80 dark:bg-slate-800/40 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus:border-accent dark:focus:bg-slate-900/50"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mind. 8 Zeichen"
                type="password"
                required
                disabled={isPendingCreate}
              />
              <button
                className="inline-flex items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white shadow-md shadow-accent/10 transition-all hover:bg-accent/90 hover:shadow-lg active:scale-95 disabled:scale-100 disabled:opacity-60"
                type="submit"
                disabled={isPendingCreate}
              >
                {isPendingCreate ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  "Anlegen"
                )}
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* Verwaltung */}
      <section className="rounded-2xl border border-slate-200/80 bg-white/70 p-6 shadow-xl backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/60 dark:shadow-2xl">
        <h3 className="mb-4 text-lg font-semibold tracking-tight text-slate-800 dark:text-slate-100">
          Personen verwalten
        </h3>

        <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/20">
          <div className="hidden grid-cols-[1.2fr_1.5fr_1.5fr_auto] gap-4 border-b border-slate-100 bg-slate-50/70 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-400 md:grid">
            <span>Benutzername</span>
            <span>E-Mail-Adresse</span>
            <span>Passwort ändern</span>
            <span className="text-right">Aktionen</span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {authUsers.map((person) => {
              const isPwdPending = pendingPasswords[person.id] || false;
              const isDelPending = pendingDeletes[person.id] || false;

              return (
                <div
                  key={person.id}
                  className="grid grid-cols-1 items-center gap-4 px-6 py-4 transition-all hover:bg-slate-50/40 dark:hover:bg-slate-800/10 md:grid-cols-[1.2fr_1.5fr_1.5fr_auto]"
                >
                  {/* Benutzername */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-xs font-bold uppercase tracking-wider text-accent dark:bg-accent/20">
                      {person.username.substring(0, 2)}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[180px]" title={person.username}>
                        {person.username}
                      </div>
                      <div className="text-xs text-slate-400 dark:text-slate-500 md:hidden">
                        {person.email || "Keine E-Mail"}
                      </div>
                    </div>
                  </div>

                  {/* E-Mail */}
                  <div className="hidden text-sm text-slate-600 dark:text-slate-300 truncate dark:text-slate-300 md:block" title={person.email}>
                    {person.email || <span className="italic text-slate-400 dark:text-slate-500">Keine E-Mail</span>}
                  </div>

                  {/* Passwort ändern */}
                  <div className="flex items-center gap-2">
                    <input
                      className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs text-slate-800 transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-accent focus:bg-white focus:outline-none focus:ring-4 focus:ring-accent/15 dark:border-slate-700/80 dark:bg-slate-800/40 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus:border-accent dark:focus:bg-slate-900/50"
                      type="password"
                      placeholder="Neues Passwort"
                      value={userPasswords[person.id] || ""}
                      onChange={(e) =>
                        setUserPasswords((prev) => ({ ...prev, [person.id]: e.target.value }))
                      }
                      disabled={isPwdPending || isDelPending}
                    />
                    <button
                      className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-95 disabled:scale-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                      onClick={() => handleUpdatePassword(person.id, person.username)}
                      disabled={isPwdPending || isDelPending}
                    >
                      {isPwdPending ? (
                        <span className="h-3 w-3 animate-spin rounded-full border border-slate-500 border-t-transparent dark:border-slate-400" />
                      ) : (
                        "Speichern"
                      )}
                    </button>
                  </div>

                  {/* Löschen */}
                  <div className="flex justify-end gap-2">
                    <button
                      className="inline-flex h-9 items-center justify-center rounded-xl border border-rose-100 bg-rose-50/30 px-3 text-xs font-semibold text-rose-600 transition-all hover:bg-rose-50 hover:text-rose-700 active:scale-95 disabled:scale-100 disabled:opacity-50 dark:border-rose-950/30 dark:bg-rose-950/10 dark:text-rose-400 dark:hover:bg-rose-950/20"
                      onClick={() => handleDeletePerson(person.id, person.username)}
                      disabled={isPwdPending || isDelPending}
                    >
                      {isDelPending ? (
                        <span className="h-3 w-3 animate-spin rounded-full border border-rose-500 border-t-transparent" />
                      ) : (
                        "Löschen"
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {authUsers.length === 0 && (
            <div className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
              Keine Personen im System registriert.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
