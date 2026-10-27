const { expect } = require("chai");
const { ethers } = require("hardhat");

const SUPPLY = ethers.parseEther("100000000");
const PLATFORM = ethers.parseEther("5000000");
const CREATOR = ethers.parseEther("95000000");

async function deploy() {
  const [owner, platform, creator, other, buyer] = await ethers.getSigners();
  const Factory = await ethers.getContractFactory("OrbixTokenFactory");
  const factory = await Factory.deploy(owner.address, platform.address);
  const Pairing = await ethers.getContractFactory("OrbixPairing");
  const pairing = await Pairing.deploy(await factory.getAddress());
  const NFT = await ethers.getContractFactory("OrbixNFT");
  const nft = await NFT.deploy("Doge", "DOGE", 100, owner.address);
  await nft.connect(buyer).mint("ipfs://doge1", 0);
  await nft.connect(buyer).mint("ipfs://doge2", 0);
  return { owner, platform, creator, other, buyer, factory, pairing, nft };
}

async function createToken(factory, creator, name = "Mega", symbol = "MGA") {
  const tx = await factory.connect(creator).createToken(name, symbol);
  const rc = await tx.wait();
  const ev = rc.logs.map((l) => { try { return factory.interface.parseLog(l); } catch { return null; } }).find((e) => e && e.name === "TokenCreated");
  const addr = ev.args.token;
  return ethers.getContractAt("OrbixToken", addr);
}

describe("OrbixTokenFactory", function () {
  it("creates a token with fixed 100m supply split 5% platform / 95% creator", async function () {
    const { factory, creator, platform } = await deploy();
    const t = await createToken(factory, creator);
    expect(await t.name()).to.equal("Mega");
    expect(await t.symbol()).to.equal("MGA");
    expect(await t.totalSupply()).to.equal(SUPPLY);
    expect(await t.MAX_SUPPLY()).to.equal(SUPPLY);
    expect(await t.balanceOf(platform.address)).to.equal(PLATFORM);
    expect(await t.balanceOf(creator.address)).to.equal(CREATOR);
    expect(await t.creator()).to.equal(creator.address);
    expect(await t.factory()).to.equal(await factory.getAddress());
    expect(await factory.isOrbixToken(await t.getAddress())).to.equal(true);
  });

  it("has no mint path: supply stays at 100m", async function () {
    const { factory, creator } = await deploy();
    const t = await createToken(factory, creator);
    expect(t.mint).to.be.undefined;
    expect(await t.totalSupply()).to.equal(SUPPLY);
  });

  it("tracks tokens per creator and globally", async function () {
    const { factory, creator, other } = await deploy();
    const a = await createToken(factory, creator, "A", "AA");
    const b = await createToken(factory, other, "B", "BB");
    const c = await createToken(factory, creator, "C", "CC");
    expect(await factory.tokenCount()).to.equal(3n);
    expect(await factory.allTokens()).to.deep.equal([await a.getAddress(), await b.getAddress(), await c.getAddress()]);
    expect(await factory.tokensByCreator(creator.address)).to.deep.equal([await a.getAddress(), await c.getAddress()]);
  });

  it("rejects empty or too long names and symbols", async function () {
    const { factory, creator } = await deploy();
    await expect(factory.connect(creator).createToken("", "X")).to.be.revertedWithCustomError(factory, "InvalidName");
    await expect(factory.connect(creator).createToken("x".repeat(65), "X")).to.be.revertedWithCustomError(factory, "InvalidName");
    await expect(factory.connect(creator).createToken("X", "")).to.be.revertedWithCustomError(factory, "InvalidSymbol");
    await expect(factory.connect(creator).createToken("X", "S".repeat(13))).to.be.revertedWithCustomError(factory, "InvalidSymbol");
  });

  it("only owner can change the platform recipient; new tokens use it", async function () {
    const { factory, creator, other, owner, platform } = await deploy();
    await expect(factory.connect(other).setFeeRecipient(other.address)).to.be.revertedWithCustomError(factory, "OwnableUnauthorizedAccount");
    await expect(factory.connect(owner).setFeeRecipient(ethers.ZeroAddress)).to.be.revertedWithCustomError(factory, "ZeroAddress");
    await factory.connect(owner).setFeeRecipient(other.address);
    const t = await createToken(factory, creator, "New", "NEW");
    expect(await t.balanceOf(other.address)).to.equal(PLATFORM);
    expect(await t.balanceOf(platform.address)).to.equal(0n);
  });

  it("transfers work normally", async function () {
    const { factory, creator, other } = await deploy();
    const t = await createToken(factory, creator);
    await t.connect(creator).transfer(other.address, ethers.parseEther("1000"));
    expect(await t.balanceOf(other.address)).to.equal(ethers.parseEther("1000"));
  });
});

