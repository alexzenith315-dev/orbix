// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @dev Test helper: rejects all ETH, used to prove failed payouts revert the sale.
contract RejectEth {
    receive() external payable {
        revert("no eth");
    }
}
