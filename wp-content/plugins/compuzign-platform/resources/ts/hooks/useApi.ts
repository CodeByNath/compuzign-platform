import { useState, useEffect } from 'preact/hooks';

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T>(fetcher: () => Promise<T>): ApiState<T> {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    fetcher()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : 'An unexpected error occurred.';
          setState({ data: null, loading: false, error: message });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []); // intentionally run once on mount — fetcher must be a stable reference

  return state;
}
