// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {ITokenStore} from './ITokenStore.sol';
import {IERC20} from '../../ERC20/IERC20.sol';
import {Ownable} from '../../access/Ownable.sol';
import {Operator} from '../../access/Operator.sol';
import {SafeERC20} from '../../ERC20/SafeERC20.sol';
import {SafeMath} from '../../utils/math/SafeMath.sol';
import {IERC20Burnable} from '../../ERC20/IERC20Burnable.sol';

contract TokenStore is ITokenStore, Operator {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    /* ========== EVENTS ========== */

    event TokenChanged(
        address indexed operator,
        address oldToken,
        address newToken
    );

    /* ========== STATE VARIABLES ========== */

    address public token;

    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;

    /* ========== CONSTRUCTOR ========== */

    constructor(address _token) {
        token = _token;
    }

    /* ========== VIEW FUNCTIONS ========== */

    function totalSupply() public view override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) public view override returns (uint256) {
        return _balances[account];
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    // gov
    function setToken(address newToken) public onlyOwner {
        address oldToken = token;
        token = newToken;
        emit TokenChanged(msg.sender, oldToken, newToken);
    }

    // logic
    function stake(uint256 amount) public override {
        _totalSupply = _totalSupply.add(amount);
        _balances[msg.sender] = _balances[msg.sender].add(amount);
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        IERC20Burnable(token).burn(amount);
    }

    function withdraw(uint256 amount) public override {
        revert('Withdraw disabled');
        require(false, 'Withdraw is disabled');
        uint256 balance = _balances[msg.sender];
        require(
            balance >= amount,
            'TokenStore: withdraw request greater than staked amount'
        );
        _totalSupply = _totalSupply.sub(amount);
        _balances[msg.sender] = balance.sub(amount);
        IERC20(token).safeTransfer(msg.sender, amount);
    }
}
