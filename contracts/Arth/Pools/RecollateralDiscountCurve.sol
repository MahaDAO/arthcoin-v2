// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

contract RecollateralDiscountCurve {
    function getY(uint256 percent) public pure returns (uint256) {
        if (percent <= 0 ether) return 33 ether;
        else if (percent > 0 ether && percent <= 10 ether) return 30 ether;
        else if (percent > 10 ether && percent <= 20 ether) return 27 ether;
        else if (percent > 20 ether && percent <= 30 ether) return 24 ether;
        else if (percent > 30 ether && percent <= 40 ether) return 21 ether;
        else if (percent > 40 ether && percent <= 50 ether) return 18 ether;
        else if (percent > 50 ether && percent <= 60 ether) return 15 ether;
        else if (percent > 60 ether && percent <= 70 ether) return 12 ether;
        else if (percent > 70 ether && percent <= 80 ether) return 9 ether;
        else if (percent > 80 ether && percent <= 90 ether) return 6 ether;
        else if (percent > 90 ether && percent <= 100 ether) return 3;
        else return 0;
    }
}
