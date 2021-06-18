// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import {IERC20} from '../ERC20/IERC20.sol';
import {SafeMath} from '../utils/math/SafeMath.sol';
import {IARTHPool} from './Pools/IARTHPool.sol';
import {IARTHController} from './IARTHController.sol';
import {AccessControl} from '../access/AccessControl.sol';
import {IChainlinkOracle} from '../Oracle/IChainlinkOracle.sol';
import {IUniswapPairOracle} from '../Oracle/IUniswapPairOracle.sol';
import {ICurve} from '../Curves/ICurve.sol';
import {Math} from '../utils/math/Math.sol';
import {IBondingCurve} from '../Curves/IBondingCurve.sol';

/**
 * @title  ARTHStablecoin.
 * @author MahaDAO.
 */
contract ArthController is AccessControl, IARTHController {
    using SafeMath for uint256;

    enum PriceChoice {ARTH, ARTHX}

    IERC20 public ARTH;

    IChainlinkOracle public _ETHGMUPricer;
    IUniswapPairOracle public _ARTHETHOracle;
    IUniswapPairOracle public MAHAARTHOracle;
    IUniswapPairOracle public _ARTHXETHOracle;
    ICurve public _recollateralizeDiscountCruve;
    IBondingCurve public bondingCurve;

    address public wethAddress;
    address public arthxAddress;
    address public ownerAddress;
    address public creatorAddress;
    address public timelockAddress;
    address public controllerAddress;
    address public arthETHOracleAddress;
    address public mahaArthOracleAddress;
    address public arthxETHOracleAddress;
    address public ethGMUConsumerAddress;
    address public DEFAULT_ADMIN_ADDRESS;

    uint256 public globalCollateralRatio;

    uint256 public override buybackFee; // 6 decimals of precision, divide by 1000000 in calculations for fee.
    uint256 public override mintingFee;
    uint256 public override redemptionFee;

    uint256 public maxRecollateralizeDiscount = 750000; // In 1e6 precision.

    /// @notice Timestamp at which contract was deployed.
    uint256 public immutable genesisTimestamp;
    /// @notice Will use uniswap oracle after this duration.
    uint256 public constant maxGenesisDuration = 7 days;
    /// @notice Will force use of genesis oracle during genesis.
    bool public isARTHXGenesActive = true;

    bool public isColalteralRatioPaused = false;

    bytes32 public constant COLLATERAL_RATIO_PAUSER =
        keccak256('COLLATERAL_RATIO_PAUSER');
    bytes32 public constant _RECOLLATERALIZE_PAUSER =
        keccak256('RECOLLATERALIZE_PAUSER');
    bytes32 public constant _MINT_PAUSER = keccak256('MINT_PAUSER');
    bytes32 public constant _REDEEM_PAUSER = keccak256('REDEEM_PAUSER');
    bytes32 public constant _BUYBACK_PAUSER = keccak256('BUYBACK_PAUSER');
    address[] public arthPoolsArray; // These contracts are able to mint ARTH.

    mapping(address => bool) public override arthPools;

    bool public mintPaused = false;
    bool public redeemPaused = false;
    bool public buyBackPaused = false;
    bool public recollateralizePaused = false;

    uint8 public _ethGMUPricerDecimals;
    uint256 public constant _PRICE_PRECISION = 1e6;
    uint256 public stabilityFee = 0; // 1e4; // 1% in e6 precision.

    event TargetPriceChanged(uint256 old, uint256 current);
    event RedemptionFeeChanged(uint256 old, uint256 current);
    event MintingFeeChanged(uint256 old, uint256 current);

    /**
     * Modifiers.
     */

    modifier onlyCollateralRatioPauser() {
        require(
            hasRole(COLLATERAL_RATIO_PAUSER, msg.sender),
            'ARTHController: FORBIDDEN'
        );
        _;
    }

    modifier onlyAdmin() {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            'ARTHController: FORBIDDEN'
        );
        _;
    }

    modifier onlyByOwnerOrGovernance() {
        require(
            msg.sender == ownerAddress ||
                msg.sender == timelockAddress ||
                msg.sender == controllerAddress,
            'ARTHController: FORBIDDEN'
        );
        _;
    }

    modifier onlyByOwnerGovernanceOrPool() {
        require(
            msg.sender == ownerAddress ||
                msg.sender == timelockAddress ||
                arthPools[msg.sender],
            'ARTHController: FORBIDDEN'
        );
        _;
    }

    /**
     * Constructor.
     */

    constructor(
        IERC20 _arth,
        address _creatorAddress,
        address _timelockAddress
    ) {
        ARTH = _arth;
        creatorAddress = _creatorAddress;
        timelockAddress = _timelockAddress;

        ownerAddress = _creatorAddress;
        DEFAULT_ADMIN_ADDRESS = _msgSender();

        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        grantRole(COLLATERAL_RATIO_PAUSER, creatorAddress);
        grantRole(COLLATERAL_RATIO_PAUSER, timelockAddress);

        globalCollateralRatio = 11e5;

        grantRole(_MINT_PAUSER, _timelockAddress);
        grantRole(_REDEEM_PAUSER, _timelockAddress);
        grantRole(_BUYBACK_PAUSER, _timelockAddress);
        grantRole(_RECOLLATERALIZE_PAUSER, _timelockAddress);

        genesisTimestamp = block.timestamp;
    }

    /**
     * External.
     */

    function deactivateGenesis() external onlyByOwnerOrGovernance {
        isARTHXGenesActive = false;
    }

    function setBondingCurve(IBondingCurve curve)
        external
        onlyByOwnerOrGovernance
    {
        bondingCurve = curve;
    }

    function setRecollateralizationCurve(ICurve curve)
        external
        onlyByOwnerGovernanceOrPool
    {
        _recollateralizeDiscountCruve = curve;
    }

    /// @notice Adds collateral addresses supported.
    /// @dev    Collateral must be an ERC20.
    function addPool(address poolAddress)
        external
        override
        onlyByOwnerOrGovernance
    {
        require(!arthPools[poolAddress], 'ARTHController: address present');

        arthPools[poolAddress] = true;
        arthPoolsArray.push(poolAddress);
    }

    function removePool(address poolAddress)
        external
        override
        onlyByOwnerOrGovernance
    {
        require(arthPools[poolAddress], 'ARTHController: address absent');

        // Delete from the mapping.
        delete arthPools[poolAddress];

        uint256 noOfPools = arthPoolsArray.length;
        // 'Delete' from the array by setting the address to 0x0
        for (uint256 i = 0; i < noOfPools; i++) {
            if (arthPoolsArray[i] == poolAddress) {
                arthPoolsArray[i] = address(0); // This will leave a null in the array and keep the indices the same.
                break;
            }
        }
    }

    function setControllerAddress(address controller)
        external
        override
        onlyAdmin
    {
        controllerAddress = controller;
    }

    function setGlobalCollateralRatio(uint256 _globalCollateralRatio)
        external
        override
        onlyAdmin
    {
        globalCollateralRatio = _globalCollateralRatio;
    }

    function setARTHXAddress(address _arthxAddress)
        external
        override
        onlyByOwnerOrGovernance
    {
        arthxAddress = _arthxAddress;
    }

    function setStabilityFee(uint256 percent)
        external
        override
        onlyByOwnerOrGovernance
    {
        require(percent <= 1e6, 'ArthPool: percent > 1e6');
        stabilityFee = percent;
    }

    function setETHGMUOracle(address _ethGMUConsumerAddress)
        external
        override
        onlyByOwnerOrGovernance
    {
        ethGMUConsumerAddress = _ethGMUConsumerAddress;
        _ETHGMUPricer = IChainlinkOracle(ethGMUConsumerAddress);
        _ethGMUPricerDecimals = _ETHGMUPricer.getDecimals();
    }

    function setARTHXETHOracle(
        address _arthxOracleAddress,
        address _wethAddress
    ) external override onlyByOwnerOrGovernance {
        arthxETHOracleAddress = _arthxOracleAddress;
        _ARTHXETHOracle = IUniswapPairOracle(_arthxOracleAddress);
        wethAddress = _wethAddress;
    }

    function setMAHARTHOracle(address oracle)
        external
        override
        onlyByOwnerOrGovernance
    {
        mahaArthOracleAddress = oracle;
        MAHAARTHOracle = IUniswapPairOracle(oracle);
    }

    function setARTHETHOracle(address _arthOracleAddress, address _wethAddress)
        external
        override
        onlyByOwnerOrGovernance
    {
        arthETHOracleAddress = _arthOracleAddress;
        _ARTHETHOracle = IUniswapPairOracle(_arthOracleAddress);
        wethAddress = _wethAddress;
    }

    function setFeesParameters(
        uint256 _mintingFee,
        uint256 _buybackFee,
        uint256 _redemptionFee
    ) external override onlyByOwnerOrGovernance {
        mintingFee = _mintingFee;
        buybackFee = _buybackFee;
        redemptionFee = _redemptionFee;
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
        uint256 old = mintingFee;
        mintingFee = fee;
        emit MintingFeeChanged(old, mintingFee);
    }

    function setRedemptionFee(uint256 fee)
        external
        override
        onlyByOwnerOrGovernance
    {
        uint256 old = redemptionFee;
        redemptionFee = fee;
        emit RedemptionFeeChanged(old, redemptionFee);
    }

    function setBuybackFee(uint256 fee)
        external
        override
        onlyByOwnerOrGovernance
    {
        buybackFee = fee;
    }

    function setOwner(address _ownerAddress)
        external
        override
        onlyByOwnerOrGovernance
    {
        ownerAddress = _ownerAddress;
    }

    function setTimelock(address newTimelock)
        external
        override
        onlyByOwnerOrGovernance
    {
        timelockAddress = newTimelock;
    }

    function getARTHPrice() public view override returns (uint256) {
        return _getOraclePrice(PriceChoice.ARTH);
    }

    function getIsGenesisActive() public view override returns (bool) {
        return (isARTHXGenesActive &&
            block.timestamp.sub(genesisTimestamp) <= maxGenesisDuration);
    }

    function getARTHXGenesisPrice() public view override returns (uint256) {
        return bondingCurve.getY(getPercentCollateralized());
    }

    function getARTHXPrice() public view override returns (uint256) {
        if (getIsGenesisActive()) return getARTHXGenesisPrice();

        return _getOraclePrice(PriceChoice.ARTHX);
    }

    function getMAHAPrice() public view override returns (uint256) {
        uint256 arthGmuPrice = getARTHPrice();
        uint256 priceVsArth =
            uint256(
                MAHAARTHOracle.consult(address(ARTH), _PRICE_PRECISION) // How much MAHA if you put in _PRICE_PRECISION ARTH ?
            );

        return arthGmuPrice.mul(_PRICE_PRECISION).div(priceVsArth);
    }

    function getETHGMUPrice() public view override returns (uint256) {
        return
            uint256(_ETHGMUPricer.getLatestPrice()).mul(_PRICE_PRECISION).div(
                uint256(10)**_ethGMUPricerDecimals
            );
    }

    function getGlobalCollateralRatio() public view override returns (uint256) {
        return globalCollateralRatio;
    }

    function getGlobalCollateralValue() public view override returns (uint256) {
        uint256 totalCollateralValueD18 = 0;

        uint256 noOfPools = arthPoolsArray.length;
        for (uint256 i = 0; i < noOfPools; i++) {
            // Exclude null addresses.
            if (arthPoolsArray[i] != address(0)) {
                totalCollateralValueD18 = totalCollateralValueD18.add(
                    IARTHPool(arthPoolsArray[i]).getCollateralGMUBalance()
                );
            }
        }

        return totalCollateralValueD18;
    }

    function getARTHSupply() public view override returns (uint256) {
        return ARTH.totalSupply();
    }

    function getMintingFee() external view override returns (uint256) {
        return mintingFee;
    }

    function getBuybackFee() external view override returns (uint256) {
        return buybackFee;
    }

    function getRedemptionFee() external view override returns (uint256) {
        return redemptionFee;
    }

    function getTargetCollateralValue() public view override returns (uint256) {
        return getARTHSupply().mul(getGlobalCollateralRatio()).div(1e6);
    }

    function getPercentCollateralized() public view override returns (uint256) {
        uint256 targetCollatValue = getTargetCollateralValue();
        uint256 currentCollatValue = getGlobalCollateralValue();

        return currentCollatValue.mul(1e18).div(targetCollatValue);
    }

    function getRecollateralizationDiscount()
        public
        view
        override
        returns (uint256)
    {
        return
            Math.min(
                _recollateralizeDiscountCruve
                    .getY(getPercentCollateralized())
                    .mul(_PRICE_PRECISION)
                    .div(100),
                maxRecollateralizeDiscount
            );
    }

    function getARTHInfo()
        external
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
            uint256,
            uint256
        )
    {
        return (
            getARTHPrice(), // ARTH price.
            getARTHXPrice(), // ARTHX price.
            ARTH.totalSupply(), // ARTH total supply.
            globalCollateralRatio, // Global collateralization ratio.
            getGlobalCollateralValue(), // Global collateral value.
            mintingFee, // Minting fee.
            redemptionFee, // Redemtion fee.
            getETHGMUPrice(), // ETH/GMU price.
            buybackFee
        );
    }

    /**
     * Internal.
     */

    /// @param choice 'ARTH' or 'ARTHX'.
    function _getOraclePrice(PriceChoice choice)
        internal
        view
        returns (uint256)
    {
        uint256 eth2GMUPrice =
            uint256(_ETHGMUPricer.getLatestPrice()).mul(_PRICE_PRECISION).div(
                uint256(10)**_ethGMUPricerDecimals
            );
        uint256 priceVsETH;

        if (choice == PriceChoice.ARTH) {
            priceVsETH = uint256(
                _ARTHETHOracle.consult(wethAddress, _PRICE_PRECISION) // How much ARTH if you put in _PRICE_PRECISION WETH ?
            );
        } else if (choice == PriceChoice.ARTHX) {
            priceVsETH = uint256(
                _ARTHXETHOracle.consult(wethAddress, _PRICE_PRECISION) // How much ARTHX if you put in _PRICE_PRECISION WETH ?
            );
        } else
            revert(
                'INVALID PRICE CHOICE. Needs to be either 0 (ARTH) or 1 (ARTHX)'
            );

        return eth2GMUPrice.mul(_PRICE_PRECISION).div(priceVsETH);
    }

    function toggleMinting() external override {
        require(hasRole(_MINT_PAUSER, msg.sender));
        mintPaused = !mintPaused;
    }

    function toggleRedeeming() external override {
        require(hasRole(_REDEEM_PAUSER, msg.sender));
        redeemPaused = !redeemPaused;
    }

    function toggleRecollateralize() external override {
        require(hasRole(_RECOLLATERALIZE_PAUSER, msg.sender));
        recollateralizePaused = !recollateralizePaused;
    }

    function toggleBuyBack() external override {
        require(hasRole(_BUYBACK_PAUSER, msg.sender));
        buyBackPaused = !buyBackPaused;
    }

    function isRedeemPaused() external view override returns (bool) {
        if (getIsGenesisActive()) return true;
        return redeemPaused;
    }

    function isMintPaused() external view override returns (bool) {
        if (getIsGenesisActive()) return true;
        return mintPaused;
    }

    function isBuybackPaused() external view override returns (bool) {
        if (getIsGenesisActive()) return true;
        return buyBackPaused;
    }

    function isRecollaterlizePaused() external view override returns (bool) {
        return recollateralizePaused;
    }

    function getStabilityFee() external view override returns (uint256) {
        if (getIsGenesisActive()) return 0;
        return stabilityFee;
    }
}
