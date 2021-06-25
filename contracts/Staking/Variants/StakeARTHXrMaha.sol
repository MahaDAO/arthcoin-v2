// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import '../BasicStakingSpecificReward.sol';

contract StakeARTHXRMAHA is BasicStakingSpecificReward {
    constructor(
        address _rewardsDistribution,
        address _rewardsToken,
        address _stakingToken
    )
        BasicStakingSpecificReward(
            _rewardsDistribution,
            _rewardsToken,
            _stakingToken,
            7 days
        )
    {}
}
