// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import './UniversalGMUOracleV2.sol';

contract Oracle_WMATIC is UniversalGMUOracleV2 {
    constructor(
        address base,
        address quote,
        IUniswapPairOracle pairOracle,
        AggregatorV3Interface chainlinkOracle,
        AggregatorV3Interface ethUSDChainlinkFeed,
        IOracle gmuOracle
    ) UniversalGMUOracleV2(base, quote, pairOracle, chainlinkOracle, ethUSDChainlinkFeed, gmuOracle) {}
}
