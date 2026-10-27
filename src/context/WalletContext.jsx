import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAccount, useChainId, useConnect, useConnectors, useDisconnect, useSwitchChain } from 'wagmi';
import { EVM_CHAINS, EVM_CHAIN_BY_ID, DEFAULT_CHAIN_KEY } from '../lib/chains/index.js';
import { ENABLED_CHAINS, chainCfg } from '../web3/config.js';
import { contractsFor } from '../web3/contracts.js';
import { friendlyTxError } from '../web3/errors.js';

const WalletContext = createContext(null);
const STORE_KEY = 'orbix.chain';

function initialChainKey() {
  try {
    const saved = window.localStorage.getItem(STORE_KEY);
    if (saved && EVM_CHAINS[saved] && ENABLED_CHAINS.some((c) => c.key === saved)) return saved;
  } catch { /* storage blocked */ }
  return DEFAULT_CHAIN_KEY;
}

export function WalletProvider({ children }) {
  const { address, isConnected, connector } = useAccount();
  const chainId = useChainId();
  const configured = useConnectors();
  const { connect, isPending: connecting, error: connectError, reset: resetConnect } = useConnect();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { switchChain, isPending: switching, error: switchError } = useSwitchChain();
  const [modalOpen, setModalOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [selectedKey, setSelectedKey] = useState(initialChainKey);

  // When the wallet is on a supported Orbix chain, that chain becomes the selected one.
  useEffect(() => {
    if (isConnected && EVM_CHAIN_BY_ID[chainId]) setSelectedKey(EVM_CHAIN_BY_ID[chainId].key);
  }, [isConnected, chainId]);

  useEffect(() => {
    try { window.localStorage.setItem(STORE_KEY, selectedKey); } catch { /* ignore */ }
  }, [selectedKey]);

  const activeCfg = chainCfg(selectedKey);
  const contracts = useMemo(() => contractsFor(activeCfg.key), [activeCfg.key]);
  const wrongNetwork = isConnected && chainId !== activeCfg.chain.id;
  const hasInjected = typeof window !== 'undefined' && !!window.ethereum;

  useEffect(() => {
    if (!isConnected) return;
    if (!EVM_CHAIN_BY_ID[chainId]) {
      setNotice(`Your wallet is on an unsupported network. Switch to ${activeCfg.label}.`);
    } else if (wrongNetwork) {
      setNotice(`Your wallet is on another Orbix chain. Switch to ${activeCfg.label}.`);
    } else {
      setNotice('');
    }
  }, [isConnected, wrongNetwork, address, chainId, activeCfg.label]);

  const connectError2 = connectError ? friendlyTxError(connectError) : '';
  const error = connectError2 || (switchError ? friendlyTxError(switchError) : '') || '';

  const connectWith = useCallback(
    (connector) => {
      resetConnect();
      setNotice('');
      connect({ connector, chainId: activeCfg.chain.id });
    },
    [connect, resetConnect, activeCfg.chain.id]
  );

  const disconnect = useCallback(() => {
    wagmiDisconnect();
    setNotice('');
  }, [wagmiDisconnect]);

  // Picks a chain in the UI. If a wallet is connected, it also asks the wallet to switch.
  const selectChain = useCallback(
    (key) => {
      if (!chainCfg(key) || chainCfg(key).key !== key) return;
      setSelectedKey(key);
      if (isConnected) switchChain({ chainId: EVM_CHAINS[key].chain.id });
    },
    [isConnected, switchChain]
  );

  const switchToActive = useCallback(() => {
    switchChain({ chainId: activeCfg.chain.id });
  }, [switchChain, activeCfg.chain.id]);

  const value = useMemo(
    () => ({
      account: isConnected ? address : null,
      chainId,
      chainKey: activeCfg.key,
      chainLabel: activeCfg.label,
      chain: activeCfg.chain,
      chains: ENABLED_CHAINS,
      contracts,
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
      selectChain,
      switchToActive,
    }),
    [address, isConnected, chainId, activeCfg, contracts, wrongNetwork, connector, configured, error, notice, connecting, switching, hasInjected, modalOpen, connectWith, disconnect, selectChain, switchToActive]
  );
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used inside WalletProvider');
  return ctx;
}
