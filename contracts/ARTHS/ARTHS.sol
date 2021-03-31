// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import '../Arth/Arth.sol';
import '../ERC20/IERC20.sol';
import '../Math/SafeMath.sol';
import '../Common/Context.sol';
import '../ERC20/ERC20Custom.sol';
import '../Governance/AccessControl.sol';
import '../ERC20/Variants/AnyswapV4Token.sol';

/**
 *  Original code written by:
 *  - Travis Moore, Jason Huan, Same Kazemian, Sam Sun.
 *  Code modified by:
 *  - Steven Enamakel, Yash Agrawal & Sagar Behara.
 */
contract ARTHShares is AnyswapV4Token {
    using SafeMath for uint256;

    /* ========== STATE VARIABLES ========== */

    string public symbol;
    string public name;
    uint8 public constant decimals = 18;
    address public ARTHStablecoinAdd;

    uint256 public constant genesis_supply = 10000e18; // 10k is printed upon genesis

    address public owner_address;
    address public oracle_address;
    address public timelock_address; // Governance timelock address
    ARTHStablecoin private ARTH;

    /* ========== MODIFIERS ========== */

    modifier onlyPools() {
        require(
            ARTH.arth_pools(msg.sender) == true,
            'Only arth pools can mint new ARTH'
        );
        _;
    }

    modifier onlyByOwnerOrGovernance() {
        require(
            msg.sender == owner_address || msg.sender == timelock_address,
            'You are not an owner or the governance timelock'
        );
        _;
    }

    /* ========== CONSTRUCTOR ========== */

    constructor(
        string memory _name,
        string memory _symbol,
        address _oracle_address,
        address _owner_address,
        address _timelock_address
    ) AnyswapV4Token(_name) {
        name = _name;
        symbol = _symbol;
        owner_address = _owner_address;
        oracle_address = _oracle_address;
        timelock_address = _timelock_address;
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _mint(owner_address, genesis_supply);
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    function setOracle(address new_oracle) external onlyByOwnerOrGovernance {
        oracle_address = new_oracle;
    }

    function setTimelock(address new_timelock)
        external
        onlyByOwnerOrGovernance
    {
        timelock_address = new_timelock;
    }

    function setARTHAddress(address arth_contract_address)
        external
        onlyByOwnerOrGovernance
    {
        ARTH = ARTHStablecoin(arth_contract_address);
    }

    function setOwner(address _owner_address) external onlyByOwnerOrGovernance {
        owner_address = _owner_address;
    }

    function mint(address to, uint256 amount) public onlyPools {
        _mint(to, amount);
    }

    // This function is what other arth pools will call to mint new ARTHS (similar to the ARTH mint)
    function pool_mint(address m_address, uint256 m_amount) external onlyPools {
        super._mint(m_address, m_amount);
        emit ARTHSMinted(address(this), m_address, m_amount);
    }

    // This function is what other arth pools will call to burn ARTHS
    function pool_burn_from(address b_address, uint256 b_amount)
        external
        onlyPools
    {
        super._burnFrom(b_address, b_amount);
        emit ARTHSBurned(b_address, address(this), b_amount);
    }

    // Track ARTHS burned
    event ARTHSBurned(address indexed from, address indexed to, uint256 amount);

    // Track ARTHS minted
    event ARTHSMinted(address indexed from, address indexed to, uint256 amount);
}
