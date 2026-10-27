import { NFT_ABI, NOT_DEPLOYED_LABEL } from '../web3/contracts.js';
import { useContractTx } from '../web3/useContractTx.js';
import { useWallet } from '../context/WalletContext.jsx';
import TxStatus from '../components/TxStatus.jsx';

// Mint is wired to OrbixNFT.mint(uri, royaltyBps). This build has no IPFS pinning, so the
// token URI must be a metadata URI you host yourself (ipfs:// or https://).
export function MintButton({ royaltyPercent, metadataUri, disabledReason, onSuccess }) {
  const { account, setModalOpen, wrongNetwork, switchToActive, chainLabel, contracts } = useWallet();
  const { nftDeployed } = contracts;
  const tx = useContractTx();
  const bps = Math.round(Number(royaltyPercent) * 100);
  const uriOk = /^(ipfs:\/\/|https:\/\/)\S+$/.test(metadataUri || '');

  if (!nftDeployed) {
    return (
      <button className="btn btn-primary" disabled title={NOT_DEPLOYED_LABEL}>{NOT_DEPLOYED_LABEL}</button>
    );
  }

  const mint = async () => {
    if (!account) return setModalOpen(true);
    const receipt = await tx.run({ address: contracts.nft, abi: NFT_ABI, functionName: 'mint', args: [metadataUri, BigInt(bps)] });
    if (receipt && onSuccess) onSuccess(receipt);
  };

  const busy = tx.phase === 'wallet' || tx.phase === 'pending';

  return (
    <>
      {account && wrongNetwork && (
        <p className="notice small">
          Wrong network. <button className="btn btn-ghost btn-sm" onClick={switchToActive}>Switch to {chainLabel}</button>
        </p>
      )}
      {!uriOk && <p className="tiny muted">{disabledReason || 'Enter a metadata URI (ipfs:// or https://) to mint.'}</p>}
      <button className="btn btn-primary" onClick={mint} disabled={!uriOk || busy || (account && wrongNetwork)}>
        {account ? `Mint on ${chainLabel}` : 'Connect wallet to mint'}
      </button>
      <TxStatus phase={tx.phase} hash={tx.hash} error={tx.error} />
    </>
  );
}
