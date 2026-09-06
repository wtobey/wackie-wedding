import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { PageIntro, NextPage } from "@/components/wedding/WeddingContent";
import { wedding, weddingTravel } from "@/data/wedding";
import styles from "../wedding.module.css";

export const metadata: Metadata = { title: "Transportation" };
export default function Transportation() {
  return <div className={styles.pageWrap}>
    <PageIntro eyebrow="Transportation" title="All roads lead to Wackie." icon="sun">Your destination: a little town on the Russian River. Here’s how to get to Guerneville and settle in for the weekend.</PageIntro>
    <div className={styles.transportGrid}>
      <section className={styles.featurePanel}>
        <p className={styles.eyebrow}>Flying in · Our local option</p>
        <div className={styles.airportHeading}>
          <h2 className={styles.airportCode}>STS</h2>
          <Image src="/wedding-travel-goose.png" alt="" width={1024} height={1024} sizes="140px" className={styles.travelGoose}/>
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
          <h3>Other flights</h3>
          <p>{weddingTravel.other}</p>
        </section>
        <a className={styles.textLink} href="https://sonomacountyairport.org/" target="_blank" rel="noreferrer">Explore airport & flight information</a>
      </section>
      <div className={styles.transportNotes}>
        <section><p className={styles.eyebrow}>Coming through the Bay Area?</p><h2>SFO or OAK work, too.</h2><p>{weddingTravel.bayArea}</p><Link className={styles.textLink} href="/wedding/plan-your-trip#flying">More flight-planning tips</Link></section>
        <section><p className={styles.eyebrow}>The last leg</p><h2>Drive up. Slow down.</h2><p>A rental car gives you flexibility for the ranch and a longer California adventure. Share a ride if you can, and arrange your way home before a night of celebrating.</p><a className={styles.textLink} href={wedding.mapsUrl} target="_blank" rel="noreferrer">Directions to Dawn Ranch</a></section>
      </div>
    </div>
    <section className={styles.note}><h3>Rideshare & Sunday airport shuttle</h3><p>{weddingTravel.shuttle}</p></section>
    <section className={styles.note}><h3>Parking at Dawn Ranch</h3><p>{weddingTravel.parking}</p></section>
    <NextPage href="/wedding/plan-your-trip" label="Turn the weekend into a getaway"/>
  </div>;
}
