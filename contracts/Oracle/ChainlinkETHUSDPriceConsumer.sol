// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import './ISimpleOracle.sol';
import '../Math/SafeMath.sol';
import './AggregatorV3Interface.sol';

contract ChainlinkETHUSDPriceConsumer {
    using SafeMath for uint256;

    /**
     * State variables.
     */

    ISimpleOracle public gmuOracle;
    AggregatorV3Interface internal priceFeed;

    uint256 public priceFeedDecimals = 8;

    constructor(ISimpleOracle gmuOracle_) {
        priceFeed = AggregatorV3Interface(
            0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419
        );

        gmuOracle = gmuOracle_;
        priceFeedDecimals = priceFeed.decimals();
    }

    /**
     * Returns the latest price
     */

    function getGmuPrice() public view returns (uint256) {
        // Considering that gmuOracle uses 1e18 as precision.

        uint256 decimalsDiff = uint256(18).sub(priceFeedDecimals);

        return gmuOracle.getPrice().div(10**decimalsDiff);
    }

    function getLatestUSDPrice() public view returns (uint256) {
        (, int256 price, , , ) = priceFeed.latestRoundData();

        return uint256(price);
    }

    function getLatestPrice() public view returns (uint256) {
        return getLatestUSDPrice().mul(getGmuPrice()).div(priceFeedDecimals);
    }

    function getDecimals() public view returns (uint8) {
        return priceFeed.decimals();
    }
}
