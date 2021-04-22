// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import {IARTHX} from "../interfaces/IARTHX.sol";
import {IARTH} from "../interfaces/IARTH.sol";
import {IERC20} from "../interfaces/IERC20.sol";
import {Context} from "../utils/Context.sol";
import {SafeMath} from "../utils/math/SafeMath.sol";
import {AnyswapV4ERC20} from "./core/AnyswapV4ERC20.sol";
import {AccessControl} from "../access/AccessControl.sol";

/**
 * @title  ARTHShares.
 * @author MahaDAO.
 *
 * Original code written by:
 * - Travis Moore, Jason Huan, Same Kazemian, Sam Sun.
 */
contract ARTHShares is AnyswapV4ERC20, IARTHX {
    using SafeMath for uint256;

    IARTH private _arth;

    string public name;
    string public symbol;

    bool public considerTax = true;

    // solhint-disable-next-line
    uint8 public constant override decimals = 18;
    uint256 public constant GENESIS_SUPPLY = 10000e18; // 10k is printed upon genesis.

    uint256 public taxToBurnPercent = 4; // In %.
    uint256 public taxToLiquidityPercent = 4; // In %.
    uint256 public taxToHoldersPercent = 4; // In %.

    address public oracle;
    address public timelock;
    address public ownerAddress;
    address public holderBeneficiary;
    address public liquidityBeneficiary;

    event ARTHXBurned(address indexed from, address indexed to, uint256 amount);
    event ARTHXMinted(address indexed from, address indexed to, uint256 amount);
    event TaxCharged(
        address indexed from,
        uint256 amountBurned,
        address indexed liquidity,
        uint256 amountToLiquidity,
        address indexed holders,
        uint256 amountToHodlers
    );

    modifier onlyPools() {
        require(
            _arth.pools(msg.sender) == true,
            "ARTHX: Only arth pools can mint new ARTH"
        );
        _;
    }

    modifier onlyByOwnerOrGovernance() {
        require(
            msg.sender == ownerAddress || msg.sender == timelock,
            "ARTHX: You are not an owner or the governance timelock"
        );
        _;
    }

    constructor(
        string memory name_,
        string memory symbol_,
        address oracle_,
        address owner,
        address timelock_
    ) AnyswapV4ERC20(name_) {
        name = name_;
        symbol = symbol_;

        ownerAddress = owner;
        oracle = oracle_;
        timelock = timelock_;

        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _mint(ownerAddress, GENESIS_SUPPLY);
    }

    function setOracle(address newOracle)
        external
        override
        onlyByOwnerOrGovernance
    {
        oracle = newOracle;
    }

    function setTimelock(address newTimelock)
        external
        override
        onlyByOwnerOrGovernance
    {
        timelock = newTimelock;
    }

    function setARTH(IARTH arth) external override onlyByOwnerOrGovernance {
        _arth = arth;
    }

    function setOwner(address owner) external override onlyByOwnerOrGovernance {
        ownerAddress = owner;
    }

    function setHolderBeneficiary(address beneficiary)
        external
        onlyByOwnerOrGovernance
    {
        holderBeneficiary = beneficiary;
    }

    function setTaxToHoldersPercent(uint256 percent)
        external
        onlyByOwnerOrGovernance
    {
        require(percent >= 0 && percent <= 100, "ARTHX: percent invalid");

        taxToHoldersPercent = percent;
    }

    function setTaxToLiquidityPercent(uint256 percent)
        external
        onlyByOwnerOrGovernance
    {
        require(percent >= 0 && percent <= 100, "ARTHX: percent invalid");

        taxToLiquidityPercent = percent;
    }

    function setTaxToBurnPercent(uint256 percent)
        external
        onlyByOwnerOrGovernance
    {
        require(percent >= 0 && percent <= 100, "ARTHX: percent invalid");

        taxToBurnPercent = percent;
    }

    function setLiquidityBeneficiary(address beneficiary)
        external
        onlyByOwnerOrGovernance
    {
        liquidityBeneficiary = beneficiary;
    }

    function toggleTax() external onlyByOwnerOrGovernance {
        considerTax = !considerTax;
    }

    function mint(address to, uint256 amount) public onlyPools {
        _mint(to, amount);
    }

    // This function is what other arth pools will call to mint new ARTHX (similar to the ARTH mint)
    function poolMint(address account, uint256 amount)
        external
        override
        onlyPools
    {
        super._mint(account, amount);

        emit ARTHXMinted(address(this), account, amount);
    }

    // This function is what other arth pools will call to burn ARTHX
    function poolBurnFrom(address account, uint256 amount)
        external
        override
        onlyPools
    {
        super._burnFrom(account, amount);
        emit ARTHXBurned(account, address(this), amount);
    }

    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal virtual override notPaused onlyNonBlacklisted(sender) {
        if (considerTax) {
            amount = _payTax(amount);
        }

        super._transfer(sender, recipient, amount);
    }

    function _payTax(uint256 amount) internal returns (uint256) {
        require(
            taxToBurnPercent.add(taxToLiquidityPercent).add(
                taxToHoldersPercent
            ) <= 100,
            "ARTHX: invalid tax rates"
        );

        uint256 amountToBurn = amount.mul(taxToBurnPercent).div(100);
        _burnFrom(msg.sender, amountToBurn);

        uint256 amountToLiquidity = amount.mul(taxToLiquidityPercent).div(100);
        super._transfer(msg.sender, liquidityBeneficiary, amountToLiquidity);

        uint256 amountToHolders = amount.mul(taxToHoldersPercent).div(100);
        super._transfer(msg.sender, holderBeneficiary, amountToHolders);

        emit TaxCharged(
            msg.sender,
            amountToBurn,
            liquidityBeneficiary,
            amountToLiquidity,
            holderBeneficiary,
            amountToHolders
        );

        return
            amount.sub(amountToBurn).sub(amountToLiquidity).sub(
                amountToHolders
            );
    }
}
