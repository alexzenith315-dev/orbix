import { Link, useParams } from 'react-router-dom';
import { useApi, ErrorNote } from '../api/useApi.jsx';

export default function LaunchpadDetail() {
  const { slug } = useParams();
  const p = useApi(`/launchpad/${encodeURIComponent(slug)}`);

  if (p.status === 'loading') return <main className="section"><p className="muted">Loading project…</p></main>;
  if (p.status === 'error') {
    return (
      <main className="section">
        {p.httpStatus === 404 ? (
          <div className="empty glass">
            <h1>Project not found</h1>
            <p className="muted">It may not be published yet.</p>
            <Link to="/launchpad" className="btn btn-primary">Back to launchpad</Link>
          </div>
        ) : (
          <ErrorNote error={p.error} onRetry={p.reload} />
        )}
      </main>
    );
  }
  if (p.status !== 'ok') return null;

  const d = p.data;
  return (
    <main className="section">
      <p><Link to="/launchpad">← Launchpad</Link></p>
      <h1>{d.name}</h1>
      <p className="muted">{d.teamName} · state: {d.state}</p>
      <p>{d.description}</p>
      <div className="glass dash-card">
        <h2>Mint</h2>
        <p className="small">Supply {d.supply} · price {d.mintPriceWei} wei · chain {d.chainId}</p>
        <p className="small">Launch {new Date(d.launchAt).toLocaleString()} · end {new Date(d.endAt).toLocaleString()}</p>
        {d.contractAddress ? <p className="tiny">Contract: {d.contractAddress}</p> : <p className="tiny muted">No contract deployed yet. This is an off-chain project page.</p>}
      </div>
      <div className="glass dash-card">
        <h2>Risk disclosure</h2>
        <p className="small">{d.riskDisclosure}</p>
        <p className="tiny muted">guaranteed returns: none</p>
      </div>
      {d.artworkIsPlaceholder && <p className="tiny muted">Artwork is placeholder art.</p>}
    </main>
  );
}
