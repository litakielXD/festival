export default function BandsLoading() {
  return (
    <main className="space-y-6 animate-pulse">
      <div className="h-8 w-64 rounded-md bg-slate-200 dark:bg-slate-800" />
      <div className="flex gap-2 pb-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 w-24 rounded-lg bg-slate-200 dark:bg-slate-800" />
        ))}
      </div>
      <div className="space-y-2">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-100 p-3 dark:border-slate-800 dark:bg-slate-900">
            <div className="h-6 w-6 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-4 w-40 rounded bg-slate-200 dark:bg-slate-800" />
          </div>
        ))}
      </div>
    </main>
  );
}
