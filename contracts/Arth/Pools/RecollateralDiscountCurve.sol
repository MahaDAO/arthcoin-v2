// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

contract RecollateralDiscountCurve {
    function getY(uint256 percent) public pure returns (uint256) {
        if (percent <= 0) return 33 ether;
        else if (percent > 0 && percent <= 10) return 30 ether;
        else if (percent > 10 && percent <= 20) return 27 ether;
        else if (percent > 20 && percent <= 30) return 24 ether;
        else if (percent > 30 && percent <= 40) return 21 ether;
        else if (percent > 40 && percent <= 50) return 18 ether;
        else if (percent > 50 && percent <= 60) return 15 ether;
        else if (percent > 60 && percent <= 70) return 12 ether;
        else if (percent > 70 && percent <= 80) return 9 ether;
        else if (percent > 80 && percent <= 90) return 6 ether;
        else if (percent > 90 && percent <= 100) return 3;
        else return 0;
    }
}
