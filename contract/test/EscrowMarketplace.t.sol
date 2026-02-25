// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/EscrowMarketplace.sol";

contract EscrowMarketplaceTest is Test {
    EscrowMarketplace escrow;
    address merchant = address(1);
    address agent = address(2);
    address facilitator = address(3);

    function setUp() public {
        escrow = new EscrowMarketplace();
        escrow.addFacilitator(facilitator);
    }

    function testCreateEscrow() public {
        bytes32 key = keccak256("resource1");

        escrow.createEscrow(key, merchant, agent, address(0), 1 ether, 1 hours);

        // If no revert → test passes
        assertTrue(true);
    }

    function testSettlementFlowWithEvents() public {
        bytes32 key = keccak256("resource-settle");

        // 1. Create escrow
        escrow.createEscrow(key, merchant, agent, address(0), 1 ether, 1 hours);

        // 2. Fund escrow as agent
        vm.deal(agent, 2 ether);
        vm.prank(agent);
        escrow.deposit{value: 1 ether}(key);

        // 3. Agent requests settlement — expect SettlementRequested event
        vm.expectEmit(true, true, false, true);
        emit EscrowMarketplace.SettlementRequested(key, agent);

        vm.prank(agent);
        escrow.requestSettlement(key);

        // 4. Verify escrow state via getEscrow
        EscrowMarketplace.Escrow memory e = escrow.getEscrow(key);
        assertEq(uint256(e.state), uint256(EscrowMarketplace.EscrowState.SettlementRequested));
        assertTrue(e.agentRequestedSettlement);
        assertFalse(e.agentRaisedDispute);
        assertEq(e.merchant, merchant);
        assertEq(e.agent, agent);
        assertEq(e.amount, 1 ether);

        // 5. Facilitator finalizes — expect SettlementFinalized event
        vm.expectEmit(true, true, false, true);
        emit EscrowMarketplace.SettlementFinalized(key, merchant, true);

        uint256 merchantBalBefore = merchant.balance;
        vm.prank(facilitator);
        escrow.finalizeSettlement(key, true);

        // 6. Verify merchant received funds
        assertEq(merchant.balance, merchantBalBefore + 1 ether);

        // 7. Verify escrow is now Settled
        EscrowMarketplace.Escrow memory settled = escrow.getEscrow(key);
        assertEq(uint256(settled.state), uint256(EscrowMarketplace.EscrowState.Settled));
    }

    function testGetEscrowRevertsForNonexistent() public {
        bytes32 key = keccak256("nonexistent");
        vm.expectRevert("escrow:not exist");
        escrow.getEscrow(key);
    }
}
