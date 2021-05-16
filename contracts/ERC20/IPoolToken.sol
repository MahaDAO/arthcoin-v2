// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {IERC20} from './IERC20.sol';

interface IPoolToken is IERC20 {
    function withdraw(uint256 amount) external;

    function withdrawTo(uint256 amount, address to) external;

    event ToggleWithdrawals(bool state);
    event TokenAdded(address indexed token);
    event Withdraw(address indexed who, address to, uint256 amount);
    event TokenReplaced(address indexed token, uint256 index);
    event TokensRetrieved(address indexed token, address who, uint256 amount);
}
