import Link from "next/link";
import { signOut } from "@/lib/actions/auth";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-6xl px-6 py-8">
      <header className="mb-8 flex items-center justify-between rounded-lg border border-slate-700 bg-card p-4">
        <Link className="text-lg font-bold" href="/dashboard">
          Festival Planner
        </Link>
        <form action={signOut}>
          <button className="rounded-md bg-slate-800 px-3 py-2 text-sm" type="submit">
            Logout
          </button>
        </form>
      </header>
      {children}
    </div>
  );
}
