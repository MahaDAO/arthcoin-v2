// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {IBondingCurve} from '../Curves/IBondingCurve.sol';

contract BondingCurve is IBondingCurve {
    uint256 public fixedPrice = 1300e6;

    constructor(uint256 price) {
        fixedPrice = price;
    }

    function getFixedPrice() external view override returns(uint256) {
        return fixedPrice;
    }

    function getY(uint256 percent) external pure override returns (uint256) {
        if (percent <= 0) return 1000e6; // 1k
        else if (percent > 0 && percent <= 10e16) return 2000e6; // 2k
        else if (percent > 10e16 && percent <= 20e16) return 3000e6; // 3k
        else if (percent > 20e16 && percent <= 30e16) return 4000e6; // 4k
        else if (percent > 30e16 && percent <= 40e16) return 5000e6; // 5k.
        else if (percent > 40e16 && percent <= 50e16) return 6000e6; // 6k
        else if (percent > 50e16 && percent <= 60e16) return 7000e6; // 7k
        else if (percent > 60e16 && percent <= 70e16) return 8000e6; // 8k
        else if (percent > 70e16 && percent <= 80e16) return 9000e6; // 9k
        else if (percent > 80e16 && percent <= 90e16) return 10000e6; // 10k
        else if (percent > 90e16 && percent <= 100e16) return 11000e6; // 11k
        else return 1200e6; // 12k
    }
}
