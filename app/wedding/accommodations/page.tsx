import type { Metadata } from "next";
import Image from "next/image";
import { NextPage } from "@/components/wedding/WeddingContent";
import VenuePhotoStack from "@/components/wedding/VenuePhotoStack";
import InkDoodle from "@/components/wedding/InkDoodle";
import { wedding, weddingTravel } from "@/data/wedding";
import styles from "../wedding.module.css";

export const metadata: Metadata = { title: "Accommodations" };
export default function Accommodations() {
  return <div className={styles.pageWrap}>
    <h1 className={styles.visuallyHidden}>Accommodations</h1>
    <section className={styles.stayGrid}>
      <div><VenuePhotoStack/><div className={styles.poolsideDoodles} aria-hidden="true"><span className={styles.clotheslineDoodle}/><InkDoodle kind="bathing-shorts" className={styles.shortsDoodle} size={96}/><InkDoodle kind="flip-flops" className={styles.flipFlopsDoodle} size={68}/></div></div>
      <div className={styles.stayCopy}><p className={styles.eyebrow}>Our home for the weekend</p><h2>Dawn Ranch</h2><p>{weddingTravel.stay}</p><address><a href={wedding.mapsUrl} target="_blank" rel="noreferrer" className={styles.addressLink} aria-label="View Dawn Ranch address on the map">{wedding.address}<br/>{wedding.town}</a></address><div className={`${styles.note} ${styles.patternNote}`}><h3>A note on booking</h3><p>{weddingTravel.booking}</p><p>{weddingTravel.alternatives}</p></div><p>{weddingTravel.accessibleRooms}</p></div>
    </section>
    <div className={styles.stayScenes}>
      <Image src="/wedding-sun-loungers.png" alt="" width={1536} height={1024} sizes="(max-width: 440px) 78vw, 330px" className={styles.stayLeisure}/>
      <Image src="/wedding-firepit-smores-color-blobs.png" alt="" width={1536} height={1024} sizes="(max-width: 440px) 78vw, 330px" className={styles.stayLeisure}/>
    </div>
    <NextPage href="/wedding/transportation" label="Let’s get you here" showEyebrow={false}/>
  </div>;
}
