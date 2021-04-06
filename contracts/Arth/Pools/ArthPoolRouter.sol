// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import '../../Arth/Arth.sol';
import './IArthPool.sol';
import '../../Arth/ArthController.sol';
import '../../ARTHX/ARTHX.sol';
import '../../ERC20/ERC20.sol';
import './ArthPoolLibrary.sol';
import '../../Math/SafeMath.sol';
import '../../Oracle/ISimpleOracle.sol';
import '../../Oracle/UniswapPairOracle.sol';
import '../../Governance/AccessControl.sol';
import '../../Staking/IMintAndCallFallBack.sol';

/**
 *  Original code written by:
 *  - Travis Moore, Jason Huan, Same Kazemian, Sam Sun.
 *  Code modified by:
 *  - Steven Enamakel, Yash Agrawal & Sagar Behara.
 */
contract ArthPoolRouter {
    using SafeMath for uint256;

    IArthPool public pool;
    ARTHShares private ARTHX;
    ARTHStablecoin private ARTH;

    constructor(
        IArthPool _pool,
        ARTHShares _ARTHX,
        ARTHStablecoin _ARTH
    ) {
        pool = _pool;
        ARTH = _ARTH;
        ARTHX = _ARTHX;
    }

    function mint1t1ARTH(uint256 collateral_amount, uint256 ARTH_out_min)
        external
    {
        // do necessary approve nd etc...
        pool.mint1t1ARTH(collateral_amount, ARTH_out_min);
    }

    function mint1t1ARTHAndCall(
        uint256 collateral_amount,
        uint256 ARTH_out_min,
        IMintAndCallFallBack _spender,
        bytes memory _extraData,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        uint256 amountMinted =
            pool.mint1t1ARTH(collateral_amount, ARTH_out_min);

        // todo: there should be a better way to write this
        ARTH.permit(
            msg.sender,
            address(_spender),
            uint256(int256(-1)), //amountMinted,
            block.timestamp,
            v,
            r,
            s
        );

        _spender.receiveMint(msg.sender, amountMinted, _extraData);
    }

    // 0% collateral-backed
    function mintAlgorithmicARTH(uint256 arthx_amount_d18, uint256 ARTH_out_min)
        external
    {
        pool.mintAlgorithmicARTH(arthx_amount_d18, ARTH_out_min);
    }

    // 0% collateral-backed
    function mintAlgorithmicARTHAndCall(
        uint256 arthx_amount_d18,
        uint256 ARTH_out_min,
        IMintAndCallFallBack _spender,
        bytes memory _extraData,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        uint256 amountMinted =
            pool.mintAlgorithmicARTH(arthx_amount_d18, ARTH_out_min);

        ARTH.permit(
            msg.sender,
            address(_spender),
            uint256(int256(-1)),
            block.timestamp,
            v,
            r,
            s
        );

        _spender.receiveMint(msg.sender, amountMinted, _extraData);
    }

    // Will fail if fully collateralized or fully algorithmic
    // > 0% and < 100% collateral-backed
    function mintFractionalARTH(
        uint256 collateral_amount,
        uint256 arthx_amount,
        uint256 ARTH_out_min
    ) external {
        pool.mintFractionalARTH(collateral_amount, arthx_amount, ARTH_out_min);
    }

    function mintFractionalARTHAndCall(
        uint256 collateral_amount,
        uint256 arthx_amount,
        uint256 ARTH_out_min,
        IMintAndCallFallBack _spender,
        bytes memory _extraData,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        uint256 amountMinted =
            pool.mintFractionalARTH(
                collateral_amount,
                arthx_amount,
                ARTH_out_min
            );

        ARTH.permit(
            msg.sender,
            address(_spender),
            uint256(int256(-1)),
            block.timestamp,
            v,
            r,
            s
        );

        _spender.receiveMint(msg.sender, amountMinted, _extraData);
    }

    function recollateralizeARTH(
        uint256 collateral_amount,
        uint256 ARTHX_out_min
    ) external {
        pool.recollateralizeARTH(collateral_amount, ARTHX_out_min);
    }

    function recollateralizeARTHAndCall(
        uint256 collateral_amount,
        uint256 ARTHX_out_min,
        IMintAndCallFallBack _spender,
        bytes memory _extraData,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        uint256 amountMinted =
            pool.recollateralizeARTH(collateral_amount, ARTHX_out_min);

        ARTHX.permit(
            msg.sender,
            address(_spender),
            uint256(int256(-1)),
            block.timestamp,
            v,
            r,
            s
        );

        _spender.receiveMint(msg.sender, amountMinted, _extraData);
    }
}
