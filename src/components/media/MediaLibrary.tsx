"use client";

import { useState, useEffect, useRef } from "react";
import {
  X, Search, Trash2, Image as ImageIcon, Film, FileText,
  UploadCloud, CheckCircle2, Grid3X3, List, FolderOpen
} from "lucide-react";
import axios from "axios";
import {
  MediaItem, MediaCategory,
  readFileAsDataUrl, categoryFromMime, formatFileSize,
} from "@/lib/mediaStore";

// ─── Accept strings per category ─────────────────────────────────────────────
const ACCEPT: Record<MediaCategory | "ALL", string> = {
  ALL: "image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx",
  IMAGE: "image/jpeg,image/png,image/webp,image/gif",
  VIDEO: "video/mp4,video/quicktime,video/webm,video/x-msvideo",
  DOCUMENT: ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt",
};

const CAT_ICONS: Record<MediaCategory, React.ReactNode> = {
  IMAGE: <ImageIcon className="w-4 h-4" />,
  VIDEO: <Film className="w-4 h-4" />,
  DOCUMENT: <FileText className="w-4 h-4" />,
};

const CAT_COLORS: Record<MediaCategory, string> = {
  IMAGE: "text-jade bg-jade/10 border-jade/20",
  VIDEO: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  DOCUMENT: "text-amber-400 bg-amber-400/10 border-amber-400/20",
};

interface MediaLibraryProps {
  onSelect?: (item: MediaItem) => void;
  filterCategory?: MediaCategory;
  onClose: () => void;
  selectionMode?: boolean; // true = picker mode, false = full manager
}

