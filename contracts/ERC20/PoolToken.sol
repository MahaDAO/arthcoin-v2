// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import '@openzeppelin/contracts/contracts/access/AccessControl.sol';
import '@openzeppelin/contracts/contracts/token/ERC20/SafeERC20.sol';
import {Ownable} from '@openzeppelin/contracts/contracts/access/Ownable.sol';
import {SafeMath} from '@openzeppelin/contracts/contracts/math/SafeMath.sol';
import {ERC20} from '@openzeppelin/contracts/contracts/token/ERC20/ERC20.sol';
import {IERC20} from '@openzeppelin/contracts/contracts/token/ERC20/IERC20.sol';

import {Math} from '../Math/Math.sol';

contract PoolToken is AccessControl, ERC20 {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

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
            'Lending: FORBIDDEN'
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

    function setPoolToken(IERC20 token) public onlyAdmin {
        poolTokens.push(token);
    }

    // function toggleDeposits(bool val) public onlyAdmin {
    //     enableDeposits = val;
    // }

    function _withdraw(uint256 liquidity) internal {
        require(liquidity > 0, 'Lending: amount = 0');

        for (uint256 i = 0; i < poolTokens.length; i++) {
            uint256 balance = poolTokens[i].balanceOf(address(this));
            // https://github.com/Uniswap/uniswap-v2-core/blob/master/contracts/UniswapV2Pair.sol#L134
            uint256 amount = liquidity.mul(balance).div(totalSupply());

            if (amount > 0) poolTokens[i].safeTransfer(msg.sender, amount);
        }

        _burn(msg.sender, liquidity);

        emit Withdraw(msg.sender, liquidity);
    }

    // // NOTE: need to check, test and confirm this piece of code.
    // function _deposit(address[] memory tokens, uint256[] memory amounts)
    //     internal
    // {
    //     require(enableDeposits, 'PoolToken: deposits disabled');
    //     require(tokens.length == amounts.length, 'PoolToken: invalid params');
    //     require(tokens.length == poolTokens.length, 'PoolToken: invalid param');

    //     uint256 amountToMint = 0;
    //     uint256 poolTotalSupply = totalSupply();

    //     for (uint256 i = 0; i < tokens.length; i++) {
    //         address token = tokens[i];
    //         uint256 amount = amounts[i];
    //
    //          // TODO: add a way to check that `token` is in poolTokens array(or is supported for this pool).
    //         require(amount > 0, 'PoolToken: amount = 0');
    //
    //         https://github.com/Uniswap/uniswap-v2-core/blob/master/contracts/UniswapV2Pair.sol#L118
    //         if (poolTotalSupply == 0)
    //             // Confused in this part.
    //             amountToMint = amountToMint.mul(Math.sqrt(amount));
    //         else {
    //             uint256 balance = IERC20(token).balanceOf(address(this));
    //             uint256 liquidity = amount.mul(poolTotalSupply).div(balance);

    //             if (i == 0) amountToMint = liquidity;
    //             else amountToMint = Math.min(amountToMint, liquidity);
    //         }

    //         IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
    //     }

    //     if (poolTotalSupply == 0) {
    //         amountToMint = amountToMint.sub(MINIMUM_LIQUIDITY);
    //         _mint(address(0), MINIMUM_LIQUIDITY);
    //     }

    //     _mint(msg.sender, amountToMint);
    //     emit Deposit(msg.sender, amountToMint);
    // }
}
