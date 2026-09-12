"use client";

import Link from "next/link";
import WeddingAnalytics from "./WeddingAnalytics";
import { trackWeddingEvent } from "@/lib/analytics/client";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import styles from "@/app/wedding_v1/wedding.module.css";
import invitationStyles from "./floating-invitation.module.css";

// Intentionally a lightweight guest gate, not authentication or private photo storage.
const PASSWORD = process.env.NEXT_PUBLIC_WEDDING_PASSWORD || "getwackie";
const STORAGE_KEY = "wackie-wedding-access";
const ACCESS_EVENT = "wackie-access-change";
function readHeaderProgress() {
  const panels = document.querySelectorAll('#wedding-main, [data-photo-scroll]');
  const offset = Math.max(window.scrollY, document.body.scrollTop, document.documentElement.scrollTop, ...Array.from(panels, panel => panel.scrollTop));
  return Math.min(1, Math.max(0, offset / 120));
}
let memoryAccess = false;
function readAccess() {
  if (typeof window !== "undefined" && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname) && new URLSearchParams(window.location.search).has("password")) return false;
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
  ["Itinerary", "/our-wedding"],
  ["Accommodations", "/accommodations"],
  ["Travel", "/transportation"],
  ["Plan your trip", "/plan-your-trip"],
  ["Gallery", "/gallery"],
  ["FAQ", "/faq"],
  ["Registry", "/registry"],
];

const footerIllustrations: Record<string, string> = {
  "/": "wedding-river-float.png",
  "/our-wedding": "footer-campfire-separate-logs.png",
  "/accommodations": "wedding-sun-loungers.png",
  "/transportation": "footer-morning-yoga.png",
  "/plan-your-trip": "footer-colonel-armstrong.png",
  "/gallery": "footer-california-poppies.png",
  "/faq": "footer-lawn-games.png",
  "/registry": "wedding-wine-picnic.png",
};