export default function MediaLibrary({
  onSelect,
  filterCategory,
  onClose,
  selectionMode = false,
}: MediaLibraryProps) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<MediaCategory | "ALL">(filterCategory || "ALL");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMedia();
  }, []);

  const fetchMedia = async () => {
    try {
      const res = await axios.get("/api/media");
      setItems(res.data);
    } catch (err) {
      console.error("Failed to fetch media", err);
    }
  };

  const uploadFiles = async (files: FileList | File[]) => {
    setUploading(true);
    const arr = Array.from(files);
    for (const file of arr) {
      if (file.size > 20 * 1024 * 1024) {
        alert(`"${file.name}" exceeds 20 MB limit — skipped.`);
        continue;
      }
      try {
        const dataUrl = await readFileAsDataUrl(file);
        const payload = {
          name: file.name,
          category: categoryFromMime(file.type),
          dataUrl,
          mimeType: file.type,
          sizeBytes: file.size,
        };
        await axios.post("/api/media", payload);
      } catch (err) {
        console.error("Failed to upload", file.name, err);
      }
    }
    setUploading(false);
    fetchMedia();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`/api/media/${id}`);
      setDeleteConfirm(null);
      if (selected === id) setSelected(null);
      fetchMedia();
    } catch (err) {
      console.error("Delete failed", err);
      alert("Failed to delete media item.");
    }
  };

  const handleSelect = (item: MediaItem) => {
    setSelected(item.id);
  };

  const handleConfirmSelect = () => {
    const item = items.find((m) => m.id === selected);
    if (item && onSelect) {
      onSelect(item);
      onClose();
    }
  };

  const filtered = items.filter((m) => {
    const matchTab = activeTab === "ALL" || m.category === activeTab;
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const tabs: (MediaCategory | "ALL")[] = filterCategory
    ? ["ALL", filterCategory]
    : ["ALL", "IMAGE", "VIDEO", "DOCUMENT"];

  const tabLabel: Record<string, string> = {
    ALL: "All Media",
    IMAGE: "Images",
    VIDEO: "Videos",
    DOCUMENT: "Documents",
  };

  const renderThumbnail = (item: MediaItem, size: "sm" | "lg" = "lg") => {
    const cls = size === "lg" ? "w-full h-32 object-cover rounded-lg" : "w-10 h-10 object-cover rounded-md flex-shrink-0";
    if (item.category === "IMAGE") {
      return <img src={item.dataUrl} alt={item.name} className={cls} />;
    }
    if (item.category === "VIDEO") {
      return (
        <div className={`${size === "lg" ? "w-full h-32" : "w-10 h-10 flex-shrink-0"} bg-blue-400/10 rounded-${size === "lg" ? "lg" : "md"} flex items-center justify-center border border-blue-400/20`}>
          <Film className={`${size === "lg" ? "w-8 h-8" : "w-5 h-5"} text-blue-400`} />
        </div>
      );
    }
    return (
      <div className={`${size === "lg" ? "w-full h-32" : "w-10 h-10 flex-shrink-0"} bg-amber-400/10 rounded-${size === "lg" ? "lg" : "md"} flex items-center justify-center border border-amber-400/20`}>
        <FileText className={`${size === "lg" ? "w-8 h-8" : "w-5 h-5"} text-amber-400`} />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl h-[82vh] bg-surface border border-border rounded-3xl overflow-hidden shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-border bg-card flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-jade/10 border border-jade/20 flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-jade" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-syne">Media Library</h2>
              <p className="text-xs text-text-muted">{items.length} file{items.length !== 1 ? "s" : ""} stored locally</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div className="flex border border-border rounded-lg overflow-hidden">
              <button onClick={() => setViewMode("grid")} className={`p-2 ${viewMode === "grid" ? "bg-jade/10 text-jade" : "text-text-muted hover:bg-surface"}`}>
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode("list")} className={`p-2 ${viewMode === "list" ? "bg-jade/10 text-jade" : "text-text-muted hover:bg-surface"}`}>
                <List className="w-4 h-4" />
              </button>
            </div>
            {/* Upload */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPT[activeTab]}
              className="hidden"
              onChange={(e) => e.target.files && uploadFiles(e.target.files)}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-primary flex items-center gap-2 text-sm px-4 py-2"
            >
              <UploadCloud className="w-4 h-4" />
              Upload
            </button>
            <button onClick={onClose} className="p-2 text-text-muted hover:bg-surface rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs + Search */}
        <div className="flex items-center justify-between px-7 py-3 border-b border-border bg-card/50 flex-shrink-0 gap-4">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === tab
                    ? "bg-jade/10 border border-jade/30 text-jade"
                    : "text-text-muted hover:bg-surface border border-transparent"
                }`}
              >
                {tab !== "ALL" && CAT_ICONS[tab as MediaCategory]}
                {tabLabel[tab]}
                <span className="opacity-60">({items.filter(m => tab === "ALL" || m.category === tab).length})</span>
              </button>
            ))}
          </div>
          <div className="relative w-52">
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search files..."
              className="input-field text-xs pl-9 w-full py-2"
            />
          </div>
        </div>

        {/* Drop zone + content */}
        <div
          className="flex-1 overflow-y-auto p-6 relative"
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          {/* Drag overlay */}
          {isDragging && (
            <div className="absolute inset-0 z-10 bg-jade/10 border-2 border-dashed border-jade rounded-2xl flex items-center justify-center">
              <div className="text-center">
                <UploadCloud className="w-12 h-12 text-jade mx-auto mb-2" />
                <p className="text-jade font-bold">Drop files here to upload</p>
              </div>
            </div>
          )}

          {uploading && (
            <div className="flex items-center gap-2 mb-4 text-jade text-sm">
              <div className="w-4 h-4 border-2 border-jade border-t-transparent rounded-full animate-spin" />
              Uploading…
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-16">
              <FolderOpen className="w-14 h-14 text-text-muted opacity-20" />
              <div>
                <p className="font-semibold text-text-muted">No media files yet</p>
                <p className="text-xs text-text-muted mt-1">Upload images, videos, or documents to reuse across templates</p>
              </div>
              <button onClick={() => fileInputRef.current?.click()} className="btn-primary flex items-center gap-2 mt-2">
                <UploadCloud className="w-4 h-4" /> Upload your first file
              </button>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className={`relative group rounded-xl overflow-hidden border cursor-pointer transition-all ${
                    selected === item.id
                      ? "border-jade shadow-[0_0_12px_rgba(16,185,129,0.3)] ring-2 ring-jade/30"
                      : "border-border hover:border-jade/30"
                  }`}
                >
                  {renderThumbnail(item)}
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                    {selectionMode && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSelect(item); }}
                        className="px-3 py-1.5 bg-jade text-background text-xs font-bold rounded-lg w-full"
                      >
                        Use this
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm(item.id); }}
                      className="px-3 py-1.5 bg-danger/80 text-white text-xs font-bold rounded-lg w-full flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                  {/* Selected checkmark */}
                  {selected === item.id && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-jade rounded-full flex items-center justify-center shadow-lg">
                      <CheckCircle2 className="w-4 h-4 text-background" />
                    </div>
                  )}
                  {/* Category badge */}
                  <div className="p-2 bg-card border-t border-border">
                    <p className="text-[10px] text-text-muted truncate font-medium">{item.name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${CAT_COLORS[item.category]}`}>
                        {item.category}
                      </span>
                      <span className="text-[9px] text-text-muted">{formatFileSize(item.sizeBytes)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className={`flex items-center gap-4 p-3 rounded-xl border cursor-pointer transition-all ${
                    selected === item.id
                      ? "border-jade bg-jade/5"
                      : "border-border hover:border-jade/30 hover:bg-card/50"
                  }`}
                >
                  {renderThumbnail(item, "sm")}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">{item.name}</p>
                    <p className="text-xs text-text-muted">{formatFileSize(item.sizeBytes)} · {new Date(item.uploadedAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${CAT_COLORS[item.category]}`}>
                    {item.category}
                  </span>
                  {selected === item.id && onSelect && selectionMode && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onSelect(item); onClose(); }}
                      className="px-3 py-1.5 bg-jade text-background text-xs font-bold rounded-lg"
                    >
                      Use
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm(item.id); }}
                    className="p-1.5 text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {selectionMode && (
          <div className="flex items-center justify-between px-7 py-4 border-t border-border bg-card flex-shrink-0">
            <p className="text-xs text-text-muted">
              {selected ? "1 file selected" : "Click a file to select it"}
            </p>
            <div className="flex gap-3">
              <button onClick={onClose} className="btn-secondary px-5">Cancel</button>
              <button
                onClick={handleConfirmSelect}
                disabled={!selected}
                className="btn-primary px-5 disabled:opacity-40"
              >
                Use Selected
              </button>
            </div>
          </div>
        )}

        {/* Delete Confirm Dialog */}
        {deleteConfirm && (
          <div className="absolute inset-0 z-20 bg-background/70 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-surface border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4">
              <div className="w-12 h-12 bg-danger/10 rounded-full flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6 text-danger" />
              </div>
              <div>
                <p className="font-bold text-sm">Delete this file?</p>
                <p className="text-xs text-text-muted mt-1">This cannot be undone. Templates using this file will lose their media.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 px-4 py-2 bg-danger text-white rounded-xl text-sm font-semibold hover:bg-danger/90">Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
