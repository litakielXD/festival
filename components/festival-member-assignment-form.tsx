"use client";

import { useActionState } from "react";
import { addFestivalMemberWithState, type FestivalMemberActionState } from "@/lib/actions/festival";
import { PersonAutocompleteField } from "@/components/person-autocomplete-field";

interface PersonOption {
  user_id: string;
  display_name: string;
  email: string;
}

interface FestivalMemberAssignmentFormProps {
  festivalId: string;
  people: PersonOption[];
}

const initialState: FestivalMemberActionState = {
  ok: false,
  message: ""
};

export function FestivalMemberAssignmentForm({ festivalId, people }: FestivalMemberAssignmentFormProps) {
  const [state, formAction, pending] = useActionState(addFestivalMemberWithState, initialState);

  return (
    <form action={formAction} className="space-y-2">
      <div className="flex gap-2">
        <input type="hidden" name="festivalId" value={festivalId} />
        <PersonAutocompleteField people={people} name="identifier" placeholder="Name oder E-Mail zuweisen" />
        <button className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100 disabled:opacity-60" type="submit" disabled={pending}>
          {pending ? "Zuweisen..." : "Zuweisen"}
        </button>
      </div>
      {state.message ? (
        <p className={`text-xs ${state.ok ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p>
      ) : null}
    </form>
  );
}
