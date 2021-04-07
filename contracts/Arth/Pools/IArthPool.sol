// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IARTHPool {
    function mintingFee() external returns (uint256);

    function redemptionFee() external returns (uint256);

    function buybackFee() external returns (uint256);

    function recollatFee() external returns (uint256);

    function collatDollarBalance() external view returns (uint256);

    function availableExcessCollatDV() external returns (uint256);

    function getCollateralPrice() external returns (uint256);

    function setCollatETHOracle(
        address _collateral_weth_oracle_address,
        address _weth_address
    ) external;

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
        uint256 new_ceiling,
        uint256 new_bonus_rate,
        uint256 new_redemptionDelay,
        uint256 new_mint_fee,
        uint256 new_redeem_fee,
        uint256 new_buybackFee,
        uint256 new_recollatFee
    ) external;

    function setTimelock(address new_timelock) external;

    function setOwner(address _ownerAddress) external;
}
