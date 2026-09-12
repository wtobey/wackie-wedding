// Wedding copy lives here so dates, booking details, and recommendations are easy to update.
export const wedding = {
  date: "June 5, 2027",
  weekend: "June 4–6, 2027",
  venue: "Dawn Ranch",
  address: "16467 CA-116",
  town: "Guerneville, CA 95446",
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=Dawn+Ranch+16467+CA-116+Guerneville+CA+95446",
  venueUrl: "https://dawnranch.com/",
  roomsUrl: "https://dawnranch.com/stay",
  // Photography sourced from Dawn Ranch's official website. Keep the source credit with these images.
  cabinPhoto: "https://dawnranch.com/wp-content/uploads/2025/09/DawnRanch_DH_card_000221_DawnHeumann-scaled.jpg",
  forestPhoto: "https://dawnranch.com/wp-content/uploads/2025/07/20220718_122532-2-scaled.jpg",
};

export const weekendEvents = [
  { day: "Friday", date: "June 4, 2027", number: "04", name: "Welcome Party", location: "The Bandshell at Dawn Ranch", details: "", schedule: ["Dinner, drinks, and s’mores galore. We'll also be celebrating Nana's birthday! Additional details coming soon."], icon: "cheers" },
  { day: "Saturday", date: "June 5, 2027", number: "05", name: "Ceremony & Reception", location: "The Orchard at Dawn Ranch", details: "Dress code: Black-tie optional", schedule: ["The ceremony will take place in the late afternoon. Dinner & merriment to follow. There will be an onsite after-party beginning at 10pm."], icon: "flower" },
  { day: "Sunday", date: "June 6, 2027", number: "06", name: "Recovery Brunch", location: "The Meadow at Dawn Ranch", details: "Dress code: Casual", schedule: ["We know most folks will be heading home, so this will be a flexible event for those who'd like a bite before they hit the road."], icon: "coffee" },
] as const;

// Original supplied copy; preserve wording when reused across pages.
export const weddingTravel = {
  airport: "If there are routes from your home base, we recommend flying into the Charles M. Schulz–Sonoma County Airport (STS), which is just a 20-30 min. drive to the venue.",
  la: "You can fly direct from LAX, BUR, ONT, and SNA.",
  phoenix: "Direct flights are available from PHX to STS.",
  other: "Other flight options are available through Denver, Las Vegas, Seattle, Dallas, Portland, San Diego.",
  bayArea: "You may also fly into OAK or SFO if you’d like to explore more of Northern California, just be aware that drive times to the venue can be highly variable depending on weekday traffic.",
  stay: "We’ve reserved space for our guests to stay with us at Dawn Ranch, in Guerneville, California, where all the wedding weekend festivities will take place.",
  booking: "All room bookings will be handled directly through our booking portal. A booking link will be shared in early 2027 to reserve rooms at a discounted rate. Please hold tight until then and don't reach out to the hotel directly to book.",
  alternatives: "In the event that all of the space at the venue is reserved, we will plan to share alternative hotel options at a later date.",
  shuttle: "Rideshare is available from the Sonoma County Airport to Dawn Ranch, but is not reliably available for the return trip. For guests departing on Sunday, we will arrange a private shuttle for transportation to the Sonoma County Airport.",
  parking: "There is parking available onsite for guests.",
  accessibleRooms: "Dawn Ranch offers ADA compliant guest rooms that are close to the Welcome Party and Recovery Brunch.",
} as const;

export const weddingFaqs = [
  { question: "What is the dress code for the wedding ceremony & reception?", answer: "We'd love to see our family and friends dress up with us! The dress code for our wedding celebration is black-tie optional. This includes tuxedos and formal dark suits with ties, along with elevated long dresses or evening gowns." },
  { question: "Is the ceremony indoors or outdoors?", answer: "The ceremony and reception will be outdoors on grass. The afterparty will be indoors." },
  { question: "What's the weather typically like?", answer: "The weather is typically warm, 70s-80s and sunny. During the day, it should be perfect for a dip in the pool or a float in the river. There will be ample shade for the ceremony and cocktail hour. It can get chilly at night, so bring something to cover up in just in case." },
  { question: "Is there parking at the venue?", answer: "Yes" },
  // The source FAQ says 4:45pm; the schedule says 4:40pm. Awaiting confirmation.
  { question: "What time should I arrive?", answer: "The schedule for each of the weekend's events will be shared here and on the itinerary page at a later date." },
  { question: "Are the ceremony and reception in the same place?", answer: "Yes" },
  { question: "Accessibility details", answer: "All events will take place on variable terrain, including grass and paved walkways/courtyards. Seating will be available at every event. On Saturday, we will have a golf cart available to transport guests who could use assistance getting to the Orchard for the ceremony and reception. The afterparty will be upstairs in the lodge, and there is an ADA compliant lift to bypass the stairs. Dawn Ranch offers ADA compliant guest rooms that are close to the Welcome Party and Recovery Brunch." },
] as const;

export const attractions = [
  { name: "Flowers Winery", area: "Healdsburg · Wine country", tag: "A little wine time", icon: "cheers", description: "Settle into the gardens at House of Flowers for a tasting. A lovely excuse to slow down and make an afternoon of it in Healdsburg.", note: "Plan ahead and reserve a tasting directly with the winery.", url: "https://www.flowerswinery.com/visit-flowers-healdsburg-2-2/", link: "Visit Flowers" },
  { name: "Napa Valley", area: "Napa County · A side trip", tag: "Make a day of it", icon: "sun", description: "Vineyards, long lunches, and a very good reason to extend your stay. Pick a couple of stops and leave room for the scenic route.", note: "Consider an overnight stay; Napa is a separate outing from our Russian River weekend.", url: "https://www.visitnapavalley.com/", link: "Explore Napa Valley" },
  { name: "Yountville", area: "Napa Valley · Food & wandering", tag: "Come hungry", icon: "coffee", description: "Make time for a leisurely meal, a bakery stop, and a walk around town. This little pocket of Napa Valley is made for a delicious, unhurried day.", note: "Pair it with your Napa visit, and book any must-try restaurants ahead.", url: "https://www.visitnapavalley.com/things-to-do/towns-regions/yountville/", link: "Explore Yountville" },
  { name: "Sausalito", area: "Marin County · By the bay", tag: "A waterfront detour", icon: "sun", description: "Stroll the waterfront, browse the little shops, and soak up the views across the bay. A sweet stop if you’re coming through San Francisco.", note: "An easy idea for the beginning or end of a longer Bay Area trip.", url: "https://visitsausalito.org/", link: "Explore Sausalito" },
  { name: "Armstrong Redwoods", area: "Guerneville · Close to the ranch", tag: "Look up. Way up.", icon: "trees", description: "Trade your screen for a canopy of redwoods. Head to Armstrong Redwoods State Natural Reserve for a quiet wander among the giants.", note: "Check the park’s current trail conditions before heading out.", url: "https://www.parks.ca.gov/?page_id=450", link: "Plan a redwood walk" },
  { name: "A little river time", area: "Guerneville · Right here", tag: "Doing less is a plan", icon: "river", description: "Leave an afternoon open for the Russian River, a good book, or absolutely nothing. There’s no need to fill every minute of the week.", note: "Ask Dawn Ranch about river access and current conditions during your stay.", url: "https://dawnranch.com/", link: "Explore the ranch" },
] as const;
