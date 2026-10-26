// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {ERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title OrbixNFT
/// @notice Minimal ERC-721 with ERC-2981 royalties. Testnet only. Not audited.
/// @dev Anyone can mint while minting is open; the minter becomes the creator and royalty receiver.
///      Royalty is capped at 10% (1000 bps) to match the UI.
contract OrbixNFT is ERC721, ERC721URIStorage, ERC2981, Ownable {
    uint256 public constant MAX_ROYALTY_BPS = 1000;
    uint256 public nextTokenId = 1;
    uint256 public maxSupply;
    bool public mintingOpen = true;

    mapping(uint256 => address) public creatorOf;

    event Minted(uint256 indexed tokenId, address indexed creator, string uri, uint96 royaltyBps);
    event MintingToggled(bool open);

    error MintingClosed();
    error SupplyExhausted();
    error RoyaltyTooHigh();

    constructor(string memory name_, string memory symbol_, uint256 maxSupply_, address initialOwner)
        ERC721(name_, symbol_)
        Ownable(initialOwner)
    {
        maxSupply = maxSupply_;
    }

    function mint(string calldata uri, uint96 royaltyBps) external returns (uint256 tokenId) {
        if (!mintingOpen) revert MintingClosed();
        if (nextTokenId > maxSupply) revert SupplyExhausted();
        if (royaltyBps > MAX_ROYALTY_BPS) revert RoyaltyTooHigh();

        tokenId = nextTokenId++;
        creatorOf[tokenId] = msg.sender;
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, uri);
        _setTokenRoyalty(tokenId, msg.sender, royaltyBps);
        emit Minted(tokenId, msg.sender, uri, royaltyBps);
    }

    function setMintingOpen(bool open) external onlyOwner {
        mintingOpen = open;
        emit MintingToggled(open);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
}
