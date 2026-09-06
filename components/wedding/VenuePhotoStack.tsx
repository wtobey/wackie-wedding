"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { wedding } from "@/data/wedding";
import styles from "./venue-photo-stack.module.css";

const photos = [
  { src: "/dawn-ranch-orchard.webp", alt: "A long table set beneath leafy trees in the Orchard at Dawn Ranch", caption: "The Orchard" },
  { src: "/dawn-ranch-river.jpg", alt: "The river reflecting the sky and forested hills near Dawn Ranch", caption: "By the river" },
  { src: wedding.cabinPhoto, alt: "A cabin nestled in the grounds at Dawn Ranch", caption: "Wake up here. You’re on river time." },
  { src: "/dawn-ranch-camping.jpg", alt: "A furnished canvas tent with a bed, Adirondack chairs, and a fire pit", caption: "A little glamping" },
  { src: "/dawn-ranch-pool.jpg", alt: "A swimming pool with loungers surrounded by redwoods and cabins", caption: "Poolside among the redwoods" },
];

function StackPhoto({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? <span className={styles.fallback}>Dawn Ranch</span> : <Image src={src} alt={alt} fill sizes="(max-width: 760px) 80vw, 480px" loading="eager" unoptimized={src.startsWith("http")} onError={() => setFailed(true)}/>;
}

export default function VenuePhotoStack() {
  const [current, setCurrent] = useState(0);
  const [flipping, setFlipping] = useState(false);
  const busy = useRef(false);
  const finishFlip = useCallback(() => {
    if (!busy.current) return;
    busy.current = false;
    setCurrent(index => (index + 1) % photos.length);
    setFlipping(false);
  }, []);
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

  return <div className={styles.album}>
    <button type="button" className={styles.stack} data-flipping={flipping} onClick={flip} aria-label="Flip to the next Dawn Ranch photo" aria-describedby="venue-photo-hint">
      {photos.map((photo, index) => {
        const depth = (index - current + photos.length) % photos.length;
        return <span key={photo.src} className={styles.card} data-depth={depth} aria-hidden={depth !== 0} onAnimationEnd={event => { if (depth === 0 && event.target === event.currentTarget) finishFlip(); }}>
          <span className={styles.frame}><StackPhoto src={photo.src} alt={photo.alt}/></span>
          <span className={styles.caption}>{photo.caption}</span>
        </span>;
      })}
    </button>
    <p id="venue-photo-hint" className={styles.hint}>Click or tap to flip through</p>
    <p className={styles.srOnly} aria-live="polite">{photos[current].caption} · Photo {current + 1} of {photos.length}</p>
  </div>;
}
