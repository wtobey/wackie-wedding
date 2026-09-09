import type { Metadata } from "next";
import VenuePhotoStack from "@/components/wedding_v1/VenuePhotoStack";
import { wedding, weddingTravel } from "@/data/wedding_v1";
import styles from "../wedding.module.css";

export const metadata: Metadata = { title: "Accommodations" };
export default function Accommodations() {
  return <div className={styles.pageWrap}>
    <div className={`${styles.pageIntro} ${styles.accommodationsIntro}`}><h1>A weekend retreat in Guerneville</h1></div>
    <section className={styles.stayGrid}>
      <div className={styles.photoBackdrop}><VenuePhotoStack/></div>
      <div className={styles.stayCopy}><h2>Dawn Ranch</h2><p>{weddingTravel.stay} All room bookings will be handled directly through our booking portal, which will be available in the new year.</p><p>The hotel is located in Guerneville, a small town on the Russian River in Sonoma County. We&apos;ve lived in San Francisco for the past six years, and we love spending slow weekends in Sonoma, whether in sunny vineyards, next to towering redwoods or floating down lazy rivers. We can&apos;t wait to share it with you!</p><p>There are a variety of room options, from cozy cottages to larger 2-bedroom bungalows and even a few glamping tents. There&apos;s an onsite spa, a renowned restaurant, bikes for cruising around town, and direct river access with tubes and kayaks. We&apos;re excited to have the place to ourselves so we can soak up the long summer days with our loved ones.</p><address><a href={wedding.mapsUrl} target="_blank" rel="noreferrer" className={styles.addressLink} aria-label="View Dawn Ranch address on the map"><svg className={styles.directionsIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m12 2 10 10-10 10L2 12Z"/><path d="M8 16v-5h8m-3-3 3 3-3 3"/></svg><span>{wedding.address}<br/>{wedding.town}</span></a></address><div className={`${styles.note} ${styles.patternNote}`}><h3>A note on booking...</h3><p>{weddingTravel.booking}</p></div></div>
    </section>
  </div>;
}
