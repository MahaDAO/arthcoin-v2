// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import {Ownable} from '../access/Ownable.sol';
import {IERC20} from '../ERC20/IERC20.sol';
import {SafeMath} from '../utils/math/SafeMath.sol';
import {IUniswapPairOracle} from './IUniswapPairOracle.sol';
import {IChainlinkOracle} from './IChainlinkOracle.sol';
import {IOracle} from './IOracle.sol';

contract Oracle is Ownable, IOracle {
    using SafeMath for uint256;

    IUniswapPairOracle public uniswapOracle;
    IChainlinkOracle public chainlinkOracle;
    IOracle public GMUOracle;

    address public base;
    address public quote;

    uint256 public oraclePriceFeedDecimals = 8;
    uint256 public ethGMUPriceFeedDecimals = 8;

    uint256 private immutable _TOKEN_MISSING_DECIMALS;
    uint256 private constant _PRICE_PRECISION = 1e6;

    constructor(
        address base_,
        address quote_,
        IUniswapPairOracle uniswapOracle_,
        IChainlinkOracle chainlinkOracle_,
        IOracle GMUOracle_
    ) {
        base = base_;
        quote = quote_;
        GMUOracle = GMUOracle_;
        chainlinkOracle = chainlinkOracle_;
        uniswapOracle = uniswapOracle_;

        ethGMUPriceFeedDecimals = GMUOracle.getDecimalPercision();
        oraclePriceFeedDecimals = address(chainlinkOracle) != address(0)
            ? chainlinkOracle.getDecimals()
            : 0;

        _TOKEN_MISSING_DECIMALS = uint256(18).sub(IERC20(base).decimals());
    }

    function setChainlinkOracle(IChainlinkOracle oracle_) public onlyOwner {
        chainlinkOracle = oracle_;
        oraclePriceFeedDecimals = address(chainlinkOracle) != address(0)
            ? chainlinkOracle.getDecimals()
            : 0;
    }

    function getGMUPrice() public view returns (uint256) {
        return GMUOracle.getPrice();
    }

    function getPairPrice() public view returns (uint256) {
        return
            uniswapOracle.consult(
                quote,
                _PRICE_PRECISION * (10**_TOKEN_MISSING_DECIMALS)
            );
    }

    function getChainlinkPrice() public view returns (uint256) {
        return (
            uint256(chainlinkOracle.getLatestPrice()).mul(_PRICE_PRECISION).div(
                uint256(10)**oraclePriceFeedDecimals
            )
        );
    }

    function getPrice() public view override returns (uint256) {
        // If we have chainlink oracle for base set return that price.
        // NOTE: this chainlink is subject to Aggregator being in BASE/USD and USD/GMU(Simple oracle).
        if (address(chainlinkOracle) != address(0)) return getChainlinkPrice();

        // Else return price from uni pair.
        return getPairPrice();
    }

    function getDecimalPercision() public pure override returns (uint256) {
        return _PRICE_PRECISION;
    }
}
