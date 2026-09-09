"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import styles from "@/app/wedding_v1/wedding.module.css";

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
  ["Itinerary", "/wedding_v1/our-wedding"],
  ["Accommodations", "/wedding_v1/accommodations"],
  ["Travel", "/wedding_v1/transportation"],
  ["Plan your trip", "/wedding_v1/plan-your-trip"],
  ["Gallery", "/wedding_v1/gallery"],
  ["FAQ", "/wedding_v1/faq"],
  ["Registry", "/wedding_v1/registry"],
];

const footerIllustrations: Record<string, string> = {
  "/wedding_v1": "wedding-river-float.png",
  "/wedding_v1/our-wedding": "footer-campfire-separate-logs.png",
  "/wedding_v1/accommodations": "wedding-sun-loungers.png",
  "/wedding_v1/transportation": "footer-morning-yoga.png",
  "/wedding_v1/plan-your-trip": "footer-colonel-armstrong.png",
  "/wedding_v1/gallery": "footer-california-poppies.png",
  "/wedding_v1/faq": "footer-lawn-games.png",
  "/wedding_v1/registry": "wedding-wine-picnic.png",
};

export default function WeddingShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingIn, setSigningIn] = useState(false);
  const unlocked = useSyncExternalStore(subscribe, readAccess, () => false);
  const fullHeightGallery = unlocked && pathname === "/wedding_v1/gallery";
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [openMenuPath, setOpenMenuPath] = useState<string | null>(null);
  const menuOpen = openMenuPath === pathname;
  const rsvpDialog = useRef<HTMLDialogElement>(null);

  async function enter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password") || "");
    if (password.trim().toLowerCase() !== PASSWORD.trim().toLowerCase()) {
      setSigningIn(true);
      try {
        const response = await fetch('/api/wedding/admin/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
        if (response.ok) { setAccess(true); setError(''); router.push('/wedding_v1/admin'); return; }
        setError('Not quite! Try the password we shared with you.');
      } catch { setError('Could not sign in. Please try again.'); }
      finally { setSigningIn(false); }
      return;
    }
    setError("");
    setAccess(true);
  }

  return <div className={`${styles.site} ${fullHeightGallery ? styles.gallerySite : ""}`}>
    {!unlocked && pathname !== "/wedding_v1/admin" ? <main className={styles.gate}>
      <Link href="/" className={styles.gateBrand}>Will + Jackie</Link>
      <div className={styles.gateCard}>
        <h1>Before we begin...</h1>
        <p className={styles.gateIntro}>Enter the password from your invitation to join us.</p>
        <form onSubmit={enter} className={styles.passwordForm}>
          <label htmlFor="wedding-password">The wedding password</label>
          <div className={styles.passwordField}>
            <input id="wedding-password" name="password" type={showPassword ? "text" : "password"} placeholder="Our little secret" autoComplete="current-password" autoCapitalize="none" spellCheck={false} required aria-invalid={Boolean(error)} aria-describedby={error ? "password-error" : undefined} onChange={() => setError("")} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "Hide" : "Show"}</button>
          </div>
          {error && <p id="password-error" className={styles.error} role="alert">{error}</p>}
          <button className={styles.button} type="submit" disabled={signingIn}>Come on in <span aria-hidden="true">↗</span></button>
        </form>
        <p className={styles.smallNote}>Need the password? Just ask Will or Jackie.</p>
      </div>
      <p className={styles.gateDate}>June 5, 2027 · Guerneville, California</p>
    </main> : <>
      <a className={styles.skipLink} href="#wedding-main">Skip to content</a>
      <header className={styles.header}>
        <Link href="/wedding_v1" className={styles.brand} aria-label="Will and Jackie wedding home"><span className={styles.brandIcon} aria-hidden="true"/><span>Will + Jackie</span></Link>
        <button className={styles.menuButton} onClick={() => setOpenMenuPath(menuOpen ? null : pathname)} aria-expanded={menuOpen} aria-controls="wedding-navigation">{menuOpen ? "Close −" : "Menu +"}</button>
        <nav id="wedding-navigation" aria-label="Wedding" className={`${styles.nav} ${menuOpen ? styles.navOpen : ""}`}>
          {navigation.map(([label, href]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} onClick={() => setOpenMenuPath(null)}><span className={styles.navSizer} aria-hidden="true">{label}</span><span>{label}</span></Link>)}
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
      <footer className={`${styles.footer} ${styles.watercolorFooter}`}>
        <div className={styles.footerArtwork} aria-hidden="true">
          <Image src={`/wedding_v1-assets/${footerIllustrations[pathname] ?? "wedding-river-float.png"}`} alt="" width={1536} height={1024} sizes="280px" />
        </div>
        <Link href="/wedding_v1" className={styles.footerBrand}>Will + Jackie</Link>
        <p>June 5, 2027</p>
      </footer>
    </>}
  </div>;
}
