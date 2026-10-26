// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC2981} from "@openzeppelin/contracts/interfaces/IERC2981.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title OrbixMarketplace
/// @notice Fixed-price listings and escrowed offers for ERC-721 tokens, paid in native ETH.
///         Platform fee 2.5% (250 bps) to feeRecipient; ERC-2981 royalties paid when the NFT reports them.
///         Testnet only. Not audited.
/// @dev Listings do not escrow the NFT: the seller keeps custody and must approve this contract.
///      Offers escrow ETH in this contract. Pull-free ETH transfers use call() and revert on failure,
///      so a failed payout reverts the whole sale instead of losing funds.
contract OrbixMarketplace is Ownable, ReentrancyGuard {
    uint256 public constant FEE_BPS = 250;          // 2.5%
    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant MAX_FEE_BPS = 1_000;     // admin cannot raise the fee above 10%
    uint256 public constant MAX_ROYALTY_BPS = 1_000;
    uint64 public constant MAX_OFFER_DURATION = 30 days;

    struct Listing {
        address seller;
        address nft;
        uint256 tokenId;
        uint256 price;
        bool active;
    }

    struct Offer {
        address buyer;
        address nft;
        uint256 tokenId;
        uint256 amount;
        uint64 expiresAt;
        bool active;
    }

    address public feeRecipient;
    uint256 public feeBps = FEE_BPS;
    uint256 public nextListingId = 1;
    uint256 public nextOfferId = 1;

    mapping(uint256 => Listing) public listings;
    mapping(uint256 => Offer) public offers;

    event FeeRecipientUpdated(address indexed recipient);
    event FeeBpsUpdated(uint256 bps);
    event Listed(uint256 indexed listingId, address indexed seller, address indexed nft, uint256 tokenId, uint256 price);
    event ListingCancelled(uint256 indexed listingId);
    event Sold(uint256 indexed listingId, address indexed buyer, uint256 price, uint256 fee, uint256 royalty);
    event OfferMade(uint256 indexed offerId, address indexed buyer, address indexed nft, uint256 tokenId, uint256 amount, uint64 expiresAt);
    event OfferCancelled(uint256 indexed offerId);
    event OfferAccepted(uint256 indexed offerId, address indexed seller, uint256 amount, uint256 fee, uint256 royalty);

    error NotOwner();
    error NotApproved();
    error ZeroPrice();
    error InvalidListing();
    error WrongPayment();
    error SelfPurchase();
    error InvalidOffer();
    error OfferExpired();
    error OfferDurationTooLong();
    error NotOfferBuyer();
    error FeeTooHigh();
    error ZeroAddress();
    error PayoutFailed();

    constructor(address initialOwner, address feeRecipient_) Ownable(initialOwner) {
        if (feeRecipient_ == address(0)) revert ZeroAddress();
        feeRecipient = feeRecipient_;
    }

    // ---------------- admin (access control) ----------------

    function setFeeRecipient(address recipient) external onlyOwner {
        if (recipient == address(0)) revert ZeroAddress();
        feeRecipient = recipient;
        emit FeeRecipientUpdated(recipient);
    }

    function setFeeBps(uint256 bps) external onlyOwner {
        if (bps > MAX_FEE_BPS) revert FeeTooHigh();
        feeBps = bps;
        emit FeeBpsUpdated(bps);
    }

    // ---------------- listings ----------------

    function list(address nft, uint256 tokenId, uint256 price) external returns (uint256 listingId) {
        if (price == 0) revert ZeroPrice();
        if (IERC721(nft).ownerOf(tokenId) != msg.sender) revert NotOwner();
        if (!_isApproved(nft, tokenId, msg.sender)) revert NotApproved();

        listingId = nextListingId++;
        listings[listingId] = Listing(msg.sender, nft, tokenId, price, true);
        emit Listed(listingId, msg.sender, nft, tokenId, price);
    }

    function cancelListing(uint256 listingId) external {
        Listing storage l = listings[listingId];
        if (!l.active) revert InvalidListing();
        if (l.seller != msg.sender) revert NotOwner();
        l.active = false;
        emit ListingCancelled(listingId);
    }

    function buy(uint256 listingId) external payable nonReentrant {
        Listing storage l = listings[listingId];
        if (!l.active) revert InvalidListing();
        if (msg.value != l.price) revert WrongPayment();

        IERC721 nft = IERC721(l.nft);
        address seller = l.seller;
        // Seller must still own the token and approval must still be in place, or the listing is stale.
        if (nft.ownerOf(l.tokenId) != seller) revert InvalidListing();
        if (!_isApproved(l.nft, l.tokenId, seller)) revert InvalidListing();
        if (msg.sender == seller) revert SelfPurchase();

        l.active = false; // effects before interactions

        (uint256 fee, uint256 royalty, address royaltyReceiver) = _split(l.nft, l.tokenId, l.price);
        uint256 toSeller = l.price - fee - royalty;

        nft.safeTransferFrom(seller, msg.sender, l.tokenId);

        _pay(feeRecipient, fee);
        if (royalty > 0) _pay(royaltyReceiver, royalty);
        _pay(seller, toSeller);

        emit Sold(listingId, msg.sender, l.price, fee, royalty);
    }

    // ---------------- offers (escrowed ETH) ----------------

    function makeOffer(address nft, uint256 tokenId, uint64 duration) external payable nonReentrant returns (uint256 offerId) {
        if (msg.value == 0) revert ZeroPrice();
        if (duration == 0 || duration > MAX_OFFER_DURATION) revert OfferDurationTooLong();

        offerId = nextOfferId++;
        uint64 expiresAt = uint64(block.timestamp) + duration;
        offers[offerId] = Offer(msg.sender, nft, tokenId, msg.value, expiresAt, true);
        emit OfferMade(offerId, msg.sender, nft, tokenId, msg.value, expiresAt);
    }

    function cancelOffer(uint256 offerId) external nonReentrant {
        Offer storage o = offers[offerId];
        if (!o.active) revert InvalidOffer();
        if (o.buyer != msg.sender) revert NotOfferBuyer();
        o.active = false;
        uint256 amount = o.amount;
        emit OfferCancelled(offerId);
        _pay(msg.sender, amount);
    }

    /// @notice Owner of the token accepts an active, unexpired offer. Escrowed ETH is split and paid out.
    function acceptOffer(uint256 offerId) external nonReentrant {
        Offer storage o = offers[offerId];
        if (!o.active) revert InvalidOffer();
        if (block.timestamp > o.expiresAt) revert OfferExpired();

        IERC721 nft = IERC721(o.nft);
        if (nft.ownerOf(o.tokenId) != msg.sender) revert NotOwner();
        if (!_isApproved(o.nft, o.tokenId, msg.sender)) revert NotApproved();

        o.active = false; // effects before interactions

        (uint256 fee, uint256 royalty, address royaltyReceiver) = _split(o.nft, o.tokenId, o.amount);
        uint256 toSeller = o.amount - fee - royalty;

        nft.safeTransferFrom(msg.sender, o.buyer, o.tokenId);

        _pay(feeRecipient, fee);
        if (royalty > 0) _pay(royaltyReceiver, royalty);
        _pay(msg.sender, toSeller);

        emit OfferAccepted(offerId, msg.sender, o.amount, fee, royalty);
    }

    // ---------------- views / internals ----------------

    function quote(address nft, uint256 tokenId, uint256 price)
        external
        view
        returns (uint256 fee, uint256 royalty, address royaltyReceiver, uint256 sellerProceeds)
    {
        (fee, royalty, royaltyReceiver) = _split(nft, tokenId, price);
        sellerProceeds = price - fee - royalty;
    }

    function _split(address nft, uint256 tokenId, uint256 price)
        internal
        view
        returns (uint256 fee, uint256 royalty, address royaltyReceiver)
    {
        fee = (price * feeBps) / BPS_DENOMINATOR;
        if (IERC165Like(nft).supportsInterface(type(IERC2981).interfaceId)) {
            (address r, uint256 amt) = IERC2981(nft).royaltyInfo(tokenId, price);
            // Cap royalty so fee + royalty can never exceed the price.
            if (amt > 0 && r != address(0) && amt + fee <= price) {
                royalty = amt;
                royaltyReceiver = r;
            }
        }
    }

    function _isApproved(address nft, uint256 tokenId, address owner) internal view returns (bool) {
        IERC721 token = IERC721(nft);
        return token.getApproved(tokenId) == address(this) || token.isApprovedForAll(owner, address(this));
    }

    function _pay(address to, uint256 amount) internal {
        if (amount == 0) return;
        (bool ok, ) = payable(to).call{value: amount}("");
        if (!ok) revert PayoutFailed();
    }
}

interface IERC165Like {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}
