// Next's internal request URL can use localhost while the browser uses 127.0.0.1.
// Compare against the request Host, which browsers cannot override in fetch.
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    const source = new URL(origin);
    const target = new URL(request.url);
    return (
      ['http:', 'https:'].includes(source.protocol) &&
      source.origin === origin &&
      source.protocol === target.protocol &&
      source.host === (request.headers.get('host') || target.host)
    );
  } catch {
    return false;
  }
}
