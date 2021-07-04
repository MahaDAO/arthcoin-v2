// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {IUniswapPairOracle} from './IUniswapPairOracle.sol';

contract OracleUpdater {
    IUniswapPairOracle[] public oracles;

    event OracleUpdated(address indexed oracle);

    constructor(IUniswapPairOracle[] memory _oracles) {
        oracles = _oracles;
    }

    function update() external {
        for (uint256 index = 0; index < oracles.length; index++) {
            IUniswapPairOracle oracle = oracles[index];
            if (oracle.canUpdate()) {
                oracle.update();
                emit OracleUpdated(address(oracle));
            }
        }
    }
}
