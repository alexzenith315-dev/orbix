import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useReadContract, useReadContracts, useConfig } from 'wagmi';
import { formatUnits, parseUnits, parseEventLogs, isAddress } from 'viem';
import { useWallet } from '../context/WalletContext.jsx';
import { useContractTx } from '../web3/useContractTx.js';
import { TOKEN_ABI, PAIRING_ABI, NFT_ABI, NOT_DEPLOYED_LABEL } from '../web3/contracts.js';
import { explorerAddress, explorerTx } from '../web3/config.js';
import TxStatus from '../components/TxStatus.jsx';

// Runs writes in order (approve then deposit/redeem) and reports the stage name in progress.
function useSteps() {
  const tx = useContractTx();
  const [stage, setStage] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async (steps) => {
    setBusy(true);
    try {
      let receipt = null;
      for (const [label, params] of steps) {
        setStage(label);
        receipt = await tx.run(params);
        if (!receipt) return null;
      }
      return receipt;
    } finally {
      setBusy(false);
      setStage('');
    }
  };
  return { tx, run, busy, stage };
}

function Redeem({ token, decimals, account, setModalOpen, blocked }) {
  const { contracts } = useWallet();
  const { pairing: PAIRING_ADDRESS, pairingDeployed, nftDeployed } = contracts;
  const { tx, run, busy, stage } = useSteps();
  const [nft, setNft] = useState('');
  const [tokenId, setTokenId] = useState('');
  const [formError, setFormError] = useState('');
  const [received, setReceived] = useState(null);

  const pairedNft = isAddress(nft) ? nft : undefined;
  const pair = useReadContract({
    address: PAIRING_ADDRESS,
    abi: PAIRING_ABI,
    functionName: 'pairs',
    args: [pairedNft],
    query: { enabled: pairingDeployed && !!pairedNft },
  });
  const [pairedToken, amountPerNft, active] = pair.data || [];
  const isPairedHere = pairedToken && String(pairedToken).toLowerCase() === token.toLowerCase() && active;

  const redeem = async () => {
    setFormError('');
    setReceived(null);
    if (!account) return setModalOpen(true);
    if (!pairedNft) return setFormError('Enter a valid NFT collection address.');
    if (!/^\d+$/.test(tokenId)) return setFormError('Enter the NFT token id.');
    const id = BigInt(tokenId);
    const receipt = await run([
      ['Approve NFT', { address: pairedNft, abi: NFT_ABI, functionName: 'approve', args: [PAIRING_ADDRESS, id] }],
      ['Redeem', { address: PAIRING_ADDRESS, abi: PAIRING_ABI, functionName: 'redeem', args: [pairedNft, id] }],
    ]);
    if (!receipt) return;
    const events = parseEventLogs({ abi: PAIRING_ABI, logs: receipt.logs, eventName: 'Redeemed' });
    const amt = events[0]?.args?.amount ?? amountPerNft ?? 0n;
    setReceived(amt);
    setTokenId('');
  };

  return (
    <section className="glass dash-card">
      <h2>Redeem an NFT</h2>
      <p className="muted small">
        Redeeming sends you the paired amount of this token and locks the NFT in the pairing contract. Locked NFTs cannot be withdrawn yet.
      </p>
      <div className="stack">
        <label className="field">
          <span>NFT collection address</span>
          <input value={nft} onChange={(e) => setNft(e.target.value.trim())} placeholder="0x..." disabled={busy} />
        </label>
        <label className="field">
          <span>NFT token id</span>
          <input value={tokenId} onChange={(e) => setTokenId(e.target.value.trim())} placeholder="1" disabled={busy} />
        </label>
      </div>
      {pairedNft && pair.data && !isPairedHere && (
        <p className="muted small">This collection is not paired with this token.</p>
      )}
      {isPairedHere && (
        <p className="small">Paired at {formatUnits(amountPerNft, 18)} {'tokens per NFT'}.</p>
      )}
      <button className="btn btn-primary" onClick={redeem} disabled={busy || blocked || !isPairedHere || !tokenId}>
        {stage ? `${stage}…` : 'Approve and redeem'}
      </button>
      {formError && <p className="error small">{formError}</p>}
      <TxStatus phase={tx.phase} hash={tx.hash} error={tx.error} />
      {received !== null && (
        <p className="small">
          You received {formatUnits(received, decimals ?? 18)} tokens. The NFT is now locked in the pairing contract.{' '}
          <a href={explorerTx(tx.hash, chainKey)} target="_blank" rel="noreferrer">View transaction</a>
        </p>
      )}
    </section>
  );
}

