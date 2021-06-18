// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import '../ISimpleOracle.sol';
import '../ChainlinkETHUSDPriceConsumer.sol';

contract WBTC_GMU_Chainlink_Oracle is ChainlinkETHUSDPriceConsumer {
    constructor(
        address priceFeed,
        ISimpleOracle gmuOracle
    ) ChainlinkETHUSDPriceConsumer(priceFeed, gmuOracle) { }
}
