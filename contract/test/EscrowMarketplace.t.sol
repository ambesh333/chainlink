// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/EscrowMarketplace.sol";

contract EscrowMarketplaceTest is Test {
    EscrowMarketplace escrow;
    address merchant = address(1);
    address agent = address(2);

    function setUp() public {
        escrow = new EscrowMarketplace();
    }

    function testCreateEscrow() public {
        bytes32 key = keccak256("resource1");

        escrow.createEscrow(key, merchant, agent, address(0), 1 ether, 1 hours);

        // If no revert → test passes
        assertTrue(true);
    }
}
