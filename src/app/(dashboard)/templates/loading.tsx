export default function TemplatesLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-6 w-40 rounded bg-surface" />
          <div className="h-3 w-56 rounded bg-surface" />
        </div>
        <div className="h-10 w-36 rounded-xl bg-surface" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="glass-card space-y-4">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="h-5 w-36 rounded bg-surface" />
                <div className="h-3 w-20 rounded bg-surface" />
              </div>
              <div className="h-6 w-16 rounded-full bg-surface" />
            </div>
            <div className="space-y-1.5">
              <div className="h-3 w-full rounded bg-surface" />
              <div className="h-3 w-4/5 rounded bg-surface" />
              <div className="h-3 w-3/5 rounded bg-surface" />
            </div>
            <div className="flex gap-2 pt-2 border-t border-border/50">
              <div className="h-8 flex-1 rounded-xl bg-surface" />
              <div className="h-8 flex-1 rounded-xl bg-surface" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
