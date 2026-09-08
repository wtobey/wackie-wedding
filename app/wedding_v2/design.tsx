import Link from "next/link";
import styles from "./wedding-v2.module.css";

export const pages = [
  { slug: "weekend", label: "The Weekend", sections: ["Welcome", "Ceremony", "Reception"] },
  { slug: "stay", label: "Where to Stay", sections: ["Accommodations", "Reservations"] },
  { slug: "travel", label: "Getting There", sections: ["Travel", "Directions"] },
  { slug: "gallery", label: "Gallery", sections: [] },
  { slug: "faq", label: "Questions & Answers", sections: [] },
  { slug: "rsvp", label: "RSVP", sections: [] },
];

export function Botanical({ className = "" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 400 500" fill="none" aria-hidden="true">
    <g stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M198 470C171 383 239 302 214 208M194 427C129 362 119 292 93 238M197 386C255 348 295 281 302 231M204 346C153 285 169 198 153 144"/>
      <path d="M192 402C144 410 118 385 107 355C153 351 176 370 192 402ZM208 363C251 376 279 355 290 327C252 322 224 337 208 363ZM137 337C92 334 75 314 67 288C111 287 127 309 137 337ZM222 300C263 299 280 278 282 257C248 262 231 278 222 300ZM177 270C141 267 128 248 125 222C158 233 172 246 177 270Z"/>
      <g transform="translate(210 161)">
        <path d="M0 30C-52 65-77 24-43 3C-88-18-54-65-20-36C-29-89 26-87 22-37C61-72 92-23 44 1C83 26 48 67 12 32"/>
        <ellipse rx="20" ry="23"/><path d="M-7-12L-3 12M4-13L7 10M-13-3L12-2M-12 5L13 6"/>
      </g>
      <g transform="translate(92 216) rotate(-24)"><path d="M0 20C-41 39-53 8-25-5C-51-38-15-56-3-26C16-58 43-31 21-9C54 8 31 38 8 21"/><circle r="11"/></g>
      <g transform="translate(308 206) rotate(22)"><path d="M0 22C-37 44-60 14-30-5C-58-31-23-60-5-30C9-66 48-39 24-13C60 2 42 37 14 24"/><circle r="12"/></g>
      <path d="M152 151C129 133 125 116 139 98C158 109 164 131 152 151ZM153 144C177 121 178 101 166 89C153 102 147 125 153 144"/>
    </g>
  </svg>;
}

export function Shell({ children }: { children: React.ReactNode }) {
  return <div className={styles.site}>
    <a className={styles.skip} href="#v2-main">Skip to content</a>
    <header className={styles.header}>
      <Link className={styles.wordmark} href="/wedding_v2">The Wedding<span aria-hidden="true">✳</span></Link>
      <nav className={styles.nav} aria-label="Main navigation">
        {pages.map(p => <Link key={p.slug} href={`/wedding_v2/${p.slug}`}>{p.slug === "stay" ? "Stay" : p.slug === "travel" ? "Travel" : p.slug === "faq" ? "FAQ" : p.label}</Link>)}
      </nav>
      <details className={styles.mobileMenu}><summary>Menu <span aria-hidden="true">+</span></summary><nav aria-label="Mobile navigation">{pages.map(p => <Link key={p.slug} href={`/wedding_v2/${p.slug}`}>{p.label}</Link>)}</nav></details>
    </header>
    <main id="v2-main">{children}</main>
    <footer className={styles.footer}><Link href="/wedding_v2">The Wedding</Link><span aria-hidden="true">✳</span><Link href="/wedding_v2/rsvp">RSVP ↗</Link></footer>
  </div>;
}
