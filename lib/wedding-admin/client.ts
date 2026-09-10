/** Bounded requests keep the editor recoverable when a connection stalls. */
export async function adminRequest(url: string, options: RequestInit = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  options.signal?.addEventListener('abort', abort, { once: true });
  if (options.signal?.aborted) abort();
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  try {
    const response = await fetch(url, { cache: 'no-store', ...options, signal: controller.signal });
    const body = await response.json().catch(error => {
      if (controller.signal.aborted) throw error;
      throw new Error('The server returned an unexpected response. Please try again.');
    });
    if (!response.ok) throw new Error(body.error || (response.status === 401 ? 'Your admin session expired. Sign in again.' : 'Something went wrong. Please retry.'));
    return body;
  } catch (error) {
    if (timedOut) throw new Error('The request took too long. Please try again.');
    throw error;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abort);
  }
}
