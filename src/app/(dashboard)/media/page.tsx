"use client";
export const dynamic = "force-dynamic";


import { useState } from "react";
import { UploadCloud, FolderOpen } from "lucide-react";
import MediaLibrary from "@/components/media/MediaLibrary";

export default function MediaPage() {
  const [open, setOpen] = useState(true);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold font-syne">Media Library</h2>
          <p className="text-sm text-text-muted">Manage your images, videos, and documents. Reuse them across templates.</p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary flex items-center gap-2">
          <UploadCloud className="w-4 h-4" /> Upload Files
        </button>
      </div>

      {/* Always show the library inline (no modal) on this page */}
      <div className="glass-card !p-0 overflow-hidden relative" style={{ height: "calc(100vh - 200px)", minHeight: 500 }}>
        {open && (
          <MediaLibrary
            onClose={() => {}}
            selectionMode={false}
          />
        )}
        {!open && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <FolderOpen className="w-16 h-16 text-text-muted opacity-20" />
            <button onClick={() => setOpen(true)} className="btn-primary">Open Media Library</button>
          </div>
        )}
      </div>
    </div>
  );
}
