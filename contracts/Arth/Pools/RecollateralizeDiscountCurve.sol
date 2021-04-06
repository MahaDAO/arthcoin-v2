// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import '../../ERC20/ERC20.sol';
import '../../Math/SafeMath.sol';
import '../../Common/Ownable.sol';
import '../../Arth/ArthController.sol';

/**
 * @title RecollateralizeDiscountCruve.
 * @author MahaDAO.
 */
contract RecollateralizeDiscountCurve is Ownable {
    using SafeMath for uint256;

    ERC20 private _arth;
    ArthController private _arthController;

    /// @notice Bonus rate on ARTHX minted when recollateralizing.
    /// @dev    6 decimals of precision, is set to 0.75% on genesis.
    uint256 public bonusRate = 7500;

    constructor(ERC20 arth, ArthController arthController) {
        _arth = arth;
        _arthController = arthController;
    }

    function setBonusRate(uint256 rate) public onlyOwner {
        require(
            bonusRate <= 1e6,
            'RecollateralizeDiscountCurve: bonusRate > MAX(precision)'
        );

        bonusRate = rate;
    }

    function getTargetCollateralValue() public view returns (uint256) {
        return
            _arth
                .totalSupply()
                .mul(_arthController.globalCollateralRatio())
                .div(1e6);
    }

    function getCurveExponent() public view returns (uint256) {
        uint256 targetCollatValue = getTargetCollateralValue();
        uint256 currentCollatValue = _arthController.globalCollateralValue();

        if (targetCollatValue <= currentCollatValue) return 0;

        return
            targetCollatValue
                .sub(currentCollatValue)
                .mul(1e6)
                .div(targetCollatValue)
                .div(1e6);
    }

    function getCurvedDiscount() public view returns (uint256) {
        uint256 exponent = getCurveExponent();
        if (exponent == 0) return 0;

        uint256 discount = (10**exponent).sub(1).div(10).mul(bonusRate);

        // Fail safe cap to bonus_rate.
        return discount > bonusRate ? bonusRate : discount;
    }
}
