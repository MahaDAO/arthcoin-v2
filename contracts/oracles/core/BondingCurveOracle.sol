// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {Sigmoid} from '../../curves/core/Sigmoid.sol';
import {IBondingCurveOracle} from '../../interfaces/IBondingCurveOracle.sol';

contract BondingCurveOracle is Sigmoid, IBondingCurveOracle {
    constructor(
        uint256 softCap, // 0% genesis collateral.
        uint256 hardCap, // 100% genesis collateral.
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

    function getPrice(uint256 percentCollateral)
        public
        view
        override
        returns (uint256)
    {
        return super.getY(percentCollateral);
    }
}
