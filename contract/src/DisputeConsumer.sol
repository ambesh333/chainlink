// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./EscrowMarketplace.sol";
import "./ReceiverTemplate.sol";

contract DisputeConsumer is ReceiverTemplate {
    EscrowMarketplace public immutable escrowMarketplace;

    mapping(bytes32 => bool) public creResolved;
    mapping(bytes32 => bool) public creDecision;

    event DisputeResolved(bytes32 indexed escrowKey, bool payMerchant);

    constructor(
        address _forwarder,
        address _escrowMarketplace
    ) ReceiverTemplate(_forwarder) {
        require(_escrowMarketplace != address(0), "zero escrow");
        escrowMarketplace = EscrowMarketplace(payable(_escrowMarketplace));
    }

    function _processReport(
        bytes calldata report
    ) internal override {
        (bytes32 escrowKey, bool payMerchant) =
            abi.decode(report, (bytes32, bool));

        require(!creResolved[escrowKey], "already resolved");

        creResolved[escrowKey] = true;
        creDecision[escrowKey] = payMerchant;

        escrowMarketplace.finalizeSettlement(escrowKey, payMerchant);

        emit DisputeResolved(escrowKey, payMerchant);
    }

    function getResolution(
        bytes32 escrowKey
    ) external view returns (bool resolved, bool payMerchant) {
        return (creResolved[escrowKey], creDecision[escrowKey]);
    }
}