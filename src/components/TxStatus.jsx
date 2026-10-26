import { explorerTx } from '../web3/config.js';

const LABELS = {
  wallet: 'Waiting for wallet confirmation…',
  pending: 'Transaction sent. Waiting for Sepolia confirmation…',
  success: 'Confirmed on Sepolia.',
  failed: 'Failed.',
};

export default function TxStatus({ phase, hash, error }) {
  if (!phase || phase === 'idle') return null;
  const cls = phase === 'failed' ? 'error small' : phase === 'success' ? 'notice small' : 'notice small';
  return (
    <div className={cls} role="status" aria-live="polite">
      <strong>{LABELS[phase]}</strong>
      {phase === 'failed' && error && <span> {error}</span>}
      {hash && (
        <span>
          {' '}
          <a href={explorerTx(hash)} target="_blank" rel="noopener noreferrer">
            View on Sepolia Etherscan
          </a>
        </span>
      )}
    </div>
  );
}
