import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { CREATORS, getCreatorNfts } from '../data.js';
import NftCard from '../components/NftCard.jsx';

export default function Creator() {
  const { handle } = useParams();
  const info = CREATORS.find((c) => c.handle === handle) || { handle, name: handle, bio: 'No profile data yet.' };
  const [tab, setTab] = useState('Created');
  const created = getCreatorNfts(handle);
  const listed = created.filter((n) => n.listed);
  const items = tab === 'Listed' ? listed : tab === 'Collected' ? [] : created;

  return (
    <main className="section">
      <div className="profile glass">
        <span className="avatar big" aria-hidden="true">{(info.name || '?')[0]}</span>
        <div>
          <h1>{info.name}</h1>
          <code className="muted small">{info.handle}</code>
          <p className="muted">{info.bio}</p>
        </div>
      </div>
      <div className="stats">
        <div className="glass stat"><strong>{created.length}</strong><span className="muted small">Created</span></div>
        <div className="glass stat"><strong>0</strong><span className="muted small">Collected</span></div>
        <div className="glass stat"><strong>{listed.length}</strong><span className="muted small">Listed</span></div>
      </div>
      <div className="tabs" role="tablist">
        {['Created', 'Collected', 'Listed'].map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      {items.length === 0 ? (
        <div className="empty glass"><p className="muted">Nothing to show in this tab yet.</p></div>
      ) : (
        <div className="grid-3">{items.map((n) => <NftCard key={n.id} nft={n} />)}</div>
      )}
      <p className="muted tiny">Sample profile. Collected counts and verification badges are not shown because no wallet indexer is connected.</p>
    </main>
  );
}
