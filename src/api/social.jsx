import { useCallback, useState } from 'react';
import { api, describeError } from './client.js';

// Optimistic toggle: flip the UI at once, call the real endpoint, roll back and report on failure.
export function useOptimisticToggle({ initial, call }) {
  const [on, setOn] = useState(!!initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const toggle = useCallback(async () => {
    if (pending) return;
    const next = !on;
    setOn(next);
    setPending(true);
    setError('');
    try {
      await call(next);
    } catch (err) {
      setOn(!next); // rollback
      setError(describeError(err));
    } finally {
      setPending(false);
    }
  }, [on, pending, call]);

  return { on, pending, error, toggle, setOn };
}

export function FavoriteButton({ assetId, initial, signedIn }) {
  const { on, pending, error, toggle } = useOptimisticToggle({
    initial,
    call: (next) => api(`/favorites/${encodeURIComponent(assetId)}`, { method: next ? 'POST' : 'DELETE' }),
  });
  if (!signedIn) {
    return <span className="muted small">Sign in to save favorites</span>;
  }
  return (
    <span className="inline-action">
      <button className={`btn btn-ghost ${on ? 'is-on' : ''}`} aria-pressed={on} disabled={pending} onClick={toggle}>
        {on ? '♥ Saved' : '♡ Save'}
      </button>
      {error && <span className="error small" role="alert">{error}</span>}
    </span>
  );
}

export function FollowButton({ userId, initial, signedIn, isSelf }) {
  const { on, pending, error, toggle } = useOptimisticToggle({
    initial,
    call: (next) => api(`/follows/${encodeURIComponent(userId)}`, { method: next ? 'POST' : 'DELETE' }),
  });
  if (isSelf) return null;
  if (!signedIn) {
    return <span className="muted small">Sign in to follow</span>;
  }
  return (
    <span className="inline-action">
      <button className={`btn btn-ghost ${on ? 'is-on' : ''}`} aria-pressed={on} disabled={pending} onClick={toggle}>
        {on ? 'Following' : 'Follow'}
      </button>
      {error && <span className="error small" role="alert">{error}</span>}
    </span>
  );
}
