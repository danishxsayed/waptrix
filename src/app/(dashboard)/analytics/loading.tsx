export default function AnalyticsLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-6 w-32 rounded bg-surface" />
          <div className="h-3 w-48 rounded bg-surface" />
        </div>
        <div className="h-9 w-40 rounded-xl bg-surface" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass-card space-y-3">
            <div className="h-3 w-24 rounded bg-surface" />
            <div className="h-8 w-20 rounded bg-surface" />
            <div className="h-2 w-12 rounded bg-surface" />
          </div>
        ))}
      </div>

      <div className="glass-card">
        <div className="h-5 w-40 rounded bg-surface mb-6" />
        <div className="h-64 rounded-xl bg-surface" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="glass-card space-y-4">
            <div className="h-5 w-32 rounded bg-surface" />
            <div className="h-48 rounded-xl bg-surface" />
          </div>
        ))}
      </div>
    </div>
  );
}
