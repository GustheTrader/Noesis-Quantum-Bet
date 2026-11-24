import { lazy } from 'react';

const RETRY_WINDOW_MS = 60_000;
const recent = new Map<string, number>();

/**
 * lazyPage wraps React.lazy so a stale chunk (deploy landed while a tab was
 * open) triggers one full reload instead of an error, and so a chunk that
 * already failed in the last minute is not retried in a tight loop.
 */
export function lazyPage<T extends { default: React.ComponentType<any> }>(
  factory: () => Promise<T>,
) {
  const load = () =>
    factory().catch((err) => {
      const key = factory.toString().slice(0, 120);
      const last = recent.get(key) || 0;
      if (Date.now() - last > RETRY_WINDOW_MS) {
        recent.set(key, Date.now());
        if (typeof window !== 'undefined') window.location.reload();
        return new Promise<T>(() => {});
      }
      throw err;
    });

  return lazy(load);
}
