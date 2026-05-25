"use client";

import { useActionState, useEffect, useRef } from "react";
import { updateFestivalMemberRoleWithState, type FestivalMemberActionState } from "@/lib/actions/festival";
import { toast } from "@/components/ui/toast";

const initialState: FestivalMemberActionState = { ok: false, message: "" };

interface FestivalMemberRoleFormProps {
  festivalId: string;
  memberId: string;
  defaultRole: "admin" | "member";
}

export function FestivalMemberRoleForm({ festivalId, memberId, defaultRole }: FestivalMemberRoleFormProps) {
  const [state, formAction, pending] = useActionState(updateFestivalMemberRoleWithState, initialState);
  const prevMessage = useRef("");

  useEffect(() => {
    if (state.message && state.message !== prevMessage.current) {
      prevMessage.current = state.message;
      if (state.ok) toast.success(state.message);
      else toast.error(state.message);
    }
  }, [state]);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="festivalId" value={festivalId} />
      <input type="hidden" name="memberId" value={memberId} />
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
    </form>
  );
}
