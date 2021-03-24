// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC2612 {
    function nonces(address owner) external view returns (uint256);
}