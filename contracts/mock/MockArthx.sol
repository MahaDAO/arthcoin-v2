// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '../ARTHX/ARTHX.sol';

contract MockArthx is ARTHShares {
    constructor(
        address _oracleAddress,
        address _ownerAddress,
        address _timelockAddress
    ) ARTHShares(
        _oracleAddress,
        _ownerAddress,
        _timelockAddress
    ) {}

    function faucet() public {
        _mint(msg.sender, 10000000e18);
    }
}
