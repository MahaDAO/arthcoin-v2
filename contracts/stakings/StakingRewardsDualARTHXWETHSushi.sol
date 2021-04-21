// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import {IERC20} from "../interfaces/IERC20.sol";
import {IARTHController} from "../interfaces/IARTHController.sol";
import {StakingRewardsDual} from "./core/StakingRewardsDual.sol";

contract StakingRewardsDualARTHXWETHSushi is StakingRewardsDual {
    constructor(
        address owner,
        IERC20 rewardsToken0,
        IERC20 rewardsToken1,
        IERC20 stakingToken,
        IARTHController controller,
        address timelockAddress,
        uint256 poolWeight0,
        uint256 poolWeight1
    )
        StakingRewardsDual(
            owner,
            rewardsToken0,
            rewardsToken1,
            stakingToken,
            controller,
            timelockAddress,
            poolWeight0,
            poolWeight1
        )
    {}
}
