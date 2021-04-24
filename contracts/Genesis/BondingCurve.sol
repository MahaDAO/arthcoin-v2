// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {Sigmoid} from '../Curves/Sigmoid.sol';
import {SafeMath} from '../utils/math/SafeMath.sol';

contract BondingCurve is Sigmoid {
    using SafeMath for uint256;

    uint256 private _PRICE_PRECISION = 1e6;

    constructor(
        uint256 softCap,
        uint256 hardCap,
        uint256 initialCurvePrice,
        uint256 finalCurvePrice,
        uint256[] memory slots // Should represent 0.6 * 1 / (1 + e^-5x).
    )
        Sigmoid(
            softCap,
            hardCap,
            initialCurvePrice,
            finalCurvePrice,
            true, // Increasing curve(Price increases with time/collateral)
            slots
        )
    {}

    function getPrice(uint256 percentCollateral) public view returns (uint256) {
        uint256 price = super.getY(percentCollateral);

        return price.mul(_PRICE_PRECISION).div(1e18);
    }
}
