// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import {Ownable} from "../access/Ownable.sol";
import {IProxyARTHController} from './IProxyARTHController.sol';
import {IARTHControllerGetters} from "./IARTHControllerGetters.sol";

/**
 * @title  ProxyArthController.
 * @author MahaDAO.
 */
contract ProxyArthController is Ownable, IProxyARTHController {

    IARTHControllerGetters public controller;

    constructor(
       IARTHControllerGetters controller_
    ) {
      controller = controller_;
    }

    function setArthController(IARTHControllerGetters controller_)
        external
        override
        onlyOwner
    {
        controller = controller_;
    }

    function getARTHPrice() public view override returns (uint256) {
        return controller.getARTHPrice();
    }

    function getIsGenesisActive() public view override returns (bool) {
        return controller.getIsGenesisActive();
    }

    function getARTHXGenesisPrice() public view override returns (uint256) {
        return controller.getARTHXGenesisPrice();
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

    function getGlobalCollateralRatio() public view override returns (uint256) {
        return controller.getGlobalCollateralRatio();
    }

    function getGlobalCollateralValue() public view override returns (uint256) {
        return controller.getGlobalCollateralValue();
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

    function arthPools(address pool) external view override returns(bool) {
        return controller.arthPools(pool);
    }
}
