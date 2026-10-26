import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

// Real wallet connection via EIP-1193 (window.ethereum). Nothing is signed or sent by this app.
const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const hasInjected = typeof window !== 'undefined' && !!window.ethereum;

  useEffect(() => {
    const eth = window.ethereum;
    if (!eth || !eth.on) return;
    const onChange = (accounts) => setAccount(accounts && accounts[0] ? accounts[0] : null);
    eth.on('accountsChanged', onChange);
    return () => eth.removeListener && eth.removeListener('accountsChanged', onChange);
  }, []);

  const connectInjected = useCallback(async () => {
    setError('');
    if (!window.ethereum) {
      setError('No browser wallet found. Install MetaMask, Rabby or Coinbase Wallet, then try again.');
      return;
    }
    setBusy(true);
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0] || null);
      setModalOpen(false);
    } catch (e) {
      setError(e && e.message ? e.message : 'Connection request was rejected.');
    } finally {
      setBusy(false);
    }
  }, []);

  const disconnect = useCallback(() => setAccount(null), []);

  const value = useMemo(
    () => ({ account, error, busy, hasInjected, modalOpen, setModalOpen, connectInjected, disconnect }),
    [account, error, busy, hasInjected, modalOpen, connectInjected, disconnect]
  );
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used inside WalletProvider');
  return ctx;
}
