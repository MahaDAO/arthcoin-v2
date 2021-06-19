// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import '../../IOracle.sol';
import './ChainlinkETHUSDPriceConsumer.sol';

contract USDT_GMU_Chainlink_Oracle is ChainlinkETHUSDPriceConsumer {
    constructor(address priceFeed, IOracle gmuOracle)
        ChainlinkETHUSDPriceConsumer(priceFeed, gmuOracle)
    {}
}
