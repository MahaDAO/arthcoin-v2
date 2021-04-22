// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import {Ownable} from "../access/Ownable.sol";
import {IARTH} from "../interfaces/IARTH.sol";
import {SafeMath} from "../utils/math/SafeMath.sol";
import {IARTHPool} from "../interfaces/IARTHPool.sol";
import {IARTHController} from "../interfaces/IARTHController.sol";
import {AccessControl} from "../access/AccessControl.sol";
import {IChainlinkOracle} from "../interfaces/IChainlinkOracle.sol";
import {IUniswapPairOracle} from "../interfaces/IUniswapPairOracle.sol";

/**
 * @title  ARTHStablecoin.
 * @author MahaDAO.
 */
contract ARTHController is AccessControl, Ownable, IARTHController {
    using SafeMath for uint256;

    enum PriceChoice {ARTH, ARTHX}

    IARTH public arth;

    IChainlinkOracle private _ethGMUOracle;
    IUniswapPairOracle private _arthETHOracle;
    IUniswapPairOracle private _arthxETHOracle;

    address public weth;
    address public timelock;
    address public controller;

    uint256 public arthStep; // Amount to change the collateralization ratio by upon refresing CR.
    uint256 public mintingFee; // 6 decimals of precision, divide by 1000000 in calculations for fee.
    uint256 public redemptionFee;
    uint256 public refreshCooldown; // Seconds to wait before being refresh CR again.
    uint256 public globalCollateralRatio;

    // The bound above and below the price target at which the refershing CR
    // will not change the collateral ratio.
    uint256 public priceBand;

    // The price of ARTH at which the collateral ratio will respond to.
    // This value is only used for the collateral ratio mechanism & not for
    // minting and redeeming which are hardcoded at $1.
    uint256 public priceTarget;

    // There needs to be a time interval that this can be called.
    // Otherwise it can be called multiple times per expansion.
    // Last time the refreshCollateralRatio function was called.
    uint256 public lastCallTime;

    bool public useGlobalCRForMint = true;
    bool public useGlobalCRForRedeem = true;
    bool public useGlobalCRForRecollateralize = true;

    uint256 public mintCollateralRatio;
    uint256 public redeemCollateralRatio;
    uint256 public recollateralizeCollateralRatio;

    bool public isColalteralRatioPaused = false;

    bytes32 public constant COLLATERAL_RATIO_PAUSER =
        keccak256("COLLATERAL_RATIO_PAUSER");

    uint8 private _ethGMUPricerDecimals;
    uint256 private constant _PRICE_PRECISION = 1e6;

    modifier onlyCollateralRatioPauser() {
        require(hasRole(COLLATERAL_RATIO_PAUSER, msg.sender));
        _;
    }

    modifier onlyPools() {
        require(arth.pools(msg.sender) == true, "ARTHController: FORBIDDEN");
        _;
    }

    modifier onlyAdmin() {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            "ARTHController: FORBIDDEN"
        );
        _;
    }

    modifier onlyByOwnerOrGovernance() {
        require(
            msg.sender == owner() ||
                msg.sender == timelock ||
                msg.sender == controller,
            "ARTHController: FORBIDDEN"
        );
        _;
    }

    modifier onlyByOwnerGovernanceOrPool() {
        require(
            msg.sender == owner() ||
                msg.sender == timelock ||
                arth.pools(msg.sender) == true,
            "ARTHController: FORBIDDEN"
        );
        _;
    }

    constructor(address timelock_) {
        timelock = timelock_;

        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        grantRole(COLLATERAL_RATIO_PAUSER, _msgSender());
        grantRole(COLLATERAL_RATIO_PAUSER, timelock);

        arthStep = 2500; // 6 decimals of precision, equal to 0.25%.
        priceBand = 5000; // Collateral ratio will not adjust if between $0.995 and $1.005 at genesis.
        priceTarget = 1000000; // Collateral ratio will adjust according to the $1 price target at genesis.
        refreshCooldown = 3600; // Refresh cooldown period is set to 1 hour (3600 seconds) at genesis.
        globalCollateralRatio = 1000000; // Arth system starts off fully collateralized (6 decimals of precision).
    }

    function toggleUseGlobalCRForMint(bool flag)
        external
        override
        onlyByOwnerGovernanceOrPool
    {
        useGlobalCRForMint = flag;
    }

    function toggleUseGlobalCRForRedeem(bool flag)
        external
        override
        onlyByOwnerGovernanceOrPool
    {
        useGlobalCRForRedeem = flag;
    }

    function toggleUseGlobalCRForRecollateralize(bool flag)
        external
        override
        onlyByOwnerGovernanceOrPool
    {
        useGlobalCRForRecollateralize = flag;
    }

    function setMintCollateralRatio(uint256 val)
        external
        override
        onlyByOwnerGovernanceOrPool
    {
        mintCollateralRatio = val;
    }

    function setRedeemCollateralRatio(uint256 val)
        external
        override
        onlyByOwnerGovernanceOrPool
    {
        redeemCollateralRatio = val;
    }

    function setRecollateralizeCollateralRatio(uint256 val)
        external
        override
        onlyByOwnerGovernanceOrPool
    {
        recollateralizeCollateralRatio = val;
    }

    function refreshCollateralRatio() external override {
        require(
            isColalteralRatioPaused == false,
            "ARTHController: Collateral Ratio has been paused"
        );

        require(
            block.timestamp - lastCallTime >= refreshCooldown,
            "ARTHController: must wait till callable again"
        );

        uint256 currentPrice = getARTHPrice();

        // Check whether to increase or decrease the CR.
        if (currentPrice > priceTarget.add(priceBand)) {
            // Decrease the collateral ratio.
            if (globalCollateralRatio <= arthStep) {
                globalCollateralRatio = 0; // If within a step of 0, go to 0
            } else {
                globalCollateralRatio = globalCollateralRatio.sub(arthStep);
            }
        } else if (currentPrice < priceTarget.sub(priceBand)) {
            // Increase collateral ratio.
            if (globalCollateralRatio.add(arthStep) >= 1000000) {
                globalCollateralRatio = 1000000; // Cap collateral ratio at 1.000000.
            } else {
                globalCollateralRatio = globalCollateralRatio.add(arthStep);
            }
        }

        lastCallTime = block.timestamp; // Set the time of the last expansion
    }

    function setGlobalCollateralRatio(uint256 ratio)
        external
        override
        onlyAdmin
    {
        globalCollateralRatio = ratio;
    }

    function setPriceTarget(uint256 newPriceTarget)
        external
        override
        onlyByOwnerOrGovernance
    {
        priceTarget = newPriceTarget;
    }

    function setRefreshCooldown(uint256 newCooldown)
        external
        override
        onlyByOwnerOrGovernance
    {
        refreshCooldown = newCooldown;
    }

    function setETHGMUOracle(IChainlinkOracle oracle)
        external
        override
        onlyByOwnerOrGovernance
    {
        _ethGMUOracle = oracle;
        _ethGMUPricerDecimals = _ethGMUOracle.getDecimals();
    }

    function setARTHXETHOracle(IUniswapPairOracle oracle)
        external
        override
        onlyByOwnerOrGovernance
    {
        _arthxETHOracle = IUniswapPairOracle(oracle);
    }

    function setARTHETHOracle(IUniswapPairOracle oracle)
        external
        override
        onlyByOwnerOrGovernance
    {
        _arthETHOracle = oracle;
    }

    function toggleCollateralRatio()
        external
        override
        onlyCollateralRatioPauser
    {
        isColalteralRatioPaused = !isColalteralRatioPaused;
    }

    function setMintingFee(uint256 fee)
        external
        override
        onlyByOwnerOrGovernance
    {
        mintingFee = fee;
    }

    function setArthStep(uint256 newStep)
        external
        override
        onlyByOwnerOrGovernance
    {
        arthStep = newStep;
    }

    function setRedemptionFee(uint256 fee)
        external
        override
        onlyByOwnerOrGovernance
    {
        redemptionFee = fee;
    }

    function setPriceBand(uint256 band)
        external
        override
        onlyByOwnerOrGovernance
    {
        priceBand = band;
    }

    function setTimelock(address newTimelock)
        external
        override
        onlyByOwnerOrGovernance
    {
        timelock = newTimelock;
    }

    function getRefreshCooldown() external view override returns (uint256) {
        return refreshCooldown;
    }

    function getARTHPrice() public view override returns (uint256) {
        return _getOraclePrice(PriceChoice.ARTH);
    }

    function getARTHXPrice() public view override returns (uint256) {
        return _getOraclePrice(PriceChoice.ARTHX);
    }

    function getETHGMUPrice() public view override returns (uint256) {
        return
            uint256(_ethGMUOracle.getLatestPrice()).mul(_PRICE_PRECISION).div(
                uint256(10)**_ethGMUPricerDecimals
            );
    }

    function getGlobalCollateralRatio() public view override returns (uint256) {
        return globalCollateralRatio;
    }

    function getGlobalCollateralValue() public view override returns (uint256) {
        uint256 totalCollateralValueD18 = 0;

        for (uint256 i = 0; i < arth.getAllPoolsCount(); i++) {
            address pool = arth.getPool(i);
            // Exclude null addresses.
            if (pool != address(0)) {
                totalCollateralValueD18 = totalCollateralValueD18.add(
                    IARTHPool(pool).getCollateralGMUBalance()
                );
            }
        }

        return totalCollateralValueD18;
    }

    function getCRForMint() external view override returns (uint256) {
        if (useGlobalCRForMint) return getGlobalCollateralRatio();

        return mintCollateralRatio;
    }

    function getCRForRedeem() external view override returns (uint256) {
        if (useGlobalCRForRedeem) return getGlobalCollateralRatio();

        return redeemCollateralRatio;
    }

    function getCRForRecollateralize() public view override returns (uint256) {
        if (useGlobalCRForRecollateralize) return getGlobalCollateralRatio();

        return recollateralizeCollateralRatio;
    }

    function getARTHInfo()
        public
        view
        override
        returns (
            uint256,
            uint256,
            uint256,
            uint256,
            uint256,
            uint256,
            uint256,
            uint256
        )
    {
        return (
            getARTHPrice(), // ARTH price.
            getARTHXPrice(), // ARTHX price.
            arth.totalSupply(), // ARTH total supply.
            globalCollateralRatio, // Global collateralization ratio.
            getGlobalCollateralValue(), // Global collateral value.
            mintingFee, // Minting fee.
            redemptionFee, // Redemtion fee.
            getETHGMUPrice() // ETH/GMU price.
        );
    }

    /// @param choice 'ARTH' or 'ARTHX'.
    function _getOraclePrice(PriceChoice choice)
        internal
        view
        returns (uint256)
    {
        uint256 eth2GMUPrice =
            uint256(_ethGMUOracle.getLatestPrice()).mul(_PRICE_PRECISION).div(
                uint256(10)**_ethGMUPricerDecimals
            );

        uint256 priceVsETH;

        if (choice == PriceChoice.ARTH) {
            priceVsETH = uint256(
                _arthETHOracle.consult(weth, _PRICE_PRECISION) // How much ARTH if you put in _PRICE_PRECISION WETH ?
            );
        } else if (choice == PriceChoice.ARTHX) {
            priceVsETH = uint256(
                _arthxETHOracle.consult(weth, _PRICE_PRECISION) // How much ARTHX if you put in _PRICE_PRECISION WETH ?
            );
        } else
            revert(
                "INVALID PRICE CHOICE. Needs to be either 0 (ARTH) or 1 (ARTHX)"
            );

        return eth2GMUPrice.mul(_PRICE_PRECISION).div(priceVsETH);
    }
}
