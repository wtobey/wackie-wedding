'use client';
import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { ImportPlan, RsvpMode, RsvpEvent } from '@/lib/rsvp/types';
import { request } from '@/lib/rsvp/client';
import styles from './rsvp.module.css';
type RecordRow = {
  guest_id: string;
  party_id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  event_name: string | null;
  event_id: string | null;
  attendance: string | null;
  meal_choice: string | null;
  dietary_restrictions: string | null;
  responded_at: string | null;
};
type Data = {
  mode: RsvpMode;
  revision: number;
  events: RsvpEvent[];
  guests: RecordRow[];
};
export default function RsvpAdmin() {
  const [authorized, setAuthorized] = useState(false),
    [checking, setChecking] = useState(true),
    [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  const [csv, setCsv] = useState(''),
    [events, setEvents] = useState<string[]>([]),
    [preview, setPreview] = useState<ImportPlan | null>(null),
    [mode, setMode] = useState<RsvpMode>('closed');
  const attempt = useRef<string | null>(null);
  async function load() {
    const d = await request<Data>('/api/rsvp/admin');
    setData(d);
    setMode(d.mode);
  }
  useEffect(() => {
    request<{ admin: boolean }>('/api/wedding/admin/session')
      .then(async (s) => {
        setAuthorized(s.admin);
        if (s.admin) await load();
      })
      .catch((e) => setError(e.message))
      .finally(() => setChecking(false));
  }, []);
  async function work(operation: () => Promise<void>) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await operation();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = new FormData(e.currentTarget).get('password');
    await work(async () => {
      await request('/api/wedding/admin/session', { password });
      setAuthorized(true);
      await load();
    });
  }
  function invalidate() {
    setPreview(null);
    attempt.current = null;
  }
  return (
    <div className={styles.page}>
      <h1>RSVP manager</h1>
      <nav className={styles.links}>
        <Link href="/admin">Photo manager</Link>
        <Link href="/rsvp">View RSVP page</Link>
      </nav>
      {checking && <p role="status">Checking admin access…</p>}
      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className={styles.message} role="status">
          {message}
        </div>
      )}
      {!checking && !authorized && (
        <form className={styles.form} onSubmit={login}>
          <label>
            Admin password
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
            />
          </label>
          <button disabled={busy}>Sign in</button>
        </form>
      )}
      {authorized && !data && (
        <p>
          <button onClick={() => work(load)} disabled={busy}>
            Load RSVP manager
          </button>
        </p>
      )}
      {authorized && data && (
        <>
          <section className={styles.card}>
            <h2>RSVP availability</h2>
            <div className={styles.row}>
              <label>
                Accept responses
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as RsvpMode)}
                >
                  <option value="closed">Closed</option>
                  <option value="declines_only">Early declines only</option>
                  <option value="open">Yes and no responses</option>
                </select>
              </label>
              <button
                disabled={busy || mode === data.mode}
                onClick={() =>
                  work(async () => {
                    await request('/api/rsvp/admin', {
                      action: 'mode',
                      mode,
                      revision: data.revision,
                    });
                    await load();
                    invalidate();
                    setMessage('RSVP availability updated.');
                  })
                }
              >
                Save availability
              </button>
            </div>
          </section>
          <section className={styles.card}>
            <h2>Import guests</h2>
            <p>
              Upload a CSV to add parties, guests and invitations. Blank fields
              preserve existing information. Imports never erase responses or
              remove guests. Use the exported guest IDs when correcting names.
            </p>
            <a
              className={styles.button}
              download="rsvp-template.csv"
              href="/rsvp-template.csv"
            >
              Download CSV template
            </a>
            <label>
              Guest CSV
              <input
                type="file"
                accept=".csv,text/csv"
                disabled={busy}
                onChange={(e) => {
                  invalidate();
                  setCsv('');
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.size > 1_000_000) {
                      setError('CSV must be smaller than 1 MB.');
                      return;
                    }
                    void file.text().then(setCsv);
                  }
                }}
              />
            </label>
            <p>
              Invite imported guests to these events. An individual row’s{' '}
              <code>event_ids</code> overrides this selection.
            </p>
            <div className={styles.row}>
              {data.events.map((e) => (
                <label className={styles.check} key={e.id}>
                  <input
                    type="checkbox"
                    checked={events.includes(e.id)}
                    onChange={(v) => {
                      setEvents((current) =>
                        v.target.checked
                          ? [...current, e.id]
                          : current.filter((id) => id !== e.id),
                      );
                      invalidate();
                    }}
                  />
                  {e.name}
                </label>
              ))}
            </div>
            <button
              disabled={busy || !csv}
              onClick={() =>
                work(async () => {
                  setPreview(
                    await request<ImportPlan>('/api/rsvp/admin', {
                      action: 'preview',
                      csv,
                      eventIds: events,
                    }),
                  );
                  attempt.current = crypto.randomUUID();
                })
              }
            >
              Preview import
            </button>
            {preview && (
              <div className={styles.message}>
                <p>
                  {preview.rows} guests in the CSV. Add {preview.partiesAdded}{' '}
                  parties, {preview.guestsAdded} guests and{' '}
                  {preview.invitationsAdded} invitations. Update{' '}
                  {preview.partiesUpdated} parties and {preview.guestsUpdated}{' '}
                  guests.
                </p>
                {preview.warnings.length > 0 && (
                  <ul>
                    {preview.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                )}
                <button
                  disabled={busy}
                  onClick={() =>
                    work(async () => {
                      await request('/api/rsvp/admin', {
                        action: 'import',
                        csv,
                        eventIds: events,
                        hash: preview.hash,
                        revision: preview.revision,
                        requestId: attempt.current,
                      });
                      invalidate();
                      await load();
                      setMessage(
                        'Import saved. Existing responses have been preserved.',
                      );
                    })
                  }
                >
                  Apply import
                </button>
              </div>
            )}
          </section>
          <section className={styles.card}>
            <h2>Guest responses</h2>
            <div className={styles.links}>
              <a href="/api/rsvp/admin/export?format=csv">
                Export guest list CSV
              </a>
              <a href="/api/rsvp/admin/export">Download full RSVP snapshot</a>
              <button
                className={styles.secondary}
                disabled={busy}
                onClick={() => work(load)}
              >
                Refresh responses
              </button>
            </div>
            <p>
              {new Set(data.guests.map((g) => g.guest_id)).size} guests ·{' '}
              {data.guests.filter((g) => g.attendance === 'yes').length}{' '}
              attending responses ·{' '}
              {data.guests.filter((g) => g.attendance === 'no').length} declines
            </p>
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Party</th>
                    <th>Guest</th>
                    <th>Event</th>
                    <th>Response</th>
                    <th>Meal / dietary needs</th>
                  </tr>
                </thead>
                <tbody>
                  {data.guests.map((g, i) => (
                    <tr key={i}>
                      <td>{g.display_name || g.party_id}</td>
                      <td>
                        {g.first_name
                          ? `${g.first_name} ${g.last_name}`
                          : 'Unnamed plus-one'}
                      </td>
                      <td>{g.event_name || 'No invitations'}</td>
                      <td>{g.attendance || 'Awaiting response'}</td>
                      <td>
                        {[g.meal_choice, g.dietary_restrictions]
                          .filter(Boolean)
                          .join(' · ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
