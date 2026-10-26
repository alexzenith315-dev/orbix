import { useEffect } from 'react';
import { useWallet } from '../context/WalletContext.jsx';
import { useSession } from '../context/SessionContext.jsx';
import { WALLETCONNECT_PROJECT_ID } from '../web3/config.js';

export default function WalletModal() {
  const { modalOpen, setModalOpen, connectWith, connectors, busy, error, hasInjected, account, wrongNetwork, switchToSepolia } = useWallet();
  const session = useSession();

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e) => e.key === 'Escape' && setModalOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalOpen, setModalOpen]);

  // Close automatically once the wallet is connected on Sepolia AND the API session is signed in.
  useEffect(() => {
    if (account && !wrongNetwork && session.status === 'signed_in') setModalOpen(false);
  }, [account, wrongNetwork, session.status, setModalOpen]);

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

  const showSignIn = account && !wrongNetwork;

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
          <h2 id="wallet-title">{showSignIn ? 'Sign in to Orbix' : 'Connect a wallet'}</h2>
          <button className="icon-btn" aria-label="Close" onClick={() => setModalOpen(false)}>
            ×
          </button>
        </div>

        {!account && (
          <>
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
          </>
        )}

        {account && wrongNetwork && (
          <div>
            <p className="notice small">Your wallet is on an unsupported network. Orbix only works on Ethereum Sepolia.</p>
            <button className="btn btn-primary" onClick={switchToSepolia} disabled={busy}>
              Switch to Sepolia
            </button>
          </div>
        )}

        {showSignIn && (
          <div>
            <p className="muted small">
              Signing in proves you control this address with a free message signature. It sends no transaction and
              costs no gas.
            </p>
            <p className="tiny muted">Connected: {account.slice(0, 6)}…{account.slice(-4)}</p>
            <button className="btn btn-primary" onClick={session.signIn} disabled={session.busy || session.status === 'loading'}>
              {session.busy ? 'Waiting for signature…' : 'Sign in with wallet'}
            </button>
            {session.status === 'unreachable' && (
              <p className="error small" role="alert">Can't reach the Orbix API right now. You can still browse the marketplace.</p>
            )}
          </div>
        )}

        {error && <p className="error small" role="alert">{error}</p>}
        {session.error && <p className="error small" role="alert">{session.error}</p>}
      </div>
    </div>
  );
}
