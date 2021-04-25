// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {IncreasingSigmoid} from '../Curves/IncreasingSigmoid.sol';
import {SafeMath} from '../utils/math/SafeMath.sol';
import {IBondingCurveOracle} from './IBondingCurveOracle.sol';

contract BondingCurve is IncreasingSigmoid, IBondingCurveOracle{
    using SafeMath for uint256;

    constructor(
        uint256 softCap,
        uint256 hardCap,
        uint256 initialCurvePrice,
        uint256 finalCurvePrice,
        uint256[] memory slots // Should represent 0.6 * 1 / (1 + e^-5x).
    )
        IncreasingSigmoid(
            softCap,
            hardCap,
            initialCurvePrice,
            finalCurvePrice,
            slots
        )
    {}

    function getPrice(uint256 percentCollateral)
        public
        view
        override
        returns (uint256)
    {
        return super.getY(percentCollateral);
    }
}
