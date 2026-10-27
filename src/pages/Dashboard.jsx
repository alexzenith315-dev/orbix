import { useReadContract } from 'wagmi';
import { TOKEN_FACTORY_ABI } from '../web3/contracts.js';
import { Link } from 'react-router-dom';
import { useApi, ErrorNote } from '../api/useApi.jsx';
import { useSession } from '../context/SessionContext.jsx';
import { useWallet } from '../context/WalletContext.jsx';

function Section({ title, note, children }) {
  return (
    <section className="glass dash-card">
      <h2>{title}</h2>
      {note && <p className="muted small">{note}</p>}
      {children}
    </section>
  );
}


function CreatedTokens({ account }) {
  const { contracts, chainLabel } = useWallet();
  const { tokenFactory: TOKEN_FACTORY_ADDRESS, tokenFactoryDeployed } = contracts;
  const list = useReadContract({
    address: TOKEN_FACTORY_ADDRESS,
    abi: TOKEN_FACTORY_ABI,
    functionName: 'tokensByCreator',
    args: [account],
    query: { enabled: tokenFactoryDeployed && !!account },
  });
  const tokens = list.data || [];
  return (
    <Section title="Your tokens" note={`Created through OrbixTokenFactory on ${chainLabel}.`}>
      {!tokenFactoryDeployed ? <Empty>Token factory not deployed.</Empty> : tokens.length === 0 ? (
        <Empty>No tokens yet. <Link to="/create-token">Create one</Link>.</Empty>
      ) : (
        <ul className="plain-list">
          {tokens.map((t) => (
            <li key={t}><Link to={`/token/${t}`}>{t.slice(0, 10)}…{t.slice(-6)}</Link></li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function Empty({ children }) {
  return <p className="muted">{children}</p>;
}

export default function Dashboard() {
  const session = useSession();
  const { setModalOpen, chainLabel } = useWallet();
  const signedIn = session.status === 'signed_in';
  const dash = useApi('/dashboard', { enabled: signedIn });

  if (session.status === 'loading') {
    return <main className="section"><p className="muted">Checking your session…</p></main>;
  }

  if (!signedIn) {
    return (
      <main className="section">
        <div className="empty glass">
          <h1>Sign in to see your dashboard</h1>
          <p className="muted">Your owned NFTs, purchases, listings, offers, favorites and follows come from the Orbix API. Sign in with your wallet to load them.</p>
          <button className="btn btn-primary" onClick={() => setModalOpen(true)}>Connect wallet</button>
        </div>
      </main>
    );
  }

  if (dash.status === 'loading') return <main className="section"><p className="muted">Loading your dashboard…</p></main>;
  if (dash.status === 'error') {
    return (
      <main className="section">
        <ErrorNote error={dash.error} onRetry={dash.reload} />
      </main>
    );
  }

  const d = dash.data || {};
  const ownedCount = d.owned?.count ?? 0;
  const purchases = d.purchases?.items ?? [];
  const listings = d.listings?.items ?? [];
  const offers = d.offersMade?.items ?? [];
  const favorites = d.favorites ?? [];
  const social = d.social ?? {};

  return (
    <main className="section dash">
      <div className="dash-head">
        <h1>Dashboard</h1>
        <p className="muted small">{session.user?.address ? `${session.user.address.slice(0, 6)}…${session.user.address.slice(-4)}` : 'No wallet linked'} · {chainLabel}</p>
      </div>
      <div className="dash-grid">
        <CreatedTokens account={session.user?.address} />
        <Section title="Owned" note={d.owned?.source}>
          {ownedCount === 0 ? <Empty>No owned NFTs found in the indexed chain data yet.</Empty> : <p>{ownedCount} owned.</p>}
        </Section>
        <Section title="Purchases" note={d.purchases?.source}>
          {purchases.length === 0 ? <Empty>No indexed purchases for this address.</Empty> : (
            <ul className="plain-list">{purchases.map((p) => <li key={p.id}>Purchased token {p.tokenId} · block {p.blockNumber}</li>)}</ul>
          )}
        </Section>
        <Section title="Listings" note={d.listings?.source}>
          {listings.length === 0 ? <Empty>No indexed listings for this address.</Empty> : (
            <ul className="plain-list">{listings.map((l) => <li key={l.id}>Listed token {l.tokenId} · block {l.blockNumber}</li>)}</ul>
          )}
        </Section>
        <Section title="Offers made" note={d.offersMade?.source}>
          {offers.length === 0 ? <Empty>No indexed offers from this address.</Empty> : (
            <ul className="plain-list">{offers.map((o) => <li key={o.id}>Offer on token {o.tokenId} · block {o.blockNumber}</li>)}</ul>
          )}
        </Section>
        <Section title="Favorites">
          {favorites.length === 0 ? <Empty>You have not saved any items yet. Save one from the marketplace.</Empty> : (
            <ul className="plain-list">
              {favorites.map((f) => (
                <li key={f.id}>
                  <Link to={`/item/${encodeURIComponent(f.asset)}`}>{f.name || `Token ${f.tokenId}`}</Link>
                  {f.placeholderArt && <span className="tag tiny"> placeholder art</span>}
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="Following">
          <p>{social.following ?? 0} following · {social.followers ?? 0} followers</p>
        </Section>
      </div>
    </main>
  );
}
