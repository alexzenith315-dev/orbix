// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {OrbixToken} from "./OrbixToken.sol";

/// @title OrbixTokenFactory
/// @notice Anyone can create a fixed-supply ERC-20 (100m, 5% to the platform). Testnet only. Not audited.
/// @dev Platform recipient is set by the owner and applies to tokens created after the change.
contract OrbixTokenFactory is Ownable {
    uint256 public constant MAX_SUPPLY = 100_000_000 * 1e18;
    uint256 public constant PLATFORM_BPS = 500;
    uint256 public constant MAX_NAME_LENGTH = 64;
    uint256 public constant MAX_SYMBOL_LENGTH = 12;

    address public feeRecipient;
    address[] private _tokens;
    mapping(address => bool) public isOrbixToken;
    mapping(address => address[]) private _tokensByCreator;

    event FeeRecipientUpdated(address indexed recipient);
    event TokenCreated(
        address indexed token,
        address indexed creator,
        string name,
        string symbol,
        uint256 maxSupply,
        uint256 platformAllocation,
        uint256 creatorAllocation
    );

    error ZeroAddress();
    error InvalidName();
    error InvalidSymbol();

    constructor(address initialOwner, address feeRecipient_) Ownable(initialOwner) {
        if (feeRecipient_ == address(0)) revert ZeroAddress();
        feeRecipient = feeRecipient_;
    }

    function setFeeRecipient(address recipient) external onlyOwner {
        if (recipient == address(0)) revert ZeroAddress();
        feeRecipient = recipient;
        emit FeeRecipientUpdated(recipient);
    }

    function createToken(string calldata name_, string calldata symbol_) external returns (address token) {
        uint256 nameLen = bytes(name_).length;
        if (nameLen == 0 || nameLen > MAX_NAME_LENGTH) revert InvalidName();
        uint256 symLen = bytes(symbol_).length;
        if (symLen == 0 || symLen > MAX_SYMBOL_LENGTH) revert InvalidSymbol();

        OrbixToken t = new OrbixToken(name_, symbol_, msg.sender, feeRecipient);
        token = address(t);
        _tokens.push(token);
        isOrbixToken[token] = true;
        _tokensByCreator[msg.sender].push(token);

        uint256 platformAmt = t.platformAllocation();
        emit TokenCreated(token, msg.sender, name_, symbol_, MAX_SUPPLY, platformAmt, MAX_SUPPLY - platformAmt);
    }

    function tokenCount() external view returns (uint256) {
        return _tokens.length;
    }

    function allTokens() external view returns (address[] memory) {
        return _tokens;
    }

    function tokensByCreator(address creator) external view returns (address[] memory) {
        return _tokensByCreator[creator];
    }
}
