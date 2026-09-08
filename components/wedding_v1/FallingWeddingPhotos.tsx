"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { useWeddingPhotos } from "./useWeddingPhotos";
import styles from "@/app/wedding_v1/wedding.module.css";

type DroppedPhoto = { id: number; src: string; caption: string; x: number; y: number; angle: number };

export default function FallingWeddingPhotos({ children }: { children: ReactNode }) {
  const stage = useRef<HTMLElement>(null);
  const nextId = useRef(0);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const [photos, setPhotos] = useState<DroppedPhoto[]>([]);
  const { getRandomImage, hasImages } = useWeddingPhotos();

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
    const image = getRandomImage();
    if (!image) return;
    const id = nextId.current++;
    const photo = { id, src: image.imageUrl, caption: image.caption || "Will + Jackie", x, y, angle: Math.random() * 24 - 12 };
    setPhotos(previous => [...previous.slice(-5), photo]);
    const timer = setTimeout(() => { setPhotos(previous => previous.filter(item => item.id !== id)); timers.current.delete(timer); }, 14000);
    timers.current.add(timer);
  }, [getRandomImage]);

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
    <div className={styles.droppedPhotos} aria-hidden="true">{photos.map(photo => <figure key={photo.id} className={styles.droppedPhoto} style={{ left: photo.x, top: photo.y, "--photo-angle": `${photo.angle}deg` } as CSSProperties}>
      <div><Image src={photo.src} alt="" fill sizes="144px" unoptimized onError={() => setPhotos(previous => previous.filter(item => item.id !== photo.id))}/></div><figcaption>{photo.caption}</figcaption>
    </figure>)}</div>
    {hasImages && <button className={styles.dropPhotoHint} onClick={() => drop()}>Click or tap to drop a photo.</button>}
  </section>;
}
