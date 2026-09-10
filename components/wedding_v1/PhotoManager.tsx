'use client';
import { adminRequest as api } from '@/lib/wedding-admin/client';
import { cropStyle, defaultCrop } from '@/lib/wedding-admin/crop';
import Image from 'next/image';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { ManagedPhoto, PhotoCollection, PhotoLibrary } from '@/lib/wedding-admin/types';
import styles from './photo-manager.module.css';

export default function PhotoManager() {
  const [library, setLibrary] = useState<PhotoLibrary | null>(null);
  const [collection, setCollection] = useState<PhotoCollection>('gallery');
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [sessionAttempt, setSessionAttempt] = useState(0);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const load = useCallback(async (signal?: AbortSignal) => {
    setError(''); setLoadingLibrary(true);
    try {
      const data = await api('/api/wedding/admin/photos', { signal });
      if (!signal?.aborted) { setLibrary(data); setDirty(false); }
    } catch (error) {
      if (!signal?.aborted) setError((error as Error).message);
    } finally { if (!signal?.aborted) setLoadingLibrary(false); }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    api('/api/wedding/admin/session', { signal: controller.signal }, 10000)
      .then(session => {
        if (controller.signal.aborted) return;
        setAuthorized(Boolean(session.admin));
        // Access is resolved even if the separate photo request is slow.
        setChecking(false);
        if (session.admin) void load(controller.signal);
      })
      .catch((error: Error) => {
        if (!controller.signal.aborted) { setError(error.message); setChecking(false); }
      });
    return () => controller.abort();
  }, [load, sessionAttempt]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty || busy) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, busy]);
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const password = new FormData(event.currentTarget).get('password');
    try { await api('/api/wedding/admin/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) }); setAuthorized(true); window.dispatchEvent(new Event('wedding-admin-change')); await load(); }
    catch (error) { setError((error as Error).message); } finally { setBusy(false); }
  }
  function edit(id: string, update: Partial<ManagedPhoto>) {
    setLibrary(current => current && ({ ...current, photos: current.photos.map(photo => photo.id === id ? { ...photo, ...update } : photo) })); setDirty(true); setMessage('');
  }
  function move(id: string, direction: number) {
    if (!library) return;
    const photos = [...library.photos]; const from = photos.findIndex(photo => photo.id === id);
    let to = from + direction; while (to >= 0 && to < photos.length && photos[to].collection !== collection) to += direction;
    if (to < 0 || to >= photos.length) return;
    [photos[from], photos[to]] = [photos[to], photos[from]];
    setLibrary({ ...library, photos }); setDirty(true); setMessage('');
  }
  async function save() {
    setBusy(true); setError('');
    try { const data = await api('/api/wedding/admin/photos', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(library) }); setLibrary(data); setDirty(false); setMessage('Saved. Your changes are now visible on the website.'); }
    catch (error) { setError((error as Error).message); } finally { setBusy(false); }
  }
  async function upload(files: FileList | null, replaceId?: string) {
    if (!files?.length) return;
    setBusy(true); setError(''); let completed = 0;
    try {
      for (const file of Array.from(files)) {
        if (file.size > 4 * 1024 * 1024) throw new Error("Choose an image up to 4 MB.");
        const form = new FormData(); form.set('file', file); form.set('collection', collection); if (replaceId) form.set('replaceId', replaceId);
        const data = await api('/api/wedding/admin/photos', { method: 'POST', body: form }, 60000); setLibrary(data); completed++;
      }
      setMessage(replaceId ? 'Photo replaced.' : `${completed} photo(s) uploaded. Mark them included and save when ready.`);
    } catch (error) { setError(`${completed ? `${completed} uploaded. ` : ''}${(error as Error).message}`); } finally { setBusy(false); }
  }
  if (checking) return <div className={styles.manager}>Checking admin access…</div>;
  if (!authorized) return <div className={styles.manager}><h1>Admin sign in</h1><p>Use your separate admin password to manage the photo collection.</p><form onSubmit={login}><label>Admin password<input name="password" type="password" autoComplete="current-password" required/></label><button disabled={busy}>Sign in</button></form>{error && <><p role="alert">{error}</p><button type="button" disabled={busy} onClick={() => { setChecking(true); setError(''); setSessionAttempt(value => value + 1); }}>Retry access check</button></>}</div>;
  const photos = library?.photos.filter(photo => photo.collection === collection) || [];
  return <div className={styles.manager}>
    <header className={styles.heading}><div><p>ADMIN ONLY</p><h1>Photo manager</h1><p>Edit your memories, then save to update the website.</p></div><button disabled={busy || dirty} onClick={async () => { try { await api('/api/wedding/admin/session', { method: 'DELETE' }); setAuthorized(false); setLibrary(null); window.dispatchEvent(new Event('wedding-admin-change')); } catch { setError('Could not sign out. Please retry.'); } }}>Sign out</button></header>
    <div className={styles.toolbar}>
      <div className={styles.tabs}><button aria-pressed={collection === 'gallery'} onClick={() => setCollection('gallery')}>Gallery photos</button><button aria-pressed={collection === 'venue'} onClick={() => setCollection('venue')}>Dawn Ranch photos</button></div>
      <button disabled={!dirty || busy} onClick={save}>{busy ? 'Working…' : 'Save changes'}</button>
      <button disabled={busy || loadingLibrary} onClick={() => { if (!dirty || window.confirm('Discard unsaved changes and reload?')) void load(); }}>{loadingLibrary ? 'Loading photos…' : 'Reload'}</button>
      <span>{dirty ? 'Unsaved changes' : `${photos.length} photos · ${photos.filter(photo => photo.included).length} included`}</span>
    </div>
    <p>Use the arrows to arrange photos. Dates label the gallery timeline; undated photos appear at the end. Excluded photos stay in this manager.</p>
    <label className={styles.upload}>Upload photos<input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy || dirty || !library} onChange={event => { void upload(event.target.files); event.target.value = ''; }}/><span>JPG, PNG or WebP · up to 4 MB each{dirty ? ' · Save your edits before uploading or replacing photos.' : ''}</span></label>
    {error && <p className={styles.error} role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    {!library ? <p role="status">{loadingLibrary ? 'Loading your photo library…' : 'The library has not loaded. Use Reload to try again.'}</p> : !photos.length ? <p>No photos in this collection yet. Upload your first memory above.</p> : <div className={styles.photos}>{photos.map((photo, index) => <article className={styles.photo} key={photo.id}>
      <div>
        <div className={styles.preview} data-collection={photo.collection}><Image style={cropStyle(photo.crop)} src={photo.imageUrl} alt={photo.alt || photo.caption || 'Photo preview'} fill unoptimized sizes="240px"/></div>
        <details className={styles.cropControls}><summary>Adjust crop</summary>
          <p>Frame the photo on cards. The full-size original is preserved.</p>
          {([['zoom', 'Zoom', 1, 3, 0.05], ['x', 'Horizontal position', 0, 100, 1], ['y', 'Vertical position', 0, 100, 1]] as const).map(([key, label, min, max, step]) => <label key={key}>{label}<input aria-label={`${label} for photo ${index + 1}`} type="range" min={min} max={max} step={step} value={(photo.crop ?? defaultCrop)[key]} disabled={busy} onChange={event => edit(photo.id, { crop: { ...(photo.crop ?? defaultCrop), [key]: Number(event.target.value) } })}/></label>)}
          <button type="button" disabled={busy} onClick={() => edit(photo.id, { crop: { ...defaultCrop } })}>Reset crop</button>
        </details>
      </div>
      <div className={styles.fields}><label>Caption<input value={photo.caption} maxLength={500} disabled={busy} onChange={event => edit(photo.id, { caption: event.target.value })}/></label><label>Description for accessibility<input value={photo.alt} maxLength={500} disabled={busy} onChange={event => edit(photo.id, { alt: event.target.value })}/></label><label>Photo date<input type="date" value={photo.photoDate || ''} disabled={busy} onChange={event => edit(photo.id, { photoDate: event.target.value || null })}/></label><label className={styles.checkbox}><input type="checkbox" checked={photo.included} disabled={busy} onChange={event => edit(photo.id, { included: event.target.checked })}/>Include on website</label></div>
      <div className={styles.actions}><span>Position {index + 1}</span><button disabled={busy || index === 0} onClick={() => move(photo.id, -1)} aria-label={`Move photo ${index + 1} up`}>↑ Move up</button><button disabled={busy || index === photos.length - 1} onClick={() => move(photo.id, 1)} aria-label={`Move photo ${index + 1} down`}>↓ Move down</button><label>Replace photo<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy || dirty} onChange={event => { void upload(event.target.files, photo.id); event.target.value = ''; }}/></label></div>
    </article>)}</div>}
  </div>;
}