describe("OrbixPairing (NFT to token)", function () {
  it("creator sets 1 NFT = 50,000 tokens, deposits reserve, holder redeems", async function () {
    const { factory, pairing, nft, creator, buyer } = await deploy();
    const t = await createToken(factory, creator, "Doge Token", "DGT");
    const tAddr = await t.getAddress();
    const nftAddr = await nft.getAddress();
    const pAddr = await pairing.getAddress();

    await pairing.connect(creator).setPairing(nftAddr, tAddr, ethers.parseEther("50000"));
    let p = await pairing.pairs(nftAddr);
    expect(p.token).to.equal(tAddr);
    expect(p.amountPerNft).to.equal(ethers.parseEther("50000"));
    expect(p.active).to.equal(true);

    await t.connect(creator).approve(pAddr, ethers.parseEther("100000"));
    await expect(pairing.connect(creator).depositReserve(tAddr, ethers.parseEther("100000")))
      .to.emit(pairing, "ReserveDeposited");
    expect(await pairing.reserveOf(tAddr)).to.equal(ethers.parseEther("100000"));

    await nft.connect(buyer).approve(pAddr, 1);
    await expect(pairing.connect(buyer).redeem(nftAddr, 1))
      .to.emit(pairing, "Redeemed")
      .withArgs(nftAddr, 1, buyer.address, tAddr, ethers.parseEther("50000"));
    expect(await nft.ownerOf(1)).to.equal(pAddr);
    expect(await t.balanceOf(buyer.address)).to.equal(ethers.parseEther("50000"));
    expect(await pairing.reserveOf(tAddr)).to.equal(ethers.parseEther("50000"));
  });

  it("redeem reverts when reserve is short, and when NFT is not paired", async function () {
    const { factory, pairing, nft, creator, buyer } = await deploy();
    const t = await createToken(factory, creator);
    const tAddr = await t.getAddress();
    const nftAddr = await nft.getAddress();
    await nft.connect(buyer).approve(await pairing.getAddress(), 1);
    await expect(pairing.connect(buyer).redeem(nftAddr, 1)).to.be.revertedWithCustomError(pairing, "NotPaired");

    await pairing.connect(creator).setPairing(nftAddr, tAddr, ethers.parseEther("50000"));
    await expect(pairing.connect(buyer).redeem(nftAddr, 1)).to.be.revertedWithCustomError(pairing, "InsufficientReserve");
  });

  it("non-creators cannot set pairing or touch the reserve", async function () {
    const { factory, pairing, nft, creator, other } = await deploy();
    const t = await createToken(factory, creator);
    const tAddr = await t.getAddress();
    const nftAddr = await nft.getAddress();
    await expect(pairing.connect(other).setPairing(nftAddr, tAddr, 1)).to.be.revertedWithCustomError(pairing, "NotTokenCreator");
    await expect(pairing.connect(other).depositReserve(tAddr, 1)).to.be.revertedWithCustomError(pairing, "NotTokenCreator");
    await expect(pairing.connect(other).withdrawReserve(tAddr, 1)).to.be.revertedWithCustomError(pairing, "NotTokenCreator");
  });

  it("rejects pairing to a token not made by the factory", async function () {
    const { pairing, nft, creator } = await deploy();
    const Fake = await ethers.getContractFactory("OrbixNFT");
    const fake = await Fake.deploy("F", "F", 1, creator.address);
    await expect(pairing.connect(creator).setPairing(await nft.getAddress(), await fake.getAddress(), 1))
      .to.be.revertedWithCustomError(pairing, "NotOrbixToken");
  });

  it("creator can withdraw unused reserve; cannot withdraw more than held", async function () {
    const { factory, pairing, creator } = await deploy();
    const t = await createToken(factory, creator);
    const tAddr = await t.getAddress();
    const pAddr = await pairing.getAddress();
    await t.connect(creator).approve(pAddr, ethers.parseEther("1000"));
    await pairing.connect(creator).depositReserve(tAddr, ethers.parseEther("1000"));
    await expect(pairing.connect(creator).withdrawReserve(tAddr, ethers.parseEther("1001")))
      .to.be.revertedWithCustomError(pairing, "InsufficientReserve");
    await pairing.connect(creator).withdrawReserve(tAddr, ethers.parseEther("400"));
    expect(await pairing.reserveOf(tAddr)).to.equal(ethers.parseEther("600"));
  });

  it("setting amount to 0 deactivates pairing; redeem then fails", async function () {
    const { factory, pairing, nft, creator, buyer } = await deploy();
    const t = await createToken(factory, creator);
    const tAddr = await t.getAddress();
    const nftAddr = await nft.getAddress();
    await pairing.connect(creator).setPairing(nftAddr, tAddr, 10);
    await pairing.connect(creator).setPairing(nftAddr, tAddr, 0);
    await nft.connect(buyer).approve(await pairing.getAddress(), 1);
    await expect(pairing.connect(buyer).redeem(nftAddr, 1)).to.be.revertedWithCustomError(pairing, "NotPaired");
  });

  it("a collection paired to one creator's token cannot be taken over by another creator", async function () {
    const { factory, pairing, nft, creator, other } = await deploy();
    const t1 = await createToken(factory, creator, "One", "ONE");
    const t2 = await createToken(factory, other, "Two", "TWO");
    const nftAddr = await nft.getAddress();
    await pairing.connect(creator).setPairing(nftAddr, await t1.getAddress(), 5);
    await expect(pairing.connect(other).setPairing(nftAddr, await t2.getAddress(), 5))
      .to.be.revertedWithCustomError(pairing, "PairedToOtherToken");
  });
});
