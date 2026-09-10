import { photoTimestamp } from '../wedding-timeline';

export function exifCalendarDate(value: unknown): string | null {
  // Keep the camera's local calendar date, without a UTC conversion.
  if (typeof value !== 'string') return null;
  const match = /^(\d{4}):(\d{2}):(\d{2}) \d{2}:\d{2}:\d{2}$/.exec(value.trim());
  if (!match) return null;
  const date = `${match[1]}-${match[2]}-${match[3]}`;
  return photoTimestamp(date) === null ? null : date;
}

export async function readPhotoDate(file: Blob | Uint8Array): Promise<string | null> {
  try {
    const { parse } = await import('exifr');
    const metadata = await parse(file, {
      pick: ['DateTimeOriginal', 'CreateDate'],
      reviveValues: false,
      gps: false,
    });
    return exifCalendarDate(metadata?.DateTimeOriginal) ?? exifCalendarDate(metadata?.CreateDate);
  } catch {
    // Missing or unreadable metadata should never prevent an upload.
    return null;
  }
}
