// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import './Genesis.sol';

contract GenesisUSDT is Genesis {
    using SafeMath for uint256;

    constructor (
        address _arthContractAddress,
        address _arthxContractAddress,
        address _arthController,
        address _collateralAddress,
        address _creatorAddress,
        address _timelockAddress,
        address _arthPool
    ) Genesis(
        _arthContractAddress,
        _arthxContractAddress,
        _arthController,
        _collateralAddress,
        _creatorAddress,
        _timelockAddress,
        _arthPool
    ){}
}
