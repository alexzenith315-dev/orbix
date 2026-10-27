// Non-EVM chain adapters. Interface every adapter implements:
//   createToken({ name, symbol }) -> { txId, tokenAddress }
//   pairNftToken({ nft, token, amountPerNft }) -> { txId }
//   redeem({ nft, tokenId }) -> { txId }
// STATUS: all three are scaffolds. Every op rejects with NOT_IMPLEMENTED until the chain SDK,
// program or contract is written and tested against a funded testnet account. Nothing signs or sends.
function notImplemented(label, op) {
  const err = new Error(`${label} ${op} is not implemented yet (scaffold).`);
  err.code = 'NOT_IMPLEMENTED';
  return err;
}

function scaffold(key, label, plan) {
  return {
    key,
    label,
    kind: 'non-evm',
    status: 'scaffold',
    plan,
    createToken: async () => { throw notImplemented(label, 'token creation'); },
    pairNftToken: async () => { throw notImplemented(label, 'NFT-token pairing'); },
    redeem: async () => { throw notImplemented(label, 'redeem'); },
  };
}

export const NON_EVM_ADAPTERS = {
  solana: scaffold('solana', 'Solana', 'Anchor program for token mint + NFT-token pairing; @solana/web3.js client'),
  ton: scaffold('ton', 'Gram (TON)', 'Jetton token + pairing contract (FunC or Tact); @ton/ton client'),
  tron: scaffold('tron', 'Tron', 'TRC-20 token + pairing contract (TVM); tronweb client'),
};
