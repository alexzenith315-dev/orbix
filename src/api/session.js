import { api } from './client.js';
import { buildSiweMessage } from './siweMessage.js';

export { buildSiweMessage };

// SIWE sign-in: fetch a one-time nonce, have the connected wallet sign the message, POST the signature.
// The API sets an HttpOnly session cookie. The frontend never sees or stores the session token.
export async function fetchNonce() {
  return api('/auth/nonce');
}

export async function signInWithWallet(address, signMessageAsync) {
  const { nonce, domain, chainId } = await fetchNonce();
  const message = buildSiweMessage({ domain, address, chainId, nonce, uri: window.location.origin });
  const signature = await signMessageAsync({ message });
  return api('/auth/siwe', { method: 'POST', body: { message, signature } });
}

export const fetchMe = () => api('/me');
export const signOut = () => api('/auth/signout', { method: 'POST' });