function Pairing({ token, account, setModalOpen, isCreator, decimals, blocked }) {
  const { tx, run, busy, stage } = useSteps();
  const [nft, setNft] = useState('');
  const [amount, setAmount] = useState('50000');
  const [fundAmount, setFundAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [formError, setFormError] = useState('');
  const { contracts, switchToActive, chainLabel } = useWallet();
  const { pairing: PAIRING_ADDRESS, pairingDeployed, nftDeployed } = contracts;
  const dec = decimals ?? 18;
  const notDeployed = !pairingDeployed || !nftDeployed;

  const reserve = useReadContract({
    address: PAIRING_ADDRESS,
    abi: PAIRING_ABI,
    functionName: 'reserveOf',
    args: [token],
    query: { enabled: pairingDeployed },
  });
  const reserveBal = reserve.data ?? 0n;

  const parse = (v, label) => {
    try {
      const n = parseUnits(v || '0', dec);
      if (n <= 0n) { setFormError(`${label} must be greater than zero.`); return null; }
      return n;
    } catch {
      setFormError(`${label} is not a valid number.`);
      return null;
    }
  };

  const setPairing = async () => {
    setFormError('');
    if (!account) return setModalOpen(true);
    if (!isAddress(nft)) return setFormError('Enter a valid NFT collection address.');
    const amt = parse(amount, 'Tokens per NFT');
    if (amt === null) return;
    const r = await run([['Set pairing', { address: PAIRING_ADDRESS, abi: PAIRING_ABI, functionName: 'setPairing', args: [nft, token, amt] }]]);
    if (r) reserve.refetch();
  };

  const fund = async () => {
    setFormError('');
    if (!account) return setModalOpen(true);
    const amt = parse(fundAmount, 'Fund amount');
    if (amt === null) return;
    const r = await run([
      ['Approve tokens', { address: token, abi: TOKEN_ABI, functionName: 'approve', args: [PAIRING_ADDRESS, amt] }],
      ['Deposit to reserve', { address: PAIRING_ADDRESS, abi: PAIRING_ABI, functionName: 'depositReserve', args: [token, amt] }],
    ]);
    if (r) { setFundAmount(''); reserve.refetch(); }
  };

  const withdraw = async () => {
    setFormError('');
    if (!account) return setModalOpen(true);
    const amt = parse(withdrawAmount, 'Withdraw amount');
    if (amt === null) return;
    const r = await run([['Withdraw reserve', { address: PAIRING_ADDRESS, abi: PAIRING_ABI, functionName: 'withdrawReserve', args: [token, amt] }]]);
    if (r) { setWithdrawAmount(''); reserve.refetch(); }
  };

  const off = busy || blocked || notDeployed;

  return (
    <section className="glass dash-card">
      <h2>Pairing</h2>
      <p className="muted small">Holders of a paired NFT can redeem it for tokens from this token's reserve.</p>
      {notDeployed && <p className="notice small">{NOT_DEPLOYED_LABEL}</p>}
      <p className="small">Reserve balance: {formatUnits(reserveBal, dec)} tokens</p>

      {isCreator && !notDeployed && (
        <>
          <div className="stack">
            <label className="field">
              <span>NFT collection address</span>
              <input value={nft} onChange={(e) => setNft(e.target.value.trim())} placeholder="0x..." disabled={busy} />
            </label>
            <label className="field">
              <span>Tokens per NFT</span>
              <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="50000" disabled={busy} />
            </label>
            <button className="btn btn-primary" onClick={setPairing} disabled={off}>Set pairing</button>
          </div>

          <div className="stack">
            <label className="field">
              <span>Fund reserve (tokens)</span>
              <input value={fundAmount} onChange={(e) => setFundAmount(e.target.value)} placeholder="1000000" disabled={busy} />
            </label>
            <button className="btn btn-primary" onClick={fund} disabled={off}>
              {stage ? `${stage}…` : 'Approve and fund reserve'}
            </button>
          </div>

          <div className="stack">
            <label className="field">
              <span>Withdraw reserve (tokens)</span>
              <input value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} disabled={busy} />
            </label>
            <button className="btn btn-ghost" onClick={withdraw} disabled={off}>Withdraw from reserve</button>
          </div>
        </>
      )}
      {!isCreator && <p className="muted small">Only the token creator can set pairing and manage the reserve.</p>}
      {blocked && (
        <p className="notice small">
          Wrong network. <button className="btn btn-ghost btn-sm" onClick={switchToActive}>Switch to {chainLabel}</button>
        </p>
      )}
      {formError && <p className="error small">{formError}</p>}
      {isCreator && <TxStatus phase={tx.phase} hash={tx.hash} error={tx.error} />}
    </section>
  );
}

export default function TokenPage() {
  const { address: token } = useParams();
  const { account, setModalOpen, wrongNetwork, chainKey } = useWallet();
  const validToken = isAddress(token || '');
  const blocked = !!account && wrongNetwork;

  const info = useReadContracts({
    contracts: validToken
      ? [
          { address: token, abi: TOKEN_ABI, functionName: 'name' },
          { address: token, abi: TOKEN_ABI, functionName: 'symbol' },
          { address: token, abi: TOKEN_ABI, functionName: 'decimals' },
          { address: token, abi: TOKEN_ABI, functionName: 'creator' },
        ]
      : [],
    query: { enabled: validToken },
  });

  if (!validToken) return <main className="section"><p className="error">Invalid token address.</p></main>;

  const [name, symbol, decimals, creator] = (info.data || []).map((r) => r?.result);
  const isCreator = !!account && !!creator && account.toLowerCase() === String(creator).toLowerCase();

  return (
    <main className="section narrow">
      <div className="section-head">
        <h1>{name ?? 'Token'} {symbol ? `(${symbol})` : ''}</h1>
        <span className="muted small"><a href={explorerAddress(token, chainKey)} target="_blank" rel="noreferrer">{token}</a></span>
      </div>
      <p className="small muted">Creator: {creator ?? '…'} · <Link to="/create-token">Create a token</Link></p>
      <Pairing
        token={token}
        account={account}
        setModalOpen={setModalOpen}
        isCreator={isCreator}
        decimals={decimals}
        blocked={blocked}
      />
      <Redeem token={token} decimals={decimals} account={account} setModalOpen={setModalOpen} blocked={blocked} />
    </main>
  );
}
