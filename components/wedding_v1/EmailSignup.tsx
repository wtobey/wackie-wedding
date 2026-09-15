'use client';

import { useRef, useState, useSyncExternalStore, type FormEvent } from 'react';
import { trackWeddingEvent } from '@/lib/analytics/client';
import styles from './email-signup.module.css';

export const EMAIL_SUBSCRIBED_KEY = 'wackie-wedding-email-subscribed';
const EMAIL_SUBSCRIBED_EVENT = 'wackie-email-subscribed-change';
function readEmailSubscribed() {
  try { return localStorage.getItem(EMAIL_SUBSCRIBED_KEY) === 'true'; } catch { return false; }
}
function subscribeEmailSubscribed(listener: () => void) {
  window.addEventListener('storage', listener);
  window.addEventListener(EMAIL_SUBSCRIBED_EVENT, listener);
  return () => {
    window.removeEventListener('storage', listener);
    window.removeEventListener(EMAIL_SUBSCRIBED_EVENT, listener);
  };
}
type Props = { source: 'password' | 'accommodations'; onContinue?: () => void };
export default function EmailSignup({ source, onContinue }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [passwordSubmitted, setPasswordSubmitted] = useState(false);
  const inFlight = useRef(false);
  const id = `email-signup-${source}`;
  const saved = useSyncExternalStore(subscribeEmailSubscribed, readEmailSubscribed, () => false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    setError('');
    const email = String(new FormData(event.currentTarget).get('email') || '');
    try {
      const response = await fetch('/api/wedding/subscribers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }), signal: AbortSignal.timeout(12000),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Couldn’t save your email. Please try again.');
      trackWeddingEvent('email_subscribed');
      try {
        localStorage.setItem(EMAIL_SUBSCRIBED_KEY, 'true');
      } catch { /* The server still recorded the signup. */ }
      if (onContinue) {
        setPasswordSubmitted(true);
        window.setTimeout(onContinue, 900);
        return;
      }
      window.dispatchEvent(new Event(EMAIL_SUBSCRIBED_EVENT));
    } catch (err) {
      setError(err instanceof Error && err.name !== 'TimeoutError' ? err.message : 'That took too long. Please try again, or sign up later.');
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }
  return <div className={`${styles.signup} ${source === 'password' ? styles.passwordSignup : ''}`}>
    {saved && source === 'accommodations' ? <>
      <div className={styles.successField} role="status"><span>You&apos;re on the list!</span><span className={styles.successMark} aria-hidden="true">✓</span></div>
      {onContinue && <button type="button" className={styles.submit} onClick={onContinue}>Continue to the website</button>}
    </> : <>
      <form onSubmit={submit}>
        <input id={id} name="email" type="email" placeholder="Email address" aria-label="Email address" autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={254} required disabled={saving} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} className="ph-no-capture" onChange={() => setError('')}/>
        {error && <p id={`${id}-error`} className={styles.error} role="alert">{error}</p>}
        {source === 'password' && <button type="submit" className={styles.submit} disabled={saving || passwordSubmitted}>{passwordSubmitted ? 'You\'re on the list!' : saving ? 'Saving…' : 'Submit'}</button>}
      </form>
      {onContinue && <button type="button" className={styles.skip} onClick={onContinue}>Skip for now</button>}
    </>}
  </div>;
}
