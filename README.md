# Wackie Wedding

Jackie and Will’s wedding website, built with Next.js App Router, React, and Supabase.

## Local development

Use Node.js 22 or newer, then:

```sh
npm ci
npm run dev
```

- `/`: the original security-gated falling Polaroids and messages.
- `/wedding`: the shared-password wedding site, invitation, weekend schedule, accommodations, transportation, trip ideas, gallery, and FAQ.
- `/river`: the experimental river page.

The wedding password is `getwackie`. This is a lightweight client-side guest gate, not secure access control. RSVP currently opens a coming-soon message.

## Supabase configuration

Set these variables in `.env.local` and in your hosting provider’s build environment. Never commit credentials.

| Previous Vite variable | Next.js variable |
| --- | --- |
| `VITE_SUPABASE_URL` | `NEXT_PUBLIC_SUPABASE_URL` |
| `VITE_SUPABASE_ANON_KEY` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `VITE_ENABLE_USER_MESSAGES` | `NEXT_PUBLIC_ENABLE_USER_MESSAGES` |

Use the Supabase public anon key, never a service-role key. Set the optional messages flag to `TRUE` to enable the original home page’s message-entry feature. Public variables are embedded at build time, so rebuild after changing them.

The existing Supabase backend and `polaroids` storage bucket remain in use. This migration does not apply database migrations or change deployed functions. Without configuration, pages use fallback content; local gallery previews are not actual guest photos.

## Deployment migration

This replaces Vite with Next.js. In the hosting project, choose the **Next.js** framework preset and remove old Vite/dist build or output-directory overrides. Use `npm run build`; Next.js produces `.next`, not `dist`. For a Node deployment, run `npm start` after building.

Before deploying, configure the renamed environment variables above. No production deployment is performed by the migration itself.

## Verification

```sh
npm run build
npx eslint app/wedding components/wedding lib/wedding-timeline.ts lib/wedding-timeline.test.ts
npx tsx --test lib/wedding-timeline.test.ts
```

## Artwork

Completed illustrations, doodles, SVGs, and patterns are stored in `public/`. Earlier illustration variants are retained for future art direction; the Accommodations page currently uses `wedding-firepit-smores-color-blobs.png`. The header uses `wedding-redwoods-v2.svg`.

Generation prompts and design notes live in `plans/`. Existing photo storage, messages, and security-gate code have been carried forward into the new application structure.
