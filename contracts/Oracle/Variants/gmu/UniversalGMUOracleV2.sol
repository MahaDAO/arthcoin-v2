// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import {IOracle} from '../../IOracle.sol';
import {IERC20} from '../../../ERC20/IERC20.sol';
import {Ownable} from '../../../access/Ownable.sol';
import {SafeMath} from '../../../utils/math/SafeMath.sol';
import {IUniswapPairOracle} from '../uniswap/IUniswapPairOracle.sol';
import {AggregatorV3Interface} from '../chainlink/AggregatorV3Interface.sol';

// An oracle that takes a raw chainlink or uniswap oracle and spits out the GMU price.
contract UniversalGMUOracle is Ownable, IOracle {
    using SafeMath for uint256;

    IOracle public GMUOracle;
    IUniswapPairOracle public uniswapOracle;
    AggregatorV3Interface public ethUSDChainlinkFeed;
    AggregatorV3Interface public baseUSDChainlinkFeed;

    address public base;   // E.g USDC, WBTC, USDT, etc.
    address public quote;  // Supposed to be WETH.

    uint256 public usdGMUOracleDecimals = 6;
    uint256 public ethUSDPriceFeedDecimals = 8;
    uint256 public baseUSDPriceFeedDecimals = 8;

    uint256 private constant _PRICE_PRECISION = 1e6;
    uint256 private immutable _TOKEN_MISSING_DECIMALS;

    constructor(
        address base_,
        address quote_,
        IUniswapPairOracle uniswapOracle_,
        AggregatorV3Interface baseUSDChainlinkFeed_,
        AggregatorV3Interface ethUSDChainlinkFeed_,
        IOracle GMUOracle_
    ) {
        base = base_;
        quote = quote_;

        GMUOracle = GMUOracle_;
        uniswapOracle = uniswapOracle_;
        ethUSDChainlinkFeed = ethUSDChainlinkFeed_;
        baseUSDChainlinkFeed = baseUSDChainlinkFeed_;

        usdGMUOracleDecimals = GMUOracle.getDecimalPercision();
        ethUSDPriceFeedDecimals = ethUSDChainlinkFeed.decimals();
        baseUSDPriceFeedDecimals = address(baseUSDChainlinkFeed) != address(0)
            ? baseUSDChainlinkFeed.decimals()
            : 0;

        _TOKEN_MISSING_DECIMALS = uint256(18).sub(IERC20(base).decimals());
    }

    function setBaseUSDChainlinkFeed(AggregatorV3Interface oracle_) public onlyOwner {
        baseUSDChainlinkFeed = oracle_;
        baseUSDPriceFeedDecimals = address(baseUSDChainlinkFeed) != address(0)
            ? baseUSDChainlinkFeed.decimals()
            : 0;
    }

    /// @notice Returns ETH/USD price from chainlink in 6 decimals precision.
    function getETHUSDPrice() public view returns (uint256) {
        (, int256 price, , , ) = baseUSDChainlinkFeed.latestRoundData();

        return (
            uint256(price)
                .mul(_PRICE_PRECISION)
                .div(ethUSDPriceFeedDecimals)
        );
    }

    /// @notice Returns USD/GMU price from simple oracle in 6 decimals precision.
    function getGMUPrice() public view returns (uint256) {
        return (
            GMUOracle.getPrice()
                .mul(_PRICE_PRECISION)
                .div(usdGMUOracleDecimals)
        );
    }

    /// @notice Returns ETH price from simple oracle in 6 decimals precision.
    /// @dev Gives price by formulating how much BASE asset if you put in _PRICE_PRECISION WETH.
    function getPairETHPrice() public view returns (uint256) {
        return
            uniswapOracle.consult(
                quote,
                _PRICE_PRECISION * (10**_TOKEN_MISSING_DECIMALS)
            );
    }

    /// @notice Returns BASE/USD price from uni pair in 6 decimals precision.
    function getPairPrice() public view returns (uint256) {
        return (
            getETHUSDPrice()
                .mul(_PRICE_PRECISION)
                .div(getPairETHPrice())
        );
    }

    /// @notice Returns BASE/USD price from chainlink in 6 decimals precision.
    function getChainlinkPrice() public view returns (uint256) {
        (, int256 price, , , ) = baseUSDChainlinkFeed.latestRoundData();

        return (
            uint256(price)
                .mul(_PRICE_PRECISION)
                .div(baseUSDPriceFeedDecimals)
        );
    }

    function getRawPrice() public view returns (uint256) {
        // If we have chainlink oracle for base set return that price.
        // NOTE: this chainlink is subject to Aggregator being in BASE/USD and USD/GMU(Simple oracle).
        if (address(baseUSDChainlinkFeed) != address(0)) return getChainlinkPrice();

        // Else return price from uni pair.
        return getPairPrice();
    }

    function getPrice() public view override returns (uint256) {
        uint256 price = getRawPrice();

        return (
            price
                .mul(getGMUPrice())
                .div(_PRICE_PRECISION)
        );
    }

    function getDecimalPercision() public pure override returns (uint256) {
        return _PRICE_PRECISION;
    }
}
