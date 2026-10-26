import { useEffect } from 'react';
import { useWallet } from '../context/WalletContext.jsx';

const WALLETS = [
  { name: 'MetaMask', note: 'Browser extension' },
  { name: 'Rabby', note: 'Browser extension' },
  { name: 'Coinbase Wallet', note: 'Browser extension or app' },
  { name: 'Trust Wallet', note: 'Browser extension or app' },
  { name: 'Rainbow', note: 'Mobile app' },
  { name: 'WalletConnect', note: 'QR for mobile wallets (not wired in this build)' },
];

export default function WalletModal() {
  const { modalOpen, setModalOpen, connectInjected, busy, error, hasInjected } = useWallet();

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e) => e.key === 'Escape' && setModalOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalOpen, setModalOpen]);

  if (!modalOpen) return null;
  return (
    <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
      <div
        className="modal glass"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2 id="wallet-title">Connect a wallet</h2>
          <button className="icon-btn" aria-label="Close" onClick={() => setModalOpen(false)}>
            ×
          </button>
        </div>
        <p className="muted small">
          Orbix never asks for your seed phrase. Approve the connection in your wallet only.
        </p>
        <ul className="wallet-list">
          {WALLETS.map((w) => (
            <li key={w.name}>
              <button
                className="wallet-item"
                disabled={busy || w.name === 'WalletConnect'}
                onClick={connectInjected}
              >
                <span className="wallet-dot" aria-hidden="true" />
                <span>
                  <strong>{w.name}</strong>
                  <small>{w.note}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
        {!hasInjected && (
          <p className="notice small">No injected wallet detected in this browser. Install one, then reload.</p>
        )}
        {error && <p className="error small" role="alert">{error}</p>}
      </div>
    </div>
  );
}
