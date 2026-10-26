import { useState } from 'react';
import { NFTS } from '../data.js';
import { NftArt } from '../components/NftArt.jsx';

// CSS 3D carousel (no WebGL dependency). Respects prefers-reduced-motion by stopping the spin.
export default function Gallery() {
  const items = NFTS.slice(0, 8);
  const [i, setI] = useState(0);
  const [spin, setSpin] = useState(true);
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const auto = spin && !reduced;
  const step = 360 / items.length;
  const active = items[((i % items.length) + items.length) % items.length];

  return (
    <main className="section">
      <div className="section-head">
        <h1>3D Gallery</h1>
        <button className="btn btn-ghost btn-sm" aria-pressed={auto} onClick={() => setSpin((s) => !s)}>
          {auto ? 'Pause' : 'Auto-rotate'}
        </button>
      </div>
      <div className="carousel-stage" aria-label="3D carousel">
        <div
          className={`carousel ${auto ? 'spin' : ''}`}
          style={{ transform: auto ? undefined : `rotateY(${-i * step}deg)` }}
        >
          {items.map((n, k) => (
            <div key={n.id} className="carousel-item" style={{ transform: `rotateY(${k * step}deg) translateZ(360px)` }}>
              <NftArt nft={n} />
            </div>
          ))}
        </div>
      </div>
      <div className="row center gap">
        <button className="btn btn-ghost" aria-label="Previous" onClick={() => { setSpin(false); setI(i - 1); }}>←</button>
        <div className="glass caption"><strong>{active.name}</strong><span className="muted small">{active.price} ETH</span></div>
        <button className="btn btn-ghost" aria-label="Next" onClick={() => { setSpin(false); setI(i + 1); }}>→</button>
      </div>
    </main>
  );
}
