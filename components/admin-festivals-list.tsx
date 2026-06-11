"use client";

import { useState, useEffect, useTransition } from "react";
import Image from "next/image";
import { toast } from "@/components/ui/toast";
import { AvatarUploadField } from "@/components/avatar-upload-field";
import { FestivalMemberAssignmentForm } from "@/components/festival-member-assignment-form";
import { FestivalMemberRoleForm } from "@/components/festival-member-role-form";
import { createFestival, updateFestival } from "@/lib/actions/festivals";
import { removeFestivalMember } from "@/lib/actions/festival";
import { adminAddFestivalBandSlot, adminDeleteFestival } from "@/lib/actions/admin";

interface FestivalMember {
  user_id: string;
  display_name: string;
  role: string;
}

interface Festival {
  id: string;
  name: string;
  avatar_url: string | null;
  starts_on: string | null;
  ends_on: string | null;
  location: string | null;
  members?: FestivalMember[];
}

interface PersonOption {
  user_id: string;
  display_name: string;
  email: string;
}

interface AdminFestivalsListProps {
  festivals: Festival[];
  peopleOptions: PersonOption[];
  peopleNameMap: Record<string, string>;
  peopleEmailMap: Record<string, string>;
  userId: string;
}

export function AdminFestivalsList({
  festivals,
  peopleOptions,
  peopleNameMap,
  peopleEmailMap,
  userId
}: AdminFestivalsListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Transitions for loading states
  const [isPendingCreate, startCreateTransition] = useTransition();
  const [isPendingUpdate, startUpdateTransition] = useTransition();
  const [isPendingSlot, startSlotTransition] = useTransition();
  const [isPendingDelete, startDeleteTransition] = useTransition();
  const [pendingRemoves, setPendingRemoves] = useState<Record<string, boolean>>({});

  // Festival creation form states
  const [createName, setCreateName] = useState("");
  const [createAvatar, setCreateAvatar] = useState("");

  // Slots form states per festival ID
  const [slotBandNames, setSlotBandNames] = useState<Record<string, string>>({});
  const [slotDayDates, setSlotDayDates] = useState<Record<string, string>>({});
  const [slotDayLabels, setSlotDayLabels] = useState<Record<string, string>>({});
  const [slotStartsAts, setSlotStartsAts] = useState<Record<string, string>>({});
  const [slotEndsAts, setSlotEndsAts] = useState<Record<string, string>>({});
  const [slotStages, setSlotStages] = useState<Record<string, string>>({});

  // Restore accordion state from sessionStorage on mount
  useEffect(() => {
    const saved = sessionStorage.getItem("admin_expanded_festival_id");
    if (saved) {
      setExpandedId(saved);
    }
  }, []);

  const handleToggleAccordion = (id: string) => {
    const next = expandedId === id ? null : id;
    setExpandedId(next);
    if (next) {
      sessionStorage.setItem("admin_expanded_festival_id", next);
    } else {
      sessionStorage.removeItem("admin_expanded_festival_id");
    }
  };

  const handleCreateFestival = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) {
      toast.error("Festivalname ist erforderlich.");
      return;
    }

    const formData = new FormData();
    formData.append("name", createName);
    formData.append("avatarUrl", createAvatar);

    startCreateTransition(async () => {
      try {
        const res = await createFestival(formData);
        if (res?.error) {
          toast.error(res.error);
        } else {
          toast.success(`Festival "${createName}" erfolgreich angelegt!`);
          setCreateName("");
          setCreateAvatar("");
        }
      } catch {
        toast.error("Unerwarteter Fehler beim Anlegen des Festivals.");
      }
    });
  };

  const handleUpdateFestival = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);

    startUpdateTransition(async () => {
      try {
        const res = await updateFestival(formData);
        if (res?.error) {
          toast.error(res.error);
        } else {
          toast.success("Festival-Details erfolgreich gespeichert.");
        }
      } catch {
        toast.error("Fehler beim Aktualisieren des Festivals.");
      }
    });
  };

  const handleRemoveMember = async (festivalId: string, memberId: string, memberName: string) => {
    const confirmRemove = window.confirm(
      `Möchtest du "${memberName}" wirklich aus diesem Festival entfernen?`
    );
    if (!confirmRemove) return;

    const formData = new FormData();
    formData.append("festivalId", festivalId);
    formData.append("memberId", memberId);

    setPendingRemoves((prev) => ({ ...prev, [`${festivalId}-${memberId}`]: true }));
    try {
      const res = await removeFestivalMember(formData);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(`Mitglied "${memberName}" wurde entfernt.`);
      }
    } catch {
      toast.error("Fehler beim Entfernen des Mitglieds.");
    } finally {
      setPendingRemoves((prev) => ({ ...prev, [`${festivalId}-${memberId}`]: false }));
    }
  };

  const handleAddSlot = async (e: React.FormEvent, festivalId: string) => {
    e.preventDefault();
    const bandName = slotBandNames[festivalId] || "";
    const dayDate = slotDayDates[festivalId] || "";
    const dayLabel = slotDayLabels[festivalId] || "";
    const startsAt = slotStartsAts[festivalId] || "";
    const endsAt = slotEndsAts[festivalId] || "";
    const stage = slotStages[festivalId] || "";

    if (!bandName.trim() || !dayDate || !startsAt || !endsAt) {
      toast.error("Bandname, Tag, Start- und Endzeit sind erforderlich.");
      return;
    }

    const formData = new FormData();
    formData.append("festivalId", festivalId);
    formData.append("bandName", bandName);
    formData.append("dayDate", dayDate);
    formData.append("dayLabel", dayLabel);
    formData.append("startsAt", startsAt);
    formData.append("endsAt", endsAt);
    formData.append("stage", stage);

    startSlotTransition(async () => {
      try {
        const res = await adminAddFestivalBandSlot(formData);
        if (res?.error) {
          toast.error(res.error);
        } else {
          toast.success(`Band "${bandName}" wurde erfolgreich eingeplant!`);
          // Clear only the fields for this festival
          setSlotBandNames((p) => ({ ...p, [festivalId]: "" }));
          setSlotDayDates((p) => ({ ...p, [festivalId]: "" }));
          setSlotDayLabels((p) => ({ ...p, [festivalId]: "" }));
          setSlotStartsAts((p) => ({ ...p, [festivalId]: "" }));
          setSlotEndsAts((p) => ({ ...p, [festivalId]: "" }));
          setSlotStages((p) => ({ ...p, [festivalId]: "" }));
        }
      } catch {
        toast.error("Fehler beim Hinzufügen der Band.");
      }
    });
  };

  const handleDeleteFestival = async (festivalId: string, festivalName: string) => {
    const confirmDelete = window.confirm(
      `WARNUNG: Möchtest du "${festivalName}" wirklich unwiderruflich löschen?\nAlle zugewiesenen Personen, Bands, Slots und Hausaufgaben gehen verloren!`
    );
    if (!confirmDelete) return;

    const formData = new FormData();
    formData.append("festivalId", festivalId);

    startDeleteTransition(async () => {
      try {
        const res = await adminDeleteFestival(formData);
        if (res?.error) {
          toast.error(res.error);
        } else {
          toast.success(`Festival "${festivalName}" wurde vollständig gelöscht.`);
          setExpandedId(null);
          sessionStorage.removeItem("admin_expanded_festival_id");
        }
      } catch {
        toast.error("Fehler beim Löschen des Festivals.");
      }
    });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Festival erstellen */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/70 p-6 shadow-xl backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/60 dark:shadow-2xl">
        <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-accent/10 blur-3xl" />
        <h3 className="mb-4 text-lg font-semibold tracking-tight text-slate-800 dark:text-slate-100">
          Festival erstellen
        </h3>

        <form onSubmit={handleCreateFestival} className="space-y-4">
          <AvatarUploadField
            userId={userId}
            label="Festivalbild"
            fieldName="avatarUrl"
            pathPrefix="festivals"
            initialAvatarUrl={createAvatar}
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-accent focus:bg-white focus:outline-none focus:ring-4 focus:ring-accent/15 dark:border-slate-700/80 dark:bg-slate-800/40 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus:border-accent dark:focus:bg-slate-900/50"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Name des Festivals (z.B. Hurricane)"
              required
              disabled={isPendingCreate}
            />
            <button
              className="inline-flex items-center justify-center rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-accent/10 transition-all hover:bg-accent/90 hover:shadow-lg active:scale-95 disabled:scale-100 disabled:opacity-60"
              type="submit"
              disabled={isPendingCreate}
            >
              {isPendingCreate ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                "Festival anlegen"
              )}
            </button>
          </div>
        </form>
      </section>

      {/* Festivals verwalten */}
      <section className="rounded-2xl border border-slate-200/80 bg-white/70 p-6 shadow-xl backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/60 dark:shadow-2xl">
        <h3 className="mb-4 text-lg font-semibold tracking-tight text-slate-800 dark:text-slate-100">
          Festivals verwalten
        </h3>

        <div className="space-y-4">
          {festivals.map((festival) => {
            const isExpanded = expandedId === festival.id;

            return (
              <div
                key={festival.id}
                className={`overflow-hidden rounded-2xl border transition-all duration-300 ${
                  isExpanded
                    ? "border-slate-300 bg-slate-50/20 shadow-md dark:border-slate-700/80 dark:bg-slate-800/10"
                    : "border-slate-200/60 bg-white hover:border-slate-300 dark:border-slate-800/60 dark:bg-slate-900/30 dark:hover:border-slate-700"
                }`}
              >
                {/* Accordion Header */}
                <button
                  type="button"
                  onClick={() => handleToggleAccordion(festival.id)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left focus:outline-none"
                >
                  <div className="flex items-center gap-3">
                    {festival.avatar_url ? (
                      <Image
                        src={festival.avatar_url}
                        alt={festival.name}
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded-full object-cover shadow-sm ring-2 ring-slate-100 dark:ring-slate-800"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xs font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        {festival.name.substring(0, 2)}
                      </div>
                    )}
                    <div>
                      <h4 className="font-semibold text-slate-800 dark:text-slate-100">
                        {festival.name}
                      </h4>
                      {festival.location && (
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          📍 {festival.location}
                          {festival.starts_on && ` • 📅 ${new Date(festival.starts_on).toLocaleDateString("de-DE")}`}
                        </p>
                      )}
                    </div>
                  </div>

                  <svg
                    className={`h-5 w-5 text-slate-400 transition-transform duration-200 dark:text-slate-500 ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Accordion Content */}
                {isExpanded && (
                  <div className="border-t border-slate-200/50 px-5 py-5 dark:border-slate-800/50">
                    <div className="grid gap-6 lg:grid-cols-2">
                      
                      {/* Left: General Settings and Members */}
                      <div className="space-y-6">
                        {/* Zuweisungs-Tabelle */}
                        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/10">
                          <h5 className="mb-3 font-semibold text-slate-700 dark:text-slate-200">
                            Zugewiesene Personen
                          </h5>
                          
                          {festival.members && festival.members.length > 0 ? (
                            <div className="space-y-2">
                              <div className="hidden grid-cols-[1.2fr_1.5fr_auto] gap-2 border-b border-slate-100 pb-1.5 text-xs font-semibold text-slate-400 dark:border-slate-800 md:grid">
                                <span>Name</span>
                                <span>E-Mail</span>
                                <span>Rolle / Aktion</span>
                              </div>
                              <ul className="space-y-2">
                                {festival.members.map((member) => {
                                  const name = peopleNameMap[member.user_id] ?? member.display_name;
                                  const email = peopleEmailMap[member.user_id] ?? "keine E-Mail";
                                  const pendingKey = `${festival.id}-${member.user_id}`;
                                  const isRemoving = pendingRemoves[pendingKey] || false;

                                  return (
                                    <li
                                      key={pendingKey}
                                      className="grid grid-cols-1 items-center gap-2 rounded-xl border border-slate-100/50 bg-slate-50/30 px-3 py-2 text-xs transition-all hover:bg-slate-50 dark:border-slate-800/50 dark:bg-slate-800/10 dark:hover:bg-slate-800/20 md:grid-cols-[1.2fr_1.5fr_auto]"
                                    >
                                      <span className="font-medium text-slate-800 dark:text-slate-100 truncate" title={name}>
                                        {name}
                                      </span>
                                      <span className="text-slate-400 truncate dark:text-slate-500" title={email}>
                                        {email}
                                      </span>
                                      <div className="flex items-center gap-2 justify-end md:justify-start">
                                        <FestivalMemberRoleForm
                                          festivalId={festival.id}
                                          memberId={member.user_id}
                                          defaultRole={member.role === "admin" ? "admin" : "member"}
                                        />
                                        <button
                                          className="inline-flex h-7 items-center justify-center rounded-lg border border-rose-100 bg-rose-50/20 px-2 text-[10px] font-semibold text-rose-600 transition-all hover:bg-rose-50 hover:text-rose-700 active:scale-95 disabled:scale-100 disabled:opacity-50 dark:border-rose-950/20 dark:bg-rose-950/5 dark:text-rose-400 dark:hover:bg-rose-950/15"
                                          onClick={() => handleRemoveMember(festival.id, member.user_id, name)}
                                          disabled={isRemoving}
                                        >
                                          {isRemoving ? "…" : "Entfernen"}
                                        </button>
                                      </div>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                              Noch keine Personen zugewiesen.
                            </p>
                          )}
                        </div>

                        {/* Person zuweisen */}
                        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/10">
                          <h5 className="mb-2.5 font-semibold text-slate-700 dark:text-slate-200">
                            Person zuweisen
                          </h5>
                          <FestivalMemberAssignmentForm festivalId={festival.id} people={peopleOptions} />
                        </div>

                        {/* Festival bearbeiten Form */}
                        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/10">
                          <h5 className="mb-3 font-semibold text-slate-700 dark:text-slate-200">
                            Festival bearbeiten
                          </h5>
                          
                          <form onSubmit={handleUpdateFestival} className="space-y-3">
                            <input type="hidden" name="festivalId" value={festival.id} />
                            
                            <AvatarUploadField
                              userId={userId}
                              fieldName="avatarUrl"
                              label="Festivalbild bearbeiten"
                              pathPrefix="festivals"
                              initialAvatarUrl={festival.avatar_url}
                            />
                            
                            <div className="space-y-1">
                              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Festivalname</label>
                              <input
                                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-accent focus:bg-white focus:outline-none dark:border-slate-700/80 dark:bg-slate-800/40 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus:border-accent dark:focus:bg-slate-900/50"
                                name="name"
                                defaultValue={festival.name}
                                placeholder="Festivalname"
                                required
                                disabled={isPendingUpdate}
                              />
                            </div>

                            <div className="grid gap-3 md:grid-cols-2">
                              <div className="space-y-1">
                                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Startdatum</label>
                                <input
                                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 transition-all hover:border-slate-300 focus:border-accent focus:bg-white focus:outline-none dark:border-slate-700/80 dark:bg-slate-800/40 dark:text-slate-100 dark:hover:border-slate-600 dark:focus:border-accent"
                                  type="date"
                                  name="startsOn"
                                  defaultValue={festival.starts_on ?? ""}
                                  disabled={isPendingUpdate}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Enddatum</label>
                                <input
                                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 transition-all hover:border-slate-300 focus:border-accent focus:bg-white focus:outline-none dark:border-slate-700/80 dark:bg-slate-800/40 dark:text-slate-100 dark:hover:border-slate-600 dark:focus:border-accent"
                                  type="date"
                                  name="endsOn"
                                  defaultValue={festival.ends_on ?? ""}
                                  disabled={isPendingUpdate}
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Veranstaltungsort</label>
                              <input
                                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-accent focus:bg-white focus:outline-none dark:border-slate-700/80 dark:bg-slate-800/40 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus:border-accent dark:focus:bg-slate-900/50"
                                name="location"
                                defaultValue={festival.location ?? ""}
                                placeholder="Ort"
                                disabled={isPendingUpdate}
                              />
                            </div>

                            <button
                              className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-95 disabled:scale-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                              type="submit"
                              disabled={isPendingUpdate}
                            >
                              {isPendingUpdate ? "Speichert..." : "Festival speichern"}
                            </button>
                          </form>
                        </div>
                      </div>

                      {/* Right: Bands + Slots & Deletion */}
                      <div className="space-y-6">
                        {/* Band + Slot hinzufügen */}
                        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/10">
                          <h5 className="mb-3 font-semibold text-slate-700 dark:text-slate-200">
                            Band + Slot hinzufügen
                          </h5>

                          <form onSubmit={(e) => handleAddSlot(e, festival.id)} className="space-y-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Bandname</label>
                              <input
                                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-accent focus:bg-white focus:outline-none dark:border-slate-700/80 dark:bg-slate-800/40 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus:border-accent dark:focus:bg-slate-900/50"
                                placeholder="z.B. Blink-182"
                                value={slotBandNames[festival.id] || ""}
                                onChange={(e) => setSlotBandNames((p) => ({ ...p, [festival.id]: e.target.value }))}
                                required
                                disabled={isPendingSlot}
                              />
                            </div>

                            <div className="grid gap-3 md:grid-cols-2">
                              <div className="space-y-1">
                                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Tag (Datum)</label>
                                <input
                                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 transition-all hover:border-slate-300 focus:border-accent focus:bg-white focus:outline-none dark:border-slate-700/80 dark:bg-slate-800/40 dark:text-slate-100 dark:hover:border-slate-600"
                                  type="date"
                                  value={slotDayDates[festival.id] || ""}
                                  onChange={(e) => setSlotDayDates((p) => ({ ...p, [festival.id]: e.target.value }))}
                                  required
                                  disabled={isPendingSlot}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Tag-Label (optional)</label>
                                <input
                                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-accent focus:bg-white focus:outline-none dark:border-slate-700/80 dark:bg-slate-800/40 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus:bg-slate-900/50"
                                  placeholder="z.B. Tag 1 oder Freitag"
                                  value={slotDayLabels[festival.id] || ""}
                                  onChange={(e) => setSlotDayLabels((p) => ({ ...p, [festival.id]: e.target.value }))}
                                  disabled={isPendingSlot}
                                />
                              </div>
                            </div>

                            <div className="grid gap-3 md:grid-cols-2">
                              <div className="space-y-1">
                                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Startzeit (Lokal)</label>
                                <input
                                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 transition-all hover:border-slate-300 focus:border-accent focus:bg-white focus:outline-none dark:border-slate-700/80 dark:bg-slate-800/40 dark:text-slate-100 dark:hover:border-slate-600"
                                  type="datetime-local"
                                  value={slotStartsAts[festival.id] || ""}
                                  onChange={(e) => setSlotStartsAts((p) => ({ ...p, [festival.id]: e.target.value }))}
                                  required
                                  disabled={isPendingSlot}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Endzeit (Lokal)</label>
                                <input
                                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 transition-all hover:border-slate-300 focus:border-accent focus:bg-white focus:outline-none dark:border-slate-700/80 dark:bg-slate-800/40 dark:text-slate-100 dark:hover:border-slate-600"
                                  type="datetime-local"
                                  value={slotEndsAts[festival.id] || ""}
                                  onChange={(e) => setSlotEndsAts((p) => ({ ...p, [festival.id]: e.target.value }))}
                                  required
                                  disabled={isPendingSlot}
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Bühne / Stage (optional)</label>
                              <input
                                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-accent focus:bg-white focus:outline-none dark:border-slate-700/80 dark:bg-slate-800/40 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus:bg-slate-900/50"
                                placeholder="z.B. Main Stage"
                                value={slotStages[festival.id] || ""}
                                onChange={(e) => setSlotStages((p) => ({ ...p, [festival.id]: e.target.value }))}
                                disabled={isPendingSlot}
                              />
                            </div>

                            <button
                              className="inline-flex w-full items-center justify-center rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-slate-700 active:scale-95 disabled:scale-100 disabled:opacity-50 dark:bg-slate-700 dark:hover:bg-slate-600"
                              type="submit"
                              disabled={isPendingSlot}
                            >
                              {isPendingSlot ? (
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                              ) : (
                                "Band + Slot hinzufügen"
                              )}
                            </button>
                          </form>
                        </div>

                        {/* Rotes Lösch-Feld */}
                        <div className="rounded-xl border border-rose-100 bg-rose-50/10 p-4 shadow-sm dark:border-rose-950/20 dark:bg-rose-950/5">
                          <h5 className="mb-2 text-xs font-semibold text-rose-700 dark:text-rose-400">
                            Gefahrenzone
                          </h5>
                          <p className="mb-3 text-[11px] text-slate-500 dark:text-slate-400">
                            Das Löschen eines Festivals kann nicht rückgängig gemacht werden. Alle Daten werden unwiderruflich gelöscht.
                          </p>
                          <button
                            className="inline-flex h-9 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 text-xs font-semibold text-rose-600 transition-all hover:bg-rose-100 hover:text-rose-700 active:scale-95 disabled:scale-100 disabled:opacity-50 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-950/60"
                            onClick={() => handleDeleteFestival(festival.id, festival.name)}
                            disabled={isPendingDelete}
                          >
                            {isPendingDelete ? "Löscht..." : "Festival vollständig löschen"}
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {festivals.length === 0 && (
          <div className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
            Es sind keine Festivals im System vorhanden.
          </div>
        )}
      </section>
    </div>
  );
}
