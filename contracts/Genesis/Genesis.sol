// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {IARTHController} from '../Arth/IARTHController.sol';
import {IARTHX} from '../ARTHX/IARTHX.sol';
import {IARTH} from '../ARTH/IARTH.sol';
import {AccessControl} from '../access/AccessControl.sol';
import {SafeMath} from '../utils/math/SafeMath.sol';

contract Genesis {
    using SafeMath for uint256;

    IARTHController public _arthController;
    IARTHX public _ARTHX;
    IARTH public _ARTH;
    uint256 private constant _PRICE_PRECISION = 1e6;
    address private _arthContractAddress;

    event RedeemAlgorithmicARTH(uint256 arthAmount, uint256 arthxOutMin);

    constructor (
        address __arthContractAddress,
        address __arthxContractAddress,
        address __arthController
    ) {
        _arthController = IARTHController(__arthController);
        _ARTHX = IARTHX(__arthxContractAddress);
        _ARTH = IARTH(__arthContractAddress);
    }

    // Redeem ARTH for ARTHX. 0% collateral-backed
    function redeemAlgorithmicARTH(uint256 arthAmount, uint256 arthxOutMin)
        external
    {
        require(_arthController.getIsGenesisActive(), 'Genesis 36: Genessis inactive');
        require(_ARTH.balanceOf(msg.sender) >= arthAmount, 'Genesis 37: Insufficient arth amount');

        uint256 arthxPrice = _arthController.getARTHXPrice();
        uint256 arthxGMUValueD18 = arthAmount;

        arthxGMUValueD18 = (
            arthxGMUValueD18.mul(
                uint256(1e6).sub(_arthController.getRedemptionFee())
            )
        )
            .div(_PRICE_PRECISION); // applied fees

        uint256 arthxAmount =
            arthxGMUValueD18.mul(_PRICE_PRECISION).div(arthxPrice);

        require(arthxOutMin <= arthxAmount, 'Slippage limit reached');

        _ARTH.poolBurnFrom(msg.sender, arthAmount);
        _ARTHX.poolMint(msg.sender, arthxAmount);

        emit RedeemAlgorithmicARTH(arthAmount, arthxAmount);
    }

    function getCollateralGMUBalance()
        external
        pure
        returns (uint256)
    {
        return 0;
    }
}
