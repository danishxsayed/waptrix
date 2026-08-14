export default function ConnectLoading() {
  return (
    <div className="space-y-6 animate-pulse max-w-2xl">
      <div className="space-y-2">
        <div className="h-6 w-48 rounded bg-surface" />
        <div className="h-3 w-64 rounded bg-surface" />
      </div>
      <div className="glass-card space-y-5">
        <div className="h-5 w-40 rounded bg-surface" />
        <div className="h-20 rounded-2xl bg-surface" />
        <div className="h-20 rounded-2xl bg-surface" />
        <div className="h-10 w-36 rounded-xl bg-surface" />
      </div>
    </div>
  );
}
