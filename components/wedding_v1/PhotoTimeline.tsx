"use client";

import { trackWeddingEvent } from "@/lib/analytics/client";
import { cropStyle } from '@/lib/wedding-admin/crop';

import Image from "next/image";
import InkDoodle from "./InkDoodle";
import { memo, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { advanceTimelinePosition, groupTimelinePhotos, photoDateLabel, nearestPhotoIndex, timelineScrollAnchor, timelineVisualPosition, type TimelinePhoto } from "@/lib/wedding-timeline";
import styles from "@/app/wedding_v1/wedding.module.css";
import timeline from "./photo-timeline.module.css";

const gapDoodles = ["cheers", "inner-tube", "sunglasses"] as const;

function subscribeMotion(listener: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}
function reducedMotionSnapshot() { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }

const Photo = memo(function Photo({ photo, large = false, grid = false }: { photo: TimelinePhoto; large?: boolean; grid?: boolean }) {
  const frame = useRef<HTMLDivElement>(null);
  const [nearby, setNearby] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const element = frame.current;
    if (!element || large || photo.isPreview) return;
    // Native lazy loading can prefetch several screens. Only give nearby cards
    // an image URL, using the actual scrolling gallery as the observer root.
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setNearby(true);
        observer.disconnect();
      }
    }, { root: element.closest('[data-photo-scroll]'), rootMargin: grid ? '400px' : '0px 880px', threshold: 0 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [large, grid, photo.isPreview]);
  if (photo.isPreview) return <div className={timeline.samplePhoto} data-tone={photo.id % 3}><strong>W + J</strong><span>sample photo {photo.id}</span></div>;
  if (failed) return <div className={styles.photoFallback}>Photo unavailable</div>;
  // Private uploads stay on the access-checked media route. Public Supabase
  // originals can use Next's resized, cached thumbnails.
  const storageUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const imageUrl = !large && photo.imageUrl.startsWith('/api/wedding/media/')
    ? `${photo.imageUrl}?size=thumb` : photo.imageUrl;
  const publicThumbnail = photo.imageUrl.startsWith('/') && !photo.imageUrl.startsWith('/api/') || Boolean(storageUrl && photo.imageUrl.startsWith(`${storageUrl}/storage/v1/object/public/`));
  return <div ref={frame} className={timeline.deferredPhoto} data-loaded={loaded}>
    {(large || nearby) && <Image style={large ? undefined : cropStyle(photo.crop)} src={imageUrl} alt={photo.alt || photo.caption || "A memory from Will and Jackie’s photo collection"} fill unoptimized={large || !publicThumbnail} sizes={large ? "90vw" : grid ? "(max-width: 760px) 45vw, (max-width: 1200px) 30vw, 350px" : "(max-width: 600px) 62vw, 440px"} loading="eager" onLoad={() => setLoaded(true)} onError={() => setFailed(true)}/>}
  </div>;
});

function PhotoDialog({ photos, initialIndex, onClose }: { photos: TimelinePhoto[]; initialIndex: number; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(initialIndex);
  const photo = photos[index];
  function move(direction: number) { setIndex(current => (current + direction + photos.length) % photos.length); }
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { element?.close(); document.body.style.overflow = previousOverflow; };
  }, []);
  return <dialog ref={dialog} className={styles.lightbox} aria-label="Wedding photo viewer" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }} onKeyDown={event => {
    if (event.key === "ArrowRight") { event.preventDefault(); move(1); }
    if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); }
  }}>
    <div className={styles.lightboxTop}><span aria-live="polite">{index + 1} / {photos.length}</span><button autoFocus onClick={onClose} aria-label="Close photo viewer">Close ×</button></div>
    <div className={styles.lightboxImage}><Photo key={photo.id} photo={photo} large/></div>
    <div className={styles.lightboxBottom}><button onClick={() => move(-1)} aria-label="Previous photo" disabled={photos.length < 2}>←</button><p>{photo.caption?.trim() || photoDateLabel(photo.photoDate)}</p><button onClick={() => move(1)} aria-label="Next photo" disabled={photos.length < 2}>→</button></div>
  </dialog>;
}

