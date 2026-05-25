"use client";

import { useActionState, useEffect, useRef } from "react";
import { addFestivalMemberWithState, type FestivalMemberActionState } from "@/lib/actions/festival";
import { PersonAutocompleteField } from "@/components/person-autocomplete-field";
import { toast } from "@/components/ui/toast";

interface PersonOption {
  user_id: string;
  display_name: string;
  email: string;
}

interface FestivalMemberAssignmentFormProps {
  festivalId: string;
  people: PersonOption[];
}

const initialState: FestivalMemberActionState = { ok: false, message: "" };

export function FestivalMemberAssignmentForm({ festivalId, people }: FestivalMemberAssignmentFormProps) {
  const [state, formAction, pending] = useActionState(addFestivalMemberWithState, initialState);
  const prevMessage = useRef("");

  useEffect(() => {
    if (state.message && state.message !== prevMessage.current) {
      prevMessage.current = state.message;
      if (state.ok) toast.success(state.message);
      else toast.error(state.message);
    }
  }, [state]);

  return (
    <form action={formAction} className="flex gap-2">
      <input type="hidden" name="festivalId" value={festivalId} />
      <PersonAutocompleteField people={people} name="identifier" placeholder="Name oder E-Mail zuweisen" />
      <button
        className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100 disabled:opacity-60"
        type="submit"
        disabled={pending}
      >
        {pending ? "Zuweisen…" : "Zuweisen"}
      </button>
    </form>
  );
}
