// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {IARTH} from '../Arth/IARTH.sol';
import {IARTHPool} from '../Arth/Pools/IARTHPool.sol';
import {IARTHX} from '../ARTHX/IARTHX.sol';
import {IERC20} from '../ERC20/IERC20.sol';
import {IWETH} from '../ERC20/IWETH.sol';
import {ISimpleOracle} from '../Oracle/ISimpleOracle.sol';
import {IStakingRewards} from '../Staking/IStakingRewards.sol';

contract ArthPoolRouter {
    IARTH private arth;
    IARTHX private arthx;
    IWETH private weth;

    constructor(
        IARTHX _arthx,
        IARTH _arth,
        IWETH _weth
    ) {
        arth = _arth;
        arthx = _arthx;
        weth = _weth;
    }

    function mint1t1ARTHAndStake(
        IARTHPool pool,
        IERC20 collateral,
        uint256 amount,
        uint256 arthOutMin,
        uint256 secs,
        IStakingRewards stakingPool
    ) external {
        _mint1t1ARTHAndStake(
            pool,
            collateral,
            amount,
            arthOutMin,
            secs,
            stakingPool
        );
    }

    function mintAlgorithmicARTHAndStake(
        IARTHPool pool,
        uint256 arthxAmountD18,
        uint256 arthOutMin,
        uint256 secs,
        IStakingRewards stakingPool
    ) external {
        _mintAlgorithmicARTHAndStake(
            pool,
            arthxAmountD18,
            arthOutMin,
            secs,
            stakingPool
        );
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
        _mintFractionalARTHAndStake(
            pool,
            collateral,
            amount,
            arthxAmount,
            arthOutMin,
            secs,
            stakingPool
        );
    }

    function recollateralizeARTHAndStake(
        IARTHPool pool,
        IERC20 collateral,
        uint256 amount,
        uint256 arthxOutMin,
        uint256 secs,
        IStakingRewards stakingPool
    ) external {
        _recollateralizeARTHAndStake(
            pool,
            collateral,
            amount,
            arthxOutMin,
            secs,
            stakingPool
        );
    }

    function recollateralizeARTHAndStakeWithETH(
        IARTHPool pool,
        uint256 arthxOutMin,
        uint256 secs,
        IStakingRewards stakingPool
    ) external payable {
        weth.deposit{value: msg.value}();
        _recollateralizeARTHAndStake(
            pool,
            weth,
            msg.value,
            arthxOutMin,
            secs,
            stakingPool
        );
    }

    function mint1t1ARTHAndStakeWithETH(
        IARTHPool pool,
        uint256 arthOutMin,
        uint256 secs,
        IStakingRewards stakingPool
    ) external payable {
        weth.deposit{value: msg.value}();
        _mint1t1ARTHAndStake(
            pool,
            weth,
            msg.value,
            arthOutMin,
            secs,
            stakingPool
        );
    }

    function mintFractionalARTHAndStakeWithETH(
        IARTHPool pool,
        uint256 arthxAmount,
        uint256 arthOutMin,
        uint256 secs,
        IStakingRewards stakingPool
    ) external payable {
        weth.deposit{value: msg.value}();
        _mintFractionalARTHAndStake(
            pool,
            weth,
            msg.value,
            arthxAmount,
            arthOutMin,
            secs,
            stakingPool
        );
    }

    function _mint1t1ARTHAndStake(
        IARTHPool pool,
        IERC20 collateral,
        uint256 amount,
        uint256 arthOutMin,
        uint256 secs,
        IStakingRewards stakingPool
    ) internal {
        collateral.transferFrom(msg.sender, address(this), amount);

        uint256 arthOut = pool.mint1t1ARTH(amount, arthOutMin);
        arth.approve(address(stakingPool), uint256(arthOut));

        if (address(stakingPool) != address(0)) {
            if (secs != 0)
                stakingPool.stakeLockedFor(msg.sender, arthOut, secs);
            else stakingPool.stakeFor(msg.sender, arthOut);
        }
    }

    function _mintAlgorithmicARTHAndStake(
        IARTHPool pool,
        uint256 arthxAmountD18,
        uint256 arthOutMin,
        uint256 secs,
        IStakingRewards stakingPool
    ) internal {
        arthx.transferFrom(msg.sender, address(this), arthxAmountD18);

        uint256 arthOut = pool.mintAlgorithmicARTH(arthxAmountD18, arthOutMin);
        arth.approve(address(stakingPool), uint256(arthOut));

        if (address(stakingPool) != address(0)) {
            if (secs != 0)
                stakingPool.stakeLockedFor(msg.sender, arthOut, secs);
            else stakingPool.stakeFor(msg.sender, arthOut);
        }
    }

    function _mintFractionalARTHAndStake(
        IARTHPool pool,
        IERC20 collateral,
        uint256 amount,
        uint256 arthxAmount,
        uint256 arthOutMin,
        uint256 secs,
        IStakingRewards stakingPool
    ) internal {
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

    function _recollateralizeARTHAndStake(
        IARTHPool pool,
        IERC20 collateral,
        uint256 amount,
        uint256 arthxOutMin,
        uint256 secs,
        IStakingRewards stakingPool
    ) internal {
        collateral.transferFrom(msg.sender, address(this), amount);

        uint256 arthxOut = pool.recollateralizeARTH(amount, arthxOutMin);
        arthx.approve(address(stakingPool), uint256(arthxOut));

        if (address(stakingPool) != address(0)) {
            if (secs != 0)
                stakingPool.stakeLockedFor(msg.sender, arthxOut, secs);
            else stakingPool.stakeFor(msg.sender, arthxOut);
        }
    }
}
