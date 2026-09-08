'use client';
import { useEffect, useCallback, useState } from 'react';
import type { ManagedPhoto } from '@/lib/wedding-admin/types';
export function useWeddingPhotos() {
  const [photos, setPhotos] = useState<ManagedPhoto[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/wedding/photos?collection=gallery', { signal: controller.signal, cache: 'no-store' }).then(async response => { if (!response.ok) throw new Error('Unavailable'); return response.json(); }).then(setPhotos).catch(() => {});
    return () => controller.abort();
  }, []);
  const getRandomImage = useCallback(() => photos.length ? photos[Math.floor(Math.random() * photos.length)] : null, [photos]);
  return { getRandomImage, hasImages: photos.length > 0 };
}
