// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title OrbixToken
/// @notice Fixed-supply ERC-20 created by OrbixTokenFactory. The full 100m supply is minted once in the
///         constructor (5% to the platform, 95% to the creator). There is no mint function afterwards,
///         so total supply is always exactly MAX_SUPPLY. Testnet only. Not audited.
contract OrbixToken is ERC20 {
    uint256 public constant MAX_SUPPLY = 100_000_000 * 1e18;
    uint256 public constant PLATFORM_BPS = 500; // 5%
    uint256 public constant BPS_DENOMINATOR = 10_000;

    /// @notice Address that created the token (the wallet that called the factory).
    address public immutable creator;
    /// @notice Factory that deployed this token.
    address public immutable factory;
    /// @notice Platform address that received the 5% fee allocation at creation.
    address public immutable platform;
    /// @notice Amount minted to the platform at creation.
    uint256 public immutable platformAllocation;

    constructor(string memory name_, string memory symbol_, address creator_, address platform_)
        ERC20(name_, symbol_)
    {
        creator = creator_;
        factory = msg.sender;
        platform = platform_;
        platformAllocation = (MAX_SUPPLY * PLATFORM_BPS) / BPS_DENOMINATOR;
        _mint(platform_, platformAllocation);
        _mint(creator_, MAX_SUPPLY - platformAllocation);
    }
}
