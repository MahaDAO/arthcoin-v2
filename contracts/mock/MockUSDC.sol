// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import './MockCollateral.sol';

contract MockUSDC is MockCollateral {
    constructor() MockCollateral(msg.sender, 10000000e6, 'USDC', 6) {}
}
