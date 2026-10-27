import { useCallback, useState } from 'react';
import { useConfig, useWriteContract } from 'wagmi';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { useWallet } from '../context/WalletContext.jsx';
import { friendlyTxError } from './errors.js';

export { friendlyTxError };

/**
 * Runs one contract write on the currently selected chain.
 * Phases: idle -> wallet -> pending -> success | failed.
 * 'success' is only set after the receipt comes back with status "success" on that chain.
 */
export function useContractTx() {
  const config = useConfig();
  const { chain } = useWallet();
  const { writeContractAsync } = useWriteContract();
  const [state, setState] = useState({ phase: 'idle', hash: '', error: '' });

  const run = useCallback(
    async (params) => {
      setState({ phase: 'wallet', hash: '', error: '' });
      let hash;
      try {
        hash = await writeContractAsync({ ...params, chainId: chain.id });
      } catch (e) {
        setState({ phase: 'failed', hash: '', error: friendlyTxError(e) });
        return null;
      }
      setState({ phase: 'pending', hash, error: '' });
      try {
        const receipt = await waitForTransactionReceipt(config, { hash, chainId: chain.id, confirmations: 1 });
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
    [config, writeContractAsync, chain.id]
  );

  const reset = useCallback(() => setState({ phase: 'idle', hash: '', error: '' }), []);
  return { ...state, run, reset };
}
