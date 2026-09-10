const guestPaths = new Set([
  '/wedding_v1', '/wedding_v1/our-wedding', '/wedding_v1/accommodations',
  '/wedding_v1/transportation', '/wedding_v1/plan-your-trip',
  '/wedding_v1/gallery', '/wedding_v1/faq', '/wedding_v1/registry',
]);

export function analyticsPath(pathname: string, unlocked: boolean): string | null {
  if (!guestPaths.has(pathname)) return null;
  return unlocked ? pathname : '/wedding_v1/access';
}

export function analyticsAllowed(environment: string | undefined, hostname: string): boolean {
  return environment === 'production' &&
    ['wackie.wedding', 'www.wackie.wedding', 'wackie-wedding.vercel.app'].includes(hostname);
}

export function cleanAnalyticsUrl(value: string): string {
  try { const url = new URL(value); return url.origin + url.pathname; }
  catch { return ''; }
}
