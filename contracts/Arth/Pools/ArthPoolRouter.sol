// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import '../../Arth/Arth.sol';
import './IArthPool.sol';
import '../../ARTHX/ARTHX.sol';
import '../../ERC20/ERC20.sol';
import '../../Oracle/ISimpleOracle.sol';
import '../../Staking/StakingRewards.sol';

contract ArthPoolRouter {
    IArthPool public pool;

    // todo: use interfaces
    ERC20 private collateral;
    ARTHShares private ARTHX;
    ARTHStablecoin private ARTH;
    StakingRewards private stakingPoolARTH;
    StakingRewards private stakingPoolARTHX;

    constructor(
        IArthPool _pool,
        ARTHShares _ARTHX,
        ARTHStablecoin _ARTH
    ) {
        pool = _pool;
        ARTH = _ARTH;
        ARTHX = _ARTHX;
    }

    function mint1t1ARTHAndStake(
        uint256 collateralAmount,
        uint256 ARTHOutMin,
        uint256 lockDuration
    ) public {
        collateral.transferFrom(msg.sender, address(this), collateralAmount);
        uint256 arthOut = pool.mint1t1ARTH(collateralAmount, ARTHOutMin);
        ARTH.approve(address(stakingPoolARTH), uint256(arthOut));

        if (lockDuration != 0)
            stakingPoolARTH.stakeLockedFor(msg.sender, arthOut, lockDuration);
        else stakingPoolARTH.stakeFor(msg.sender, arthOut);
    }

    function mint1t1ARTHAndStakeWithPermit(
        uint256 collateralAmount,
        uint256 ARTHOutMin,
        uint256 lockDuration,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        // todo
        // collateralToken.approveWithPermit(
        //     ...
        // );

        mint1t1ARTHAndStake(collateralAmount, ARTHOutMin, lockDuration);
    }

    // 0% collateral-backed
    function mintAlgorithmicARTHAndStake(
        uint256 arthxAmountD18,
        uint256 arthOutMin,
        uint256 lockDuration
    ) external {
        ARTHX.transferFrom(msg.sender, address(this), arthxAmountD18);
        uint256 arthOut = pool.mintAlgorithmicARTH(arthxAmountD18, arthOutMin);
        ARTH.approve(address(stakingPoolARTH), uint256(arthOut));

        if (lockDuration != 0) {
            stakingPoolARTH.stakeLockedFor(msg.sender, arthOut, lockDuration);
        } else {
            stakingPoolARTH.stakeFor(msg.sender, arthOut);
        }
    }

    function mintAlgorithmicARTHAndStakeWithPermit(
        uint256 arthxAmountD18,
        uint256 arthOutMin,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        // todo
    }

    function mintFractionalARTHAndStake(
        uint256 collateralAmount,
        uint256 arthxAmount,
        uint256 ARTHOutMin
    ) external {
        // TODO
    }

    function mintFractionalARTHAndStakeWithPermit(
        uint256 collateralAmount,
        uint256 arthxAmount,
        uint256 ARTHOutMin,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        // TODO
    }

    function recollateralizeARTHAndStake(
        uint256 collateralAmount,
        uint256 ARTHXOutMin
    ) external {
        // TODO
    }

    function recollateralizeARTHAndStakeWithPermit(
        uint256 collateralAmount,
        uint256 ARTHXOutMin,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        // TODO
    }
}
