import { useMemo, useState } from 'react';
import { NFTS, CATEGORIES, SORTS, COLLECTIONS } from '../data.js';
import NftCard from '../components/NftCard.jsx';

const PAGE_SIZE = 12;
const CHAINS = ['All chains', 'Ethereum Sepolia', 'Polygon Amoy', 'Base Sepolia'];

export default function Marketplace() {
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('All');
  const [chain, setChain] = useState('All chains');
  const [collection, setCollection] = useState('All');
  const [maxPrice, setMaxPrice] = useState(10);
  const [sort, setSort] = useState(SORTS[0]);
  const [view, setView] = useState('grid');
  const [page, setPage] = useState(1);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = NFTS.filter((n) => {
      if (category !== 'All' && n.category !== category) return false;
      if (chain !== 'All chains' && n.chain !== chain) return false;
      if (collection !== 'All' && n.collection !== collection) return false;
      if (n.price > maxPrice) return false;
      if (term && !`${n.name} ${n.collection} ${n.creator}`.toLowerCase().includes(term)) return false;
      return true;
    });
    if (sort === SORTS[1]) list = [...list].sort((a, b) => a.price - b.price);
    if (sort === SORTS[2]) list = [...list].sort((a, b) => b.price - a.price);
    if (sort === SORTS[3]) list = [...list].sort((a, b) => b.likes - a.likes);
    return list;
  }, [q, category, chain, collection, maxPrice, sort]);

  const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const slice = results.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const reset = () => {
    setQ(''); setCategory('All'); setChain('All chains'); setCollection('All'); setMaxPrice(10); setSort(SORTS[0]); setPage(1);
  };

  return (
    <main className="section">
      <div className="section-head">
        <h1>Marketplace</h1>
        <span className="muted small">{results.length} result{results.length === 1 ? '' : 's'}</span>
      </div>

      <div className="tabs" role="tablist" aria-label="Category">
        {CATEGORIES.map((c) => (
          <button key={c} role="tab" aria-selected={category === c} className={`tab ${category === c ? 'active' : ''}`} onClick={() => { setCategory(c); setPage(1); }}>
            {c}
          </button>
        ))}
      </div>

      <div className="market-layout">
        <aside className="filters glass" aria-label="Filters">
          <label className="field">
            <span>Search</span>
            <input type="search" value={q} placeholder="Name, collection, creator" onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          </label>
          <label className="field">
            <span>Chain</span>
            <select value={chain} onChange={(e) => { setChain(e.target.value); setPage(1); }}>
              {CHAINS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Collection</span>
            <select value={collection} onChange={(e) => { setCollection(e.target.value); setPage(1); }}>
              <option>All</option>
              {COLLECTIONS.map((c) => <option key={c.name}>{c.name}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Max price: {maxPrice} ETH</span>
            <input type="range" min="0.1" max="10" step="0.1" value={maxPrice} onChange={(e) => { setMaxPrice(Number(e.target.value)); setPage(1); }} />
          </label>
          <button className="btn btn-ghost btn-sm" onClick={reset}>Reset filters</button>
        </aside>

        <section>
          <div className="toolbar">
            <label className="field inline">
              <span className="muted small">Sort</span>
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                {SORTS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
            <div className="view-toggle" role="group" aria-label="View">
              <button className={`btn btn-ghost btn-sm ${view === 'grid' ? 'active' : ''}`} aria-pressed={view === 'grid'} onClick={() => setView('grid')}>Grid</button>
              <button className={`btn btn-ghost btn-sm ${view === 'list' ? 'active' : ''}`} aria-pressed={view === 'list'} onClick={() => setView('list')}>List</button>
            </div>
          </div>

          {slice.length === 0 ? (
            <div className="empty glass">
              <h3>No NFTs match these filters</h3>
              <p className="muted">Try widening the price range or resetting filters.</p>
              <button className="btn btn-primary" onClick={reset}>Reset filters</button>
            </div>
          ) : (
            <div className={view === 'grid' ? 'grid-3' : 'list'}>
              {slice.map((n) => <NftCard key={n.id} nft={n} view={view} />)}
            </div>
          )}

          {pages > 1 && (
            <nav className="pager" aria-label="Pagination">
              <button className="btn btn-ghost btn-sm" disabled={current === 1} onClick={() => setPage(current - 1)}>Prev</button>
              <span className="muted small">Page {current} of {pages}</span>
              <button className="btn btn-ghost btn-sm" disabled={current === pages} onClick={() => setPage(current + 1)}>Next</button>
            </nav>
          )}
        </section>
      </div>
      <p className="muted tiny">Sample catalog. Listings are placeholders and do not reflect live on-chain data.</p>
    </main>
  );
}
