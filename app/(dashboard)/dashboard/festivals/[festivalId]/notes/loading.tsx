export default function NotesLoading() {
  return (
    <main className="space-y-6 animate-pulse">
      <div className="h-8 w-64 rounded-md bg-slate-200 dark:bg-slate-800" />
      <div className="flex gap-2 pb-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 w-24 rounded-lg bg-slate-200 dark:bg-slate-800" />
        ))}
      </div>
      <div className="h-40 rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900" />
        ))}
      </div>
    </main>
  );
}
