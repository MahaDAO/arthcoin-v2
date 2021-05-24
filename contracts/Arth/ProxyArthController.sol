// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import {IERC20} from '../ERC20/IERC20.sol';
import {SafeMath} from '../utils/math/SafeMath.sol';
import {IARTHPool} from './Pools/IARTHPool.sol';
import {IProxyArthController} from './IProxyArthController.sol';
import {AccessControl} from '../access/AccessControl.sol';
import {IChainlinkOracle} from '../Oracle/IChainlinkOracle.sol';
import {IUniswapPairOracle} from '../Oracle/IUniswapPairOracle.sol';
import {ICurve} from '../Curves/ICurve.sol';
import {Math} from '../utils/math/Math.sol';
import {IBondingCurve} from '../Curves/IBondingCurve.sol';
import {IARTHController} from './IARTHController.sol';

/**
 * @title  ARTHStablecoin.
 * @author MahaDAO.
 */
contract ProxyArthController is AccessControl, IProxyArthController {
    using SafeMath for uint256;
    enum PriceChoice {ARTH, ARTHX}

    address public ownerAddress;
    address public creatorAddress;
    address public timelockAddress;
    address public controllerAddress;
    address public DEFAULT_ADMIN_ADDRESS;

    IARTHController public arthController;
    /**
     * Constructor.
     */
    modifier onlyAdmin() {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            'ARTHController: FORBIDDEN'
        );
        _;
    }

    constructor(
        IARTHController arthController_
    ) {
        arthController = arthController_;

        DEFAULT_ADMIN_ADDRESS = _msgSender();
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    function setArthController(IARTHController _arthcontroller)
        public
        override
        onlyAdmin
    {
        arthController = _arthcontroller;
    }

    function getRefreshCooldown() external view override returns (uint256) {
        return arthController.getRefreshCooldown();
    }

    function getARTHPrice() public view override returns (uint256) {
        return arthController.getARTHPrice();
    }

    function getIsGenesisActive() public view override returns (bool) {
        return arthController.getIsGenesisActive();
    }

    function getARTHXGenesisPrice() public view override returns (uint256) {
        return arthController.getARTHXGenesisPrice();
    }

    function getARTHXPrice() public view override returns (uint256) {
        return arthController.getARTHXPrice();
    }

    function getMAHAPrice() public view override returns (uint256) {
        return arthController.getMAHAPrice();
    }

    function getETHGMUPrice() public view override returns (uint256) {
        return arthController.getETHGMUPrice();
    }

    function getGlobalCollateralRatio() public view override returns (uint256) {
        return arthController.getGlobalCollateralRatio();
    }

    function getGlobalCollateralValue() public view override returns (uint256) {
        return arthController.getGlobalCollateralValue();
    }

    function getCRForMint() external view override returns (uint256) {
        return arthController.getCRForMint();
    }

    function getARTHSupply() public view override returns (uint256) {
        return arthController.getARTHSupply();
    }

    function getMintingFee() external view override returns (uint256) {
        return arthController.getMintingFee();
    }

    function getBuybackFee() external view override returns (uint256) {
        return arthController.getBuybackFee();
    }

    function getRedemptionFee() external view override returns (uint256) {
        return arthController.getRedemptionFee();
    }

    function getCRForRedeem() external view override returns (uint256) {
        return arthController.getCRForRedeem();
    }

    function getCRForRecollateralize()
        external
        view
        override
        returns (uint256)
    {
        return arthController.getCRForRecollateralize();
    }

    function getTargetCollateralValue() public view override returns (uint256) {
        return arthController.getTargetCollateralValue();
    }

    function getPercentCollateralized() public view override returns (uint256) {
        return arthController.getPercentCollateralized();
    }

    function getRecollateralizationDiscount()
        public
        override
        returns (uint256)
    {
        return arthController.getRecollateralizationDiscount();
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
        return arthController.getARTHInfo();
    }

    function isRedeemPaused() external view override returns (bool) {
        return arthController.isRedeemPaused();
    }

    function isMintPaused() external view override returns (bool) {
        return arthController.isMintPaused();
    }

    function isBuybackPaused() external view override returns (bool) {
        return arthController.isBuybackPaused();
    }

    function isRecollaterlizePaused() external view override returns (bool) {
        return arthController.isRecollaterlizePaused();
    }

    function getStabilityFee() external view override returns (uint256) {
        return arthController.getStabilityFee();
    }
}
