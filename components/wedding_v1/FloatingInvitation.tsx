"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import styles from "./floating-invitation.module.css";

export default function FloatingInvitation() {
  const card = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = card.current;
    if (!element) return;
    const motion = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    let frame = 0;
    let x = 0;
    let y = 0;

    function reset() {
      cancelAnimationFrame(frame);
      frame = 0;
      element!.style.removeProperty("--tilt-x");
      element!.style.removeProperty("--tilt-y");
      element!.style.removeProperty("--light-x");
      element!.style.removeProperty("--light-y");
      element!.style.removeProperty("--light-opacity");
    }

    function update() {
      frame = 0;
      element!.style.setProperty("--tilt-x", `${-y * 2.5}deg`);
      element!.style.setProperty("--tilt-y", `${x * 2.5}deg`);
      element!.style.setProperty("--light-x", `${50 + x * 45}%`);
      element!.style.setProperty("--light-y", `${50 + y * 45}%`);
      element!.style.setProperty("--light-opacity", "1");
    }

    function followPointer(event: PointerEvent) {
      if (!motion.matches || event.pointerType !== "mouse") return;
      // Follow the pointer across the whole viewport, not just over the card.
      x = Math.max(-1, Math.min(1, event.clientX / window.innerWidth * 2 - 1));
      y = Math.max(-1, Math.min(1, event.clientY / window.innerHeight * 2 - 1));
      if (!frame) frame = requestAnimationFrame(update);
    }

    function leaveWindow(event: PointerEvent) {
      if (event.relatedTarget === null) reset();
    }

    window.addEventListener("pointermove", followPointer, { passive: true });
    window.addEventListener("pointerout", leaveWindow);
    window.addEventListener("blur", reset);
    motion.addEventListener("change", reset);
    return () => {
      reset();
      window.removeEventListener("pointermove", followPointer);
      window.removeEventListener("pointerout", leaveWindow);
      window.removeEventListener("blur", reset);
      motion.removeEventListener("change", reset);
    };
  }, []);

  return <div className={styles.stage} data-photo-exclusion>
    <h1 id="welcome-title" className={styles.srOnly}>Jackie Tait &amp; Will Tobey are getting married</h1>
    <div ref={card} className={styles.card}>
    <Link className={styles.invitationLink} href="/our-wedding" aria-label="View the wedding itinerary">
      <Image className={styles.artwork} src="/wedding_v1-assets/wedding-save-the-date-ffa93f-e5680a.svg" width={800} height={800} unoptimized alt="Save the date: Jackie Tait and Will Tobey, June 5th, 2027, Sonoma County, California. A river and kayaker framed by two redwood trees." sizes="(max-width: 600px) 84vw, (max-height: 900px) 70vh, 700px" preload draggable={false}/>
    </Link>
    </div>
  </div>;
}
