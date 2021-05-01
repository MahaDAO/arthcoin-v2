// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import '../Oracle.sol';

contract Oracle_USDC is Oracle {
    constructor(
        address base_,
        address quote_,
        IUniswapPairOracle pairOracle_,
        IChainlinkOracle oracle_,
        IChainlinkOracle ethGMUOracle_
    ) Oracle(base, quote, pairOracle_, oracle_, ethGMUOracle_) {}
}
