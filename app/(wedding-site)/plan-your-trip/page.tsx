import type { Metadata } from "next";
import TripCarousel, {
  type TripCard,
} from "@/components/wedding_v1/TripCarousel";
import styles from "@/app/wedding_v1/wedding.module.css";
import tripStyles from "./plan-your-trip.module.css";

export const metadata: Metadata = { title: "Plan your trip" };

const favorites: TripCard[] = [
  {
    name: "Explore the Armstrong Redwood Grove",
    copy: (
      <>
        <p>
          The Armstrong grove is a beautiful grove of coastal redwoods with a few
          notable giants that have been growing since about when the Roman Empire
          fell (~500AD). Groves like this are one of our favorite features of Northern
          California. If you&apos;ve never seen these trees, don&apos;t miss it!
          It&apos;s only 10 minutes from the venue.
        </p>
      </>
    ),
  },
  {
    name: "Sonoma Wineries",
    copy: (
      <>
        <p>
          Sonoma is full of beautiful wineries with great tasting rooms and
          sunny patios to spend an afternoon. If you&apos;re nice to them
          they might even over serve you!
        </p>
        <p>
          <a
            href="https://www.flowerswinery.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Flowers Vineyards &amp; Winery
          </a>{" "}
          is our absolute favorite! You can enjoy a tasting on their gorgeous
          patio overlooking the grounds with a crisp glass of Chardonnay in
          hand. It&apos;s about 20-30 min. from Guerneville and is the perfect
          excursion if you&apos;re also hoping to pop into Healdsburg to do some
          shopping.
        </p>
      </>
    ),
  },
  {
    name: "Soak up the sun",
    copy: (
      <>
        <p>
          At the hotel, you can lounge poolside under the redwoods and order
          drinks and bites from The Boathouse, you can take a kayak or inner
          tubes out on the river to float, or you can head out further for a
          wine tasting or hike in the surrounding hills. We&apos;ll also have
          some fun Saturday morning activities planned so we can start the big
          day off right with our favorite people!
        </p>
      </>
    ),
  },
  {
    name: "The Town",
    copy: (
      <>
        <p>
          Guerneville is a small and quirky town with a ton of good coffee shops,
          ice cream shops, general stores, and all the other things quirky small
          towns specialize in. A few things we&apos;ve enjoyed:
        </p>
        <ul>
          <li>Baked on the River has the best biscuits we&apos;ve found</li>
          <li>Piknik Town Market for sandwiches</li>
          <li>Guerneville Bank Club for ice cream</li>
        </ul>
      </>
    ),
  },
];

export default function PlanYourTrip() {
  return (
    <>
      <div className={styles.pageWrap}>
        <div className={`${styles.pageIntro} ${tripStyles.pageHeader}`}>
          <h1>Plan your trip</h1>
        </div>
      </div>
      <section
        className={styles.guernevilleFavorites}
        aria-labelledby="guerneville-favorites"
      >
        <div className={`${styles.pageWrap} ${styles.stayCopy} ${tripStyles.favoritesIntro}`}>
          <h2 id="guerneville-favorites">
            Our favorite things to do in Guerneville
          </h2>
          <p>
            Guerneville is an adorable small town on the Russian River. It&apos;s
            got a little bit of everything that Northern California has to offer.
          </p>
        </div>
        <TripCarousel
          items={favorites}
          label="Our favorite things to do in Guerneville"
          itemLabel="activity"
          headingLevel={3}
        />
      </section>
      <section
        className={tripStyles.linenSection}
        aria-labelledby="explore-northern-california"
      >
        <div className={styles.pageWrap}>
          <div className={`${styles.pageIntro} ${styles.tripExplore}`}>
            <h2 id="explore-northern-california">
              Explore more of Northern California
            </h2>
            <p className={styles.introText}>
              We love this part of the state because there are so many amazing
              destinations within just a few hours of driving. If you want to
              come out to California early, or stay after the wedding, there is
              no shortage of incredible stops to hit. From
              vineyards and coastal towns to city neighborhoods and mountain
              trails, here are a few ways to extend your trip.
            </p>
          </div>
        </div>
        <TripCarousel />
      </section>
    </>
  );
}
