// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import './MockCollateral.sol';

contract MockWMATIC is MockCollateral {
    constructor() MockCollateral(msg.sender, 500000000000e18, 'WMATIC', 18) {}
}
