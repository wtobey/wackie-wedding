import type { Guest } from './types';

// A named plus-one keeps its plus-one flag, so naming the guest never breaks
// the link to the primary in a primary-and-guest party.
export function declineGuestIds(guests: Guest[], selected: string[]): string[] {
  const primaries = guests.filter((guest) => !guest.isUnnamedPlusOne);
  const primarySelected =
    primaries.length > 0 &&
    primaries.every((guest) => selected.includes(guest.id));
  return [
    ...new Set([
      ...selected,
      ...(primarySelected
        ? guests
            .filter((guest) => guest.isUnnamedPlusOne)
            .map((guest) => guest.id)
        : []),
    ]),
  ];
}

export function declineChoices(guests: Guest[]): Guest[] {
  // Multi-person households do not yet record which person owns each plus-one.
  // Keep those seats explicit rather than attaching them to the wrong person.
  const primaries = guests.filter((guest) => !guest.isUnnamedPlusOne);
  return primaries.length === 1 ? primaries : guests;
}
