import { useCallback, useState } from 'react';
import { useConfig, useWriteContract } from 'wagmi';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { ORBIX_CHAIN } from './config.js';

function isRejection(e) {
  const msg = `${e?.shortMessage || ''} ${e?.message || ''}`;
  return e?.code === 4001 || /user (rejected|denied)|rejected the request|request rejected/i.test(msg);
}

export function friendlyTxError(e) {
  if (isRejection(e)) return 'You rejected the request in your wallet. Nothing was sent.';
  return e?.shortMessage || e?.message || 'Transaction failed.';
}

/**
 * Runs one contract write. Phases: idle -> wallet -> pending -> success | failed.
 * 'success' is only set after the receipt comes back with status "success" on Sepolia.
 */
export function useContractTx() {
  const config = useConfig();
  const { writeContractAsync } = useWriteContract();
  const [state, setState] = useState({ phase: 'idle', hash: '', error: '' });

  const run = useCallback(
    async (params) => {
      setState({ phase: 'wallet', hash: '', error: '' });
      let hash;
      try {
        hash = await writeContractAsync({ ...params, chainId: ORBIX_CHAIN.id });
      } catch (e) {
        setState({ phase: 'failed', hash: '', error: friendlyTxError(e) });
        return null;
      }
      setState({ phase: 'pending', hash, error: '' });
      try {
        const receipt = await waitForTransactionReceipt(config, { hash, chainId: ORBIX_CHAIN.id, confirmations: 1 });
        if (receipt.status === 'success') {
          setState({ phase: 'success', hash, error: '' });
          return receipt;
        }
        setState({ phase: 'failed', hash, error: 'The transaction was mined but reverted on chain.' });
        return null;
      } catch (e) {
        setState({ phase: 'failed', hash, error: friendlyTxError(e) });
        return null;
      }
    },
    [config, writeContractAsync]
  );

  const reset = useCallback(() => setState({ phase: 'idle', hash: '', error: '' }), []);
  return { ...state, run, reset };
}
