// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import {SafeMath} from '../../../utils/math/SafeMath.sol';
import {IOracle} from '../../IOracle.sol';
import {IChainlinkOracle} from './IChainlinkOracle.sol';
import {AggregatorV3Interface} from './AggregatorV3Interface.sol';

contract ChainlinkPriceConsumer is IChainlinkOracle {
    using SafeMath for uint256;

    AggregatorV3Interface public priceFeed;
    uint256 public priceFeedDecimals = 8;

    constructor(address priceFeed_) {
        priceFeed = AggregatorV3Interface(priceFeed_);
        priceFeedDecimals = priceFeed.decimals();
    }

    function getLatestPrice() public view override returns (uint256) {
        (, int256 price, , , ) = priceFeed.latestRoundData();
        return uint256(price);
    }

    function getDecimals() public view override returns (uint8) {
        return priceFeed.decimals();
    }
}
