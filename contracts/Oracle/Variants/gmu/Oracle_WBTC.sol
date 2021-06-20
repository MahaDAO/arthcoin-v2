// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import './UniversalGMUOracleV2.sol';

contract Oracle_WBTC is UniversalGMUOracleV2 {
    constructor(
        address base,
        address quote,
        IUniswapPairOracle pairOracle,
        AggregatorV3Interface oracle,
        AggregatorV3Interface ethUSDChainlinkFeed,
        IOracle gmuOracle
    ) UniversalGMUOracleV2(base, quote, pairOracle, oracle, ethUSDChainlinkFeed, gmuOracle) {}
}
