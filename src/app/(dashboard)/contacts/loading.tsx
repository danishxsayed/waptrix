export default function ContactsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-6 w-32 rounded bg-surface" />
          <div className="h-3 w-56 rounded bg-surface" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-32 rounded-xl bg-surface" />
          <div className="h-10 w-36 rounded-xl bg-surface" />
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex gap-3">
        <div className="h-10 flex-1 rounded-xl bg-surface" />
        <div className="h-10 w-32 rounded-xl bg-surface" />
        <div className="h-10 w-32 rounded-xl bg-surface" />
      </div>

      {/* Table */}
      <div className="glass-card p-0 overflow-hidden">
        <div className="h-12 bg-surface/50 border-b border-border" />
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-border/40 last:border-0">
            <div className="w-9 h-9 rounded-full bg-surface shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-36 rounded bg-surface" />
              <div className="h-3 w-28 rounded bg-surface" />
            </div>
            <div className="h-3 w-24 rounded bg-surface hidden md:block" />
            <div className="h-5 w-16 rounded-full bg-surface hidden lg:block" />
            <div className="h-3 w-20 rounded bg-surface hidden lg:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
