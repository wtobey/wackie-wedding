# Plan: Port wackie-wedding → Next.js 16, add `/river` homepage

Self-contained spec. Anyone can pick this up with only this file + the codebase.

## Context
- `wackie-v2/` is a fresh `create-next-app` (Next.js 16.2.10, React 19, App Router).
- The prior project `github.com/wtobey/wackie-wedding` is a **Vite + React 18 + Supabase** app:
  `App = <SecurityGate><PolaroidFall/></SecurityGate>`. Click/tap drops "polaroids" that
  float, sway, and fade; optional "leave a message" flow; content pulled from Supabase with
  **graceful fallbacks** (generated SVGs / static strings) when Supabase env is absent.
- Brand: couple is **Will + Jackie = "Wackie"**, domain `wackie.wedding`, font **Fraunces**,
  palette warm off-white `#FAF9F7` + peach `#E8A87C`.

## Goal
Two full-screen experiences sharing one Next.js app:
- `/` — faithful port of the original (security gate → polaroid fall).
- `/river` — NEW whimsical, low-poly, **aerial** river: colorful ring-tubes carry little people
  downstream, "Wackie Wedding" headline floats above the water, low-poly grass banks + trees +
  lily pads. **Drag ripples the water and pushes tubes out of the way.**

## Next.js 16 gotchas (verified against node_modules/next/dist/docs)
- Root `app/layout.tsx` (Server Component) owns `<html>`/`<body>`, `metadata`, and `viewport`.
  `themeColor` lives on the **`viewport`** export, not `metadata`.
- Interactive code needs `'use client'` (state, effects, `window`, `localStorage`, rAF, canvas).
- `next/font/google` **hashes the family name** — a literal `font-family: "Fraunces"` will NOT
  resolve. Load Fraunces with `variable: '--font-fraunces'`, put `fraunces.variable` on `<html>`,
  and reference `var(--font-fraunces)` everywhere (globals + inline styles).
- Client env must be prefixed `NEXT_PUBLIC_` (was `VITE_` / `import.meta.env`).

## Work
1. **Shared infra** — `app/layout.tsx` (Fraunces + full OG metadata + viewport themeColor),
   `app/globals.css` (reset, `--font-fraunces` default, off-white bg, no-scroll),
   `lib/supabase.ts` (`NEXT_PUBLIC_*`, null when unset), `.env.local.example`.
2. **Port `/`** — `components/{SecurityGate,PolaroidFall,MessageInput,TypingMessage}.tsx` +
   `hooks/*` + `data/typingMessages.ts`, all as Client Components. Convert env refs and the
   `"Fraunces"` font refs. **Bug fix:** `useSecurityGate` currently sets `isVerified=false` and
   dead-ends when Supabase is unconfigured (no way past the gate) — flip to `isVerified=true`
   ("skip when no backend"), matching the code's own comment and its "no questions → skip" branch.
   `app/page.tsx = <SecurityGate><PolaroidFall/></SecurityGate>`.
3. **Build `/river`** — `components/RiverScene.tsx`, Canvas 2D + rAF. See design below.
4. **Verify** — sanitize stray `import.meta.env` in copied `scripts/`; `next dev` serves `/` and
   `/river` with no SSR/runtime errors. Offer browser check (don't launch unprompted).

## `/river` design (RiverScene.tsx)
Aerial top-down. River flows top→bottom along a gently winding sine centerline.
- **Water**: layered teal/blue bands with animated faceted (low-poly) highlights.
- **Banks**: grass green filled with scattered translucent triangles → faceted low-poly look.
- **Trees**: clusters of 2–3 flat-shaded green triangles + soft offset shadow, scattered on banks.
- **Lily pads**: small green discs w/ a dot flower, drifting on the water (whimsy).
- **Tubes**: multicolored torus rings (coral/sun/mint/sky/lilac/peach/pink), each with a tiny
  top-down person (head + shoulders). Drift downstream following the current, bob + slowly spin.
  Recycle top↔bottom for a continuous float-by.
- **Headline overlay** (HTML, `pointer-events:none` so drag passes through): "Wackie Wedding" in
  Fraunces + a rotating whimsical subtitle (from the old `staticTypingMessages`: "Will + Jackie =
  WACKIE", "Are you ready to get WACKIE?!", …) + a bottom "drag to ripple" hint.
- **Interaction**: Pointer drag (mouse+touch) spawns expanding ripple rings on the water AND
  applies an outward repulsion force to nearby tubes (∝ 1 − dist/R), which then ease back into the
  current. DPR-scaled for crispness; re-init geometry on resize; respect `prefers-reduced-motion`.

Headline copy is a single constant — flip "Wackie"↔"Wacky" in one place.
