"use client";

import { useState } from "react";
import Image from "next/image";
import Doodle from "./Doodle";
import styles from "@/app/wedding/wedding.module.css";

export default function VenuePhoto({ src, alt, caption, className = "", priority = false }: { src: string; alt: string; caption: string; className?: string; priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  return <figure className={`${styles.polaroid} ${className}`}>
    <div className={styles.photoFrame}>
      {failed ? <div className={styles.photoFallback}><Doodle kind="trees"/><span>Dawn Ranch</span></div> : <Image src={src} alt={alt} fill sizes="(max-width: 700px) 80vw, 440px" unoptimized loading={priority ? "eager" : "lazy"} onError={() => setFailed(true)}/>}
    </div>
    <figcaption>{caption}</figcaption>
  </figure>;
}
