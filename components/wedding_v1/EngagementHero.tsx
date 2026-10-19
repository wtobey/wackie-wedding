"use client";

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import savedDesktopLayout from '@/data/engagement-desktop-layout.json';
import { desktopAdditionalPhotos, type EngagementPhoto } from '@/data/engagement-photos';
import { cropStyle } from '@/lib/wedding-admin/crop';
import FloatingInvitation from './FloatingInvitation';
import siteStyles from '@/app/wedding_v1/wedding.module.css';
import styles from './engagement-hero.module.css';

const photoRatio = (photo: EngagementPhoto) => photo.orientation === 'portrait' ? 2 / 3 : 3 / 2;

function EngagementHeroContent({ photos, layout = 'asymmetric', reveal = 'unveil', editable = false }: { editable?: boolean; photos: EngagementPhoto[]; layout?: 'paired' | 'asymmetric'; reveal?: 'dissolve' | 'recede' | 'unveil' }) {
  const [desktopLayout, setDesktopLayout] = useState(savedDesktopLayout);
  const [baseline, setBaseline] = useState(savedDesktopLayout);
  const [editing, setEditing] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const dragging = useRef<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const dirty = desktopLayout.some((value, index) => value !== baseline[index]);
  function swap(from: number, to: number) {
    setDesktopLayout(current => {
      const next = [...current];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
    setPicked(null);
    setOver(null);
    setStatus(from === to ? '' : 'Photos swapped. Save layout to keep your changes.');
  }
  async function saveLayout() {
    setSaving(true);
    try {
      const response = await fetch('/api/wedding/preview-layout', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(desktopLayout),
      });
      if (!response.ok) throw new Error('Save failed');
      setBaseline([...desktopLayout]);
      setEditing(false);
      setPicked(null);
      setStatus('Layout saved to the homepage.');
    } catch { setStatus('Could not save. Your changes are still here; try again.'); }
    finally { setSaving(false); }
  }
  const stage = useRef<HTMLDivElement>(null);
  const lightbox = useRef<HTMLDialogElement>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<EngagementPhoto | null>(null);
  const chosen = useRef(false);
  const loaded = useRef(new Set<number>());
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [replay, setReplay] = useState(0);
  const [bandRevealed, setBandRevealed] = useState(false);
  const [view, setView] = useState<'invitation' | 'photos'>('invitation');
  const desktopPhotos = [...photos, ...desktopAdditionalPhotos];
  const portraits = photos.filter(photo => photo.orientation === 'portrait');
  const landscapes = photos.filter(photo => photo.orientation === 'landscape');
  const hasCollection = photos.length >= 5 && photos.length <= 10 && landscapes.length >= 1 && landscapes.length <= 3;
  const wideCollage = portraits.length === 6 && landscapes.length === 2;
  // Two larger portraits anchor the mosaic. Mix the remaining orientations
  // into justified rows: ratio-weighted columns give equal heights without
  // stretching photographs or leaving holes between them.
  const remainingPortraits = portraits.slice(2);
  const remaining: EngagementPhoto[] = [];
  for (let index = 0; index < Math.max(remainingPortraits.length, landscapes.length); index++) {
    if (remainingPortraits[index]) remaining.push(remainingPortraits[index]);
    if (landscapes[index]) remaining.push(landscapes[index]);
  }
  const rows = [portraits.slice(0, 2)];
  const rowCount = Math.ceil(remaining.length / 3);
  for (let row = 0, offset = 0; row < rowCount; row++) {
    const count = Math.ceil((remaining.length - offset) / (rowCount - row));
    rows.push(remaining.slice(offset, offset + count));
    offset += count;
  }
  const available = hasCollection && ready && !failed;
  const showPhotos = available && view === 'photos';

  useEffect(() => {
    const frame = stage.current;
    const card = frame?.querySelector<HTMLElement>('#engagement-invitation > div');
    if (!frame || !card || !wideCollage) return;
    const measure = () => {
      // Layout dimensions stay stable while the invitation is transformed.
      if (card.offsetHeight > 0) {
        frame.style.setProperty('--invitation-expand', String(frame.clientHeight / card.offsetHeight));
        frame.style.setProperty('--invitation-reveal-inset', `${Math.max(0, (frame.clientWidth - frame.clientHeight) / 2)}px`);
      }
    };
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    observer.observe(card);
    measure();
    return () => observer.disconnect();
  }, [wideCollage]);

  useEffect(() => {
    if (!selectedPhoto) return;
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = previousOverflow;
    };
  }, [selectedPhoto]);

  useEffect(() => {
    if (!available) return;
    const shell = stage.current?.closest('[data-unlocking]');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let timer: ReturnType<typeof setTimeout> | undefined;
    function schedule() {
      clearTimeout(timer);
      if (chosen.current || shell?.getAttribute('data-unlocking') === 'true') return;
      // Start the invitation's reading time after the password flip finishes
      // and every photo decodes. Never reveal a partially loaded collage.
      timer = setTimeout(() => {
        if (chosen.current) return;
        chosen.current = true;
        setView('photos');
        setBandRevealed(true);
      }, motion.matches ? 0 : replay > 0 ? 2800 : 2200);
    }
    const observer = new MutationObserver(schedule);
    if (shell) observer.observe(shell, { attributes: true, attributeFilter: ['data-unlocking'] });
    motion.addEventListener('change', schedule);
    schedule();
    return () => { clearTimeout(timer); observer.disconnect(); motion.removeEventListener('change', schedule); };
  }, [available, replay]);

  async function photoLoaded(image: HTMLImageElement, index: number) {
    try {
      await image.decode();
      if (!image.isConnected) return;
      loaded.current.add(index);
      if (loaded.current.size === photos.length + (wideCollage ? desktopLayout.length : 0)) setReady(true);
    } catch { setFailed(true); }
  }

  function select(next: 'invitation' | 'photos') {
    chosen.current = true;
    setView(next);
    if (next === 'photos') setBandRevealed(true);
  }

  function renderPhoto(photo: EngagementPhoto, widthFraction = .5, desktop = false) {
    return <button type="button" className={styles.photo} data-orientation={photo.orientation} key={photo.src}
      aria-label={`Enlarge photo: ${photo.alt}`} aria-haspopup="dialog" onClick={() => {
        setSelectedPhoto(photo);
        lightbox.current?.showModal();
      }}>
      <Image src={photo.src} alt={photo.alt} fill loading="eager"
        sizes={desktop ? `${Math.ceil(widthFraction * 100)}vw` : `(max-width: 552px) ${Math.ceil(widthFraction * 100)}vw, ${Math.ceil(widthFraction * 520)}px`}
        unoptimized={photo.src.startsWith('/api/') || photo.src.includes('/storage/v1/object/sign/')}
        style={cropStyle(photo.crop)}
        onLoad={event => { void photoLoaded(event.currentTarget, photos.indexOf(photo) + (desktop ? photos.length : 0)); }} onError={() => setFailed(true)} />
    </button>;
  }

  function renderRow(row: EngagementPhoto[], key: string | number, widthFraction = 1) {
    const totalRatio = row.reduce((sum, photo) => sum + photoRatio(photo), 0);
    return <div className={styles.photoRow} key={key}
      style={{ gridTemplateColumns: row.map(photo => `${photoRatio(photo)}fr`).join(' ') }}>
      {row.map(photo => renderPhoto(photo, widthFraction * photoRatio(photo) / totalRatio))}
    </div>;
  }

  const asymmetric = layout === 'asymmetric' && portraits.length === 6 && landscapes.length === 2;

  function desktopSlot(index: number, orientation: 'portrait' | 'landscape', width: number) {
    const photo = desktopPhotos.find(item => item.src === desktopLayout[index]);
    const label = photo?.alt ?? `Empty photo space ${desktopLayout[index].replace('placeholder-', '')}`;
    return <button type="button" key={index} data-slot={index} data-photo={desktopLayout[index]}
      className={`${styles.photo} ${!photo ? styles.placeholder : ''}`}
      data-orientation={orientation} data-editing={editing} data-selected={picked === index} data-over={over === index}
      disabled={saving || (!editing && !photo)} draggable={editing && !saving}
      aria-label={editing ? `Frame ${index + 1}: ${label}. Select to swap` : `Enlarge photo: ${label}`}
      aria-pressed={editing ? picked === index : undefined} aria-haspopup={!editing && photo ? 'dialog' : undefined}
      onDragStart={event => {
        dragging.current = index;
        setPicked(index);
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', String(index));
      }}
      onDragOver={event => {
        if (!editing || saving || dragging.current === null) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setOver(index);
      }}
      onDragLeave={() => setOver(current => current === index ? null : current)}
      onDrop={event => {
        event.preventDefault();
        if (editing && !saving && dragging.current !== null) swap(dragging.current, index);
        dragging.current = null;
      }}
      onDragEnd={() => { dragging.current = null; setPicked(null); setOver(null); }}
      onKeyDown={event => { if (event.key === 'Escape') setPicked(null); }}
      onClick={() => {
        if (editing) {
          if (picked === null) { setPicked(index); setStatus('Choose another frame to swap with this one.'); }
          else swap(picked, index);
        } else if (photo) { setSelectedPhoto(photo); lightbox.current?.showModal(); }
      }}>
      {photo ? <Image src={photo.src} alt={photo.alt} fill loading="eager" draggable={false}
        sizes={`${Math.ceil(width * 100)}vw`} style={cropStyle(photo.crop)}
        onLoad={event => { void photoLoaded(event.currentTarget, desktopPhotos.indexOf(photo) + photos.length); }}
        onError={() => setFailed(true)} /> :
        <span>Photo {desktopLayout[index].replace('placeholder-', '')}<small>{orientation === 'portrait' ? 'Portrait · 2:3' : 'Horizontal · 3:2'}</small></span>}
      {editing && <span className={styles.frameLabel}>{index + 1} · {picked === index ? 'Selected' : 'Drag to swap'}</span>}
    </button>;
  }

  return <section className={`${siteStyles.hero} ${styles.hero}`} data-wide={wideCollage} data-reveal={reveal} aria-labelledby="welcome-title">
    {editable && wideCollage && <div className={styles.editor}>
      {!editing ? <>
        <button type="button" disabled={!available} onClick={() => { setEditing(true); select('photos'); setStatus(''); }}>Edit layout</button>
        <button type="button" disabled={!available} onClick={() => { chosen.current = false; setView('invitation'); setBandRevealed(false); setReplay(value => value + 1); }}>Replay reveal</button>
      </> : <>
        <span>Drag a photo onto another frame to swap. You can also click two frames.</span>
        <button type="button" disabled={saving || !dirty} onClick={() => void saveLayout()}>{saving ? 'Saving…' : 'Save layout'}</button>
        <button type="button" disabled={saving} onClick={() => { setDesktopLayout([...baseline]); setEditing(false); setPicked(null); setStatus(''); }}>Cancel</button>
      </>}
      <span role="status" aria-live="polite">{status}</span>
    </div>}
    <div ref={stage} className={styles.frame} data-collection={hasCollection} data-home-invitation data-view={showPhotos ? 'photos' : 'invitation'}>
      <div id="engagement-invitation" className={styles.invitation} aria-hidden={showPhotos} inert={showPhotos}
        onFocusCapture={() => { chosen.current = true; }} onPointerDown={() => { chosen.current = true; }}>
        <FloatingInvitation embedded />
      </div>
      {hasCollection && <div id="engagement-collage" className={styles.collage} aria-label="Engagement photos" aria-hidden={!showPhotos} inert={!showPhotos}>
        <div className={styles.mobileMosaic}>
        {asymmetric ? <>
          <div className={styles.featureGroup}>
            {renderPhoto(portraits[0], .49)}
            <div className={styles.featureSide}>
              {renderPhoto(landscapes[0], .52)}
              {renderRow([portraits[1], portraits[2]], 'supporting', .52)}
            </div>
          </div>
          {renderRow([portraits[3], landscapes[1], portraits[4], portraits[5]], 'strip')}
        </> : rows.map((row, rowIndex) => renderRow(row, rowIndex))}
        </div>
        {wideCollage && <div className={styles.desktopMosaic}>
          <div className={styles.desktopOpening}>
            {desktopSlot(0, 'landscape', .40)}
            <div className={styles.desktopTrio}>
              {desktopSlot(5, 'portrait', .14)}
              {desktopSlot(3, 'portrait', .14)}
              {desktopSlot(10, 'portrait', .14)}
            </div>
          </div>
          <div className={styles.desktopMiddle}>
            <div className={styles.desktopFeaturePair}>
              {desktopSlot(6, 'portrait', .20)}
              {desktopSlot(4, 'portrait', .20)}
            </div>
            <div className={styles.desktopSupporting}>
              {desktopSlot(7, 'landscape', .21)}
              {desktopSlot(2, 'portrait', .10)}
              {desktopSlot(9, 'portrait', .10)}
            </div>
          </div>
          <div className={styles.desktopClosing}>
            {desktopSlot(8, 'landscape', .22)}
            {desktopSlot(1, 'portrait', .22)}
          </div>
        </div>}
      </div>}
    </div>
    <div className={styles.details} data-revealed={bandRevealed || failed || !hasCollection}>
      <h1 id="welcome-title" className={styles.eventLine}>June 5, 2027 | Sonoma County, California</h1>
      {hasCollection && <div className={styles.controls} data-ready={available} role="group" aria-label="Choose welcome image">
        <button type="button" disabled={!available} aria-pressed={showPhotos} aria-controls="engagement-collage" onClick={() => select('photos')}>Photos</button>
        <button type="button" disabled={!available || editing} aria-pressed={!showPhotos} aria-controls="engagement-invitation" onClick={() => select('invitation')}>Save the Date</button>
      </div>}
    </div>
    <dialog ref={lightbox} className={styles.lightbox} aria-label="Enlarged engagement photo"
      onClose={event => { if (!event.currentTarget.open) setSelectedPhoto(null); }}
      onClick={event => { if (event.target === event.currentTarget) lightbox.current?.close(); }}>
      <div className={styles.lightboxToolbar}>
        <button type="button" className={styles.lightboxClose} onClick={() => lightbox.current?.close()} aria-label="Close enlarged photo">Close ×</button>
      </div>
      <div className={styles.lightboxImage}>
        {selectedPhoto && <Image src={selectedPhoto.src} alt={selectedPhoto.alt} fill unoptimized sizes="100vw" style={{ objectFit: 'contain' }} />}
      </div>
    </dialog>
  </section>;
}

// A saved layout change must also reset the editor draft and image-load state.
// Otherwise Fast Refresh can retain references to photos removed by a revert.
export default function EngagementHero(props: Parameters<typeof EngagementHeroContent>[0]) {
  return <EngagementHeroContent key={savedDesktopLayout.join('|')} {...props} />;
}
