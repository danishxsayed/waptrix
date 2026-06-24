"use client";
export const dynamic = "force-dynamic";

import InboxPanel from "@/components/inbox/InboxPanel";
import { useState } from "react";

export default function InboxPage() {
  const [, setUnread] = useState(0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-syne">WhatsApp Inbox</h1>
        <p className="text-sm text-text-muted mt-1">
          View and reply to customer messages in real-time
        </p>
      </div>
      <InboxPanel onUnreadChange={setUnread} fullHeight />
    </div>
  );
}
