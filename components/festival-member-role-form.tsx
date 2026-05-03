"use client";

import { useActionState } from "react";
import { updateFestivalMemberRoleWithState, type FestivalMemberActionState } from "@/lib/actions/festival";

const initialState: FestivalMemberActionState = {
  ok: false,
  message: ""
};

interface FestivalMemberRoleFormProps {
  festivalId: string;
  memberId: string;
  defaultRole: "admin" | "member";
}

export function FestivalMemberRoleForm({ festivalId, memberId, defaultRole }: FestivalMemberRoleFormProps) {
  const [state, formAction, pending] = useActionState(updateFestivalMemberRoleWithState, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-1">
      <input type="hidden" name="festivalId" value={festivalId} />
      <input type="hidden" name="memberId" value={memberId} />
      <div className="flex items-center gap-2">
        <select
          name="role"
          defaultValue={defaultRole}
          className="h-7 rounded border border-slate-300 bg-slate-100 px-2 text-xs disabled:opacity-60"
          disabled={pending}
        >
          <option value="member">member</option>
          <option value="admin">admin</option>
        </select>
        <button
          className="h-7 rounded border border-slate-300 px-2 text-xs hover:bg-slate-100 disabled:opacity-60"
          type="submit"
          disabled={pending}
        >
          {pending ? "…" : "Speichern"}
        </button>
      </div>
      {state.message ? (
        <p className={`text-xs ${state.ok ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p>
      ) : null}
    </form>
  );
}
