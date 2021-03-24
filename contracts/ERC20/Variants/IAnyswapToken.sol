// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IAnyswapToken {
    function transferWithPermit(address target, address to, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) 
        external 
        returns (bool);
    
    function Swapin(bytes32 txhash, address account, uint256 amount) external returns (bool);

    function Swapout(uint256 amount, address bindaddr) external returns (bool);
}