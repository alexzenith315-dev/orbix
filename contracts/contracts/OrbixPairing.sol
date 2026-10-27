// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {OrbixTokenFactory} from "./OrbixTokenFactory.sol";
import {OrbixToken} from "./OrbixToken.sol";

/// @title OrbixPairing
/// @notice Pairs an ERC-721 collection with an OrbixToken at a set ratio ("1 Doge NFT = 50,000 TOKEN").
///         The token creator sets the ratio and deposits a reserve. An NFT holder redeems one NFT: the NFT is
///         escrowed here and `amountPerNft` tokens are paid out of the reserve. Testnet only. Not audited.
/// @dev One pairing per collection. A collection already paired to a token can only be re-paired by that
///      token's creator, so nobody can take over another creator's pairing.
contract OrbixPairing is ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Pair {
        address token;
        uint256 amountPerNft; // token units (18 decimals) paid per redeemed NFT
        bool active;
    }

    OrbixTokenFactory public immutable factory;

    mapping(address nft => Pair) public pairs;
    mapping(address token => uint256) public reserveOf;

    event PairingSet(address indexed nft, address indexed token, uint256 amountPerNft, bool active);
    event ReserveDeposited(address indexed token, address indexed from, uint256 amount);
    event ReserveWithdrawn(address indexed token, address indexed to, uint256 amount);
    event Redeemed(address indexed nft, uint256 indexed tokenId, address indexed holder, address token, uint256 amount);

    error NotTokenCreator();
    error NotOrbixToken();
    error ZeroAmount();
    error NotPaired();
    error InsufficientReserve();
    error PairedToOtherToken();
    error ZeroAddress();

    constructor(address factory_) {
        if (factory_ == address(0)) revert ZeroAddress();
        factory = OrbixTokenFactory(factory_);
    }

    modifier onlyTokenCreator(address token) {
        if (!factory.isOrbixToken(token)) revert NotOrbixToken();
        if (OrbixToken(token).creator() != msg.sender) revert NotTokenCreator();
        _;
    }

    /// @notice Set or change the ratio for an NFT collection. amountPerNft = 0 deactivates the pairing.
    function setPairing(address nft, address token, uint256 amountPerNft) external onlyTokenCreator(token) {
        if (nft == address(0)) revert ZeroAddress();
        Pair memory existing = pairs[nft];
        if (existing.token != address(0) && existing.token != token) {
            // Only the creator of the currently paired token may move this collection to a new token.
            if (OrbixToken(existing.token).creator() != msg.sender) revert PairedToOtherToken();
        }
        bool active = amountPerNft > 0;
        pairs[nft] = Pair(token, amountPerNft, active);
        emit PairingSet(nft, token, amountPerNft, active);
    }

    /// @notice Creator funds the redemption reserve. Caller must approve this contract first.
    function depositReserve(address token, uint256 amount) external onlyTokenCreator(token) nonReentrant {
        if (amount == 0) revert ZeroAmount();
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        reserveOf[token] += amount;
        emit ReserveDeposited(token, msg.sender, amount);
    }

    /// @notice Creator takes unused reserve back.
    function withdrawReserve(address token, uint256 amount) external onlyTokenCreator(token) nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (reserveOf[token] < amount) revert InsufficientReserve();
        reserveOf[token] -= amount;
        IERC20(token).safeTransfer(msg.sender, amount);
        emit ReserveWithdrawn(token, msg.sender, amount);
    }

    /// @notice Redeem one NFT from a paired collection. Caller must approve this contract for tokenId.
    function redeem(address nft, uint256 tokenId) external nonReentrant {
        Pair memory p = pairs[nft];
        if (!p.active) revert NotPaired();
        uint256 amount = p.amountPerNft;
        if (reserveOf[p.token] < amount) revert InsufficientReserve();

        reserveOf[p.token] -= amount;
        IERC721(nft).transferFrom(msg.sender, address(this), tokenId);
        IERC20(p.token).safeTransfer(msg.sender, amount);
        emit Redeemed(nft, tokenId, msg.sender, p.token, amount);
    }
}
