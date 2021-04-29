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

    IUniswapPairOracle public pairOracle;

    /// @notice Price feed for base from chainlink.
    IChainlinkOracle public oracle;

    IChainlinkOracle public ethGMUOracle;

    address public base;
    address public quote;

    uint256 public oraclePriceFeedDecimals = 8;
    uint256 public ethGMUPriceFeedDecimals = 8;

    uint256 private immutable _TOKEN_MISSING_DECIMALS;
    uint256 private constant _PRICE_PRECISION = 1e6;

    constructor(
        address base_,
        address quote_,
        IUniswapPairOracle pairOracle_,
        IChainlinkOracle oracle_,
        IChainlinkOracle ethGMUOracle_
    ) {
        base = base_;
        quote = quote_;
        pairOracle = pairOracle_;
        ethGMUOracle = ethGMUOracle_;
        oracle = oracle_;

        ethGMUPriceFeedDecimals = ethGMUOracle.getDecimals();
        oraclePriceFeedDecimals = address(oracle) != address(0) ? oracle.getDecimals() : 0;

        _TOKEN_MISSING_DECIMALS = uint256(18).sub(IERC20(base).decimals());
    }

    function setOracle(IChainlinkOracle oracle_) public onlyOwner {
        oracle = oracle_;
        oraclePriceFeedDecimals = oracle.getDecimals();
    }

    function getETHGMUPrice() public view override returns (uint256) {
        return (
            uint256(ethGMUOracle.getLatestPrice())
                .mul(_PRICE_PRECISION)
                .div(uint256(10)**ethGMUPriceFeedDecimals)
        );
    }

    function getPairWETHPrice() public view override returns(uint256) {
        return pairOracle.consult(
            quote,
            _PRICE_PRECISION * (10**_TOKEN_MISSING_DECIMALS)
        );
    }

    function getPairPrice() public view override returns(uint256) {
        return (
            getETHGMUPrice()
                .mul(_PRICE_PRECISION)
                .div(getPairWETHPrice())
        );
    }

    function getChainlinkPrice() public view override returns(uint256) {
        return (
            uint256(oracle.getLatestPrice())
                .mul(_PRICE_PRECISION)
                .div(uint256(10)**oraclePriceFeedDecimals)
        );
    }

    function getPrice() public view override returns (uint256) {
        // If we have chainlink oracle for base set return that price.
        // NOTE: this chainlink is subject to Aggregator being in BASE/USD and USD/GMU(Simple oracle).
        if (address(oracle) != address(0)) return getChainlinkPrice();

        // Else return price from uni pair.
        return getPairPrice();
    }
}
