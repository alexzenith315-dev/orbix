import { useState } from 'react';
import { Link } from 'react-router-dom';
import { NFTS, COLLECTIONS, CREATORS } from '../data.js';
import { NftArt } from '../components/NftArt.jsx';
import NftCard from '../components/NftCard.jsx';

export default function Home() {
  const featured = NFTS.slice(0, 3);
  const [tab, setTab] = useState('All');
  const trending = NFTS.filter((n) => tab === 'All' || n.category === tab).slice(0, 8);
  return (
    <main>
      <section className="hero">
        <div className="hero-glow" aria-hidden="true" />
        <div className="hero-copy">
          <span className="eyebrow">Drop 001 · Testnet preview</span>
          <h1>The next dimension of digital ownership</h1>
          <p className="lead">
            Mint, collect and trade 3D digital art. Orbix is a preview marketplace: listings below are sample
            data, and transactions run on testnets only.
          </p>
          <div className="hero-cta">
            <Link to="/marketplace" className="btn btn-primary btn-lg">Explore NFTs</Link>
            <Link to="/create" className="btn btn-ghost btn-lg">Create</Link>
          </div>
        </div>
        <div className="hero-art">
          <NftArt nft={NFTS[0]} float className="hero-piece" />
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Featured</h2>
          <Link to="/marketplace" className="link">View all →</Link>
        </div>
        <div className="grid-3">
          {featured.map((n) => <NftCard key={n.id} nft={n} />)}
        </div>
      </section>

      <section className="section">
        <div className="section-head"><h2>Collections</h2></div>
        <div className="grid-4">
          {COLLECTIONS.map((c) => (
            <Link to="/marketplace" key={c.name} className="collection glass">
              <div className="collection-art" style={{ background: `radial-gradient(circle at 30% 30%, hsl(${c.hue} 90% 60%), #060612 80%)` }} />
              <strong>{c.name}</strong>
              <span className="muted small">Floor {c.floor} ETH · {c.items} items</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Trending</h2>
          <div className="tabs" role="tablist">
            {['All', 'Art', 'Gaming', 'PFPs', 'Music', '3D'].map((c) => (
              <button key={c} role="tab" aria-selected={tab === c} className={`tab ${tab === c ? 'active' : ''}`} onClick={() => setTab(c)}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="grid-4">
          {trending.map((n) => <NftCard key={n.id} nft={n} />)}
        </div>
      </section>

      <section className="section">
        <div className="section-head"><h2>Creators</h2></div>
        <div className="grid-3">
          {CREATORS.map((c) => (
            <Link key={c.handle} to={`/creator/${c.handle}`} className="creator glass">
              <span className="avatar" aria-hidden="true">{c.name[0]}</span>
              <div>
                <strong>{c.name}</strong>
                <div className="muted small">{c.handle}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head"><h2>Built for the future</h2></div>
        <div className="grid-3">
          {[
            ['3D collectibles', 'Pointer-tilt viewers and a lazy-loaded 3D gallery with reduced-motion support.'],
            ['Trade with confidence', 'Wallet connect via your browser extension. Orbix never asks for a seed phrase.'],
            ['Creator studio', 'Upload, add metadata and royalties, and preview how your token will look.'],
          ].map(([t, d]) => (
            <div key={t} className="feature glass">
              <h3>{t}</h3>
              <p className="muted">{d}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
