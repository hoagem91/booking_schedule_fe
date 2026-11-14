/** Recover stale payment chunks after a dev rebuild/deploy without retrying payment APIs. */
export function recoverPaymentChunk(
  error: unknown,
  target: string,
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  navigate: (url: string) => void
): boolean {
  const message = error instanceof Error ? error.message : '';
  if (!/^\/payment\/(?:result|appointments\/[1-9]\d*)(?:[?#]|$)/.test(target)
    || !/Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(message)) return false;
  const key = 'booking-payment-chunk-recovery';
  const attempt = JSON.stringify({ target, message });
  try {
    // Persist before navigating so another failed bootstrap cannot reload forever.
    // If storage is unavailable, leave the error visible instead of risking a loop.
    if (storage.getItem(key) === attempt) return false;
    storage.setItem(key, attempt);
  } catch { return false; }
  navigate(target);
  return true;
}
