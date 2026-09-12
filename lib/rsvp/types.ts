export type RsvpMode = 'closed' | 'declines_only' | 'open';
export type Attendance = 'yes' | 'no' | null;
export type RsvpEvent = { id: string; name: string; startsAt: string | null };
export type GuestEvent = {
  eventId: string;
  name: string;
  startsAt: string | null;
  attendance: Attendance;
  mealChoice: string | null;
  dietaryRestrictions: string | null;
  respondedAt: string | null;
};
export type Guest = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  preferredName: string | null;
  isUnnamedPlusOne: boolean;
  events: GuestEvent[];
};
export type Party = {
  id: string;
  displayName: string | null;
  greeting: string | null;
  revision: number;
  guests: Guest[];
};
export type LookupResult =
  | { status: 'not_found' }
  | { status: 'ambiguous'; parties: { id: string; displayName: string }[] }
  | { status: 'found'; party: Party; mode: RsvpMode };
export type RsvpResponse = {
  guestId: string;
  eventId: string;
  attendance: 'yes' | 'no';
  mealChoice?: string | null;
  dietaryRestrictions?: string | null;
  firstName?: string;
  lastName?: string;
};
export type Submission = {
  partyId: string;
  revision: number;
  requestId: string;
  responses: RsvpResponse[];
};
export type ImportRow = {
  row: number;
  partyId: string;
  displayName: string | null;
  greeting: string | null;
  guestId: string;
  explicitId: boolean;
  importKey: string;
  firstName: string | null;
  lastName: string | null;
  preferredName: string | null;
  isUnnamedPlusOne: boolean;
  eventIds: string[];
};
export type ImportPlan = {
  hash: string;
  revision: number;
  partiesAdded: number;
  partiesUpdated: number;
  guestsAdded: number;
  guestsUpdated: number;
  invitationsAdded: number;
  rows: number;
  warnings: string[];
};

export type DeclineSubmission = {
  action: 'decline';
  partyId: string;
  revision: number;
  requestId: string;
  guestIds: string[];
};
