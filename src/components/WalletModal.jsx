import { useEffect } from 'react';
import { useWallet } from '../context/WalletContext.jsx';
import { WALLETCONNECT_PROJECT_ID } from '../web3/config.js';

export default function WalletModal() {
  const { modalOpen, setModalOpen, connectWith, connectors, busy, error, hasInjected } = useWallet();

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e) => e.key === 'Escape' && setModalOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalOpen, setModalOpen]);

  if (!modalOpen) return null;

  const isWalletConnect = (c) => c.id === 'walletConnect';
  const rows = connectors.map((c) => ({
    key: c.uid || c.id,
    connector: c,
    name: isWalletConnect(c) ? 'WalletConnect' : c.name,
    note: isWalletConnect(c) ? 'QR for mobile wallets' : 'Browser extension or injected wallet',
    disabled: busy,
  }));
  if (!WALLETCONNECT_PROJECT_ID) {
    rows.push({
      key: 'wc-off',
      connector: null,
      name: 'WalletConnect',
      note: 'Not enabled in this build (needs VITE_WALLETCONNECT_PROJECT_ID)',
      disabled: true,
    });
  }

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
          Orbix never asks for your seed phrase. Approve the connection in your wallet only. Orbix runs on
          Ethereum Sepolia testnet only.
        </p>
        <ul className="wallet-list">
          {rows.map((r) => (
            <li key={r.key}>
              <button
                className="wallet-item"
                disabled={r.disabled || !r.connector}
                onClick={() => r.connector && connectWith(r.connector)}
              >
                <span className="wallet-dot" aria-hidden="true" />
                <span>
                  <strong>{r.name}</strong>
                  <small>{r.note}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
        {!hasInjected && (
          <p className="notice small">No browser wallet detected. Install one, or use WalletConnect when it is enabled.</p>
        )}
        {error && <p className="error small" role="alert">{error}</p>}
      </div>
    </div>
  );
}
