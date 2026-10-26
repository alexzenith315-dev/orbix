import { useAccount, useChainId, useConnect, useConnectors, useDisconnect, useSwitchChain } from 'wagmi';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ORBIX_CHAIN } from '../web3/config.js';
import { friendlyTxError } from '../web3/useContractTx.js';

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const { address, isConnected, connector } = useAccount();
  const chainId = useChainId();
  const configured = useConnectors();
  const { connect, isPending: connecting, error: connectError, reset: resetConnect } = useConnect();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { switchChain, isPending: switching, error: switchError } = useSwitchChain();
  const [modalOpen, setModalOpen] = useState(false);
  const [notice, setNotice] = useState('');

  const wrongNetwork = isConnected && chainId !== ORBIX_CHAIN.id;
  const hasInjected = typeof window !== 'undefined' && !!window.ethereum;

  // Tell the user when the connected account or network changes underneath them.
  useEffect(() => {
    if (!isConnected) return;
    if (wrongNetwork) {
      setNotice('Your wallet is on an unsupported network. Orbix only works on Ethereum Sepolia.');
    } else {
      setNotice('');
    }
  }, [isConnected, wrongNetwork, address, chainId]);

  const connectError2 = connectError ? friendlyTxError(connectError) : '';
  const error = connectError2 || (switchError ? friendlyTxError(switchError) : '') || '';

  const connectWith = useCallback(
    (connector) => {
      resetConnect();
      setNotice('');
      connect({ connector, chainId: ORBIX_CHAIN.id });
    },
    [connect, resetConnect]
  );

  const disconnect = useCallback(() => {
    wagmiDisconnect();
    setNotice('');
  }, [wagmiDisconnect]);

  const switchToSepolia = useCallback(() => {
    switchChain({ chainId: ORBIX_CHAIN.id });
  }, [switchChain]);

  const value = useMemo(
    () => ({
      account: isConnected ? address : null,
      chainId,
      wrongNetwork,
      connectorName: connector?.name || '',
      connectors: configured,
      error,
      notice,
      busy: connecting || switching,
      hasInjected,
      modalOpen,
      setModalOpen,
      connectWith,
      disconnect,
      switchToSepolia,
    }),
    [address, isConnected, chainId, wrongNetwork, connector, configured, error, notice, connecting, switching, hasInjected, modalOpen, connectWith, disconnect, switchToSepolia]
  );
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used inside WalletProvider');
  return ctx;
}
