// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import './IARTHX.sol';
import '../ARTH/IARTH.sol';
import '../ERC20/IERC20.sol';
import '../Math/SafeMath.sol';
import '../Common/Context.sol';
import '../Arth/IARTHController.sol';
import '../Governance/AccessControl.sol';
import '../ERC20/Variants/AnyswapV4Token.sol';

/**
 * @title  ARTHShares.
 * @author MahaDAO.
 *
 * Original code written by:
 * - Travis Moore, Jason Huan, Same Kazemian, Sam Sun.
 */
contract ARTHShares is AnyswapV4Token, IARTHX {
    using SafeMath for uint256;

    /**
     * State variables.
     */

    /// @dev Controller for arth params.
    IARTH private _ARTH;
    IARTHController private _arthController;

    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 public constant genesisSupply = 10000e18; // 10k is printed upon genesis.

    address public arthAddress;
    address public ownerAddress;
    address public oracleAddress;
    address public timelockAddress; // Governance timelock address.

    /**
     * Events.
     */

    event ARTHXBurned(address indexed from, address indexed to, uint256 amount);

    event ARTHXMinted(address indexed from, address indexed to, uint256 amount);

    /**
     * Modifier.
     */

    modifier onlyPools() {
        require(
            _arthController.arth_pools(msg.sender) == true,
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
        string memory _name,
        string memory _symbol,
        address _oracleAddress,
        address _ownerAddress,
        address _timelockAddress
    ) AnyswapV4Token(_name) {
        name = _name;
        symbol = _symbol;

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
        _ARTH = IARTH(arthContractAddress);
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
}
