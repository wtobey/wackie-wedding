import type { Metadata } from "next";
import Link from "next/link";
import { WeekendEvents } from "@/components/wedding_v1/WeddingContent";
import Doodle from "@/components/wedding_v1/Doodle";
import { wedding, weddingTravel } from "@/data/wedding_v1";
import styles from "../wedding.module.css";

export const metadata: Metadata = { title: "Itinerary" };
export default function OurWedding() {
  return <div className={`${styles.pageWrap} ${styles.itineraryPage}`}>
    <section className={styles.weekendSchedule} aria-label="Wedding weekend · June 4–6, 2027">
      <WeekendEvents/>
    </section>
    <section className={styles.venueAddress}><Doodle kind="trees" className={styles.addressDoodle}/><div><p className={styles.eyebrow}>Venue Information and Onsite Accommodations</p><h2>{wedding.venue}</h2><address>Sonoma County, California</address><a className={styles.textLink} href={wedding.mapsUrl} target="_blank" rel="noreferrer">Open in maps</a></div><p>{weddingTravel.stay} Please see the <Link href="/wedding_v1/accommodations" style={{ textDecoration: "underline" }}>Accommodations</Link> page for more details.</p></section>
  </div>;
}
