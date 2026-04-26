import Link from "next/link";

interface GroupNavProps {
  groupId: string;
}

export function GroupNav({ groupId }: GroupNavProps) {
  const base = `/dashboard/groups/${groupId}`;

  return (
    <nav className="mb-6 flex gap-3 text-sm">
      <Link className="rounded-md border border-slate-700 px-3 py-2" href={`${base}/timeline`}>
        Timeline
      </Link>
      <Link className="rounded-md border border-slate-700 px-3 py-2" href={`${base}/bands`}>
        Bands
      </Link>
      <Link className="rounded-md border border-slate-700 px-3 py-2" href={`${base}/notes`}>
        Notizen
      </Link>
    </nav>
  );
}
