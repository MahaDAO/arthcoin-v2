// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import {Ownable} from "../access/Ownable.sol";
import {IARTHController} from "./IARTHController.sol";
import {IARTHControllerGetter} from "./IARTHControllerGetter.sol";


/**
 * @title  ArthControllerProxy
 * @author MahaDAO.
 */
contract ArthControllerProxy is Ownable, IARTHControllerGetter {
    IARTHController public controller;

    constructor(IARTHController controller_) {
        controller = controller_;
    }

    function setController(IARTHController controller_) external onlyOwner {
        controller = controller_;
    }

    function getRefreshCooldown() external view override returns (uint256) {
        return controller.getRefreshCooldown();
    }

    function getARTHPrice() public view override returns (uint256) {
        return controller.getARTHPrice();
    }

    function getARTHXPrice() public view override returns (uint256) {
        return controller.getARTHXPrice();
    }

    function getMAHAPrice() public view override returns (uint256) {
        return controller.getMAHAPrice();
    }

    function getETHGMUPrice() public view override returns (uint256) {
        return controller.getETHGMUPrice();
    }

    function getGlobalCollateralRatio()
        public
        view
        override
        returns (uint256)
    {
        return controller.getGlobalCollateralRatio();
    }

    function getGlobalCollateralValue()
        public
        view
        override
        returns (uint256)
    {
        return controller.getGlobalCollateralValue();
    }

    function arthPools(address pool) external view override returns (bool) {
        return controller.arthPools(pool);
    }

    function getCRForMint() external view override returns (uint256) {
        return controller.getCRForMint();
    }

    function getARTHSupply() public view override returns (uint256) {
        return controller.getARTHSupply();
    }

    function getMintingFee() external view override returns (uint256) {
        return controller.getMintingFee();
    }

    function getBuybackFee() external view override returns (uint256) {
        return controller.getBuybackFee();
    }

    function getRedemptionFee() external view override returns (uint256) {
        return controller.getRedemptionFee();
    }

    function getCRForRedeem() external view override returns (uint256) {
        return controller.getCRForRedeem();
    }

    function getCRForRecollateralize()
        external
        view
        override
        returns (uint256)
    {
        return controller.getCRForRecollateralize();
    }

    function getTargetCollateralValue() public view override returns (uint256) {
        return controller.getTargetCollateralValue();
    }

    function getPercentCollateralized() public view override returns (uint256) {
        return controller.getPercentCollateralized();
    }

    function getRecollateralizationDiscount()
        public
        view
        override
        returns (uint256)
    {
        return controller.getRecollateralizationDiscount();
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
        return controller.getARTHInfo();
    }

    function isRedeemPaused() external view override returns (bool) {
        return controller.isRedeemPaused();
    }

    function isMintPaused() external view override returns (bool) {
        return controller.isMintPaused();
    }

    function isBuybackPaused() external view override returns (bool) {
        return controller.isBuybackPaused();
    }

    function isRecollaterlizePaused() external view override returns (bool) {
        return controller.isRecollaterlizePaused();
    }

    function getStabilityFee() external view override returns (uint256) {
        return controller.getStabilityFee();
    }
}
