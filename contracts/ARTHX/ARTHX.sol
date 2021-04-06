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
import '../Arth/ArthController.sol';

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

    address public ownerAddress;
    address public oracle_address;
    address public timelock_address; // Governance timelock address
    ARTHStablecoin private ARTH;
    ArthController private controller;

    /* ========== MODIFIERS ========== */

    modifier onlyPools() {
        require(
            controller.arth_pools(msg.sender) == true,
            'Only arth pools can mint new ARTH'
        );
        _;
    }

    modifier onlyByOwnerOrGovernance() {
        require(
            msg.sender == ownerAddress || msg.sender == timelock_address,
            'You are not an owner or the governance timelock'
        );
        _;
    }

    /* ========== CONSTRUCTOR ========== */

    constructor(
        string memory _name,
        string memory _symbol,
        address _oracle_address,
        address _ownerAddress,
        address _timelock_address
    ) AnyswapV4Token(_name) {
        name = _name;
        symbol = _symbol;
        ownerAddress = _ownerAddress;
        oracle_address = _oracle_address;
        timelock_address = _timelock_address;
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _mint(ownerAddress, genesis_supply);
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

    function setOwner(address _ownerAddress) external onlyByOwnerOrGovernance {
        ownerAddress = _ownerAddress;
    }

    function mint(address to, uint256 amount) public onlyPools {
        _mint(to, amount);
    }

    // This function is what other arth pools will call to mint new ARTHX (similar to the ARTH mint)
    function poolMint(address m_address, uint256 m_amount) external onlyPools {
        super._mint(m_address, m_amount);
        emit ARTHXMinted(address(this), m_address, m_amount);
    }

    // This function is what other arth pools will call to burn ARTHX
    function poolBurnFrom(address b_address, uint256 b_amount)
        external
        onlyPools
    {
        super._burnFrom(b_address, b_amount);
        emit ARTHXBurned(b_address, address(this), b_amount);
    }

    // Track ARTHX burned
    event ARTHXBurned(address indexed from, address indexed to, uint256 amount);

    // Track ARTHX minted
    event ARTHXMinted(address indexed from, address indexed to, uint256 amount);
}
