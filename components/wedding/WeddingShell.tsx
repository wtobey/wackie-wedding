"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import styles from "@/app/wedding/wedding.module.css";

// Intentionally a lightweight guest gate, not authentication or private photo storage.
const PASSWORD = process.env.NEXT_PUBLIC_WEDDING_PASSWORD || "getwackie";
const STORAGE_KEY = "wackie-wedding-access";
const ACCESS_EVENT = "wackie-access-change";
let memoryAccess = false;
function readAccess() {
  try { return localStorage.getItem(STORAGE_KEY) === PASSWORD; }
  catch { return memoryAccess; }
}
function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(ACCESS_EVENT, listener);
  return () => { window.removeEventListener("storage", listener); window.removeEventListener(ACCESS_EVENT, listener); };
}
function setAccess(value: boolean) {
  memoryAccess = value;
  try {
    if (value) localStorage.setItem(STORAGE_KEY, PASSWORD);
    else localStorage.removeItem(STORAGE_KEY);
  } catch { /* Guests can still enter when browser storage is disabled. */ }
  window.dispatchEvent(new Event(ACCESS_EVENT));
}
const navigation = [
  ["Itinerary", "/wedding/our-wedding"],
  ["Accommodations", "/wedding/accommodations"],
  ["Transportation", "/wedding/transportation"],
  ["Plan your trip", "/wedding/plan-your-trip"],
  ["Gallery", "/wedding/gallery"],
  ["FAQ", "/wedding/faq"],
];

export default function WeddingShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const unlocked = useSyncExternalStore(subscribe, readAccess, () => false);
  const fullHeightGallery = unlocked && pathname === "/wedding/gallery";
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [openMenuPath, setOpenMenuPath] = useState<string | null>(null);
  const menuOpen = openMenuPath === pathname;
  const rsvpDialog = useRef<HTMLDialogElement>(null);

  function enter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password") || "");
    if (password.trim().toLowerCase() !== PASSWORD.trim().toLowerCase()) {
      setError("Not quite! Try the password we shared with you.");
      return;
    }
    setError("");
    setAccess(true);
  }

  return <div className={`${styles.site} ${fullHeightGallery ? styles.gallerySite : ""}`}>
    {!unlocked ? <main className={styles.gate}>
      <Link href="/" className={styles.gateBrand}>will + jackie</Link>
      <div className={styles.gateCard}>
        <h1>Before we begin...</h1>
        <p className={styles.gateIntro}>a little password, and you’re part of the party.</p>
        <form onSubmit={enter} className={styles.passwordForm}>
          <label htmlFor="wedding-password">The wedding password</label>
          <div className={styles.passwordField}>
            <input id="wedding-password" name="password" type={showPassword ? "text" : "password"} placeholder="Our little secret" autoComplete="current-password" autoCapitalize="none" spellCheck={false} required aria-invalid={Boolean(error)} aria-describedby={error ? "password-error" : undefined} onChange={() => setError("")} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "Hide" : "Show"}</button>
          </div>
          {error && <p id="password-error" className={styles.error} role="alert">{error}</p>}
          <button className={styles.button} type="submit">Come on in <span aria-hidden="true">↗</span></button>
        </form>
        <p className={styles.smallNote}>Need the password? Just ask Will or Jackie.</p>
      </div>
      <p className={styles.gateDate}>June 5, 2027 · Guerneville, California</p>
    </main> : <>
      <a className={styles.skipLink} href="#wedding-main">Skip to content</a>
      <header className={styles.header}>
        <Link href="/wedding" className={styles.brand} aria-label="Will and Jackie wedding home"><span className={styles.brandIcon} aria-hidden="true"/><span>Will + Jackie</span></Link>
        <button className={styles.menuButton} onClick={() => setOpenMenuPath(menuOpen ? null : pathname)} aria-expanded={menuOpen} aria-controls="wedding-navigation">{menuOpen ? "Close −" : "Menu +"}</button>
        <nav id="wedding-navigation" aria-label="Wedding" className={`${styles.nav} ${menuOpen ? styles.navOpen : ""}`}>
          {navigation.map(([label, href]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} onClick={() => setOpenMenuPath(null)}>{label}</Link>)}
          <button type="button" className={styles.rsvpNav} aria-haspopup="dialog" onClick={() => { setOpenMenuPath(null); rsvpDialog.current?.showModal(); }}>RSVP</button>
        </nav>
      </header>
      <main id="wedding-main" tabIndex={-1}>{children}</main>
      <dialog ref={rsvpDialog} className={styles.rsvpDialog} aria-labelledby="rsvp-message" aria-describedby="rsvp-invitation-note" onClick={event => { if (event.target === event.currentTarget) rsvpDialog.current?.close(); }}>
        <div className={styles.rsvpDialogContent}>
          <h2 id="rsvp-message">{"Not so fast, we're not quite ready for you yet!"}</h2>
          <p id="rsvp-invitation-note">Check back when you get your invitation</p>
          <button type="button" className={styles.rsvpDialogClose} autoFocus onClick={() => rsvpDialog.current?.close()}>Got it</button>
        </div>
      </dialog>
      {!fullHeightGallery && <footer className={styles.footer}>
        <Link href="/wedding" className={styles.footerBrand}>Will + Jackie</Link>
        <p>June 5, 2027 · Meet us by the river.</p>
      </footer>}
    </>}
  </div>;
}
