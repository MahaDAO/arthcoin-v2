pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import '../../Oracle/UniswapPairOracle.sol';
import '../../Oracle/ChainlinkETHUSDPriceConsumer.sol';

contract Fei {
    UniswapPairOracle private arthEthOracle;
    ChainlinkETHUSDPriceConsumer private eth_usd_pricer;

    address public arth_eth_oracle_address;
    address public weth_address;
    address public arth_address;
    address public uniswap_pair;

    uint256 private constant PRICE_PRECISION = 1e6;
    uint8 private eth_usd_pricer_decimals;
    uint256 public currentArthPrice;
    uint256 public price_target;

    struct TimeWeightInfo {
        uint32 blockNo;
        uint32 weight;
        uint32 growthRate;
        bool active;
    }

    TimeWeightInfo private timeWeightInfo;

    constructor(address _uniswap_pair, address _arth_address) public {
        uniswap_pair = _uniswap_pair;
        arth_address = _arth_address;
        price_target = 1000000;
    }

    // Sets the ARTH_ETH Uniswap oracle address
    function setARTHEthOracle(address _arth_oracle_addr, address _weth_address)
        public
    {
        arth_eth_oracle_address = _arth_oracle_addr;
        arthEthOracle = UniswapPairOracle(_arth_oracle_addr);
        weth_address = _weth_address;
    }

    function oracle_price() internal view returns (uint256) {
        // Get the ETH / USD price first, and cut it down to 1e6 precision
        uint256 eth_2_usd_price =
            uint256(eth_usd_pricer.getLatestPrice()).mul(PRICE_PRECISION).div(
                uint256(10)**eth_usd_pricer_decimals
            );
        uint256 price_vs_eth;

        price_vs_eth = _getUniswapPrice();

        return eth_2_usd_price.mul(PRICE_PRECISION).div(price_vs_eth);
    }

    function getReserves()
        public
        view
        override
        returns (uint256 ArthReserves, uint256 tokenReserves)
    {
        address token0 = uniswap_pair.token0();
        (uint256 reserve0, uint256 reserve1, ) = uniswap_pair.getReserves();
        (ArthReserves, tokenReserves) = address(arth_address) == token0
            ? (reserve0, reserve1)
            : (reserve1, reserve0);
        return (ArthReserves, tokenReserves);
    }

    function _getUniswapPrice() internal view returns (uint256 price) {
        (uint256 reserveArth, uint256 reserveOther) = getReserves();
        return uint256(reserveArth.div(reserveOther)).mul(PRICE_PRECISION);
    }

    function _getPriceDeviations() internal view returns (uint256) {
        uint256 currentPrice = oracle_price();

        if (currentPrice > price_target) {
            return 0;
        }

        uint256 deviation =
            (price_target).sub(currentPrice).mul(PRICE_PRECISION).div(
                price_target
            );

        return deviation;
    }

    function getTimeWeight() public view override returns (uint32) {
        TimeWeightInfo memory tw = timeWeightInfo;
        if (!tw.active) {
            return 0;
        }

        uint32 blockDelta = block.number.toUint32().sub(tw.blockNo);
        return tw.weight.add(blockDelta * tw.growthRate);
    }

    function setTimeWeightGrowth(uint32 growthRate)
        external
        override
        // Access control
    {
        TimeWeightInfo memory tw = timeWeightInfo;
        timeWeightInfo = TimeWeightInfo(
            tw.blockNo,
            tw.weight,
            growthRate,
            tw.active
        );
        //emit GrowthRateUpdate(growthRate);
    }

    function getBuyIncentive(uint256 amount)
        public
        view
        override
        returns (
            uint256 incentive,
            uint32 weight,
            uint256 _initialDeviation,
            uint256 _finalDeviation
        )
    {
        int256 signedAmount = amount.toInt256();
        // A buy withdraws FEI from uni so use negative amountIn
        (
            initialDeviation,
            finalDeviation,
            peg,
            uint256 reserveFei,
            uint256 reserveOther
        ) = _getPriceDeviations(-1 * signedAmount);
        weight = getTimeWeight();

        // buy started above peg
        if (initialDeviation.equals(Decimal.zero())) {
            return (0, weight, initialDeviation, finalDeviation);
        }

        uint256 incentivizedAmount = amount;
        // if buy ends above peg, only incentivize amount to peg
        if (finalDeviation.equals(Decimal.zero())) {
            incentivizedAmount = _getAmountToPegFei(
                reserveFei,
                reserveOther,
                peg
            );
        }

        Decimal.D256 memory multiplier =
            _calculateBuyIncentiveMultiplier(
                initialDeviation,
                finalDeviation,
                weight
            );
        incentive = multiplier.mul(incentivizedAmount).asUint256();
        return (incentive, weight, initialDeviation, finalDeviation);
    }

    function _checkAndApplyIncentives(
        address sender,
        address recipient,
        uint256 amount
    ) internal {
        // incentive on sender
        address senderIncentive = incentiveContract[sender];
        if (senderIncentive != address(0)) {
            IIncentive(senderIncentive).incentivize(
                sender,
                recipient,
                msg.sender,
                amount
            );
        }

        // incentive on recipient
        address recipientIncentive = incentiveContract[recipient];
        if (recipientIncentive != address(0)) {
            IIncentive(recipientIncentive).incentivize(
                sender,
                recipient,
                msg.sender,
                amount
            );
        }

        // incentive on operator
        address operatorIncentive = incentiveContract[msg.sender];
        if (
            msg.sender != sender &&
            msg.sender != recipient &&
            operatorIncentive != address(0)
        ) {
            IIncentive(operatorIncentive).incentivize(
                sender,
                recipient,
                msg.sender,
                amount
            );
        }

        // all incentive, if active applies to every transfer
        address allIncentive = incentiveContract[address(0)];
        if (allIncentive != address(0)) {
            IIncentive(allIncentive).incentivize(
                sender,
                recipient,
                msg.sender,
                amount
            );
        }
    }
}
