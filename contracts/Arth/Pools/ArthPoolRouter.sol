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

    function mint1t1ARTHAndStake(uint256 collateralAmount, uint256 ARTH_out_min)
        public
    {
        collateral.transferFrom(msg.sender, address(this), collateralAmount);
        uint256 arthOut = pool.mint1t1ARTH(collateralAmount, ARTH_out_min);
        ARTH.approve(address(stakingPoolARTH), uint256(arthOut));
        stakingPoolARTH.stakeFor(msg.sender, arthOut);
    }

    function mint1t1ARTHAndStakeWithPermit(
        uint256 collateral_amount,
        uint256 ARTH_out_min,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        // todo
        // collateralToken.approveWithPermit(
        //     ...
        // );

        mint1t1ARTHAndStake(collateral_amount, ARTH_out_min);
    }

    // 0% collateral-backed
    function mintAlgorithmicARTHAndStake(
        uint256 arthxAmountD18,
        uint256 arthOutMin,
        uint256 stakeDuration
    ) external {
        ARTHX.transferFrom(msg.sender, address(this), arthxAmountD18);
        uint256 arthOut = pool.mintAlgorithmicARTH(arthxAmountD18, arthOutMin);
        ARTH.approve(address(stakingPoolARTH), uint256(arthOut));
        stakingPoolARTH.stakeFor(msg.sender, arthOut, stakeDuration);
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
        uint256 collateral_amount,
        uint256 arthx_amount,
        uint256 ARTH_out_min
    ) external {
        // TODO
    }

    function mintFractionalARTHAndStakeWithPermit(
        uint256 collateral_amount,
        uint256 arthx_amount,
        uint256 ARTH_out_min,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        // TODO
    }

    function recollateralizeARTHAndStake(
        uint256 collateral_amount,
        uint256 ARTHX_out_min
    ) external {
        // TODO
    }

    function recollateralizeARTHAndStakeWithPermit(
        uint256 collateral_amount,
        uint256 ARTHX_out_min,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        // TODO
    }
}
