'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * River-tubing scene in a flat gouache-illustration style, drawn in ANGLED
 * PERSPECTIVE (looking downstream): the water narrows into the distance at the
 * top, tall redwood trunks rise along both banks and shrink toward the vanishing
 * area, and tube-riders are foreshortened (elliptical) — bigger in the foreground,
 * smaller in the distance — drifting toward the viewer.
 *
 * Interaction unchanged: an offscreen scene buffer blitted each frame, live tubes
 * + ripples on top, drag-to-ripple + tube-repulsion, and an HTML headline overlay.
 */

// ---- gouache palette -----------------------------------------------------
const FOREST = '#4b5a37';
const WATER = '#5fa0d6';
const WATER_DK = '#4d8ec6';
const WATER_LT = '#aacdeb';
const HAZE = '#cfe0ec';
const TRUNK = '#8f6144';
const TRUNK_DK = '#653f28';
const TRUNK_LT = '#ad835f';
const FOLIAGE = ['#788858', '#869566', '#68774a', '#93a06d', '#5c6b40'];
const FOLIAGE_DK = '#566440';
const FOLIAGE_LT = '#a6b27e';
const TUBE_DK = '#1b232e';
const TUBE_HI = '#39434f';
const SKIN = ['#f4cfa6', '#e6b489', '#cf9a6e', '#a9754f', '#875636', '#f7dcc2'];
const HAIR = ['#2e2320', '#5b3a24', '#141414', '#caa14a', '#7a4a2a', '#3b2a1e', '#8a5a2b'];
const SUIT = ['#ff5a7a', '#ffcf3f', '#2ec4a6', '#4dabf7', '#ff8c42', '#e84393', '#ff5a5f', '#ffffff', '#8e5bd0'];
const DRINKS = ['#ff4d6d', '#ff8fab', '#ffd23f', '#ff6b6b'];
const HATS = ['#e8c37a', '#20242a', '#c94f4f', '#efe6d0', '#3a6ea5'];
const HAIRSTYLES = ['short', 'ponytail', 'bun', 'long'];

const SUBTITLES = [
  'Will + Jackie = WACKIE',
  'Are you ready to get WACKIE?!',
  'Grab a tube. Float on in.',
  "Save the date… we're still deciding which one",
  'Two hearts, one lazy river',
];

// ---- helpers -------------------------------------------------------------
interface Geom { W: number; H: number; dpr: number; }
interface Tube {
  d: number; lateral: number; wander: number; wanderSpeed: number; wanderAmp: number;
  baseR: number; dSpeed: number; spin: number; spinSpeed: number; bob: number; bobSpeed: number;
  dx: number; dy: number; vx: number; vy: number; rx: number; ry: number; rr: number;
  skin: string; hair: string; hairStyle: string; suit: string;
  top: boolean; hat: boolean; hatColor: string; glasses: boolean; drink: boolean; drinkColor: string;
}
interface Glint { x: number; y: number; rad: number; ang: number; alpha: number; speed: number; }
interface Ripple { x: number; y: number; age: number; life: number; maxR: number; }
interface Tree { side: number; d: number; jx: number; }

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const pick = <T,>(a: T[]): T => a[(Math.random() * a.length) | 0];
const chance = (p: number) => Math.random() < p;
const TAU = Math.PI * 2;

// banks converge toward the top (distance); wide in the foreground (bottom)
function bankL(g: Geom, y: number): number { return lerp(g.W * 0.4, g.W * 0.08, clamp(y / g.H, 0, 1)); }
function bankR(g: Geom, y: number): number { return lerp(g.W * 0.6, g.W * 0.92, clamp(y / g.H, 0, 1)); }
function waterHalf(g: Geom, y: number): number { return (bankR(g, y) - bankL(g, y)) / 2; }

function leaf(ctx: CanvasRenderingContext2D, bx: number, by: number, ang: number, len: number, wid: number) {
  const dx = Math.cos(ang), dy = Math.sin(ang);
  const px = Math.cos(ang + Math.PI / 2), py = Math.sin(ang + Math.PI / 2);
  const tipX = bx + dx * len, tipY = by + dy * len;
  const mx = bx + dx * len * 0.5, my = by + dy * len * 0.5;
  ctx.beginPath();
  ctx.moveTo(bx + px * wid, by + py * wid);
  ctx.quadraticCurveTo(mx + px * wid * 0.8, my + py * wid * 0.8, tipX, tipY);
  ctx.quadraticCurveTo(mx - px * wid * 0.8, my - py * wid * 0.8, bx - px * wid, by - py * wid);
  ctx.closePath();
  ctx.fill();
}

