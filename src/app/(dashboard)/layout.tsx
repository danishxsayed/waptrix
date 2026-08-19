export const dynamic = "force-dynamic";

import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import GlobalInboxNotifier from "@/components/layout/GlobalInboxNotifier";
import { TenantProvider } from "@/context/TenantContext";
import { InboxProvider } from "@/context/InboxContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TenantProvider>
      <InboxProvider>
        <GlobalInboxNotifier />
        <div className="flex h-screen bg-[#EDE8DE] overflow-hidden">
          <Sidebar />
          <div className="flex flex-col flex-1 overflow-hidden">
            <Topbar />
            <main className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[#EDE8DE]">
              {children}
            </main>
          </div>
        </div>
      </InboxProvider>
    </TenantProvider>
  );
}
