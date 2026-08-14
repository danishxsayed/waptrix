export default function CampaignsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-6 w-48 rounded bg-surface" />
          <div className="h-3 w-64 rounded bg-surface" />
        </div>
        <div className="h-10 w-36 rounded-xl bg-surface" />
      </div>

      {/* Campaign cards */}
      {[...Array(3)].map((_, i) => (
        <div key={i} className="glass-card flex flex-col md:flex-row gap-8 items-center">
          <div className="w-14 h-14 rounded-2xl bg-surface shrink-0" />
          <div className="flex-1 space-y-3 w-full">
            <div className="h-5 w-48 rounded bg-surface" />
            <div className="h-3 w-64 rounded bg-surface" />
          </div>
          <div className="flex-1 w-full max-w-md space-y-3">
            <div className="flex justify-between">
              <div className="h-3 w-16 rounded bg-surface" />
              <div className="h-3 w-8 rounded bg-surface" />
            </div>
            <div className="h-2 rounded-full bg-surface" />
            <div className="flex justify-between">
              <div className="h-3 w-16 rounded bg-surface" />
              <div className="h-3 w-16 rounded bg-surface" />
            </div>
          </div>
          <div className="flex gap-4 pl-8 border-l border-border/50">
            <div className="space-y-1 text-center">
              <div className="h-4 w-8 rounded bg-surface mx-auto" />
              <div className="h-2 w-16 rounded bg-surface" />
            </div>
            <div className="space-y-1 text-center">
              <div className="h-4 w-8 rounded bg-surface mx-auto" />
              <div className="h-2 w-8 rounded bg-surface" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
