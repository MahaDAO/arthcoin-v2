// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import '../ERC20/IERC20.sol';

/**
 *  Original code written by:
 *  - Travis Moore, Jason Huan, Same Kazemian, Sam Sun.
 *  Code modified by:
 *  - Steven Enamakel, Yash Agrawal & Sagar Behara.
 */
interface IArth is IERC20 {
    function pool_burn_from(address b_address, uint256 b_amount) external;

    // This function is what other arth pools will call to mint new ARTH
    function pool_mint(address m_address, uint256 m_amount) external;

    // Adds collateral addresses supported, such as tether and busd, must be ERC20
    function addPool(address pool_address) external;

    // Remove a pool
    function removePool(address pool_address) external;

    function setOwner(address _owner_address) external;

    function setTimelock(address new_timelock) external;

    function setController(address _controller_address) external;

    function _checkAndApplyIncentives(
        address sender,
        address recipient,
        uint256 amount
    ) external;

    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) external;
}
