// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {IERC20Burnable} from '../ERC20/IERC20Burnable.sol';
import {Ownable} from '../access/Ownable.sol';
import {SafeMath} from '../utils/math/SafeMath.sol';
import {ITaxController} from './ITaxController.sol';
import {IUniswapV2Factory} from '../Uniswap/Interfaces/IUniswapV2Factory.sol';
import {IUniswapV2Router02} from '../Uniswap/Interfaces/IUniswapV2Router02.sol';

contract ARTHXTaxController is Ownable, ITaxController {
    using SafeMath for uint256;

    IERC20Burnable public immutable arthx;
    IUniswapV2Router02 public immutable router;

    uint256 public taxPercentToBurn = 50e4; // In 6 precision.
    uint256 public taxPercentToRewards = 50e4; // In 6 precision.

    address public rewardsDestination;

    event TaxCharged(address from, address to, uint256 amount);

    constructor(IERC20Burnable token, IUniswapV2Router02 swapRouter) {
        arthx = token;
        router = swapRouter;
    }

    function setPercentToBurn(uint256 percent) external onlyOwner {
        require(percent <= 1e6, 'ARTHXController: tax percent > 1e6');

        taxPercentToBurn = percent; // In 6 precision.
    }

    function setPercentToRewards(uint256 percent) external onlyOwner {
        require(percent <= 1e6, 'ARTHXController: tax percent > 1e6');

        taxPercentToRewards = percent; // In 6 precision.
    }

    function setRewardsDestination(address destination) external onlyOwner {
        require(rewardsDestination != owner(), 'TaxController: invalid addr');
        rewardsDestination = destination;
    }

    function chargeTax() external override {
        uint256 balance = arthx.balanceOf(address(this));

        uint256 burnAmount = balance.mul(taxPercentToBurn).div(1e6);
        if (burnAmount > 0) {
            arthx.burn(burnAmount);
            emit TaxCharged(address(this), address(0), burnAmount);
        }

        uint256 rewardsAmount = balance.mul(taxPercentToRewards).div(1e6);
        if (rewardsAmount > 0) {
            arthx.transfer(rewardsDestination, rewardsAmount);
            emit TaxCharged(address(this), rewardsDestination, rewardsAmount);
        }
    }
}
