import type { Metadata } from "next";
import Link from "next/link";
import { Botanical, Shell } from "./design";
import styles from "./wedding-v2.module.css";

export const metadata: Metadata = { title: "The Wedding", robots: { index: false, follow: false } };
export default function WeddingV2() {
  return <Shell>
    <section className={styles.hero}>
      <div className={styles.heroTitle}><span className={styles.heroOrnament} aria-hidden="true">✧</span><h1>The<br/><em>Wedding.</em></h1><a className={styles.down} href="#weekend" aria-label="View the weekend">↓</a></div>
      <div className={styles.art} aria-hidden="true"><div className={styles.arch}/><Botanical className={styles.botanical}/><span className={styles.artStar}>✳</span></div>
    </section>
    <section id="weekend" className={styles.weekend}>
      <div className={styles.sectionTitle}><span className={styles.overline}>01</span><h2>The Weekend</h2><Link className={styles.roundLink} href="/wedding_v2/weekend" aria-label="View the weekend">↗</Link></div>
      <div className={styles.eventGrid}>{["Welcome", "Ceremony", "Reception"].map((label,i) => <Link href="/wedding_v2/weekend" className={styles.event} key={label}><span className={styles.eventSymbol} aria-hidden="true">{["✳", "♡", "✧"][i]}</span><h3>{label}</h3><span className={styles.rule}/></Link>)}</div>
    </section>
    <section className={styles.planning}>
      <div className={styles.planningTitle}><span className={styles.overline}>02</span><h2>Your<br/><em>stay.</em></h2><Botanical className={styles.smallBotanical}/></div>
      <div className={styles.planningLinks}>{[{slug:"stay",label:"Where to Stay"},{slug:"travel",label:"Getting There"},{slug:"gallery",label:"Gallery"},{slug:"faq",label:"Questions & Answers"}].map(p=><Link href={`/wedding_v2/${p.slug}`} key={p.slug}><h3>{p.label}</h3><span aria-hidden="true">↗</span></Link>)}</div>
    </section>
    <section className={styles.rsvp}><span aria-hidden="true">✧</span><h2>RSVP</h2><Link className={styles.roundLink} href="/wedding_v2/rsvp" aria-label="Open RSVP">↗</Link></section>
  </Shell>;
}
