// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

interface IBondingCurve {
    function setA(uint256 val) external;

    function setB(uint256 val) external;

    function setStartPrice(uint256 price) external;

    function setFixedPrice(uint256 price) external;

    function getCurvePrice(uint256 percentRaised)
        external
        view
        returns (uint256);

    function fixedPrice() external view returns (uint256);
}
