# Wedding photo manager

Visit `/wedding_v1/admin`, or enter the admin password at the usual wedding welcome screen. The guest password still opens only the guest website. The photo manager is accessed through its direct address and does not appear in the website navigation.

The local generated password is in `ADMIN_ACCESS.local.md` (gitignored). Set `WEDDING_ADMIN_PASSWORD` to a unique value of at least 16 characters in the server environment. Never use a `NEXT_PUBLIC_` variable for it. Changing it revokes existing sessions. Sessions use signed HttpOnly, SameSite=Strict cookies and expire after eight hours; production requires HTTPS. All admin read/write endpoints check the session; mutation endpoints check Origin. A process-wide escalating login cooldown limits password guessing.

## Editing

- Two collections: gallery (also used by homepage floating photos), and Dawn Ranch's accommodation stack.
- Edit captions, accessibility descriptions, dates, inclusion, and order, then Save changes.
- Open **Adjust crop** beneath a preview to change zoom and horizontal/vertical framing. Reset crop restores centered framing. Save changes applies the crop to gallery cards and the Dawn Ranch Polaroids; full-size gallery viewing keeps the original image. Replacing a photo resets its crop.
- Move up/down controls work with mouse, touch, and keyboard. Gallery timeline displays dated photos in the saved order, then undated photos; dates label photos and do not override the chosen order.
- Upload JPG, PNG or WebP, at most 4 MB and 40 megapixels each. Images are normalized to WebP, auto-oriented, resized to at most 2400 pixels, and metadata stripped. New uploads start excluded.
- Replacement uploads are saved immediately and preserve the photo's metadata, order and visibility. Save pending edits before replacing or uploading.
- Conflicting saves from multiple tabs are rejected rather than overwriting the newer library. Reload to discard a stale draft. Exclusion is reversible; the UI does not permanently delete photos.

## Storage and hosting

On Vercel, `POSTGRES_URL` selects durable PostgreSQL storage for both the photo library and uploaded image bytes. The existing database is reused. Tables are initialized in the private `wedding_admin` schema; no anonymous database access is granted. Updates use an atomic revision check across server instances, so concurrent saves cannot silently overwrite each other. Back up this schema alongside the existing database. Uploads are limited to 4 MB to stay below Vercel's request size limit.

Without `POSTGRES_URL`, local development uses `.wedding-data/photos.json` and `.wedding-data/uploads/`. Back up that directory together. Vercel refuses to fall back to its temporary filesystem. Local changes are not automatically synced to production.

Set `WEDDING_ADMIN_PASSWORD` as a sensitive Production environment variable in Vercel and redeploy for changes to take effect. The existing login cooldown is process-local, so it is not a distributed rate limiter.

On first initialization only, a configured `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` imports all existing polaroid metadata read-only, while retaining remote image URLs. The current v1 environment has neither configured; legacy `VITE_` credentials are not used. The current Dawn Ranch deck is always seeded, including the excluded older river photo. If importing a remote gallery later, merge it into the existing local library instead of deleting local edits/uploads.

Excluding remote images removes them from this website, not from their original publicly accessible host. Local excluded uploads are served only to an authenticated admin. The guest welcome screen remains the existing lightweight guest gate, not private image hosting.
