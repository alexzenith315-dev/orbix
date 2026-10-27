function isRejection(e) {
  const msg = `${e?.shortMessage || ''} ${e?.message || ''}`;
  return e?.code === 4001 || /user (rejected|denied)|rejected the request|request rejected/i.test(msg);
}

export function friendlyTxError(e) {
  if (isRejection(e)) return 'You rejected the request in your wallet. Nothing was sent.';
  return e?.shortMessage || e?.message || 'Transaction failed.';
}
