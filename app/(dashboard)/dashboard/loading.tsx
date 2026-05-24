export default function DashboardLoading() {
  return (
    <main className="space-y-8 animate-pulse">
      {/* Page Title skeleton */}
      <div className="h-8 w-64 rounded-md bg-slate-200 dark:bg-slate-800" />

      {/* 3-Column Grid skeleton */}
      <section className="grid gap-4 md:grid-cols-3">
        {/* Column 1: Kommende Festivals */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 space-y-4">
          <div className="h-5 w-40 rounded-md bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50" />
            ))}
          </div>
        </div>

        {/* Column 2: Vergangene Festivals */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 space-y-4">
          <div className="h-5 w-40 rounded-md bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50" />
            ))}
          </div>
        </div>

        {/* Column 3: Neueste Nachrichten */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 space-y-4">
          <div className="h-5 w-40 rounded-md bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-28 rounded-md bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-full rounded-md bg-slate-200 dark:bg-slate-800" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
