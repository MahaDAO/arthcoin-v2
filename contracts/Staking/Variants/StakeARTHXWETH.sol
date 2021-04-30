// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import '../BoostedStaking.sol';

contract StakeARTHXWETH is BoostedStaking {
    constructor(
        address _owner,
        address _rewardsDistribution,
        address _rewardsToken,
        address _stakingToken,
        address _arthAddress,
        address _timelockaddress,
        uint256 _poolWeight
    )
        BoostedStaking(
            _owner,
            _rewardsDistribution,
            _rewardsToken,
            _stakingToken,
            _arthAddress,
            _timelockaddress,
            _poolWeight
        )
    {}
}
