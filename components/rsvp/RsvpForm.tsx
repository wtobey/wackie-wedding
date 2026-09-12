'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { LookupResult, Party, RsvpMode } from '@/lib/rsvp/types';
import { request } from '@/lib/rsvp/client';
import styles from './rsvp.module.css';
function guestName(guest: Party['guests'][number]) {
  return guest.firstName
    ? `${guest.preferredName || guest.firstName} ${guest.lastName}`
    : 'Your plus-one';
}
export default function RsvpForm() {
  const [mode, setMode] = useState<RsvpMode | null>(null),
    [party, setParty] = useState<Party | null>(null),
    [choices, setChoices] = useState<{ id: string; displayName: string }[]>([]);
  const [first, setFirst] = useState(''),
    [last, setLast] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [saved, setSaved] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [declinedNames, setDeclinedNames] = useState<string[]>([]);
  const pending = useRef<{ key: string; requestId: string } | null>(null);
  async function loadMode() {
    try {
      const s = await request<{ mode: RsvpMode }>('/api/rsvp');
      setMode(s.mode);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    let active = true;
    request<{ mode: RsvpMode }>('/api/rsvp')
      .then((s) => {
        if (active) setMode(s.mode);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  async function find(selected?: string) {
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      const result = await request<LookupResult>('/api/rsvp/lookup', {
        firstName: first,
        lastName: last,
        ...(selected ? { partyId: selected } : {}),
      });
      if (result.status === 'not_found') {
        setChoices([]);
        setError(
          'We couldn’t find that name. Try the first and last name on your invitation, or reach out to Will or Jackie.',
        );
      } else if (result.status === 'ambiguous') setChoices(result.parties);
      else {
        setParty(result.party);
        setSelected([]);
        setMode(result.mode);
        setChoices([]);
        pending.current = null;
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!party) return;
    setBusy(true);
    setError('');
    try {
      const payload = {
          action: 'decline',
          partyId: party.id,
          revision: party.revision,
          guestIds: selected,
        },
        key = JSON.stringify(payload);
      if (pending.current?.key !== key)
        pending.current = { key, requestId: crypto.randomUUID() };
      const result = await request<{ party: Party }>('/api/rsvp', {
        ...payload,
        requestId: pending.current.requestId,
      });
      setDeclinedNames(
        result.party.guests
          .filter((g) => selected.includes(g.id))
          .map(guestName),
      );
      setParty(result.party);
      setSaved(true);
      pending.current = null;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={styles.page}>
      <h1>RSVP</h1>
      {mode === null && !error && <p role="status">Loading RSVP…</p>}
      {error && (
        <div role="alert" className={styles.error}>
          {error}
          {mode === null && (
            <p>
              <button onClick={loadMode}>Try again</button>
            </p>
          )}
        </div>
      )}
      {mode === 'closed' && (
        <>
          <h2>Invitations are on their way</h2>
          <p>Please come back to RSVP when you receive your invitation.</p>
        </>
      )}
      {mode && mode !== 'closed' && !party && (
        <>
          <h2>Already know you can’t make it?</h2>
          <p>
            If you won’t be able to join us for the wedding weekend, you can let
            us know here. Otherwise, please wait for your invitation to RSVP.
          </p>
          <p>Enter your first and last name to find your party.</p>
          <form
            className={styles.form}
            onSubmit={(e) => {
              e.preventDefault();
              void find();
            }}
          >
            <div className={styles.row}>
              <label>
                First name
                <input
                  disabled={busy}
                  autoComplete="given-name"
                  required
                  maxLength={100}
                  value={first}
                  onChange={(e) => {
                    setFirst(e.target.value);
                    setChoices([]);
                  }}
                />
              </label>
              <label>
                Last name
                <input
                  disabled={busy}
                  autoComplete="family-name"
                  required
                  maxLength={100}
                  value={last}
                  onChange={(e) => {
                    setLast(e.target.value);
                    setChoices([]);
                  }}
                />
              </label>
            </div>
            <button disabled={busy}>
              {busy ? 'Finding your invitation…' : 'Find my invitation'}
            </button>
          </form>
          {choices.length > 0 && (
            <section className={styles.form}>
              <h2>Which party is yours?</h2>
              {choices.map((p) => (
                <button
                  className={styles.secondary}
                  key={p.id}
                  disabled={busy}
                  onClick={() => find(p.id)}
                >
                  {p.displayName}
                </button>
              ))}
            </section>
          )}
        </>
      )}
      {party && (
        <>
          <h2>{party.displayName || 'Your party'}</h2>
          {saved ? (
            <>
              <div role="status" className={styles.message}>
                <p>Thank you for letting us know. We’ll miss you!</p>
                <p>
                  We’ve marked {declinedNames.join(' and ')} as not attending
                  any wedding weekend events.
                </p>
              </div>
              <p>If your plans change, please reach out to Will or Jackie.</p>
            </>
          ) : (
            <form className={styles.form} onSubmit={save}>
              <fieldset className={styles.event} disabled={busy}>
                <legend>Who won’t be able to attend?</legend>
                <p>
                  Select everyone who won’t be joining us. This will decline all
                  wedding weekend events for each person selected.
                </p>
                {party.guests.map((g) => (
                  <label className={styles.check} key={g.id}>
                    <input
                      type="checkbox"
                      checked={selected.includes(g.id)}
                      onChange={(event) =>
                        setSelected((current) =>
                          event.target.checked
                            ? [...current, g.id]
                            : current.filter((id) => id !== g.id),
                        )
                      }
                    />
                    <span>
                      {guestName(g)}
                      {g.events.length > 0 &&
                        g.events.every((e) => e.attendance === 'no') && (
                          <small> — already marked as not attending</small>
                        )}
                    </span>
                  </label>
                ))}
              </fieldset>
              <p>
                Anyone you leave unselected will keep their current response.
                You don’t need to RSVP yes yet.
              </p>
              <button disabled={busy || !selected.length}>
                {busy ? 'Saving…' : 'Confirm unable to attend'}
              </button>
            </form>
          )}
          <p>
            <button
              className={styles.secondary}
              disabled={busy}
              onClick={() => {
                setParty(null);
                setSelected([]);
                setSaved(false);
                setError('');
              }}
            >
              Look up another name
            </button>
          </p>
        </>
      )}
    </div>
  );
}
