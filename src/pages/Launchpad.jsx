import { Link } from 'react-router-dom';
import { useApi, ErrorNote } from '../api/useApi.jsx';

export default function Launchpad() {
  const list = useApi('/launchpad', { select: (r) => r.items });

  return (
    <main className="section">
      <div className="section-head">
        <h1>Launchpad</h1>
        <p className="muted">Published testnet projects only. Nothing here is investment advice and no return is guaranteed.</p>
      </div>
      {list.status === 'loading' && <p className="muted">Loading projects…</p>}
      {list.status === 'error' && <ErrorNote error={list.error} onRetry={list.reload} />}
      {list.status === 'empty' && (
        <div className="empty glass">
          <h2>No published projects yet</h2>
          <p className="muted">Projects appear here after review and publish. Creators can apply from the studio.</p>
        </div>
      )}
      {list.status === 'ok' && (
        <div className="grid">
          {list.data.map((p) => (
            <Link key={p.id} to={`/launchpad/${p.slug}`} className="glass card-link">
              <h3>{p.name}</h3>
              <p className="muted small">{p.teamName}</p>
              <p className="small">State: {p.state}</p>
              <p className="tiny muted">
                {p.contractAddress ? 'Contract deployed on Sepolia' : 'Off-chain page, no contract deployed'}
                {p.artworkIsPlaceholder && ' · placeholder art'}
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
