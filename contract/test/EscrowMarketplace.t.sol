// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/EscrowMarketplace.sol";
import "../src/DisputeConsumer.sol";


// =============================================================
// ESCROW TESTS
// =============================================================
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
        assertTrue(true);
    }

    function testDepositEmitsEscrowFunded() public {
        bytes32 key = keccak256("resource-funded");
        escrow.createEscrow(key, merchant, agent, address(0), 1 ether, 1 hours);

        vm.deal(agent, 2 ether);

        vm.expectEmit(true, true, true, true);
        emit EscrowMarketplace.EscrowFunded(key, agent, merchant, 1 ether);

        vm.prank(agent);
        escrow.deposit{value: 1 ether}(key);
    }

    function testRaiseDisputeEmitsEvent() public {
        bytes32 key = keccak256("resource-dispute");
        escrow.createEscrow(key, merchant, agent, address(0), 1 ether, 1 hours);

        vm.deal(agent, 2 ether);
        vm.prank(agent);
        escrow.deposit{value: 1 ether}(key);

        vm.expectEmit(true, true, true, true);
        emit EscrowMarketplace.DisputeRaised(key, agent, merchant, 1 ether);

        vm.prank(agent);
        escrow.raiseDispute(key);

        EscrowMarketplace.Escrow memory e = escrow.getEscrow(key);
        assertEq(uint256(e.state), uint256(EscrowMarketplace.EscrowState.Disputed));
        assertTrue(e.agentRaisedDispute);
    }

    function testSettlementFlowWithEvents() public {
        bytes32 key = keccak256("resource-settle");

        escrow.createEscrow(key, merchant, agent, address(0), 1 ether, 1 hours);

        vm.deal(agent, 2 ether);
        vm.prank(agent);
        escrow.deposit{value: 1 ether}(key);

        vm.expectEmit(true, true, false, true);
        emit EscrowMarketplace.SettlementRequested(key, agent);

        vm.prank(agent);
        escrow.requestSettlement(key);

        EscrowMarketplace.Escrow memory e = escrow.getEscrow(key);
        assertEq(uint256(e.state), uint256(EscrowMarketplace.EscrowState.SettlementRequested));
        assertTrue(e.agentRequestedSettlement);

        vm.expectEmit(true, true, false, true);
        emit EscrowMarketplace.SettlementFinalized(key, merchant, true);

        uint256 merchantBalBefore = merchant.balance;
        vm.prank(facilitator);
        escrow.finalizeSettlement(key, true);

        assertEq(merchant.balance, merchantBalBefore + 1 ether);

        EscrowMarketplace.Escrow memory settled = escrow.getEscrow(key);
        assertEq(uint256(settled.state), uint256(EscrowMarketplace.EscrowState.Settled));
    }

    function testGetEscrowRevertsForNonexistent() public {
        bytes32 key = keccak256("nonexistent");
        vm.expectRevert("escrow:not exist");
        escrow.getEscrow(key);
    }
}


// =============================================================
// DISPUTE CONSUMER TESTS (ReceiverTemplate version)
// =============================================================
contract DisputeConsumerTest is Test {
    EscrowMarketplace escrow;
    DisputeConsumer consumer;

    address merchant = address(1);
    address agent = address(2);
    address forwarder = address(4);

    function setUp() public {
        escrow = new EscrowMarketplace();

        // Deploy consumer with forwarder + escrow
        consumer = new DisputeConsumer(
            forwarder,
            address(escrow)
        );

        // Register DisputeConsumer as facilitator
        escrow.addFacilitator(address(consumer));
    }

    function testReportResolvesDispute() public {
        bytes32 key = keccak256("cre-dispute");

        escrow.createEscrow(key, merchant, agent, address(0), 1 ether, 1 hours);

        vm.deal(agent, 2 ether);
        vm.prank(agent);
        escrow.deposit{value: 1 ether}(key);

        vm.prank(agent);
        escrow.raiseDispute(key);

        uint256 merchantBalBefore = merchant.balance;
        bytes memory reportData = abi.encode(key, true);

        vm.expectEmit(true, false, false, true);
        emit DisputeConsumer.DisputeResolved(key, true);

        vm.prank(forwarder);
        consumer.onReport("", reportData);

        assertEq(merchant.balance, merchantBalBefore + 1 ether);

        (bool resolved, bool payMerchant) = consumer.getResolution(key);
        assertTrue(resolved);
        assertTrue(payMerchant);
    }

    function testReportRefundsAgent() public {
        bytes32 key = keccak256("cre-refund");

        escrow.createEscrow(key, merchant, agent, address(0), 1 ether, 1 hours);

        vm.deal(agent, 2 ether);
        vm.prank(agent);
        escrow.deposit{value: 1 ether}(key);

        vm.prank(agent);
        escrow.raiseDispute(key);

        uint256 agentBalBefore = agent.balance;
        bytes memory reportData = abi.encode(key, false);

        vm.prank(forwarder);
        consumer.onReport("", reportData);

        assertEq(agent.balance, agentBalBefore + 1 ether);

        (bool resolved, bool payMerchant) = consumer.getResolution(key);
        assertTrue(resolved);
        assertFalse(payMerchant);
    }

    function testUnauthorizedCallerReverts() public {
        bytes memory reportData = abi.encode(keccak256("key"), true);

        // Not forwarder → revert
        vm.expectRevert();
        consumer.onReport("", reportData);
    }

    function testDoubleResolutionReverts() public {
        bytes32 key = keccak256("cre-double");

        escrow.createEscrow(key, merchant, agent, address(0), 1 ether, 1 hours);

        vm.deal(agent, 2 ether);
        vm.prank(agent);
        escrow.deposit{value: 1 ether}(key);

        vm.prank(agent);
        escrow.raiseDispute(key);

        bytes memory reportData = abi.encode(key, true);

        vm.prank(forwarder);
        consumer.onReport("", reportData);

        vm.expectRevert("already resolved");
        vm.prank(forwarder);
        consumer.onReport("", reportData);
    }

    function testSetForwarderOnlyOwner() public {
        vm.prank(agent);
        vm.expectRevert();
        consumer.setForwarderAddress(address(5));
    }
}