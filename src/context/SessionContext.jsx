import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { fetchMe, signInWithWallet, signOut as apiSignOut } from '../api/session.js';
import { describeError, isNetworkError } from '../api/client.js';
import { useWallet } from './WalletContext.jsx';

const SessionContext = createContext(null);

// status: 'loading' | 'signed_out' | 'signed_in' | 'unreachable'
export function SessionProvider({ children }) {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { account } = useWallet();
  const [status, setStatus] = useState('loading');
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const me = await fetchMe();
      setUser(me);
      setStatus('signed_in');
      setError('');
    } catch (err) {
      setUser(null);
      if (isNetworkError(err)) {
        setStatus('unreachable');
      } else {
        setStatus('signed_out');
      }
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const signIn = useCallback(async () => {
    if (!account) {
      setError('Connect a wallet first.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await signInWithWallet(account, signMessageAsync);
      await refresh();
    } catch (err) {
      // A rejected signature in the wallet is not an error worth a red box.
      if (err?.shortMessage?.toLowerCase().includes('reject') || err?.name === 'UserRejectedRequestError') {
        setError('Signature request was cancelled in your wallet.');
      } else {
        setError(describeError(err));
      }
    } finally {
      setBusy(false);
    }
  }, [account, signMessageAsync, refresh]);

  const signOut = useCallback(async () => {
    setBusy(true);
    try {
      await apiSignOut();
    } catch {
      // Even if the server is unreachable, drop the local view of the session.
    } finally {
      setUser(null);
      setStatus('signed_out');
      setBusy(false);
    }
  }, []);

  // If the wallet switches accounts, the old session no longer matches the wallet on screen.
  useEffect(() => {
    if (user && user.address && address && user.address.toLowerCase() !== address.toLowerCase()) {
      signOut();
    }
  }, [address, user, signOut]);

  const value = useMemo(
    () => ({ status, user, role: user?.role ?? null, error, busy, signIn, signOut, refresh }),
    [status, user, error, busy, signIn, signOut, refresh]
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}

// Role comparisons match the server ordering (USER < CREATOR < MODERATOR < ADMINISTRATOR).
const RANK = { USER: 0, CREATOR: 1, MODERATOR: 2, ADMINISTRATOR: 3 };
export function hasRole(role, required) {
  return (RANK[role] ?? -1) >= RANK[required];
}
