export default function FestivalDetailLoading() {
  return (
    <main className="space-y-6 animate-pulse">
      {/* Festival Title */}
      <div className="h-8 w-80 rounded-md bg-slate-200 dark:bg-slate-800" />

      {/* Nav skeleton */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 w-24 rounded-lg bg-slate-200 dark:bg-slate-800" />
        ))}
      </div>

      {/* Body content skeleton */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950 space-y-4">
        <div className="h-6 w-48 rounded-md bg-slate-200 dark:bg-slate-800" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 w-full rounded-lg bg-slate-100 dark:bg-slate-900" />
          ))}
        </div>
      </div>
    </main>
  );
}
