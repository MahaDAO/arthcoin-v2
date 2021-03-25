// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import '../StakingRewardsDual.sol';

contract StakingRewardsDual_ARTH_FXS_Sushi is StakingRewardsDual {
    constructor(
        address _owner,
        address _rewardsToken0,
        address _rewardsToken1,
        address _stakingToken,
        address _arth_address,
        address _timelock_address,
        uint256 _pool_weight0,
        uint256 _pool_weight1
    )
        StakingRewardsDual(
            _owner,
            _rewardsToken0,
            _rewardsToken1,
            _stakingToken,
            _arth_address,
            _timelock_address,
            _pool_weight0,
            _pool_weight1
        )
    {}
}
