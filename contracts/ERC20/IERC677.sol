// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC677 {
    function approveAndCall(address spender, uint256 value, bytes calldata data) external returns (bool);

    function transferAndCall(address to, uint value, bytes calldata data) external returns (bool);
}