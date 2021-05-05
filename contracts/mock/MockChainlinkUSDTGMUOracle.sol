// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import '../Oracle/ISimpleOracle.sol';
import '../Oracle/ChainlinkETHUSDPriceConsumer.sol';

contract MockChainlinkUSDTGMUOracle is ChainlinkETHUSDPriceConsumer {
    constructor(
        address priceFeed,
        ISimpleOracle gmuOracle
    ) ChainlinkETHUSDPriceConsumer(priceFeed, gmuOracle) { }
}
