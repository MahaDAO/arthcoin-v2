// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import {IARTHControllerGetter} from "./IARTHControllerGetter.sol";


interface IARTHController is IARTHControllerGetter{
    function toggleCollateralRatio() external;

    function refreshCollateralRatio() external;

    function addPool(address pool_address) external;

    function removePool(address pool_address) external;

    function setMintingFee(uint256 fee) external;

    function setMAHARTHOracle(address oracle) external;

    function setARTHXETHOracle(
        address _arthxOracleAddress,
        address _wethAddress
    ) external;

    function setFeesParameters(
        uint256 _mintingFee,
        uint256 _buybackFee,
        uint256 _redemptionFee
    ) external;

    function setARTHETHOracle(address _arthOracleAddress, address _wethAddress)
        external;

    function setArthStep(uint256 newStep) external;

    function setControllerAddress(address controller) external;

    function setRedemptionFee(uint256 fee) external;

    function setBuybackFee(uint256 fee) external;

    function setOwner(address _ownerAddress) external;

    function setPriceBand(uint256 _priceBand) external;

    function setTimelock(address newTimelock) external;

    function setPriceTarget(uint256 newPriceTarget) external;

    function setARTHXAddress(address _arthxAddress) external;

    function setRefreshCooldown(uint256 newCooldown) external;

    function setETHGMUOracle(address _ethGMUConsumerAddress) external;

    function setGlobalCollateralRatio(uint256 _globalCollateralRatio) external;

    function toggleUseGlobalCRForMint(bool flag) external;

    function toggleUseGlobalCRForRecollateralize(bool flag) external;

    function setMintCollateralRatio(uint256 val) external;

    function setRedeemCollateralRatio(uint256 val) external;

    function toggleUseGlobalCRForRedeem(bool flag) external;

    function setRecollateralizeCollateralRatio(uint256 val) external;

    function setStabilityFee(uint256 val) external;

    function toggleMinting() external;

    function toggleRedeeming() external;

    function toggleRecollateralize() external;

    function toggleBuyBack() external;
}
