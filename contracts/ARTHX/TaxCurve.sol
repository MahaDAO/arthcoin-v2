// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {ITaxCurve} from "../Curves/ITaxCurve.sol";
import {SafeMath} from "../utils/math/SafeMath.sol";


contract TaxCurve is ITaxCurve {
    using SafeMath for uint256;

    uint256 public constant DURATION = 30 days;

    uint256 public immutable START_TIME;
    uint256 public immutable PERCENT_TAX_PER_SEC; // In 18 precision.

    uint256 public constant END_TIME_TAX_PERCENT = 5e4;  // In 6 precision.
    uint256 public constant START_TIME_TAX_PERCENT = 15e4;  // In 6 precision.

    constructor() {
        START_TIME = block.timestamp;

        PERCENT_TAX_PER_SEC = (
            START_TIME_TAX_PERCENT
            .sub(END_TIME_TAX_PERCENT)
            .mul(1e18)
            .div(DURATION.add(1))  // Slightly underestimate tx tax per second.
        );
    }

    function getIsDurationPassed() public view returns (bool) {
        return block.timestamp > START_TIME.add(DURATION);
    }

    function getTimePassed() public view returns (uint256) {
        return block.timestamp.sub(START_TIME);
    }

    function getTaxPercentForDuration() public view returns (uint256) {
        uint256 currentTaxPercent = (
            PERCENT_TAX_PER_SEC
                .mul(getTimePassed())
                .div(1e18)
        );

        // Fail safe cap.
        return (
            currentTaxPercent > START_TIME_TAX_PERCENT
                ? START_TIME_TAX_PERCENT
                : currentTaxPercent
        );
    }

    function getTaxPercent() external view override returns (uint256) {
        if (getIsDurationPassed()) return END_TIME_TAX_PERCENT;

        return START_TIME_TAX_PERCENT.sub(getTaxPercentForDuration());
    }
}
