import { useEffect, useState, useCallback } from 'react';
import { api, describeError } from './client.js';

// Shared fetch state: loading | ok | empty | error. Never returns fake data on failure.
export function useApi(path, { enabled = true, deps = [], select } = {}) {
  const [state, setState] = useState({ status: enabled ? 'loading' : 'idle', data: null, error: null });
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!enabled) {
      setState({ status: 'idle', data: null, error: null });
      return;
    }
    let cancelled = false;
    const ctrl = new AbortController();
    setState((s) => ({ ...s, status: 'loading', error: null }));
    api(path, { signal: ctrl.signal })
      .then((raw) => {
        if (cancelled) return;
        const data = select ? select(raw) : raw;
        const empty = data == null || (Array.isArray(data) && data.length === 0);
        setState({ status: empty ? 'empty' : 'ok', data, error: null });
      })
      .catch((err) => {
        if (cancelled || err?.name === 'AbortError') return;
        setState({ status: 'error', data: null, error: describeError(err), httpStatus: err?.status ?? null });
      });
    return () => {
      cancelled = true;
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, enabled, tick, ...deps]);

  return { ...state, reload };
}

export function ErrorNote({ error, onRetry }) {
  return (
    <div className="empty glass" role="alert">
      <p>{error}</p>
      {onRetry && (
        <button className="btn btn-ghost" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
