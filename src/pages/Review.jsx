import { Link } from 'react-router-dom';
import { useApi, ErrorNote } from '../api/useApi.jsx';
import { api, describeError } from '../api/client.js';
import { useSession, hasRole } from '../context/SessionContext.jsx';
import { useWallet } from '../context/WalletContext.jsx';
import { useState } from 'react';

export default function Review() {
  const session = useSession();
  const { setModalOpen } = useWallet();
  const signedIn = session.status === 'signed_in';
  const canReview = signedIn && hasRole(session.role, 'MODERATOR');
  const apps = useApi('/launchpad/applications', { enabled: canReview, select: (r) => r.items });
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');

  if (session.status === 'loading') return <main className="section"><p className="muted">Checking your session…</p></main>;
  if (!signedIn) {
    return (
      <main className="section">
        <div className="empty glass">
          <h1>Review queue</h1>
          <p className="muted">Sign in with a moderator account to review applications.</p>
          <button className="btn btn-primary" onClick={() => setModalOpen(true)}>Connect wallet</button>
        </div>
      </main>
    );
  }
  if (!canReview) {
    return (
      <main className="section">
        <div className="empty glass">
          <h1>Review queue</h1>
          <p className="muted">Moderator access is required. Roles are granted by administrators.</p>
          <Link to="/launchpad" className="btn btn-ghost">Browse the launchpad</Link>
        </div>
      </main>
    );
  }

  const act = async (id, path, body) => {
    setBusy(id);
    setErr('');
    try {
      await api(`/launchpad/applications/${encodeURIComponent(id)}/${path}`, { method: 'POST', body });
      apps.reload();
    } catch (e) {
      // The server enforces role per action. Publish needs administrator, so a moderator sees a clear refusal here.
      setErr(describeError(e));
    } finally {
      setBusy('');
    }
  };

  const isAdmin = hasRole(session.role, 'ADMINISTRATOR');

  return (
    <main className="section">
      <div className="section-head">
        <h1>Review queue</h1>
        <p className="muted">Approve or reject submitted applications. Only administrators can publish.</p>
      </div>
      {err && <p className="error small" role="alert">{err}</p>}
      {apps.status === 'loading' && <p className="muted">Loading…</p>}
      {apps.status === 'error' && <ErrorNote error={apps.error} onRetry={apps.reload} />}
      {apps.status === 'empty' && <div className="empty glass"><p className="muted">Nothing to review right now.</p></div>}
      {apps.status === 'ok' && (
        <ul className="plain-list">
          {apps.data.map((p) => (
            <li key={p.id} className="glass dash-card">
              <strong>{p.name}</strong> <span className="tiny muted">({p.slug})</span> · {p.status}
              <div className="row-actions">
                {(p.status === 'SUBMITTED' || p.status === 'UNDER_REVIEW') && (
                  <>
                    <button className="btn btn-primary" disabled={busy === p.id} onClick={() => act(p.id, 'review', { decision: 'approve' })}>Approve</button>
                    <button className="btn btn-ghost" disabled={busy === p.id} onClick={() => act(p.id, 'review', { decision: 'reject' })}>Reject</button>
                  </>
                )}
                {p.status === 'APPROVED' && isAdmin && (
                  <button className="btn btn-primary" disabled={busy === p.id} onClick={() => act(p.id, 'publish')}>Publish</button>
                )}
                {p.status === 'APPROVED' && !isAdmin && <span className="tiny muted">Waiting for an administrator to publish.</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
