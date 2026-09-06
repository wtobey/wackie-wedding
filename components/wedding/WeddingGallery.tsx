"use client";

import { useEffect, useState } from "react";
import { supabase, STORAGE_BUCKET } from "@/lib/supabase";
import { loadGalleryRows, type TimelinePhoto } from "@/lib/wedding-timeline";
import PhotoTimeline from "./PhotoTimeline";
import styles from "@/app/wedding/wedding.module.css";

type GalleryState = { photos: TimelinePhoto[]; loading: boolean; error: boolean };
// Explicitly illustrative development-only cards, never presented as the couple's photos.
const previewPhotos: TimelinePhoto[] = ["2019-04-12", "2020-08-22", "2021-02-14", "2021-11-08", "2022-06-04", "2023-09-17", "2024-03-09", "2025-07-26", "2026-08-30"].map((date, index) => ({ id: index + 1, imageUrl: "", photoDate: date, caption: `Sample memory ${index + 1}`, isPreview: true }));

export default function WeddingGallery() {
  const [state, setState] = useState<GalleryState>({ photos: [], loading: true, error: false });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const controller = new AbortController();
    async function load() {
      try {
        const rows = await loadGalleryRows(async (from, to) => {
          const { data, error } = await client!.from("polaroids")
            .select("id,image_path,caption,photo_date")
            .order("id", { ascending: true }).range(from, to).abortSignal(controller.signal);
          if (error) throw error;
          return data || [];
        }, controller.signal);
        if (controller.signal.aborted) return;
        const photos = rows.map(row => ({ id: row.id, caption: row.caption, photoDate: row.photo_date, imageUrl: client!.storage.from(STORAGE_BUCKET).getPublicUrl(row.image_path).data.publicUrl }));
        setState({ photos, loading: false, error: false });
      } catch {
        if (!controller.signal.aborted) setState({ photos: [], loading: false, error: true });
      }
    }
    void load();
    return () => controller.abort();
  }, [attempt]);

  function retry() { setState({ photos: [], loading: true, error: false }); setAttempt(value => value + 1); }

  if (state.photos.length) return <PhotoTimeline photos={state.photos}/>;
  if (process.env.NODE_ENV === "development" && !supabase) return <PhotoTimeline photos={previewPhotos}/>;
  return <>
    <div className={styles.galleryStatus} aria-live="polite">
      <h2>{!supabase ? "Our timeline is on its way." : state.loading ? "Gathering the years…" : state.error ? "The album needs a moment." : "More memories soon."}</h2>
      <p>{!supabase ? "Our photos will be here soon, from the first memories to the latest." : state.loading ? "Putting our photos in order, from the first to the latest." : state.error ? "We couldn’t load the full photo collection. Please give it another try." : "We’re adding our favorite photos. Come back for a peek."}</p>
      {state.error && <button className={styles.button} onClick={retry}>Try again ↗</button>}
    </div>
  </>;
}
