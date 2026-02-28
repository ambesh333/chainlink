// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/DisputeConsumer.sol";

contract DeployDisputeConsumer is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address escrowMarketplace = vm.envAddress("ESCROW_CONTRACT_ADDRESS");

        address forwarder = 0x15fC6ae953E024d975e77382eEeC56A9101f9F88;

        vm.startBroadcast(deployerPrivateKey);

        DisputeConsumer consumer = new DisputeConsumer(
            forwarder,
            escrowMarketplace
        );

        vm.stopBroadcast();

        console.log("DisputeConsumer deployed at:", address(consumer));
        console.log("Linked to EscrowMarketplace:", escrowMarketplace);
        console.log("Forwarder set to:", forwarder);
    }
}