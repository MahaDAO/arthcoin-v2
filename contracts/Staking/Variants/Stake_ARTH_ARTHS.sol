// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import '../StakingRewards.sol';

contract Stake_ARTH_ARTHS is StakingRewards {
    constructor(
        address _owner,
        address _rewardsDistribution,
        address _rewardsToken,
        address _stakingToken,
        address _arth_address,
        address _timelock_address,
        uint256 _pool_weight
    )
        StakingRewards(
            _owner,
            _rewardsDistribution,
            _rewardsToken,
            _stakingToken,
            _arth_address,
            _timelock_address,
            _pool_weight
        )
    {}
}
