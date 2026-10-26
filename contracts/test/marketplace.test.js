const { expect } = require("chai");
const { ethers } = require("hardhat");

const ONE = ethers.parseEther("1");

async function deploy() {
  const [owner, feeRecipient, seller, buyer, other, creatorAlt] = await ethers.getSigners();
  const NFT = await ethers.getContractFactory("OrbixNFT");
  const nft = await NFT.deploy("Orbix", "ORBIX", 100, owner.address);
  const MKT = await ethers.getContractFactory("OrbixMarketplace");
  const mkt = await MKT.deploy(owner.address, feeRecipient.address);
  // seller mints a token with 10% royalty
  await nft.connect(seller).mint("ipfs://token1", 1000);
  await nft.connect(seller).setApprovalForAll(await mkt.getAddress(), true);
  return { owner, feeRecipient, seller, buyer, other, creatorAlt, nft, mkt };
}

describe("OrbixNFT", function () {
  it("mints with uri, royalty and creator record", async function () {
    const { nft, seller } = await deploy();
    expect(await nft.ownerOf(1)).to.equal(seller.address);
    expect(await nft.tokenURI(1)).to.equal("ipfs://token1");
    expect(await nft.creatorOf(1)).to.equal(seller.address);
    const [r, amt] = await nft.royaltyInfo(1, ONE);
    expect(r).to.equal(seller.address);
    expect(amt).to.equal(ethers.parseEther("0.1"));
  });

  it("rejects royalty above 10%", async function () {
    const { nft, other } = await deploy();
    await expect(nft.connect(other).mint("ipfs://x", 1001)).to.be.revertedWithCustomError(nft, "RoyaltyTooHigh");
  });

  it("enforces max supply and owner-only minting toggle", async function () {
    const [owner, a] = await ethers.getSigners();
    const NFT = await ethers.getContractFactory("OrbixNFT");
    const nft = await NFT.deploy("Small", "S", 1, owner.address);
    await nft.connect(a).mint("ipfs://1", 0);
    await expect(nft.connect(a).mint("ipfs://2", 0)).to.be.revertedWithCustomError(nft, "SupplyExhausted");
    await expect(nft.connect(a).setMintingOpen(false)).to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");
    await nft.connect(owner).setMintingOpen(false);
    await expect(nft.connect(a).mint("ipfs://3", 0)).to.be.revertedWithCustomError(nft, "MintingClosed");
  });
});

describe("OrbixMarketplace listings", function () {
  it("lists, buys, and splits 2.5% fee + 10% royalty + remainder", async function () {
    const { mkt, nft, seller, buyer, feeRecipient } = await deploy();
    await mkt.connect(seller).list(await nft.getAddress(), 1, ONE);
    const q = await mkt.quote(await nft.getAddress(), 1, ONE);
    expect(q.fee).to.equal(ethers.parseEther("0.025"));
    expect(q.royalty).to.equal(ethers.parseEther("0.1"));
    expect(q.sellerProceeds).to.equal(ethers.parseEther("0.875"));

    const feeBefore = await ethers.provider.getBalance(feeRecipient.address);
    const sellerBefore = await ethers.provider.getBalance(seller.address);
    await expect(mkt.connect(buyer).buy(1, { value: ONE }))
      .to.emit(mkt, "Sold")
      .withArgs(1, buyer.address, ONE, ethers.parseEther("0.025"), ethers.parseEther("0.1"));

    expect(await nft.ownerOf(1)).to.equal(buyer.address);
    expect(await ethers.provider.getBalance(feeRecipient.address)).to.equal(feeBefore + ethers.parseEther("0.025"));
    expect(await ethers.provider.getBalance(seller.address)).to.be.gt(sellerBefore); // seller paid remainder (+royalty, since seller is creator)
  });

  it("refuses to list a token you do not own", async function () {
    const { mkt, nft, other } = await deploy();
    await expect(mkt.connect(other).list(await nft.getAddress(), 1, ONE)).to.be.revertedWithCustomError(mkt, "NotOwner");
  });

  it("refuses to list without approval", async function () {
    const { mkt, nft, seller } = await deploy();
    await nft.connect(seller).setApprovalForAll(await mkt.getAddress(), false);
    await expect(mkt.connect(seller).list(await nft.getAddress(), 1, ONE)).to.be.revertedWithCustomError(mkt, "NotApproved");
  });

  it("refuses zero-price listings", async function () {
    const { mkt, nft, seller } = await deploy();
    await expect(mkt.connect(seller).list(await nft.getAddress(), 1, 0)).to.be.revertedWithCustomError(mkt, "ZeroPrice");
  });

  it("only the seller can cancel, and cancelled listings cannot be bought", async function () {
    const { mkt, nft, seller, buyer, other } = await deploy();
    await mkt.connect(seller).list(await nft.getAddress(), 1, ONE);
    await expect(mkt.connect(other).cancelListing(1)).to.be.revertedWithCustomError(mkt, "NotOwner");
    await mkt.connect(seller).cancelListing(1);
    await expect(mkt.connect(buyer).buy(1, { value: ONE })).to.be.revertedWithCustomError(mkt, "InvalidListing");
    await expect(mkt.connect(seller).cancelListing(1)).to.be.revertedWithCustomError(mkt, "InvalidListing");
  });

  it("failed purchases: wrong payment, unknown listing, self purchase, stale listing", async function () {
    const { mkt, nft, seller, buyer, other } = await deploy();
    await mkt.connect(seller).list(await nft.getAddress(), 1, ONE);
    await expect(mkt.connect(buyer).buy(1, { value: ethers.parseEther("0.5") })).to.be.revertedWithCustomError(mkt, "WrongPayment");
    await expect(mkt.connect(buyer).buy(99, { value: ONE })).to.be.revertedWithCustomError(mkt, "InvalidListing");
    await expect(mkt.connect(seller).buy(1, { value: ONE })).to.be.revertedWithCustomError(mkt, "SelfPurchase");
    // seller transfers the token away: listing is stale and must not sell
    await nft.connect(seller).transferFrom(seller.address, other.address, 1);
    await expect(mkt.connect(buyer).buy(1, { value: ONE })).to.be.revertedWithCustomError(mkt, "InvalidListing");
  });

  it("reverts the whole sale if a payout recipient rejects ETH", async function () {
    const { mkt, nft, seller, buyer, owner } = await deploy();
    const Reject = await ethers.getContractFactory("RejectEth");
    const bad = await Reject.deploy();
    await mkt.connect(owner).setFeeRecipient(await bad.getAddress());
    await mkt.connect(seller).list(await nft.getAddress(), 1, ONE);
    await expect(mkt.connect(buyer).buy(1, { value: ONE })).to.be.revertedWithCustomError(mkt, "PayoutFailed");
    expect(await nft.ownerOf(1)).to.equal(seller.address);
  });

  it("only owner can change fee settings, and fee is capped at 10%", async function () {
    const { mkt, other, owner } = await deploy();
    await expect(mkt.connect(other).setFeeBps(100)).to.be.revertedWithCustomError(mkt, "OwnableUnauthorizedAccount");
    await expect(mkt.connect(owner).setFeeBps(1001)).to.be.revertedWithCustomError(mkt, "FeeTooHigh");
    await mkt.connect(owner).setFeeBps(300);
    expect(await mkt.feeBps()).to.equal(300n);
  });
});