export default function PhotoTimeline({ photos }: { photos: TimelinePhoto[] }) {
  const [view, setView] = useState<"timeline" | "grid">("timeline");
  const { dated: sequence } = useMemo(() => groupTimelinePhotos(photos), [photos]);
  if (!sequence.length) return null;
  const toggleLabel = view === "timeline" ? "Switch to gallery grid" : "Switch to timeline";
  const viewToggle = <button type="button" className={timeline.viewToggle} aria-label={toggleLabel} title={toggleLabel} aria-controls="wedding-photo-view" onClick={() => { const next = view === "timeline" ? "grid" : "timeline"; trackWeddingEvent("gallery_view_changed", next); setView(next); }}>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {view === "timeline" ? <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></> : <><rect x="2" y="5" width="6" height="10" rx="1"/><rect x="11" y="5" width="6" height="10" rx="1"/><path d="M21 5h1v10h-1M3 20h18"/><circle cx="9" cy="20" r="2" fill="currentColor" stroke="none"/></>}
      </svg>
    </button>;
  return <div className={timeline.viewer}>
    <div className={timeline.viewControls}>{viewToggle}</div>
    <div id="wedding-photo-view" className={timeline.viewContent}>
      {view === "timeline" ? <TimelineAlbum sequence={sequence}/> : <PhotoGrid photos={sequence}/>}
    </div>
  </div>;
}

