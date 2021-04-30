// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import './MockCollateral.sol';

contract MockDAI is MockCollateral {
    constructor() MockCollateral(msg.sender, 10000000e18, 'DAI', 18) {}
}
