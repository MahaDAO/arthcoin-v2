// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import '../Governance/AccessControl.sol';
import '../Math/SafeMath.sol';
import {ERC20} from './ERC20.sol';
import {IERC20} from './IERC20.sol';
import {Math} from '../Math/Math.sol';

contract PoolToken is AccessControl, ERC20 {
    using SafeMath for uint256;

    /**
     * State variables.
     */

    IERC20[] public poolTokens;
    // uint256 MINIMUM_LIQUIDITY = 10**3;
    // bool public enableDeposits = true;

    /**
     * Modifiers.
     */

    modifier onlyAdmin {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            'PoolToken: FORBIDDEN'
        );
        _;
    }

    /**
     * Events.
     */

    // event Deposit(address indexed who, uint256 amount);
    event Withdraw(address indexed who, uint256 liquidity);

    /**
     * Constructor.
     */
    constructor(
        string memory tokenName,
        string memory tokenSymbol,
        IERC20[] memory poolTokens_
    ) ERC20(tokenName, tokenSymbol) {
        poolTokens = poolTokens_;
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    function addPoolToken(IERC20 token) public onlyAdmin {
        poolTokens.push(token);
    }

    // function toggleDeposits(bool val) public onlyAdmin {
    //     enableDeposits = val;
    // }

    function _withdraw(uint256 amount) internal {
        require(amount > 0, 'Lending: amount = 0');

        // calculate how much share of the supply the user has
        uint256 percentage = amount.mul(1e8).div(totalSupply());

        for (uint256 i = 0; i < poolTokens.length; i++) {
            uint256 balance = poolTokens[i].balanceOf(address(this));
            uint256 shareAmount = balance.mul(percentage).div(1e8);
            if (shareAmount > 0)
                poolTokens[i].safeTransfer(msg.sender, shareAmount);
        }

        _burn(msg.sender, amount);

        emit Withdraw(msg.sender, amount);
    }
}