function PhotoGrid({ photos }: { photos: TimelinePhoto[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  return <>
    <div className={timeline.gridScroll} data-photo-scroll role="region" aria-label="Photo gallery" tabIndex={0}>
      <div className={styles.galleryGrid}>{photos.map((photo, index) => <button type="button" key={photo.id} className={`${styles.polaroid} ${styles.galleryPhoto}`} onClick={() => { trackWeddingEvent("photo_opened", "grid"); setSelected(index); }} aria-label={`Open photo ${index + 1}${photo.caption ? `: ${photo.caption}` : ""}`}>
        <div className={styles.photoFrame}><Photo photo={photo} grid/></div>
        <span className={styles.galleryCaption}>{photo.caption?.trim() || photoDateLabel(photo.photoDate)}</span>
      </button>)}</div>
    </div>
    {selected !== null && <PhotoDialog photos={photos} initialIndex={selected} onClose={() => setSelected(null)}/>}
  </>;
}

function TimelineAlbum({ sequence }: { sequence: TimelinePhoto[] }) {
  const rail = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLOListElement>(null);
  const scrubber = useRef<HTMLInputElement>(null);
  const cards = useRef<Array<HTMLLIElement | null>>([]);
  const geometry = useRef({ stride: 0, maximum: 0 });
  const position = useRef(0);
  const nativePosition = useRef(0);
  const scrollCorrection = useRef(0);
  const activeIndex = useRef(0);
  const visible = useRef(false);
  const resumeAt = useRef(0);
  const pointerHeld = useRef(false);
  const touchHeld = useRef(false);
  const [active, setActive] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const reducedMotion = useSyncExternalStore(subscribeMotion, reducedMotionSnapshot, () => true);
  // The opening story is the first timeline stop, followed by the photos.
  const stopCount = sequence.length + 1;
  const playing = !reducedMotion && selected === null && stopCount > 1;

  const updateActive = useCallback((offset: number) => {
    const next = nearestPhotoIndex(offset, geometry.current.stride, stopCount);
    if (next === activeIndex.current) return;
    activeIndex.current = next;
    setActive(next);
  }, [stopCount]);

  const updateScrubber = useCallback((offset: number) => {
    if (!scrubber.current) return;
    const progress = geometry.current.maximum > 0 ? offset / geometry.current.maximum * 100 : 0;
    scrubber.current.value = String(progress);
    scrubber.current.style.setProperty("--progress", `${progress}%`);
  }, []);

  const renderPosition = useCallback((offset: number) => {
    const element = rail.current;
    const strip = track.current;
    if (!element || !strip) return;
    position.current = offset;
    const anchor = timelineScrollAnchor(offset);
    if (anchor !== nativePosition.current) {
      element.scrollLeft = anchor;
      nativePosition.current = element.scrollLeft;
    }
    // Batch native scrolling in small chunks; composite the remainder so slow
    // movement stays subpixel-smooth without a native scroll event every frame.
    scrollCorrection.current = nativePosition.current - offset;
    strip.style.transform = `translate3d(${scrollCorrection.current}px, 0, 0)`;
    updateScrubber(offset);
    updateActive(offset);
  }, [updateActive, updateScrubber]);

  function allowInteraction() {
    resumeAt.current = performance.now() + 1800;
    // Never write scrollLeft during native input: even writing its current value
    // can cancel touch/trackpad momentum. Keep the visual correction stationary.
  }

  useEffect(() => {
    function releasePointer() {
      if (!pointerHeld.current) return;
      pointerHeld.current = false;
      allowInteraction();
    }
    window.addEventListener("pointerup", releasePointer);
    window.addEventListener("pointercancel", releasePointer);
    function releaseAll() { touchHeld.current = false; releasePointer(); }
    window.addEventListener("blur", releaseAll);
    return () => {
      window.removeEventListener("pointerup", releasePointer);
      window.removeEventListener("pointercancel", releasePointer);
      window.removeEventListener("blur", releaseAll);
    };
  }, []);

  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => { visible.current = entry.isIntersecting; }, { threshold: 0.2 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let previous = 0;
    function advance(now: number) {
      const elapsed = previous ? now - previous : 0;
      previous = now;
      if (visible.current && !document.hidden && !pointerHeld.current && !touchHeld.current && now >= resumeAt.current) {
        renderPosition(advanceTimelinePosition(position.current, elapsed, geometry.current.maximum));
      }
      frame = requestAnimationFrame(advance);
    }
    frame = requestAnimationFrame(advance);
    return () => cancelAnimationFrame(frame);
  }, [playing, renderPosition]);

  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      const first = cards.current[0];
      const second = cards.current[1];
      if (!first || !second) return;
      const progress = geometry.current.stride ? position.current / geometry.current.stride : 0;
      // Measure only on resize, not inside the animation or scroll callbacks.
      if (track.current) track.current.style.transform = "none";
      const stride = second.getBoundingClientRect().left - first.getBoundingClientRect().left;
      const maximum = element.scrollWidth - element.clientWidth;
      geometry.current = { stride, maximum };
      nativePosition.current = element.scrollLeft;
      renderPosition(Math.min(maximum, progress * stride));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [renderPosition]);

  function syncPosition() {
    const element = rail.current;
    if (!element || element.scrollLeft === nativePosition.current) return;
    // Auto-scroll already updated the active item; only handle native input here.
    nativePosition.current = element.scrollLeft;
    position.current = timelineVisualPosition(nativePosition.current, scrollCorrection.current, geometry.current.maximum);
    allowInteraction();
    updateScrubber(position.current);
    updateActive(position.current);
  }
  function seek(index: number) {
    const next = Math.max(0, Math.min(stopCount - 1, index));
    allowInteraction();
    renderPosition(Math.min(geometry.current.maximum, next * geometry.current.stride));
  }
  function openPhoto(index: number) { trackWeddingEvent("photo_opened", "timeline"); setSelected(index); }

  return <div className={timeline.album} onPointerDown={() => { allowInteraction(); pointerHeld.current = true; }} onWheel={allowInteraction} onFocusCapture={allowInteraction}
    onTouchStartCapture={() => { touchHeld.current = true; allowInteraction(); }}
    onTouchEndCapture={event => { touchHeld.current = event.touches.length > 0; allowInteraction(); }}
    onTouchCancelCapture={() => { touchHeld.current = false; allowInteraction(); }}>
    <div ref={rail} className={timeline.rail} data-photo-scroll data-active={active} tabIndex={0} role="region" aria-label="Photo timeline" onScroll={syncPosition} onKeyDown={event => {
      if (event.key === "ArrowRight") { event.preventDefault(); seek(active + 1); }
      if (event.key === "ArrowLeft") { event.preventDefault(); seek(active - 1); }
      if (event.key === "Home") { event.preventDefault(); seek(0); }
      if (event.key === "End") { event.preventDefault(); seek(stopCount - 1); }
    }}>
      <ol ref={track} className={timeline.track}>
        <li ref={element => { cards.current[0] = element; }} className={`${timeline.card} ${timeline.storyCard}`} data-current={active === 0}>
          <p className={timeline.storyCopy}><span className={timeline.storyOpening}>Once upon a time,</span>{" "}at a Christmas formal in a gay bar in Baltimore...</p>
        </li>
        {sequence.map((photo, index) => <li key={photo.id} ref={element => { cards.current[index + 1] = element; }} className={timeline.card} data-current={index + 1 === active}>
        <button className={`${styles.polaroid} ${timeline.photoButton}`} onClick={() => openPhoto(index)} aria-label={`Open photo ${index + 1}${photo.caption ? `: ${photo.caption}` : ""}`}>
          <div className={styles.photoFrame}><Photo photo={photo}/></div><span className={timeline.caption}>{photo.caption?.trim() || photoDateLabel(photo.photoDate)}</span>
        </button>
        {index % 3 === 0 && index < sequence.length - 1 && <span className={timeline.gapDoodle} aria-hidden="true"><InkDoodle kind={gapDoodles[Math.floor(index / 3) % gapDoodles.length]} size={48}/></span>}
      </li>)}</ol>
    </div>
    <section className={timeline.seeker} aria-label="Timeline seeker">
      <div className={timeline.scrubber}>
        <input ref={scrubber} id="photo-timeline-seeker" type="range" aria-label="Photo timeline position" min={0} max={100} step="any" defaultValue={0} aria-valuetext={active === 0 ? "The beginning of our story" : `Photo ${active} of ${sequence.length}`} onChange={event => {
          const progress = Number(event.target.value) / 100;
          allowInteraction();
          renderPosition(progress * geometry.current.maximum);
        }}/>
      </div>
    </section>
    {selected !== null && <PhotoDialog photos={sequence} initialIndex={selected} onClose={() => setSelected(null)}/>}
  </div>;
}
