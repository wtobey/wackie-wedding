import type { PolaroidImage } from "@/hooks/usePolaroidImages";

export type TimelinePhoto = PolaroidImage & { isPreview?: boolean; sortOrder?: number; alt?: string };
export type GalleryRow = { id: number; image_path: string; caption: string | null; photo_date: string | null };
export const GALLERY_PAGE_SIZE = 200;

// Photo dates are calendar dates, not instants in the visitor's time zone.
export function photoTimestamp(value: string | null): number | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value ? timestamp : null;
}

export function photoDateLabel(value: string | null): string {
  const timestamp = photoTimestamp(value);
  return timestamp === null ? "Date to come" : new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" }).format(timestamp);
}

export function groupTimelinePhotos(photos: TimelinePhoto[]) {
  const unique = [...new Map(photos.map(photo => [photo.id, photo])).values()];
  const dated = unique.filter(photo => photoTimestamp(photo.photoDate) !== null).sort((a, b) => a.sortOrder !== undefined && b.sortOrder !== undefined ? a.sortOrder - b.sortOrder : photoTimestamp(a.photoDate)! - photoTimestamp(b.photoDate)! || a.id - b.id);
  const undated = unique.filter(photo => photoTimestamp(photo.photoDate) === null).sort((a, b) => (a.sortOrder ?? a.id) - (b.sortOrder ?? b.id));
  return { dated, undated };
}

// Read all metadata before declaring which photo is latest. Images stay lazy-loaded.
export async function loadGalleryRows(fetchPage: (from: number, to: number) => Promise<GalleryRow[]>, signal?: AbortSignal): Promise<GalleryRow[]> {
  const rows: GalleryRow[] = [];
  for (let offset = 0; ; offset += GALLERY_PAGE_SIZE) {
    signal?.throwIfAborted();
    const page = await fetchPage(offset, offset + GALLERY_PAGE_SIZE - 1);
    signal?.throwIfAborted();
    rows.push(...page);
    if (page.length < GALLERY_PAGE_SIZE) return rows;
  }
}

export function nearestPhotoIndex(scrollLeft: number, stride: number, count: number): number {
  if (stride <= 0 || count <= 1) return 0;
  return Math.max(0, Math.min(count - 1, Math.round(scrollLeft / stride)));
}

export function advanceTimelinePosition(position: number, elapsedMs: number, maximum: number): number {
  if (maximum <= 0) return 0;
  if (position >= maximum) return 0;
  // Avoid a large catch-up jump after a busy frame or backgrounded tab.
  return Math.min(maximum, position + Math.max(0, Math.min(elapsedMs, 32)) * 0.028);
}

export function timelineScrollAnchor(position: number): number {
  return Math.floor(Math.max(0, position) / 8) * 8;
}

export function timelineVisualPosition(nativePosition: number, correction: number, maximum: number): number {
  return Math.max(0, Math.min(maximum, nativePosition - correction));
}