// a subtle paper-grain tile for the matte gouache texture
function makeGrain(): HTMLCanvasElement {
  const s = 220;
  const c = document.createElement('canvas');
  c.width = s; c.height = s;
  const g = c.getContext('2d')!;
  const img = g.createImageData(s, s);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = 128 + ((Math.random() * 70) | 0) - 35;
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

function foliageSpray(ctx: CanvasRenderingContext2D, cx: number, cy: number, baseAng: number, spreadA: number, n: number, len: number) {
  // three layered passes (dark+big behind → light+small in front) = lush, soft foliage
  const passes: Array<[string | null, number, number]> = [[FOLIAGE_DK, 1.15, n], [null, 0.85, n], [FOLIAGE_LT, 0.55, Math.round(n * 0.7)]];
  for (const [col, sz, count] of passes) {
    for (let i = 0; i < count; i++) {
      const a = baseAng + rand(-spreadA, spreadA);
      const reach = rand(0, len * 1.7);
      const droop = Math.pow(reach / (len * 1.7), 1.5) * len * 0.9; // fronds droop as they reach out
      const ox = cx + Math.cos(baseAng) * reach + rand(-len * 0.35, len * 0.35);
      const oy = cy + Math.sin(baseAng) * reach + droop + rand(-len * 0.3, len * 0.3);
      const l = len * sz * rand(0.5, 1);
      ctx.fillStyle = col ?? pick(FOLIAGE);
      leaf(ctx, ox, oy, a, l, l * 0.4);
    }
  }
}

function drawTree(ctx: CanvasRenderingContext2D, g: Geom, tr: Tree) {
  const sy = tr.d * g.H;
  const scale = lerp(0.3, 1.75, tr.d);
  const w = g.W * 0.046 * scale;
  const h = g.H * 0.7 * scale;
  const bankx = tr.side < 0 ? bankL(g, sy) : bankR(g, sy);
  const cx = bankx + tr.side * w * 0.32 + tr.jx;
  const topW = w * 0.52;
  // trunk (tapered)
  ctx.fillStyle = TRUNK;
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, sy + 10);
  ctx.lineTo(cx + w / 2, sy + 10);
  ctx.lineTo(cx + topW / 2, sy - h);
  ctx.lineTo(cx - topW / 2, sy - h);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.globalAlpha = 0.3; ctx.fillStyle = TRUNK_DK; ctx.fillRect(cx - w / 2, sy - h, w * 0.26, h + 20);
  ctx.globalAlpha = 0.22; ctx.fillStyle = TRUNK_LT; ctx.fillRect(cx + w * 0.12, sy - h, w * 0.3, h + 20);
  ctx.globalAlpha = 0.22; ctx.strokeStyle = TRUNK_DK; ctx.lineWidth = Math.max(1, w * 0.04);
  for (let k = 0; k < 3; k++) {
    const lx = cx - w * 0.18 + k * w * 0.18;
    ctx.beginPath(); ctx.moveTo(lx, sy + 10); ctx.lineTo(lx + w * 0.03, sy - h); ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  // foliage: hangs down + inward toward the water
  const ang = tr.side < 0 ? 0.55 : Math.PI - 0.55;
  foliageSpray(ctx, cx, sy - h * 0.82, ang, 1.0, Math.round(70 * scale) + 24, g.W * 0.052 * scale);
  foliageSpray(ctx, cx, sy - h * 0.5, ang, 0.9, Math.round(34 * scale) + 12, g.W * 0.044 * scale);
}

// a reclined swimmer, head toward +x
function drawPerson(ctx: CanvasRenderingContext2D, r: number, t: Tube) {
  const s = r;
  ctx.strokeStyle = t.skin;
  ctx.lineCap = 'round';
  ctx.lineWidth = s * 0.17;
  ctx.beginPath();
  ctx.moveTo(-s * 0.12, s * 0.13); ctx.lineTo(-s * 0.5, s * 0.34); ctx.lineTo(-s * 0.92, s * 0.2);
  ctx.moveTo(-s * 0.12, -s * 0.13); ctx.lineTo(-s * 0.5, -s * 0.34); ctx.lineTo(-s * 0.92, -s * 0.2);
  ctx.stroke();
  ctx.fillStyle = t.skin;
  ctx.beginPath(); ctx.ellipse(-s * 0.95, s * 0.2, s * 0.1, s * 0.07, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-s * 0.95, -s * 0.2, s * 0.1, s * 0.07, 0, 0, TAU); ctx.fill();
  ctx.lineWidth = s * 0.13;
  ctx.beginPath();
  ctx.moveTo(s * 0.06, s * 0.1); ctx.lineTo(s * 0.14, s * 0.42);
  ctx.moveTo(s * 0.06, -s * 0.1); ctx.lineTo(s * 0.16, -s * 0.44);
  ctx.stroke();
  ctx.fillStyle = t.skin;
  ctx.beginPath(); ctx.ellipse(-s * 0.06, 0, s * 0.44, s * 0.24, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = t.suit;
  ctx.beginPath(); ctx.ellipse(-s * 0.34, 0, s * 0.12, s * 0.2, 0, 0, TAU); ctx.fill();
  if (t.top) {
    ctx.beginPath(); ctx.ellipse(s * 0.04, s * 0.12, s * 0.1, s * 0.1, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(s * 0.04, -s * 0.12, s * 0.1, s * 0.1, 0, 0, TAU); ctx.fill();
  }
  if (t.drink) {
    ctx.fillStyle = t.drinkColor;
    ctx.beginPath(); ctx.ellipse(s * 0.2, -s * 0.52, s * 0.09, s * 0.09, 0, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = t.skin;
  ctx.beginPath(); ctx.arc(s * 0.52, 0, s * 0.23, 0, TAU); ctx.fill();
  ctx.fillStyle = t.hair;
  ctx.save();
  ctx.beginPath(); ctx.arc(s * 0.52, 0, s * 0.23, 0, TAU); ctx.clip();
  ctx.beginPath(); ctx.arc(s * 0.63, 0, s * 0.21, 0, TAU); ctx.fill();
  ctx.restore();
  if (t.hairStyle === 'ponytail') leaf(ctx, s * 0.7, 0, 0.15, s * 0.5, s * 0.13);
  else if (t.hairStyle === 'bun') { ctx.beginPath(); ctx.arc(s * 0.78, 0, s * 0.13, 0, TAU); ctx.fill(); }
  else if (t.hairStyle === 'long') { ctx.beginPath(); ctx.ellipse(s * 0.66, 0, s * 0.2, s * 0.3, 0, 0, TAU); ctx.fill(); }
  if (t.hat) {
    ctx.fillStyle = t.hatColor;
    ctx.beginPath(); ctx.arc(s * 0.54, 0, s * 0.3, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath(); ctx.arc(s * 0.58, 0, s * 0.15, 0, TAU); ctx.fill();
  } else if (t.glasses) {
    ctx.strokeStyle = 'rgba(22,24,28,0.92)';
    ctx.lineWidth = s * 0.07;
    ctx.beginPath(); ctx.moveTo(s * 0.44, -s * 0.13); ctx.lineTo(s * 0.44, s * 0.13); ctx.stroke();
  }
}

function drawTube(ctx: CanvasRenderingContext2D, t: Tube) {
  const { rx: x, ry: y, rr: r } = t;
  const inner = r * 0.54;
  const fs = 0.72; // vertical foreshortening
  ctx.save();
  ctx.translate(x, y);
  // shadow on the water
  ctx.fillStyle = 'rgba(18,50,74,0.2)';
  ctx.beginPath();
  ctx.ellipse(r * 0.06, r * 0.42, r * 1.0, r * 0.74, 0, 0, TAU);
  ctx.fill();
  // dark inner tube, foreshortened to an ellipse
  ctx.fillStyle = TUBE_DK;
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * fs, 0, 0, TAU);
  ctx.ellipse(0, 0, inner, inner * fs, 0, 0, TAU, true);
  ctx.fill();
  // sheen
  ctx.strokeStyle = TUBE_HI;
  ctx.lineWidth = r * 0.13;
  ctx.beginPath();
  ctx.ellipse(0, 0, (r + inner) / 2, ((r + inner) / 2) * fs, 0, Math.PI * 1.06, Math.PI * 1.55);
  ctx.stroke();
  // the reclined swimmer
  ctx.save();
  ctx.rotate(t.spin);
  ctx.scale(1, 0.86);
  drawPerson(ctx, r, t);
  ctx.restore();
  ctx.restore();
}

// ---- component -----------------------------------------------------------
export default function RiverScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [subtitle, setSubtitle] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setSubtitle((s) => (s + 1) % SUBTITLES.length), 3800);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const ctx2d = canvasEl.getContext('2d');
    if (!ctx2d) return;
    const canvas: HTMLCanvasElement = canvasEl;
    const ctx: CanvasRenderingContext2D = ctx2d;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const grain = makeGrain();
    const grainPat = ctx.createPattern(grain, 'repeat');

    const geom: Geom = { W: 0, H: 0, dpr: 1 };
    let bg: HTMLCanvasElement = document.createElement('canvas');
    let waterPath = new Path2D();
    const tubes: Tube[] = [];
    let glints: Glint[] = [];
    const ripples: Ripple[] = [];
    const pointer = { x: -1e4, y: -1e4, down: false, lastMove: -1e4, lastRx: 0, lastRy: 0 };

    function newTube(g: Geom, d: number): Tube {
      const hat = chance(0.28);
      return {
        d, lateral: rand(-0.85, 0.85), wander: Math.random() * TAU,
        wanderSpeed: rand(0.1, 0.3), wanderAmp: rand(0.05, 0.22),
        baseR: g.W * 0.05, dSpeed: rand(0.025, 0.06),
        spin: Math.random() * TAU, spinSpeed: rand(-0.18, 0.18),
        bob: Math.random() * TAU, bobSpeed: rand(1, 2), dx: 0, dy: 0, vx: 0, vy: 0, rx: 0, ry: 0, rr: 0,
        skin: pick(SKIN), hair: pick(HAIR), hairStyle: pick(HAIRSTYLES), suit: pick(SUIT),
        top: chance(0.5), hat, hatColor: pick(HATS), glasses: !hat && chance(0.75),
        drink: chance(0.4), drinkColor: pick(DRINKS),
      };
    }

    function buildScene() {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      geom.W = W; geom.H = H; geom.dpr = dpr;

      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';

      // water trapezoid (narrow at top, wide at bottom)
      waterPath = new Path2D();
      waterPath.moveTo(bankL(geom, 0), -2);
      waterPath.lineTo(bankR(geom, 0), -2);
      waterPath.lineTo(bankR(geom, H) + 4, H + 2);
      waterPath.lineTo(bankL(geom, H) - 4, H + 2);
      waterPath.closePath();

      if (tubes.length === 0) {
        const tubeTarget = clamp(Math.round((W * H) / 46000), 16, 42);
        for (let i = 0; i < tubeTarget; i++) tubes.push(newTube(geom, Math.random()));
      }

      const glintTarget = clamp(Math.round((W * H) / 26000), 20, 80);
      glints = Array.from({ length: glintTarget }, () => {
        const y = rand(0, H);
        return { x: bankL(geom, y) + rand(0, bankR(geom, y) - bankL(geom, y)), y, rad: rand(6, 16), ang: rand(0, TAU), alpha: rand(0.12, 0.28), speed: rand(6, 16) };
      });

      // ---- paint the static scene ----
      bg = document.createElement('canvas');
      bg.width = canvas.width;
      bg.height = canvas.height;
      const b = bg.getContext('2d');
      if (!b) return;
      b.setTransform(dpr, 0, 0, dpr, 0, 0);

      // forest floor base (shows between distant trunks)
      b.fillStyle = FOREST;
      b.fillRect(0, 0, W, H);
      // water corridor
      b.fillStyle = WATER;
      b.fill(waterPath);
      // painted swirl marks on the water
      b.save();
      b.clip(waterPath);
      b.lineCap = 'round';
      const swirlN = Math.round((W * H) / 9000);
      for (let i = 0; i < swirlN; i++) {
        const rr = rand(6, 18);
        const a = rand(0, TAU);
        b.strokeStyle = Math.random() < 0.22 ? WATER_DK : WATER_LT;
        b.globalAlpha = rand(0.12, 0.28);
        b.lineWidth = Math.max(1, rr * 0.12);
        b.beginPath();
        b.arc(rand(0, W), rand(0, H), rr, a, a + Math.PI * rand(0.8, 1.4));
        b.stroke();
      }
      b.globalAlpha = 1;
      // distance haze near the top of the corridor
      const hz = b.createLinearGradient(0, 0, 0, H * 0.5);
      hz.addColorStop(0, HAZE);
      hz.addColorStop(1, 'rgba(207,224,236,0)');
      b.globalAlpha = 0.5;
      b.fillStyle = hz;
      b.fillRect(0, 0, W, H * 0.5);
      b.globalAlpha = 1;
      b.restore();

      // redwoods on both banks, far → near so nearer trunks overlap
      const trees: Tree[] = [];
      const depths = [0.05, 0.2, 0.4, 0.64, 0.92];
      for (const side of [-1, 1]) {
        for (const d of depths) trees.push({ side, d: clamp(d + rand(-0.03, 0.03), 0, 1.05), jx: rand(-W * 0.015, W * 0.015) });
      }
      trees.sort((a, z) => a.d - z.d);
      for (const tr of trees) drawTree(b, geom, tr);

      // low undergrowth filling the forest floor between the trunks
      const underN = clamp(Math.round((W * H) / 30000), 20, 120);
      for (let i = 0; i < underN; i++) {
        const side = Math.random() < 0.5 ? -1 : 1;
        const y = rand(0, H);
        const inner = side < 0 ? bankL(geom, y) : bankR(geom, y);
        const x = side < 0 ? rand(-12, inner) : rand(inner, W + 12);
        const sc = lerp(0.4, 1.5, y / H);
        foliageSpray(b, x, y, side < 0 ? 0.35 : Math.PI - 0.35, 1.4, Math.round(22 * sc) + 6, W * 0.03 * sc);
      }
    }

    let last = performance.now();
    let raf = 0;

    function frame(now: number) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const g = geom;
      const motion = reduced ? 0 : 1;
      const active = pointer.down || now - pointer.lastMove < 150;

      for (const gl of glints) {
        gl.y += gl.speed * dt * motion;
        if (gl.y > g.H + 20) { gl.y = -20; gl.x = bankL(g, 0) + rand(0, bankR(g, 0) - bankL(g, 0)); }
      }
      for (const t of tubes) {
        t.d += t.dSpeed * dt * motion;
        t.wander += t.wanderSpeed * dt;
        t.spin += t.spinSpeed * dt * (reduced ? 0.2 : 1);
        t.bob += t.bobSpeed * dt;
        if (t.d > 1.12) Object.assign(t, newTube(g, -0.12));
        const dd = clamp(t.d, 0, 1);
        const scale = lerp(0.5, 1.35, dd);
        t.rr = t.baseR * scale;
        const sy = t.d * g.H;
        const lat = t.lateral + Math.sin(t.wander) * t.wanderAmp * motion;
        const baseX = (bankL(g, sy) + bankR(g, sy)) / 2 + lat * Math.max(6, waterHalf(g, sy) - t.rr * 0.9);
        if (active) {
          const ddx = baseX + t.dx - pointer.x;
          const ddy = sy + t.dy - pointer.y;
          const dist = Math.hypot(ddx, ddy) || 1;
          const R = 170;
          if (dist < R) {
            const f = (1 - dist / R) * 760;
            t.vx += (ddx / dist) * f * dt;
            t.vy += (ddy / dist) * f * dt;
          }
        }
        t.vx -= t.vx * Math.min(4 * dt, 1);
        t.vy -= t.vy * Math.min(4 * dt, 1);
        t.dx += t.vx * dt;
        t.dy += t.vy * dt;
        t.dx -= t.dx * Math.min(3.5 * dt, 1);
        t.dy -= t.dy * Math.min(3.5 * dt, 1);
        t.rx = baseX + t.dx;
        t.ry = sy + t.dy;
      }
      for (let i = ripples.length - 1; i >= 0; i--) {
        ripples[i].age += dt;
        if (ripples[i].age > ripples[i].life) ripples.splice(i, 1);
      }

      // ---- draw ----
      ctx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);
      ctx.clearRect(0, 0, g.W, g.H);
      ctx.drawImage(bg, 0, 0, g.W, g.H);

      // live swirls + ripples, clipped to the water corridor
      ctx.save();
      ctx.clip(waterPath);
      ctx.lineCap = 'round';
      for (const gl of glints) {
        ctx.strokeStyle = WATER_LT;
        ctx.globalAlpha = gl.alpha;
        ctx.lineWidth = gl.rad * 0.16;
        ctx.beginPath();
        ctx.arc(gl.x, gl.y, gl.rad, gl.ang, gl.ang + Math.PI * 1.15);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      for (const rp of ripples) {
        const p = 1 - Math.pow(1 - rp.age / rp.life, 2);
        const rad = rp.maxR * p;
        const a = (1 - p) * 0.5;
        ctx.strokeStyle = `rgba(226,240,250,${a})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.ellipse(rp.x, rp.y, rad, rad * 0.72, 0, 0, TAU); ctx.stroke();
        ctx.strokeStyle = `rgba(226,240,250,${a * 0.6})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(rp.x, rp.y, rad * 0.55, rad * 0.55 * 0.72, 0, 0, TAU); ctx.stroke();
      }
      ctx.restore();

      // tubes, painter-sorted far → near
      const order = tubes.slice().sort((a, z) => a.d - z.d);
      for (const t of order) drawTube(ctx, t);

      // paper-grain overlay → matte, painted texture over the whole scene
      if (grainPat) {
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = grainPat;
        ctx.fillRect(0, 0, g.W, g.H);
        ctx.restore();
      }

      raf = requestAnimationFrame(frame);
    }

    // ---- pointer interaction ----
    function toLocal(e: PointerEvent): [number, number] {
      const rect = canvas.getBoundingClientRect();
      return [e.clientX - rect.left, e.clientY - rect.top];
    }
    function overWater(x: number, y: number): boolean {
      return x > bankL(geom, y) && x < bankR(geom, y);
    }
    function spawnRipple(x: number, y: number) {
      if (!overWater(x, y)) return;
      if (ripples.length > 70) ripples.shift();
      ripples.push({ x, y, age: 0, life: 1.2, maxR: rand(50, 100) });
    }
    function onMove(e: PointerEvent) {
      const [x, y] = toLocal(e);
      pointer.x = x; pointer.y = y; pointer.lastMove = performance.now();
      if (Math.hypot(x - pointer.lastRx, y - pointer.lastRy) > 16) {
        pointer.lastRx = x; pointer.lastRy = y;
        spawnRipple(x, y);
      }
    }
    function onDown(e: PointerEvent) {
      const [x, y] = toLocal(e);
      pointer.x = x; pointer.y = y; pointer.down = true; pointer.lastMove = performance.now();
      spawnRipple(x, y);
    }
    function onUp() { pointer.down = false; }
    function onLeave() { pointer.down = false; pointer.lastMove = -1e4; }
    function onResize() { buildScene(); }

    buildScene();
    raf = requestAnimationFrame(frame);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointerleave', onLeave);
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: FOREST }}>
      <style>{`@keyframes wk-fadeSub {0%{opacity:0;transform:translateY(6px)}14%{opacity:1;transform:none}82%{opacity:1}100%{opacity:0}}`}</style>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%', touchAction: 'none', cursor: 'grab' }}
      />
      <div
        style={{
          position: 'absolute', top: '7%', left: '50%', transform: 'translateX(-50%)',
          width: '92vw', textAlign: 'center', pointerEvents: 'none', userSelect: 'none',
        }}
      >
        <h1
          style={{
            margin: 0, fontFamily: 'var(--font-fraunces), Georgia, serif', fontWeight: 600,
            fontSize: 'clamp(2.4rem, 8vw, 6rem)', lineHeight: 1.02, letterSpacing: '0.015em',
            color: '#fdf4e4',
            textShadow: '0 2px 20px rgba(18,52,78,0.6), 0 1px 0 rgba(18,52,78,0.45)',
          }}
        >
          Wackie&nbsp;Wedding
        </h1>
        <div style={{ height: '2.2em', marginTop: '0.3em', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
          <p
            key={subtitle}
            style={{
              margin: 0, fontFamily: 'var(--font-fraunces), Georgia, serif', fontStyle: 'italic',
              fontWeight: 500, fontSize: 'clamp(0.95rem, 2.6vw, 1.5rem)', color: '#fdf4e4',
              textShadow: '0 2px 16px rgba(18,52,78,0.65)', animation: 'wk-fadeSub 3.8s ease-in-out',
            }}
          >
            {SUBTITLES[subtitle]}
          </p>
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: '26px', left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none', userSelect: 'none' }}>
        <span
          style={{
            display: 'inline-block', padding: '7px 18px', borderRadius: '999px',
            fontFamily: 'var(--font-fraunces), Georgia, serif', fontWeight: 600,
            fontSize: 'clamp(0.75rem, 2vw, 0.95rem)', color: '#fdf4e4',
            background: 'rgba(18,52,78,0.34)',
          }}
        >
          Drag across the water to make waves 🌊
        </span>
      </div>
    </div>
  );
}
