// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IAnyswapV4Token {
    event LogSwapin(
        bytes32 indexed txhash,
        address indexed account,
        uint256 amount
    );

    event LogSwapout(
        address indexed account,
        address indexed bindaddr,
        uint256 amount
    );

    function approveAndCall(
        address spender,
        uint256 value,
        bytes calldata data
    ) external returns (bool);

    function transferAndCall(
        address to,
        uint256 value,
        bytes calldata data
    ) external returns (bool);

    function transferWithPermit(
        address target,
        address to,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external returns (bool);

    function Swapin(
        bytes32 txhash,
        address account,
        uint256 amount
    ) external returns (bool);

    function nonces(address owner) external view returns (uint256);

    function Swapout(uint256 amount, address bindaddr) external returns (bool);
}
