// ─── Media Store ─────────────────────────────────────────────────────────────
// Persists uploaded IMAGE / VIDEO / DOCUMENT assets to localStorage.
// Each item stores a base64 dataUrl so it works offline and across sessions.

export type MediaCategory = "IMAGE" | "VIDEO" | "DOCUMENT";

export interface MediaItem {
  id: string;
  name: string;
  category: MediaCategory;
  dataUrl: string;  // base64 data URL
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string; // ISO timestamp
}

const KEY = "waptrix_media_library";

function load(): MediaItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function save(items: MediaItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function getAllMedia(): MediaItem[] {
  return load();
}

export function getMediaByCategory(cat: MediaCategory): MediaItem[] {
  return load().filter((m) => m.category === cat);
}

export function addMedia(item: Omit<MediaItem, "id" | "uploadedAt">): MediaItem {
  const newItem: MediaItem = {
    ...item,
    id: `media_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    uploadedAt: new Date().toISOString(),
  };
  const items = load();
  items.unshift(newItem); // newest first
  save(items);
  return newItem;
}

export function deleteMedia(id: string): void {
  const items = load().filter((m) => m.id !== id);
  save(items);
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function categoryFromMime(mimeType: string): MediaCategory {
  if (mimeType.startsWith("image/")) return "IMAGE";
  if (mimeType.startsWith("video/")) return "VIDEO";
  return "DOCUMENT";
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
