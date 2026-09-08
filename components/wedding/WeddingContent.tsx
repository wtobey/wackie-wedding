import Link from "next/link";
import type { ReactNode } from "react";
import Doodle from "./Doodle";
import InkDoodle from "./InkDoodle";
import { weekendEvents } from "@/data/wedding";
import styles from "@/app/wedding/wedding.module.css";

export function PageIntro({ eyebrow, title, children, icon = "flower" }: { eyebrow?: string; title: string; children: ReactNode; icon?: string }) {
  return <div className={styles.pageIntro}>
    {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
    <h1>{title}</h1>
    <p className={styles.introText}>{children}</p>
    <Doodle kind={icon} className={styles.introDoodle}/>
  </div>;
}

export function WeekendEvents({ compact = false }: { compact?: boolean }) {
  return <div className={styles.events}>
    {weekendEvents.map((event) => <article key={event.day} className={styles.event}>
      <div className={styles.eventTop}><p className={styles.eyebrow}>{event.day}, {event.date}</p><InkDoodle kind={event.day === "Friday" ? "smores" : event.day === "Saturday" ? "cheers" : "aviators"} className={styles.scheduleDoodle} size={54}/></div>
      <h3>{event.name}</h3>
      {!compact && <p className={styles.eventLocation}>{event.location}</p>}
      {event.schedule.map((line) => <p key={line}>{line}</p>)}
      {event.details && <p className={styles.smallNote}>{event.details}</p>}
    </article>)}
  </div>;
}

export function NextPage({ href, label, showEyebrow = true }: { href: string; label: string; showEyebrow?: boolean }) {
  return <div className={styles.nextPage}>{showEyebrow && <p className={styles.eyebrow}>A little more planning</p>}<Link href={href}>{label}<svg className={styles.nextPageArrow} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 11 11 5M5 5h6v6"/></svg></Link></div>;
}
