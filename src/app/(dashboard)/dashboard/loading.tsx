export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass-card flex flex-col gap-4">
            <div className="flex justify-between">
              <div className="w-9 h-9 rounded-lg bg-surface" />
              <div className="w-12 h-4 rounded bg-surface" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-28 rounded bg-surface" />
              <div className="h-8 w-20 rounded bg-surface" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart */}
        <div className="lg:col-span-2 glass-card">
          <div className="flex justify-between mb-8">
            <div className="space-y-2">
              <div className="h-5 w-36 rounded bg-surface" />
              <div className="h-3 w-24 rounded bg-surface" />
            </div>
            <div className="h-9 w-32 rounded-xl bg-surface" />
          </div>
          <div className="h-72 rounded-xl bg-surface" />
        </div>

        {/* Quick actions */}
        <div className="glass-card">
          <div className="h-5 w-28 rounded bg-surface mb-6" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-surface" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
