import type { Metadata } from "next";
import { WeekendEvents } from "@/components/wedding/WeddingContent";
import Doodle from "@/components/wedding/Doodle";
import { wedding, weddingTravel } from "@/data/wedding";
import styles from "../wedding.module.css";

export const metadata: Metadata = { title: "Itinerary" };
export default function OurWedding() {
  return <div className={`${styles.pageWrap} ${styles.itineraryPage}`}>
    <div className={styles.pageIntro}>
      <h1>Spend the Weekend with Us</h1>
    </div>
    <section className={styles.weekendSchedule} aria-label="Wedding weekend · June 4–6, 2027">
      <WeekendEvents/>
    </section>
    <section className={styles.venueAddress}><Doodle kind="trees" className={styles.addressDoodle}/><div><p className={styles.eyebrow}>Our home for the weekend · June 4–6, 2027</p><h2>{wedding.venue}</h2><address>{wedding.address}<br/>{wedding.town}</address><a className={styles.textLink} href={wedding.mapsUrl} target="_blank" rel="noreferrer">Open in maps</a></div><p>{weddingTravel.stay}</p></section>
  </div>;
}
