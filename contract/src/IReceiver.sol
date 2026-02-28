// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IERC165.sol";

/// @title IReceiver - receives keystone reports
interface IReceiver is IERC165 {
    /// @notice Handles incoming keystone reports
    /// @param metadata Workflow metadata
    /// @param report ABI-encoded workflow result
    function onReport(
        bytes calldata metadata,
        bytes calldata report
    ) external;
}