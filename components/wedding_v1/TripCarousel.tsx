"use client";

import { useRef, useState, type ReactNode } from "react";
import styles from "./trip-carousel.module.css";

const trips = [
  {
    name: "Napa & Sonoma",
    theme: "Vineyards & long lunches",
    copy: "Slow down with vineyard views, wine tours, and long lunches. Spend a day exploring Sonoma’s Russian River or Dry Creek Valley, then head to Napa for another taste of wine country. Book a guided tour or driver so everyone can enjoy the tastings.",
  },
  {
    name: "San Francisco",
    theme: "A few days in the city",
    copy: <>
      <p>Spend a few days in the city we’ve called home for the past six years. Wander through different neighborhoods, find a favorite bakery, explore Golden Gate Park, and leave plenty of time for dinner. An easy addition before or after the wedding if you’re flying through SFO.</p>
      <p>Will and Jackie would be more than happy to furnish a long list of recommendations.</p>
    </>,
  },
  {
    name: "Mendocino",
    theme: "Take the coast north",
    copy: <>
      <p>Head north for ocean views, little coastal towns, and a slower pace. Make the drive part of the adventure, with stops along the Sonoma Coast before settling into Mendocino for headland walks and quiet mornings.</p>
      <p>While Highway 1 south of San Francisco gets all the attention, the drive to Mendocino has its own rugged magic that can make you forget you&apos;re anywhere close to a city.</p>
    </>,
  },
  {
    name: "Carmel & Big Sur",
    theme: "A little farther south",
    copy: "Head south to Carmel-by-the-Sea for beach walks and village wandering, then explore Big Sur’s dramatic coastline. Give yourself time to stop, take in the views, and linger over lunch overlooking the Pacific.",
  },
  {
    name: "Lake Tahoe",
    theme: "Trade vineyards for mountain air",
    copy: "Spend a few days by the lake, mixing scenic walks and outdoor adventures with afternoons that require very little planning. Make this a longer extension of your trip so there’s time to settle in and enjoy the mountains.",
  },
  {
    name: "Yosemite",
    theme: "Make a bigger adventure of it",
    copy: "Spend a few days among Yosemite’s granite cliffs, waterfalls, and forest trails. Choose a base nearby and give yourself time to explore without rushing. Check road conditions and park reservation requirements closer to your trip.",
  },
];

export type TripCard = { name: string; theme?: string; copy: ReactNode };

export default function TripCarousel({
  items = trips,
  label = "Places to extend your trip",
  itemLabel = "destination",
  headingLevel = 2,
}: {
  items?: TripCard[];
  label?: string;
  itemLabel?: string;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  const activities = headingLevel === 3;
  const rail = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  function go(index: number) {
    const container = rail.current;
    const card = container?.children[index] as HTMLElement | undefined;
    if (!container || !card) return;
    container.scrollTo({
      left: activities
        ? card.offsetLeft - (container.firstElementChild as HTMLElement).offsetLeft
        : card.offsetLeft - (container.clientWidth - card.offsetWidth) / 2,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }
  return (
    <section
      className={`${styles.carousel} ${activities ? styles.activities : ""}`}
      aria-label={label}
      aria-roledescription="carousel"
    >
      <div
        className={styles.rail}
        ref={rail}
        onScroll={() => {
          const container = rail.current;
          if (!container) return;
          const anchor = container.scrollLeft + (activities
            ? (container.firstElementChild as HTMLElement).offsetLeft
            : container.clientWidth / 2);
          const distances = Array.from(container.children).map((e) => {
            const card = e as HTMLElement;
            return Math.abs(card.offsetLeft + (activities ? 0 : card.offsetWidth / 2) - anchor);
          });
          setActive(distances.indexOf(Math.min(...distances)));
        }}
      >
        {items.map((trip, index) => (
          <article
            key={trip.name}
            className={styles.card}
            aria-label={`${index + 1} of ${items.length}: ${trip.name}`}
          >
            {trip.theme && <p className={styles.theme}>{trip.theme}</p>}
            <Heading>{trip.name}</Heading>
            <div className={styles.copy}>
              {typeof trip.copy === "string" ? <p>{trip.copy}</p> : trip.copy}
            </div>
          </article>
        ))}
      </div>
      <div className={styles.controls}>
        <button
          onClick={() => go(active - 1)}
          disabled={active === 0}
          aria-label={`Previous ${itemLabel}`}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="14 6 8 12 14 18" />
          </svg>
        </button>
        <p aria-live="polite">
          {active + 1} / {items.length}
        </p>
        <button
          onClick={() => go(active + 1)}
          disabled={active === items.length - 1}
          aria-label={`Next ${itemLabel}`}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="10 6 16 12 10 18" />
          </svg>
        </button>
      </div>
    </section>
  );
}
