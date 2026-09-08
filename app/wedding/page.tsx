import Link from "next/link";
import Image from "next/image";
import FallingWeddingPhotos from "@/components/wedding/FallingWeddingPhotos";
import FloatingInvitation from "@/components/wedding/FloatingInvitation";
import { WeekendEvents } from "@/components/wedding/WeddingContent";
import styles from "./wedding.module.css";

export default function WeddingHome() {
  return <>
    <FallingWeddingPhotos>
      <FloatingInvitation/>
    </FallingWeddingPhotos>

    <section id="weekend" className={`${styles.weekendSection} ${styles.patternedWeekend}`}>
      <div className={styles.weekendPaper}>
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>June 4–6, 2027</p><h2>Make a weekend of it.</h2></div><Link className={styles.textLink} href="/wedding/our-wedding">All the lovely details</Link></div>
        <WeekendEvents compact/>
      </div>
    </section>

    <section className={styles.homePlanning}>
      <div><h2>Come for the wedding.<br/>Stay for the adventure.</h2><p>Cabins in the trees, a glass of something good, and a whole corner of California to explore. We’ve gathered a few things to help you settle in.</p></div>
      <div className={styles.planningLinks}>
        <Link href="/wedding/accommodations"><span>Stay at Dawn Ranch</span><span aria-hidden="true">↗</span></Link>
        <Link href="/wedding/transportation"><span>Planes, cars & getting around</span><span aria-hidden="true">↗</span></Link>
        <Link href="/wedding/plan-your-trip"><span>More to see in NorCal</span><span aria-hidden="true">↗</span></Link>
        <Link href="/wedding/gallery"><span>A few favorite memories</span><span aria-hidden="true">↗</span></Link>
      </div>
    </section>

    <section id="rsvp" className={styles.rsvpSection}>
      <Image src="/wedding-river-float.png" alt="" width={1536} height={1024} sizes="(max-width: 600px) 240px, 320px" className={styles.riverFloat}/>
      <p className={styles.eyebrow}>Save a little room for us</p><h2>We hope you’ll be there.</h2>
      <p>We can’t wait to celebrate with you.<br/>Invitations and RSVPs are on their way.</p><span className={styles.comingSoon}>RSVP · Coming soon</span>
    </section>
  </>;
}
