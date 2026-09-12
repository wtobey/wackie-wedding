'use client';
import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type {
  ImportPlan,
  RsvpMode,
  RsvpEvent,
  SnapshotSummary,
  RollbackPlan,
} from '@/lib/rsvp/types';
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
  snapshots: SnapshotSummary[];
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
  const [rollback, setRollback] = useState<RollbackPlan | null>(null);
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
    setRollback(null);
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
              remove guests. Use the exported guest IDs when correcting names. A
              complete RSVP snapshot is saved automatically before every import.
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
                        'Import saved with before-and-after snapshots. Existing responses have been preserved.',
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
            <h2>Snapshots &amp; rollback</h2>
            <p>
              Every import saves the complete RSVP data before and after the
              change. You can undo imports in reverse order. Guest responses are
              preserved; rollback will stop if it would hide a response or
              overwrite a newer edit.
            </p>
            <button
              disabled={busy}
              onClick={() =>
                work(async () => {
                  await request('/api/rsvp/admin', {
                    action: 'snapshot',
                    requestId: crypto.randomUUID(),
                  });
                  await load();
                  setMessage('Complete RSVP snapshot saved.');
                })
              }
            >
              Save snapshot now
            </button>
            {data.snapshots.length === 0 ? (
              <p>
                No saved snapshots yet. Imports made before this feature was
                added cannot be undone here.
              </p>
            ) : (
              <div className={styles.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th>Saved</th>
                      <th>Snapshot</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.snapshots.map((s) => (
                      <tr key={s.id}>
                        <td>{new Date(s.createdAt).toLocaleString()}</td>
                        <td>
                          {
                            {
                              manual: 'Manual snapshot',
                              before_import: 'Before guest import',
                              after_import: 'After guest import',
                              before_rollback: 'Before rollback',
                            }[s.kind]
                          }
                          {s.rolledBack && s.kind === 'before_import'
                            ? ' · Rolled back'
                            : ''}
                        </td>
                        <td>
                          <div className={styles.actions}>
                            <a
                              href={`/api/rsvp/admin/export?snapshot=${encodeURIComponent(s.id)}`}
                            >
                              Download
                            </a>
                            {s.canRollback && (
                              <button
                                disabled={busy}
                                onClick={() =>
                                  work(async () => {
                                    setRollback(null);
                                    setRollback(
                                      await request<RollbackPlan>(
                                        '/api/rsvp/admin',
                                        {
                                          action: 'preview_rollback',
                                          snapshotId: s.id,
                                        },
                                      ),
                                    );
                                  })
                                }
                              >
                                Preview rollback
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {rollback && (
              <div className={styles.message}>
                <h3>Review rollback</h3>
                <p>
                  Restore details for {rollback.partiesRestored} parties and{' '}
                  {rollback.guestsRestored} guests. Remove{' '}
                  {rollback.partiesArchived} parties, {rollback.guestsArchived}{' '}
                  guests and {rollback.invitationsArchived} invitations added by
                  the import from the active guest list. The original records
                  stay in history.
                </p>
                <p>
                  {rollback.responsesPreserved} recorded event responses will be
                  kept. A new snapshot is saved before rollback.
                </p>
                {rollback.conflicts.length > 0 ? (
                  <>
                    <p>Rollback is blocked because of newer changes:</p>
                    <ul>
                      {rollback.conflicts.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <button
                    disabled={busy}
                    onClick={() =>
                      work(async () => {
                        await request('/api/rsvp/admin', {
                          action: 'rollback',
                          snapshotId: rollback.snapshotId,
                          revision: rollback.revision,
                          hash: rollback.hash,
                        });
                        invalidate();
                        await load();
                        setMessage(
                          'Guest import rolled back. Responses and history have been preserved.',
                        );
                      })
                    }
                  >
                    Confirm rollback
                  </button>
                )}
                <button
                  className={styles.secondary}
                  disabled={busy}
                  onClick={() => setRollback(null)}
                >
                  Cancel
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
