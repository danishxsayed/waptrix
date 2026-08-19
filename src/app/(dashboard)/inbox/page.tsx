"use client";
export const dynamic = "force-dynamic";

import InboxPanel from "@/components/inbox/InboxPanel";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function InboxPageInner() {
  const [, setUnread] = useState(0);
  const searchParams = useSearchParams();
  const initialPhone = searchParams.get("phone") ?? undefined;
  const initialName = searchParams.get("name") ?? undefined;

  return (
    // -m-8 cancels the p-8 on <main>; h-[calc(100vh-64px)] = full viewport minus topbar (h-16)
    // overflow-hidden prevents any scroll leaking out
    <div className="-m-8 h-[calc(100vh-64px)] overflow-hidden">
      <InboxPanel
        onUnreadChange={setUnread}
        fullHeight
        initialPhone={initialPhone}
        initialName={initialName}
      />
    </div>
  );
}

export default function InboxPage() {
  return (
    <Suspense fallback={null}>
      <InboxPageInner />
    </Suspense>
  );
}
