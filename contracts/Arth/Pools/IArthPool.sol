// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IARTHPool {
    function repay(uint256 _amount) external;

    function borrow(uint256 _amount) external;

    function setStabilityFee(uint256 percent) external;

    function setRecollateralizeCollateralRatio(uint256 val) external;

    function setRedeemCollateralRatio(uint256 val) external;

    function setMintCollateralRatio(uint256 val) external;

    function toggleUseGlobalCRForRecollateralize(bool flag) external;

    function toggleUseGlobalCRForRedeem(bool flag) external;

    function setCollatETHOracle(
        address _collateralWETHOracleAddress,
        address _wethAddress
    ) external;

    function toggleUseGlobalCRForMint(bool flag) external;

    function setBuyBackCollateralBuffer(uint256 percent) external;

    function mint1t1ARTH(uint256 collateralAmount, uint256 ARTHOutMin)
        external
        returns (uint256);

    function mintAlgorithmicARTH(uint256 arthxAmount_d18, uint256 ARTHOutMin)
        external
        returns (uint256);

    function mintFractionalARTH(
        uint256 collateralAmount,
        uint256 arthxAmount,
        uint256 ARTHOutMin
    ) external returns (uint256);

    function redeem1t1ARTH(uint256 ARTH_amount, uint256 COLLATERAL_out_min)
        external;

    function redeemFractionalARTH(
        uint256 ARTH_amount,
        uint256 ARTHXOutMin,
        uint256 COLLATERAL_out_min
    ) external;

    function redeemAlgorithmicARTH(uint256 ARTH_amount, uint256 ARTHXOutMin)
        external;

    function collectRedemption() external;

    function recollateralizeARTH(uint256 collateralAmount, uint256 ARTHXOutMin)
        external
        returns (uint256);

    function buyBackARTHX(uint256 arthxAmount, uint256 COLLATERAL_out_min)
        external;

    function toggleMinting() external;

    function toggleRedeeming() external;

    function toggleRecollateralize() external;

    function toggleBuyBack() external;

    function toggleCollateralPrice(uint256 _new_price) external;

    function setPoolParameters(
        uint256 newCeiling,
        uint256 newRedemptionDelay,
        uint256 newMintFee,
        uint256 newRedeemFee,
        uint256 newBuybackFee,
        uint256 newRecollateralizeFee
    ) external;

    function setTimelock(address new_timelock) external;

    function setOwner(address _ownerAddress) external;

    function getGlobalCR() external view returns (uint256);

    function getCRForMint() external view returns (uint256);

    function getCRForRedeem() external view returns (uint256);

    function getCRForRecollateralize() external view returns (uint256);

    function mintingFee() external returns (uint256);

    function redemptionFee() external returns (uint256);

    function buybackFee() external returns (uint256);

    function recollatFee() external returns (uint256);

    function getCollateralGMUBalance() external view returns (uint256);

    function getAvailableExcessCollateralDV() external view returns (uint256);

    function getCollateralPrice() external view returns (uint256);

    function getARTHMAHAPrice() external view returns (uint256);

    function collateralPricePaused() external view returns (bool);

    function pausedPrice() external view returns (uint256);

    function collateralETHOracleAddress() external view returns (address);
}
