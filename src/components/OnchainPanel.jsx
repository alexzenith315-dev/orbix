import { useEffect, useState } from 'react';
import { useConfig, useReadContract } from 'wagmi';
import { readContracts } from 'wagmi/actions';
import { formatEther, parseEther } from 'viem';
import {
  MARKETPLACE_ABI,
  MARKETPLACE_ADDRESS,
  NFT_ABI,
  NFT_ADDRESS,
  NOT_DEPLOYED_LABEL,
  PLATFORM_FEE_BPS,
  marketplaceDeployed,
  nftDeployed,
} from '../web3/contracts.js';
import { useContractTx } from '../web3/useContractTx.js';
import { explorerAddress } from '../web3/config.js';
import TxStatus from './TxStatus.jsx';
import { useWallet } from '../context/WalletContext.jsx';

const MAX_LISTING_SCAN = 200;

/** Reads active on-chain listings for one NFT contract + token. Returns { listingId, price } or null. */
export function useOnchainListing(tokenId) {
  const config = useConfig();
  const [state, setState] = useState({ loading: false, listing: null, error: '' });

  useEffect(() => {
    if (!marketplaceDeployed || !nftDeployed) return undefined;
    let cancelled = false;
    (async () => {
      setState({ loading: true, listing: null, error: '' });
      try {
        const next = await readContracts(config, {
          contracts: [{ address: MARKETPLACE_ADDRESS, abi: MARKETPLACE_ABI, functionName: 'nextListingId' }],
        });
        const count = Math.min(Number(next[0].result) - 1, MAX_LISTING_SCAN);
        let found = null;
        if (count > 0) {
          const ids = Array.from({ length: count }, (_, i) => i + 1);
          const rows = await readContracts(config, {
            contracts: ids.map((id) => ({ address: MARKETPLACE_ADDRESS, abi: MARKETPLACE_ABI, functionName: 'listings', args: [BigInt(id)] })),
          });
          rows.forEach((r, i) => {
            if (found || r.status !== 'success') return;
            const [seller, nft, tid, price, active] = r.result;
            if (active && nft.toLowerCase() === NFT_ADDRESS.toLowerCase() && tid === BigInt(tokenId)) {
              found = { listingId: BigInt(ids[i]), price, seller };
            }
          });
        }
        if (!cancelled) setState({ loading: false, listing: found, error: '' });
      } catch (e) {
        if (!cancelled) setState({ loading: false, listing: null, error: e?.shortMessage || 'Could not read listings.' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [config, tokenId]);

  return state;
}

export function CostBreakdown({ priceEth, royaltyPct }) {
  const price = Number(priceEth);
  const fee = price * (PLATFORM_FEE_BPS / 10000);
  const royalty = price * ((royaltyPct || 0) / 100);
  const seller = price - fee - royalty;
  const f = (n) => n.toFixed(6).replace(/0+$/, '').replace(/\.$/, '') || '0';
  return (
    <dl className="cost small">
      <div><dt>Price</dt><dd>{f(price)} ETH</dd></div>
      <div><dt>Platform fee (2.5%)</dt><dd>{f(fee)} ETH</dd></div>
      <div><dt>Creator royalty ({royaltyPct}%)</dt><dd>{f(royalty)} ETH</dd></div>
      <div><dt>Seller receives</dt><dd>{f(seller)} ETH</dd></div>
      <div><dt>Network gas</dt><dd className="muted">estimated by your wallet on confirmation</dd></div>
    </dl>
  );
}

/** Buy, offer and ownership wiring for an item detail page. Placeholder art; chain data only when deployed. */
export function OnchainPanel({ nft }) {
  const { account, setModalOpen, wrongNetwork, switchToSepolia } = useWallet();
  const tokenId = Number(nft.id);
  const listing = useOnchainListing(tokenId);
  const tx = useContractTx();
  const [offerEth, setOfferEth] = useState(String(nft.price));
  const [offerDays, setOfferDays] = useState(7);

  const owner = useReadContract({
    address: NFT_ADDRESS,
    abi: NFT_ABI,
    functionName: 'ownerOf',
    args: [BigInt(tokenId)],
    query: { enabled: nftDeployed },
  });

  const notDeployed = !marketplaceDeployed || !nftDeployed;
  const busyTx = tx.phase === 'wallet' || tx.phase === 'pending';
  const blockedByNetwork = account && wrongNetwork;
  const onchainPrice = listing.listing ? formatEther(listing.listing.price) : null;

  const buy = async () => {
    if (!account) return setModalOpen(true);
    if (!listing.listing) return;
    await tx.run({
      address: MARKETPLACE_ADDRESS,
      abi: MARKETPLACE_ABI,
      functionName: 'buy',
      args: [listing.listing.listingId],
      value: listing.listing.price,
    });
  };

  const offer = async () => {
    if (!account) return setModalOpen(true);
    let value;
    try {
      value = parseEther(String(offerEth));
    } catch {
      return;
    }
    if (value <= 0n) return;
    await tx.run({
      address: MARKETPLACE_ADDRESS,
      abi: MARKETPLACE_ABI,
      functionName: 'makeOffer',
      args: [NFT_ADDRESS, BigInt(tokenId), BigInt(Number(offerDays) * 24 * 3600)],
      value,
    });
  };

  return (
    <div className="onchain">
      <p className="tiny muted">
        {nftDeployed ? (
          <>
            Contract: <a href={explorerAddress(NFT_ADDRESS)} target="_blank" rel="noopener noreferrer">{NFT_ADDRESS.slice(0, 10)}…</a>{' '}
            (Sepolia testnet)
          </>
        ) : (
          NOT_DEPLOYED_LABEL
        )}
      </p>
      {nftDeployed && (
        <p className="small">
          On-chain owner of token #{tokenId}:{' '}
          {owner.isLoading ? 'reading…' : owner.isError ? 'not minted on this contract' : <code>{owner.data}</code>}
        </p>
      )}
      {nftDeployed && listing.loading && <p className="tiny muted">Reading listings…</p>}
      {nftDeployed && listing.error && <p className="error small">{listing.error}</p>}

      {blockedByNetwork && (
        <p className="notice small">
          Wrong network. Switch to Ethereum Sepolia to transact.{' '}
          <button className="btn btn-ghost btn-sm" onClick={switchToSepolia}>Switch to Sepolia</button>
        </p>
      )}

      {listing.listing && !notDeployed ? (
        <>
          <CostBreakdown priceEth={onchainPrice} royaltyPct={nft.royalty} />
          <button className="btn btn-primary btn-lg" onClick={buy} disabled={busyTx || blockedByNetwork}>
            {account ? `Buy for ${onchainPrice} ETH` : 'Connect wallet to buy'}
          </button>
        </>
      ) : notDeployed ? (
        <button className="btn btn-primary btn-lg" disabled title={NOT_DEPLOYED_LABEL}>{NOT_DEPLOYED_LABEL}</button>
      ) : (
        <p className="muted small">No active on-chain listing for this token.</p>
      )}

      <div className="offer-row">
        <label className="field inline">
          <span className="tiny">Offer (ETH)</span>
          <input value={offerEth} onChange={(e) => setOfferEth(e.target.value)} inputMode="decimal" style={{ width: '6rem' }} disabled={notDeployed} />
        </label>
        <label className="field inline">
          <span className="tiny">Expires in (days, max 30)</span>
          <input type="number" min="1" max="30" value={offerDays} onChange={(e) => setOfferDays(e.target.value)} style={{ width: '4.5rem' }} disabled={notDeployed} />
        </label>
        <button className="btn btn-ghost" onClick={offer} disabled={notDeployed || busyTx || blockedByNetwork} title={notDeployed ? NOT_DEPLOYED_LABEL : ''}>
          {notDeployed ? NOT_DEPLOYED_LABEL : 'Make offer (escrowed)'}
        </button>
      </div>
      <TxStatus phase={tx.phase} hash={tx.hash} error={tx.error} />
      {tx.phase === 'success' && <p className="tiny muted">Confirmed by the chain. Reload this page to see updated ownership.</p>}
    </div>
  );
}
