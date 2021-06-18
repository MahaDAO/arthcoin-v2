// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import '../Oracle.sol';

contract Oracle_MATIC is Oracle {
    constructor(
        address base,
        address quote,
        IUniswapPairOracle pairOracle,
        IChainlinkOracle oracle,
        IChainlinkOracle ethGMUOracle
    ) Oracle(base, quote, pairOracle, oracle, ethGMUOracle) {}
}
