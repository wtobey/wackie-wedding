const guestPaths = new Set([
  '/', '/our-wedding', '/accommodations',
  '/transportation', '/plan-your-trip',
  '/gallery', '/faq', '/registry',
]);

export function analyticsPath(pathname: string, unlocked: boolean): string | null {
  if (!guestPaths.has(pathname)) return null;
  return unlocked ? pathname : '/access';
}

export function analyticsAllowed(environment: string | undefined, hostname: string): boolean {
  return environment === 'production' &&
    ['wackie.wedding', 'www.wackie.wedding', 'wackie-wedding.vercel.app'].includes(hostname);
}

export function cleanAnalyticsUrl(value: string): string {
  try { const url = new URL(value); return url.origin + url.pathname; }
  catch { return ''; }
}
