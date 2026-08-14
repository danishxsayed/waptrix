export default function InboxLoading() {
  return (
    <div className="flex h-full gap-0 -m-8 animate-pulse">
      {/* Conversation list */}
      <div className="w-80 border-r border-border bg-card flex flex-col shrink-0">
        <div className="p-4 border-b border-border space-y-3">
          <div className="h-5 w-24 rounded bg-surface" />
          <div className="h-9 rounded-xl bg-surface" />
        </div>
        <div className="flex-1 overflow-hidden">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border/40">
              <div className="w-10 h-10 rounded-full bg-surface shrink-0" />
              <div className="flex-1 space-y-1.5 min-w-0">
                <div className="flex justify-between gap-2">
                  <div className="h-3.5 w-28 rounded bg-surface" />
                  <div className="h-3 w-10 rounded bg-surface" />
                </div>
                <div className="h-3 w-40 rounded bg-surface" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Empty right panel */}
      <div className="flex-1 flex items-center justify-center bg-[#EDE8DE]">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-surface mx-auto" />
          <div className="h-4 w-40 rounded bg-surface mx-auto" />
          <div className="h-3 w-56 rounded bg-surface mx-auto" />
        </div>
      </div>
    </div>
  );
}
