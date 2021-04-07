// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import './IARTH.sol';
import './IARTHPool.sol';
import '../../ARTHX/ARTHX.sol';
import '../../ERC20/IERC20.sol';
import '../../Oracle/ISimpleOracle.sol';
import '../../Staking/StakingRewards.sol';

contract ArthPoolRouter {
    /**
     * State variables.
     */

    IARTH _ARTH;
    IARTHPool private _POOL;
    IERC20 private _COLLATEAL;
    ARTHShares private _ARTHX;
    StakingRewards private _arthStakingPool;
    StakingRewards private _arthxStakingPool;

    /**
     * Constructor.
     */
    constructor(
        IArthPool __POOL,
        ARTHShares __ARTHX,
        ARTHStablecoin __ARTH,
        StakingRewards __arthStakingPool,
        StakingRewards __arthxStakingPool
    ) {
        _POOL = __POOL;
        _ARTH = __ARTH;
        _ARTHX = __ARTHX;

        _arthStakingPool = __arthStakingPool;
        _arthxStakingPool = __arthxStakingPool;
    }

    /**
     * Public.
     */
    function mint1t1ARTHAndStake(
        uint256 collateralAmount,
        uint256 arthOutMin,
        uint256 lockDuration
    ) public {
        _COLLATEAL.transferFrom(msg.sender, address(this), collateralAmount);

        uint256 arthOut = _POOL.mint1t1ARTH(collateralAmount, arthOutMin);
        ARTH.approve(address(stakingPoolARTH), uint256(arthOut));

        if (lockDuration != 0)
            _arthStakingPool.stakeLockedFor(msg.sender, arthOut, lockDuration);
        else _arthStakingPool.stakeFor(msg.sender, arthOut);
    }

    function mint1t1ARTHAndStakeWithPermit(
        uint256 collateralAmount,
        uint256 arthOutMin,
        uint256 lockDuration,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        ARTH.permit(
            msg.sender,
            address(stakingPoolARTH),
            uint256(int256(-1)),
            block.timestamp,
            v,
            r,
            s
        );

        uint256 arthOut = _POOL.mint1t1ARTH(collateralAmount, arthOutMin);

        if (lockDuration != 0)
            _arthStakingPool.stakeLockedFor(msg.sender, arthOut, lockDuration);
        else _arthStakingPool.stakeFor(msg.sender, arthOut);
    }

    function mintAlgorithmicARTHAndStake(
        uint256 arthxAmountD18,
        uint256 arthOutMin,
        uint256 lockDuration
    ) external {
        ARTHX.transferFrom(msg.sender, address(this), arthxAmountD18);
        uint256 arthOut = _POOL.mintAlgorithmicARTH(arthxAmountD18, arthOutMin);
        ARTH.approve(address(stakingPoolARTH), uint256(arthOut));

        if (lockDuration != 0) {
            _arthStakingPool.stakeLockedFor(msg.sender, arthOut, lockDuration);
        } else {
            _arthStakingPool.stakeFor(msg.sender, arthOut);
        }
    }

    function mintAlgorithmicARTHAndStakeWithPermit(
        uint256 arthxAmountD18,
        uint256 arthOutMin,
        uint256 lockDuration,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        ARTH.permit(
            msg.sender,
            address(stakingPoolARTH),
            uint256(int256(-1)),
            block.timestamp,
            v,
            r,
            s
        );

        uint256 arthOut = _POOL.mintAlgorithmicARTH(arthxAmountD18, arthOutMin);

        if (lockDuration != 0)
            _arthStakingPool.stakeLockedFor(msg.sender, arthOut, lockDuration);
        else _arthStakingPool.stakeFor(msg.sender, arthOut);
    }

    function mintFractionalARTHAndStake(
        uint256 collateralAmount,
        uint256 arthxAmount,
        uint256 arthOutMin,
        uint256 lockDuration
    ) external {
        _COLLATEAL.transferFrom(msg.sender, address(this), collateralAmount);
        ARTHX.transferFrom(msg.sender, address(this), arthxAmount);

        uint256 arthOut =
            _POOL.mintFractionalARTH(collateralAmount, arthxAmount, arthOutMin);
        ARTH.approve(address(stakingPoolARTH), uint256(arthOut));

        if (lockDuration != 0)
            _arthStakingPool.stakeLockedFor(msg.sender, arthOut, lockDuration);
        else _arthStakingPool.stakeFor(msg.sender, arthOut);
    }

    function mintFractionalARTHAndStakeWithPermit(
        uint256 collateralAmount,
        uint256 arthxAmount,
        uint256 arthOutMin,
        uint256 lockDuration,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        ARTH.permit(
            msg.sender,
            address(stakingPoolARTH),
            uint256(int256(-1)),
            block.timestamp,
            v,
            r,
            s
        );

        uint256 arthOut =
            _POOL.mintFractionalARTH(collateralAmount, arthxAmount, arthOutMin);

        if (lockDuration != 0)
            _arthStakingPool.stakeLockedFor(msg.sender, arthOut, lockDuration);
        else _arthStakingPool.stakeFor(msg.sender, arthOut);
    }

    function recollateralizeARTHAndStake(
        uint256 collateralAmount,
        uint256 ARTHXOutMin,
        uint256 lockDuration
    ) external {
        _COLLATEAL.transferFrom(msg.sender, address(this), collateralAmount);
        uint256 arthxOut =
            _POOL.recollateralizeARTH(collateralAmount, ARTHXOutMin);
        ARTHX.approve(address(stakingPoolARTHX), uint256(arthxOut));

        if (lockDuration != 0)
            _arthxStakingPool.stakeLockedFor(
                msg.sender,
                arthxOut,
                lockDuration
            );
        else _arthxStakingPool.stakeFor(msg.sender, arthxOut);
    }

    function recollateralizeARTHAndStakeWithPermit(
        uint256 collateralAmount,
        uint256 ARTHXOutMin,
        uint256 lockDuration,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        ARTHX.permit(
            msg.sender,
            address(stakingPoolARTHX),
            uint256(int256(-1)),
            block.timestamp,
            v,
            r,
            s
        );

        uint256 arthxOut =
            _POOL.recollateralizeARTH(collateralAmount, ARTHXOutMin);

        if (lockDuration != 0)
            _arthxStakingPool.stakeLockedFor(
                msg.sender,
                arthxOut,
                lockDuration
            );
        else _arthxStakingPool.stakeFor(msg.sender, arthxOut);
    }
}
