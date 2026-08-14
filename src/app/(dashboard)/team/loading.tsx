export default function TeamLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-6 w-36 rounded bg-surface" />
          <div className="h-3 w-48 rounded bg-surface" />
        </div>
        <div className="h-10 w-32 rounded-xl bg-surface" />
      </div>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="glass-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-surface shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-36 rounded bg-surface" />
            <div className="h-3 w-48 rounded bg-surface" />
          </div>
          <div className="h-6 w-16 rounded-full bg-surface" />
          <div className="h-8 w-8 rounded-lg bg-surface" />
        </div>
      ))}
    </div>
  );
}
