export default function BillingLoading() {
  return (
    <div className="p-8 max-w-3xl mx-auto animate-pulse">
      {/* Tab bar skeleton */}
      <div className="flex gap-1 mb-8 bg-card border border-border rounded-2xl p-1.5">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex-1 h-10 rounded-xl bg-surface" />
        ))}
      </div>

      {/* Content skeleton */}
      <div className="space-y-6">
        {/* Card 1 */}
        <div className="glass-card p-6 space-y-4">
          <div className="h-4 w-32 rounded bg-surface" />
          <div className="space-y-3">
            <div className="h-3 w-full rounded bg-surface" />
            <div className="h-3 w-3/4 rounded bg-surface" />
            <div className="h-3 w-1/2 rounded bg-surface" />
          </div>
          <div className="h-10 w-36 rounded-xl bg-surface mt-2" />
        </div>

        {/* Card 2 */}
        <div className="glass-card p-6 space-y-4">
          <div className="h-4 w-40 rounded bg-surface" />
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3 w-20 rounded bg-surface" />
                <div className="h-9 w-full rounded-xl bg-surface" />
              </div>
            ))}
          </div>
          <div className="h-10 w-36 rounded-xl bg-surface mt-2" />
        </div>
      </div>
    </div>
  );
}
