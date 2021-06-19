// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import '../Oracle.sol';

contract Oracle_WMATIC is Oracle {
    constructor(
        address base,
        address quote,
        IUniswapPairOracle pairOracle,
        IChainlinkOracle chainlinkOracle,
        IOracle gmuOracle
    ) Oracle(base, quote, pairOracle, chainlinkOracle, gmuOracle) {}
}
