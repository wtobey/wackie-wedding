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
  { day: "Friday", date: "June 4, 2027", number: "04", name: "Welcome Party (& Nana’s birthday bash)", location: "The Bandshell at Dawn Ranch", details: "", schedule: [], icon: "cheers" },
  { day: "Saturday", date: "June 5, 2027", number: "05", name: "Wedding Ceremony & Reception", location: "The Orchard at Dawn Ranch", details: "Dress code: Black tie optional", schedule: ["Guests arrive at 4:40pm", "Ceremony begins at 5pm", "Reception & merriment to follow", "After party will be in the Lodge onsite from10pm-12am"], icon: "flower" },
  { day: "Sunday", date: "June 6, 2027", number: "06", name: "Recovery Brunch", location: "The Kitchen Garden & Meadow at Dawn Ranch", details: "Dress code: Casual", schedule: ["9:30-11:30am - come and go as you please!"], icon: "coffee" },
] as const;

// Original supplied copy; preserve wording when reused across pages.
export const weddingTravel = {
  airport: "If there are routes from your home base, we recommend flying into the Charles M. Schulz–Sonoma County Airport, just a 20-30 min. drive to the venue.",
  la: "For LA  friends and family, you can fly direct from LAX, BUR, ONT, and SNA",
  phoenix: "For Phoenix friends and family, you can fly direct from PHX",
  other: "Other flight options are available through Denver, Las Vegas, Seattle, Dallas, Portland, San Diego",
  bayArea: "You may also fly into OAK or SFO if you’d like to explore more of Northern California, just be aware that drive times to the venue can be highly variable depending on weekday traffic.",
  stay: "We’ve reserved space for our guests to stay with us at Dawn Ranch, where all the wedding weekend festivities will take place.",
  booking: "A booking link will be shared at a later date to reserve rooms at a discounted rate.",
  alternatives: "In the event that all of the space at the venue is reserved, we will plan to share alternative hotel options at a later date.",
  shuttle: "Riseshare is available from the Sonoma County Airport to Dawn Ranch, but is not reliably available for the return trip. For guests departing on Sunday, we will arrange a private shuttle for transportation to the Sonoma County Airport.",
  parking: "There is parking available onsite for guests.",
  accessibleRooms: "Dawn Ranch offers ADA compliant guest rooms that are close to the Welcome Party and Recovery Brunch.",
} as const;

export const weddingFaqs = [
  { question: "What's the dress code", answer: "Black tie optional." },
  { question: "Is the ceremony indoors or outdoors", answer: "The ceremony and reception will be outdoors on grass. The afterparty will be indoors." },
  { question: "What's the weather typically like", answer: "The weather is typically warm, 70s-80s and sunny." },
  { question: "Is there parking, and can I leave my car overnight", answer: "Yes" },
  // The source FAQ says 4:45pm; the schedule says 4:40pm. Awaiting confirmation.
  { question: "What time should I arrive", answer: "Guests should plan to arrive at the Orchard for the ceremony at 4:45pm." },
  { question: "Are the ceremony and reception in the same place", answer: "Yes" },
  { question: "Is there an unplugged ceremony request", answer: "Yes" },
  { question: "Dietary restrictions and how to flag them", answer: "There will be an option to flag dietary restrictions when you submit your RSVP." },
  { question: "Accessibility, including terrain, stairs, and seating", answer: "All events will take place on variable terrain, including grass and paved walkways/courtyards. Seating will be available at every event. On Saturday, we will have a golf cart available to transport guests who could use assistance getting to the Orchard for the ceremony and reception. The afterparty will be upstairs in the lodge, and there is an ADA compliant lift to bypass the stairs. Dawn Ranch offers ADA compliant guest rooms that are close to the Welcome Party and Recovery Brunch." },
] as const;

export const attractions = [
  { name: "Flowers Winery", area: "Healdsburg · Wine country", tag: "A little wine time", icon: "cheers", description: "Settle into the gardens at House of Flowers for a tasting. A lovely excuse to slow down and make an afternoon of it in Healdsburg.", note: "Plan ahead and reserve a tasting directly with the winery.", url: "https://www.flowerswinery.com/visit-flowers-healdsburg-2-2/", link: "Visit Flowers" },
  { name: "Napa Valley", area: "Napa County · A side trip", tag: "Make a day of it", icon: "sun", description: "Vineyards, long lunches, and a very good reason to extend your stay. Pick a couple of stops and leave room for the scenic route.", note: "Consider an overnight stay; Napa is a separate outing from our Russian River weekend.", url: "https://www.visitnapavalley.com/", link: "Explore Napa Valley" },
  { name: "Yountville", area: "Napa Valley · Food & wandering", tag: "Come hungry", icon: "coffee", description: "Make time for a leisurely meal, a bakery stop, and a walk around town. This little pocket of Napa Valley is made for a delicious, unhurried day.", note: "Pair it with your Napa visit, and book any must-try restaurants ahead.", url: "https://www.visitnapavalley.com/things-to-do/towns-regions/yountville/", link: "Explore Yountville" },
  { name: "Sausalito", area: "Marin County · By the bay", tag: "A waterfront detour", icon: "sun", description: "Stroll the waterfront, browse the little shops, and soak up the views across the bay. A sweet stop if you’re coming through San Francisco.", note: "An easy idea for the beginning or end of a longer Bay Area trip.", url: "https://visitsausalito.org/", link: "Explore Sausalito" },
  { name: "Armstrong Redwoods", area: "Guerneville · Close to the ranch", tag: "Look up. Way up.", icon: "trees", description: "Trade your screen for a canopy of redwoods. Head to Armstrong Redwoods State Natural Reserve for a quiet wander among the giants.", note: "Check the park’s current trail conditions before heading out.", url: "https://www.parks.ca.gov/?page_id=450", link: "Plan a redwood walk" },
  { name: "A little river time", area: "Guerneville · Right here", tag: "Doing less is a plan", icon: "river", description: "Leave an afternoon open for the Russian River, a good book, or absolutely nothing. There’s no need to fill every minute of the week.", note: "Ask Dawn Ranch about river access and current conditions during your stay.", url: "https://dawnranch.com/", link: "Explore the ranch" },
] as const;
