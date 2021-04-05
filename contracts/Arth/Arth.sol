// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import '../Math/SafeMath.sol';
import '../ERC20/Variants/AnyswapV4Token.sol';
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
    string public symbol = 'ARTH';
    string public name = 'ARTH Valuecoin';
    uint8 public constant decimals = 18;

    address public owner_address;
    address public timelock_address; // Governance timelock address

    // 2M ARTH (only for testing, genesis supply will be 5k on Mainnet).
    // This is to help with establishing the Uniswap pools, as they need liquidity.
    uint256 public constant genesis_supply = 2000000e18;

    // Mapping is also used for faster verification
    mapping(address => bool) public pools;
    mapping(address => IIncentive) public incentiveContract;

    /* ========== MODIFIERS ========== */

    modifier onlyPools() {
        require(
            pools[msg.sender] == true,
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
            msg.sender == owner() || msg.sender == timelock_address,
            'You are not the owner,  or the governance timelock'
        );
        _;
    }

    modifier onlyByOwnerGovernanceOrPool() {
        require(
            msg.sender == owner_address ||
                msg.sender == timelock_address ||
                pools[msg.sender] == true,
            'You are not the owner, the governance timelock, or a pool'
        );
        _;
    }

    constructor(address _creator_address, address _timelock_address)
        AnyswapV4Token(name)
    {
        timelock_address = _timelock_address;
        owner_address = _creator_address;

        _mint(msg.sender, genesis_supply);
    }

    /* ========== VIEWS ========== */

    // Used by pools when user redeems
    function poolBurnFrom(address who, uint256 amount) public onlyPools {
        super._burnFrom(who, amount);
        emit PoolBurned(who, msg.sender, amount);
    }

    // This function is what other arth pools will call to mint new ARTH
    function poolMint(address who, uint256 amount) public onlyPools {
        super._mint(who, amount);
        emit PoolMinted(msg.sender, who, amount);
    }

    // Adds collateral addresses supported, such as tether and busd, must be ERC20
    function addPool(address pool) public onlyByOwnerOrGovernance {
        require(pools[pool] == false, 'address already exists');
        pools[pool] = true;
    }

    // Remove a pool
    function removePool(address pool) public onlyByOwnerOrGovernance {
        require(pools[pool] == true, "address doesn't exist already");

        // Delete from the mapping
        delete pools[pool];
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

    function _checkAndApplyIncentives(
        address sender,
        address recipient,
        uint256 amount
    ) internal {
        // incentive on sender
        IIncentive senderIncentive = incentiveContract[sender];
        if (address(senderIncentive) != address(0)) {
            senderIncentive.incentivize(sender, recipient, msg.sender, amount);
        }

        // incentive on recipient
        IIncentive recipientIncentive = incentiveContract[recipient];
        if (address(recipientIncentive) != address(0)) {
            recipientIncentive.incentivize(
                sender,
                recipient,
                msg.sender,
                amount
            );
        }

        // incentive on operator
        IIncentive operatorIncentive = incentiveContract[msg.sender];
        if (
            msg.sender != sender &&
            msg.sender != recipient &&
            address(operatorIncentive) != address(0)
        ) {
            operatorIncentive.incentivize(
                sender,
                recipient,
                msg.sender,
                amount
            );
        }

        // all incentive, if active applies to every transfer
        IIncentive allIncentive = incentiveContract[address(0)];
        if (address(allIncentive) != address(0)) {
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

    event PoolBurned(address indexed from, address indexed to, uint256 amount);
    event PoolMinted(address indexed from, address indexed to, uint256 amount);
}
