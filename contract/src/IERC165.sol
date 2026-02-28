// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title IERC165 - Standard interface detection
interface IERC165 {
    /// @notice Query if a contract implements an interface
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}