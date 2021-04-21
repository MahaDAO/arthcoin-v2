// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {ICurve} from "./ICurve.sol";

interface IBondingCurveOracle is ICurve {
    function getPrice(uint256 percent) external view returns (uint256);
}
