// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import '../Arth/Arth.sol';

contract MockArth is ARTHStablecoin {
    constructor() ARTHStablecoin() {}

    function faucet() public {
        _mint(msg.sender, 10000000e18);
    }
}