export default function WeddingShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingIn, setSigningIn] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const unlocked = useSyncExternalStore(subscribe, readAccess, () => false);
  const siteRef = useRef<HTMLDivElement>(null);
  const gateRef = useRef<HTMLElement>(null);
  const passwordCardRef = useRef<HTMLDivElement>(null);
  const passwordCardBounds = useRef<DOMRect | null>(null);
  const passwordMoverRef = useRef<HTMLDivElement>(null);
  const passwordRotorRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!unlocking) return;
    const site = siteRef.current;
    const gate = gateRef.current;
    const front = passwordCardRef.current;
    const source = passwordCardBounds.current;
    const mover = passwordMoverRef.current;
    const rotor = passwordRotorRef.current;
    const back = site?.querySelector<HTMLElement>('[data-invitation-turn]');
    if (!site || !gate || !front || !source || !back || !mover || !rotor) return;

    // One moving frame and one 3D rotor: the existing form is the front,
    // with the invitation permanently rotated 180 degrees on the back.
    Object.assign(mover.style, {
      position: 'fixed', left: `${source.left}px`, top: `${source.top}px`,
      width: `${source.width}px`, height: `${source.height}px`, margin: '0',
    });
    Object.assign(front.style, { width: '100%', height: '100%', margin: '0' });
    mover.style.setProperty('--password-card-aspect', String(source.height / source.width));
    const animations: Animation[] = [];
    let cancelled = false;
    const animate = (element: HTMLElement, frames: Keyframe[], options: KeyframeAnimationOptions) => {
      const animation = element.animate(frames, { fill: 'both', ...options });
      animations.push(animation);
      return animation.finished;
    };
    async function transition() {
      await Promise.all([back!.querySelector('img'), rotor!.querySelector('img')]
        .map(image => image?.decode()));
      if (cancelled) return;
      const target = back!.getBoundingClientRect();
      const dx = source!.left + source!.width / 2 - target.left - target.width / 2;
      const dy = source!.top + source!.height / 2 - target.top - target.height / 2;
      const options = { duration: 1800, easing: 'cubic-bezier(.45, 0, .2, 1)' };
      await Promise.all([
        animate(mover!, [
          { transform: 'translate(0px, 0px) scale(1, 1)' },
          { transform: `translate(${-dx}px, ${-dy}px) scale(${target.width / source!.width}, ${target.height / source!.height})` },
        ], options),
        animate(rotor!, [
          { transform: 'rotateY(0deg)' },
          { transform: 'rotateY(180deg)' },
        ], options),
        // Explicitly hide the far face at the edge as well as using
        // backface-visibility, including its outline and shadow in Safari.
        animate(front!, [
          { visibility: 'visible', offset: 0 },
          { visibility: 'visible', offset: 0.4999 },
          { visibility: 'hidden', offset: 0.5 },
          { visibility: 'hidden', offset: 1 },
        ], options),
      ]);
      if (cancelled) return;
      // Both images use the same artwork styling. Hand off at the measured
      // destination while its floating/tilt effects are still paused.
      back!.style.visibility = 'visible';
      mover!.style.visibility = 'hidden';
      const surroundings = site!.querySelectorAll<HTMLElement>(`.${styles.headerSpace}, footer, .${styles.hero} > :not([data-home-invitation])`);
      await Promise.all([
        animate(gate!, [{ opacity: 1 }, { opacity: 0 }], { duration: 700 }),
        ...Array.from(surroundings, element => animate(element, [{ opacity: 0 }, { opacity: 1 }], { duration: 700 })),
      ]);
      if (!cancelled) setUnlocking(false);
    }
    void transition().catch(() => {
      // A missing image or interrupted animation must never block entry.
      if (!cancelled) setUnlocking(false);
    });
    return () => {
      cancelled = true;
      animations.forEach(animation => animation.cancel());
      front.removeAttribute('style');
      mover.removeAttribute('style');
      back.style.removeProperty('visibility');
    };
  }, [unlocking]);
  const headerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    let frame = 0;
    let previous = -1;
    const update = () => {
      frame = 0;
      const progress = readHeaderProgress();
      if (progress === previous) return;
      previous = progress;
      // Scroll animation stays outside React's render cycle.
      header.style.setProperty('--header-progress', String(progress));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      cancelAnimationFrame(frame);
    };
  }, [pathname, unlocked]);
  const fullHeightGallery = unlocked && pathname === "/gallery";
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [openMenuPath, setOpenMenuPath] = useState<string | null>(null);
  const menuOpen = openMenuPath === pathname;

  async function enter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password") || "");
    if (password.trim().toLowerCase() !== PASSWORD.trim().toLowerCase()) {
      setSigningIn(true);
      try {
        const response = await fetch('/api/wedding/admin/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
        if (response.ok) { setAccess(true); setError(''); router.push('/admin'); return; }
        setError('Not quite! Try the password we shared with you.');
      } catch { setError('Could not sign in. Please try again.'); }
      finally { setSigningIn(false); }
      return;
    }
    trackWeddingEvent("guest_access_granted");
    setError("");
    if (window.location.search) window.history.replaceState(null, "", window.location.pathname);
    if (pathname === "/") {
      passwordCardBounds.current = passwordCardRef.current?.getBoundingClientRect() ?? null;
      setUnlocking(true);
    }
    setAccess(true);
  }

  return <div ref={siteRef} data-unlocking={unlocking} className={`${styles.site} ${fullHeightGallery ? styles.gallerySite : ""} ${unlocking ? styles.siteUnlocking : ""}`}>
    <WeddingAnalytics pathname={pathname} unlocked={unlocked}/>
    {((!unlocked && !pathname.startsWith("/admin")) || unlocking) && <main ref={gateRef} className={styles.gate} inert={unlocking}>
      <Link href="/" className={styles.gateBrand}>Will + Jackie</Link>
      <div ref={passwordMoverRef} className={styles.gateWelcome}>
      <div ref={passwordRotorRef} className={styles.passwordRotor}>
      <div ref={passwordCardRef} className={styles.gateCard}>
        <h1>We can&apos;t wait to<br /><span style={{ whiteSpace: "nowrap" }}>see you in Sonoma!</span></h1>
        <p className={styles.gateIntro}>Please enter our wedding website password.</p>
        <form onSubmit={enter} className={styles.passwordForm}>
          <div className={styles.passwordField}>
            <input id="wedding-password" name="password" aria-label="Password" type={showPassword ? "text" : "password"} autoComplete="current-password" autoCapitalize="none" spellCheck={false} required aria-invalid={Boolean(error)} aria-describedby={error ? "password-error" : undefined} onChange={() => setError("")} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "Hide" : "Show"}</button>
          </div>
          {error && <p id="password-error" className={styles.error} role="alert">{error}</p>}
          <button className={styles.button} type="submit" disabled={signingIn}>Submit</button>
        </form>
        <p className={styles.smallNote}>Need the password? Try checking your save the date and reach out to Will or Jackie if you can&apos;t find it.</p>
      </div>
      {unlocking && <div className={`${styles.passwordBack} ${invitationStyles.invitationSurface}`} aria-hidden="true">
        <Image className={`${invitationStyles.artwork} ${styles.passwordBackArtwork}`} src="/wedding_v1-assets/wedding-save-the-date-ffa93f-e5680a.svg" alt="" width={800} height={800} unoptimized preload />
      </div>}
      </div>
      </div>
      <p className={styles.gateDate}>June 5, 2027 | Guerneville, California</p>
    </main>}
    {(unlocked || pathname.startsWith("/admin")) && <>
      <a className={styles.skipLink} href="#wedding-main">Skip to content</a>
      <div className={styles.headerSpace}>
      <header ref={headerRef} className={`${styles.header} ${styles.pinnedHeader}`}>
        <Link href="/" className={styles.brand} aria-label="Will and Jackie wedding home"><span className={styles.brandIcon} aria-hidden="true"/><span>Will + Jackie</span></Link>
        <button className={styles.menuButton} onClick={() => setOpenMenuPath(menuOpen ? null : pathname)} aria-expanded={menuOpen} aria-controls="wedding-navigation">{menuOpen ? "Close −" : "Menu +"}</button>
        <nav id="wedding-navigation" aria-label="Wedding" className={`${styles.nav} ${menuOpen ? styles.navOpen : ""}`}>
          {navigation.map(([label, href]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} onClick={() => setOpenMenuPath(null)}><span className={styles.navSizer} aria-hidden="true">{label}</span><span>{label}</span></Link>)}
          <Link href="/rsvp" className={styles.rsvpNav} onClick={() => { setOpenMenuPath(null); trackWeddingEvent("rsvp_opened"); }}>RSVP</Link>
        </nav>
      </header>
      </div>
      <main id="wedding-main" tabIndex={-1}>{children}</main>

      <footer className={`${styles.footer} ${styles.watercolorFooter}`}>
        <div className={styles.footerArtwork} aria-hidden="true">
          <Image src={`/wedding_v1-assets/${footerIllustrations[pathname] ?? "wedding-river-float.png"}`} alt="" width={1536} height={1024} sizes="280px" />
        </div>
        <Link href="/" className={styles.footerBrand}>Will + Jackie</Link>
        <p>June 5, 2027</p>
      </footer>
    </>}
  </div>;
}
