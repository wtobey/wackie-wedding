import type { Metadata } from "next";
import TripCarousel from "@/components/wedding_v1/TripCarousel";
import styles from "@/app/wedding_v1/wedding.module.css";
import tripStyles from "./plan-your-trip.module.css";

export const metadata: Metadata = { title: "Plan your trip" };

export default function PlanYourTrip() {
  return <>
  <div className={styles.pageWrap}>
    <div className={`${styles.pageIntro} ${tripStyles.pageHeader}`}>
      <h1>Plan your trip</h1>
    </div>
    <section className={`${styles.stayCopy} ${styles.guernevilleFavorites}`} aria-labelledby="guerneville-favorites">
      <h2 id="guerneville-favorites">Our favorite things to do in Guerneville</h2>
      <p>Placeholder text introducing our favorite places to eat, explore, and relax around Guerneville.</p>
      <div className={tripStyles.favoriteRow}>
        <h3 className={styles.staySubheading}>Absolute must-do: Explore the Armstrong Redwood Grove</h3>
        <p>The Armstrong Redwoods State Natural Reserve is just a 10 minute drive from Dawn Ranch, and it&apos;s open from 8am until 1 hour after sunset.</p>
      </div>
      <div className={tripStyles.favoriteRow}>
        <h3 className={styles.staySubheading}>Soak up the sun</h3>
        <p>At the hotel, you can lounge poolside under the redwoods and order drinks and bites from The Boathouse, you can take a kayak or inner tubes out on the river to float, or you can head out further for a wine tasting or hike in the surrounding hills. We&apos;ll also have some fun Saturday morning activities planned so we can start the big day off right with our favorite people!</p>
      </div>
      <div className={tripStyles.favoriteRow}>
        <h3 className={styles.staySubheading}>Coffee & breakfast</h3>
        <p>For a relaxed breakfast or lunch, we love Baked on the River. Their bacon cheddar scones &amp; gravy is the perfect hearty base before a night of dancing. If you&apos;d like to pop into town for coffee, both Coffee Bazaar Cafe and Piknik Town Market are great spots to grab a drink and a bite and peruse local goods while you wait. If you don&apos;t want to wander too far, the Lodge at Dawn Ranch also has delicious breakfast options and a coffee bar with espresso drinks and pastries.</p>
      </div>
      <div className={tripStyles.favoriteRow}>
        <h3 className={styles.staySubheading}>Sonoma Wineries</h3>
        <p>There are plenty of wineries to choose from in the surrounding towns, and you really can&apos;t go wrong if you&apos;re hoping to do a tasting and learn about the wine making process. Most will require a reservation in advance, so keep that in mind when planning your visit.</p>
        <p><a href="https://www.flowerswinery.com/" target="_blank" rel="noopener noreferrer">Flowers Vineyards &amp; Winery</a> is our absolute favorite! You can enjoy a tasting on their gorgeous patio overlooking the grounds with a crisp glass of Chardonnay in hand. It&apos;s about 20-30 min. from Guerneville and is the perfect excursion if you&apos;re also hoping to pop into Healdsburg to do some shopping.</p>
        <p>For something small and personal, <a href="https://www.porter-bass.com/" target="_blank" rel="noopener noreferrer">Porter-Bass</a> is right in Guerneville. This family-run winery offers relaxed outdoor tastings surrounded by the vineyard, with a chance to learn about the land and the wines grown there.</p>
      </div>
    </section>
  </div>
  <section className={tripStyles.linenSection} aria-labelledby="explore-northern-california">
    <div className={styles.pageWrap}>
    <div className={`${styles.pageIntro} ${styles.tripExplore}`}>
      <h2 id="explore-northern-california">Explore more of Northern California</h2>
      <p className={styles.introText}>We love this part of the state because there are so many amazing destinations within just a few hours of driving. If you have the time, we encourage you to add extra stops to your trip. From vineyards and coastal towns to city neighborhoods and mountain trails, here are a few ways to extend your trip.</p>
    </div>
    </div>
    <TripCarousel/>
  </section>
  </>;
}
