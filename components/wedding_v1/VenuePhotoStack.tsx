"use client";

import { cropStyle, type PhotoCrop } from '@/lib/wedding-admin/crop';
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./venue-photo-stack.module.css";


function StackPhoto({ src, alt, crop }: { src: string; alt: string; crop?: PhotoCrop }) {
  const [failed, setFailed] = useState(false);
  return failed ? <span className={styles.fallback}>Dawn Ranch</span> : <Image style={cropStyle(crop)} src={src} alt={alt} fill sizes="(max-width: 760px) 80vw, 480px" loading="eager" unoptimized={src.startsWith("http") || src.startsWith("/api/")} onError={() => setFailed(true)}/>;
}

export default function VenuePhotoStack() {
  const [photos, setPhotos] = useState<{ src: string; alt: string; caption: string; crop?: PhotoCrop }[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/wedding/photos?collection=venue', { signal: controller.signal, cache: 'no-store' })
      .then(async response => { if (!response.ok) throw new Error('Unavailable'); return response.json(); })
      .then((rows: { imageUrl: string; alt: string; caption: string; crop?: PhotoCrop }[]) => setPhotos(rows.map(photo => ({ src: photo.imageUrl, alt: photo.alt || photo.caption, caption: photo.caption, crop: photo.crop }))))
      .catch(() => {});
    return () => controller.abort();
  }, []);
  const [current, setCurrent] = useState(0);
  const [flipping, setFlipping] = useState(false);
  const busy = useRef(false);
  const finishFlip = useCallback(() => {
    if (!busy.current) return;
    busy.current = false;
    setCurrent(index => (index + 1) % photos.length);
    setFlipping(false);
  }, [photos.length]);
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => { if (motion.matches) finishFlip(); };
    motion.addEventListener("change", handleChange);
    return () => motion.removeEventListener("change", handleChange);
  }, [finishFlip]);

  function flip() {
    if (busy.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCurrent(index => (index + 1) % photos.length);
      return;
    }
    busy.current = true;
    setFlipping(true);
  }

  if (!photos.length) return null;
  return <div className={styles.album}>
    <button type="button" className={styles.stack} data-flipping={flipping} onClick={flip} aria-label="Flip to the next Dawn Ranch photo" aria-describedby="venue-photo-hint">
      {photos.map((photo, index) => {
        const depth = (index - current + photos.length) % photos.length;
        return <span key={photo.src} className={styles.card} data-depth={depth} aria-hidden={depth !== 0} onAnimationEnd={event => { if (depth === 0 && event.target === event.currentTarget) finishFlip(); }}>
          <span className={styles.frame}><StackPhoto src={photo.src} alt={photo.alt} crop={photo.crop}/></span>
          <span className={styles.caption}>{photo.caption}</span>
        </span>;
      })}
    </button>
    <p id="venue-photo-hint" className={styles.hint}>Click or tap to flip through</p>
    <p className={styles.srOnly} aria-live="polite">{photos[current].caption} · Photo {current + 1} of {photos.length}</p>
  </div>;
}
