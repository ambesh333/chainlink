// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/EscrowMarketplace.sol";

contract DeployEscrow is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        EscrowMarketplace escrow = new EscrowMarketplace();

        vm.stopBroadcast();

        console.log("Escrow deployed at:", address(escrow));
    }
}
