import { useCallback, useEffect, useState } from 'react';
import { supabase, STORAGE_BUCKET } from '@/lib/supabase';

export interface PolaroidImage {
  id: number;
  imageUrl: string;
  caption: string | null;
  photoDate: string | null;
}

// Module-level state to persist across component re-renders
let allImages: PolaroidImage[] = [];
let usedIds = new Set<number>();
let imagesLoaded = false;
let loadPromise: Promise<void> | null = null;

async function loadAllImages(): Promise<void> {
  if (!supabase) return;
  if (imagesLoaded) return;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const { data, error } = await supabase
      .from('polaroids')
      .select('*');

    if (error || !data) return;

    allImages = data.map(row => {
      const { data: urlData } = supabase!.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(row.image_path);

      return {
        id: row.id,
        imageUrl: urlData.publicUrl,
        caption: row.caption,
        photoDate: row.photo_date,
      };
    });

    imagesLoaded = true;

    // Preload all images into browser cache
    for (const image of allImages) {
      const img = new Image();
      img.src = image.imageUrl;
    }
  })();

  return loadPromise;
}

function pickRandomImage(): PolaroidImage | null {
  if (allImages.length === 0) return null;

  const unused = allImages.filter(img => !usedIds.has(img.id));

  if (unused.length === 0) {
    usedIds.clear();
    const image = allImages[Math.floor(Math.random() * allImages.length)];
    usedIds.add(image.id);
    return image;
  }

  const image = unused[Math.floor(Math.random() * unused.length)];
  usedIds.add(image.id);
  return image;
}

export function usePolaroidImages() {
  const [isReady, setIsReady] = useState(imagesLoaded);
  const [hasImages, setHasImages] = useState(allImages.length > 0);

  useEffect(() => {
    if (!supabase) {
      setIsReady(true);
      return;
    }

    loadAllImages().then(() => {
      setIsReady(true);
      setHasImages(allImages.length > 0);
    });
  }, []);

  const getRandomImage = useCallback((): PolaroidImage | null => {
    if (!supabase || !isReady) return null;
    return pickRandomImage();
  }, [isReady]);

  return {
    isReady,
    hasImages,
    getRandomImage,
  };
}
