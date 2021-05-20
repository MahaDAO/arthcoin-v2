// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface ITaxCurve {
    function getTax() external view returns (uint256);
}
