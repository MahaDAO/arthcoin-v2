// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import '../ERC20/MahaToken.sol';

contract MockMaha is MahaToken {
    constructor() MahaToken() {}

    function faucet() public {
        _mint(msg.sender, 10000000e18);
    }
}
