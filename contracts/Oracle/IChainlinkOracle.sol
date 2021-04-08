// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import './ISimpleOracle.sol';
import '../Math/SafeMath.sol';
import './AggregatorV3Interface.sol';

interface IChainlinkOracle {
    function getDecimals() external view returns (uint8);

    function getGmuPrice() external view returns (uint256);

    function getLatestPrice() external view returns (uint256);

    function getLatestUSDPrice() external view returns (uint256);
}
