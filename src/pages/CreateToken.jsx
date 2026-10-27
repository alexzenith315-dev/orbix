import { useState } from 'react';
import { Link } from 'react-router-dom';
import { decodeEventLog, formatUnits } from 'viem';
import { useWallet } from '../context/WalletContext.jsx';
import { useContractTx } from '../web3/useContractTx.js';
import {
  TOKEN_FACTORY_ABI,
  TOKEN_FACTORY_ADDRESS,
  tokenFactoryDeployed,
  NOT_DEPLOYED_LABEL,
} from '../web3/contracts.js';
import { explorerTx, explorerAddress } from '../web3/config.js';
import TxStatus from '../components/TxStatus.jsx';

export default function CreateToken() {
  const { account, setModalOpen, wrongNetwork, switchToSepolia } = useWallet();
  const tx = useContractTx();
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [result, setResult] = useState(null);
  const [formError, setFormError] = useState('');

  const busy = tx.phase === 'wallet' || tx.phase === 'pending';
  const valid = name.trim().length > 0 && symbol.trim().length > 0;

  const create = async (e) => {
    e.preventDefault();
    setFormError('');
    setResult(null);
    if (!account) return setModalOpen(true);
    if (!valid) return setFormError('Name and symbol are both required.');
    const receipt = await tx.run({
      address: TOKEN_FACTORY_ADDRESS,
      abi: TOKEN_FACTORY_ABI,
      functionName: 'createToken',
      args: [name.trim(), symbol.trim().toUpperCase()],
    });
    if (!receipt) return;
    // Read the new token address and the 95/5 split from the TokenCreated event.
    for (const log of receipt.logs || []) {
      try {
        const ev = decodeEventLog({ abi: TOKEN_FACTORY_ABI, data: log.data, topics: log.topics });
        if (ev.eventName === 'TokenCreated') {
          setResult({
            token: ev.args.token,
            name: ev.args.name,
            symbol: ev.args.symbol,
            maxSupply: ev.args.maxSupply,
            creatorAllocation: ev.args.creatorAllocation,
            platformAllocation: ev.args.platformAllocation,
          });
          return;
        }
      } catch {
        /* not this event */
      }
    }
    setFormError('Token created, but the address was not found in the receipt. Check your dashboard tokens list.');
  };

  if (!tokenFactoryDeployed) {
    return (
      <main className="section narrow">
        <div className="section-head"><h1>Create token</h1></div>
        <p className="notice small">{NOT_DEPLOYED_LABEL}</p>
      </main>
    );
  }

  return (
    <main className="section narrow">
      <div className="section-head"><h1>Create token</h1><span className="muted small">Testnet only</span></div>
      <div className="glass panel">
        <p className="muted small">
          Mints a fixed 100,000,000 supply. 95% goes to you (the creator) and 5% to the platform fee recipient.
        </p>
        <form onSubmit={create} className="stack">
          <label className="field">
            <span>Name</span>
            <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="Orbix Gold" disabled={busy} />
          </label>
          <label className="field">
            <span>Symbol</span>
            <input value={symbol} maxLength={10} onChange={(e) => setSymbol(e.target.value)} placeholder="GOLD" disabled={busy} />
          </label>
          {formError && <p className="error small">{formError}</p>}
          {account && wrongNetwork && (
            <p className="notice small">
              Wrong network. <button type="button" className="btn btn-ghost btn-sm" onClick={switchToSepolia}>Switch to Sepolia</button>
            </p>
          )}
          <button type="submit" className="btn btn-primary" disabled={busy || (account && wrongNetwork)}>
            {account ? 'Create token on Sepolia' : 'Connect wallet to create'}
          </button>
          <TxStatus phase={tx.phase} hash={tx.hash} error={tx.error} />
        </form>
      </div>

      {result && (
        <div className="glass panel">
          <h2>{result.name} ({result.symbol})</h2>
          <ul className="plain-list">
            <li>Total supply: {formatUnits(result.maxSupply, 18)}</li>
            <li>To you (creator): {formatUnits(result.creatorAllocation, 18)} (95%)</li>
            <li>To platform: {formatUnits(result.platformAllocation, 18)} (5%)</li>
            <li>Token address: <a href={explorerAddress(result.token)} target="_blank" rel="noreferrer">{result.token}</a></li>
          </ul>
          <p className="small">
            <Link to={`/token/${result.token}`} className="btn btn-ghost btn-sm">Open token and pairing</Link>{' '}
            <a href={explorerTx(tx.hash)} target="_blank" rel="noreferrer">View transaction</a>
          </p>
        </div>
      )}
    </main>
  );
}
