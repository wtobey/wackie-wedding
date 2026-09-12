import type { Metadata } from "next";
import Link from "next/link";
import { WeekendEvents } from "@/components/wedding_v1/WeddingContent";
import Doodle from "@/components/wedding_v1/Doodle";
import { wedding, weddingTravel } from "@/data/wedding_v1";
import styles from "@/app/wedding_v1/wedding.module.css";

export const metadata: Metadata = { title: "Itinerary" };
export default function OurWedding() {
  return <div className={`${styles.pageWrap} ${styles.itineraryPage}`}>
    <div className={styles.pageIntro}>
      <h1>The Main Events</h1>
    </div>
    <section className={styles.weekendSchedule} aria-label="Wedding weekend · June 4–6, 2027">
      <WeekendEvents/>
    </section>
    <section className={styles.venueAddress}><Doodle kind="trees" className={styles.addressDoodle}/><div><p className={styles.eyebrow}>Venue Information and Onsite Accommodations</p><h2>{wedding.venue}</h2><address>Sonoma County, California</address><a className={styles.textLink} data-wedding-event="directions_clicked" href={wedding.mapsUrl} target="_blank" rel="noreferrer">Open in maps</a></div><p>{weddingTravel.stay} Please see the <Link href="/accommodations" style={{ textDecoration: "underline" }}>Accommodations</Link> page for more details.<br/><br/>Keep an eye out for itinerary updates to see what else we have planned for the weekend. We&apos;re thinking outdoor yoga, a group river float, lawn games, and more.</p></section>
  </div>;
}
