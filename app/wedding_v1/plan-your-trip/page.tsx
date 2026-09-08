import type { Metadata } from "next";
import TripCarousel from "@/components/wedding_v1/TripCarousel";
import styles from "../wedding.module.css";

export const metadata: Metadata = { title: "Plan your trip" };

export default function PlanYourTrip() {
  return <>
  <div className={styles.pageWrap}>
    <div className={styles.pageIntro}>
      <h1>Explore more of Northern California</h1>
      <p className={styles.introText}>We love this part of the state because there are so many amazing destinations within just a few hours of driving. If you have the time, we encourage you to add extra stops to your trip. From vineyards and coastal towns to city neighborhoods and mountain trails, here are a few ways to extend your trip.</p>
    </div>
  </div>
  <TripCarousel/>
  </>;
}
