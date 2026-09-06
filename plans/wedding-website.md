# Wedding website

The new website starts at `/wedding`. The existing `/` Polaroid experience and `/river` remain separate.

## Guest access

The shared password is `getwackie` (case-insensitive, surrounding spaces ignored). Optional override: `NEXT_PUBLIC_WEDDING_PASSWORD` in `.env.local`, then restart/rebuild. Access persists in localStorage; the footer's “Lock the site” clears it. If storage is unavailable, access lasts for the current page session.

This is deliberately a casual browser-side gate, as requested. The password is present in the client bundle; page payloads and existing public Supabase image URLs are not private. Every `/wedding` page uses the same gate. Wedding metadata asks search engines not to index these pages. This is not suitable protection for future private RSVP or guest records.

## Pages

- `/wedding`: landing page, weekend overview, links, RSVP coming-soon section.
- `/wedding/our-wedding`: June 4 welcome party, June 5 wedding, June 6 goodbye brunch. Friday/Sunday dates assume the surrounding wedding weekend; their venues and all event times remain unconfirmed.
- `/wedding/accommodations`: Dawn Ranch, an official venue photo, room information link, booking details coming soon.
- `/wedding/transportation`: STS airport, Bay Area alternatives, directions; shuttle and parking details coming soon.
- `/wedding/plan-your-trip`: Flowers, Napa, Yountville, Sausalito, Armstrong Redwoods, and the Russian River, plus flight advice. The suggested route is flexible rather than a booked itinerary.
- `/wedding/gallery`: a chronological, horizontally auto-scrolling Polaroid timeline. A simple peach seeker has a slider and previous/next controls, without endpoint photo previews or playback buttons. Scrolling repeats automatically, briefly yielding to manual interaction and resuming afterward. Offscreen/hidden pages and the photo viewer suspend animation; reduced-motion preferences disable automatic scrolling. Undated photos have a separate group (or album order if no dates exist). Fullscreen viewing supports arrow keys and Escape.

The gallery reads all photo metadata in batches of 200 to assemble the full timeline; images are lazy-loaded. The timeline is the gallery itself, with no preview link or extra entry step. In development without Supabase credentials, labeled sample cards appear immediately in the timeline. These do not represent real photos and are not offered in production. Run `npx tsx --test lib/wedding-timeline.test.ts` for date-ordering, pagination, cancellation, and seeker tests.

## Editing content

Shared venue details, event copy, and attractions are in `data/wedding.ts`. Page-specific copy is in `app/wedding/`. Styles are isolated in `app/wedding/wedding.module.css`.

The gallery needs the existing `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. It follows the original homepage's public Storage URL approach and requires the existing read permissions. Without configuration it shows a guest-friendly coming-soon state. Database errors have retry controls; broken images have a fallback. No database schema or bucket permission changes are needed.

## Still to confirm

- Event times, welcome-party and brunch locations, dress code.
- Dawn Ranch group booking link and any room-block arrangements.
- Shuttle, pickup, and parking details.
- RSVP workflow and guest data requirements (not implemented).

## Content sources checked September 5, 2026

- Dawn Ranch address, accommodation types, and credited remote photography: https://dawnranch.com/ and https://dawnranch.com/stay
- Airport car rentals: https://sonomacountyairport.org/passengers/ground-transportation/car-rentals/
- Flowers visits and reservations: https://www.flowerswinery.com/visit-flowers-healdsburg-2-2/
- Napa and Yountville: https://www.visitnapavalley.com/ and https://www.visitnapavalley.com/things-to-do/towns-regions/yountville/
- Sausalito: https://visitsausalito.org/
- Armstrong Redwoods: https://www.parks.ca.gov/?page_id=450

Venue images are remotely hosted, with a visible source credit and an illustration fallback if unavailable. Confirm image reuse rights before public launch or replace with supplied photography.
