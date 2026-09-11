'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type {
  LookupResult,
  Party,
  RsvpMode,
  Submission,
} from '@/lib/rsvp/types';
import { request } from '@/lib/rsvp/client';
import styles from './rsvp.module.css';
export default function RsvpForm() {
  const [mode, setMode] = useState<RsvpMode | null>(null),
    [party, setParty] = useState<Party | null>(null),
    [choices, setChoices] = useState<{ id: string; displayName: string }[]>([]);
  const [first, setFirst] = useState(''),
    [last, setLast] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [saved, setSaved] = useState(false);
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
  function updateGuest(
    guestId: string,
    field: 'firstName' | 'lastName',
    value: string,
  ) {
    setParty(
      (p) =>
        p && {
          ...p,
          guests: p.guests.map((g) =>
            g.id === guestId ? { ...g, [field]: value } : g,
          ),
        },
    );
  }
  function updateEvent(
    guestId: string,
    eventId: string,
    field: string,
    value: string,
  ) {
    setParty(
      (p) =>
        p && {
          ...p,
          guests: p.guests.map((g) =>
            g.id === guestId
              ? {
                  ...g,
                  events: g.events.map((e) =>
                    e.eventId === eventId
                      ? { ...e, [field]: value || null }
                      : e,
                  ),
                }
              : g,
          ),
        },
    );
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!party) return;
    setBusy(true);
    setError('');
    try {
      const responses: Submission['responses'] = party.guests.flatMap((g) =>
        g.events
          .filter((e) => e.attendance !== null)
          .map((e) => ({
            guestId: g.id,
            eventId: e.eventId,
            attendance: e.attendance as 'yes' | 'no',
            mealChoice: e.mealChoice,
            dietaryRestrictions: e.dietaryRestrictions,
            ...(g.isUnnamedPlusOne && (g.firstName || g.lastName)
              ? { firstName: g.firstName || '', lastName: g.lastName || '' }
              : {}),
          })),
      );
      const payload = {
          partyId: party.id,
          revision: party.revision,
          responses,
        },
        key = JSON.stringify(payload);
      if (pending.current?.key !== key)
        pending.current = { key, requestId: crypto.randomUUID() };
      const result = await request<{ party: Party }>('/api/rsvp', {
        ...payload,
        requestId: pending.current.requestId,
      });
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
          <h2>
            {mode === 'declines_only'
              ? 'Already know you can’t make it?'
              : 'We hope you can join us'}
          </h2>
          <p>
            {mode === 'declines_only'
              ? 'You can let us know now if you won’t be able to attend. Please wait for your invitation to RSVP yes.'
              : 'Enter your name as it appears on your invitation to respond for your party.'}
          </p>
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
          <h2>{party.greeting || party.displayName || 'Your party'}</h2>
          {saved ? (
            <>
              <div role="status" className={styles.message}>
                Your responses are saved. You can look up your name again any
                time to make changes.
              </div>
              <div className={styles.form}>
                {party.guests.map((g) => (
                  <div key={g.id}>
                    <strong>
                      {g.firstName
                        ? `${g.firstName} ${g.lastName}`
                        : 'Your plus-one'}
                    </strong>
                    {g.events.map((e) => (
                      <p key={e.eventId}>
                        {e.name}:{' '}
                        {e.attendance === 'yes'
                          ? 'Attending'
                          : e.attendance === 'no'
                            ? 'Not attending'
                            : 'No response yet'}
                      </p>
                    ))}
                  </div>
                ))}
                <button onClick={() => setSaved(false)}>Edit responses</button>
              </div>
            </>
          ) : (
            <form className={styles.form} onSubmit={save}>
              {mode === 'declines_only' && (
                <p>
                  We’re accepting early declines. You can RSVP yes once
                  invitations arrive.
                </p>
              )}
              {party.guests.map((g) => (
                <section key={g.id} className={styles.card}>
                  <h2>
                    {g.isUnnamedPlusOne
                      ? 'Your plus-one'
                      : `${g.preferredName || g.firstName} ${g.lastName}`}
                  </h2>
                  {g.isUnnamedPlusOne && (
                    <div className={styles.row}>
                      <label>
                        First name
                        <input
                          disabled={busy}
                          maxLength={100}
                          value={g.firstName || ''}
                          required={g.events.some(
                            (e) => e.attendance === 'yes',
                          )}
                          onChange={(e) =>
                            updateGuest(g.id, 'firstName', e.target.value)
                          }
                        />
                      </label>
                      <label>
                        Last name
                        <input
                          disabled={busy}
                          maxLength={100}
                          value={g.lastName || ''}
                          required={g.events.some(
                            (e) => e.attendance === 'yes',
                          )}
                          onChange={(e) =>
                            updateGuest(g.id, 'lastName', e.target.value)
                          }
                        />
                      </label>
                    </div>
                  )}
                  {!g.events.length && (
                    <p>
                      Please contact Will or Jackie about this guest’s
                      invitation.
                    </p>
                  )}
                  {g.events.map((e) => (
                    <fieldset className={styles.event} key={e.eventId}>
                      <legend>{e.name}</legend>
                      <label>
                        Will {g.preferredName || g.firstName || 'your plus-one'}{' '}
                        attend?
                        <select
                          disabled={busy}
                          value={e.attendance || ''}
                          onChange={(v) =>
                            updateEvent(
                              g.id,
                              e.eventId,
                              'attendance',
                              v.target.value,
                            )
                          }
                        >
                          <option value="" disabled>
                            Choose a response
                          </option>
                          {(mode === 'open' || e.attendance === 'yes') && (
                            <option value="yes">Yes, attending</option>
                          )}
                          <option value="no">No, unable to attend</option>
                        </select>
                      </label>
                      {e.attendance === 'yes' && (
                        <>
                          <label>
                            Meal preference (optional)
                            <input
                              disabled={busy}
                              maxLength={100}
                              value={e.mealChoice || ''}
                              onChange={(v) =>
                                updateEvent(
                                  g.id,
                                  e.eventId,
                                  'mealChoice',
                                  v.target.value,
                                )
                              }
                            />
                          </label>
                          <label>
                            Dietary restrictions (optional)
                            <textarea
                              disabled={busy}
                              maxLength={1000}
                              value={e.dietaryRestrictions || ''}
                              onChange={(v) =>
                                updateEvent(
                                  g.id,
                                  e.eventId,
                                  'dietaryRestrictions',
                                  v.target.value,
                                )
                              }
                            />
                          </label>
                        </>
                      )}
                    </fieldset>
                  ))}
                </section>
              ))}
              <button
                disabled={
                  busy ||
                  !party.guests.some((g) =>
                    g.events.some((e) => e.attendance !== null),
                  )
                }
              >
                {busy ? 'Saving…' : 'Save responses'}
              </button>
            </form>
          )}
          <p>
            <button
              className={styles.secondary}
              disabled={busy}
              onClick={() => {
                setParty(null);
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
