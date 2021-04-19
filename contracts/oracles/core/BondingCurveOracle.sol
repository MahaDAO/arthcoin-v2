// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {Ownable} from '../../access/Ownable.sol';
import {SafeMath} from '../../utils/math/SafeMath.sol';
import {IUniswapPairOracle} from '../../interfaces/IUniswapPairOracle.sol';

contract BondingCurveOracle is Ownable {
    using SafeMath for uint256;

    IUniswapPairOracle public oracle;

    uint256 public initialPrice = 10000e6;

    constructor(IUniswapPairOracle oracle_) {
        oracle = oracle_;
    }

    function setOracle(IUniswapPairOracle oracle_) public onlyOwner {
        oracle = oracle_;
    }
}
