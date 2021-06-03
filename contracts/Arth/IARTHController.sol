// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import {IARTHControllerGetters} from "./IARTHControllerGetters.sol";

interface IARTHController is IARTHControllerGetters {
    function toggleCollateralRatio() external;

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

    function setControllerAddress(address controller) external;

    function setRedemptionFee(uint256 fee) external;

    function setBuybackFee(uint256 fee) external;

    function setOwner(address _ownerAddress) external;

    function setTimelock(address newTimelock) external;

    function setARTHXAddress(address _arthxAddress) external;

    function setETHGMUOracle(address _ethGMUConsumerAddress) external;

    function setStabilityFee(uint256 val) external;

    function toggleMinting() external;

    function toggleRedeeming() external;

    function toggleRecollateralize() external;

    function toggleBuyBack() external;
}
