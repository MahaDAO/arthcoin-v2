// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import './MockCollateral.sol';

contract MockWETH is MockCollateral {
    constructor() MockCollateral(msg.sender, 100000e18, 'WETH', 18) {}
}