describe("OrbixMarketplace offers", function () {
  it("buyer escrows ETH; owner accepts; buyer gets token, seller gets net", async function () {
    const { mkt, nft, seller, buyer, feeRecipient } = await deploy();
    await mkt.connect(buyer).makeOffer(await nft.getAddress(), 1, 3600, { value: ONE });
    const mktAddr = await mkt.getAddress();
    expect(await ethers.provider.getBalance(mktAddr)).to.equal(ONE);

    const feeBefore = await ethers.provider.getBalance(feeRecipient.address);
    await expect(mkt.connect(seller).acceptOffer(1)).to.emit(mkt, "OfferAccepted");
    expect(await nft.ownerOf(1)).to.equal(buyer.address);
    expect(await ethers.provider.getBalance(feeRecipient.address)).to.equal(feeBefore + ethers.parseEther("0.025"));
    expect(await ethers.provider.getBalance(mktAddr)).to.equal(0n);
  });

  it("only the buyer can cancel, and cancel refunds escrow", async function () {
    const { mkt, nft, buyer, other } = await deploy();
    await mkt.connect(buyer).makeOffer(await nft.getAddress(), 1, 3600, { value: ONE });
    await expect(mkt.connect(other).cancelOffer(1)).to.be.revertedWithCustomError(mkt, "NotOfferBuyer");
    await expect(mkt.connect(buyer).cancelOffer(1)).to.changeEtherBalances([buyer, mkt], [ONE, -ONE]);
    await expect(mkt.connect(buyer).cancelOffer(1)).to.be.revertedWithCustomError(mkt, "InvalidOffer");
  });

  it("non-owners cannot accept; expired and cancelled offers cannot be accepted", async function () {
    const { mkt, nft, seller, buyer, other } = await deploy();
    await mkt.connect(buyer).makeOffer(await nft.getAddress(), 1, 60, { value: ONE });
    await expect(mkt.connect(other).acceptOffer(1)).to.be.revertedWithCustomError(mkt, "NotOwner");
    await ethers.provider.send("evm_increaseTime", [120]);
    await ethers.provider.send("evm_mine", []);
    await expect(mkt.connect(seller).acceptOffer(1)).to.be.revertedWithCustomError(mkt, "OfferExpired");
    await mkt.connect(buyer).cancelOffer(1);
    await expect(mkt.connect(seller).acceptOffer(1)).to.be.revertedWithCustomError(mkt, "InvalidOffer");
  });

  it("rejects zero-value offers and durations over 30 days", async function () {
    const { mkt, nft, buyer } = await deploy();
    await expect(mkt.connect(buyer).makeOffer(await nft.getAddress(), 1, 3600, { value: 0 })).to.be.revertedWithCustomError(mkt, "ZeroPrice");
    await expect(mkt.connect(buyer).makeOffer(await nft.getAddress(), 1, 31 * 24 * 3600, { value: ONE })).to.be.revertedWithCustomError(mkt, "OfferDurationTooLong");
  });
});
