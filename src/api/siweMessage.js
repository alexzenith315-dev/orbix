// Pure EIP-4361 message builder. No import.meta or browser globals, so Node tests can load it.
export function buildSiweMessage({ domain, address, chainId, nonce, uri, issuedAt = new Date().toISOString() }) {
  return [
    `${domain} wants you to sign in with your Ethereum account:`,
    address,
    '',
    'Sign in to Orbix',
    '',
    `URI: ${uri}`,
    'Version: 1',
    `Chain ID: ${chainId}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
  ].join('\n');
}
