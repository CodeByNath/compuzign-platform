import { useState, useEffect } from 'preact/hooks';

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface ApiResult<T> extends ApiState<T> {
  refetch: () => void;
}

export function useApi<T>(fetcher: () => Promise<T>): ApiResult<T> {
  const [retryKey, setRetryKey] = useState(0);
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    setState({ data: null, loading: true, error: null });

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
  }, [retryKey]); // fetcher must be a stable reference; retryKey triggers re-fetch on demand

  return { ...state, refetch: () => setRetryKey((k) => k + 1) };
}
