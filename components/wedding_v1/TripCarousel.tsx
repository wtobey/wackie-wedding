"use client";

import { useRef, useState } from "react";
import styles from "./trip-carousel.module.css";

const trips = [
  { name: "Napa & Sonoma", theme: "Vineyards & long lunches", copy: "Slow down with vineyard views, wine tours, and long lunches. Spend a day exploring Sonoma’s Russian River or Dry Creek Valley, then head to Napa for another taste of wine country. Book a guided tour or driver so everyone can enjoy the tastings.", url: "https://www.visitcalifornia.com/road-trips/winding-through-wine-country/" },
  { name: "San Francisco", theme: "A few days in the city", copy: "Spend a few days in the city we’ve called home for the past six years. Wander through different neighborhoods, find a favorite bakery, explore Golden Gate Park, and leave plenty of time for dinner. An easy addition before or after the wedding if you’re flying through SFO.", url: "https://www.sftravel.com/" },
  { name: "Mendocino", theme: "Take the coast north", copy: "Head north for ocean views, little coastal towns, and a slower pace. Make the drive part of the adventure, with stops along the Sonoma Coast before settling into Mendocino for headland walks and quiet mornings.", url: "https://www.visitmendocino.com/" },
  { name: "Carmel & Big Sur", theme: "A little farther south", copy: "Head south to Carmel-by-the-Sea for beach walks and village wandering, then explore Big Sur’s dramatic coastline. Give yourself time to stop, take in the views, and linger over lunch overlooking the Pacific.", url: "https://www.visitcalifornia.com/places-to-visit/big-sur/" },
  { name: "Lake Tahoe", theme: "Trade vineyards for mountain air", copy: "Spend a few days by the lake, mixing scenic walks and outdoor adventures with afternoons that require very little planning. Make this a longer extension of your trip so there’s time to settle in and enjoy the mountains.", url: "https://www.visitlaketahoe.com/" },
  { name: "Yosemite", theme: "Make a bigger adventure of it", copy: "Spend a few days among Yosemite’s granite cliffs, waterfalls, and forest trails. Choose a base nearby and give yourself time to explore without rushing. Check road conditions and park reservation requirements closer to your trip.", url: "https://www.nps.gov/yose/planyourvisit/index.htm" },
];

export default function TripCarousel() {
  const rail = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  function go(index: number) {
    const container = rail.current;
    const card = container?.children[index] as HTMLElement | undefined;
    if (!container || !card) return;
    container.scrollTo({ left: card.offsetLeft - (container.clientWidth - card.offsetWidth) / 2, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }
  return <section className={styles.carousel} aria-label="Places to extend your trip" aria-roledescription="carousel">
    <div className={styles.rail} ref={rail} onScroll={() => {
      const container = rail.current;
      if (!container) return;
      const center = container.scrollLeft + container.clientWidth / 2;
      const distances = Array.from(container.children).map(e => { const card = e as HTMLElement; return Math.abs(card.offsetLeft + card.offsetWidth / 2 - center); });
      setActive(distances.indexOf(Math.min(...distances)));
    }}>
      {trips.map((trip, index) => <article key={trip.name} className={styles.card} aria-label={`${index + 1} of ${trips.length}: ${trip.name}`}>
        <p className={styles.theme}>{trip.theme}</p>
        <h2>{trip.name}</h2>
        <p>{trip.copy}</p>
        <a href={trip.url} target="_blank" rel="noreferrer">Explore {trip.name} ↗</a>
      </article>)}
    </div>
    <div className={styles.controls}>
      <button onClick={() => go(active - 1)} disabled={active === 0} aria-label="Previous destination">←</button>
      <p aria-live="polite">{active + 1} / {trips.length} · {trips[active].name}</p>
      <button onClick={() => go(active + 1)} disabled={active === trips.length - 1} aria-label="Next destination">→</button>
    </div>
  </section>;
}
