// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import {Ownable} from "../access/Ownable.sol";
import {IARTHX} from "./IARTHX.sol";
import {SafeMath} from "../utils/math/SafeMath.sol";
import {IARTHXTaxController} from "./IARTHXTaxController.sol";

/**
 * @title  ARTHXTaxController.
 * @author MahaDAO.
 */
contract ARTHXTaxController is Ownable, IARTHXTaxController {
    using SafeMath for uint256;

    IARTHX public immutable arthx;

    uint256 public override taxToBurnPercent = 1; // In %.
    uint256 public override taxToLiquidityPercent = 2; // In %.
    uint256 public override taxToHoldersPercent = 2; // In %.

    address public override holderBeneficiary;
    address public override liquidityBeneficiary;

    event TaxCharged(address indexed from, address indexed to, uint256 amount);

    modifier onlyARTHX() {
        require(
            _msgSender() == address(arthx),
            "ARTHXTaxController: FORBIDDEN"
        );
        _;
    }

    constructor(
        IARTHX arthx_,
        address holderBeneficiary_,
        address liquidityBeneficiary_
    ) {
        arthx = arthx_;
        holderBeneficiary = holderBeneficiary_;
        liquidityBeneficiary = liquidityBeneficiary_;
    }

    function setHolderBeneficiary(address beneficiary)
        external
        override
        onlyOwner
    {
        holderBeneficiary = beneficiary;
    }

    function setTaxToHoldersPercent(uint256 percent)
        external
        override
        onlyOwner
    {
        require(percent >= 0 && percent <= 100, "ARTHX: percent invalid");

        taxToHoldersPercent = percent;
    }

    function setTaxToLiquidityPercent(uint256 percent)
        external
        override
        onlyOwner
    {
        require(percent >= 0 && percent <= 100, "ARTHX: percent invalid");

        taxToLiquidityPercent = percent;
    }

    function setTaxToBurnPercent(uint256 percent) external override onlyOwner {
        require(percent >= 0 && percent <= 100, "ARTHX: percent invalid");

        taxToBurnPercent = percent;
    }

    function setLiquidityBeneficiary(address beneficiary)
        external
        override
        onlyOwner
    {
        liquidityBeneficiary = beneficiary;
    }

    function chargeTax()
        external
        override
        onlyARTHX
    {
        uint256 amount = arthx.balanceOf(address(this));

        uint256 amountToBurn = amount.mul(taxToBurnPercent).div(100);
        if (amountToBurn > 0) {
            arthx.poolBurnFrom(address(this), amountToBurn);
            emit TaxCharged(address(this), address(0), amountToBurn);
        }

        uint256 amountToLiquidity = amount.mul(taxToLiquidityPercent).div(100);
        if (amountToLiquidity > 0) {
            arthx.taxTransfer(
                address(this),
                liquidityBeneficiary,
                amountToLiquidity
            );
            emit TaxCharged(address(this), liquidityBeneficiary, amountToLiquidity);
        }

        uint256 amountToHolders = amount.mul(taxToHoldersPercent).div(100);
        if (amountToHolders > 0) {
            arthx.taxTransfer(address(this), holderBeneficiary, amountToHolders);
            emit TaxCharged(address(this), holderBeneficiary, amountToHolders);
        }
    }
}
