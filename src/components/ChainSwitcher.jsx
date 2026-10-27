import { useWallet } from '../context/WalletContext.jsx';

// Pick the Orbix testnet. Chains without deployed contracts still show, labelled "not deployed".
export default function ChainSwitcher() {
  const { chains, chainKey, selectChain, busy, contracts } = useWallet();
  return (
    <label className="chain-switcher tiny">
      <span className="sr-only">Chain</span>
      <select
        value={chainKey}
        disabled={busy}
        onChange={(e) => selectChain(e.target.value)}
        aria-label="Select chain"
      >
        {chains.map((c) => {
          const deployed = !!c.contracts && Object.values(c.contracts).some(Boolean);
          return (
            <option key={c.key} value={c.key}>
              {c.label}{deployed ? '' : ' (contract not deployed yet)'}
            </option>
          );
        })}
      </select>
    </label>
  );
}
