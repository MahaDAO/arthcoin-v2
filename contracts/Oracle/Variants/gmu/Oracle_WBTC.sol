// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import './UniversalGMUOracle.sol';

contract Oracle_WBTC is UniversalGMUOracle {
    constructor(
        address base,
        address quote,
        IUniswapPairOracle pairOracle,
        IChainlinkOracle oracle,
        IOracle gmuOracle
    ) UniversalGMUOracle(base, quote, pairOracle, oracle, gmuOracle) {}
}
