import type { Metadata } from "next";
import Image from "next/image";
import { PageIntro, NextPage } from "@/components/wedding/WeddingContent";
import Doodle from "@/components/wedding/Doodle";
import InkDoodle from "@/components/wedding/InkDoodle";
import { attractions, weddingTravel } from "@/data/wedding";
import styles from "../wedding.module.css";

export const metadata: Metadata = { title: "Plan your trip" };
export default function PlanYourTrip() {
  return <div className={styles.pageWrap}>
    <PageIntro eyebrow="Plan your trip" title="A week well wandered." icon="sun">Coming all this way? Stay a little longer. From redwoods to wine country to the bay, here are a few places we’d send you.</PageIntro>
    <section className={`${styles.tripStrip} ${styles.illustratedTrip}`}>
      <div><span className={styles.eyebrow}>Your week, your pace</span><p>Sausalito & the bay <span>→</span> Napa & Yountville <span>→</span> Flowers & Healdsburg <span>→</span> Guerneville & us</p><small>A possible route, not a schedule. Mix, match, and make it yours around the wedding weekend.</small></div>
      <Image src="/wedding-wine-picnic.png" alt="" width={1536} height={1024} sizes="250px" className={styles.picnicIllustration}/>
    </section>
    <div className={styles.attractions}>{attractions.map((place, index) => <article key={place.name} className={styles.attraction}><div className={styles.attractionTop}><span className={styles.eyebrow}>{String(index + 1).padStart(2, "0")} / {place.tag}</span>{place.icon === "river" ? <InkDoodle kind="inner-tube" className={styles.riverDoodle} size={64}/> : <Doodle kind={place.icon}/>}</div><p className={styles.placeArea}>{place.area}</p><h2>{place.name}</h2><p>{place.description}</p><p className={styles.smallNote}>{place.note}</p><a className={styles.textLink} href={place.url} target="_blank" rel="noreferrer">{place.link}</a></article>)}</div>
    <section id="flying" className={styles.flightSection}>
      <div><p className={styles.eyebrow}>Start with the flight</p><h2>Pick your landing spot.</h2><p>{weddingTravel.airport}</p><p>{weddingTravel.bayArea}</p></div>
      <div className={styles.airportList}>
        <a href="https://sonomacountyairport.org/" target="_blank" rel="noreferrer"><strong>STS</strong><span>Sonoma County<small>Santa Rosa · Our local airport</small></span><span>↗</span></a>
        <a href="https://www.flysfo.com/" target="_blank" rel="noreferrer"><strong>SFO</strong><span>San Francisco<small>A starting point for the bay & Sausalito</small></span><span>↗</span></a>
        <a href="https://www.oaklandairport.com/" target="_blank" rel="noreferrer"><strong>OAK</strong><span>Oakland<small>Another Bay Area option to compare</small></span><span>↗</span></a>
      </div>
    </section>
    <div className={styles.note}><InkDoodle kind="sunglasses" className={styles.packingDoodle} size={86}/><h3>A few things to tuck in your bag</h3><p>Bring layers for the coast and evenings, comfortable shoes for exploring, and a little space in your itinerary. Check current flight routes, opening hours, and reservations before booking. For wine-tasting days, plan a designated driver or arrange a car service.</p></div>
    <NextPage href="/wedding/gallery" label="A few memories before we make more"/>
  </div>;
}
