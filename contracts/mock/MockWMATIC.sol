// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import './MockCollateral.sol';

contract MockWMATIC is MockCollateral {
    constructor() MockCollateral(msg.sender, 50000e18, 'MATIC', 18) {}
}
