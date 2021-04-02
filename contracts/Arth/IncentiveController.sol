// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import '../Math//Math.sol';
import '../Math/SafeMath.sol';
import '../Governance/AccessControl.sol';
import '../Oracle/UniswapPairOracle.sol';
import {ARTHStablecoin} from './Arth.sol';
import '../Uniswap/Interfaces/IUniswapV2Pair.sol';
import '../Oracle/ChainlinkETHUSDPriceConsumer.sol';

contract IncentiveController is AccessControl {
    using SafeMath for uint256;

    /**
     * Data structures.
     */

    struct TimeWeightInfo {
        uint32 blockNo;
        uint32 weight;
        uint32 growthRate;
        bool active;
    }

    TimeWeightInfo private timeWeightInfo;
    UniswapPairOracle public arthETHOracle;
    ChainlinkETHUSDPriceConsumer public ethGMUPricer;

    /**
     * State varaibles.
     */

    address public arthAddr;
    address public uniswapPairAddr;

    uint8 private ethGMUPricerDecimals;
    uint256 public targetPrice = 1000000; // i.e 1e6.
    uint256 private constant PRICE_PRECISION = 1e6;
    /// @notice the granularity of the time weight and growth rate
    uint32 public constant TIME_WEIGHT_GRANULARITY = 100_000;

    mapping(address => bool) private _exempt;

    modifier onlyAdmin() {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            'Controller: FORBIDDEN'
        );
        _;
    }

    constructor(
        address arthETHOracle_,
        address ethGMUPricer_,
        address arthAddr_,
        address uniswapPairAddr_
    ) {
        arthAddr = arthAddr_;
        uniswapPairAddr = uniswapPairAddr_;

        arthETHOracle = UniswapPairOracle(arthETHOracle_);
        ethGMUPricer = ChainlinkETHUSDPriceConsumer(ethGMUPricer_);

        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        ethGMUPricerDecimals = ethGMUPricer.getDecimals();
    }

    function getReserves() public view returns (uint256, uint256) {
        address token0 = IUniswapV2Pair(uniswapPairAddr).token0();
        (uint256 reserve0, uint256 reserve1, ) =
            IUniswapV2Pair(uniswapPairAddr).getReserves();

        (uint256 arthReserves, uint256 tokenReserves) =
            arthAddr == token0 ? (reserve0, reserve1) : (reserve1, reserve0);

        return (arthReserves, tokenReserves);
    }

    function _getUniswapPrice() internal view returns (uint256) {
        (uint256 reserveARTH, uint256 reserveOther) = getReserves();

        return reserveARTH.mul(PRICE_PRECISION).div(reserveOther);
    }

    function getCurrentArthPrice() internal view returns (uint256) {
        // Get the ETH/GMU price first, and cut it down to 1e6 precision.
        uint256 ethToGMUPrice =
            uint256(ethGMUPricer.getLatestPrice()).mul(PRICE_PRECISION).div(
                uint256(10)**ethGMUPricerDecimals
            );

        uint256 arthEthPrice = _getUniswapPrice();

        return ethToGMUPrice.mul(arthEthPrice).div(PRICE_PRECISION);
    }

    function isExemptAddress(address account) public view returns (bool) {
        return _exempt[account];
    }

    function updateOracle() public {
        try arthETHOracle.update() {} catch {}
    }

    function _isPair(address account) internal view returns (bool) {
        return address(uniswapPairAddr) == account;
    }

    function getGrowthRate() public view returns (uint32) {
        return timeWeightInfo.growthRate;
    }

    function isTimeWeightActive() public view returns (bool) {
        return timeWeightInfo.active;
    }

    function getTimeWeight() public view returns (uint32) {
        TimeWeightInfo memory tw = timeWeightInfo;
        if (!tw.active) return 0;

        uint32 blockDelta = uint32(uint256(block.number).sub(tw.blockNo));
        return uint32(uint256(tw.weight).add(blockDelta * tw.growthRate));
    }

    function _setTimeWeight(
        uint32 weight,
        uint32 growthRate,
        bool active
    ) internal {
        uint32 blockNo = uint32(block.number);

        timeWeightInfo = TimeWeightInfo(blockNo, weight, growthRate, active);
    }

    function setTimeWeightGrowth(uint32 growthRate) public onlyAdmin {
        TimeWeightInfo memory tw = timeWeightInfo;

        timeWeightInfo = TimeWeightInfo(
            tw.blockNo,
            tw.weight,
            growthRate,
            tw.active
        );
    }

    function setExemptAddress(address account, bool isExempt) public onlyAdmin {
        _exempt[account] = isExempt;
    }

    function getSellPenalty(uint256 amount)
        public
        view
        returns (
            uint256,
            uint256,
            uint256
        )
    {
        (uint256 initialDeviation, uint256 finalDeviation) =
            _getPriceDeviations(amount);
        (uint256 reserveARTH, uint256 reserveOther) = getReserves();

        // If trafe ends above peg, it was always above peg and no penalty needed.
        if (finalDeviation == 0) {
            return (0, initialDeviation, finalDeviation);
        }

        uint256 incentivizedAmount = amount;
        // if trade started above but ended below, only penalize amount going below peg
        if (initialDeviation == 0) {
            uint256 amountToPeg =
                _getAmountToPegARTH(reserveARTH, reserveOther);

            incentivizedAmount = amount.sub(
                amountToPeg,
                'UniswapIncentive: Underflow'
            );
        }

        uint256 multiplier =
            _calculateIntegratedSellPenaltyMultiplier(
                initialDeviation,
                finalDeviation
            );

        uint256 penalty = multiplier.mul(incentivizedAmount);

        return (penalty, initialDeviation, finalDeviation);
    }

    function _incentivizeSell(address target, uint256 amount)
        internal
    // ifBurnerSelf
    {
        if (isExemptAddress(target)) {
            return;
        }

        uint32 weight = getTimeWeight();
        (uint256 penalty, uint256 initialDeviation, uint256 finalDeviation) =
            getSellPenalty(amount);

        _updateTimeWeight(weight, finalDeviation, initialDeviation);

        if (penalty != 0) {
            require(
                penalty < amount,
                'UniswapIncentive: Burn exceeds trade size'
            );

            ARTHStablecoin(arthAddr).burnFrom(
                address(uniswapPairAddr),
                penalty
            );
        }
    }

    function incentivize(
        address sender,
        address receiver,
        address,
        uint256 amountIn
    ) public {
        require(sender != receiver, 'UniswapIncentive: cannot send self');
        updateOracle();

        if (_isPair(sender)) {
            _incentivizeBuy(receiver, amountIn);
        }

        if (_isPair(receiver)) {
            _incentivizeSell(sender, amountIn);
        }
    }

    function _updateTimeWeight(
        uint32 currentWeight,
        uint256 finalDeviation,
        uint256 initialDeviation
    ) internal {
        // Reset when trade ends above peg.
        if (finalDeviation == 0) {
            _setTimeWeight(0, getGrowthRate(), false);
            return;
        }

        // When trade starts above peg but ends below, activate time weight.
        if (initialDeviation == 0) {
            _setTimeWeight(0, getGrowthRate(), true);
            return;
        }

        // When trade starts and ends below the peg, update the values.
        uint256 updatedWeight = uint256(currentWeight);

        // Partial buy should update time weight.
        if (initialDeviation > finalDeviation) {
            uint256 remainingRatio = finalDeviation.div(initialDeviation);

            updatedWeight = remainingRatio.mul(uint256(currentWeight));
        }

        // Cap incentive at max penalty.
        uint256 maxWeight =
            finalDeviation.mul(100).mul(uint256(TIME_WEIGHT_GRANULARITY)); // m^2*100 (sell) = t*m (buy)

        updatedWeight = Math.min(updatedWeight, maxWeight);

        _setTimeWeight(uint32(updatedWeight), getGrowthRate(), true);
    }

    function _incentivizeBuy(address target, uint256 amountIn)
        internal
    // ifMinterSelf
    {
        if (isExemptAddress(target)) {
            return;
        }

        (
            uint32 weight,
            uint256 incentive,
            uint256 finalDeviation,
            uint256 initialDeviation
        ) = getBuyIncentive(amountIn);

        _updateTimeWeight(weight, finalDeviation, initialDeviation);

        if (incentive != 0)
            ARTHStablecoin(arthAddr).pool_mint(target, incentive); // POOL_MINT? or create seperate mint for controller?
    }

    function _getFinalPrice(
        uint256 amountARTH,
        uint256 reserveARTH,
        uint256 reserveOther
    ) internal pure returns (uint256) {
        uint256 k = reserveARTH.mul(reserveOther);
        // TODO: consider a sepereate fee for buy side also.
        uint256 amountARTHWithFee = amountARTH.mul(997).div(1000);

        uint256 adjustedReserveARTH = reserveARTH.sub(amountARTHWithFee);
        uint256 adjustedReserveOther = k / adjustedReserveARTH;

        return
            adjustedReserveARTH.mul(PRICE_PRECISION).div(adjustedReserveOther);
    }

    function _deviationBelowPeg(uint256 price) internal view returns (uint256) {
        if (price > targetPrice) return 0;

        return targetPrice.sub(price).mul(PRICE_PRECISION).div(targetPrice);
    }

    function _getPriceDeviations(uint256 amountIn)
        internal
        view
        returns (uint256, uint256)
    {
        (uint256 reservesARTH, uint256 reservesQuote) = getReserves();

        uint256 price = getCurrentArthPrice();
        uint256 initialDeviation = _deviationBelowPeg(price);

        uint256 finalPrice =
            _getFinalPrice(amountIn, reservesARTH, reservesQuote);
        uint256 finalDeviation = _deviationBelowPeg(finalPrice);

        return (initialDeviation, finalDeviation);
    }

    function _getAmountToPegARTH(uint256 arthReserves, uint256 tokenReserves)
        internal
        view
        returns (uint256)
    {
        return _getAmountToPeg(arthReserves, tokenReserves);
    }

    function _getAmountToPeg(uint256 reserveTarget, uint256 reserveOther)
        internal
        view
        returns (uint256)
    {
        uint256 radicand = targetPrice.mul(reserveTarget).mul(reserveOther);
        uint256 root = Math.sqrt(radicand);

        if (root > reserveTarget)
            return root.sub(reserveTarget).mul(1000).div(997);

        return reserveTarget.sub(root).mul(1000).div(997);
    }

    function _calculateSellPenaltyMultiplier(uint256 deviation)
        internal
        pure
        returns (uint256)
    {
        uint256 multiplier = deviation.mul(deviation).mul(100);
        if (multiplier > 1e18) return 1e18;

        return multiplier;
    }

    function _sellPenaltyBound(uint256 deviation)
        internal
        pure
        returns (uint256)
    {
        return (deviation**3).mul(33);
    }

    function _calculateIntegratedSellPenaltyMultiplier(
        uint256 initialDeviation,
        uint256 finalDeviation
    ) internal pure returns (uint256) {
        if (initialDeviation == finalDeviation)
            return _calculateSellPenaltyMultiplier(initialDeviation);

        uint256 numerator =
            _sellPenaltyBound(finalDeviation).sub(
                _sellPenaltyBound(initialDeviation)
            );
        uint256 denominator = finalDeviation.sub(initialDeviation);

        uint256 multiplier = numerator.div(denominator);
        if (multiplier > 1e18) return 1e18;

        return multiplier;
    }

    function _calculateBuyIncentiveMultiplier(
        uint32 weight,
        uint256 finalDeviation,
        uint256 initialDeviation
    ) internal pure returns (uint256) {
        uint256 correspondingPenalty =
            _calculateIntegratedSellPenaltyMultiplier(
                initialDeviation,
                finalDeviation
            );

        uint256 buyMultiplier =
            initialDeviation.mul(uint256(weight)).div(
                uint256(TIME_WEIGHT_GRANULARITY)
            );

        if (correspondingPenalty < buyMultiplier) return correspondingPenalty;

        return buyMultiplier;
    }

    function getBuyIncentive(uint256 amount)
        public
        view
        returns (
            uint32,
            uint256,
            uint256,
            uint256
        )
    {
        uint32 weight = getTimeWeight();
        (uint256 initialDeviation, uint256 finalDeviation) =
            _getPriceDeviations(amount);
        (uint256 reserveARTH, uint256 reserveOther) = getReserves();

        // Buy started above peg.
        if (initialDeviation == 0)
            return (weight, 0, finalDeviation, initialDeviation);

        uint256 incentivizedAmount = amount;
        // If buy ends above peg, only incentivize amount to peg.
        if (finalDeviation == 0)
            incentivizedAmount = _getAmountToPegARTH(reserveARTH, reserveOther);

        uint256 multiplier =
            _calculateBuyIncentiveMultiplier(
                weight,
                finalDeviation,
                initialDeviation
            );

        uint256 incentive = multiplier.mul(incentivizedAmount);

        return (weight, incentive, finalDeviation, initialDeviation);
    }
}
