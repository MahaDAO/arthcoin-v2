// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {IARTH} from '../Arth/IARTH.sol';
import {IARTHPool} from '../Arth/Pools/IARTHPool.sol';
import {IARTHX} from '../ARTHX/IARTHX.sol';
import {IERC20} from '../ERC20/IERC20.sol';
import {ISimpleOracle} from '../Oracle/ISimpleOracle.sol';
import {IStakingRewards} from '../Staking/IStakingRewards.sol';

contract ArthPoolRouter {
    IARTH private arth;
    IARTHX private arthx;

    constructor(IARTHX _arthx, IARTH _arth) {
        arth = _arth;
        arthx = _arthx;
    }

    function mint1t1ARTHAndStake(
        IARTHPool pool,
        IERC20 collateral,
        uint256 amount,
        uint256 arthOutMin,
        uint256 secs,
        IStakingRewards stakingPool
    ) public {
        collateral.transferFrom(msg.sender, address(this), amount);

        uint256 arthOut = pool.mint1t1ARTH(amount, arthOutMin);
        arth.approve(address(stakingPool), uint256(arthOut));

        if (address(stakingPool) != address(0)) {
            if (secs != 0)
                stakingPool.stakeLockedFor(msg.sender, arthOut, secs);
            else stakingPool.stakeFor(msg.sender, arthOut);
        }
    }

    function mintAlgorithmicARTHAndStake(
        IARTHPool pool,
        uint256 arthxAmountD18,
        uint256 arthOutMin,
        uint256 secs,
        IStakingRewards stakingPool
    ) external {
        arthx.transferFrom(msg.sender, address(this), arthxAmountD18);

        uint256 arthOut = pool.mintAlgorithmicARTH(arthxAmountD18, arthOutMin);
        arth.approve(address(stakingPool), uint256(arthOut));

        if (address(stakingPool) != address(0)) {
            if (secs != 0)
                stakingPool.stakeLockedFor(msg.sender, arthOut, secs);
            else stakingPool.stakeFor(msg.sender, arthOut);
        }
    }

    function mintFractionalARTHAndStake(
        IARTHPool pool,
        IERC20 collateral,
        uint256 amount,
        uint256 arthxAmount,
        uint256 arthOutMin,
        uint256 secs,
        IStakingRewards stakingPool
    ) external {
        collateral.transferFrom(msg.sender, address(this), amount);
        arthx.transferFrom(msg.sender, address(this), arthxAmount);

        uint256 arthOut =
            pool.mintFractionalARTH(amount, arthxAmount, arthOutMin);
        arth.approve(address(stakingPool), uint256(arthOut));

        if (address(stakingPool) != address(0)) {
            if (secs != 0)
                stakingPool.stakeLockedFor(msg.sender, arthOut, secs);
            else stakingPool.stakeFor(msg.sender, arthOut);
        }
    }

    function recollateralizeARTHAndStake(
        IARTHPool pool,
        IERC20 collateral,
        uint256 amount,
        uint256 ARTHXOutMin,
        uint256 secs,
        IStakingRewards stakingPool
    ) external {
        collateral.transferFrom(msg.sender, address(this), amount);

        uint256 arthxOut = pool.recollateralizeARTH(amount, ARTHXOutMin);
        arthx.approve(address(stakingPool), uint256(arthxOut));

        if (address(stakingPool) != address(0)) {
            if (secs != 0)
                stakingPool.stakeLockedFor(msg.sender, arthxOut, secs);
            else stakingPool.stakeFor(msg.sender, arthxOut);
        }
    }
}
