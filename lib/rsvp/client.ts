export async function request<T>(url: string, input?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: input === undefined ? 'GET' : 'POST',
    headers:
      input === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: input === undefined ? undefined : JSON.stringify(input),
    cache: 'no-store',
    signal: AbortSignal.timeout(20000),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      [data.error, ...(Array.isArray(data.details) ? data.details : [])]
        .filter(Boolean)
        .join('\n') || 'Please try again.',
    );
  return data;
}
