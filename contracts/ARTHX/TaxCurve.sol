// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {ITaxCurve} from "../Curves/ITaxCurve.sol";
import {SafeMath} from "../utils/math/SafeMath.sol";


contract TaxCurve is ITaxCurve {
    using SafeMath for uint256;

    uint256 public constant duration = 30 days;

    uint256 public immutable startTime;
    uint256 public immutable taxPercentPerSecond; // In 18 precision.

    uint256 public constant endTimeTaxPercent = 15e4;  // In 6 precision.
    uint256 public constant startTimeTaxPercent = 5e4;  // In 6 precision.

    constructor() {
        startTime = block.timestamp;

        // Tax % kept in 1e18 precision.
        taxPercentPerSecond = (
            endTimeTaxPercent
            .sub(startTimeTaxPercent)
            .mul(1e18)
            .div(duration)
        );
    }

    function getIsDurationPassed() public view returns (bool) {
        return block.timestamp > startTime.add(duration);
    }

    function getTimePassed() public view returns (uint256) {
        return block.timestamp.sub(startTime);
    }

    function getTaxPercentForDuration() public view returns (uint256) {
        uint256 currentTaxPercent = taxPercentPerSecond.mul(getTimePassed()).div(1e18);
        // Fail safe.
        return (
            currentTaxPercent > endTimeTaxPercent
                ? endTimeTaxPercent
                : currentTaxPercent
        );
    }

    function getTaxPercent() external view override returns (uint256) {
        if (getIsDurationPassed()) return endTimeTaxPercent;

        return endTimeTaxPercent.sub(getTaxPercentForDuration());
    }
}
