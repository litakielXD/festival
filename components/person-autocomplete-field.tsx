"use client";

import { useMemo, useState } from "react";

interface PersonOption {
  user_id: string;
  display_name: string;
  email: string;
}

interface PersonAutocompleteFieldProps {
  people: PersonOption[];
  name?: string;
  userIdFieldName?: string;
  placeholder?: string;
}

export function PersonAutocompleteField({
  people,
  name = "identifier",
  userIdFieldName = "userId",
  placeholder = "Name oder E-Mail"
}: PersonAutocompleteFieldProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return people.slice(0, 8);
    return people
      .filter(
        (person) =>
          person.display_name.toLowerCase().includes(term) ||
          person.email.toLowerCase().includes(term)
      )
      .slice(0, 8);
  }, [people, query]);

  return (
    <div className="relative">
      <input
        className="w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm"
        name={name}
        value={query}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onChange={(event) => {
          setQuery(event.target.value);
          setSelectedUserId("");
          setOpen(true);
        }}
        required
      />
      <input type="hidden" name={userIdFieldName} value={selectedUserId} />
      {open && filtered.length ? (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-slate-300 bg-card p-1 shadow-lg">
          {filtered.map((person) => (
            <button
              key={person.user_id}
              type="button"
              className="block w-full rounded px-2 py-2 text-left text-sm hover:bg-slate-100"
              onMouseDown={(event) => {
                event.preventDefault();
                setQuery(person.email);
                setSelectedUserId(person.user_id);
                setOpen(false);
              }}
            >
              <span className="font-medium">{person.display_name}</span>
              <span className="ml-2 text-xs text-muted">{person.email}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
