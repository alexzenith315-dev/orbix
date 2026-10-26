import { useApi } from '../api/useApi.jsx';

const LABEL = {
  listed: 'listed',
  purchased: 'sold',
  listing_cancelled: 'cancelled a listing',
  offer_created: 'made an offer',
  offer_accepted: 'accepted an offer',
  offer_cancelled: 'cancelled an offer',
  minted: 'minted',
  transferred: 'transferred',
};

// Renders only when the API returns real indexed events. Hidden when empty or unreachable.
export default function ActivityFeed({ limit = 8 }) {
  const feed = useApi(`/activity?limit=${limit}`, { select: (r) => r.items });
  if (feed.status !== 'ok') return null;
  return (
    <section className="activity glass" aria-label="Recent activity">
      <h2>Recent activity</h2>
      <p className="tiny muted">From indexed Sepolia testnet logs</p>
      <ul className="plain-list">
        {feed.data.map((e) => (
          <li key={`${e.id ?? e.txHash}-${e.logIndex ?? ''}`}>
            <span className="tiny muted">{e.actor ? `${e.actor.slice(0, 6)}…${e.actor.slice(-4)}` : 'unknown'}</span>{' '}
            {LABEL[e.eventName] || e.eventName}
            {e.tokenId != null && <span className="muted"> · token {String(e.tokenId)}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
