# Wedding photo manager

Visit `/wedding_v1/admin`, or enter the admin password at the usual wedding welcome screen. The guest password still opens only the guest website. The photo manager is accessed through its direct address and does not appear in the website navigation.

The local generated password is in `ADMIN_ACCESS.local.md` (gitignored). Set `WEDDING_ADMIN_PASSWORD` to a unique value of at least 16 characters in the server environment. Never use a `NEXT_PUBLIC_` variable for it. Changing it revokes existing sessions. Sessions use signed HttpOnly, SameSite=Strict cookies and expire after eight hours; production requires HTTPS. All admin read/write endpoints check the session; mutation endpoints check Origin. A process-wide escalating login cooldown limits password guessing.

## Editing

- Two collections: gallery (also used by homepage floating photos), and Dawn Ranch's accommodation stack.
- Edit captions, accessibility descriptions, dates, inclusion, and order, then Save changes.
- Move up/down controls work with mouse, touch, and keyboard. Gallery timeline displays dated photos in the saved order, then undated photos; dates label photos and do not override the chosen order.
- Upload JPG, PNG or WebP, at most 15 MB and 40 megapixels each. Images are normalized to WebP, auto-oriented, resized to at most 2400 pixels, and metadata stripped. New uploads start excluded.
- Replacement uploads are saved immediately and preserve the photo's metadata, order and visibility. Save pending edits before replacing or uploading.
- Conflicting saves from multiple tabs are rejected rather than overwriting the newer library. Reload to discard a stale draft. Exclusion is reversible; the UI does not permanently delete photos.

## Storage and hosting

This implementation targets a **single persistent Node server**. Metadata is atomically saved in `.wedding-data/photos.json`; uploads live in `.wedding-data/uploads/`. Back up the entire directory together. Set `WEDDING_DATA_DIR` to an absolute persistent disk path in production, outside the public directory. The data directory and credentials are gitignored.

**Do not deploy the disk store to an ephemeral/serverless host or multiple independent replicas.** Before using such hosting, migrate the store to durable database/object storage and shared rate limiting. Local edits are not synced back to Supabase.

On first initialization only, a configured `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` imports all existing polaroid metadata read-only, while retaining remote image URLs. The current v1 environment has neither configured; legacy `VITE_` credentials are not used. The five existing Dawn Ranch photos are always seeded. If importing a remote gallery later, merge it into the existing local library instead of deleting local edits/uploads.

Excluding remote images removes them from this website, not from their original publicly accessible host. Local excluded uploads are served only to an authenticated admin. The guest welcome screen remains the existing lightweight guest gate, not private image hosting.
