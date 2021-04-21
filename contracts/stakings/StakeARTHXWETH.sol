// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import {IERC20} from "../interfaces/IERC20.sol";
import {StakingRewards} from "./core/StakingRewards.sol";
import {IARTHController} from "../interfaces/IARTHController.sol";

contract StakeARTHXWETH is StakingRewards {
    constructor(
        address owner,
        address rewardsDistribution,
        IERC20 rewardsToken,
        IERC20 stakingToken,
        IARTHController controller,
        address timelockAddress,
        uint256 poolWeight
    )
        StakingRewards(
            owner,
            rewardsDistribution,
            rewardsToken,
            stakingToken,
            controller,
            timelockAddress,
            poolWeight
        )
    {}
}
