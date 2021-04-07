// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import {IARTH} from './IARTH.sol';
import '../ERC20/Variants/AnyswapV4Token.sol';
import {IIncentiveController} from './IIncentive.sol';

/**
 *  @title  ARTHStablecoin.
 *  @author MahaDAO.
 *
 *  Original code written by:
 *  - Travis Moore, Jason Huan, Same Kazemian, Sam Sun.
 */
contract ARTHStablecoin is AnyswapV4Token, IARTH {
    /**
     * State variables.
     */

    IIncentiveController public incentiveController;

    /// @notice Governance timelock address.
    address public governance;

    uint8 public constant decimals = 18;
    string public constant symbol = 'ARTH';
    string public constant name = 'ARTH Valuecoin';

    /// @notice This is to help with establishing the Uniswap pools, as they need liquidity.
    uint256 public constant override genesisSupply = 22000000e18; // 22M ARTH (testnet) & 5k (Mainnet).

    mapping(address => bool) public pools;

    /**
     * Events.
     */

    event PoolBurned(address indexed from, address indexed to, uint256 amount);
    event PoolMinted(address indexed from, address indexed to, uint256 amount);

    /**
     * Modifiers.
     */

    modifier onlyPools() {
        require(
            pools[msg.sender] == true,
            'Only arth pools can call this function'
        );
        _;
    }

    modifier onlyByOwnerOrGovernance() {
        require(
            msg.sender == owner() || msg.sender == governance,
            'You are not the owner, or the governance timelock'
        );
        _;
    }

    /**
     * Constructor.
     */

    constructor(address _governance) AnyswapV4Token(name) {
        governance = _governance;

        _mint(msg.sender, genesisSupply);
    }

    /**
     * External.
     */

    /// @notice Used by pools when user redeems.
    function poolBurnFrom(address who, uint256 amount)
        external
        override
        onlyPools
    {
        super._burnFrom(who, amount);
        emit PoolBurned(who, msg.sender, amount);
    }

    /// @notice This function is what other arth pools will call to mint new ARTH
    function poolMint(address who, uint256 amount) external override onlyPools {
        super._mint(who, amount);
        emit PoolMinted(msg.sender, who, amount);
    }

    /// @dev    Collateral Must be ERC20.
    /// @notice Adds collateral addresses supported.
    function addPool(address pool) external override onlyByOwnerOrGovernance {
        require(pools[pool] == false, 'address already exists');
        pools[pool] = true;
    }

    /// @notice Removes a pool.
    function removePool(address pool)
        external
        override
        onlyByOwnerOrGovernance
    {
        require(pools[pool] == true, "address doesn't exist already");
        delete pools[pool];
    }

    /**
     * Public.
     */

    function setGovernance(address _governance) external override onlyOwner {
        governance = _governance;
    }

    function setIncentiveController(IIncentiveController _incentiveController)
        external
        override
        onlyByOwnerOrGovernance
    {
        incentiveController = _incentiveController;
    }

    /**
     * Internal.
     */

    function _checkAndApplyIncentives(
        address sender,
        address recipient,
        uint256 amount
    ) internal {
        incentiveController.incentivize(sender, recipient, msg.sender, amount);
    }

    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal override {
        super._transfer(sender, recipient, amount);
        _checkAndApplyIncentives(sender, recipient, amount);
    }
}
