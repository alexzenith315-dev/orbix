import { explorerTx } from '../web3/config.js';
import { useWallet } from '../context/WalletContext.jsx';

const LABELS = {
  wallet: 'Waiting for wallet confirmation…',
  pending: 'Transaction sent. Waiting for confirmation…',
  success: 'Confirmed.',
  failed: 'Failed.',
};

export default function TxStatus({ phase, hash, error }) {
  const { chainKey, chainLabel } = useWallet();
  if (!phase || phase === 'idle') return null;
  const cls = phase === 'failed' ? 'error small' : phase === 'success' ? 'notice small' : 'notice small';
  return (
    <div className={cls} role="status" aria-live="polite">
      <strong>{LABELS[phase]}</strong>
      {phase === 'failed' && error && <span> {error}</span>}
      {hash && (
        <span>
          {' '}
          <a href={explorerTx(hash, chainKey)} target="_blank" rel="noopener noreferrer">
            View on {chainLabel} explorer
          </a>
        </span>
      )}
    </div>
  );
}
