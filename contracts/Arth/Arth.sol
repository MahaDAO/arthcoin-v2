// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import '../ARTHS/ARTHS.sol';
import '../ERC20/ERC20.sol';
import '../ERC20/IERC20.sol';
import '../Math/SafeMath.sol';
import './Pools/ArthPool.sol';
import '../Common/Context.sol';
import '../ERC20/ERC20Custom.sol';
import '../Oracle/UniswapPairOracle.sol';
import '../ERC20/Variants/AnyswapV4Token.sol';
import '../Oracle/ChainlinkETHUSDPriceConsumer.sol';
import './IIncentive.sol';

/**
 *  Original code written by:
 *  - Travis Moore, Jason Huan, Same Kazemian, Sam Sun.
 *  Code modified by:
 *  - Steven Enamakel, Yash Agrawal & Sagar Behara.
 */
contract ARTHStablecoin is AnyswapV4Token {
    using SafeMath for uint256;

    /* ========== STATE VARIABLES ========== */
    string public symbol;
    string public name;
    uint8 public constant decimals = 18;

    address public owner_address;
    address public creator_address;
    address public timelock_address; // Governance timelock address
    address public controller_address; // Controller contract to dynamically adjust system parameters automatically

    // 2M ARTH (only for testing, genesis supply will be 5k on Mainnet).
    // This is to help with establishing the Uniswap pools, as they need liquidity.
    uint256 public constant genesis_supply = 2000000e18;

    // Mapping is also used for faster verification
    mapping(address => bool) public arth_pools;
    mapping(address => IIncentive) public incentiveContract;

    address public DEFAULT_ADMIN_ADDRESS;

    /* ========== MODIFIERS ========== */

    modifier onlyPools() {
        require(
            arth_pools[msg.sender] == true,
            'Only arth pools can call this function'
        );
        _;
    }

    modifier onlyAdmin() {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            'You are not the owner or the governance timelock'
        );
        _;
    }

    modifier onlyByOwnerOrGovernance() {
        require(
            msg.sender == owner_address ||
                msg.sender == timelock_address ||
                msg.sender == controller_address,
            'You are not the owner, controller, or the governance timelock'
        );
        _;
    }

    modifier onlyByOwnerGovernanceOrPool() {
        require(
            msg.sender == owner_address ||
                msg.sender == timelock_address ||
                arth_pools[msg.sender] == true,
            'You are not the owner, the governance timelock, or a pool'
        );
        _;
    }

    /* ========== CONSTRUCTOR ========== */

    constructor(
        string memory _name,
        string memory _symbol,
        address _creator_address,
        address _timelock_address
    ) AnyswapV4Token(_name) {
        name = _name;
        symbol = _symbol;
        creator_address = _creator_address;
        timelock_address = _timelock_address;

        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        DEFAULT_ADMIN_ADDRESS = _msgSender();
        owner_address = _creator_address;

        _mint(creator_address, genesis_supply);
    }

    /* ========== VIEWS ========== */

    /* ========== RESTRICTED FUNCTIONS ========== */

    // Used by pools when user redeems
    function pool_burn_from(address b_address, uint256 b_amount)
        public
        onlyPools
    {
        super._burnFrom(b_address, b_amount);
        emit ARTHBurned(b_address, msg.sender, b_amount);
    }

    // This function is what other arth pools will call to mint new ARTH
    function pool_mint(address m_address, uint256 m_amount) public onlyPools {
        super._mint(m_address, m_amount);
        emit ARTHMinted(msg.sender, m_address, m_amount);
    }

    // Adds collateral addresses supported, such as tether and busd, must be ERC20
    function addPool(address pool_address) public onlyByOwnerOrGovernance {
        require(arth_pools[pool_address] == false, 'address already exists');
        arth_pools[pool_address] = true;
    }

    // Remove a pool
    function removePool(address pool_address) public onlyByOwnerOrGovernance {
        require(
            arth_pools[pool_address] == true,
            "address doesn't exist already"
        );

        // Delete from the mapping
        delete arth_pools[pool_address];
    }

    function setOwner(address _owner_address) external onlyByOwnerOrGovernance {
        owner_address = _owner_address;
    }

    function setTimelock(address new_timelock)
        external
        onlyByOwnerOrGovernance
    {
        timelock_address = new_timelock;
    }

    function setController(address _controller_address)
        external
        onlyByOwnerOrGovernance
    {
        controller_address = _controller_address;
    }

    function _checkAndApplyIncentives(
        address sender,
        address recipient,
        uint256 amount
    ) internal {
        // incentive on sender
        address senderIncentive = incentiveContract[sender];
        if (senderIncentive != address(0)) {
            senderIncentive.incentivize(sender, recipient, msg.sender, amount);
        }

        // incentive on recipient
        address recipientIncentive = incentiveContract[recipient];
        if (recipientIncentive != address(0)) {
            recipientIncentive.incentivize(
                sender,
                recipient,
                msg.sender,
                amount
            );
        }

        // incentive on operator
        address operatorIncentive = incentiveContract[msg.sender];
        if (
            msg.sender != sender &&
            msg.sender != recipient &&
            operatorIncentive != address(0)
        ) {
            operatorIncentive.incentivize(
                sender,
                recipient,
                msg.sender,
                amount
            );
        }

        // all incentive, if active applies to every transfer
        address allIncentive = incentiveContract[address(0)];
        if (allIncentive != address(0)) {
            allIncentive.incentivize(sender, recipient, msg.sender, amount);
        }
    }

    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal override {
        super._transfer(sender, recipient, amount);
        _checkAndApplyIncentives(sender, recipient, amount);
    }

    /* ========== EVENTS ========== */

    // Track ARTH burned
    event ARTHBurned(address indexed from, address indexed to, uint256 amount);

    // Track ARTH minted
    event ARTHMinted(address indexed from, address indexed to, uint256 amount);
}
