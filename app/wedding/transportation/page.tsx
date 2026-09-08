import type { Metadata } from "next";
import Image from "next/image";
import { PageIntro, NextPage } from "@/components/wedding/WeddingContent";
import { wedding, weddingTravel } from "@/data/wedding";
import styles from "../wedding.module.css";

export const metadata: Metadata = { title: "Travel Information" };
export default function Transportation() {
  return <div className={`${styles.pageWrap} ${styles.transportationPage}`}>
    <PageIntro title="Getting to Sonoma County" icon="sun">Your destination is a little town on the Russian River called Guerneville, just down the road from renowned wineries and a short drive to the coast.</PageIntro>
    <div className={styles.transportGrid}>
      <section className={styles.featurePanel}>
        <p className={styles.eyebrow}>Recommended Airport</p>
        <div className={styles.airportHeading}>
          <h2 className={styles.airportCode}>STS</h2>
          <Image src="/wedding-travel-goose-plane.png" alt="" width={1024} height={1024} sizes="140px" className={styles.travelGoose}/>
        </div>
        <p>{weddingTravel.airport}</p>
        <section className={styles.flightOrigin}>
          <h3>For our LA friends & family</h3>
          <p>{weddingTravel.la}</p>
        </section>
        <section className={styles.flightOrigin}>
          <h3>For our Phoenix friends & family</h3>
          <p>{weddingTravel.phoenix}</p>
        </section>
        <section className={styles.flightOrigin}>
          <h3>Other routes</h3>
          <p>{weddingTravel.other}</p>
        </section>
      </section>
      <div className={styles.transportNotes}>
        <section><h2>SFO or OAK work, too.</h2><p>{weddingTravel.bayArea}</p></section>
        <section><h2>Rideshare & Sunday airport shuttle</h2><p>{weddingTravel.shuttle}</p></section>
        <section><h2>Parking at Dawn Ranch</h2><p>If you’re planning to rent a car or drive to the venue, there is parking available onsite for guests.</p><a className={styles.textLink} href={wedding.mapsUrl} target="_blank" rel="noreferrer">Directions to Dawn Ranch</a></section>
      </div>
    </div>
    <NextPage href="/wedding/plan-your-trip" label="Turn the weekend into a getaway" showEyebrow={false}/>
  </div>;
}
