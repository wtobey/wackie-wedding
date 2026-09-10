# Photo storage

Photo files belong in Supabase Storage. Postgres `wedding_admin.library` stores
the photo list, captions, dates, crops, inclusion flags, and saved ordering only.

- Existing imported photos remain in the `polaroids` bucket.
- Admin uploads go into the private `wedding-uploads` bucket, under `originals/`,
  `thumbnails/` (880px), and `small/` (440px). All three use the same UUID filename.
- The server uses `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SECRET_KEY`) and
  `NEXT_PUBLIC_SUPABASE_URL`. Never expose the server key to the browser.
- The public photo list filters inclusion flags before issuing one-hour signed
  Storage URLs. Images download directly from Storage. The old `/api/wedding/media/`
  URLs remain stable identifiers in the library and redirect after access checks.
- iPhone date extraction, HEIC conversion, browser resizing, crop settings, and
  multi-file upload remain supported. Uploads create previews before saving a
  library entry; failure removes partial files.

## Legacy bytea migration

The authenticated, same-origin `/api/wedding/admin/storage-migration` endpoint
supports moving old `wedding_admin.media` rows without changing library records.
GET lists remaining rows. POST `{ "action": "copy", "name": "<uuid>.webp" }`
copies all sizes and checks the original's SHA-256 against a Storage download.
After verifying the gallery and all copies, POST the same name with action
`finish` rechecks the original and preview existence before deleting that bytea
row. Failed checks keep the original. Re-run GET to resume after an interruption.

The database image-read fallback exists only for legacy rows during migration;
new uploads cannot write image bytes to Postgres. Local development without
Storage or database credentials uses the ignored `.wedding-data` directory.
