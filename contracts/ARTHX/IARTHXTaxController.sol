// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/**
 * @title  ARTHXTaxController.
 * @author MahaDAO.
 */
interface IARTHXTaxController {
    function taxToBurnPercent() external view returns (uint256);

    function taxToLiquidityPercent() external view returns (uint256);

    function taxToHoldersPercent() external view returns (uint256);

    function holderBeneficiary() external view returns (address);

    function liquidityBeneficiary() external view returns (address);

    function setHolderBeneficiary(address beneficiary) external;

    function setTaxToHoldersPercent(uint256 percent) external;

    function setTaxToLiquidityPercent(uint256 percent) external;

    function setTaxToBurnPercent(uint256 percent) external;

    function setLiquidityBeneficiary(address beneficiary) external;

    function chargeTax()
    external;
}
