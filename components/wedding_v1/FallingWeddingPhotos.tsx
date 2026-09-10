"use client";

import Image, { getImageProps } from "next/image";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { useWeddingPhotos } from "./useWeddingPhotos";
import styles from "@/app/wedding_v1/wedding.module.css";

type DroppedPhoto = { id: number; src: string; caption: string; x: number; y: number; angle: number };
const photoSizes = '(max-width: 600px) 110px, 144px';
function previewSource(src: string) {
  return src.startsWith('/api/wedding/media/') ? `${src}?size=small` : src;
}
function directImage(src: string) {
  return src.startsWith('/api/') || src.includes('/storage/v1/object/sign/');
}

function FallingPhoto({ photo, onReady, onError }: { photo: DroppedPhoto; onReady: (id: number) => void; onError: (id: number) => void }) {
  const [ready, setReady] = useState(false);
  const started = useRef(false);
  return <figure className={styles.droppedPhoto} data-ready={ready} style={{ left: photo.x, top: photo.y, "--photo-angle": `${photo.angle}deg` } as CSSProperties}>
    <div><Image src={photo.src} alt="" fill loading="eager" sizes={photoSizes} unoptimized={directImage(photo.src)} onLoad={async event => {
      const image = event.currentTarget;
      try { await image.decode(); } catch { if (image.isConnected) onError(photo.id); return; }
      if (!image.isConnected || started.current) return;
      started.current = true;
      setReady(true);
      onReady(photo.id);
    }} onError={() => onError(photo.id)}/></div><figcaption>{photo.caption}</figcaption>
  </figure>;
}

export default function FallingWeddingPhotos({ children }: { children: ReactNode }) {
  const stage = useRef<HTMLElement>(null);
  const nextId = useRef(0);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const [photos, setPhotos] = useState<DroppedPhoto[]>([]);
  const { getRandomImage, hasImages } = useWeddingPhotos();
  const takePrepared = useRef<(() => ReturnType<typeof getRandomImage>) | null>(null);

  useEffect(() => {
    if (!hasImages) return;
    const queue: { photo: NonNullable<ReturnType<typeof getRandomImage>>; image: HTMLImageElement }[] = [];
    const loading = new Set<HTMLImageElement>();
    let cancelled = false;
    function fillQueue() {
      while (!cancelled && queue.length < 2) {
        const photo = getRandomImage();
        if (!photo) return;
        const src = photo.smallUrl ?? previewSource(photo.imageUrl);
        const { props } = getImageProps({ src, alt: '', fill: true, sizes: photoSizes, unoptimized: directImage(src) });
        const image = new window.Image();
        const entry = { photo, image };
        // Reserve the shuffled order before loading; fast downloads cannot jump
        // ahead of slower photos. FallingPhoto still waits for decoding.
        queue.push(entry);
        loading.add(image);
        image.fetchPriority = 'low';
        if (props.sizes) image.sizes = props.sizes;
        if (props.srcSet) image.srcset = props.srcSet;
        image.src = props.src;
        void image.decode().catch(() => {
          const index = queue.indexOf(entry);
          if (index >= 0) queue.splice(index, 1);
        })
          .finally(() => loading.delete(image));
      }
    }
    takePrepared.current = () => {
      fillQueue();
      const next = queue.shift();
      fillQueue();
      return next?.photo ?? getRandomImage();
    };
    fillQueue();
    return () => {
      cancelled = true;
      takePrepared.current = null;
      loading.forEach(image => { image.src = ''; });
      queue.length = 0;
    };
  }, [getRandomImage, hasImages]);

  const drop = useCallback((clickX?: number, clickY?: number) => {
    const element = stage.current;
    const bounds = element?.getBoundingClientRect();
    if (!element || !bounds) return;
    const width = bounds.width < 600 ? 110 : 144;
    const height = width + 38;
    // Keep the title, date, navigation, and calls to action clear.
    const protectedAreas = Array.from(element.querySelectorAll("[data-photo-exclusion], ." + styles.heroFoot)).map(item => item.getBoundingClientRect());
    const overlaps = (x: number, y: number) => protectedAreas.some(area => x < area.right - bounds.left + 16 && x + width > area.left - bounds.left - 16 && y < area.bottom - bounds.top + 16 && y + height > area.top - bounds.top - 16);
    let x = Math.max(16, Math.min(bounds.width - width - 16, (clickX ?? Math.random() * bounds.width) - width / 2));
    let y = Math.max(16, Math.min(bounds.height - height - 16, (clickY ?? Math.random() * bounds.height) - height / 2));
    for (let attempt = 0; overlaps(x, y) && attempt < 100; attempt++) {
      x = 16 + Math.random() * Math.max(0, bounds.width - width - 32);
      y = 16 + Math.random() * Math.max(0, bounds.height - height - 32);
    }
    if (overlaps(x, y)) return;
    const image = takePrepared.current?.() ?? getRandomImage();
    if (!image) return;
    const id = nextId.current++;
    const src = image.smallUrl ?? previewSource(image.imageUrl);
    const photo = { id, src, caption: image.caption || "Will + Jackie", x, y, angle: Math.random() * 24 - 12 };
    setPhotos(previous => [...previous.slice(-5), photo]);
  }, [getRandomImage]);

  const removePhoto = useCallback((id: number) => {
    setPhotos(previous => previous.filter(item => item.id !== id));
  }, []);

  const startLifetime = useCallback((id: number) => {
    // Loading time must not consume the fall animation or the visible lifetime.
    const timer = setTimeout(() => { setPhotos(previous => previous.filter(item => item.id !== id)); timers.current.delete(timer); }, 14000);
    timers.current.add(timer);
  }, []);

  useEffect(() => {
    const pending = timers.current;
    return () => { pending.forEach(clearTimeout); pending.clear(); };
  }, []);

  useEffect(() => {
    if (!hasImages) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const interval = setInterval(() => {
      const bounds = stage.current?.getBoundingClientRect();
      if (!reducedMotion.matches && bounds && bounds.bottom > 0 && bounds.top < window.innerHeight && !document.hidden) drop();
    }, 5000);
    return () => clearInterval(interval);
  }, [drop, hasImages]);

  function handleClick(event: MouseEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest("a,button")) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    drop(event.clientX - bounds.left, event.clientY - bounds.top);
  }

  return <section ref={stage} className={styles.hero} onClick={handleClick} aria-labelledby="welcome-title">
    {children}
    <div className={styles.droppedPhotos} aria-hidden="true">{photos.map(photo => <FallingPhoto key={photo.id} photo={photo} onReady={startLifetime} onError={removePhoto}/>)}</div>
    <button className={styles.dropPhotoHint} disabled={!hasImages} onClick={() => drop()}>Click or tap to drop a photo.</button>
  </section>;
}
