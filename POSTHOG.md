# Wedding analytics

Install dependencies with `npm install`. PostHog is integrated into the wedding
shell and loads asynchronously without blocking the page.

Set these Vercel **Production** environment variables, then rebuild/deploy:

```dotenv
NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN=phc_your_public_project_token
NEXT_PUBLIC_POSTHOG_HOST=https://t.wackie.wedding
NEXT_PUBLIC_POSTHOG_UI_HOST=https://us.posthog.com
```

`NEXT_PUBLIC_POSTHOG_HOST` is the managed reverse-proxy domain. Copy the public project token
from PostHog Project settings, not a personal API key. These values are intended
to appear in the browser bundle. Without the token, analytics stays disabled.

Tracking requires Vercel's `NEXT_PUBLIC_VERCEL_ENV=production` and a production
hostname (wackie.wedding, www.wackie.wedding, or wackie-wedding.vercel.app).
Local development, preview deployments, admin routes, and non-wedding pages
are excluded. No subscription upgrade is required by this integration.

## Events

- `$pageview`: guest screens and the virtual `/access` password screen.
- `guest_access_granted`: successful guest password entry (no password recorded).
- `rsvp_opened`: opens the current RSVP information dialog, not an RSVP submission.
- `registry_clicked`: opens Williams Sonoma.
- `directions_clicked`: opens Dawn Ranch directions.
- `photo_opened`: opens the full photo viewer; `view` is grid or timeline.
- `gallery_view_changed`: switches views; `view` is the destination view.
- `email_subscribed`: a guest successfully submits an email address (the address is never sent).
- `rsvp_declined`: a guest successfully submits the early decline form (names and party data are never sent).

In PostHog, Web Analytics shows visitors, page views, referrers and devices.
Use Product Analytics trends for the custom events. Visitor counts are anonymous
browser estimates, not identified guests. Local storage maintains the anonymous
ID. Session replay and unhandled client errors are enabled only on production
guest pages. Inputs are masked, the password card and entire RSVP form are
blocked from replay, and console errors are not captured. No identify calls,
autocapture, surveys, feature flags or performance collection are enabled. URL
query strings and fragments are removed. Captions, photo URLs, passwords, and
form values are not included in custom events.

## Verification

Run `npx tsx --test lib/analytics/routes.test.ts` and `npm run build`.
After configuring and deploying, open a public page on the production domain,
enter the guest password, and switch gallery views. Check PostHog Activity for
the page, custom events, session replay and an intentional test exception.
Verify the password card and RSVP form are masked or blocked, and admin
navigation produces no analytics.
