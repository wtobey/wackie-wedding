import type { Metadata } from "next";
import { Suspense } from "react";
import { readLibrary } from "@/lib/wedding-admin/store";
import VenuePhotoStack from "@/components/wedding_v1/VenuePhotoStack";
import { wedding, weddingTravel } from "@/data/wedding_v1";
import styles from "@/app/wedding_v1/wedding.module.css";

export const metadata: Metadata = { title: "Accommodations" };
export const dynamic = 'force-dynamic';
async function VenuePhotos() {
  const library = await readLibrary().catch(() => null);
  if (!library) return <p>Photos couldn’t load. Please refresh to try again.</p>;
  const photos = library.photos.filter(photo => photo.collection === 'venue' && photo.included)
    .map(photo => ({ src: photo.imageUrl, alt: photo.alt || photo.caption, caption: photo.caption, crop: photo.crop }));
  return <VenuePhotoStack photos={photos}/>;
}
export default function Accommodations() {
  return <>
    <div className={styles.pageWrap}>
    <div className={`${styles.pageIntro} ${styles.accommodationsIntro}`}><h1>A weekend retreat in Guerneville</h1></div>
    </div>
    <div className={styles.accommodationsPanel}>
    <section className={styles.stayGrid}>
      <div className={styles.photoBackdrop}><Suspense fallback={<div className={styles.venuePhotoLoading} role="status" aria-label="Loading venue photos"/>}><VenuePhotos/></Suspense></div>
      <div className={styles.stayCopy}><h2>Dawn Ranch</h2><p>{weddingTravel.stay}</p><h3 className={styles.staySubheading}>Around Guerneville</h3><p>The hotel is located in Guerneville, a small town on the Russian River in Sonoma County. We&apos;ve lived in San Francisco for the past six years, and we love spending weekends in Sonoma, relaxing in sunny vineyards, strolling ancient redwood groves and floating down lazy rivers. We can&apos;t wait to share it with you!</p><h3 className={styles.staySubheading}>At the ranch</h3><p>There are a variety of room options, from cozy cottages to larger 2-bedroom bungalows and even a few glamping tents. There&apos;s an onsite spa, a renowned restaurant, bikes for cruising around town, and direct river access with tubes and kayaks. We&apos;re excited to have the place to ourselves so we can soak up the long summer days with our loved ones.</p><address><a data-wedding-event="directions_clicked" href={wedding.mapsUrl} target="_blank" rel="noreferrer" className={styles.addressLink} aria-label="View Dawn Ranch address on the map"><svg className={styles.directionsIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/></svg><span>{wedding.address}<br/>{wedding.town}</span></a></address><div className={`${styles.note} ${styles.patternNote}`}><h3>A note on booking...</h3><p>All room bookings will be handled directly through our booking portal, which will be available in the new year.</p><p>{weddingTravel.booking}</p></div></div>
    </section>
  </div></>;
}
