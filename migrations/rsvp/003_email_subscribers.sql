-- Additive: email updates are independent of guest imports and RSVP responses.
CREATE TABLE wedding_rsvp.email_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE CHECK (email = lower(btrim(email)) AND length(email) BETWEEN 3 AND 254),
  source text NOT NULL CHECK (source IN ('password', 'accommodations')),
  consent_version text NOT NULL DEFAULT 'hotel-booking-updates-v1',
  subscribed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE wedding_rsvp.email_subscribers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON wedding_rsvp.email_subscribers FROM PUBLIC;
