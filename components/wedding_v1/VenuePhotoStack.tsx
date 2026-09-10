"use client";

import { cropStyle, type PhotoCrop } from '@/lib/wedding-admin/crop';
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./venue-photo-stack.module.css";


type VenuePhoto = { src: string; alt: string; caption: string; crop?: PhotoCrop };

function StackPhoto({ src, alt, crop, front, onReady }: VenuePhoto & { front: boolean; onReady: () => void }) {
  const [failed, setFailed] = useState(false);
  return failed ? <span className={styles.fallback}>Dawn Ranch</span> : <Image style={cropStyle(crop)} src={src} alt={alt} fill sizes="(max-width: 760px) 80vw, 400px" loading="eager" fetchPriority={front ? "high" : "low"} unoptimized={src.startsWith("/api/") || (src.startsWith("http") && !src.startsWith("https://dawnranch.com/"))} onLoad={onReady} onError={() => { setFailed(true); onReady(); }}/>;
}

export default function VenuePhotoStack({ photos }: { photos: VenuePhoto[] }) {
  const [ready, setReady] = useState<Record<string, boolean>>({});
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
          <span className={styles.frame}>{(depth === 0 || (depth <= 2 && ready[photos[current].src])) && <StackPhoto {...photo} front={depth === 0} onReady={() => setReady(previous => previous[photo.src] ? previous : { ...previous, [photo.src]: true })}/>}</span>
          <span className={styles.caption}>{photo.caption}</span>
        </span>;
      })}
    </button>
    <p id="venue-photo-hint" className={styles.hint}>Click or tap to flip through</p>
    <p className={styles.srOnly} aria-live="polite">{photos[current].caption} · Photo {current + 1} of {photos.length}</p>
  </div>;
}
