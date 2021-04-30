// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

contract MockRecollateralizeCurve {
    uint256 public y = 0;

    function setY(uint256 val) public {
        y = val;
    }

    function getY(uint256 _percent) public view returns (uint256) {
        return y;
    }
}
