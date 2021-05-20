// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import {IARTHX} from './IARTHX.sol';
import {IARTH} from '../Arth/IARTH.sol';
import {IERC20} from '../ERC20/IERC20.sol';
import {ITaxCurve} from '../Curves/ITaxCurve.sol';
import {SafeMath} from '../utils/math/SafeMath.sol';
import {AnyswapV4Token} from '../ERC20/AnyswapV4Token.sol';
import {IARTHController} from '../Arth/IARTHController.sol';


/**
 * @title  ARTHShares.
 * @author MahaDAO.
 *
 * Original code written by:
 * - Travis Moore, Jason Huan, Same Kazemian, Sam Sun.
 */
contract ARTHShares is AnyswapV4Token, IARTHX {
    using SafeMath for uint256;

    /// @dev Controller for arth params.
    IARTH public arth;
    IARTHController public controller;

    ITaxCurve public taxCurve;

    string public name;
    string public symbol;
    uint8 public constant override decimals = 18;
    uint256 public constant genesisSupply = 11e4 ether; // 110k is printed upon genesis.

    address public taxDestination;
    address public ownerAddress;
    address public oracleAddress;
    address public timelockAddress; // Governance timelock address.

    /**
     * Events.
     */

    event ARTHXBurned(address indexed from, address indexed to, uint256 amount);

    event ARTHXMinted(address indexed from, address indexed to, uint256 amount);

    modifier onlyPools() {
        require(
            arth.pools(msg.sender) == true,
            'Only arth pools can mint new ARTH'
        );
        _;
    }

    modifier onlyByOwnerOrGovernance() {
        require(
            msg.sender == ownerAddress || msg.sender == timelockAddress,
            'You are not an owner or the governance timelock'
        );
        _;
    }

    /**
     * Constructor.
     */

    constructor(
        address _oracleAddress,
        address _ownerAddress,
        address _timelockAddress
    ) AnyswapV4Token('ARTH Shares') {
        name = 'ARTH Shares';
        symbol = 'ARTHX';

        ownerAddress = _ownerAddress;
        oracleAddress = _oracleAddress;
        timelockAddress = _timelockAddress;

        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());

        _mint(ownerAddress, genesisSupply);
    }

    /**
     * External.
     */

    function setOracle(address newOracle)
        external
        override
        onlyByOwnerOrGovernance
    {
        oracleAddress = newOracle;
    }

    function setTaxCurve(ITaxCurve curve)
        external
        override
        onlyByOwnerOrGovernance
    {
        taxCurve = curve;
    }

    function setTaxDestination(address _taxDestination)
        external
        override
        onlyByOwnerOrGovernance
    {
        taxDestination = _taxDestination;
    }

    function setArthController(address _controller)
        external
        override
        onlyByOwnerOrGovernance
    {
        controller = IARTHController(_controller);
    }

    function setTimelock(address newTimelock)
        external
        override
        onlyByOwnerOrGovernance
    {
        timelockAddress = newTimelock;
    }

    function setARTHAddress(address arthContractAddress)
        external
        override
        onlyByOwnerOrGovernance
    {
        arth = IARTH(arthContractAddress);
    }

    function setOwner(address _ownerAddress)
        external
        override
        onlyByOwnerOrGovernance
    {
        ownerAddress = _ownerAddress;
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

    function getTaxPercent() public view override returns (uint256) {
        if (address(taxCurve) == address(0)) return 0;

        return taxCurve.getTaxPercent();
    }

    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal virtual override whenNotPaused onlyNonBlacklisted(sender) {
        uint256 taxPercentToCharge = getTaxPercent();
        if (taxPercentToCharge > 0 && taxDestination != address(0)) {
            uint256 taxAmount = amount.mul(taxPercentToCharge).div(100);
            super._transfer(sender, taxDestination, taxAmount);
            amount = amount.sub(taxAmount);
        }

        super._transfer(sender, recipient, amount);
    }
}
