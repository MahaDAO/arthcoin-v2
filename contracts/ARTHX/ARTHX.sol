// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import {IARTHX} from './IARTHX.sol';
import {IARTH} from '../Arth/IARTH.sol';
import {IERC20} from '../ERC20/IERC20.sol';
import {SafeMath} from '../utils/math/SafeMath.sol';
import {ITaxController} from "./ITaxController.sol";
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

    IARTH public arth;
    IARTHController public controller;
    ITaxController public taxController;

    string public name;
    string public symbol;

    // solhint-disable-next-line
    uint8 public constant override decimals = 18;
    // solhint-disable-next-line
    uint256 public constant genesisSupply = 11e4 ether; // 110k is printed upon genesis.

    uint256 public taxPercent = 0; // 10e4;  // 10% 6 decimal precision.

    address public ownerAddress;
    address public oracleAddress;
    address public timelockAddress; // Governance timelock address.

    /// @notice Address when on the sending/receiving end the tx is not taxed.
    mapping(address => bool) public whiteListedForTax;

    event ARTHXBurned(
        address indexed from,
        address indexed to,
        uint256 amount
    );
    event ARTHXMinted(
        address indexed from,
        address indexed to,
        uint256 amount
    );

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

    function setOracle(address newOracle)
        external
        override
        onlyByOwnerOrGovernance
    {
        oracleAddress = newOracle;
    }

    function setArthController(address _controller)
        external
        override
        onlyByOwnerOrGovernance
    {
        controller = IARTHController(_controller);
    }

    function setTaxController(ITaxController newController)
        external
        override
        onlyByOwnerOrGovernance
    {
        whiteListedForTax[address(taxController)] = false;
        taxController = newController;
        whiteListedForTax[address(taxController)] = true;
    }

    function setTaxPercent(uint256 percent)
        external
        override
        onlyByOwnerOrGovernance
    {
        require(taxPercent <= 1e6, 'ARTHX: tax percent > 1e6');

        taxPercent = percent;
    }

    function addToTaxWhiteList(address entity)
        external
        override
        onlyByOwnerOrGovernance
    {
        whiteListedForTax[entity] = true;
    }

    function removeFromTaxWhitelist(address entity)
        external
        override
        onlyByOwnerOrGovernance
    {
        whiteListedForTax[entity] = false;
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

    // This function is what other arth pools will call to
    // mint new ARTHX (similar to the ARTH mint).
    function poolMint(address account, uint256 amount)
        external
        override
        onlyPools
    {
        super._mint(account, amount);

        emit ARTHXMinted(address(this), account, amount);
    }

    // This function is what other arth pools will call to burn ARTHX.
    function poolBurnFrom(address account, uint256 amount)
        external
        override
        onlyPools
    {
        super._burnFrom(account, amount);
        emit ARTHXBurned(account, address(this), amount);
    }

    function getTaxAmount(uint256 amount)
        public
        view
        override
        returns (uint256)
    {
        return amount.mul(taxPercent).div(1e6);
    }

    function isTxWhiteListedForTax(address sender, address receiver)
        public
        view
        override
        returns (bool)
    {
        return whiteListedForTax[sender] || whiteListedForTax[receiver];
    }

    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal virtual override whenNotPaused onlyNonBlacklisted(sender) {
        if (
            isTxWhiteListedForTax(sender, recipient) ||
            address(taxController) == address(0)
        ) {
            super._transfer(sender, recipient, amount);
            return;
        }

        uint256 tax = getTaxAmount(amount);
        if (tax > 0) {
            super._transfer(sender, address(taxController), tax);
            amount = amount.sub(tax);
            taxController.chargeTax();
        }

        super._transfer(sender, recipient, amount);
    }
}
