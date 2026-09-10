'use client';
import { useEffect, useMemo, useState } from 'react';
import { createPhotoPicker } from '@/lib/wedding-photo-picker';
import type { ManagedPhoto } from '@/lib/wedding-admin/types';
export function useWeddingPhotos(enabled = true) {
  const [photos, setPhotos] = useState<ManagedPhoto[]>([]);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    fetch('/api/wedding/photos?collection=gallery', { signal: controller.signal, cache: 'no-store' }).then(async response => { if (!response.ok) throw new Error('Unavailable'); return response.json(); }).then(setPhotos).catch(() => {});
    return () => controller.abort();
  }, [enabled]);
  const getRandomImage = useMemo(() => createPhotoPicker(photos), [photos]);
  return { getRandomImage, hasImages: enabled && photos.length > 0 };
}
