"use client";

import { useEffect, useState } from "react";
import type { ManagedPhoto } from "@/lib/wedding-admin/types";
import { type TimelinePhoto } from "@/lib/wedding-timeline";
import PhotoTimeline from "./PhotoTimeline";
import styles from "@/app/wedding_v1/wedding.module.css";

type GalleryState = { photos: TimelinePhoto[]; loading: boolean; error: boolean };
export default function WeddingGallery() {
  const [state, setState] = useState<GalleryState>({ photos: [], loading: true, error: false });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/wedding/photos?collection=gallery', { signal: controller.signal, cache: 'no-store' })
      .then(async response => { if (!response.ok) throw new Error('Could not load photos'); return response.json(); })
      .then((rows: ManagedPhoto[]) => setState({ photos: rows.map((row, index) => ({ id: index + 1, caption: row.caption, alt: row.alt, photoDate: row.photoDate, imageUrl: row.imageUrl, sortOrder: index })), loading: false, error: false }))
      .catch(() => { if (!controller.signal.aborted) setState({ photos: [], loading: false, error: true }); });
    return () => controller.abort();
  }, [attempt]);

  function retry() { setState({ photos: [], loading: true, error: false }); setAttempt(value => value + 1); }

  if (state.photos.length) return <PhotoTimeline photos={state.photos}/>;
  return <>
    <div className={styles.galleryStatus} aria-live="polite">
      <h2>{state.loading ? "Gathering the years…" : state.error ? "The album needs a moment." : "More memories soon."}</h2>
      <p>{state.loading ? "Putting our photos in order, from the first to the latest." : state.error ? "We couldn’t load the full photo collection. Please give it another try." : "We’re adding our favorite photos. Come back for a peek."}</p>
      {state.error && <button className={styles.button} onClick={retry}>Try again ↗</button>}
    </div>
  </>;
}
