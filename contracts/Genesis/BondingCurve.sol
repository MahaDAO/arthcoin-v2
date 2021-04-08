// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import {Ownable} from '../Common/Ownable.sol';
import {SafeMath} from '../Math/SafeMath.sol';
import {IBondingCurve} from './IBondingCurve.sol';

contract BondingCurve is IBondingCurve, Ownable {
    using SafeMath for uint256;

    /**
     * State variable.
     */

    uint256 public override fixedPrice;

    uint256 public variableA = 5;
    uint256 public variableB = 8500; // 0.85 with 1e6 precision.
    uint256 public startPrice = 5e5; // 0.5 with 1e6 precision

    uint256 private constant _PRICE_PRECISION = 1e6;

    constructor(uint256 _fixedPrice) {
        fixedPrice = _fixedPrice;
    }

    /**
     * External.
     */

    function setA(uint256 val) external override onlyOwner {
        variableA = val;
    }

    function setB(uint256 val) external override onlyOwner {
        variableB = val;
    }

    function setStartPrice(uint256 price) external override onlyOwner {
        startPrice = price;
    }

    function setFixedPrice(uint256 price) external override onlyOwner {
        fixedPrice = price;
    }

    /**
     * Public.
     */

    function getCurvePrice(uint256 percentRaised)
        public
        view
        override
        returns (uint256)
    {
        uint256 exponentTerm = (variableA**percentRaised).sub(1); // (B$14^A2 - 1).
        uint256 curvedTerm = exponentTerm.div(variableA).mul(variableB); // (B$14^A2 - 1) / B$14 * B$15.

        return startPrice.add(curvedTerm);
    }
}
