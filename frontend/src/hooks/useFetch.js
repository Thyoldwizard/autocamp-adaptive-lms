'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { get } from '@/lib/api';

/**
 * Thin data-fetching hook.
 *
 * Single path:  useFetch('/student/dashboard', 'Could not load')
 * Multi  paths: useFetch(['/a', '/b'], 'Could not load')  → data is [resultA, resultB]
 *
 * Callers MUST pass a stable reference for array paths (a module-level constant or
 * useMemo), otherwise the hook re-fetches on every render.
 *
 * Returns { data, loading, error, reload }.
 */
export function useFetch(paths, fallbackError = 'Could not load data') {
  const isMulti = Array.isArray(paths);
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  // Derive a stable string key so the effect doesn't re-run on array identity changes
  const key = isMulti ? paths.join('||') : paths;

  // Keep paths accessible inside load without making load depend on the array reference
  const pathsRef = useRef(paths);
  pathsRef.current = paths;

  const load = useCallback(() => {
    const current = pathsRef.current;
    // Skip if path is not yet known (e.g. dynamic route param still resolving)
    if (!current || (Array.isArray(current) && current.some((p) => !p))) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');

    const promise = Array.isArray(current)
      ? Promise.all(current.map((p) => get(p)))
      : get(current);

    promise
      .then(setData)
      .catch((err) => setError(err.message || fallbackError))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, fallbackError]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, reload: load };
}
