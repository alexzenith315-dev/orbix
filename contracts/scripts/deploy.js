// Testnet deploy only (Ethereum Sepolia, chainId 11155111). Requires DEPLOYER_PRIVATE_KEY and funded Sepolia ETH.
// Usage: npm run deploy:sepolia
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const net = await hre.ethers.provider.getNetwork();
  if (Number(net.chainId) !== 11155111) throw new Error(`Refusing to deploy: chainId ${net.chainId} is not Sepolia (11155111).`);
  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) throw new Error("No deployer. Set DEPLOYER_PRIVATE_KEY in contracts/.env (a Sepolia-only throwaway key).");
  const bal = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`deployer ${deployer.address} balance ${hre.ethers.formatEther(bal)} SepoliaETH`);
  if (bal === 0n) throw new Error("Deployer has no Sepolia ETH. Get test ETH from a Sepolia faucet first.");

  const nft = await (await hre.ethers.getContractFactory("OrbixNFT")).deploy("Orbix", "ORBIX", 10000, deployer.address);
  await nft.waitForDeployment();
  const mkt = await (await hre.ethers.getContractFactory("OrbixMarketplace")).deploy(deployer.address, deployer.address);
  await mkt.waitForDeployment();

  const out = {
    network: "sepolia",
    chainId: 11155111,
    deployedAt: new Date().toISOString(),
    OrbixNFT: await nft.getAddress(),
    OrbixMarketplace: await mkt.getAddress(),
    deployer: deployer.address,
  };
  const dest = path.join(__dirname, "..", "deployments", "sepolia.json");
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, JSON.stringify(out, null, 2));
  console.log(out);
  console.log(`Wrote ${dest}. Copy OrbixNFT and OrbixMarketplace into the root .env as VITE_ORBIX_NFT_ADDRESS and VITE_ORBIX_MARKETPLACE_ADDRESS, then rebuild.`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exitCode = 1;
});
