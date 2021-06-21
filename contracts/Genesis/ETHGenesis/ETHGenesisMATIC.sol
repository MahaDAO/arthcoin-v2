// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import './ETHGenesis.sol';

contract ETHGenesisMATIC is ETHGenesis {
    using SafeMath for uint256;

    constructor (
        address __collateralAddress,
        address _creatorAddress,
        address __timelockAddress,
        address __collateralGMUOracle
    ) ETHGenesis (
        __collateralAddress,
        _creatorAddress,
        __timelockAddress,
        __collateralGMUOracle
    ){}
}
