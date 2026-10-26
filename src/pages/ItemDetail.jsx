import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { getNft, NFTS } from '../data.js';
import { NftArt } from '../components/NftArt.jsx';
import NftCard from '../components/NftCard.jsx';
import { useWallet } from '../context/WalletContext.jsx';

export default function ItemDetail() {
  const { id } = useParams();
  const nft = getNft(id);
  const { account, setModalOpen } = useWallet();
  const [status, setStatus] = useState('');

  if (!nft) {
    return (
      <main className="section">
        <div className="empty glass">
          <h2>NFT not found</h2>
          <Link to="/marketplace" className="btn btn-primary">Back to marketplace</Link>
        </div>
      </main>
    );
  }

  const more = NFTS.filter((n) => n.collection === nft.collection && n.id !== nft.id).slice(0, 3);

  const buy = () => {
    if (!account) return setModalOpen(true);
    setStatus('Purchase flow is not connected to a contract in this build. Nothing was sent.');
  };
  const offer = () => {
    if (!account) return setModalOpen(true);
    setStatus('Offers need the marketplace contract, which is not deployed in this build. Nothing was sent.');
  };

  return (
    <main className="section">
      <nav className="crumbs muted small" aria-label="Breadcrumb">
        <Link to="/marketplace">Marketplace</Link> / <span>{nft.collection}</span> / <span>{nft.name}</span>
      </nav>
      <div className="detail">
        <div className="detail-media glass">
          <NftArt nft={nft} float />
        </div>
        <div className="detail-info">
          <span className="eyebrow">{nft.collection}</span>
          <h1>{nft.name}</h1>
          <p className="muted small">
            Created by <Link to={`/creator/${nft.creator}`}>{nft.creator}</Link> · Royalty {nft.royalty}% · {nft.chain}
          </p>
          <div className="glass price-box">
            <span className="muted small">Current price</span>
            <div className="price big">{nft.price} ETH</div>
            <div className="hero-cta">
              <button className="btn btn-primary btn-lg" onClick={buy} disabled={!nft.listed}>
                {nft.listed ? 'Buy now' : 'Not listed'}
              </button>
              <button className="btn btn-ghost btn-lg" onClick={offer}>Make offer</button>
            </div>
            {status && <p className="notice small" role="status">{status}</p>}
          </div>
          <p>{nft.description}</p>

          <h3>Properties</h3>
          <div className="props">
            {nft.properties.map((p) => (
              <div key={p.k} className="prop glass">
                <span className="muted tiny">{p.k}</span>
                <strong>{p.v}</strong>
              </div>
            ))}
          </div>

          <h3>Activity</h3>
          <ul className="history glass">
            {nft.history.map((h, i) => (
              <li key={i}>
                <strong>{h.type}</strong>
                <span className="muted small">{h.by}{h.price ? ` · ${h.price} ETH` : ''}</span>
                <span className="muted tiny">{h.when}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {more.length > 0 && (
        <section className="section">
          <div className="section-head"><h2>More from {nft.collection}</h2></div>
          <div className="grid-3">{more.map((n) => <NftCard key={n.id} nft={n} />)}</div>
        </section>
      )}
    </main>
  );
}
