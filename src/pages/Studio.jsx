import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi, ErrorNote } from '../api/useApi.jsx';
import { api, describeError } from '../api/client.js';
import { useSession, hasRole } from '../context/SessionContext.jsx';
import { useWallet } from '../context/WalletContext.jsx';

const STATUS_HINT = {
  DRAFT: 'Draft. Submit when ready.',
  SUBMITTED: 'Submitted. Waiting for review.',
  UNDER_REVIEW: 'Under review.',
  APPROVED: 'Approved. Waiting for publish.',
  REJECTED: 'Rejected.',
  PUBLISHED: 'Published. Visible on the launchpad.',
};

const empty = { slug: '', name: '', description: '', teamName: '', mintPriceWei: '', supply: '', launchAt: '', endAt: '', riskDisclosure: '', artworkUrl: '' };

export default function Studio() {
  const session = useSession();
  const { setModalOpen } = useWallet();
  const signedIn = session.status === 'signed_in';
  const canCreate = signedIn && hasRole(session.role, 'CREATOR');
  const apps = useApi('/launchpad/applications', { enabled: canCreate, select: (r) => r.items });

  const [form, setForm] = useState(empty);
  const [formErr, setFormErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [rowBusy, setRowBusy] = useState('');
  const [rowErr, setRowErr] = useState('');

  if (session.status === 'loading') return <main className="section"><p className="muted">Checking your session…</p></main>;
  if (!signedIn) {
    return (
      <main className="section">
        <div className="empty glass">
          <h1>Creator studio</h1>
          <p className="muted">Sign in with a creator account to apply for a launchpad project.</p>
          <button className="btn btn-primary" onClick={() => setModalOpen(true)}>Connect wallet</button>
        </div>
      </main>
    );
  }
  if (!canCreate) {
    return (
      <main className="section">
        <div className="empty glass">
          <h1>Creator studio</h1>
          <p className="muted">Your account is not a creator yet. Creator access is granted by Orbix administrators.</p>
          <Link to="/launchpad" className="btn btn-ghost">Browse the launchpad</Link>
        </div>
      </main>
    );
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submitApplication = async (e) => {
    e.preventDefault();
    setFormErr('');
    setSaving(true);
    try {
      const body = {
        ...form,
        supply: Number(form.supply),
        launchAt: new Date(form.launchAt).toISOString(),
        endAt: new Date(form.endAt).toISOString(),
        chainId: 11155111,
        artworkUrl: form.artworkUrl || undefined,
      };
      if (!body.artworkUrl) delete body.artworkUrl;
      await api('/launchpad/applications', { method: 'POST', body });
      setForm(empty);
      apps.reload();
    } catch (err) {
      setFormErr(describeError(err));
    } finally {
      setSaving(false);
    }
  };

  const act = async (id, path, body) => {
    setRowBusy(id);
    setRowErr('');
    try {
      await api(`/launchpad/applications/${encodeURIComponent(id)}/${path}`, { method: 'POST', body });
      apps.reload();
    } catch (err) {
      setRowErr(describeError(err));
    } finally {
      setRowBusy('');
    }
  };

  return (
    <main className="section">
      <div className="section-head">
        <h1>Creator studio</h1>
        <p className="muted">Apply with a project, submit it for review, and track its status.</p>
      </div>

      <section className="glass dash-card">
        <h2>Your applications</h2>
        {apps.status === 'loading' && <p className="muted">Loading…</p>}
        {apps.status === 'error' && <ErrorNote error={apps.error} onRetry={apps.reload} />}
        {apps.status === 'empty' && <p className="muted">No applications yet. Use the form below to apply.</p>}
        {rowErr && <p className="error small" role="alert">{rowErr}</p>}
        {apps.status === 'ok' && (
          <ul className="plain-list">
            {apps.data.map((p) => (
              <li key={p.id}>
                <strong>{p.name}</strong> <span className="tiny muted">({p.slug})</span> · {p.status}. {STATUS_HINT[p.status] || ''}
                {p.status === 'DRAFT' && (
                  <button className="btn btn-ghost" disabled={rowBusy === p.id} onClick={() => act(p.id, 'submit')}>Submit for review</button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="glass dash-card">
        <h2>Apply for a project</h2>
        <form onSubmit={submitApplication} className="stack">
          <label>Slug (lowercase, dashes)<input required pattern="[a-z0-9-]{3,60}" value={form.slug} onChange={set('slug')} /></label>
          <label>Project name<input required minLength={2} value={form.name} onChange={set('name')} /></label>
          <label>Team name<input required minLength={2} value={form.teamName} onChange={set('teamName')} /></label>
          <label>Description (20+ chars)<textarea required minLength={20} value={form.description} onChange={set('description')} /></label>
          <label>Mint price in wei (digits only)<input required pattern="\d{1,40}" value={form.mintPriceWei} onChange={set('mintPriceWei')} /></label>
          <label>Supply<input required type="number" min="1" value={form.supply} onChange={set('supply')} /></label>
          <label>Launch date<input required type="datetime-local" value={form.launchAt} onChange={set('launchAt')} /></label>
          <label>End date<input required type="datetime-local" value={form.endAt} onChange={set('endAt')} /></label>
          <label>Risk disclosure (20+ chars)<textarea required minLength={20} value={form.riskDisclosure} onChange={set('riskDisclosure')} /></label>
          <label>Artwork URL (optional; leave empty for labeled placeholder art)<input type="url" value={form.artworkUrl} onChange={set('artworkUrl')} /></label>
          {formErr && <p className="error small" role="alert">{formErr}</p>}
          <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save draft'}</button>
        </form>
      </section>
    </main>
  );
}
