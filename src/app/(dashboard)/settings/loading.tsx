export default function SettingsLoading() {
  return (
    <div className="space-y-6 animate-pulse max-w-2xl">
      <div className="space-y-2">
        <div className="h-6 w-32 rounded bg-surface" />
        <div className="h-3 w-48 rounded bg-surface" />
      </div>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="glass-card space-y-4">
          <div className="h-5 w-40 rounded bg-surface" />
          <div className="h-10 rounded-xl bg-surface" />
          <div className="h-10 rounded-xl bg-surface" />
          <div className="h-10 w-28 rounded-xl bg-surface" />
        </div>
      ))}
    </div>
  );
}
